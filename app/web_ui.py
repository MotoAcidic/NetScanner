"""Flask web UI"""
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import json
import os
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
    CORS(app)

    scanner = NetworkScanner()
    scan_thread = None
    scan_progress = {'status': 'idle', 'message': '', 'switches': []}

    def update_progress(message):
        scan_progress['message'] = message
        print(message)

    @app.route('/')
    def index():
        return render_template('index.html')

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
