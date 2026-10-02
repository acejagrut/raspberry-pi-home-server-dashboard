#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/pi-home
CONF_DIR=/etc/pi-home
ENV_FILE=$CONF_DIR/pi-home.env
SERVICE=/etc/systemd/system/pi-home.service
PORT="${PIHOME_PORT:-8080}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

b() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '\n  \033[31m✗ %s\033[0m\n\n' "$*"; exit 1; }
ask() { local prompt="$1" default="$2" answer; read -r -p "  $prompt [$default] " answer </dev/tty || answer=""; echo "${answer:-$default}"; }

[[ $EUID -eq 0 ]] || fail "Please run it with sudo:  sudo bash install.sh"
[[ -f "$SRC/app.py" && -d "$SRC/static" ]] || fail "Run this from inside the pi-home folder."
command -v apt-get >/dev/null || fail "This installer is made for Raspberry Pi OS and other Debian-based systems."

echo
b "Pi Home installer"
echo

b "1/6  Installing what Pi Home needs"
export DEBIAN_FRONTEND=noninteractive
if ! python3 -c 'import flask' 2>/dev/null; then
  apt-get update -qq || warn "Couldn't refresh the package list; trying anyway."
  apt-get install -y -qq python3 python3-flask >/dev/null || fail "Couldn't install Python Flask. Check the internet connection and try again."
fi
command -v curl >/dev/null || apt-get install -y -qq curl >/dev/null
ok "Python and Flask are ready"

b "2/6  Copying the app"
install -d -m 755 "$APP_DIR"
rm -rf "$APP_DIR/static"
cp -a "$SRC/app.py" "$SRC/static" "$APP_DIR/"
install -m 755 "$SRC/bin/pi-home" /usr/local/bin/pi-home
chown -R root:root "$APP_DIR"
chmod -R go-w "$APP_DIR"
install -d -m 700 "$CONF_DIR"
ok "Installed in $APP_DIR"

b "3/6  Your files"
STORAGE=/mnt/storage
STORAGE_NAME=Storage
if [[ -f "$ENV_FILE" ]]; then
  STORAGE="$(sed -n 's/^PIHOME_STORAGE=//p' "$ENV_FILE")"
  STORAGE_NAME="$(sed -n 's/^PIHOME_STORAGE_NAME=//p' "$ENV_FILE")"
fi
STORAGE="$(ask "Folder for the Files page:" "${STORAGE:-/mnt/storage}")"
STORAGE_NAME="$(ask "What should the app call it?" "${STORAGE_NAME:-Storage}")"
[[ -d "$STORAGE" ]] || warn "$STORAGE doesn't exist yet. Create or mount it, and the Files page will use it."
REQUIRE_MOUNT=0
if mountpoint -q "$STORAGE" 2>/dev/null; then REQUIRE_MOUNT=1; fi
cat > "$ENV_FILE" <<EOF
PIHOME_CONFIG=$CONF_DIR/config.json
PIHOME_STORAGE=$STORAGE
PIHOME_STORAGE_NAME=$STORAGE_NAME
PIHOME_REQUIRE_MOUNT=$REQUIRE_MOUNT
PIHOME_PORT=$PORT
PYTHONUNBUFFERED=1
EOF
chmod 600 "$ENV_FILE"
ok "Files page uses $STORAGE"

b "4/6  Your PIN"
export PIHOME_CONFIG="$CONF_DIR/config.json"
if python3 "$APP_DIR/app.py" has-pin; then
  keep="$(ask "You already have a PIN. Keep it? (y/n)" "y")"
  if [[ "${keep,,}" == n* ]]; then python3 "$APP_DIR/app.py" set-pin </dev/tty; else ok "Keeping your current PIN"; fi
else
  python3 "$APP_DIR/app.py" set-pin </dev/tty
fi

b "5/6  Starting Pi Home"
cat > "$SERVICE" <<EOF
[Unit]
Description=Pi Home dashboard
After=network-online.target tailscaled.service
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/python3 $APP_DIR/app.py
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable pi-home >/dev/null 2>&1
systemctl restart pi-home
for _ in $(seq 1 30); do
  curl -fsS "http://127.0.0.1:$PORT/api/ping" >/dev/null 2>&1 && break
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/api/ping" >/dev/null 2>&1 || fail "Pi Home didn't start. See what happened with:  pi-home logs"
ok "Pi Home is running and starts by itself after every reboot"

b "6/6  Your private link (Tailscale)"
if ! command -v tailscale >/dev/null || ! tailscale status >/dev/null 2>&1; then
  warn "Tailscale isn't running, so there's no private link yet."
  warn "Install and log in to Tailscale, then run:  sudo tailscale serve --bg $PORT"
  exit 0
fi
echo "  If a login.tailscale.com link appears below, open it and click Enable"
echo "  (this turns on HTTPS for your devices). The installer waits for you."
echo
if timeout 300 tailscale serve --bg "$PORT"; then
  ok "Private HTTPS link is on"
else
  warn "The link wasn't switched on. Enable HTTPS in the Tailscale admin (DNS → HTTPS Certificates),"
  warn "then run:  sudo tailscale serve --bg $PORT"
fi

URL="https://$(tailscale status --json | python3 -c 'import sys,json; print(json.load(sys.stdin)["Self"]["DNSName"].rstrip("."))')"
echo "$URL" > "$CONF_DIR/link"
echo
b "All done! Open Pi Home on any device in your Tailscale network:"
echo
printf '    \033[1;4m%s\033[0m\n' "$URL"
echo
echo "  iPhone / iPad:  open it in Safari → Share → Add to Home Screen"
echo "  Android:        open it in Chrome → ⋮ → Install app"
echo "  Computer:       open it in your browser and bookmark it"
echo
echo "  Handy commands:  pi-home link | pi-home status | sudo pi-home pin | pi-home logs"
echo
