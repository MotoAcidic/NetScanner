"""Network Scanner - Runs Python API and Node.js UI Server"""
import os
import sys
import subprocess
import time
import socket

app_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(app_dir)
sys.path.insert(0, app_dir)

def kill_port_processes(port):
    """Kill any existing processes on the given port"""
    try:
        if sys.platform == 'win32':
            import ctypes
            result = subprocess.run(
                f'netstat -ano | find ":{port}"',
                shell=True, capture_output=True, text=True
            )
            for line in result.stdout.split('\n'):
                if ':' + str(port) in line:
                    parts = line.split()
                    if len(parts) > 0:
                        try:
                            pid = int(parts[-1])
                            subprocess.run(f'taskkill /F /PID {pid}', shell=True, stderr=subprocess.DEVNULL)
                        except:
                            pass
    except:
        pass

print("\n" + "="*60)
print("  NETSCANNER - Network Discovery Tool")
print("="*60 + "\n")

# Clean up any stuck processes
print("[0/2] Cleaning up old processes...")
kill_port_processes(5000)
kill_port_processes(3000)
time.sleep(1)
print("      [OK]\n")

# Start Python API server
print("[1/2] Starting Python API server...")
try:
    from app.web_ui import create_app
    print(f"      [DEBUG] create_app imported from: {create_app.__module__}")
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
ui_process = None
try:
    ui_process = subprocess.Popen(
        ['node', os.path.join(app_dir, 'ui-server.js')],
        cwd=app_dir,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    time.sleep(2)
    print("      [OK] UI running on http://localhost:3000\n")
except FileNotFoundError:
    print("      [WARNING] Node.js not found in PATH")
    print("      Using bundled Node.js...\n")
    try:
        node_path = os.path.join(app_dir, 'nodejs', 'node.exe')
        if os.path.exists(node_path):
            ui_process = subprocess.Popen(
                [node_path, os.path.join(app_dir, 'ui-server.js')],
                cwd=app_dir,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            time.sleep(2)
            print("      [OK] UI running on http://localhost:3000\n")
        else:
            print("      [ERROR] Node.js not found!")
            print("      Make sure nodejs/node.exe is present\n")
            sys.exit(1)
    except Exception as e:
        print(f"      [ERROR] {e}\n")
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
    if ui_process:
        ui_process.terminate()
        try:
            ui_process.wait(timeout=2)
        except:
            ui_process.kill()
    print("Done!\n")
    sys.exit(0)
