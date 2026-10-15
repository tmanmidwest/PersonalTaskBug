#!/usr/bin/env node
/**
 * MCP server for the Personal Task & Bug Tracker.
 *
 * It is a thin client over the tracker's REST API, so it needs only a base URL
 * and an API token — no direct database access. Run it with:
 *
 *   TRACKER_URL=https://your-host TRACKER_TOKEN=ptb_xxx npm run mcp
 *
 * and register it with an MCP client (e.g. Claude Desktop/CLI) as a stdio
 * server. Tokens are created in the app under Settings → API tokens.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";

const BASE = (process.env.TRACKER_URL ?? "").replace(/\/$/, "");
const TOKEN = process.env.TRACKER_TOKEN ?? "";

if (!BASE || !TOKEN) {
  console.error("Set TRACKER_URL and TRACKER_TOKEN environment variables.");
  process.exit(1);
}

async function api(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

const TYPE_ENUM = ["TASK", "BUG", "FEATURE"];
const PRIORITY_ENUM = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const TOOLS: Tool[] = [
  {
    name: "list_projects",
    description: "List all projects with their statuses.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_items",
    description:
      "List items, optionally filtered by project key, type, or open state.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project key, e.g. APP" },
        type: { type: "string", enum: TYPE_ENUM },
        open: { type: "boolean", description: "Only items not in a done status" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "create_item",
    description: "Create a task, bug, or feature in a project.",
    inputSchema: {
      type: "object",
      properties: {
        project: { type: "string", description: "Project key, e.g. APP" },
        title: { type: "string" },
        description: { type: "string" },
        type: { type: "string", enum: TYPE_ENUM },
        priority: { type: "string", enum: PRIORITY_ENUM },
        dueDate: { type: "string", description: "ISO 8601 datetime" },
      },
      required: ["project", "title"],
    },
  },
  {
    name: "update_item",
    description: "Update fields on an item. Use the item id from list_items.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        title: { type: "string" },
        description: { type: ["string", "null"] },
        type: { type: "string", enum: TYPE_ENUM },
        priority: { type: "string", enum: PRIORITY_ENUM },
        status: {
          type: ["string", "null"],
          description: "Status name in the project",
        },
        dueDate: { type: ["string", "null"] },
      },
      required: ["id"],
    },
  },
  {
    name: "add_comment",
    description: "Add a comment to an item.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, body: { type: "string" } },
      required: ["id", "body"],
    },
  },
];

function text(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

async function dispatch(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "list_projects":
      return api("/projects");
    case "list_items": {
      const qs = new URLSearchParams();
      if (args.project) qs.set("project", String(args.project));
      if (args.type) qs.set("type", String(args.type));
      if (args.open) qs.set("open", "true");
      if (args.limit) qs.set("limit", String(args.limit));
      return api(`/items?${qs.toString()}`);
    }
    case "create_item":
      return api("/items", { method: "POST", body: JSON.stringify(args) });
    case "update_item": {
      const { id, ...patch } = args;
      return api(`/items/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    }
    case "add_comment":
      return api(`/items/${args.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: args.body }),
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const server = new Server(
  { name: "personal-task-bug-tracker", version: "0.1.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  try {
    const result = await dispatch(
      req.params.name,
      (req.params.arguments ?? {}) as Record<string, unknown>,
    );
    return text(result);
  } catch (e) {
    return {
      content: [
        { type: "text" as const, text: e instanceof Error ? e.message : "Error" },
      ],
      isError: true,
    };
  }
});

async function main() {
  await server.connect(new StdioServerTransport());
  console.error("Task & Bug Tracker MCP server running on stdio.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
