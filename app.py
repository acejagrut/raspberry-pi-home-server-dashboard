#!/usr/bin/env python3
import getpass
import hashlib
import hmac
import json
import logging
import mimetypes
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timedelta
from pathlib import Path

from flask import Flask, Response, abort, jsonify, request, send_file, session
from werkzeug.exceptions import HTTPException

VERSION = "1.0.0"

BASE = Path(__file__).resolve().parent
STATIC = BASE / "static"
CONFIG_PATH = Path(os.environ.get("PIHOME_CONFIG", "/etc/pi-home/config.json"))
STORAGE = Path(os.environ.get("PIHOME_STORAGE", "/mnt/storage")).resolve()
STORAGE_NAME = os.environ.get("PIHOME_STORAGE_NAME", "Storage")
REQUIRE_MOUNT = os.environ.get("PIHOME_REQUIRE_MOUNT", "1") == "1"
HOST = os.environ.get("PIHOME_HOST", "127.0.0.1")
PORT = int(os.environ.get("PIHOME_PORT", "8080"))
PIHOLE_API = os.environ.get("PIHOME_PIHOLE_API", "http://127.0.0.1/api")
PIHOLE_PW_FILE = Path(os.environ.get("PIHOME_PIHOLE_PW_FILE", "/etc/pihole/cli_pw"))
SECURE_COOKIE = os.environ.get("PIHOME_SECURE_COOKIE", "1") == "1"

SERVICES = [
    ("Pi-hole", "pihole-FTL", True),
    ("Tailscale", "tailscaled", True),
    ("File sharing", "smbd", True),
    ("Firewall", "ufw", False),
    ("Auto-updates", "unattended-upgrades", False),
]
RESTARTABLE = {unit for _, unit, ok in SERVICES if ok}

JOBS = {
    "update": [
        ["apt-get", "update"],
        ["apt-get", "-y", "-o", "Dpkg::Options::=--force-confdef",
         "-o", "Dpkg::Options::=--force-confold", "full-upgrade"],
        ["apt-get", "-y", "autoremove"],
    ],
    "gravity": [["pihole", "-g"]],
}

log = logging.getLogger("pi-home")


def load_config():
    try:
        return json.loads(CONFIG_PATH.read_text())
    except FileNotFoundError:
        return {}


def save_config(cfg):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = CONFIG_PATH.with_name(CONFIG_PATH.name + ".tmp")
    tmp.write_text(json.dumps(cfg, indent=2))
    os.chmod(tmp, 0o600)
    tmp.replace(CONFIG_PATH)


CFG = load_config()
if not CFG.get("secret_key"):
    CFG["secret_key"] = secrets.token_hex(32)
    try:
        save_config(CFG)
    except OSError:
        pass
CFG.setdefault("name", "")
AVATAR_PATH = CONFIG_PATH.parent / "avatar"
AVATAR_TYPES = {"image/jpeg", "image/png", "image/webp"}
LOCK_CHOICES = (0, 60, 300, 1800)
CFG.setdefault("lock_after", 0)


def hash_pin(pin, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt), 200_000).hex()
    return {"salt": salt, "hash": digest, "length": len(pin)}


def pin_matches(pin):
    stored = CFG.get("pin")
    if not stored:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(stored["salt"]), 200_000).hex()
    return hmac.compare_digest(digest, stored["hash"])


def pin_version():
    return (CFG.get("pin") or {}).get("hash", "")[:16]


def valid_new_pin(pin):
    return isinstance(pin, str) and pin.isdigit() and 4 <= len(pin) <= 6


app = Flask(__name__, static_folder=None)
app.secret_key = CFG["secret_key"]
app.config.update(
    SESSION_COOKIE_NAME="pihome",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    SESSION_COOKIE_SECURE=SECURE_COOKIE,
    MAX_CONTENT_LENGTH=64 * 1024 ** 3,
)
app.json.sort_keys = False


def read(path, default=""):
    try:
        return Path(path).read_text().strip()
    except Exception:
        return default


def run(cmd, timeout=20):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr).strip()
    except Exception as e:
        return 127, str(e)


@app.errorhandler(HTTPException)
def http_error(e):
    return jsonify(error=e.description), e.code


@app.errorhandler(Exception)
def unexpected_error(e):
    log.exception("Unexpected error")
    return jsonify(error="Something went wrong on the Pi. Check: pi-home logs"), 500


_fails = {"count": 0, "until": 0.0}
_fails_lock = threading.Lock()
MAX_TRIES = 5


def require_pin(pin):
    now = time.time()
    with _fails_lock:
        if now < _fails["until"]:
            wait = int(_fails["until"] - now) + 1
            abort(429, f"Too many wrong tries. Try again in {wait // 60}m {wait % 60}s.")
    ok = isinstance(pin, str) and pin.isdigit() and pin_matches(pin)
    with _fails_lock:
        if ok:
            _fails["count"] = 0
            return
        _fails["count"] += 1
        left = MAX_TRIES - _fails["count"]
        if left <= 0:
            _fails.update(count=0, until=now + 300)
            abort(429, "Too many wrong tries. Locked for 5 minutes.")
    abort(403, f"Wrong PIN · {left} {'try' if left == 1 else 'tries'} left")


def is_unlocked(refresh=False):
    if not session.get("ok") or session.get("v") != pin_version() or not pin_version():
        return False
    now = time.time()
    idle = CFG.get("lock_after") or 300
    if now - session.get("t", 0) > idle:
        session.clear()
        return False
    if refresh:
        session["t"] = now
    return True


PUBLIC_API = {"/api/ping", "/api/session", "/api/unlock"}


@app.before_request
def guard():
    path = request.path
    if not path.startswith("/api/"):
        return None
    if request.method not in ("GET", "HEAD") and request.headers.get("X-Pi-Home") != "1":
        abort(400, "Bad request")
    if path in PUBLIC_API or (path == "/api/avatar" and request.method == "GET"):
        return None
    if not is_unlocked(refresh=request.headers.get("X-Pi-Home-Poll") != "1"):
        abort(401, "Locked")
    return None


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["Referrer-Policy"] = "no-referrer"
    resp.headers["X-Frame-Options"] = "DENY"
    if resp.mimetype == "text/html":
        resp.headers["Content-Security-Policy"] = (
            "default-src 'self'; script-src 'self'; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; "
            "connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
        )
    if request.path.startswith("/api/") and request.path != "/api/file":
        resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/api/ping")
def ping():
    return jsonify(ok=True, version=VERSION)


@app.get("/api/session")
def session_info():
    return jsonify(
        unlocked=is_unlocked(),
        pin_set=bool(CFG.get("pin")),
        pin_length=(CFG.get("pin") or {}).get("length", 4),
        name=CFG.get("name", ""),
        avatar=CFG.get("avatar_v") if AVATAR_PATH.exists() else None,
        lock_after=CFG.get("lock_after", 0),
        storage_name=STORAGE_NAME,
        version=VERSION,
    )


@app.post("/api/unlock")
def unlock():
    if not CFG.get("pin"):
        abort(409, "No PIN set yet. On the Pi run: sudo pi-home pin")
    require_pin(str((request.get_json(silent=True) or {}).get("pin", "")))
    session.clear()
    session.update(ok=True, v=pin_version(), t=time.time())
    return jsonify(ok=True)


@app.post("/api/settings")
def settings():
    data = request.get_json(silent=True) or {}
    if "lock_after" in data:
        value = data.get("lock_after")
        if value not in LOCK_CHOICES:
            abort(400, "Pick one of the auto-lock options.")
        CFG["lock_after"] = value
    save_config(CFG)
    return jsonify(ok=True, lock_after=CFG["lock_after"])


@app.post("/api/profile")
def profile():
    name = str((request.get_json(silent=True) or {}).get("name", "")).strip()
    if not 1 <= len(name) <= 40:
        abort(400, "Use 1 to 40 characters for your name.")
    CFG["name"] = name
    save_config(CFG)
    return jsonify(ok=True, name=name)


def image_type(data):
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


@app.route("/api/avatar", methods=["GET", "PUT", "DELETE"])
def avatar():
    if request.method == "GET":
        if not AVATAR_PATH.exists():
            abort(404, "No profile photo.")
        resp = send_file(AVATAR_PATH, mimetype=CFG.get("avatar_type", "image/jpeg"), max_age=0, conditional=True)
        resp.headers["Cache-Control"] = "private, max-age=86400" if request.args.get("v") else "no-cache"
        return resp
    if request.method == "DELETE":
        AVATAR_PATH.unlink(missing_ok=True)
        CFG.pop("avatar_v", None)
        save_config(CFG)
        return jsonify(ok=True)
    if (request.content_length or 0) > 3 * 1024 ** 2:
        abort(413, "That photo is too big. Try one under 3 MB.")
    data = request.get_data(cache=False)
    kind = image_type(data)
    if kind not in AVATAR_TYPES:
        abort(400, "Use a JPG, PNG or WebP photo.")
    AVATAR_PATH.parent.mkdir(parents=True, exist_ok=True)
    tmp = AVATAR_PATH.with_name("avatar.tmp")
    tmp.write_bytes(data)
    os.chmod(tmp, 0o644)
    tmp.replace(AVATAR_PATH)
    CFG.update(avatar_type=kind, avatar_v=int(time.time()))
    save_config(CFG)
    return jsonify(ok=True, avatar=CFG["avatar_v"])


@app.post("/api/lock")
def lock():
    session.clear()
    return jsonify(ok=True)


@app.get("/api/touch")
def touch():
    return jsonify(ok=True)


@app.post("/api/pin")
def change_pin():
    data = request.get_json(silent=True) or {}
    require_pin(str(data.get("current", "")))
    new = str(data.get("new", ""))
    if not valid_new_pin(new):
        abort(400, "The new PIN must be 4 to 6 digits.")
    CFG["pin"] = hash_pin(new)
    save_config(CFG)
    session.update(ok=True, v=pin_version(), t=time.time())
    return jsonify(ok=True)


_cpu = {"pct": 0.0}
_updates = {"count": None, "checked": 0.0}


def _cpu_sampler():
    prev = None
    while True:
        try:
            v = list(map(int, read("/proc/stat").splitlines()[0].split()[1:]))
            idle, total = v[3] + v[4], sum(v)
            if prev and total > prev[1]:
                _cpu["pct"] = round(100 * (1 - (idle - prev[0]) / (total - prev[1])), 1)
            prev = (idle, total)
        except Exception:
            pass
        time.sleep(2)


def check_updates():
    code, out = run(["apt", "list", "--upgradable"], timeout=90)
    if code == 0:
        _updates["count"] = sum(1 for line in out.splitlines() if "[upgradable from" in line)
    _updates["checked"] = time.time()


def _updates_checker():
    while True:
        check_updates()
        time.sleep(30 * 60)


def memory():
    info = {}
    for line in read("/proc/meminfo").splitlines():
        key, _, val = line.partition(":")
        parts = val.split()
        if parts and parts[0].isdigit():
            info[key] = int(parts[0]) * 1024
    total = info.get("MemTotal", 0)
    avail = info.get("MemAvailable", 0)
    return {"total": total, "available": avail, "used": max(total - avail, 0)}


def disk(path):
    try:
        u = shutil.disk_usage(path)
        return {"total": u.total, "used": u.used, "free": u.free}
    except Exception:
        return None


def storage_ready():
    return STORAGE.is_dir() and (os.path.ismount(STORAGE) or not REQUIRE_MOUNT)


def temperature():
    t = read("/sys/class/thermal/thermal_zone0/temp")
    return round(int(t) / 1000, 1) if t.lstrip("-").isdigit() else None


def power_state():
    code, out = run(["vcgencmd", "get_throttled"], timeout=5)
    if code != 0 or "=" not in out:
        return None
    try:
        bits = int(out.split("=")[1].strip(), 16)
    except ValueError:
        return None
    if bits & 0xF:
        return "now"
    if bits & 0xF0000:
        return "past"
    return "ok"


def service_states():
    units = [unit for _, unit, _ in SERVICES]
    _, out = run(["systemctl", "show", "--property=Id,LoadState,ActiveState", *units], timeout=8)
    info = {}
    for block in out.split("\n\n"):
        props = dict(line.split("=", 1) for line in block.splitlines() if "=" in line)
        unit = props.get("Id", "").removesuffix(".service")
        if unit:
            info[unit] = props
    result = []
    for label, unit, restartable in SERVICES:
        props = info.get(unit, {})
        if props.get("LoadState") != "loaded":
            continue
        state = props.get("ActiveState", "unknown")
        result.append({"name": label, "unit": unit, "active": state == "active",
                       "state": state, "restartable": restartable})
    return result


def alerts_for(temp, power, services, disks, updates):
    items = []
    if temp is not None and temp >= 75:
        items.append({"level": "danger", "text": f"Pi is hot: {temp:.0f}°C. Check the fan and airflow."})
    elif temp is not None and temp >= 65:
        items.append({"level": "warn", "text": f"Pi is warm: {temp:.0f}°C."})
    if power == "now":
        items.append({"level": "danger", "text": "Low power right now. Check the power adapter."})
    elif power == "past":
        items.append({"level": "warn", "text": "Power dipped since the last restart."})
    for s in services:
        if not s["active"]:
            items.append({"level": "danger", "text": f"{s['name']} is stopped."})
    if disks.get("storage") is None:
        items.append({"level": "warn", "text": f"The {STORAGE_NAME} drive is not connected."})
    for key, label in (("sd", "SD card"), ("storage", STORAGE_NAME)):
        d = disks.get(key)
        if d and d["total"] and d["used"] / d["total"] > 0.9:
            items.append({"level": "warn", "text": f"{label} is almost full."})
    if updates:
        items.append({"level": "info", "text": f"{updates} update{'s' if updates != 1 else ''} available."})
    return items


@app.get("/api/status")
def status():
    temp = temperature()
    power = power_state()
    services = service_states()
    disks = {"sd": disk("/"), "storage": disk(STORAGE) if storage_ready() else None}
    return jsonify(
        temp=temp,
        cpu=_cpu["pct"],
        mem=memory(),
        disks=disks,
        uptime=float(read("/proc/uptime", "0").split()[0] or 0),
        power=power,
        services=services,
        updates=_updates["count"],
        host=socket.gethostname(),
        alerts=alerts_for(temp, power, services, disks, _updates["count"]),
        time=time.time(),
    )


_ph = {"sid": None, "ready": False, "lock": threading.Lock()}
_cache = {}


def cached(key, seconds, fn):
    hit = _cache.get(key)
    if hit and time.time() - hit[0] < seconds:
        return hit[1]
    value = fn()
    _cache[key] = (time.time(), value)
    return value


def _pihole_auth():
    password = read(PIHOLE_PW_FILE)
    req = urllib.request.Request(
        PIHOLE_API + "/auth",
        data=json.dumps({"password": password}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=6) as r:
        data = json.load(r)
    _ph["sid"] = (data.get("session") or {}).get("sid")
    _ph["ready"] = True


def pihole(method, path, body=None):
    with _ph["lock"]:
        for attempt in range(2):
            if not _ph["ready"]:
                _pihole_auth()
            headers = {"Content-Type": "application/json"}
            if _ph["sid"]:
                headers["X-FTL-SID"] = _ph["sid"]
            req = urllib.request.Request(
                PIHOLE_API + path,
                data=json.dumps(body).encode() if body is not None else None,
                headers=headers,
                method=method,
            )
            try:
                with urllib.request.urlopen(req, timeout=8) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                if e.code == 401 and attempt == 0:
                    _ph.update(sid=None, ready=False)
                    continue
                raise


def pihole_or_502(method, path, body=None):
    try:
        return pihole(method, path, body)
    except Exception as e:
        abort(502, f"Pi-hole isn't answering ({e.__class__.__name__}).")


@app.get("/api/pihole")
def pihole_summary():
    s = pihole_or_502("GET", "/stats/summary")
    b = pihole_or_502("GET", "/dns/blocking")
    q = s.get("queries", {})
    return jsonify(
        total=q.get("total", 0),
        blocked=q.get("blocked", 0),
        percent=q.get("percent_blocked", 0.0),
        domains=(s.get("gravity") or {}).get("domains_being_blocked", 0),
        clients=(s.get("clients") or {}).get("active", 0),
        blocking=b.get("blocking") == "enabled",
        timer=b.get("timer"),
    )


def _history_days():
    today = date.today()
    days = [today - timedelta(days=i) for i in range(6, -1, -1)]
    buckets = {d: {"blocked": 0, "total": 0} for d in days}
    start = int(datetime.combine(days[0], datetime.min.time()).timestamp())
    try:
        data = pihole("GET", f"/history/database?from={start}&until={int(time.time())}")
    except Exception:
        data = pihole("GET", "/history")
    for h in data.get("history", []):
        d = datetime.fromtimestamp(h.get("timestamp", 0)).date()
        if d in buckets:
            buckets[d]["blocked"] += int(h.get("blocked", 0) or 0)
            buckets[d]["total"] += int(h.get("total", 0) or 0)
    return [
        {"date": d.isoformat(), "label": "Today" if d == today else d.strftime("%a"), **buckets[d]}
        for d in days
    ]


@app.get("/api/pihole/history")
def pihole_history():
    try:
        return jsonify(days=cached("history", 300, _history_days))
    except Exception as e:
        abort(502, f"Pi-hole isn't answering ({e.__class__.__name__}).")


@app.get("/api/pihole/top")
def pihole_top():
    data = pihole_or_502("GET", "/stats/top_domains?blocked=true&count=8")
    return jsonify(domains=[{"domain": d.get("domain"), "count": d.get("count", 0)}
                            for d in data.get("domains", [])])


@app.post("/api/pihole/blocking")
def pihole_blocking():
    data = request.get_json(silent=True) or {}
    if data.get("enable", True):
        body = {"blocking": True, "timer": None}
    else:
        minutes = data.get("minutes")
        body = {"blocking": False, "timer": int(minutes) * 60 if minutes else None}
    pihole_or_502("POST", "/dns/blocking", body)
    return jsonify(ok=True)


def device_title(name, os_name):
    n = (name or "").lower()
    for key, title in (("ipad", "iPad"), ("iphone", "iPhone"), ("oneplus", "OnePlus"),
                       ("pixel", "Pixel"), ("samsung", "Samsung"), ("fedora", "Fedora computer"),
                       ("ubuntu", "Ubuntu computer"), ("macbook", "MacBook")):
        if key in n:
            return title
    return {"windows": "Windows PC", "macOS": "Mac", "android": "Android phone",
            "iOS": "iPhone or iPad", "linux": "Linux computer"}.get(os_name, name or "Device")


def device_kind(name, os_name):
    n = (name or "").lower()
    if "ipad" in n or "tab" in n:
        return "tablet"
    if os_name in ("android", "iOS"):
        return "phone"
    return "laptop"


@app.get("/api/devices")
def devices():
    def load():
        code, out = run(["tailscale", "status", "--json"], timeout=10)
        if code != 0:
            return None
        data = json.loads(out)
        items = []
        for peer in (data.get("Peer") or {}).values():
            host = (peer.get("DNSName") or "").split(".")[0] or peer.get("HostName", "")
            online = bool(peer.get("Online"))
            items.append({
                "name": host,
                "title": device_title(host, peer.get("OS")),
                "kind": device_kind(host, peer.get("OS")),
                "state": ("online" if peer.get("Active") else "idle") if online else "offline",
                "last_seen": peer.get("LastSeen"),
                "exit_node": bool(peer.get("ExitNode")),
            })
        order = {"online": 0, "idle": 1, "offline": 2}
        items.sort(key=lambda d: (order[d["state"]], d["title"]))
        self_node = data.get("Self") or {}
        return {"devices": items, "self": (self_node.get("DNSName") or "").rstrip(".")}

    result = cached("devices", 20, load)
    if result is None:
        _cache.pop("devices", None)
        abort(502, "Tailscale isn't answering.")
    return jsonify(result)


NAME_BAD = re.compile(r"[\x00/\\]")


def need_storage():
    if not storage_ready():
        abort(503, f"The {STORAGE_NAME} drive isn't connected.")


def safe_path(rel):
    need_storage()
    p = (STORAGE / str(rel or "").lstrip("/")).resolve()
    if p != STORAGE and STORAGE not in p.parents:
        abort(400, f"That path is outside {STORAGE_NAME}.")
    return p


def rel_path(p):
    return "" if p == STORAGE else p.relative_to(STORAGE).as_posix()


def clean_name(name):
    name = str(name or "").strip()
    if not name or name in (".", "..") or NAME_BAD.search(name) or len(name.encode()) > 255:
        abort(400, "That name can't be used.")
    return name


def give_to_owner(p):
    try:
        st = STORAGE.stat()
        os.chown(p, st.st_uid, st.st_gid)
    except Exception:
        pass


def entry(p):
    st = p.stat()
    return {"name": p.name, "path": rel_path(p), "dir": p.is_dir(),
            "size": st.st_size if p.is_file() else None, "mtime": int(st.st_mtime)}


def visible(p):
    return not p.name.startswith(".") and p.name != "lost+found"


@app.get("/api/files")
def list_files():
    p = safe_path(request.args.get("path", ""))
    if not p.is_dir():
        abort(404, "Folder not found.")
    items = []
    for e in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
        if visible(e):
            try:
                items.append(entry(e))
            except OSError:
                continue
    return jsonify(path=rel_path(p), items=items, disk=disk(STORAGE))


@app.get("/api/files/search")
def search_files():
    need_storage()
    q = request.args.get("q", "").strip().casefold()
    if not q:
        return jsonify(items=[])
    found = []
    for root, dirs, files in os.walk(STORAGE):
        dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d != "lost+found")
        for name in sorted(dirs + files):
            if q in name.casefold() and not name.startswith("."):
                try:
                    found.append(entry(Path(root) / name))
                except OSError:
                    continue
                if len(found) >= 200:
                    return jsonify(items=found, more=True)
    return jsonify(items=found, more=False)


ACTIVE_TYPES = {".html", ".htm", ".xhtml", ".svg", ".svgz", ".xml", ".js", ".mjs"}


@app.get("/api/file")
def get_file():
    p = safe_path(request.args.get("path", ""))
    if not p.is_file():
        abort(404, "File not found.")
    download = request.args.get("dl") == "1" or p.suffix.lower() in ACTIVE_TYPES
    resp = send_file(p, as_attachment=download, download_name=p.name, conditional=True, max_age=0)
    resp.headers["Cache-Control"] = "private, no-cache"
    return resp


def unique_child(folder, name):
    dest = folder / name
    stem, suffix = Path(name).stem, Path(name).suffix
    n = 1
    while dest.exists():
        dest = folder / f"{stem} ({n}){suffix}"
        n += 1
    return dest


@app.put("/api/upload")
def upload():
    folder = safe_path(request.args.get("path", ""))
    if not folder.is_dir():
        abort(404, "Folder not found.")
    name = clean_name(request.args.get("name"))
    size = request.content_length
    free = shutil.disk_usage(folder).free
    if size and size > free - 50 * 1024 ** 2:
        abort(507, f"Not enough space on {STORAGE_NAME}.")
    dest = unique_child(folder, name)
    part = folder / f".{dest.name}.part-{secrets.token_hex(4)}"
    try:
        with open(part, "wb") as out:
            while True:
                chunk = request.stream.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        if size is not None and part.stat().st_size != size:
            raise OSError("upload was cut off")
        os.replace(part, dest)
    except Exception:
        part.unlink(missing_ok=True)
        abort(500, "The upload didn't finish. Please try again.")
    give_to_owner(dest)
    return jsonify(ok=True, item=entry(dest))


@app.post("/api/mkdir")
def mkdir():
    data = request.get_json(silent=True) or {}
    parent = safe_path(data.get("path", ""))
    dest = parent / clean_name(data.get("name"))
    if dest.exists():
        abort(409, "Something with that name is already here.")
    dest.mkdir()
    give_to_owner(dest)
    return jsonify(ok=True)


@app.post("/api/files/rename")
def rename():
    data = request.get_json(silent=True) or {}
    src = safe_path(data.get("path", ""))
    if src == STORAGE or not src.exists():
        abort(404, "Not found.")
    dest = src.parent / clean_name(data.get("name"))
    if dest.exists():
        abort(409, "Something with that name is already here.")
    src.rename(dest)
    return jsonify(ok=True)


@app.post("/api/files/delete")
def delete_file():
    data = request.get_json(silent=True) or {}
    require_pin(str(data.get("pin", "")))
    p = safe_path(data.get("path", ""))
    if p == STORAGE:
        abort(400, f"{STORAGE_NAME} itself can't be deleted.")
    if p.is_dir() and not p.is_symlink():
        shutil.rmtree(p)
    elif p.exists() or p.is_symlink():
        p.unlink()
    else:
        abort(404, "Not found.")
    return jsonify(ok=True)


def later(cmd, delay=1.5):
    threading.Timer(delay, lambda: subprocess.Popen(cmd)).start()


@app.post("/api/power")
def power():
    data = request.get_json(silent=True) or {}
    action = data.get("action")
    if action not in ("reboot", "poweroff"):
        abort(400, "Unknown action.")
    require_pin(str(data.get("pin", "")))
    later(["systemctl", action])
    return jsonify(ok=True)


@app.post("/api/service")
def restart_service():
    data = request.get_json(silent=True) or {}
    unit = data.get("unit")
    if unit not in RESTARTABLE:
        abort(400, "That service can't be restarted here.")
    require_pin(str(data.get("pin", "")))
    if unit == "tailscaled":
        later(["systemctl", "restart", unit])
        return jsonify(ok=True)
    code, out = run(["systemctl", "restart", unit], timeout=90)
    if code != 0:
        abort(500, out or "Restart failed.")
    return jsonify(ok=True)


_jobs = {name: {"running": False, "done": False, "ok": False, "log": "", "started": None}
         for name in JOBS}
ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")


def _append(job, text):
    text = ANSI.sub("", text)
    if "\r" in text:
        text = text.rsplit("\r", 1)[-1]
    job["log"] = (job["log"] + text)[-12000:]


def _run_job(name):
    job = _jobs[name]
    env = dict(os.environ, DEBIAN_FRONTEND="noninteractive", NEEDRESTART_MODE="a", TERM="dumb")
    ok = True
    for cmd in JOBS[name]:
        _append(job, "$ " + " ".join(cmd) + "\n")
        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 text=True, env=env, bufsize=1)
            for line in p.stdout:
                _append(job, line)
            if p.wait() != 0:
                ok = False
                _append(job, f"\nStopped: the command above failed (code {p.returncode}).\n")
                break
        except Exception as e:
            _append(job, f"{e}\n")
            ok = False
            break
    job.update(running=False, done=True, ok=ok)
    if name == "update":
        check_updates()
    if name == "gravity":
        _cache.pop("history", None)


@app.route("/api/jobs/<name>", methods=["GET", "POST"])
def jobs(name):
    if name not in JOBS:
        abort(404, "Unknown job.")
    job = _jobs[name]
    if request.method == "POST":
        require_pin(str((request.get_json(silent=True) or {}).get("pin", "")))
        if not job["running"]:
            job.update(running=True, done=False, ok=False, log="", started=time.time())
            threading.Thread(target=_run_job, args=(name,), daemon=True).start()
    return jsonify(job)


@app.get("/api/about")
def about():
    model = read("/proc/device-tree/model").replace("\x00", "") or "Raspberry Pi"
    os_name = "Linux"
    for line in read("/etc/os-release").splitlines():
        if line.startswith("PRETTY_NAME="):
            os_name = line.split("=", 1)[1].strip('"')
    _, lan = run(["hostname", "-I"], timeout=5)
    _, ts = run(["tailscale", "ip", "-4"], timeout=5)
    ts_ip = ts.splitlines()[0].strip() if ts and ts[0].isdigit() else ""
    lan_ip = next((ip for ip in lan.split() if ip.count(".") == 3 and not ip.startswith("100.")), "")
    admin_host = ts_ip or lan_ip or "pi.hole"
    return jsonify(
        version=VERSION, model=model, os=os_name, kernel=os.uname().release,
        host=socket.gethostname(), lan_ip=lan_ip, tailscale_ip=ts_ip,
        links=[
            {"label": "Pi-hole admin", "url": f"http://{admin_host}/admin"},
            {"label": "Raspberry Pi Connect", "url": "https://connect.raspberrypi.com/devices"},
            {"label": "Tailscale admin", "url": "https://login.tailscale.com/admin/machines"},
        ],
    )


def shell_file(name, mimetype):
    text = (STATIC / name).read_text().replace("__VERSION__", VERSION)
    resp = Response(text, mimetype=mimetype)
    resp.headers["Cache-Control"] = "no-cache"
    return resp


@app.get("/")
def index():
    return shell_file("index.html", "text/html")


@app.get("/sw.js")
def service_worker():
    return shell_file("sw.js", "text/javascript")


@app.get("/manifest.webmanifest")
def manifest():
    return shell_file("manifest.webmanifest", "application/manifest+json")


@app.get("/<path:name>")
def static_file(name):
    p = (STATIC / name).resolve()
    if STATIC not in p.parents or not p.is_file():
        abort(404, "Not found.")
    resp = send_file(p, mimetype=mimetypes.guess_type(p.name)[0], max_age=0, conditional=True)
    if "v" in request.args:
        resp.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return resp


def cli_set_pin():
    print("Choose a PIN for Pi Home: 4 to 6 digits. You'll type it to open the app.")
    while True:
        pin = getpass.getpass("New PIN: ")
        if not valid_new_pin(pin):
            print("  Use 4 to 6 digits only. Try again.")
            continue
        if getpass.getpass("Type it again: ") != pin:
            print("  Those didn't match. Try again.")
            continue
        break
    CFG["pin"] = hash_pin(pin)
    save_config(CFG)
    print("PIN saved.")
    return 0


def main():
    if len(sys.argv) > 1:
        if sys.argv[1] == "set-pin":
            return cli_set_pin()
        if sys.argv[1] == "has-pin":
            return 0 if CFG.get("pin") else 1
        print("Usage: app.py [set-pin|has-pin]")
        return 2
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("werkzeug").setLevel(logging.WARNING)
    threading.Thread(target=_cpu_sampler, daemon=True).start()
    threading.Thread(target=_updates_checker, daemon=True).start()
    from werkzeug.serving import run_simple
    log.info("Pi Home %s on http://%s:%s", VERSION, HOST, PORT)
    run_simple(HOST, PORT, app, threaded=True, use_reloader=False, use_debugger=False)
    return 0


if __name__ == "__main__":
    sys.exit(main())
