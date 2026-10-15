import { NextResponse } from "next/server";

/** Web app manifest so the app is installable on mobile home screens. */
export function GET() {
  return NextResponse.json({
    name: "Task & Bug Tracker",
    short_name: "Tracker",
    description: "Personal tasks, bugs, and feature ideas.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  });
}
