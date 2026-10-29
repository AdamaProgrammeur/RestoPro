#!/usr/bin/env bash
set -euo pipefail
BACKEND_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"
export RESTOPRO_LOCAL=1

PYTHON=""
for candidate in python3.12 python3; do
  if command -v "$candidate" >/dev/null 2>&1; then
    PYTHON="$(command -v "$candidate")"
    break
  fi
done
if [[ -z "$PYTHON" ]]; then
  echo "Python 3.12 ou supérieur est requis." >&2
  exit 1
fi
if ! "$PYTHON" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 12) else 1)'; then
  echo "Python 3.12 ou supérieur est requis." >&2
  exit 1
fi

if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
  "$PYTHON" -m venv .venv
fi
if [[ ! -f "$BACKEND_DIR/.venv/restopro-dependencies-installed" ]]; then
  "$BACKEND_DIR/.venv/bin/python" -m pip install --upgrade pip
  "$BACKEND_DIR/.venv/bin/python" -m pip install -r requirements.txt
  touch "$BACKEND_DIR/.venv/restopro-dependencies-installed"
fi

FIRST_INSTALL=0
[[ -f "$BACKEND_DIR/restopro_local.sqlite3" ]] || FIRST_INSTALL=1
"$BACKEND_DIR/.venv/bin/python" manage.py migrate --noinput
if [[ "$FIRST_INSTALL" == "1" ]]; then
  echo "Creez le compte administrateur initial :"
  "$BACKEND_DIR/.venv/bin/python" manage.py createsuperuser
  "$BACKEND_DIR/.venv/bin/python" manage.py shell -c "from apps.accounts.models import User; User.objects.filter(is_superuser=True).update(role='ADMIN')"
fi

ICON="$BACKEND_DIR/frontend_app/static/frontend/icons/restopro.svg"
DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || true)"
if [[ -z "$DESKTOP_DIR" ]]; then
  DESKTOP_DIR="$HOME/Desktop"
fi
APPLICATIONS_DIR="$HOME/.local/share/applications"
mkdir -p "$DESKTOP_DIR" "$APPLICATIONS_DIR"
for target in "$DESKTOP_DIR/RestoPro.desktop" "$APPLICATIONS_DIR/RestoPro.desktop"; do
  cat > "$target" <<DESKTOP
[Desktop Entry]
Type=Application
Name=RestoPro
Comment=Logiciel local de gestion du restaurant
Exec="$BACKEND_DIR/start_linux.sh"
Icon=$ICON
Terminal=false
Categories=Office;Utility;
DESKTOP
  chmod +x "$target"
  gio set "$target" metadata::trusted true 2>/dev/null || true
done

echo "Installation terminee. Double-cliquez sur RestoPro sur le Bureau."
