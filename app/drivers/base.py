"""Base driver class for switch management"""

class SwitchDriver:
    """Base class for switch drivers"""

    def __init__(self, ip, username=None, password=None):
        self.ip = ip
        self.username = username
        self.password = password
        self.connected = False

    def connect(self):
        """Establish connection to switch"""
        raise NotImplementedError

    def disconnect(self):
        """Close connection to switch"""
        raise NotImplementedError

    def get_mac_table(self):
        """Get MAC address table"""
        raise NotImplementedError

    def get_vlans(self):
        """Get VLAN information"""
        raise NotImplementedError

    def get_port_status(self):
        """Get port status and configuration"""
        raise NotImplementedError

    def get_device_info(self):
        """Get device information"""
        raise NotImplementedError
