#!/bin/sh
set -e

# Apply any pending database migrations before starting the server.
# Invoke the real CLI entry file (not node_modules/.bin/prisma): the image
# build dereferences that symlink into a plain file under .bin/, which makes
# Node resolve __dirname to .bin/ so Prisma can't find its .wasm engine files
# (they live next to this entry file in node_modules/prisma/build/).
echo "Running database migrations..."
node node_modules/prisma/build/index.js migrate deploy

echo "Starting server..."
exec "$@"
