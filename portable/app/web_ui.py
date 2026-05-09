"""Flask web UI"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json
import os
import sys
import socket
import subprocess
from datetime import datetime
from app.network_discovery import NetworkScanner
from app.drivers.unifi import UniFiDriver
from app.drivers.aruba import ArubaDriver
from app.drivers.hp import HPDriver
from app.config import load_config, save_config, add_scan_to_history
from app.security import encrypt_credentials, decrypt_credentials
import threading

def get_machine_info():
    """Get current machine information"""
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)

        # Get subnet mask
        subnet_mask = "255.255.255.0"
        try:
            if sys.platform == 'win32':
                output = subprocess.check_output(['ipconfig'], universal_newlines=True)
                lines = output.split('\n')
                capture = False
                for line in lines:
                    if local_ip in line:
                        capture = True
                    if capture and 'Subnet Mask' in line:
                        subnet_mask = line.split(':')[-1].strip()
                        break
        except:
            pass

        # Calculate network address
        ip_parts = local_ip.split('.')
        mask_parts = subnet_mask.split('.')
        network_parts = [str(int(ip_parts[i]) & int(mask_parts[i])) for i in range(4)]
        network_addr = '.'.join(network_parts)

        # Calculate CIDR from mask
        mask_binary = ''.join([bin(int(x))[2:].zfill(8) for x in mask_parts])
        cidr = mask_binary.count('1')

        subnet_cidr = f"{network_addr}/{cidr}"

        return {
            'hostname': hostname,
            'local_ip': local_ip,
            'subnet_mask': subnet_mask,
            'network_address': network_addr,
            'suggested_subnet': subnet_cidr
        }
    except Exception as e:
        return {
            'hostname': 'Unknown',
            'local_ip': 'Unknown',
            'subnet_mask': 'Unknown',
            'network_address': 'Unknown',
            'suggested_subnet': '192.168.1.0/24'
        }

def create_app():
    app = Flask(__name__)
    CORS(app)

    scanner = NetworkScanner()
    scan_thread = None
    scan_progress = {'status': 'idle', 'message': '', 'switches': []}

    def update_progress(message):
        scan_progress['message'] = message
        print(message)

    @app.route('/')
    def index():
        return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NetScanner - Network Discovery</title>
  <style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f7fa;
  color: #333;
}
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}
.header h1 { font-size: 28px; font-weight: 600; margin-bottom: 5px; }
.header p { font-size: 14px; opacity: 0.9; }
.container { max-width: 1600px; margin: 0 auto; padding: 20px; }
.machine-info-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,.08);
  border-left: 4px solid #667eea;
}
.machine-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}
.machine-info-item {
  display: flex;
  flex-direction: column;
}
.machine-info-label {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  text-transform: uppercase;
  margin-bottom: 5px;
  letter-spacing: 0.5px;
}
.machine-info-value {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  font-family: monospace;
}
.auto-populate-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  transition: all 0.2s;
  align-self: flex-start;
  margin-top: 10px;
}
.auto-populate-btn:hover { background: #5568d3; transform: translateY(-1px); }
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.panel {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 4px rgba(0,0,0,.08);
}
.panel h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 10px;
}
.panel h3 {
  font-size: 14px;
  font-weight: 600;
  margin-top: 20px;
  margin-bottom: 12px;
  color: #667eea;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: #555;
}
.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
  font-family: monospace;
  transition: border 0.2s;
}
.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}
.collapsible-header {
  background: #f9f9f9;
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  font-size: 13px;
  color: #555;
  border: 1px solid #eee;
  transition: all 0.2s;
  margin-bottom: 10px;
}
.collapsible-header:hover {
  background: #f0f0f0;
  border-color: #ddd;
}
.collapsible-header.collapsed { background: white; }
.collapsible-header .arrow {
  display: inline-block;
  transition: transform 0.2s;
  font-size: 10px;
}
.collapsible-header.collapsed .arrow {
  transform: rotate(-90deg);
}
.collapsible-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 10px;
  padding: 16px;
  background: #fafafa;
  border-radius: 4px;
}
.collapsible-content.hidden {
  display: none;
}
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
.btn {
  flex: 1;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-primary {
  background: #667eea;
  color: white;
}
.btn-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}
.btn-secondary {
  background: #e8eef5;
  color: #667eea;
}
.btn-secondary:hover {
  background: #dde5f0;
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
.progress-panel { grid-column: 2; grid-row: 1 / 3; }
.progress-status {
  padding: 12px;
  background: #f0f0f0;
  border-radius: 4px;
  font-weight: 600;
  color: #667eea;
  font-size: 13px;
  margin-bottom: 12px;
}
.progress-log {
  background: #1e1e1e;
  color: #00ff00;
  padding: 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  max-height: 500px;
  overflow-y: auto;
  line-height: 1.6;
  border: 1px solid #333;
}
.results-panel { grid-column: 1 / -1; margin-top: 20px; }
.network-map {
  background: #fafafa;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
  min-height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 15px;
}
.network-map:empty::after {
  content: 'Scan a network to see switches here';
  color: #999;
}
.switch-node {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 16px;
  border-radius: 6px;
  min-width: 180px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0,0,0,.12);
  transition: transform 0.2s, box-shadow 0.2s;
}
.switch-node:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,.16);
}
.switch-node-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.switch-node-info { font-size: 12px; opacity: 0.9; }
.search-box { margin-bottom: 20px; }
.search-box input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}
.device-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.device-table thead {
  background: #f5f7fa;
  border-bottom: 2px solid #ddd;
}
.device-table th {
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: #333;
}
.device-table td {
  padding: 12px;
  border-bottom: 1px solid #eee;
}
.device-table tbody tr:hover { background: #f9f9f9; }
.status-active { color: #22c55e; font-weight: 600; }
.status-inactive { color: #ef4444; }
.device-table code { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 12px; }
@media(max-width: 1200px) {
  .layout { grid-template-columns: 1fr; }
  .progress-panel { grid-column: 1; grid-row: auto; }
}
@media(max-width: 768px) {
  .machine-info-grid { grid-template-columns: 1fr; }
  .collapsible-content { grid-template-columns: 1fr; }
  .layout { grid-template-columns: 1fr; }
  .button-group { flex-direction: column; }
  .btn { width: 100%; }
}
  </style>
</head>
<body>
<div class="header">
  <div class="container">
    <h1>NetScanner</h1>
    <p>Network Discovery &amp; Switch Mapping</p>
  </div>
</div>

<div class="container">
  <div class="machine-info-card">
    <h3 style="margin-top: 0;">Current Machine</h3>
    <div class="machine-info-grid">
      <div class="machine-info-item">
        <span class="machine-info-label">Hostname</span>
        <span class="machine-info-value" id="info-hostname">Loading...</span>
      </div>
      <div class="machine-info-item">
        <span class="machine-info-label">Local IP</span>
        <span class="machine-info-value" id="info-ip">Loading...</span>
      </div>
      <div class="machine-info-item">
        <span class="machine-info-label">Subnet Mask</span>
        <span class="machine-info-value" id="info-mask">Loading...</span>
      </div>
      <div class="machine-info-item">
        <span class="machine-info-label">Network</span>
        <span class="machine-info-value" id="info-network">Loading...</span>
      </div>
    </div>
    <button class="auto-populate-btn" id="autoPopulateBtn">Auto-Populate Current Subnet</button>
  </div>

  <div class="layout">
    <div class="panel">
      <h2>Configuration</h2>
      <div class="form-group">
        <label>Network Subnets</label>
        <textarea id="subnets" placeholder="192.168.1.0/24, 10.0.0.0/24" rows="3"></textarea>
      </div>

      <h3>Credentials (Optional)</h3>

      <div class="collapsible-header" data-target="unifi-creds">
        <span>UniFi Controller</span>
        <span class="arrow">▶</span>
      </div>
      <div class="collapsible-content hidden" id="unifi-creds">
        <div class="form-group">
          <label>Controller IP</label>
          <input type="text" id="unifi_ip" placeholder="192.168.1.1">
        </div>
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="unifi_username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="unifi_password">
        </div>
      </div>

      <div class="collapsible-header" data-target="aruba-creds">
        <span>Aruba Switches</span>
        <span class="arrow">▶</span>
      </div>
      <div class="collapsible-content hidden" id="aruba-creds">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="aruba_username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="aruba_password">
        </div>
      </div>

      <div class="collapsible-header" data-target="hp-creds">
        <span>HP/HPE Switches</span>
        <span class="arrow">▶</span>
      </div>
      <div class="collapsible-content hidden" id="hp-creds">
        <div class="form-group">
          <label>Username</label>
          <input type="text" id="hp_username">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="hp_password">
        </div>
      </div>

      <div class="button-group">
        <button id="saveConfig" class="btn btn-secondary">Save Config</button>
        <button id="startScan" class="btn btn-primary">Start Scan</button>
      </div>
    </div>

    <div class="panel progress-panel">
      <h2>Scan Progress</h2>
      <div id="progressStatus" class="progress-status">Ready</div>
      <div id="progressLog" class="progress-log"></div>
    </div>
  </div>

  <div class="panel results-panel">
    <h2>Network Map</h2>
    <div id="networkMap" class="network-map"></div>

    <h2 style="margin-top: 20px;">Discovered Devices</h2>
    <div class="search-box">
      <input type="text" id="deviceSearch" placeholder="Search by MAC, IP, or port...">
    </div>
    <table id="deviceTable" class="device-table">
      <thead>
        <tr>
          <th>Switch IP</th>
          <th>Port</th>
          <th>MAC Address</th>
          <th>VLAN</th>
          <th>Status</th>
          <th>Speed</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </div>
</div>

<script>
const API = {
  async getMachineInfo() { return (await fetch('/api/machine-info')).json(); },
  async getConfig() { return (await fetch('/api/config')).json(); },
  async saveConfig(data) { return (await fetch('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(); },
  async startScan(data) { return (await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })).json(); },
  async getScanProgress() { return (await fetch('/api/scan/progress')).json(); },
  async getResults() { return (await fetch('/api/results')).json(); }
};

const state = { isScanning: false, devices: [] };

async function loadMachineInfo() {
  try {
    const info = await API.getMachineInfo();
    document.getElementById('info-hostname').textContent = info.hostname;
    document.getElementById('info-ip').textContent = info.local_ip;
    document.getElementById('info-mask').textContent = info.subnet_mask;
    document.getElementById('info-network').textContent = info.suggested_subnet;

    document.getElementById('autoPopulateBtn').addEventListener('click', () => {
      document.getElementById('subnets').value = info.suggested_subnet;
    });
  } catch (e) { console.error('Error loading machine info:', e); }
}

document.querySelectorAll('.collapsible-header').forEach(header => {
  header.addEventListener('click', function() {
    const target = this.getAttribute('data-target');
    const content = document.getElementById(target);
    this.classList.toggle('collapsed');
    content.classList.toggle('hidden');
  });
});

async function loadConfig() {
  try {
    const config = await API.getConfig();
    document.getElementById('subnets').value = config.subnets.join(', ');
  } catch (e) { console.error('Error loading config:', e); }
}

document.getElementById('saveConfig').addEventListener('click', async () => {
  const subnets = document.getElementById('subnets').value.split(',').map(s => s.trim()).filter(s => s);
  const data = {
    subnets, unifi_ip: document.getElementById('unifi_ip').value,
    unifi_username: document.getElementById('unifi_username').value, unifi_password: document.getElementById('unifi_password').value,
    aruba_username: document.getElementById('aruba_username').value, aruba_password: document.getElementById('aruba_password').value,
    hp_username: document.getElementById('hp_username').value, hp_password: document.getElementById('hp_password').value
  };
  try { await API.saveConfig(data); alert('Configuration saved!'); } catch (e) { alert('Error saving'); }
});

document.getElementById('startScan').addEventListener('click', async () => {
  const subnets = document.getElementById('subnets').value.split(',').map(s => s.trim()).filter(s => s);
  if (!subnets.length) { alert('Please enter at least one subnet'); return; }
  state.isScanning = true;
  document.getElementById('startScan').disabled = true;
  try {
    await API.startScan({ subnets });
    const pollInterval = setInterval(async () => {
      try {
        const progress = await API.getScanProgress();
        document.getElementById('progressStatus').textContent = `Status: ${progress.status.toUpperCase()}`;
        if (progress.message) {
          const log = document.getElementById('progressLog');
          const entry = document.createElement('div');
          entry.textContent = `[${new Date().toLocaleTimeString()}] ${progress.message}`;
          log.appendChild(entry);
          log.scrollTop = log.scrollHeight;
        }
        if (progress.status === 'complete' || progress.status === 'error') {
          clearInterval(pollInterval);
          state.isScanning = false;
          document.getElementById('startScan').disabled = false;
          setTimeout(async () => {
            const results = await API.getResults();
            const mapDiv = document.getElementById('networkMap');
            mapDiv.innerHTML = '';
            if (results.switches && results.switches.length) {
              results.switches.forEach(sw => {
                const node = document.createElement('div');
                node.className = 'switch-node';
                node.innerHTML = `<div class="switch-node-title">${sw.type}</div><div class="switch-node-info">${sw.ip}</div>`;
                mapDiv.appendChild(node);
              });
            }
            const tbody = document.querySelector('.device-table tbody');
            tbody.innerHTML = '';
            state.devices = [];
            if (results.switches) {
              results.switches.forEach(sw => {
                if (sw.mac_table && sw.mac_table.length) {
                  sw.mac_table.forEach(dev => {
                    const row = document.createElement('tr');
                    row.innerHTML = `<td>${dev.switch_ip || sw.ip}</td><td>${dev.port || 'N/A'}</td><td><code>${dev.mac || 'N/A'}</code></td><td>${dev.vlan || 'N/A'}</td><td><span class="status-${dev.status === 'active' ? 'active' : 'inactive'}">${dev.status || 'unknown'}</span></td><td>${dev.speed || 'N/A'}</td>`;
                    tbody.appendChild(row);
                    state.devices.push(dev);
                  });
                }
              });
            }
            if (!state.devices.length) {
              const row = document.createElement('tr');
              row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No devices found</td>';
              tbody.appendChild(row);
            }
            document.getElementById('deviceSearch').addEventListener('input', e => {
              const filter = e.target.value.toLowerCase();
              document.querySelectorAll('.device-table tbody tr').forEach(row => {
                row.style.display = row.textContent.toLowerCase().includes(filter) ? '' : 'none';
              });
            });
          }, 1000);
        }
      } catch (e) { console.error('Error polling:', e); }
    }, 500);
  } catch (e) { alert('Error starting scan'); state.isScanning = false; document.getElementById('startScan').disabled = false; }
});

document.addEventListener('DOMContentLoaded', () => { loadMachineInfo(); loadConfig(); });
</script>
</body>
</html>"""

    @app.route('/api/machine-info', methods=['GET'])
    def machine_info():
        print("[DEBUG] machine_info route called!")
        return jsonify(get_machine_info())

    @app.route('/api/config', methods=['GET', 'POST'])
    def config():
        if request.method == 'POST':
            data = request.json
            config = load_config()

            # Save subnets
            config['subnets'] = data.get('subnets', [])

            # Save encrypted credentials
            if 'unifi_ip' in data and data['unifi_ip']:
                config['credentials']['unifi'] = {
                    'ip': data['unifi_ip'],
                    'encrypted': encrypt_credentials(data.get('unifi_username', ''),
                                                    data.get('unifi_password', ''))
                }

            if 'aruba_username' in data and data['aruba_username']:
                config['credentials']['aruba'] = {
                    'encrypted': encrypt_credentials(data['aruba_username'],
                                                    data.get('aruba_password', ''))
                }

            if 'hp_username' in data and data['hp_username']:
                config['credentials']['hp'] = {
                    'encrypted': encrypt_credentials(data['hp_username'],
                                                    data.get('hp_password', ''))
                }

            save_config(config)
            return jsonify({'status': 'saved'})
        else:
            config = load_config()
            return jsonify({
                'subnets': config.get('subnets', []),
                'has_credentials': {
                    'unifi': 'unifi' in config.get('credentials', {}),
                    'aruba': 'aruba' in config.get('credentials', {}),
                    'hp': 'hp' in config.get('credentials', {})
                }
            })

    @app.route('/api/scan', methods=['POST'])
    def start_scan():
        nonlocal scan_thread
        data = request.json
        subnets = data.get('subnets', [])

        if not subnets:
            return jsonify({'error': 'No subnets provided'}), 400

        scan_progress['status'] = 'scanning'
        scan_progress['message'] = 'Starting passive network scan...'
        scan_progress['switches'] = []

        def run_scan():
            try:
                update_progress(f"Scanning subnets: {', '.join(subnets)}")
                update_progress("Using passive discovery - NO credentials needed, NO config changes possible")

                switches = scanner.scan_network(subnets, update_progress)

                scan_progress['switches'] = switches
                update_progress(f"Found {len(switches)} potential network devices")
                update_progress(f"Discovered {len(scanner.arp_table)} active MAC addresses on network")

                # If credentials provided, optionally query switches
                config = load_config()
                creds_available = 'unifi' in config.get('credentials', {}) or \
                                'aruba' in config.get('credentials', {}) or \
                                'hp' in config.get('credentials', {})

                if creds_available:
                    update_progress("Optional: Credentials available for additional details")
                    # Query switches if credentials provided
                    for switch in switches:
                        update_progress(f"Attempting to query {switch['ip']} (optional)...")
                        try:
                            if 'unifi' in config.get('credentials', {}):
                                unifi_creds = config['credentials']['unifi']
                                decrypted = decrypt_credentials(unifi_creds['encrypted'])
                                driver = UniFiDriver(unifi_creds['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()

                            elif 'aruba' in config.get('credentials', {}):
                                aruba_creds = config['credentials']['aruba']
                                decrypted = decrypt_credentials(aruba_creds['encrypted'])
                                driver = ArubaDriver(switch['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()

                            elif 'hp' in config.get('credentials', {}):
                                hp_creds = config['credentials']['hp']
                                decrypted = decrypt_credentials(hp_creds['encrypted'])
                                driver = HPDriver(switch['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()
                        except Exception as e:
                            update_progress(f"Optional query failed for {switch['ip']}: {e}")

                scan_progress['status'] = 'complete'
                update_progress('Scan complete! No switches were modified.')

                # Save to history
                add_scan_to_history({
                    'timestamp': datetime.now().isoformat(),
                    'subnets': subnets,
                    'results': scanner.get_results()
                })

            except Exception as e:
                update_progress(f"Scan error: {e}")
                scan_progress['status'] = 'error'

        scan_thread = threading.Thread(target=run_scan, daemon=True)
        scan_thread.start()

        return jsonify({'status': 'started'})

    @app.route('/api/scan/progress', methods=['GET'])
    def scan_status():
        return jsonify(scan_progress)

    @app.route('/api/results', methods=['GET'])
    def get_results():
        return jsonify(scanner.get_results())

    return app
