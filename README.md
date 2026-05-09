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
- **Cross-platform**: Works on Windows and Linux
- **Web UI**: Clean, intuitive browser-based interface

## Quick Start

### Prerequisites
- Windows or Linux
- Ability to reach switches on network (SSH or SNMP)
- Switch credentials (optional, but recommended for detailed data)

### Usage

1. **Download the .exe** from releases
2. **Double-click** to start (web UI opens automatically)
3. **Enter network subnets** (e.g., `192.168.1.0/24`)
4. **Add credentials** (optional):
   - UniFi Controller IP + username/password
   - Aruba/HP SSH username/password
5. **Click "Start Scan"**
6. **Review results** in the network map and device table

### Building from Source

**Requirements:**
- Python 3.8+
- pip

**Setup:**

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

**Build standalone .exe:**

```bash
pip install pyinstaller
pyinstaller build.spec
# .exe will be in dist/NetScanner.exe
```

## Supported Switches

- **UniFi**: Requires UniFi Controller access (API)
- **Aruba**: SSH or SNMP access
- **HP/HPE**: SSH or SNMP access

## Security Notes

- Credentials are encrypted locally using `cryptography` library
- No telemetry or data sent externally
- All scanning happens on your machine
- Safe for medical/HIPAA environments
- ScreenConnect integration = no permanent installation

## Troubleshooting

**No switches found?**
- Check subnets are correct
- Verify switches are reachable (ping them first)
- Try with credentials if SNMP not enabled

**Credentials not working?**
- Confirm switch accepts SSH connections
- Check username/password are correct
- Some switches may require specific auth methods

**Performance issues?**
- Reduce number of subnets per scan
- Check network connectivity to switches
- Close other browser tabs

## Architecture

```
NetScanner/
├── main.py                 # Entry point
├── app/
│   ├── network_discovery.py   # Subnet scanning & host discovery
│   ├── drivers/               # Switch drivers
│   │   ├── base.py
│   │   ├── unifi.py
│   │   ├── aruba.py
│   │   └── hp.py
│   ├── web_ui.py             # Flask backend
│   ├── config.py             # Configuration management
│   └── security.py           # Credential encryption
├── templates/index.html      # Web UI
├── static/
│   ├── app.js               # Frontend logic
│   └── style.css            # Styling
└── requirements.txt         # Python dependencies
```

## Contributing

Found a bug or want to add support for another switch brand? Submit a PR!

## License

See LICENSE file