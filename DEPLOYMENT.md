# ScreenConnect Deployment Guide

## Quick Deploy (5 minutes)

### Step 1: Get the Tool
- Download `NetScanner.exe` from the releases page or GitHub
- Store it somewhere accessible (e.g., your tools folder, network share, or upload to ScreenConnect)

### Step 2: Connect to Client
- Launch ScreenConnect session with the client's technician/admin
- Download or copy `NetScanner.exe` to their desktop/temp folder
- OR add to ScreenConnect Toolbox for one-click deployment

### Step 3: Launch
- Double-click `NetScanner.exe`
- Browser automatically opens to `http://localhost:5000`
- Takes 2-3 seconds to start

### Step 4: Configure (first time only)
1. Enter network ranges:
   - Ask client: "What are your network subnets?"
   - Examples: `192.168.1.0/24`, `10.0.0.0/24`, `172.16.0.0/22`
   - Separate multiple with commas

2. Add credentials (optional but recommended):
   - **UniFi**: If they use UniFi controller, enter controller IP and credentials
   - **Aruba**: Enter admin SSH credentials
   - **HP**: Enter admin SSH credentials
   - Click "Save Configuration"

### Step 5: Scan
- Click "Start Scan"
- Watch progress in real-time
- Takes 2-10 minutes depending on network size

### Step 6: Review Results
- **Network Map**: Visual layout of all discovered switches
- **Device Table**: Searchable list of all devices by MAC/IP/Port
- Use search to find specific devices:
  - Search by MAC: `aa:bb:cc:dd:ee:ff`
  - Search by IP: `192.168.1.100`
  - Search by port: `eth0`, `Gi1/0/1`

## Troubleshooting During Client Call

### "No switches found"
**Ask the client:**
- "What are your network ranges?" (enter more specific subnets)
- "Is there a firewall blocking ping?" (may need to add credentials)
- "Are your switches on the same subnet or different VLANs?"

**Try:**
- Enter smaller subnets (e.g., `/25` instead of `/24`)
- Add SSH credentials even if unsure
- Check if switches are powered on and accessible

### "Connection timeout"
- Switches may be slow to respond
- Try reducing subnet ranges
- Add credentials for SSH access

### "Permission denied on switch"
- Switch credentials may be wrong
- Some switches require specific usernames (e.g., `admin`, `root`)
- Try different passwords if you have multiple options

## Adding to ScreenConnect Toolbox

**For Your Organization (Admins):**

1. Log into ScreenConnect as admin
2. Go: **Tools → Files**
3. Click **Upload File**
4. Select `NetScanner.exe`
5. Give it a friendly name: "Network Scanner"
6. Save

**Now your techs can:**
- Launch ScreenConnect session
- Tools menu → Network Scanner → Download & Run
- No manual copying needed

## Integration Tips

### Before Calling Client
- Pre-scan your own network to test
- Have a subnet list ready (ask during intake call)
- Gather switch credentials ahead of time if available

### During Session
- Minimize ScreenConnect window so client can see their browser
- Or use split screen: ScreenConnect on left, scanner on right
- Download/export results before ending session

### After Session
- Results stored locally in `~/.netscanner/` on their machine
- Can send them the scan results as a report
- Safe to delete the .exe when done (no installation files left behind)

## What to Look For in Results

### Device Issues
- **Device on wrong VLAN?** Check port config
- **Orphaned MAC addresses?** Device may be disconnected
- **Port down?** Check physical connection
- **Speed issues?** Check if port is set to auto-negotiate

### Network Issues
- **Missing switch?** May not have SSH enabled
- **Incomplete MAC table?** Network may be congested
- **No devices on port?** Port may be configured as uplink/trunk

## Pro Tips

1. **Save results**: Screenshot or export data before closing
2. **Multiple subnets**: Scan management network first, then data networks
3. **Credential storage**: Credentials encrypted locally, can be reused for similar clients
4. **Large networks**: For /22 or larger, may need to increase timeout or split into smaller ranges
5. **VoIP issues**: Often show as unknown manufacturer - search by MAC to identify

## Security Notes

- The .exe is portable - can be deleted after use
- No installation or system changes
- All data stored locally and encrypted
- Safe to run on client machines
- No data sent to external servers

## Support

If tool doesn't work:
1. Check README.md for detailed troubleshooting
2. Ensure switches support SSH (or have SNMP enabled for read-only)
3. Verify credentials are correct
4. For Aruba/HP: confirm SSH port is 22 (standard)
5. For UniFi: confirm controller is accessible on port 8443
