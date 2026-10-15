#!/bin/sh
set -e

# Apply any pending database migrations before starting the server.
echo "Running database migrations..."
node_modules/.bin/prisma migrate deploy

echo "Starting server..."
exec "$@"
