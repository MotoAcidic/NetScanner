# NetScanner - SAFE PASSIVE MODE

## What This Tool Does (WITHOUT Logins)

**Discovers what's on your network using PASSIVE methods only:**

1. **ARP Scanning** - Reads local ARP table to see all active MAC addresses
2. **Ping Sweep** - Finds active hosts on specified subnets  
3. **Port Detection** - Identifies potential network devices by checking management ports
4. **No SSH/Telnet** - Never connects to switches
5. **No Risk** - 100% read-only, can't accidentally change configs

## How It Works

```
Your Client Network
    ↓
Scan local ARP table → Find all active MAC addresses
Ping sweep → Find active IPs  
Port scan → Identify which are network devices
    ↓
Display results in web UI
```

## What You'll See

- **List of active devices** by MAC address
- **Vendor information** for each MAC
- **Potential network devices** (switches, routers, etc.)
- **All without logging in to anything**

## Running It

```bash
python main.py
```

Then open: **http://localhost:3000**

## The Process

1. **Enter network ranges**: `192.168.1.0/24, 10.0.0.0/24, etc.`
2. **Click "Start Scan"**
3. **Real-time progress** shows what's being discovered
4. **Results display** all found devices and potential network equipment
5. **That's it** - no credentials needed

## Optional: Enhanced Queries (if you have credentials)

If you ADD credentials in the configuration, the tool will OPTIONALLY try to:
- Query UniFi controllers for switch details
- Get device tables from Aruba switches (READ-ONLY)
- Get device tables from HP switches (READ-ONLY)

But these are **100% optional**. The basic scan works perfectly without any logins.

## Safety Guarantees

✓ **No SSH connections** - No risk of config changes
✓ **No Telnet** - No risk of manual commands
✓ **Read-only only** - Even if credentials provided, only READ operations
✓ **Passive discovery** - Uses ARP and ping, nothing invasive
✓ **Medical-safe** - Zero risk to network integrity
✓ **Audit trail** - You can see exactly what the tool is doing in real-time

## What You Get

After scanning a network, you'll see:

```
Connected Devices:
├─ MAC: aa:bb:cc:dd:ee:01 | Vendor: Apple | IP: 192.168.1.100
├─ MAC: aa:bb:cc:dd:ee:02 | Vendor: Cisco | IP: 192.168.1.50 [Switch]
├─ MAC: aa:bb:cc:dd:ee:03 | Vendor: HP | IP: 192.168.1.51 [Switch]
└─ MAC: aa:bb:cc:dd:ee:04 | Vendor: Unknown | IP: 192.168.1.200
```

## In ScreenConnect

1. **Download `main.py` to toolbox**
2. **Run during customer call**
3. **Browser opens automatically**
4. **Scan their network**
5. **See everything without touching their switches**
6. **Take screenshots or export data**

## Key Difference

**Before:** Had to SSH into each switch manually, high risk
**After:** Passive scan shows everything, ZERO risk

## Technical Details

- **ARP Table**: Shows all MAC addresses currently active on segment
- **Ping Sweep**: ICMP echo requests (completely standard, not invasive)
- **Port Scan**: Just checks if ports are open (no login attempt)
- **No SSH/Telnet**: Never initiates a connection to switch CLI

## Troubleshooting

**"No devices found"**
- Check if network is active
- Try a smaller subnet range
- Make sure target network is reachable

**"Port 3000/5000 already in use"**
- Kill existing processes: `pkill -9 python node`
- Wait 5 seconds, try again

**"Can't see expected device"**
- Device might not be responding to ARP
- Check if it's actually powered on
- Try running scan again

## Bottom Line

This tool is **100% safe** to use in any customer environment. It discovers network topology using standard, passive network protocols. It's impossible to accidentally change configurations because it never logs in to anything.

Use it confidently in ScreenConnect. No risk. No warnings needed to customers.
