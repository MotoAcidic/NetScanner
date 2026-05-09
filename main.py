"""Network Scanner - Runs Python API and Node.js UI Server"""
import os
import sys
import subprocess
import time

app_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(app_dir)
sys.path.insert(0, app_dir)

print("\n" + "="*60)
print("  NETSCANNER - Network Discovery Tool")
print("="*60 + "\n")

# Start Python API server
print("[1/2] Starting Python API server...")
try:
    from app.web_ui import create_app
    from threading import Thread
    from waitress import serve

    app = create_app()
    app.logger.disabled = True

    def run_api():
        serve(app, host='localhost', port=5000, _quiet=True)

    api_thread = Thread(target=run_api, daemon=True)
    api_thread.start()
    time.sleep(1)
    print("      [OK] API running on http://localhost:5000\n")
except Exception as e:
    print(f"      [ERROR] {e}\n")
    sys.exit(1)

# Start Node.js UI server
print("[2/2] Starting Node.js UI server...")
try:
    ui_process = subprocess.Popen(
        ['node', os.path.join(app_dir, 'ui-server.js')],
        cwd=app_dir
    )
    time.sleep(2)
    print("      [OK] UI running on http://localhost:3000\n")
except FileNotFoundError:
    print("      [ERROR] Node.js not found!")
    print("      Please install Node.js from https://nodejs.org/\n")
    sys.exit(1)

print("="*60)
print("  NetScanner is running!")
print("="*60)
print("\n  Open your browser: http://localhost:3000")
print("  API endpoint:      http://localhost:5000")
print("\n  Press Ctrl+C to stop\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n\nShutting down...")
    ui_process.terminate()
    ui_process.wait()
    print("Done!\n")
    sys.exit(0)
