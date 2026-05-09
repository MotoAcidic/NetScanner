"""Flask web UI"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json
import os
import sys
from datetime import datetime
from app.network_discovery import NetworkScanner
from app.drivers.unifi import UniFiDriver
from app.drivers.aruba import ArubaDriver
from app.drivers.hp import HPDriver
from app.config import load_config, save_config, add_scan_to_history
from app.security import encrypt_credentials, decrypt_credentials
import threading

def create_app():
    # Get absolute paths
    app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    template_folder = os.path.join(app_dir, 'templates')
    static_folder = os.path.join(app_dir, 'static')

    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)
    # CORS(app)  # Disabled for debugging - seems to cause issues

    scanner = NetworkScanner()
    scan_thread = None
    scan_progress = {'status': 'idle', 'message': '', 'switches': []}

    def update_progress(message):
        scan_progress['message'] = message
        print(message)

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
        # Serve the full app as a single response to avoid file serving issues
        return """<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>NetScanner</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;padding:20px}.container{max-width:1400px;margin:0 auto}header{text-align:center;color:white;margin-bottom:30px}header h1{font-size:2.5em;margin-bottom:10px}header p{font-size:1.1em;opacity:.9}.main-content{display:grid;grid-template-columns:1fr 1fr;gap:20px}.panel{background:white;border-radius:10px;padding:25px;box-shadow:0 10px 30px rgba(0,0,0,.2)}.panel h2{color:#333;margin-bottom:20px;padding-bottom:10px;border-bottom:2px solid #667eea}.panel h3{color:#555;margin-top:20px;margin-bottom:15px;font-size:1.1em}.panel h4{color:#666;margin-top:15px;margin-bottom:10px;font-size:.95em}.form-group{margin-bottom:15px}.form-group label{display:block;margin-bottom:5px;color:#555;font-weight:500;font-size:.9em}.form-group input,.form-group textarea{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-family:monospace;font-size:.9em}.form-group input:focus,.form-group textarea:focus{outline:0;border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.1)}.credential-section{background:#f9f9f9;padding:15px;border-radius:5px;margin-bottom:15px}.button-group{display:flex;gap:10px;margin-top:20px}.btn{flex:1;padding:12px 20px;border:0;border-radius:5px;font-size:1em;font-weight:600;cursor:pointer;transition:all .3s}.btn-primary{background:#667eea;color:white}.btn-primary:hover{background:#5568d3;transform:translateY(-2px);box-shadow:0 5px 15px rgba(102,126,234,.4)}.btn-secondary{background:#e0e0e0;color:#333}.btn-secondary:hover{background:#d0d0d0}.btn:disabled{opacity:.5;cursor:not-allowed}.progress-panel{grid-column:2;grid-row:1/3}.progress-status{padding:15px;background:#f0f0f0;border-radius:5px;font-weight:600;color:#667eea;margin-bottom:15px}.progress-log{background:#1e1e1e;color:#00ff00;padding:15px;border-radius:5px;font-family:monospace;font-size:.85em;max-height:500px;overflow-y:auto;line-height:1.5}.results-panel{grid-column:1/-1;margin-top:20px}.network-map{background:#f9f9f9;border:1px solid #ddd;border-radius:5px;padding:20px;margin-bottom:30px;min-height:300px;display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:20px}.switch-node{background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:20px;border-radius:10px;min-width:200px;text-align:center;box-shadow:0 5px 15px rgba(0,0,0,.1);transition:transform .3s}.switch-node:hover{transform:translateY(-5px);box-shadow:0 10px 25px rgba(0,0,0,.2)}.switch-node-title{font-weight:600;margin-bottom:10px;font-size:1.1em}.switch-node-info{font-size:.85em;opacity:.9}.search-box{margin-bottom:20px}.search-box input{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;font-size:1em}.device-table{width:100%;border-collapse:collapse;font-size:.9em}.device-table thead{background:#f0f0f0}.device-table th{padding:12px;text-align:left;font-weight:600;color:#333;border-bottom:2px solid #ddd}.device-table td{padding:10px 12px;border-bottom:1px solid #eee}.device-table tbody tr:hover{background:#f9f9f9}.status-active{color:#4caf50;font-weight:600}.status-inactive{color:#f44336}@media(max-width:1200px){.main-content{grid-template-columns:1fr}.progress-panel{grid-column:1;grid-row:auto}}@media(max-width:768px){header h1{font-size:1.8em}.panel{padding:15px}.network-map{flex-direction:column}.switch-node{width:100%}}
</style>
</head>
<body>
<header><h1>NetScanner</h1><p>Network switch discovery and mapping tool</p></header>
<div class="main-content">
<section class="panel config-panel"><h2>Configuration</h2><div class="form-group"><label>Network Subnets</label><textarea id="subnets" placeholder="192.168.1.0/24, 10.0.0.0/24" rows="3"></textarea></div><h3>Credentials</h3>
<div class="credential-section"><h4>UniFi Controller</h4><div class="form-group"><label>IP</label><input type="text" id="unifi_ip"></div><div class="form-group"><label>Username</label><input type="text" id="unifi_username"></div><div class="form-group"><label>Password</label><input type="password" id="unifi_password"></div></div>
<div class="credential-section"><h4>Aruba Switches</h4><div class="form-group"><label>Username</label><input type="text" id="aruba_username"></div><div class="form-group"><label>Password</label><input type="password" id="aruba_password"></div></div>
<div class="credential-section"><h4>HP Switches</h4><div class="form-group"><label>Username</label><input type="text" id="hp_username"></div><div class="form-group"><label>Password</label><input type="password" id="hp_password"></div></div>
<div class="button-group"><button id="saveConfig" class="btn btn-secondary">Save Config</button><button id="startScan" class="btn btn-primary">Start Scan</button></div></section>
<section class="panel progress-panel"><h2>Scan Progress</h2><div id="progressStatus" class="progress-status">Idle</div><div id="progressLog" class="progress-log"></div></section>
<section class="panel results-panel"><h2>Network Map</h2><div id="networkMap" class="network-map"></div><h2>Devices</h2><div class="search-box"><input type="text" id="deviceSearch" placeholder="Search by MAC, IP, or port..."></div><table id="deviceTable" class="device-table"><thead><tr><th>Switch IP</th><th>Port</th><th>MAC</th><th>VLAN</th><th>Status</th><th>Speed</th></tr></thead><tbody></tbody></table></section>
</div>
<script>
const API={async getConfig(){return(await fetch('/api/config')).json()},async saveConfig(e){return(await fetch('/api/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)})).json()},async startScan(e){return(await fetch('/api/scan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(e)})).json()},async getScanProgress(){return(await fetch('/api/scan/progress')).json()},async getResults(){return(await fetch('/api/results')).json()}};const state={isScanning:!1,scanInterval:null,devices:[]};async function loadConfig(){try{const e=await API.getConfig();document.getElementById('subnets').value=e.subnets.join(', ')}catch(e){console.error('Error loading config:',e)}}document.getElementById('saveConfig').addEventListener('click',async ()=>{const e=document.getElementById('subnets').value.split(',').map(e=>e.trim()).filter(e=>e),t={subnets:e,unifi_ip:document.getElementById('unifi_ip').value,unifi_username:document.getElementById('unifi_username').value,unifi_password:document.getElementById('unifi_password').value,aruba_username:document.getElementById('aruba_username').value,aruba_password:document.getElementById('aruba_password').value,hp_username:document.getElementById('hp_username').value,hp_password:document.getElementById('hp_password').value};try{await API.saveConfig(t),alert('Configuration saved!')}catch(e){alert('Error saving configuration')}}),document.getElementById('startScan').addEventListener('click',async ()=>{const e=document.getElementById('subnets').value.split(',').map(e=>e.trim()).filter(e=>e);0===e.length?alert('Please enter at least one subnet'):(state.isScanning=!0,document.getElementById('startScan').disabled=!0,try{await API.startScan({subnets:e}),async function t(){const n=setInterval(async ()=>{try{const e=await API.getScanProgress();if(document.getElementById('progressStatus').textContent=`Status: ${e.status.toUpperCase()}`,e.message){const t=document.getElementById('progressLog'),o=document.createElement('div');o.className='log-entry',o.textContent=`[${new Date().toLocaleTimeString()}] ${e.message}`,t.appendChild(o),t.scrollTop=t.scrollHeight}if('complete'===e.status||'error'===e.status){clearInterval(n),state.isScanning=!1,document.getElementById('startScan').disabled=!1;setTimeout(async ()=>{const e=await API.getResults();!function(e){const t=document.getElementById('networkMap');t.innerHTML='',e.switches&&e.switches.length>0?e.switches.forEach(e=>{const n=document.createElement('div');n.className='switch-node',n.innerHTML=`<div class="switch-node-title">${e.type.toUpperCase()}</div><div class="switch-node-info">${e.ip}</div><div class="switch-node-info">Discovered: ${new Date(e.discovered_at).toLocaleString()}</div>`,t.appendChild(n)}):t.innerHTML='<p>No switches found</p>';const n=document.querySelector('.device-table tbody');n.innerHTML='',state.devices=[],e.switches&&e.switches.forEach(e=>{e.mac_table&&e.mac_table.length>0&&e.mac_table.forEach(t=>{const o=document.createElement('tr');o.innerHTML=`<td>${t.switch_ip||e.ip}</td><td>${t.port||'N/A'}</td><td><code>${t.mac||'N/A'}</code></td><td>${t.vlan||'N/A'}</td><td><span class="status-${('active'===t.status?'active':'inactive')}">${t.status||'unknown'}</span></td><td>${t.speed||'N/A'}</td>`,n.appendChild(o),state.devices.push(t)})}),0===state.devices.length&&((o=document.createElement('tr')).innerHTML='<td colspan="6" style="text-align: center; padding: 20px;">No devices found</td>',n.appendChild(o)),document.getElementById('deviceSearch').addEventListener('input',e=>{const t=e.target.value.toLowerCase();document.querySelectorAll('.device-table tbody tr').forEach(e=>{e.style.display=e.textContent.toLowerCase().includes(t)?'':'none'})})}(e)},1e3)}catch(e){console.error('Error polling progress:',e)}})}()},catch(e){alert('Error starting scan'),state.isScanning=!1,document.getElementById('startScan').disabled=!1}})}),document.addEventListener('DOMContentLoaded',loadConfig);
</script>
</body>
</html>"""

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
        scan_progress['message'] = 'Starting scan...'
        scan_progress['switches'] = []

        def run_scan():
            try:
                update_progress(f"Scanning subnets: {', '.join(subnets)}")
                switches = scanner.scan_network(subnets, update_progress)

                scan_progress['switches'] = switches
                update_progress(f"Found {len(switches)} switches")

                # Query each switch
                config = load_config()

                for switch in switches:
                    update_progress(f"Querying {switch['ip']} ({switch['type']})")

                    try:
                        if switch['type'] == 'unifi':
                            unifi_creds = config.get('credentials', {}).get('unifi')
                            if unifi_creds:
                                decrypted = decrypt_credentials(unifi_creds['encrypted'])
                                driver = UniFiDriver(unifi_creds['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()

                        elif switch['type'] == 'aruba':
                            aruba_creds = config.get('credentials', {}).get('aruba')
                            if aruba_creds:
                                decrypted = decrypt_credentials(aruba_creds['encrypted'])
                                driver = ArubaDriver(switch['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()

                        elif switch['type'] == 'hp':
                            hp_creds = config.get('credentials', {}).get('hp')
                            if hp_creds:
                                decrypted = decrypt_credentials(hp_creds['encrypted'])
                                driver = HPDriver(switch['ip'], decrypted['username'], decrypted['password'])
                                if driver.connect():
                                    switch['mac_table'] = driver.get_mac_table()
                                    switch['vlans'] = driver.get_vlans()
                                    driver.disconnect()
                    except Exception as e:
                        update_progress(f"Error querying {switch['ip']}: {e}")

                scan_progress['status'] = 'complete'
                update_progress('Scan complete!')

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
