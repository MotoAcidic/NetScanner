# NetScanner

A lightweight, portable network scanning tool for discovering switches and mapping devices across network segments. Built for MSP technicians working with multiple client networks via ScreenConnect.

## Features

- **Multi-brand support**: UniFi, Aruba, and HP switches
- **Automatic discovery**: Scan subnets for active switches without manual intervention
- **Device mapping**: See which MAC address is connected to which port on which switch
- **VLAN tracking**: Monitor VLAN assignments and port configurations
- **Real-time updates**: Live scan progress with detailed logging
- **Secure credentials**: Encrypted credential storage (local only)
- **Portable**: Single .exe file - just drop it in ScreenConnect and run
- **Cross-platform**: Works on Windows and Linux (or build for Linux)
- **Web UI**: Clean, intuitive browser-based interface

## Quick Start (Windows .exe)

1. **Download** `NetScanner.exe` from the dist folder
2. **Double-click** the .exe (web UI opens automatically at http://localhost:5000)
3. **Enter network subnets** (e.g., `192.168.1.0/24, 10.0.0.0/24`)
4. **Add credentials** (optional but recommended):
   - **UniFi**: Controller IP + admin username/password
   - **Aruba/HP**: SSH username/password (same credentials used for all)
5. **Click "Start Scan"**
6. **Review results**: Network map shows switches, table shows device details

## Building from Source

### Prerequisites
- Python 3.8+
- pip
- Git

### Setup

```bash
# Clone repo
git clone <repo>
cd NetScanner

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run locally
python main.py
```

### Build Standalone .exe

```bash
# Install PyInstaller
pip install pyinstaller

# Build the executable
pyinstaller build.spec

# Output: dist/NetScanner.exe (ready to deploy)
```

## Deploying to ScreenConnect

1. **Build the .exe** (see "Build Standalone .exe" above)
2. **Upload to ScreenConnect**:
   - Toolbox → Files → Upload `NetScanner.exe`
   - Or store in a shared network folder
3. **Launch from ScreenConnect**:
   - Execute the .exe during a client session
   - Browser opens automatically with the web UI

## Supported Switches

### UniFi
- **Requirements**: Controller must be accessible (same network or VPN)
- **Access**: API via controller (port 8443)
- **Credentials**: UniFi admin account

### Aruba
- **Requirements**: SSH enabled on switches
- **Access**: SSH (port 22)
- **Credentials**: Admin account with CLI access
- **Fallback**: Reads config if SNMP not enabled

### HP/HPE
- **Requirements**: SSH enabled on switches
- **Access**: SSH (port 22)
- **Credentials**: Admin account with CLI access
- **Fallback**: Reads config if SNMP not enabled

## Security Notes

- **Encrypted storage**: Credentials saved locally with AES-256 encryption
- **No telemetry**: All scanning happens on your machine, nothing sent externally
- **No persistent data**: Results deleted after scan unless explicitly saved
- **Medical-compliant**: Safe for HIPAA and other compliance requirements
- **No installation**: Portable .exe doesn't modify system files

## How It Works

1. **Network Discovery**: Pings subnets to find active hosts
2. **Switch Identification**: Attempts SSH/SNMP to identify switch type
3. **Data Collection**:
   - Queries switch MAC tables
   - Retrieves VLAN information
   - Gets port status and configuration
4. **Display**: Shows results as:
   - Network topology map
   - Interactive device table (searchable)
   - Export-ready JSON data

## Troubleshooting

### No switches found
- Verify subnets are correct
- Check firewall isn't blocking ICMP (ping)
- Try providing SSH credentials for manual queries

### "Connection refused" on UniFi
- Confirm controller IP is correct
- Check controller port 8443 is accessible
- Verify credentials are correct

### SSH timeouts on Aruba/HP
- Ensure SSH is enabled on switch
- Check SSH port is 22 (non-standard not supported)
- Confirm credentials allow CLI access

### Credential errors
- Credentials are encrypted locally - can't be recovered if lost
- Re-enter credentials if needed
- Click "Save Configuration" to persist settings

### Performance issues
- Reduce number of subnets per scan
- Large subnets (/20 and larger) may timeout
- Try smaller ranges if needed

## Architecture

```
NetScanner/
├── main.py                      # Entry point
├── app/
│   ├── network_discovery.py     # Subnet scanning, host detection
│   ├── drivers/                 # Switch drivers
│   │   ├── base.py              # Base driver class
│   │   ├── unifi.py             # UniFi driver (API-based)
│   │   ├── aruba.py             # Aruba driver (SSH-based)
│   │   └── hp.py                # HP driver (SSH-based)
│   ├── web_ui.py                # Flask backend
│   ├── config.py                # Configuration management
│   └── security.py              # Credential encryption
├── templates/index.html         # Web UI
├── static/
│   ├── app.js                   # Frontend logic
│   └── style.css                # Styling
├── requirements.txt             # Python dependencies
└── build.spec                   # PyInstaller config
```

## Data Flow

```
┌─────────┐
│ Browser │ (http://localhost:5000)
└────┬────┘
     │
┌────▼──────┐
│ Flask App │ (Web UI + API)
└────┬──────┘
     │
┌────▼──────────────────┐
│ Network Discovery     │ (Ping sweep)
│ Switch Identification │ (SSH/SNMP banner grab)
└────┬──────────────────┘
     │
┌────▼────────────────────────────────┐
│ Switch Drivers                      │
├─────────────────────────────────────┤
│ UniFi API      │ Aruba SSH  │ HP SSH │
└────┬───────────┴────────────┴────────┘
     │
     ▼
┌──────────────────────┐
│ Results & Analysis   │
│ (MAC tables, VLANs)  │
└──────────────────────┘
```

## Contributing

Found a bug or want to add support for another switch brand? Submit a PR or issue!

## License

See LICENSE file

## FAQ

**Q: Can I scan multiple networks at once?**
A: Yes - enter multiple subnets separated by commas (e.g., `192.168.1.0/24, 10.0.0.0/24`)

**Q: How long does a scan take?**
A: Typically 2-10 minutes depending on network size and responsiveness of switches

**Q: Will it work without credentials?**
A: Yes, but limited. Auto-discovery will identify switches, but you won't get MAC tables without SSH/API access

**Q: Is the web interface secure?**
A: It runs on localhost only - not exposed to network. Credentials are encrypted locally.

**Q: Can I schedule scans automatically?**
A: Not built-in, but you can script the execution and API calls

**Q: What if a switch times out?**
A: Scan will skip it and continue with others. Retry with smaller subnets if needed.