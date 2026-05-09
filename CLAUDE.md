# CLAUDE.md — NetScanner Project Memory

> **Read this file first** at the start of every session. It captures the project's purpose, scope, conventions, and constraints so that work stays consistent across conversations.

---

## 1. What this project is

**NetScanner** is a lightweight, **portable** network discovery and asset console designed for **MSP (Managed Service Provider) technicians**. It is launched on a client's machine (typically over ScreenConnect or a similar remote tool) to inventory the local network without requiring installation, admin privileges, or persistent changes to the host.

### Primary goals
1. **Portable above all else** — must run from a USB stick, network share, or remote-session drop without an installer.
2. **MSP / IT operations focus** — the UI and feature set should look and feel like a professional IT operations console (think Auvik / Domotz / NinjaOne aesthetic), not a hobby tool.
3. **Read-only / passive discovery by default** — safe to run in production / medical / locked-down environments. Active interrogation only happens when credentials are explicitly provided.
4. **Multi-vendor switch support** — UniFi, Aruba, HP/HPE today; the driver layer is built to add more vendors.
5. **Single-pane device inventory** — one place to see every host on the network, classified by device type (switch, router, AP, server, computer, printer, VoIP, IoT, etc.) and filterable.

### Non-goals
- Not a vulnerability scanner.
- Not a network monitoring / alerting platform.
- Not an installable desktop app — no MSI, no installer, no service registration.
- Not a cloud / SaaS service — everything runs locally on the technician's machine.

---

## 2. **Working directory: `portable/`**

> **All ongoing development happens inside the `portable/` folder.** This is the canonical, distributable application.

When making changes:
- Edit files under [portable/](portable/) — `portable/main.py`, `portable/app/`, `portable/static/`, `portable/ui-server.js`, etc.
- Do **not** treat the root-level `main.py`, `app/`, `static/`, `ui-server.js` as the source of truth. Those exist for legacy / build reasons but the portable bundle is what ships.
- The portable folder must remain self-contained: bundled `nodejs/`, all assets, no external dependencies at runtime beyond Python 3.8+ on the host.

### Portable folder layout
```
portable/
├── NetScanner.bat        # Primary launcher (double-click)
├── RUN.bat               # Alt launcher
├── DIAGNOSTIC.bat        # Troubleshooting helper
├── README.txt            # End-user instructions
├── main.py               # Python entry — starts Flask API + Node UI server
├── ui-server.js          # Node HTTP server for the web UI (port 3000)
├── requirements.txt      # Python deps (installed on first run)
├── nodejs/
│   └── node.exe          # Bundled Node runtime (no system install needed)
├── app/                  # Python backend
│   ├── web_ui.py         # Flask API (port 5000)
│   ├── config.py         # Config persistence
│   ├── security.py       # Credential encryption (AES-256, local only)
│   ├── network_discovery.py  # ARP / ping sweep / port-based switch detection
│   └── drivers/          # Vendor drivers
│       ├── base.py
│       ├── unifi.py      # UniFi controller API
│       ├── aruba.py      # Aruba SSH
│       └── hp.py         # HP/HPE SSH
└── static/               # Web UI (single-page app)
    ├── index.html
    ├── style.css         # Dark MSP-style theme (slate + accent blue)
    └── app.js            # Tabs, filters, device classification, polling
```

### Runtime model
- `NetScanner.bat` → checks Python → installs requirements (first run) → launches `main.py`
- `main.py` kills any stuck processes on ports 3000 / 5000, starts Flask API on **5000**, then spawns bundled `nodejs/node.exe` to run `ui-server.js` on **3000**, then opens the browser to `http://localhost:3000`.
- The Node UI server proxies API calls to Flask and serves [static/](portable/static/).

---

## 3. Web UI conventions (`portable/static/`)

The UI was redesigned to look like a professional MSP / IT-ops console. Keep the look consistent with these rules:

- **Theme**: dark, navy/slate base (`--bg-0: #0b1220`), accent blue (`--accent: #2f81f7`), CSS variables defined at the top of `style.css`.
- **Typography**: Inter for UI, JetBrains Mono / Consolas for IPs / MACs / code-like values.
- **Layout**: sticky top bar (brand + status pill + last-scan timestamp), two-column main layout (config sidebar on the left, results on the right), KPI strip, tabbed results.
- **Tabs**: Network Map · Device Inventory · MAC / Port Table · Activity Log.
- **Device Inventory tab** is the centerpiece: shows every discovered device with type filter chips (All / Switches / Routers / APs / Servers / Computers / Printers / VoIP / IoT / Unknown) and free-text search. Each chip displays a live count.
- **Color-coded device types** — keep the badge / node-border colors consistent:
  - switch=accent blue, router=warn orange, ap=purple, server=teal, computer=info cyan, printer=pink, phone=success green, iot/unknown=muted gray.
- **No emojis in UI text** unless explicitly requested.

### Device classification
Client-side classifier in `app.js` uses MAC OUI prefix matching plus heuristics (e.g., `.1` / `.254` IPs default to router). When adding new vendor support, extend the `OUI_HINTS` array.

---

## 4. Coding conventions

- **Python**: stdlib first, keep dependencies minimal (see `requirements.txt`). No async frameworks. Threads for parallel ping sweeps. Read-only / passive scanning unless credentials are supplied.
- **Frontend**: vanilla JavaScript, no build step, no framework. All UI state lives in a single `state` object in `app.js`. Use `escapeHtml()` for any user / network data rendered into the DOM.
- **Security**:
  - Credentials encrypted at rest via `app/security.py` (AES-256).
  - No telemetry, no outbound calls beyond what the user-supplied switch drivers require.
  - Always `escapeHtml` untrusted strings before injecting into the DOM.
- **Don't add**: docstrings/comments to code that wasn't changed, "improvement" refactors that weren't requested, error handling for impossible scenarios, single-use abstractions.

---

## 5. Repository layout (top level)

```
NetScanner/
├── portable/         # ← THE APP. Work here.
├── app/              # legacy mirror of portable/app (kept for root-level dev mode)
├── static/           # legacy mirror of portable/static
├── main.py           # legacy root entry point
├── ui-server.js      # legacy root UI server
├── build.py          # PyInstaller build script (one-file .exe alternative to portable bundle)
├── NetScanner.spec   # generated PyInstaller spec
├── RUN.bat           # root-level launcher (legacy)
├── requirements.txt
├── README.md
├── LICENSE
└── docs/             # extended docs (GETTING_STARTED, QUICKSTART, DEPLOYMENT, SAFE_MODE)
```

> The root-level `main.py` / `app/` / `static/` / `ui-server.js` predate the portable bundle. **Treat them as legacy.** When the user asks for a feature or fix, change the portable copy. Mirroring back to the root copy is optional and only relevant if the user is also using the PyInstaller `.exe` build path.

---

## 6. Operating principles for assistants

1. **Default working directory is `portable/`.** Don't edit root-level duplicates unless the user explicitly says so.
2. **Preserve portability.** Never introduce a runtime dependency that requires a system install (no global npm packages, no system services, no registry writes).
3. **Don't break the launcher chain.** `NetScanner.bat` → `main.py` → Flask + bundled Node → browser at `http://localhost:3000`. If you change ports, paths, or process management in `main.py`, update the batch files and `ui-server.js` to match.
4. **Read-only / passive by default.** New scanning features should not require credentials unless the feature genuinely needs them.
5. **Keep the UI MSP-grade.** Match the existing dark theme, tab structure, KPI / chip / badge patterns. No purple gradients, no emoji headers, no hobby-app vibes.
6. **Don't commit build artifacts.** `build/`, `dist/`, `*.pyc`, `__pycache__/`, `*.log` should stay out of git. The bundled `portable/nodejs/node.exe` *is* tracked because it's required for the portable bundle to work.

---

## 7. Quick reference

| Task | Where |
|---|---|
| UI changes | `portable/static/index.html`, `style.css`, `app.js` |
| Add a switch vendor | `portable/app/drivers/<vendor>.py` (extend `base.py`) |
| Change scan logic | `portable/app/network_discovery.py` |
| Change API endpoints | `portable/app/web_ui.py` |
| Change UI server / proxy | `portable/ui-server.js` |
| Change launcher behavior | `portable/NetScanner.bat`, `portable/main.py` |
| End-user docs | `portable/README.txt` |
| Developer docs | `docs/` at repo root |
