# NetScanner - Portable Package

This is a self-contained, portable version of NetScanner that requires **only Python 3.8+** to be installed on the target machine.

## What's Included

- `NetScanner.bat` - Launcher script (double-click this)
- `nodejs/` - Bundled Node.js (66MB, no installation needed)
- `main.py` - Python launcher
- `ui-server.js` - Web UI server
- `app/` - Backend logic
- `static/` - UI assets
- `requirements.txt` - Python dependencies

## Requirements

- **Windows** (any version)
- **Python 3.8+** already installed
  - Check: Open CMD and type `python --version`
  - If not installed: Download from python.org

**That's it. No Node.js installation needed—it's bundled here.**

## How to Use

### On Any Machine:

1. **Copy entire folder** to USB, network share, or local disk
2. **Double-click `NetScanner.bat`**
3. Browser opens automatically to http://localhost:3000
4. Enter subnets and scan

### First Run:

The batch file will:
- Check for Python
- Install Python dependencies (one-time, ~1-2 min)
- Start both servers
- Open browser

### Subsequent Runs:

Just double-click `NetScanner.bat` and it starts immediately.

## In Medical/Locked-Down Environments:

- No installation required
- No registry changes
- Can run from USB
- Can run from network share
- Portable, completely self-contained
- Safe to run on any server

## Troubleshooting

**"Python is not installed"**
- Install Python from https://python.org
- During installation, check "Add Python to PATH"
- Restart the batch file

**"Port 3000 already in use"**
- Close other instances or restart
- Edit `main.py` to use different ports if needed

**"Cannot find nodejs"**
- Verify `nodejs/` folder is present
- Verify `nodejs/node.exe` file exists
- Re-copy the entire portable folder if missing files

## To Stop

- Press `Ctrl+C` in the command window, or
- Close the command window

## File Size

~130 MB total (includes bundled Node.js)

Portable. Lightweight. Zero dependencies except Python.

Use it anywhere.
