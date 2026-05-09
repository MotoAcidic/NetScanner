"""Network discovery and scanning - READ-ONLY passive methods"""
import subprocess
import socket
import struct
import json
from datetime import datetime
from netaddr import IPNetwork, IPAddress
import threading
from collections import defaultdict
import re

class NetworkScanner:
    def __init__(self):
        self.discovered_hosts = []
        self.switches = {}
        self.devices = defaultdict(list)
        self.arp_table = {}

    def parse_subnet(self, subnet_str):
        """Parse subnet string and return IP list"""
        try:
            network = IPNetwork(subnet_str.strip())
            if network.size > 254:
                return list(network)
            else:
                return list(network[1:-1])  # Skip network and broadcast
        except Exception as e:
            print(f"Error parsing subnet {subnet_str}: {e}")
            return []

    def get_mac_vendor(self, mac):
        """Try to identify device by MAC prefix"""
        mac_prefix = mac[:8].upper()
        # Common vendors - can be expanded
        vendors = {
            '00:00:00': 'Unknown',
            '00:1A:1E': 'Ubiquiti',
            '08:00:27': 'QEMU',
            'AA:BB:CC': 'Hyper-V',
            '52:54:00': 'KVM',
        }
        for prefix, vendor in vendors.items():
            if mac.upper().startswith(prefix):
                return vendor
        return 'Unknown Vendor'

    def scan_arp_table(self, callback=None):
        """Scan ARP table to discover devices - PASSIVE, NO LOGIN NEEDED"""
        if callback:
            callback("Scanning ARP table for connected devices...")

        try:
            if subprocess.os.name == 'nt':  # Windows
                output = subprocess.check_output(['arp', '-a'], universal_newlines=True)
                # Parse Windows ARP format
                lines = output.split('\n')
                for line in lines:
                    match = re.search(r'(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f\-:]+)\s+(\w+)', line, re.IGNORECASE)
                    if match:
                        ip, mac, status = match.groups()
                        mac = mac.replace('-', ':').upper()
                        if status.lower() == 'dynamic':
                            self.arp_table[mac] = {
                                'ip': ip,
                                'vendor': self.get_mac_vendor(mac),
                                'discovered_via': 'ARP'
                            }
            else:  # Linux/Mac
                output = subprocess.check_output(['arp', '-n'], universal_newlines=True)
                lines = output.split('\n')
                for line in lines:
                    match = re.search(r'(\d+\.\d+\.\d+\.\d+).+([0-9a-f:]{17})', line, re.IGNORECASE)
                    if match:
                        ip, mac = match.groups()
                        self.arp_table[mac] = {
                            'ip': ip,
                            'vendor': self.get_mac_vendor(mac),
                            'discovered_via': 'ARP'
                        }
        except Exception as e:
            if callback:
                callback(f"ARP scan: {e}")

        return self.arp_table

    def ping_sweep(self, subnet_str, callback=None):
        """Ping sweep to find active hosts - PASSIVE ONLY"""
        ips = self.parse_subnet(subnet_str)
        active_hosts = []

        def ping_host(ip):
            try:
                if subprocess.os.name == 'nt':
                    cmd = f"ping -n 1 -w 500 {ip}"
                else:
                    cmd = f"ping -c 1 -W 500 {ip}"
                result = subprocess.run(cmd, shell=True, capture_output=True, timeout=2)
                if result.returncode == 0:
                    active_hosts.append(str(ip))
            except:
                pass

        # Parallel ping
        threads = []
        for ip in ips[:100]:  # Limit for performance
            t = threading.Thread(target=ping_host, args=(ip,))
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        return active_hosts

    def identify_switch_by_ports(self, ip, callback=None):
        """Identify switch by checking for common ports - PASSIVE ONLY"""
        common_switch_ports = [
            22,    # SSH
            23,    # Telnet
            80,    # HTTP
            443,   # HTTPS
            161,   # SNMP
            162,   # SNMP Trap
            8080,  # HTTP alt
            8443,  # HTTPS alt
        ]

        open_ports = []
        for port in common_switch_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(0.5)
                result = sock.connect_ex((ip, port))
                if result == 0:
                    open_ports.append(port)
                sock.close()
            except:
                pass

        # If multiple management ports open, likely a switch
        if len(open_ports) >= 2:
            return 'potential_switch'
        elif 161 in open_ports:
            return 'snmp_enabled'
        return None

    def scan_network(self, subnets, callback=None):
        """Scan network - PASSIVE ONLY, NO CREDENTIALS NEEDED"""
        all_hosts = []
        switches = []

        # Scan ARP table first
        if callback:
            callback("Step 1: Scanning local ARP table...")
        self.scan_arp_table(callback)

        # Ping sweep for active hosts
        for subnet in subnets:
            if callback:
                callback(f"Step 2: Scanning subnet {subnet} for active hosts...")
            hosts = self.ping_sweep(subnet, callback)
            all_hosts.extend(hosts)

        # Identify switches by port scan
        for host in all_hosts:
            if callback:
                callback(f"Step 3: Checking {host} for network device indicators...")
            switch_type = self.identify_switch_by_ports(host, callback)
            if switch_type:
                switches.append({
                    'ip': host,
                    'type': switch_type,
                    'discovered_at': datetime.now().isoformat(),
                    'ports_open': True
                })

        self.discovered_hosts = all_hosts
        self.switches = {s['ip']: s for s in switches}

        if callback:
            callback(f"Discovery complete! Found {len(switches)} potential switches")

        return switches

    def get_results(self):
        """Get scan results"""
        return {
            'total_hosts': len(self.discovered_hosts),
            'arp_devices': len(self.arp_table),
            'switches': list(self.switches.values()),
            'all_devices': list(self.arp_table.values()),
            'timestamp': datetime.now().isoformat()
        }

