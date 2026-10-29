#!/usr/bin/env bash
set -euo pipefail
BACKEND_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PYTHON="$BACKEND_DIR/.venv/bin/python"
URL="http://127.0.0.1:8000/"

if [[ ! -x "$PYTHON" ]]; then
  notify-send "RestoPro" "Lancez d'abord install_linux.sh dans le dossier backend." 2>/dev/null || true
  exit 1
fi

if "$PYTHON" -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/", timeout=2)' >/dev/null 2>&1; then
  xdg-open "$URL" >/dev/null 2>&1 &
  exit 0
fi

export RESTOPRO_LOCAL=1
"$PYTHON" "$BACKEND_DIR/manage.py" migrate --noinput
nohup "$PYTHON" "$BACKEND_DIR/manage.py" runserver 127.0.0.1:8000 --noreload \
  >"$BACKEND_DIR/restopro-server.log" 2>&1 </dev/null &

for _ in {1..30}; do
  if "$PYTHON" -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/", timeout=2)' >/dev/null 2>&1; then
    xdg-open "$URL" >/dev/null 2>&1 &
    exit 0
  fi
  sleep 1
done
notify-send "RestoPro" "Le serveur n'a pas démarré. Consultez backend/restopro-server.log." 2>/dev/null || true
exit 1
