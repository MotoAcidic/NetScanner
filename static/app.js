// ---------- API ----------
const API = {
    async getConfig() {
        const r = await fetch('/api/config');
        return r.json();
    },
    async saveConfig(config) {
        const r = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        return r.json();
    },
    async startScan(subnets) {
        const r = await fetch('/api/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subnets })
        });
        return r.json();
    },
    async getScanProgress() {
        const r = await fetch('/api/scan/progress');
        return r.json();
    },
    async getResults() {
        const r = await fetch('/api/results');
        return r.json();
    }
};

// ---------- State ----------
const state = {
    isScanning: false,
    devices: [],
    inventory: [],
    activeFilter: 'all',
    pollHandle: null,
    logCount: 0
};

// ---------- Device classification ----------
// Coarse OUI hints for common IT vendors / device categories.
const OUI_HINTS = [
    // Apple
    { re: /^(00:03:93|00:05:02|00:0A:27|00:0A:95|00:0D:93|00:11:24|00:14:51|00:16:CB|00:17:F2|00:19:E3|00:1B:63|00:1C:B3|00:1D:4F|00:1E:52|00:1E:C2|00:1F:5B|00:1F:F3|00:21:E9|00:22:41|00:23:12|00:23:32|00:23:6C|00:23:DF|00:24:36|00:25:00|00:25:4B|00:25:BC|00:26:08|00:26:4A|00:26:B0|00:26:BB|3C:07:54|3C:15:C2|A8:20:66|A8:5B:78|A8:60:B6|A8:66:7F|A8:86:DD|A8:88:08|AC:1F:74|AC:29:3A|AC:3C:0B|AC:61:EA|AC:7F:3E|AC:87:A3|F4:0F:24|F4:1B:A1)/i, vendor: 'Apple', type: 'computer' },
    // Microsoft / Hyper-V
    { re: /^(00:15:5D|00:03:FF|00:0D:3A|00:12:5A|00:17:FA|00:1D:D8|00:1D:D9|00:50:F2|7C:1E:52|D8:9D:67|F0:1D:BC|94:53:30|54:50:84)/i, vendor: 'Microsoft', type: 'computer' },
    // VMware
    { re: /^(00:50:56|00:0C:29|00:05:69|00:1C:14)/i, vendor: 'VMware', type: 'server' },
    // Dell / Supermicro / Intel server NICs
    { re: /^(00:25:90|00:1B:21|00:30:48|00:25:B5|F0:1F:AF|78:E7:D1|18:66:DA|D4:AE:52|F4:8E:38|D4:CA:6D|00:1E:67|00:14:22)/i, vendor: 'Dell / Server', type: 'server' },
    // Cisco
    { re: /^(00:00:0C|00:01:42|00:01:43|00:01:63|00:0A:41|00:0A:F4|00:0E:38|00:1B:0C|00:1B:53|F4:0F:24|F4:CF:E2|00:24:13|00:1E:7A|00:21:1B|F8:72:EA)/i, vendor: 'Cisco', type: 'switch' },
    // Aruba / HPE
    { re: /^(00:0B:86|6C:F3:7F|94:B4:0F|18:64:72|D8:C7:C8|F0:5C:19|EC:08:6B|24:DE:C6|00:18:0A|00:24:6C)/i, vendor: 'Aruba / HPE', type: 'switch' },
    // HP older
    { re: /^(00:1F:45|00:1B:78|00:21:F7|00:23:7D|3C:D9:2B|00:0F:20|00:14:38)/i, vendor: 'HP / HPE', type: 'switch' },
    // Ubiquiti
    { re: /^(24:A4:3C|68:72:51|78:8A:20|F0:9F:C2|FC:EC:DA|74:83:C2|B4:FB:E4|E0:63:DA|AC:8B:A9|DC:9F:DB|E4:38:83|00:1A:1E)/i, vendor: 'Ubiquiti', type: 'ap' },
    // Fortinet
    { re: /^(00:09:0F|70:4C:A5|90:6C:AC|E8:1C:BA)/i, vendor: 'Fortinet', type: 'router' },
    // ASUS / NETGEAR / Linksys home gear
    { re: /^(00:90:4C|34:97:F6|D4:6E:0E|78:11:DC)/i, vendor: 'ASUS', type: 'router' },
    { re: /^(00:1D:7E|00:1F:33|94:10:3E|2C:B0:5D|F4:F2:6D)/i, vendor: 'NETGEAR', type: 'router' },
    { re: /^(00:14:BF|00:18:39|00:1A:70|00:21:29|00:23:69|00:25:9C|F8:1A:67|34:08:04)/i, vendor: 'Linksys', type: 'router' },
    // Printers
    { re: /^(00:01:E6|00:60:B0|00:80:77|00:30:C1|00:25:B3|9C:B6:54|D4:85:64|EC:9A:74|3C:52:82)/i, vendor: 'HP Printer', type: 'printer' },
    { re: /^(00:00:48|00:1E:8F|30:CD:A7|54:E1:AD|9C:93:4E)/i, vendor: 'Canon', type: 'printer' },
    { re: /^(00:00:74|00:1B:A9|3C:2A:F4|00:80:92)/i, vendor: 'Brother', type: 'printer' },
    { re: /^(08:00:37|00:00:85)/i, vendor: 'Xerox', type: 'printer' },
    // VoIP
    { re: /^(00:04:F2|00:15:65|64:16:7F|F4:B8:5E)/i, vendor: 'Polycom', type: 'phone' },
    { re: /^(00:0B:82|00:60:35|00:1F:9F)/i, vendor: 'Grandstream', type: 'phone' },
    { re: /^(00:24:1B)/i, vendor: 'Yealink', type: 'phone' },
    // Mobile / IoT
    { re: /^(00:23:76|00:24:E4|18:F1:D8|2C:54:CF|F8:DA:0C)/i, vendor: 'Samsung', type: 'phone' },
    { re: /^(B8:27:EB|DC:A6:32|E4:5F:01|28:CD:C1)/i, vendor: 'Raspberry Pi', type: 'iot' },
    { re: /^(EC:FA:BC|44:65:0D)/i, vendor: 'Amazon', type: 'iot' },
    { re: /^(F4:F5:D8|54:60:09|6C:AD:F8)/i, vendor: 'Google', type: 'iot' }
];

const TYPE_LABELS = {
    switch: 'Switch',
    router: 'Router / Gateway',
    ap: 'Access Point',
    server: 'Server',
    computer: 'Computer',
    printer: 'Printer',
    phone: 'VoIP / Mobile',
    iot: 'IoT',
    unknown: 'Unknown'
};

function classifyDevice(ip, mac, vendorHint, isSwitch) {
    const out = {
        type: 'unknown',
        vendor: (vendorHint && !/unknown/i.test(vendorHint)) ? vendorHint : ''
    };

    if (isSwitch) {
        out.type = 'switch';
    } else if (mac) {
        const m = mac.toUpperCase();
        for (const entry of OUI_HINTS) {
            if (entry.re.test(m)) {
                out.type = entry.type;
                if (!out.vendor) out.vendor = entry.vendor;
                break;
            }
        }
    }

    if (out.type === 'unknown' && ip) {
        const last = parseInt(ip.split('.').pop(), 10);
        if (last === 1 || last === 254) out.type = 'router';
    }

    out.typeLabel = TYPE_LABELS[out.type] || 'Unknown';
    return out;
}

// ---------- Init ----------
async function loadConfig() {
    try {
        const config = await API.getConfig();
        if (config.subnets) document.getElementById('subnets').value = config.subnets.join(', ');
    } catch (e) {
        console.error('Error loading config:', e);
    }
}

document.getElementById('year').textContent = new Date().getFullYear();

// ---------- Save config ----------
document.getElementById('saveConfig').addEventListener('click', async () => {
    const subnets = document.getElementById('subnets').value
        .split(',').map(s => s.trim()).filter(Boolean);

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
        flashStatus('complete', 'Configuration saved');
    } catch (e) {
        flashStatus('error', 'Save failed');
    }
});

// ---------- Start scan ----------
document.getElementById('startScan').addEventListener('click', async () => {
    const subnets = document.getElementById('subnets').value
        .split(',').map(s => s.trim()).filter(Boolean);

    if (subnets.length === 0) {
        flashStatus('error', 'Enter at least one subnet');
        return;
    }

    state.isScanning = true;
    document.getElementById('startScan').disabled = true;
    setStatus('running', 'Scanning');
    clearLog();
    switchTab('activity');

    try {
        await API.startScan(subnets);
        pollScanProgress();
    } catch (e) {
        flashStatus('error', 'Failed to start scan');
        state.isScanning = false;
        document.getElementById('startScan').disabled = false;
    }
});

function pollScanProgress() {
    if (state.pollHandle) clearInterval(state.pollHandle);
    state.pollHandle = setInterval(async () => {
        try {
            const progress = await API.getScanProgress();

            if (progress.status === 'running') setStatus('running', 'Scanning');
            if (progress.message) appendLog(progress.message);

            if (progress.status === 'complete' || progress.status === 'error') {
                clearInterval(state.pollHandle);
                state.pollHandle = null;
                state.isScanning = false;
                document.getElementById('startScan').disabled = false;

                if (progress.status === 'complete') {
                    setStatus('complete', 'Complete');
                    document.getElementById('lastScan').textContent = new Date().toLocaleString();
                } else {
                    setStatus('error', 'Error');
                }

                setTimeout(async () => {
                    try {
                        const results = await API.getResults();
                        displayResults(results);
                        switchTab('map');
                    } catch (err) {
                        console.error(err);
                    }
                }, 600);
            }
        } catch (e) {
            console.error('Error polling progress:', e);
        }
    }, 500);
}

// ---------- Display results ----------
function displayResults(results) {
    const switches = (results && results.switches) || [];
    const allDevices = (results && results.all_devices) || [];

    const switchIPs = new Set(switches.map(s => s.ip));
    const inventory = [];
    const seen = new Set();

    switches.forEach(sw => {
        if (!sw.ip || seen.has(sw.ip)) return;
        seen.add(sw.ip);
        const cls = classifyDevice(sw.ip, sw.mac || '', sw.vendor || '', true);
        inventory.push({
            type: cls.type,
            typeLabel: cls.typeLabel,
            ip: sw.ip,
            mac: sw.mac || '',
            vendor: cls.vendor || (sw.type ? sw.type.toUpperCase() : 'Network Device'),
            hostname: sw.hostname || '',
            source: sw.discovered_via || 'Port Scan',
            notes: sw.type ? `Detected: ${sw.type}` : ''
        });
    });

    allDevices.forEach(d => {
        if (!d.ip || seen.has(d.ip)) return;
        seen.add(d.ip);
        const isSwitch = switchIPs.has(d.ip);
        const cls = classifyDevice(d.ip, d.mac || '', d.vendor || '', isSwitch);
        inventory.push({
            type: cls.type,
            typeLabel: cls.typeLabel,
            ip: d.ip,
            mac: d.mac || '',
            vendor: cls.vendor || d.vendor || 'Unknown',
            hostname: d.hostname || '',
            source: d.discovered_via || 'ARP',
            notes: ''
        });
    });

    state.inventory = inventory;

    document.getElementById('kpiHosts').textContent = (results.total_hosts || allDevices.length || inventory.length || 0);
    document.getElementById('kpiSwitches').textContent = switches.length;
    const endpoints = inventory.filter(i => !['switch', 'router', 'ap'].includes(i.type)).length;
    document.getElementById('kpiEndpoints').textContent = endpoints;

    renderNetworkMap(inventory);
    renderInventory();
    renderMacTable(switches);
    updateChipCounts();
}

function renderNetworkMap(inventory) {
    const map = document.getElementById('networkMap');
    map.innerHTML = '';

    if (!inventory.length) {
        map.innerHTML = '<div class="empty-state">No devices discovered. Adjust subnets or credentials and re-scan.</div>';
        document.getElementById('mapCount').textContent = '0 nodes';
        return;
    }

    const priority = { router: 0, switch: 1, ap: 2, server: 3, printer: 4, phone: 5, computer: 6, iot: 7, unknown: 8 };
    const sorted = [...inventory].sort((a, b) => (priority[a.type] ?? 9) - (priority[b.type] ?? 9));
    const visible = sorted.slice(0, 24);

    visible.forEach(d => {
        const node = document.createElement('div');
        node.className = `device-node type-${d.type}`;
        node.innerHTML = `
            <div class="device-node-head">
                <div class="device-node-title">${escapeHtml(d.vendor || d.typeLabel)}</div>
                <div class="device-node-badge">${escapeHtml(d.typeLabel)}</div>
            </div>
            <div class="device-node-info">${escapeHtml(d.ip || '')}${d.mac ? '<br>' + escapeHtml(d.mac) : ''}</div>
        `;
        map.appendChild(node);
    });

    if (sorted.length > visible.length) {
        const more = document.createElement('div');
        more.className = 'empty-state';
        more.style.flex = '1 0 100%';
        more.textContent = `+ ${sorted.length - visible.length} more devices in the inventory tab`;
        map.appendChild(more);
    }

    document.getElementById('mapCount').textContent = `${inventory.length} nodes`;
}

function renderInventory() {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    const search = (document.getElementById('inventorySearch').value || '').toLowerCase();
    const filter = state.activeFilter;

    const filtered = state.inventory.filter(d => {
        if (filter !== 'all' && d.type !== filter) return false;
        if (!search) return true;
        const blob = `${d.ip} ${d.mac} ${d.vendor} ${d.hostname} ${d.typeLabel}`.toLowerCase();
        return blob.includes(search);
    });

    if (!filtered.length) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="7">No devices match the current filter.</td>`;
        tbody.appendChild(tr);
    } else {
        filtered.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="type-badge t-${d.type}">${escapeHtml(d.typeLabel)}</span></td>
                <td>${escapeHtml(d.ip || '—')}</td>
                <td>${d.mac ? escapeHtml(d.mac) : '—'}</td>
                <td>${escapeHtml(d.vendor || '—')}</td>
                <td>${escapeHtml(d.hostname || '—')}</td>
                <td>${escapeHtml(d.source || '—')}</td>
                <td>${escapeHtml(d.notes || '—')}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    document.getElementById('inventoryCount').textContent =
        `${filtered.length} of ${state.inventory.length} devices`;
}

function renderMacTable(switches) {
    const tbody = document.querySelector('#deviceTable tbody');
    tbody.innerHTML = '';
    state.devices = [];

    let count = 0;
    (switches || []).forEach(sw => {
        if (sw.mac_table && sw.mac_table.length) {
            sw.mac_table.forEach(entry => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${escapeHtml(entry.switch_ip || sw.ip || '—')}</td>
                    <td>${escapeHtml(entry.port || '—')}</td>
                    <td>${escapeHtml(entry.mac || '—')}</td>
                    <td>${escapeHtml(entry.vlan || '—')}</td>
                    <td><span class="status-${entry.status === 'active' ? 'active' : 'inactive'}">${escapeHtml(entry.status || 'unknown')}</span></td>
                    <td>${escapeHtml(entry.speed || '—')}</td>
                `;
                tbody.appendChild(tr);
                state.devices.push(entry);
                count++;
            });
        }
    });

    if (!count) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = '<td colspan="6">No switch MAC bindings collected. Provide credentials for managed switches to populate this table.</td>';
        tbody.appendChild(tr);
    }

    document.getElementById('macCount').textContent = `${count} entries`;
    document.getElementById('kpiMacs').textContent = count;
}

function updateChipCounts() {
    const counts = { all: state.inventory.length };
    state.inventory.forEach(d => {
        counts[d.type] = (counts[d.type] || 0) + 1;
    });
    document.querySelectorAll('#typeFilters .chip').forEach(chip => {
        const t = chip.dataset.type;
        const c = counts[t] || 0;
        const existing = chip.querySelector('.chip-count');
        if (existing) existing.remove();
        const span = document.createElement('span');
        span.className = 'chip-count';
        span.textContent = c;
        chip.appendChild(span);
    });
}

// ---------- Filters ----------
document.getElementById('typeFilters').addEventListener('click', e => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    document.querySelectorAll('#typeFilters .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    state.activeFilter = btn.dataset.type;
    renderInventory();
});

document.getElementById('inventorySearch').addEventListener('input', renderInventory);

document.getElementById('deviceSearch').addEventListener('input', e => {
    const search = e.target.value.toLowerCase();
    document.querySelectorAll('#deviceTable tbody tr').forEach(row => {
        if (row.classList.contains('empty-row')) return;
        row.style.display = row.textContent.toLowerCase().includes(search) ? '' : 'none';
    });
});

// ---------- Tabs ----------
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});
function switchTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === name));
}

// ---------- Status / log ----------
function setStatus(kind, label) {
    const pill = document.getElementById('statusPill');
    pill.classList.remove('is-running', 'is-complete', 'is-error');
    if (kind === 'running') pill.classList.add('is-running');
    else if (kind === 'complete') pill.classList.add('is-complete');
    else if (kind === 'error') pill.classList.add('is-error');
    document.getElementById('statusText').textContent = label;
}
function flashStatus(kind, label) {
    setStatus(kind, label);
    setTimeout(() => { if (!state.isScanning) setStatus('idle', 'Idle'); }, 2500);
}

function clearLog() {
    document.getElementById('progressLog').innerHTML = '';
    state.logCount = 0;
    document.getElementById('logCount').textContent = '0 events';
}
function appendLog(message) {
    const logDiv = document.getElementById('progressLog');
    const entry = document.createElement('div');
    entry.className = 'log-entry info';
    const lc = String(message).toLowerCase();
    if (lc.includes('complete') || lc.includes('found')) entry.classList.add('success');
    else if (lc.includes('error') || lc.includes('fail')) entry.classList.add('error');
    entry.innerHTML = `<span class="log-time">[${new Date().toLocaleTimeString()}]</span>${escapeHtml(message)}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;
    state.logCount++;
    document.getElementById('logCount').textContent = `${state.logCount} events`;
}

// ---------- Helpers ----------
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    updateChipCounts();
});
