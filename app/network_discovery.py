"""Network discovery and scanning"""
import subprocess
import socket
import struct
import json
from datetime import datetime
from netaddr import IPNetwork, IPAddress
import threading
from collections import defaultdict

class NetworkScanner:
    def __init__(self):
        self.discovered_hosts = []
        self.switches = {}
        self.devices = defaultdict(list)

    def parse_subnet(self, subnet_str):
        """Parse subnet string and return IP list"""
        try:
            network = IPNetwork(subnet_str.strip())
            # Skip gateway and broadcast for small networks, return all for /24 and larger
            if network.size > 254:
                return list(network)
            else:
                return list(network[1:-1])  # Skip network and broadcast
        except Exception as e:
            print(f"Error parsing subnet {subnet_str}: {e}")
            return []

    def ping_sweep(self, subnet_str, callback=None):
        """Ping sweep to find active hosts"""
        ips = self.parse_subnet(subnet_str)
        active_hosts = []

        def ping_host(ip):
            try:
                # Windows: ping -n 1 -w 500, Linux: ping -c 1 -W 500
                cmd = f"ping -n 1 -w 500 {ip}" if subprocess.os.name == 'nt' else f"ping -c 1 -W 500 {ip}"
                result = subprocess.run(cmd, shell=True, capture_output=True, timeout=2)
                if result.returncode == 0:
                    active_hosts.append(str(ip))
                    if callback:
                        callback(f"Found host: {ip}")
            except:
                pass

        # Parallel ping using threads
        threads = []
        for ip in ips[:50]:  # Limit to first 50 for demo, can expand
            t = threading.Thread(target=ping_host, args=(ip,))
            t.start()
            threads.append(t)

        for t in threads:
            t.join()

        return active_hosts

    def identify_switch_type(self, ip, callback=None):
        """Try to identify switch type and brand"""
        try:
            # Try SSH banner grab
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(2)
                s.connect((ip, 22))
                banner = s.recv(1024).decode('utf-8', errors='ignore')
                s.close()

                if 'Aruba' in banner or 'HPE' in banner or 'ProCurve' in banner:
                    return 'aruba' if 'Aruba' in banner else 'hp'
                elif 'Ubiquiti' in banner or 'UniFi' in banner:
                    return 'unifi'
            except:
                pass

            # Try SNMP system description
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                sock.sendto(b'test', (ip, 161))
                sock.settimeout(1)
                data, _ = sock.recvfrom(1024)
                if data:
                    return 'snmp_enabled'
            except:
                pass

        except Exception as e:
            if callback:
                callback(f"Error identifying {ip}: {e}")

        return None

    def scan_network(self, subnets, callback=None):
        """Scan network for active hosts and switches"""
        all_hosts = []

        for subnet in subnets:
            if callback:
                callback(f"Scanning subnet: {subnet}")
            hosts = self.ping_sweep(subnet, callback)
            all_hosts.extend(hosts)

        # Identify switch types
        switches = []
        for host in all_hosts:
            if callback:
                callback(f"Identifying host: {host}")
            switch_type = self.identify_switch_type(host, callback)
            if switch_type:
                switches.append({
                    'ip': host,
                    'type': switch_type,
                    'discovered_at': datetime.now().isoformat()
                })

        self.discovered_hosts = all_hosts
        self.switches = {s['ip']: s for s in switches}
        return switches

    def get_results(self):
        """Get scan results"""
        return {
            'total_hosts': len(self.discovered_hosts),
            'switches': list(self.switches.values()),
            'devices': dict(self.devices),
            'timestamp': datetime.now().isoformat()
        }
