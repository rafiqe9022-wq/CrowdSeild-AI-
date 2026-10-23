# 🚨 Quick Fix: Phone Camera Connection Error

## The Problem
You clicked "Phone Camera" and got:
> "Failed to connect to signaling server. Make sure it's running on port 3001."

## The Solution
**You need to start the signaling server in a separate terminal!**

---

## ⚡ Quick Fix (30 seconds)

### Open a NEW Terminal and Run:
```bash
npm run signaling
```

You should see:
```
🚀 Starting signaling server...
✅ Signaling server listening on wss://localhost:3001
📱 Ready for phone camera connections
```

### Then Try Again:
1. Go back to your dashboard
2. Click "Phone Camera"
3. It should work now! ✅

---

## 🔄 Alternative: Run Both Servers Together

Instead of two terminals, use:
```bash
npm run dev:all
```

This starts both the dashboard AND signaling server automatically.

---

## 📋 What's Happening

Your CrowdSafe AI needs **TWO servers running**:

| Server | Port | Purpose | Command |
|--------|------|---------|---------|
| Dashboard | 3000 | Web interface | `npm run dev` |
| Signaling | 3001 | WebSocket for phone connection | `npm run signaling` |

**Both must be running** for Phone Camera to work!

---

## ✅ Verify It's Working

After starting the signaling server, you should see in your terminal:

```
🚀 Starting signaling server...
✅ Signaling server listening on wss://localhost:3001 (HTTPS)
📱 Ready for phone camera connections
🔒 Secure WebSocket (WSS) enabled
```

Then in your browser console (F12), when you click "Phone Camera":

```
📱 Attempting to connect to signaling server...
✅ Connected to signaling server via WSS
🎫 Pairing token: abc123-def456-...
```

---

## 🐛 Still Not Working?

### Check 1: Is the server running?
```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001
```

You should see port 3001 listening.

### Check 2: Firewall blocking?
- **Windows**: Allow Node.js through firewall
- **Mac**: Allow incoming connections
- **Linux**: Check iptables/ufw

### Check 3: HTTPS certificates?
```bash
# Generate if missing
bash scripts/generate-cert.sh
```

### Check 4: Both servers on same network?
- Dashboard and signaling server must be on the same machine
- Phone must be on the same Wi-Fi network

---

## 📖 Full Documentation

For complete setup instructions, see:
- `PHONE_CAMERA_SETUP.md` - Full guide
- `TROUBLESHOOTING_PHONE_CAMERA.md` - Detailed troubleshooting

---

## 🎯 Summary

**The Fix:**
```bash
# In a NEW terminal window:
npm run signaling
```

**Then:**
1. Keep both terminals running
2. Click "Phone Camera" in dashboard
3. Copy the pairing token
4. Open phone camera page on your phone
5. Paste token and connect!

**That's it!** 🎉

---

## 💡 Pro Tip

Create a shortcut script to start both servers:

**Windows (start.bat):**
```batch
@echo off
start cmd /k "npm run signaling"
start cmd /k "npm run dev"
```

**Mac/Linux (start.sh):**
```bash
#!/bin/bash
gnome-terminal -- npm run signaling
gnome-terminal -- npm run dev
```

Then just run `start.bat` or `./start.sh` to launch both servers!
