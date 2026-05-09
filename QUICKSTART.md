# NetScanner - Quick Start Guide

## What You Have

A complete, portable network discovery tool with:

- **Python Backend** (Flask API) - Network scanning + switch drivers
- **Node.js Frontend** (Pure Vanilla - NO npm packages) - Web UI
- **Zero External Dependencies** - Safe for medical networks
- **Portable** - Run from ScreenConnect toolbox

## How It Works

```
Your Browser (http://localhost:3000)
          ↓
   Node.js UI Server (Port 3000)
          ↓
   Python Flask API (Port 5000)
          ↓
   Network Discovery + Switch Queries
```

## Running NetScanner

### Option 1: Direct Run
```bash
python main.py
```

This will:
1. Start Python API server (port 5000)
2. Start Node.js UI server (port 3000)  
3. Open browser automatically at http://localhost:3000

### Option 2: In ScreenConnect
1. Download `main.py` to ScreenConnect toolbox
2. Run during client session
3. Browser opens automatically

## Features

✓ **Scan Networks** - Enter subnets, auto-discovers switches
✓ **View Topology** - Visual map of all switches found
✓ **Device Table** - See all MAC addresses, ports, VLANs
✓ **Filter & Search** - Find devices by MAC, IP, or port
✓ **Expandable Rows** - Click any device for full details
✓ **Credential Management** - Save UniFi/Aruba/HP credentials securely

## Requirements

- **Python 3.8+** (already have)
- **Node.js** (from nodejs.org - NO npm packages needed)
- **Network access** to switches

## For Your MSP Work

1. **Enter network ranges**: `192.168.1.0/24, 10.0.0.0/24`
2. **Add switch credentials** (optional but recommended)
3. **Click "Start Scan"** - watch real-time progress
4. **View results** - see every device on network
5. **Export** - take screenshots or use data as needed

## Supported Switches

- **UniFi** - Via controller API
- **Aruba** - Via SSH
- **HP/HPE** - Via SSH

## Security

- All credentials encrypted locally
- NO external packages/dependencies
- NO telemetry
- Works offline
- Safe for HIPAA/medical networks

## Troubleshooting

**"Node.js not found"**
- Install from https://nodejs.org/ (just grab binary)

**"No switches found"**
- Check subnets are correct
- Try smaller ranges (/25 instead of /24)
- Add SSH credentials for manual queries

**"Connection refused"**
- Make sure both servers started (check console)
- Try `http://localhost:3000` in browser

## Files

- `main.py` - Launcher (Python + Node.js)
- `ui-server.js` - Web UI (Pure Node.js, zero deps)
- `app/web_ui.py` - REST API (Flask)
- `app/drivers/` - Switch drivers (UniFi, Aruba, HP)
- `requirements.txt` - Python dependencies only

## Next Steps

1. Test with your own network
2. Add to ScreenConnect toolbox
3. Use in client sessions
4. Stop wasting time manually checking switches!

---

**Questions?** Check the code - it's clean, commented, and easy to understand/modify.
