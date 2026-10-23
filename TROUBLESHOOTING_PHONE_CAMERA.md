# 🔧 Phone Camera Connection Troubleshooting

## Issue: "Failed to connect to signaling server"

This error occurs when the dashboard can't connect to the WebSocket signaling server on port 3001.

---

## ✅ Solution: Start the Signaling Server

The signaling server must be running **in a separate terminal** alongside your main dev server.

### Step-by-Step Fix

#### 1. Open a NEW Terminal Window
You need TWO terminals running:
- **Terminal 1**: Main dev server (dashboard)
- **Terminal 2**: Signaling server (WebSocket)

#### 2. In Terminal 2, Start the Signaling Server
```bash
npm run signaling
```

You should see:
```
🚀 Starting signaling server...
✅ Signaling server listening on wss://localhost:3001 (HTTPS)
📱 Ready for phone camera connections
🔒 Secure WebSocket (WSS) enabled
```

**OR** if no HTTPS certificates are found:
```
🚀 Starting signaling server...
⚠️  No HTTPS certificates found. Using plain WebSocket (ws://)
⚠️  Phone camera may not work without HTTPS. Run: npm run generate-cert
✅ Signaling server listening on ws://localhost:3001 (HTTP)
📱 Ready for phone camera connections
```

#### 3. Keep Both Terminals Running
- **Terminal 1**: `npm run dev` (dashboard on port 3000)
- **Terminal 2**: `npm run signaling` (WebSocket on port 3001)

#### 4. Now Try Phone Camera Again
1. Go to `https://YOUR_LAPTOP_IP:3000`
2. Click "AI Detection"
3. Click "Phone Camera" button
4. It should connect successfully now!

---

## 🚀 Alternative: Run Both Servers at Once

Instead of two terminals, you can run both with one command:

```bash
npm run dev:all
```

This starts both the dashboard and signaling server automatically.

**Note**: On Windows, you might need to run them separately if `npm run dev:all` doesn't work properly.

---

## 🔍 Verify the Signaling Server is Running

### Check if Port 3001 is Listening

**Windows:**
```bash
netstat -ano | findstr :3001
```

**Mac/Linux:**
```bash
lsof -i :3001
# or
netstat -an | grep 3001
```

You should see output showing port 3001 is listening.

### Test WebSocket Connection

Open browser console (F12) and try:
```javascript
const ws = new WebSocket('wss://localhost:3001');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Failed:', e);
```

If it connects, the server is running correctly.

---

## 🔒 HTTPS Certificate Issues

If you see warnings about missing certificates:

### Generate Certificates
```bash
# Windows (Git Bash or WSL)
bash scripts/generate-cert.sh

# Mac/Linux
chmod +x scripts/generate-cert.sh
./scripts/generate-cert.sh
```

### Update Certificate with Your IP
```bash
# Find your laptop IP
# Windows: ipconfig
# Mac/Linux: ifconfig or ip addr

# Regenerate with your IP (replace YOUR_LAPTOP_IP)
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
  -subj "/C=US/ST=State/L=City/O=CrowdSafe AI/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:YOUR_LAPTOP_IP"
```

### Restart Servers
After generating certificates, restart both servers:
```bash
# Stop servers (Ctrl+C in both terminals)
# Then restart
npm run signaling  # Terminal 1
npm run dev        # Terminal 2
```

---

## 🌐 Connection Fallback Logic

The system now automatically tries both connection methods:

1. **First**: Tries `wss://` (Secure WebSocket over HTTPS)
2. **Fallback**: If WSS fails, tries `ws://` (Plain WebSocket over HTTP)

This means:
- ✅ If you have HTTPS certificates → Uses secure WSS
- ✅ If no certificates → Falls back to plain WS
- ✅ Better compatibility across different setups

---

## 🐛 Common Issues & Solutions

### Issue 1: "Port 3001 already in use"
**Solution**: Another process is using port 3001
```bash
# Find and kill the process
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Issue 2: "Connection timeout"
**Solution**: Firewall is blocking port 3001
- **Windows**: Allow Node.js through Windows Firewall
- **Mac**: Allow incoming connections in System Preferences
- **Linux**: Check iptables/ufw rules

### Issue 3: "WebSocket connection failed"
**Solution**: Server not running or wrong URL
1. Make sure `npm run signaling` is running
2. Check console for exact error message
3. Verify both servers are on the same network

### Issue 4: Phone can't connect
**Solution**: Network isolation or certificate issues
1. Ensure phone and laptop are on **same Wi-Fi**
2. Trust the HTTPS certificate on your phone
3. Try accessing `https://YOUR_LAPTOP_IP:3000` from phone first
4. Check phone browser console for errors

---

## 📋 Complete Setup Checklist

Before using Phone Camera, ensure:

- [ ] HTTPS certificates generated (`bash scripts/generate-cert.sh`)
- [ ] Certificate includes your laptop's IP address
- [ ] Certificate trusted on phone (iOS/Android)
- [ ] Signaling server running (`npm run signaling`)
- [ ] Dashboard server running (`npm run dev`)
- [ ] Both servers accessible on your network
- [ ] Phone and laptop on same Wi-Fi network
- [ ] Firewall allows ports 3000 and 3001

---

## 🎯 Quick Test

After starting both servers, test the connection:

1. Open `https://YOUR_LAPTOP_IP:3000` in laptop browser
2. Open browser console (F12)
3. Click "Phone Camera" button
4. You should see in console:
   ```
   📱 Attempting to connect to signaling server...
      Primary: wss://YOUR_LAPTOP_IP:3001
      Fallback: ws://YOUR_LAPTOP_IP:3001
   ✅ Connected to signaling server via WSS
   ```

If you see this, everything is working! 🎉

---

## 💡 Pro Tips

1. **Use `npm run dev:all`** to start both servers with one command
2. **Keep both terminals visible** to monitor both servers
3. **Check console logs** in both browser and terminals for debugging
4. **Test on localhost first** before trying from phone
5. **Use Chrome** for best WebSocket compatibility

---

## 📞 Still Having Issues?

If you've tried everything and still can't connect:

1. **Check browser console** (F12) for detailed error messages
2. **Check terminal output** for server errors
3. **Verify network connectivity** - can you ping laptop from phone?
4. **Try different browser** - Chrome recommended
5. **Restart everything** - servers, browser, phone
6. **Check firewall** - is port 3001 blocked?

The most common issue is **forgetting to start the signaling server**. Always make sure `npm run signaling` is running in a separate terminal!

---

## ✅ Success Indicators

When everything is working correctly:

**Terminal 1 (Signaling Server):**
```
🚀 Starting signaling server...
✅ Signaling server listening on wss://localhost:3001 (HTTPS)
📱 Ready for phone camera connections
🔒 Secure WebSocket (WSS) enabled
```

**Terminal 2 (Dashboard):**
```
VITE v6.x  ready in xxx ms
➜  Local:   https://localhost:3000/
➜  Network: https://YOUR_LAPTOP_IP:3000/
```

**Browser Console (after clicking Phone Camera):**
```
📱 Attempting to connect to signaling server...
   Primary: wss://YOUR_LAPTOP_IP:3001
   Fallback: ws://YOUR_LAPTOP_IP:3001
✅ Connected to signaling server via WSS
🎫 Pairing token: abc123-def456-...
```

If you see all of these, you're ready to connect your phone! 📱✨
