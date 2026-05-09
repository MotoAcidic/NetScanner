// API helper functions
const API = {
    async getConfig() {
        const response = await fetch('/api/config');
        return response.json();
    },

    async saveConfig(config) {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return response.json();
    },

    async startScan(subnets) {
        const response = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subnets })
        });
        return response.json();
    },

    async getScanProgress() {
        const response = await fetch('/api/scan/progress');
        return response.json();
    },

    async getResults() {
        const response = await fetch('/api/results');
        return response.json();
    }
};

// UI State
const state = {
    isScanning: false,
    scanInterval: null,
    devices: []
};

// Load configuration on page load
async function loadConfig() {
    try {
        const config = await API.getConfig();
        document.getElementById('subnets').value = config.subnets.join(', ');
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

// Save configuration
document.getElementById('saveConfig').addEventListener('click', async () => {
    const subnets = document.getElementById('subnets').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

    const config = {
        subnets,
        unifi_ip: document.getElementById('unifi_ip').value,
        unifi_username: document.getElementById('unifi_username').value,
        unifi_password: document.getElementById('unifi_password').value,
        aruba_username: document.getElementById('aruba_username').value,
        aruba_password: document.getElementById('aruba_password').value,
        hp_username: document.getElementById('hp_username').value,
        hp_password: document.getElementById('hp_password').value
    };

    try {
        await API.saveConfig(config);
        alert('Configuration saved!');
    } catch (e) {
        alert('Error saving configuration');
    }
});

// Start scan
document.getElementById('startScan').addEventListener('click', async () => {
    const subnets = document.getElementById('subnets').value
        .split(',')
        .map(s => s.trim())
        .filter(s => s);

    if (subnets.length === 0) {
        alert('Please enter at least one subnet');
        return;
    }

    state.isScanning = true;
    document.getElementById('startScan').disabled = true;

    try {
        await API.startScan(subnets);
        pollScanProgress();
    } catch (e) {
        alert('Error starting scan');
        state.isScanning = false;
        document.getElementById('startScan').disabled = false;
    }
});

// Poll scan progress
async function pollScanProgress() {
    const pollInterval = setInterval(async () => {
        try {
            const progress = await API.getScanProgress();

            // Update status
            document.getElementById('progressStatus').textContent =
                `Status: ${progress.status.toUpperCase()}`;

            // Add log entry
            if (progress.message) {
                const logDiv = document.getElementById('progressLog');
                const entry = document.createElement('div');
                entry.className = 'log-entry';
                entry.textContent = `[${new Date().toLocaleTimeString()}] ${progress.message}`;
                logDiv.appendChild(entry);
                logDiv.scrollTop = logDiv.scrollHeight;
            }

            // If complete, fetch results
            if (progress.status === 'complete' || progress.status === 'error') {
                clearInterval(pollInterval);
                state.isScanning = false;
                document.getElementById('startScan').disabled = false;

                // Fetch and display results
                setTimeout(async () => {
                    const results = await API.getResults();
                    displayResults(results);
                }, 1000);
            }
        } catch (e) {
            console.error('Error polling progress:', e);
        }
    }, 500);
}

// Display results
function displayResults(results) {
    // Display network map
    const mapDiv = document.getElementById('networkMap');
    mapDiv.innerHTML = '';

    if (results.switches && results.switches.length > 0) {
        results.switches.forEach(sw => {
            const node = document.createElement('div');
            node.className = 'switch-node';
            node.innerHTML = `
                <div class="switch-node-title">${sw.type.toUpperCase()}</div>
                <div class="switch-node-info">${sw.ip}</div>
                <div class="switch-node-info">Discovered: ${new Date(sw.discovered_at).toLocaleString()}</div>
            `;
            mapDiv.appendChild(node);
        });
    } else {
        mapDiv.innerHTML = '<p>No switches found. Try different subnets or check credentials.</p>';
    }

    // Display devices table
    const tbody = document.querySelector('.device-table tbody');
    tbody.innerHTML = '';

    state.devices = [];

    if (results.switches) {
        results.switches.forEach(sw => {
            if (sw.mac_table && sw.mac_table.length > 0) {
                sw.mac_table.forEach(entry => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${entry.switch_ip || sw.ip}</td>
                        <td>${entry.port || 'N/A'}</td>
                        <td><code>${entry.mac || 'N/A'}</code></td>
                        <td>${entry.vlan || 'N/A'}</td>
                        <td><span class="status-${entry.status === 'active' ? 'active' : 'inactive'}">${entry.status || 'unknown'}</span></td>
                        <td>${entry.speed || 'N/A'}</td>
                    `;
                    tbody.appendChild(row);
                    state.devices.push(entry);
                });
            }
        });
    }

    if (state.devices.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No devices found</td>';
        tbody.appendChild(row);
    }

    // Setup search
    setupSearch();
}

// Search devices
function setupSearch() {
    document.getElementById('deviceSearch').addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('.device-table tbody tr');

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(search) ? '' : 'none';
        });
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', loadConfig);
