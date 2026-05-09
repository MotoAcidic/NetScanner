#!/usr/bin/env python3
"""Build NetScanner into a standalone exe"""
import PyInstaller.__main__
import os
import shutil

# Clean old builds
if os.path.exists('dist'):
    shutil.rmtree('dist')
if os.path.exists('build'):
    shutil.rmtree('build')
if os.path.exists('NetScanner.spec'):
    os.remove('NetScanner.spec')

# Build arguments
args = [
    'main.py',
    '--name=NetScanner',
    '--onefile',  # Single exe file
    '--add-data=ui-server.js:.',
    '--add-data=static:static',
    '--add-data=app:app',
    '--collect-all=cryptography',
    '--collect-all=paramiko',
    '--collect-all=pysnmp',
    '--hidden-import=flask',
    '--hidden-import=flask_cors',
    '--hidden-import=requests',
    '--hidden-import=cryptography',
    '--hidden-import=netaddr',
    '--hidden-import=paramiko',
    '--hidden-import=scapy',
    '--hidden-import=pysnmp',
    '--icon=NONE',
]

print("Building NetScanner.exe...")
print("This may take 2-3 minutes...")

PyInstaller.__main__.run(args)

print("\n[OK] Build complete!")
print("Run: dist/NetScanner.exe")
