#!/bin/sh
set -e

echo "==> Gemivora backend starting..."

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

echo "==> Waiting for database..."
max=15
attempt=0
until npx prisma db push --skip-generate; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max" ]; then
    echo "ERROR: Could not connect to database after $max attempts"
    exit 1
  fi
  echo "Database not ready (attempt $attempt/$max), retrying in 3s..."
  sleep 3
done

if [ "$RUN_DB_SEED" = "true" ]; then
  echo "==> Seeding database (RUN_DB_SEED=true)..."
  npx prisma db seed
else
  echo "==> Skipping seed (set RUN_DB_SEED=true for first-time setup only)"
fi

echo "==> Starting API server..."
exec "$@"
