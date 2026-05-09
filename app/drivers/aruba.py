"""Aruba switch driver"""
import paramiko
import re
from .base import SwitchDriver

class ArubaDriver(SwitchDriver):
    """Driver for Aruba switches"""

    def __init__(self, ip, username=None, password=None):
        super().__init__(ip, username, password)
        self.client = None

    def connect(self):
        """SSH connection to Aruba switch"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.client.connect(self.ip, username=self.username, password=self.password,
                              timeout=5, look_for_keys=False, allow_agent=False)
            self.connected = True
            return True
        except Exception as e:
            print(f"Aruba connection error: {e}")
            self.connected = False
        return False

    def disconnect(self):
        """Close SSH connection"""
        if self.client:
            self.client.close()
        self.connected = False

    def _execute_command(self, command):
        """Execute SSH command and return output"""
        if not self.connected:
            return ""
        try:
            stdin, stdout, stderr = self.client.exec_command(command)
            return stdout.read().decode('utf-8', errors='ignore')
        except Exception as e:
            print(f"Error executing command: {e}")
            return ""

    def get_mac_table(self):
        """Get MAC address table"""
        if not self.connected:
            return []

        try:
            output = self._execute_command("show mac-address-table")
            mac_table = []

            # Parse MAC table output
            lines = output.split('\n')
            for line in lines:
                # Match: VLAN MAC Port
                match = re.search(r'(\d+)\s+([0-9a-f]{2}(?::[0-9a-f]{2}){5})\s+(\S+)', line, re.IGNORECASE)
                if match:
                    mac_table.append({
                        'switch_ip': self.ip,
                        'vlan': match.group(1),
                        'mac': match.group(2).upper(),
                        'port': match.group(3),
                        'status': 'active'
                    })

            return mac_table
        except Exception as e:
            print(f"Error getting Aruba MAC table: {e}")
        return []

    def get_vlans(self):
        """Get VLAN information"""
        if not self.connected:
            return []

        try:
            output = self._execute_command("show vlan")
            vlans = []

            # Parse VLAN output
            lines = output.split('\n')
            for line in lines:
                # Match: VLAN ID and name
                match = re.search(r'VLAN (\d+):\s+(.+)', line)
                if match:
                    vlans.append({
                        'vlan_id': match.group(1),
                        'vlan_name': match.group(2).strip()
                    })

            return vlans
        except Exception as e:
            print(f"Error getting Aruba VLANs: {e}")
        return []

    def get_port_status(self):
        """Get port status and configuration"""
        if not self.connected:
            return []

        try:
            output = self._execute_command("show interface brief")
            ports = []

            lines = output.split('\n')
            for line in lines:
                # Match port lines
                match = re.search(r'(\S+)\s+(.+?)(?:up|down)', line, re.IGNORECASE)
                if match:
                    ports.append({
                        'port': match.group(1),
                        'description': match.group(2).strip() if len(match.groups()) > 1 else '',
                        'status': 'up' if 'up' in line.lower() else 'down'
                    })

            return ports
        except Exception as e:
            print(f"Error getting Aruba port status: {e}")
        return []

    def get_device_info(self):
        """Get device information"""
        if not self.connected:
            return {}

        try:
            output = self._execute_command("show version")
            info = {'model': '', 'serial': '', 'firmware': ''}

            # Parse version output
            for line in output.split('\n'):
                if 'Model' in line:
                    info['model'] = line.split(':')[-1].strip()
                elif 'Serial' in line:
                    info['serial'] = line.split(':')[-1].strip()
                elif 'Firmware' in line or 'Version' in line:
                    info['firmware'] = line.split(':')[-1].strip()

            return info
        except Exception as e:
            print(f"Error getting Aruba device info: {e}")
        return {}
