# NetScanner - Getting Started

## What You Have

A lightweight network discovery tool that:
- Scans your network for active devices (ARP scanning)
- Identifies potential switches/routers
- Shows everything in a web interface
- **Zero risk** - doesn't log into anything, can't change configs
- **No external dependencies** - Node.js has zero npm packages

## Prerequisites

### 1. Python 3.8+
You already have this. Verify:
```bash
python --version
```

### 2. Node.js (Just the binary, no npm)
Download from: https://nodejs.org/ (LTS version is fine)

Verify:
```bash
node --version
```

### 3. Python packages
Run once:
```bash
pip install -r requirements.txt
```

That's it. You're done with setup.

## How to Run

### Quick Start
```bash
python main.py
```

This will:
1. Start Python API server (port 5000)
2. Start Node.js UI server (port 3000)
3. Open browser automatically

**That's it. You're scanning.**

### Manual (if auto-open doesn't work)
```bash
python main.py
```

Then open: `http://localhost:3000`

## What to Do

1. **Enter network subnets**
   - Format: `192.168.1.0/24` or `10.0.0.0/24, 192.168.0.0/24`
   - Can do multiple (comma-separated)

2. **Click "Start Scan"**

3. **Watch progress** 
   - Real-time log shows what it's finding
   - Takes 30 seconds to a few minutes

4. **View results**
   - See all active MAC addresses
   - Vendor info for each device
   - Potential network devices identified

5. **Click devices for details**

## File Structure

```
NetScanner/
├── main.py              # Run this
├── ui-server.js         # Web server (Node.js)
├── requirements.txt     # Python dependencies
├── app/
│   ├── web_ui.py       # REST API
│   ├── network_discovery.py  # Scanning logic
│   ├── security.py     # Credential encryption
│   └── drivers/        # Switch drivers (optional)
└── static/
    └── index.html      # Web UI (embedded)
```

## Usage Examples

### Basic scan
```
Subnets: 192.168.1.0/24
Click: Start Scan
Result: See all devices on that subnet
```

### Multiple subnets
```
Subnets: 192.168.1.0/24, 10.0.0.0/24, 172.16.0.0/22
Click: Start Scan
Result: See everything on all three subnets
```

### With ScreenConnect
1. Download `main.py` and `ui-server.js` to your toolbox
2. Run during client session
3. Browser opens automatically
4. They never know you're scanning
5. You see their network topology

## Common Issues

### "Port 3000 already in use"
```bash
# Kill existing processes
pkill -9 python
pkill -9 node

# Wait 5 seconds
sleep 5

# Try again
python main.py
```

### "Node.js not found"
Install from: https://nodejs.org/
Add to PATH if needed, then restart terminal

### "No devices found"
- Make sure you're scanning an active network
- Try a smaller range (e.g., /25 instead of /24)
- Make sure you can ping the target network

## Optional: Add Credentials

If you want to query switches for additional details (MAC tables, VLANs):

1. Click "Configuration" 
2. Add UniFi Controller IP + credentials OR
3. Add Aruba/HP SSH credentials
4. Click "Save Configuration"

**But this is optional** - the basic scan works without any logins.

## Stop It

Press `Ctrl+C` in the terminal

## What Gets Scanned

- **Your computer**: Safe, read-only operations
- **Target subnets**: ARP scans, ping sweeps, port checks
- **Switches**: Just checks if ports are open (no login attempt)

## What Doesn't Get Changed

- ✓ Nothing. It's completely read-only.
- ✓ No configs modified
- ✓ No settings changed
- ✓ No data deleted
- ✓ No risk whatsoever

## Data Privacy

- All credentials encrypted locally only
- Nothing sent to internet
- Results stored locally in `.netscanner/` folder
- Completely offline-capable

## Next Steps

1. **Test locally**: `python main.py` on your network
2. **Try a subnet**: `192.168.1.0/24` (adjust for your network)
3. **Add to ScreenConnect**: Copy to toolbox, run in client sessions
4. **Stop manually checking switches**: Done!

---

**Questions?** Check `QUICKSTART.md` or `SAFE_MODE.md` for more details.
