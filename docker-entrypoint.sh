#!/bin/sh
set -e

echo "[entrypoint] Aplicando migrations do Prisma..."
npx prisma migrate deploy

echo "[entrypoint] Iniciando o servidor..."
exec node dist/server.js
