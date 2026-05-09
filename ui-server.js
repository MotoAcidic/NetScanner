#!/usr/bin/env node
/**
 * NetScanner UI Server
 * Pure Node.js - NO external dependencies
 * Uses only built-in modules: http, fs, path, url
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { spawn } = require('child_process');
const os = require('os');

const UI_PORT = 3000;
const API_PORT = 5000;
const API_HOST = 'localhost';

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif'
};

/**
 * Proxy API requests to Flask backend
 */
function proxyToAPI(pathname, method, body, res) {
    const url = new URL(`http://${API_HOST}:${API_PORT}${pathname}`);

    const options = {
        hostname: API_HOST,
        port: API_PORT,
        path: url.pathname + url.search,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    const proxyReq = http.request(options, (proxyRes) => {
        let data = '';

        proxyRes.on('data', (chunk) => {
            data += chunk;
        });

        proxyRes.on('end', () => {
            res.writeHead(proxyRes.statusCode, {
                'Content-Type': proxyRes.headers['content-type'] || 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(data);
        });
    });

    proxyReq.on('error', (error) => {
        console.error('API proxy error:', error.message);
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API server not responding' }));
    });

    if (body) {
        proxyReq.write(body);
    }

    proxyReq.end();
}

/**
 * Serve HTML file with embedded CSS and JS
 */
function serveIndex(res) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NetScanner</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
        .container { max-width: 1400px; margin: 0 auto; }
        header { text-align: center; color: white; margin-bottom: 30px; }
        header h1 { font-size: 2.5em; margin-bottom: 10px; }
        header p { font-size: 1.1em; opacity: 0.9; }
        .main-content { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .panel { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); }
        .panel h2 { color: #333; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #667eea; }
        .panel h3 { color: #555; margin-top: 20px; margin-bottom: 15px; }
        .form-group { margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 5px; color: #555; font-weight: 500; }
        .form-group input, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; font-family: monospace; }
        .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #667eea; box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); }
        .credential-section { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 15px; }
        .button-group { display: flex; gap: 10px; margin-top: 20px; }
        .btn { flex: 1; padding: 12px 20px; border: none; border-radius: 5px; font-size: 1em; font-weight: 600; cursor: pointer; transition: all 0.3s; }
        .btn-primary { background: #667eea; color: white; }
        .btn-primary:hover { background: #5568d3; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .progress-panel { grid-column: 2; grid-row: 1 / 3; }
        .progress-status { padding: 15px; background: #f0f0f0; border-radius: 5px; font-weight: 600; color: #667eea; margin-bottom: 15px; }
        .progress-log { background: #1e1e1e; color: #00ff00; padding: 15px; border-radius: 5px; font-family: monospace; font-size: 0.85em; max-height: 500px; overflow-y: auto; line-height: 1.5; }
        .results-panel { grid-column: 1 / -1; margin-top: 20px; }
        .network-map { background: #f9f9f9; border: 1px solid #ddd; border-radius: 5px; padding: 20px; margin-bottom: 30px; min-height: 300px; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 20px; }
        .switch-node { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; min-width: 200px; text-align: center; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1); }
        .search-box { margin-bottom: 20px; }
        .search-box input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 5px; }
        .filter-buttons { display: flex; gap: 5px; margin-bottom: 15px; flex-wrap: wrap; }
        .filter-btn { padding: 8px 12px; border: 1px solid #ddd; background: white; border-radius: 5px; cursor: pointer; }
        .filter-btn.active { background: #667eea; color: white; border-color: #667eea; }
        .device-table { width: 100%; border-collapse: collapse; }
        .device-table thead { background: #f0f0f0; }
        .device-table th { padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #ddd; }
        .device-table td { padding: 10px 12px; border-bottom: 1px solid #eee; }
        .device-table tbody tr { cursor: pointer; }
        .device-table tbody tr:hover { background: #f9f9f9; }
        .expand-row { display: none; }
        .expand-row.show { display: table-row; }
        .device-details { background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 0.85em; }
        .status-active { color: #4caf50; font-weight: 600; }
        .status-inactive { color: #f44336; }
        @media (max-width: 1200px) { .main-content { grid-template-columns: 1fr; } .progress-panel { grid-column: 1; } }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>NetScanner</h1>
            <p>Network switch discovery and device mapping</p>
        </header>

        <div class="main-content">
            <section class="panel config-panel">
                <h2>Configuration</h2>
                <div class="form-group">
                    <label>Network Subnets (comma-separated)</label>
                    <textarea id="subnets" placeholder="192.168.1.0/24, 10.0.0.0/24" rows="3"></textarea>
                </div>

                <h3>Optional Credentials</h3>

                <div class="credential-section">
                    <h4>UniFi Controller</h4>
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

                <div class="credential-section">
                    <h4>Aruba Switches</h4>
                    <div class="form-group">
                        <label>Username</label>
                        <input type="text" id="aruba_username">
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="aruba_password">
                    </div>
                </div>

                <div class="credential-section">
                    <h4>HP Switches</h4>
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
                    <button id="saveConfig" class="btn btn-secondary">Save Configuration</button>
                    <button id="startScan" class="btn btn-primary">Start Scan</button>
                </div>
            </section>

            <section class="panel progress-panel">
                <h2>Scan Progress</h2>
                <div id="progressStatus" class="progress-status">Idle</div>
                <div id="progressLog" class="progress-log"></div>
            </section>

            <section class="panel results-panel">
                <h2>Network Topology</h2>
                <div id="networkMap" class="network-map">
                    <p>Switches will appear here after scan</p>
                </div>

                <h2>Connected Devices</h2>
                <div class="search-box">
                    <input type="text" id="deviceSearch" placeholder="Search by MAC, IP, port...">
                </div>

                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="active">Active</button>
                    <button class="filter-btn" data-filter="inactive">Inactive</button>
                </div>

                <table id="deviceTable" class="device-table">
                    <thead>
                        <tr>
                            <th>Switch</th>
                            <th>Port</th>
                            <th>MAC Address</th>
                            <th>VLAN</th>
                            <th>Status</th>
                            <th>Speed</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </section>
        </div>
    </div>

    <script>
        const API_URL = 'http://localhost:5000';

        const API = {
            async getConfig() { return (await fetch(\`\${API_URL}/api/config\`)).json(); },
            async saveConfig(config) { return (await fetch(\`\${API_URL}/api/config\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })).json(); },
            async startScan(subnets) { return (await fetch(\`\${API_URL}/api/scan\`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subnets }) })).json(); },
            async getScanProgress() { return (await fetch(\`\${API_URL}/api/scan/progress\`)).json(); },
            async getResults() { return (await fetch(\`\${API_URL}/api/results\`)).json(); }
        };

        const state = { devices: [] };

        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const config = await API.getConfig();
                document.getElementById('subnets').value = config.subnets.join(', ');
            } catch (e) {
                console.error('Error loading config:', e);
            }
        });

        document.getElementById('saveConfig').addEventListener('click', async () => {
            const subnets = document.getElementById('subnets').value.split(',').map(s => s.trim()).filter(s => s);
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

        document.getElementById('startScan').addEventListener('click', async () => {
            const subnets = document.getElementById('subnets').value.split(',').map(s => s.trim()).filter(s => s);
            if (subnets.length === 0) { alert('Please enter at least one subnet'); return; }

            document.getElementById('startScan').disabled = true;

            try {
                await API.startScan(subnets);
                const interval = setInterval(async () => {
                    try {
                        const progress = await API.getScanProgress();
                        document.getElementById('progressStatus').textContent = \`Status: \${progress.status.toUpperCase()}\`;

                        if (progress.message) {
                            const logDiv = document.getElementById('progressLog');
                            const entry = document.createElement('div');
                            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${progress.message}\`;
                            logDiv.appendChild(entry);
                            logDiv.scrollTop = logDiv.scrollHeight;
                        }

                        if (progress.status === 'complete' || progress.status === 'error') {
                            clearInterval(interval);
                            document.getElementById('startScan').disabled = false;
                            setTimeout(async () => {
                                const results = await API.getResults();
                                displayResults(results);
                            }, 500);
                        }
                    } catch (e) {
                        console.error('Poll error:', e);
                    }
                }, 500);
            } catch (e) {
                alert('Error starting scan: ' + e.message);
                document.getElementById('startScan').disabled = false;
            }
        });

        function displayResults(results) {
            const mapDiv = document.getElementById('networkMap');
            mapDiv.innerHTML = '';
            if (results.switches && results.switches.length > 0) {
                results.switches.forEach(sw => {
                    const node = document.createElement('div');
                    node.className = 'switch-node';
                    node.innerHTML = \`<div style="font-weight: 600; margin-bottom: 10px;">\${sw.type.toUpperCase()}</div><div>\${sw.ip}</div><div style="font-size: 0.85em;">\${(sw.mac_table || []).length} devices</div>\`;
                    mapDiv.appendChild(node);
                });
            }

            const tbody = document.querySelector('.device-table tbody');
            tbody.innerHTML = '';
            state.devices = [];

            (results.switches || []).forEach(sw => {
                (sw.mac_table || []).forEach((entry, idx) => {
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td>\${entry.switch_ip || sw.ip}</td>
                        <td>\${entry.port || 'N/A'}</td>
                        <td><code>\${entry.mac || 'N/A'}</code></td>
                        <td>\${entry.vlan || 'N/A'}</td>
                        <td><span class="status-\${entry.status === 'active' ? 'active' : 'inactive'}">\${entry.status || 'unknown'}</span></td>
                        <td>\${entry.speed || 'N/A'}</td>
                    \`;
                    row.style.cursor = 'pointer';
                    row.addEventListener('click', () => {
                        const expandRow = tbody.querySelector(\`[data-parent="\${sw.ip}-\${idx}"]\`);
                        if (expandRow) expandRow.classList.toggle('show');
                    });
                    tbody.appendChild(row);

                    const expandRow = document.createElement('tr');
                    expandRow.className = 'expand-row';
                    expandRow.setAttribute('data-parent', \`\${sw.ip}-\${idx}\`);
                    expandRow.innerHTML = \`<td colspan="6"><div class="device-details"><strong>Switch:</strong> \${entry.switch_ip || sw.ip} (\${sw.type.toUpperCase()})<br><strong>MAC:</strong> \${entry.mac || 'N/A'}<br><strong>Port:</strong> \${entry.port || 'N/A'}<br><strong>VLAN:</strong> \${entry.vlan || 'N/A'}<br><strong>Status:</strong> \${entry.status || 'unknown'}<br><strong>Speed:</strong> \${entry.speed || 'N/A'}</div></td>\`;
                    tbody.appendChild(expandRow);

                    state.devices.push(entry);
                });
            });

            if (state.devices.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = '<td colspan="6" style="text-align: center; padding: 20px;">No devices found</td>';
                tbody.appendChild(row);
            }

            document.getElementById('deviceSearch').addEventListener('input', (e) => {
                const search = e.target.value.toLowerCase();
                document.querySelectorAll('.device-table tbody tr:not(.expand-row)').forEach(row => {
                    row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
                });
            });

            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const filter = btn.getAttribute('data-filter');
                    document.querySelectorAll('.device-table tbody tr:not(.expand-row)').forEach(row => {
                        if (filter === 'all') row.style.display = '';
                        else {
                            const isActive = row.querySelector('td:nth-child(5)').textContent.toLowerCase().includes('active');
                            row.style.display = (filter === 'active' && isActive) || (filter === 'inactive' && !isActive) ? '' : 'none';
                        }
                    });
                });
            });
        }
    </script>
</body>
</html>`;

    res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Length': Buffer.byteLength(html)
    });
    res.end(html);
}

/**
 * Main HTTP server
 */
const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Root - serve HTML
    if (req.url === '/' || req.url === '/index.html') {
        serveIndex(res);
        return;
    }

    // Proxy API requests
    if (req.url.startsWith('/api/')) {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            proxyToAPI(req.url, req.method, body, res);
        });
        return;
    }

    // 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
});

server.listen(UI_PORT, 'localhost', () => {
    console.log(`\n=== NetScanner ===\n`);
    console.log(`UI:  http://localhost:${UI_PORT}`);
    console.log(`API: http://localhost:${API_PORT}\n`);
    console.log(`Opening browser...\n`);

    // Auto-open browser
    if (process.platform === 'darwin') {
        require('child_process').exec(`open http://localhost:${UI_PORT}`);
    } else if (process.platform === 'win32') {
        require('child_process').exec(`start http://localhost:${UI_PORT}`);
    } else {
        require('child_process').exec(`xdg-open http://localhost:${UI_PORT}`);
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${UI_PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    server.close(() => process.exit(0));
});
