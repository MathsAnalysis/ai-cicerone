#!/usr/bin/env bash
# Deploy sulla VPS: allinea ~/sito a origin/main, ricostruisce l'immagine senza cache,
# riavvia il container e svuota la cache nginx. Lanciato da GitHub Actions via SSH.
set -euo pipefail

cd "$(dirname "$0")/.."

git fetch --prune origin
git reset --hard origin/main

docker compose build --no-cache --pull app
docker compose up -d ollama searxng
docker compose up -d --force-recreate app
# Modello IA: scaricato o aggiornato in background, il sito parte subito.
docker compose up -d ollama-pull
docker image prune -f >/dev/null

sudo rm -rf /var/cache/nginx/aicicerone/*
sudo nginx -t
sudo systemctl reload nginx

for i in $(seq 1 20); do
  if curl -fsS -o /dev/null http://127.0.0.1/; then
    echo "deploy ok: $(git rev-parse --short HEAD)"
    exit 0
  fi
  sleep 2
done
echo "deploy fallito: il sito non risponde" >&2
docker compose logs --tail=50 app >&2
exit 1
