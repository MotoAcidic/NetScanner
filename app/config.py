"""Configuration management"""
import os
import json
from pathlib import Path

CONFIG_DIR = Path.home() / '.netscanner'
CONFIG_FILE = CONFIG_DIR / 'config.json'

def ensure_config_dir():
    """Create config directory if it doesn't exist"""
    CONFIG_DIR.mkdir(exist_ok=True)

def load_config():
    """Load configuration from file"""
    ensure_config_dir()
    if CONFIG_FILE.exists():
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {
        'subnets': [],
        'credentials': {},
        'scan_history': []
    }

def save_config(config):
    """Save configuration to file"""
    ensure_config_dir()
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def get_scan_history():
    """Get historical scans"""
    config = load_config()
    return config.get('scan_history', [])

def add_scan_to_history(scan_result):
    """Add a scan result to history"""
    config = load_config()
    config['scan_history'].append(scan_result)
    # Keep only last 50 scans
    config['scan_history'] = config['scan_history'][-50:]
    save_config(config)
