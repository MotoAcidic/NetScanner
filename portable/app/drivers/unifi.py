"""UniFi switch driver"""
import requests
import json
from .base import SwitchDriver

class UniFiDriver(SwitchDriver):
    """Driver for UniFi switches via controller"""

    def __init__(self, controller_ip, username, password):
        super().__init__(controller_ip, username, password)
        self.controller_url = f"https://{controller_ip}:8443"
        self.session = requests.Session()
        self.session.verify = False  # Self-signed cert
        self.session.headers.update({'Content-Type': 'application/json'})
        self.site_id = None

    def connect(self):
        """Login to UniFi controller"""
        try:
            login_url = f"{self.controller_url}/api/auth/login"
            payload = {
                'username': self.username,
                'password': self.password
            }
            response = self.session.post(login_url, json=payload, timeout=5)
            if response.status_code == 200:
                self.connected = True
                # Get default site
                sites_url = f"{self.controller_url}/api/self/sites"
                sites_response = self.session.get(sites_url, timeout=5)
                if sites_response.status_code == 200:
                    sites = sites_response.json()
                    if sites:
                        self.site_id = sites[0].get('_id', 'default')
                return True
        except Exception as e:
            print(f"UniFi connection error: {e}")
        return False

    def disconnect(self):
        """Logout from UniFi controller"""
        try:
            self.session.get(f"{self.controller_url}/api/auth/logout", timeout=5)
        except:
            pass
        self.connected = False

    def get_mac_table(self):
        """Get MAC address table from all switches"""
        if not self.connected:
            return []

        try:
            url = f"{self.controller_url}/api/s/{self.site_id}/stat/device"
            response = self.session.get(url, timeout=10)
            if response.status_code == 200:
                devices = response.json()
                mac_table = []
                for device in devices:
                    if device.get('type') == 'usw':  # UniFi Switch
                        # Get ports info
                        ports_url = f"{self.controller_url}/api/s/{self.site_id}/stat/device/{device['_id']}"
                        port_response = self.session.get(ports_url, timeout=5)
                        if port_response.status_code == 200:
                            port_data = port_response.json()
                            for port in port_data.get('port_table', []):
                                mac_table.append({
                                    'switch_ip': device.get('ip'),
                                    'switch_name': device.get('name', device.get('ip')),
                                    'port': port.get('port_idx'),
                                    'port_name': port.get('name', f"eth{port.get('port_idx')}"),
                                    'mac': None,  # UniFi doesn't expose MACs directly
                                    'vlan': port.get('vlan', 1),
                                    'status': port.get('up', False),
                                    'speed': port.get('speed', 'unknown')
                                })
                return mac_table
        except Exception as e:
            print(f"Error getting UniFi MAC table: {e}")
        return []

    def get_vlans(self):
        """Get VLAN information"""
        if not self.connected:
            return []

        try:
            url = f"{self.controller_url}/api/s/{self.site_id}/rest/vlan"
            response = self.session.get(url, timeout=5)
            if response.status_code == 200:
                return response.json()
        except Exception as e:
            print(f"Error getting UniFi VLANs: {e}")
        return []

    def get_port_status(self):
        """Get port status"""
        return self.get_mac_table()

    def get_device_info(self):
        """Get device information"""
        if not self.connected:
            return {}

        try:
            url = f"{self.controller_url}/api/s/{self.site_id}/stat/device"
            response = self.session.get(url, timeout=5)
            if response.status_code == 200:
                devices = response.json()
                return {
                    'total_devices': len(devices),
                    'switches': [d for d in devices if d.get('type') == 'usw'],
                    'controllers': [d for d in devices if d.get('type') == 'udm']
                }
        except Exception as e:
            print(f"Error getting UniFi device info: {e}")
        return {}
