/* ============================================================
   NetScanner — Network Operations Console
   ============================================================ */

// ---------------- API ----------------
const API = {
    async getConfig() { return (await fetch('/api/config')).json(); },
    async saveConfig(c) {
        return (await fetch('/api/config', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(c)
        })).json();
    },
    async machineInfo() {
        try { return await (await fetch('/api/machine-info')).json(); }
        catch { return null; }
    },
    async startScan(subnets) {
        return (await fetch('/api/scan', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subnets })
        })).json();
    },
    async progress() { return (await fetch('/api/scan/progress')).json(); },
    async results() { return (await fetch('/api/results')).json(); }
};

// ---------------- State ----------------
const state = {
    isScanning: false,
    pollHandle: null,
    inventory: [],
    activeFilter: 'all',
    host: null,
    selectedNodeId: null,
    topoZoom: 1,
    topoPan: { x: 0, y: 0 },
    panState: null,
    logCount: 0,
    rawResults: null
};

// ---------------- Device classification ----------------
const OUI_HINTS = [
    { re: /^(00:03:93|00:05:02|00:0A:27|00:0A:95|00:0D:93|00:11:24|00:14:51|00:16:CB|00:17:F2|00:19:E3|00:1B:63|00:1C:B3|00:1D:4F|00:1E:52|00:1E:C2|00:1F:5B|00:1F:F3|00:21:E9|00:22:41|00:23:12|00:23:32|00:23:6C|00:23:DF|00:24:36|00:25:00|00:25:4B|00:25:BC|00:26:08|00:26:4A|00:26:B0|00:26:BB|3C:07:54|3C:15:C2|A8:20:66|A8:5B:78|A8:60:B6|A8:66:7F|A8:86:DD|A8:88:08|AC:1F:74|AC:29:3A|AC:3C:0B|AC:61:EA|AC:7F:3E|AC:87:A3|F4:0F:24|F4:1B:A1)/i, vendor: 'Apple', type: 'computer' },
    { re: /^(00:15:5D|00:03:FF|00:0D:3A|00:12:5A|00:17:FA|00:1D:D8|00:1D:D9|00:50:F2|7C:1E:52|D8:9D:67|F0:1D:BC|94:53:30|54:50:84)/i, vendor: 'Microsoft', type: 'computer' },
    { re: /^(00:50:56|00:0C:29|00:05:69|00:1C:14)/i, vendor: 'VMware', type: 'server' },
    { re: /^(00:25:90|00:1B:21|00:30:48|00:25:B5|F0:1F:AF|78:E7:D1|18:66:DA|D4:AE:52|F4:8E:38|D4:CA:6D|00:1E:67|00:14:22)/i, vendor: 'Dell / Server', type: 'server' },
    { re: /^(00:00:0C|00:01:42|00:01:43|00:01:63|00:0A:41|00:0A:F4|00:0E:38|00:1B:0C|00:1B:53|F4:0F:24|F4:CF:E2|00:24:13|00:1E:7A|00:21:1B|F8:72:EA)/i, vendor: 'Cisco', type: 'switch' },
    { re: /^(00:0B:86|6C:F3:7F|94:B4:0F|18:64:72|D8:C7:C8|F0:5C:19|EC:08:6B|24:DE:C6|00:18:0A|00:24:6C)/i, vendor: 'Aruba / HPE', type: 'switch' },
    { re: /^(00:1F:45|00:1B:78|00:21:F7|00:23:7D|3C:D9:2B|00:0F:20|00:14:38)/i, vendor: 'HP / HPE', type: 'switch' },
    { re: /^(24:A4:3C|68:72:51|78:8A:20|F0:9F:C2|FC:EC:DA|74:83:C2|B4:FB:E4|E0:63:DA|AC:8B:A9|DC:9F:DB|E4:38:83|00:1A:1E)/i, vendor: 'Ubiquiti', type: 'ap' },
    { re: /^(00:09:0F|70:4C:A5|90:6C:AC|E8:1C:BA)/i, vendor: 'Fortinet', type: 'router' },
    { re: /^(00:90:4C|34:97:F6|D4:6E:0E|78:11:DC)/i, vendor: 'ASUS', type: 'router' },
    { re: /^(00:1D:7E|00:1F:33|94:10:3E|2C:B0:5D|F4:F2:6D)/i, vendor: 'NETGEAR', type: 'router' },
    { re: /^(00:14:BF|00:18:39|00:1A:70|00:21:29|00:23:69|00:25:9C|F8:1A:67|34:08:04)/i, vendor: 'Linksys', type: 'router' },
    { re: /^(00:01:E6|00:60:B0|00:80:77|00:30:C1|00:25:B3|9C:B6:54|D4:85:64|EC:9A:74|3C:52:82)/i, vendor: 'HP Printer', type: 'printer' },
    { re: /^(00:00:48|00:1E:8F|30:CD:A7|54:E1:AD|9C:93:4E)/i, vendor: 'Canon', type: 'printer' },
    { re: /^(00:00:74|00:1B:A9|3C:2A:F4|00:80:92)/i, vendor: 'Brother', type: 'printer' },
    { re: /^(08:00:37|00:00:85)/i, vendor: 'Xerox', type: 'printer' },
    { re: /^(00:04:F2|00:15:65|64:16:7F|F4:B8:5E)/i, vendor: 'Polycom', type: 'phone' },
    { re: /^(00:0B:82|00:60:35|00:1F:9F)/i, vendor: 'Grandstream', type: 'phone' },
    { re: /^(00:24:1B)/i, vendor: 'Yealink', type: 'phone' },
    { re: /^(00:23:76|00:24:E4|18:F1:D8|2C:54:CF|F8:DA:0C)/i, vendor: 'Samsung', type: 'phone' },
    { re: /^(B8:27:EB|DC:A6:32|E4:5F:01|28:CD:C1)/i, vendor: 'Raspberry Pi', type: 'iot' },
    { re: /^(EC:FA:BC|44:65:0D)/i, vendor: 'Amazon', type: 'iot' },
    { re: /^(F4:F5:D8|54:60:09|6C:AD:F8)/i, vendor: 'Google', type: 'iot' }
];

const TYPE_LABELS = {
    router: 'Router / Gateway',
    switch: 'Switch',
    ap: 'Access Point',
    server: 'Server',
    computer: 'Computer',
    printer: 'Printer',
    phone: 'VoIP / Mobile',
    iot: 'IoT',
    unknown: 'Unknown'
};
const TYPE_COLORS = {
    router: '#f59e0b', switch: '#3b82f6', ap: '#a78bfa',
    server: '#2dd4bf', computer: '#38bdf8', printer: '#f472b6',
    phone: '#22c55e', iot: '#5b6c8a', unknown: '#5b6c8a', host: '#3b82f6'
};
const TYPE_GLYPHS = {
    router: 'RT', switch: 'SW', ap: 'AP', server: 'SV',
    computer: 'PC', printer: 'PR', phone: 'PH', iot: 'IO', unknown: '?', host: 'YOU'
};

function classify(ip, mac, vendorHint, isSwitch) {
    const out = { type: 'unknown', vendor: (vendorHint && !/unknown/i.test(vendorHint)) ? vendorHint : '' };
    if (isSwitch) out.type = 'switch';
    else if (mac) {
        const m = mac.toUpperCase();
        for (const e of OUI_HINTS) {
            if (e.re.test(m)) { out.type = e.type; if (!out.vendor) out.vendor = e.vendor; break; }
        }
    }
    if (out.type === 'unknown' && ip) {
        const last = parseInt(ip.split('.').pop(), 10);
        if (last === 1 || last === 254) out.type = 'router';
    }
    out.typeLabel = TYPE_LABELS[out.type] || 'Unknown';
    return out;
}

// ---------------- Init ----------------
async function init() {
    document.getElementById('footerYear').textContent = new Date().getFullYear();
    setupNav();
    setupEvents();
    await loadHostInfo();
    await loadConfigInputs();
    updateChipCounts();
    renderComposition();
}

async function loadHostInfo() {
    const info = await API.machineInfo();
    if (!info) return;
    state.host = info;
    document.getElementById('hostName').textContent = info.hostname || '—';
    document.getElementById('hostIP').textContent = info.local_ip || '—';
    document.getElementById('hostSubnet').textContent = info.suggested_subnet || '—';
}

async function loadConfigInputs() {
    try {
        const c = await API.getConfig();
        if (c.subnets && c.subnets.length) {
            document.getElementById('subnets').value = c.subnets.join(', ');
        } else if (state.host && state.host.suggested_subnet) {
            document.getElementById('subnets').value = state.host.suggested_subnet;
        }
    } catch (e) { /* ignore */ }
}

// ---------------- Navigation ----------------
function setupNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    document.querySelectorAll('[data-view-link]').forEach(b => {
        b.addEventListener('click', () => switchView(b.dataset.viewLink));
    });
}
function switchView(name) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === name));
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.dataset.view === name));
    if (name === 'topology') renderTopology('topoFull');
    if (name === 'dashboard') renderTopology('topoMini');
}

// ---------------- Events ----------------
function setupEvents() {
    document.getElementById('startScan').addEventListener('click', startScan);
    document.getElementById('saveConfig').addEventListener('click', saveConfig);
    document.getElementById('useHostSubnet').addEventListener('click', () => {
        if (state.host && state.host.suggested_subnet) {
            document.getElementById('subnets').value = state.host.suggested_subnet;
        }
    });
    document.getElementById('inventorySearch').addEventListener('input', renderInventory);
    document.getElementById('typeFilters').addEventListener('click', e => {
        const c = e.target.closest('.chip');
        if (!c) return;
        document.querySelectorAll('#typeFilters .chip').forEach(x => x.classList.remove('active'));
        c.classList.add('active');
        state.activeFilter = c.dataset.type;
        renderInventory();
    });
    document.getElementById('deviceSearch').addEventListener('input', e => {
        const s = e.target.value.toLowerCase();
        document.querySelectorAll('#deviceTable tbody tr').forEach(r => {
            if (r.classList.contains('empty-row')) return;
            r.style.display = r.textContent.toLowerCase().includes(s) ? '' : 'none';
        });
    });
    document.getElementById('clearLog').addEventListener('click', clearLog);
    document.getElementById('topoZoomIn').addEventListener('click', () => zoomTopo(1.25));
    document.getElementById('topoZoomOut').addEventListener('click', () => zoomTopo(0.8));
    document.getElementById('topoReset').addEventListener('click', resetTopo);
    document.getElementById('topoCloseDetail').addEventListener('click', closeDetail);

    setupTopoPan();
}

// ---------------- Save config ----------------
async function saveConfig() {
    const subnets = document.getElementById('subnets').value
        .split(',').map(s => s.trim()).filter(Boolean);
    const config = {
        subnets,
        unifi_ip: val('unifi_ip'),
        unifi_username: val('unifi_username'),
        unifi_password: val('unifi_password'),
        aruba_username: val('aruba_username'),
        aruba_password: val('aruba_password'),
        hp_username: val('hp_username'),
        hp_password: val('hp_password')
    };
    try {
        await API.saveConfig(config);
        flashStatus('complete', 'Configuration saved');
    } catch {
        flashStatus('error', 'Save failed');
    }
}
function val(id) { return document.getElementById(id).value; }

// ---------------- Scan ----------------
async function startScan() {
    const subnets = document.getElementById('subnets').value
        .split(',').map(s => s.trim()).filter(Boolean);
    if (!subnets.length) {
        flashStatus('error', 'Enter at least one subnet');
        return;
    }
    state.isScanning = true;
    document.getElementById('startScan').disabled = true;
    setStatus('running', 'Scanning');
    clearLog();
    switchView('activity');
    try {
        await API.startScan(subnets);
        pollProgress();
    } catch {
        flashStatus('error', 'Failed to start scan');
        state.isScanning = false;
        document.getElementById('startScan').disabled = false;
    }
}

function pollProgress() {
    if (state.pollHandle) clearInterval(state.pollHandle);
    let lastMessage = '';
    state.pollHandle = setInterval(async () => {
        try {
            const p = await API.progress();
            if (p.status === 'scanning' || p.status === 'running') setStatus('running', 'Scanning');
            if (p.message && p.message !== lastMessage) {
                appendLog(p.message);
                lastMessage = p.message;
            }
            if (p.status === 'complete' || p.status === 'error') {
                clearInterval(state.pollHandle);
                state.pollHandle = null;
                state.isScanning = false;
                document.getElementById('startScan').disabled = false;
                if (p.status === 'complete') {
                    setStatus('complete', 'Complete');
                    document.getElementById('lastScan').textContent = new Date().toLocaleString();
                } else {
                    setStatus('error', 'Error');
                }
                setTimeout(async () => {
                    try {
                        const r = await API.results();
                        applyResults(r);
                        switchView('dashboard');
                    } catch (e) { console.error(e); }
                }, 600);
            }
        } catch (e) { console.error(e); }
    }, 500);
}

// ---------------- Apply results ----------------
function applyResults(results) {
    state.rawResults = results;
    const switches = (results && results.switches) || [];
    const allDevices = (results && results.all_devices) || [];

    const switchIPs = new Set(switches.map(s => s.ip));
    const inventory = [];
    const seen = new Set();

    switches.forEach(sw => {
        if (!sw.ip || seen.has(sw.ip)) return;
        seen.add(sw.ip);
        const cls = classify(sw.ip, sw.mac || '', sw.vendor || '', true);
        inventory.push({
            id: 'd-' + sw.ip,
            type: cls.type,
            typeLabel: cls.typeLabel,
            ip: sw.ip, mac: sw.mac || '',
            vendor: cls.vendor || (sw.type ? sw.type.toUpperCase() : 'Network Device'),
            hostname: sw.hostname || '',
            source: sw.discovered_via || 'Port Scan',
            mac_table: sw.mac_table || []
        });
    });
    allDevices.forEach(d => {
        if (!d.ip || seen.has(d.ip)) return;
        seen.add(d.ip);
        const isSwitch = switchIPs.has(d.ip);
        const cls = classify(d.ip, d.mac || '', d.vendor || '', isSwitch);
        inventory.push({
            id: 'd-' + d.ip,
            type: cls.type,
            typeLabel: cls.typeLabel,
            ip: d.ip, mac: d.mac || '',
            vendor: cls.vendor || d.vendor || 'Unknown',
            hostname: d.hostname || '',
            source: d.discovered_via || 'ARP'
        });
    });

    state.inventory = inventory;

    // KPIs
    const infra = inventory.filter(i => ['switch', 'router', 'ap'].includes(i.type)).length;
    const endpoints = inventory.length - infra;
    setText('kpiHosts', results.total_hosts || allDevices.length || inventory.length);
    setText('kpiInfra', infra);
    setText('kpiEndpoints', endpoints);
    let macs = 0;
    switches.forEach(sw => { if (sw.mac_table) macs += sw.mac_table.length; });
    setText('kpiMacs', macs);

    renderComposition();
    renderInventory();
    renderMacTable(switches);
    updateChipCounts();
    renderTopology('topoFull');
    renderTopology('topoMini');
    setText('macCount', `${macs} entries`);
}

function setText(id, v) { document.getElementById(id).textContent = v; }

// ---------------- Composition ----------------
function renderComposition() {
    const container = document.getElementById('compositionList');
    if (!container) return;
    const counts = {};
    state.inventory.forEach(i => { counts[i.type] = (counts[i.type] || 0) + 1; });
    const total = state.inventory.length || 1;
    const order = ['router', 'switch', 'ap', 'server', 'computer', 'printer', 'phone', 'iot', 'unknown'];
    container.innerHTML = '';
    if (!state.inventory.length) {
        container.innerHTML = '<div class="empty-state">No data yet</div>';
        return;
    }
    order.forEach(t => {
        const c = counts[t] || 0;
        if (!c) return;
        const pct = Math.round((c / total) * 100);
        const row = document.createElement('div');
        row.className = 'comp-row';
        row.innerHTML = `
            <div class="comp-label"><span class="dot" style="background:${TYPE_COLORS[t]}"></span>${escapeHtml(TYPE_LABELS[t])}</div>
            <div class="comp-bar"><div class="comp-fill" style="width:${pct}%;background:${TYPE_COLORS[t]}"></div></div>
            <div class="comp-count">${c}</div>
        `;
        container.appendChild(row);
    });
}

// ---------------- Inventory table ----------------
function renderInventory() {
    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';
    const search = (document.getElementById('inventorySearch').value || '').toLowerCase();
    const filter = state.activeFilter;
    const list = state.inventory.filter(d => {
        if (filter !== 'all' && d.type !== filter) return false;
        if (!search) return true;
        return `${d.ip} ${d.mac} ${d.vendor} ${d.hostname} ${d.typeLabel}`.toLowerCase().includes(search);
    });
    if (!list.length) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = `<td colspan="6">No devices match the current filter.</td>`;
        tbody.appendChild(tr);
    } else {
        list.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span class="type-badge t-${d.type}">${escapeHtml(d.typeLabel)}</span></td>
                <td>${escapeHtml(d.ip || '—')}</td>
                <td>${d.mac ? escapeHtml(d.mac) : '—'}</td>
                <td>${escapeHtml(d.vendor || '—')}</td>
                <td>${escapeHtml(d.hostname || '—')}</td>
                <td>${escapeHtml(d.source || '—')}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    setText('inventoryCount', `${list.length} of ${state.inventory.length} devices`);
}

function renderMacTable(switches) {
    const tbody = document.querySelector('#deviceTable tbody');
    tbody.innerHTML = '';
    let count = 0;
    (switches || []).forEach(sw => {
        (sw.mac_table || []).forEach(entry => {
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
            count++;
        });
    });
    if (!count) {
        const tr = document.createElement('tr');
        tr.className = 'empty-row';
        tr.innerHTML = '<td colspan="6">No switch MAC bindings collected. Provide credentials for managed switches to populate this table.</td>';
        tbody.appendChild(tr);
    }
    setText('macCount', `${count} entries`);
}

function updateChipCounts() {
    const counts = { all: state.inventory.length };
    state.inventory.forEach(d => { counts[d.type] = (counts[d.type] || 0) + 1; });
    document.querySelectorAll('#typeFilters .chip').forEach(c => {
        const t = c.dataset.type;
        const ct = counts[t] || 0;
        const ex = c.querySelector('.chip-count');
        if (ex) ex.remove();
        const span = document.createElement('span');
        span.className = 'chip-count';
        span.textContent = ct;
        c.appendChild(span);
    });
}

// ============================================================
//   TOPOLOGY (SVG hierarchical)
// ============================================================
function renderTopology(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const wrap = svg.parentElement;
    const emptyEl = wrap.querySelector('.empty-state');

    if (!state.inventory.length) {
        svg.innerHTML = '';
        if (emptyEl) emptyEl.style.display = '';
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    const isFull = svgId === 'topoFull';
    const W = wrap.clientWidth || 1000;
    const H = (isFull ? wrap.clientHeight : 360) || 360;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);

    // Categorize devices
    const routers = state.inventory.filter(d => d.type === 'router');
    const switches = state.inventory.filter(d => d.type === 'switch');
    const aps = state.inventory.filter(d => d.type === 'ap');
    const endpoints = state.inventory.filter(d => !['router', 'switch', 'ap'].includes(d.type));

    // Sort endpoints by type for grouping
    const epOrder = ['server', 'computer', 'printer', 'phone', 'iot', 'unknown'];
    endpoints.sort((a, b) => (epOrder.indexOf(a.type) - epOrder.indexOf(b.type)) || a.ip.localeCompare(b.ip));

    // Layout calculations: 4 tiers
    // Tier 0: Internet (synthetic)
    // Tier 1: Router(s) / Gateway
    // Tier 2: Switches + APs
    // Tier 3: Endpoints
    const padding = 40;
    const tierY = isFull
        ? [60, 150, 270, 420]
        : [40, 100, 180, 280];

    const nodeW = isFull ? 130 : 110;
    const nodeH = isFull ? 50 : 42;

    // Position helpers
    const layoutTier = (items, y) => {
        if (!items.length) return [];
        const usableW = W - padding * 2;
        const slot = usableW / items.length;
        return items.map((d, i) => ({
            d, x: padding + slot * i + slot / 2, y
        }));
    };

    // Internet anchor (synthetic)
    const internetNode = { x: W / 2, y: tierY[0], synthetic: true, label: 'Internet / WAN' };

    // Layout
    const routerPos = layoutTier(routers, tierY[1]);
    const infraTier2 = [...switches, ...aps];
    const tier2Pos = layoutTier(infraTier2, tierY[2]);

    // For endpoints: cap to a reasonable density per row, wrap into multiple rows
    const maxPerRow = isFull ? Math.max(8, Math.floor((W - padding * 2) / (nodeW + 14))) : Math.max(6, Math.floor((W - padding * 2) / (nodeW + 8)));
    const rows = [];
    for (let i = 0; i < endpoints.length; i += maxPerRow) {
        rows.push(endpoints.slice(i, i + maxPerRow));
    }
    const rowGap = isFull ? 70 : 56;
    const epPositions = [];
    rows.forEach((row, ri) => {
        const y = tierY[3] + ri * rowGap;
        const usableW = W - padding * 2;
        const slot = usableW / row.length;
        row.forEach((d, i) => {
            epPositions.push({ d, x: padding + slot * i + slot / 2, y });
        });
    });

    // Adjust SVG height if needed (full view)
    if (isFull && rows.length > 1) {
        const newH = tierY[3] + rows.length * rowGap + 40;
        if (newH > H) {
            svg.setAttribute('viewBox', `0 0 ${W} ${newH}`);
            svg.setAttribute('height', newH);
        }
    }

    // Build SVG content
    let svgContent = '';

    // Defs
    svgContent += `
        <defs>
            <filter id="nodeShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.4"/>
            </filter>
        </defs>
    `;

    // Apply pan/zoom transform via group
    svgContent += `<g transform="translate(${state.topoPan.x}, ${state.topoPan.y}) scale(${state.topoZoom})">`;

    // Links: Internet → routers
    routerPos.forEach(p => {
        svgContent += linkPath(internetNode.x, internetNode.y, p.x, p.y);
    });
    // Links: routers → tier2 (or internet → tier2 if no router)
    if (routerPos.length === 0) {
        tier2Pos.forEach(p => {
            svgContent += linkPath(internetNode.x, internetNode.y, p.x, p.y);
        });
    } else {
        // each tier2 node connects to nearest router
        tier2Pos.forEach(p => {
            const nearest = routerPos.reduce((acc, r) => {
                const dist = Math.abs(r.x - p.x);
                return dist < acc.dist ? { p: r, dist } : acc;
            }, { p: routerPos[0], dist: Infinity }).p;
            svgContent += linkPath(nearest.x, nearest.y + nodeH / 2, p.x, p.y - nodeH / 2);
        });
    }
    // Links: tier2 → endpoints (each endpoint connects to nearest tier2 node, or router if none)
    const parents = tier2Pos.length ? tier2Pos : (routerPos.length ? routerPos : [internetNode]);
    epPositions.forEach(p => {
        const nearest = parents.reduce((acc, r) => {
            const dist = Math.abs(r.x - p.x);
            return dist < acc.dist ? { p: r, dist } : acc;
        }, { p: parents[0], dist: Infinity }).p;
        svgContent += linkPath(nearest.x, nearest.y + nodeH / 2, p.x, p.y - nodeH / 2);
    });

    // Nodes: Internet
    svgContent += syntheticNode(internetNode.x, internetNode.y, 'Internet / WAN', nodeW, nodeH);

    // Nodes: routers, switches/aps, endpoints
    [...routerPos, ...tier2Pos, ...epPositions].forEach(p => {
        svgContent += deviceNode(p.d, p.x, p.y, nodeW, nodeH, isFull);
    });

    svgContent += `</g>`;

    svg.innerHTML = svgContent;

    // Wire up node clicks
    svg.querySelectorAll('.node-group[data-id]').forEach(g => {
        g.addEventListener('click', e => {
            e.stopPropagation();
            const id = g.dataset.id;
            selectNode(id);
        });
    });

    // Topology summary (full view)
    if (isFull) {
        setText('topoSummary',
            `${routers.length} router${routers.length !== 1 ? 's' : ''} · ` +
            `${switches.length} switch${switches.length !== 1 ? 'es' : ''} · ` +
            `${aps.length} AP${aps.length !== 1 ? 's' : ''} · ` +
            `${endpoints.length} endpoint${endpoints.length !== 1 ? 's' : ''}`
        );
    }
}

function linkPath(x1, y1, x2, y2) {
    const midY = (y1 + y2) / 2;
    return `<path class="link" d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}" />`;
}

function syntheticNode(cx, cy, label, w, h) {
    const x = cx - w / 2, y = cy - h / 2;
    return `
        <g class="node-group" data-synthetic="1">
            <rect class="node-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" filter="url(#nodeShadow)"
                style="fill:#0f1729;stroke:#2a395d"/>
            <circle cx="${cx - w / 2 + 18}" cy="${cy}" r="6" fill="#3b82f6" opacity="0.9"/>
            <text class="node-label" x="${cx + 8}" y="${cy + 1}" text-anchor="middle">${escapeHtml(label)}</text>
        </g>
    `;
}

function deviceNode(d, cx, cy, w, h, isFull) {
    const x = cx - w / 2, y = cy - h / 2;
    const color = TYPE_COLORS[d.type] || TYPE_COLORS.unknown;
    const glyph = TYPE_GLYPHS[d.type] || '?';
    const selected = state.selectedNodeId === d.id ? 'selected' : '';
    const labelTop = d.vendor ? truncate(d.vendor, 18) : truncate(d.typeLabel, 18);
    const labelBottom = d.ip || '';
    return `
        <g class="node-group ${selected}" data-id="${escapeAttr(d.id)}">
            <rect class="node-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" filter="url(#nodeShadow)"/>
            <rect class="accent-stripe" x="${x}" y="${y}" width="3" height="${h}" rx="1" fill="${color}"/>
            <circle cx="${x + 18}" cy="${cy}" r="11" fill="${color}" opacity="0.18"/>
            <text class="node-icon" x="${x + 18}" y="${cy}" fill="${color}">${escapeHtml(glyph)}</text>
            <text class="node-label" x="${x + w / 2 + 8}" y="${cy - 5}" text-anchor="middle">${escapeHtml(labelTop)}</text>
            <text class="node-sub" x="${x + w / 2 + 8}" y="${cy + 9}" text-anchor="middle">${escapeHtml(labelBottom)}</text>
        </g>
    `;
}

function selectNode(id) {
    state.selectedNodeId = id;
    document.querySelectorAll('.node-group').forEach(g => {
        g.classList.toggle('selected', g.dataset.id === id);
    });
    const dev = state.inventory.find(d => d.id === id);
    if (dev) renderDetail(dev);
}

function renderDetail(d) {
    const body = document.getElementById('topoDetailBody');
    if (!body) return;
    const color = TYPE_COLORS[d.type] || TYPE_COLORS.unknown;
    const glyph = TYPE_GLYPHS[d.type] || '?';
    const macRows = (d.mac_table || []).slice(0, 8);
    body.innerHTML = `
        <div class="detail-hero">
            <div class="detail-hero-icon" style="background:${color}22;color:${color}">${escapeHtml(glyph)}</div>
            <div>
                <div class="detail-hero-name">${escapeHtml(d.vendor || d.typeLabel)}</div>
                <div class="detail-hero-type">${escapeHtml(d.typeLabel)}</div>
            </div>
        </div>
        <div class="detail-row"><div class="k">IP</div><div class="v">${escapeHtml(d.ip || '—')}</div></div>
        <div class="detail-row"><div class="k">MAC</div><div class="v">${escapeHtml(d.mac || '—')}</div></div>
        <div class="detail-row"><div class="k">Vendor</div><div class="v">${escapeHtml(d.vendor || '—')}</div></div>
        <div class="detail-row"><div class="k">Hostname</div><div class="v">${escapeHtml(d.hostname || '—')}</div></div>
        <div class="detail-row"><div class="k">Source</div><div class="v">${escapeHtml(d.source || '—')}</div></div>
        ${macRows.length ? `
            <div class="detail-row" style="grid-template-columns:1fr">
                <div class="k">Switch Ports (${d.mac_table.length})</div>
                <div class="v" style="font-size:11px;line-height:1.6">
                    ${macRows.map(m => `Port ${escapeHtml(m.port || '?')} · ${escapeHtml(m.mac || '?')} · VLAN ${escapeHtml(m.vlan || '?')}`).join('<br>')}
                    ${d.mac_table.length > macRows.length ? `<br><em style="color:var(--text-mute)">+ ${d.mac_table.length - macRows.length} more</em>` : ''}
                </div>
            </div>
        ` : ''}
    `;
    document.getElementById('topoDetail').classList.add('show');
}

function closeDetail() {
    state.selectedNodeId = null;
    document.querySelectorAll('.node-group').forEach(g => g.classList.remove('selected'));
    const body = document.getElementById('topoDetailBody');
    if (body) body.innerHTML = '<div class="empty-state">Select a node to inspect.</div>';
    document.getElementById('topoDetail').classList.remove('show');
}

// Pan & zoom
function setupTopoPan() {
    const wrap = document.getElementById('topoCanvasWrap');
    if (!wrap) return;
    const svg = document.getElementById('topoFull');

    svg.addEventListener('mousedown', e => {
        if (e.target.closest('.node-group[data-id]')) return;
        state.panState = { x: e.clientX, y: e.clientY, ox: state.topoPan.x, oy: state.topoPan.y };
    });
    window.addEventListener('mousemove', e => {
        if (!state.panState) return;
        state.topoPan.x = state.panState.ox + (e.clientX - state.panState.x);
        state.topoPan.y = state.panState.oy + (e.clientY - state.panState.y);
        applyTopoTransform('topoFull');
    });
    window.addEventListener('mouseup', () => { state.panState = null; });

    svg.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        state.topoZoom = Math.min(2.5, Math.max(0.4, state.topoZoom * delta));
        applyTopoTransform('topoFull');
    }, { passive: false });

    // Click empty area closes detail
    svg.addEventListener('click', e => {
        if (!e.target.closest('.node-group[data-id]')) closeDetail();
    });
}

function applyTopoTransform(svgId) {
    const svg = document.getElementById(svgId);
    if (!svg) return;
    const g = svg.querySelector('g[transform]');
    if (g) g.setAttribute('transform', `translate(${state.topoPan.x}, ${state.topoPan.y}) scale(${state.topoZoom})`);
}

function zoomTopo(factor) {
    state.topoZoom = Math.min(2.5, Math.max(0.4, state.topoZoom * factor));
    applyTopoTransform('topoFull');
}
function resetTopo() {
    state.topoZoom = 1;
    state.topoPan = { x: 0, y: 0 };
    applyTopoTransform('topoFull');
}

// ---------------- Status / log ----------------
function setStatus(kind, label) {
    const pill = document.getElementById('statusPill');
    pill.classList.remove('is-running', 'is-complete', 'is-error');
    if (kind === 'running') pill.classList.add('is-running');
    else if (kind === 'complete') pill.classList.add('is-complete');
    else if (kind === 'error') pill.classList.add('is-error');
    setText('statusText', label);
}
function flashStatus(kind, label) {
    setStatus(kind, label);
    setTimeout(() => { if (!state.isScanning) setStatus('idle', 'Idle'); }, 2500);
}
function clearLog() {
    document.getElementById('progressLog').innerHTML = '';
    document.getElementById('dashLog').innerHTML = '';
    state.logCount = 0;
    setText('logCount', '0 events');
}
function appendLog(message) {
    const lc = String(message).toLowerCase();
    let cls = 'log-entry info';
    if (lc.includes('complete') || lc.includes('found')) cls += ' success';
    else if (lc.includes('error') || lc.includes('fail')) cls += ' error';
    const html = `<div class="${cls}"><span class="log-time">[${new Date().toLocaleTimeString()}]</span>${escapeHtml(message)}</div>`;

    const main = document.getElementById('progressLog');
    main.insertAdjacentHTML('beforeend', html);
    main.scrollTop = main.scrollHeight;

    const dash = document.getElementById('dashLog');
    dash.insertAdjacentHTML('beforeend', html);
    dash.scrollTop = dash.scrollHeight;
    // keep dash compact
    while (dash.children.length > 50) dash.removeChild(dash.firstChild);

    state.logCount++;
    setText('logCount', `${state.logCount} events`);
}

// ---------------- Helpers ----------------
function escapeHtml(s) {
    if (s === null || s === undefined) return '';
    return String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function escapeAttr(s) { return escapeHtml(s).replace(/`/g, '&#96;'); }
function truncate(s, n) {
    if (!s) return '';
    s = String(s);
    return s.length > n ? s.substring(0, n - 1) + '…' : s;
}

// ---------------- Boot ----------------
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('resize', () => {
    if (document.querySelector('.view.active')?.dataset.view === 'topology') renderTopology('topoFull');
    if (document.querySelector('.view.active')?.dataset.view === 'dashboard') renderTopology('topoMini');
});
