# 📱 Phone Camera Streaming - Complete Setup Guide

## ✅ Implementation Complete

Phone camera streaming has been successfully integrated into your CrowdSafe AI project. You can now use your Android or iPhone camera as a live video source for the AI detection dashboard running on your laptop.

---

## 🎯 Architecture Overview

### How It Works

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Phone Camera  │  WebRTC │  Signaling Server │  WebRTC │  Laptop Dashboard│
│   (Browser)     │◄───────►│  (WebSocket)      │◄───────►│  (MediaPipe AI)  │
│                 │  Video  │                   │  Video  │                  │
│  - Camera access│  Stream │  - Pairing tokens │  Stream │  - Person detection│
│  - WebRTC peer  │         │  - ICE candidates │         │  - Tracking       │
│  - Video stream │         │  - Room management│         │  - Counting       │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        ▲                                                      │
        │                                                      │
        └──────────────────────────────────────────────────────┘
                    Direct peer-to-peer video stream
```

### Key Components

1. **Signaling Server** (`server/signaling-server.js`)
   - WebSocket server on port 3001
   - Manages pairing tokens (5-minute expiry)
   - Exchanges WebRTC offers/answers/ICE candidates
   - **No video data passes through this server**

2. **Phone Camera Page** (`public/phone-camera.html`)
   - HTTPS-enabled page for phone browser
   - Accesses phone camera via `getUserMedia()`
   - Creates WebRTC peer connection
   - Streams video to laptop

3. **Dashboard Integration** (`src/pages/AIDetection.tsx`)
   - "Phone Camera" button added
   - Pairing token display with copy button
   - WebRTC receiver
   - Integrates with existing MediaPipe detection

4. **HTTPS Setup**
   - Self-signed certificate for development
   - Required for mobile camera access
   - Instructions for trusting on phone

---

## 🚀 Setup Instructions

### Step 1: Install Dependencies

```bash
npm install
```

This will install the new `ws` (WebSocket) dependency.

### Step 2: Generate HTTPS Certificate

**On Windows (Git Bash or WSL):**
```bash
bash scripts/generate-cert.sh
```

**On Mac/Linux:**
```bash
chmod +x scripts/generate-cert.sh
./scripts/generate-cert.sh
```

The script will:
- ✅ Auto-detect your laptop's IP address
- ✅ Generate certificate with your IP included
- ✅ Create `certs/key.pem` (private key)
- ✅ Create `certs/cert.pem` (certificate)

**Note:** If auto-detection fails, the script will prompt you to enter your IP manually.

### Step 3: Trust Certificate on Phone (Required!)

**Regenerate certificate with your IP:**
```bash
# Edit the script to include your IP, or run:
openssl req -new -x509 -key certs/key.pem -out certs/cert.pem -days 365 \
  -subj "/C=US/ST=State/L=City/O=CrowdSafe AI/CN=localhost" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:YOUR_LAPTOP_IP"
```

Replace `YOUR_LAPTOP_IP` with your actual IP (e.g., 192.168.1.100).

### Step 4: Trust Certificate on Phone

**For iOS:**
1. AirDrop or email `certs/cert.pem` to your iPhone
2. Open the file and tap "Install"
3. Go to Settings > General > About > Certificate Trust Settings
4. Enable full trust for the certificate

**For Android:**
1. Transfer `certs/cert.pem` to your phone
2. Go to Settings > Security > Encryption & Credentials
3. Tap "Install a certificate" > "CA certificate"
4. Select the cert.pem file

### Step 5: Start Servers

**Terminal 1 - Signaling Server:**
```bash
npm run signaling
```
You should see:
```
🚀 Starting signaling server...
✅ Signaling server listening on ws://localhost:3001
📱 Ready for phone camera connections
```

**Terminal 2 - Dashboard:**
```bash
npm run dev
```
You should see:
```
VITE v6.x  ready in xxx ms
➜  Local:   https://localhost:3000/
➜  Network: https://YOUR_LAPTOP_IP:3000/
```

**Or start both at once:**
```bash
npm run dev:all
```

### Step 6: Connect Phone Camera

**On Laptop:**
1. Open `https://YOUR_LAPTOP_IP:3000` in your laptop browser
2. Login with `admin` / `admin123`
3. Navigate to "AI Detection" page
4. Click **"Phone Camera"** button (green with phone icon)
5. A pairing token will appear (valid for 5 minutes)
6. Copy the token

**On Phone:**
1. Open phone browser (Chrome/Safari)
2. Navigate to `https://YOUR_LAPTOP_IP:3000/phone-camera.html`
3. If prompted about certificate, accept/trust it
4. Paste the pairing token
5. Tap "Connect to Dashboard"
6. Allow camera access when prompted
7. Your phone camera stream will appear on the laptop dashboard!

**On Laptop (continued):**
8. You'll see "Phone camera streaming" status
9. AI detection starts automatically
10. Green bounding boxes appear around detected people
11. Tracking IDs, current count, and peak count update in real-time

---

## 🎮 Usage Guide

### Video Source Buttons

You now have **6 video source options**:

1. 🟠 **Load Demo** - AI-generated crowd scene image
2. 🔴 **YouTube Demo** - Embedded YouTube video (manual counting)
3. 🔵 **Use Webcam** - Laptop webcam with AI detection
4. 🟢 **Phone Camera** - Phone camera via WebRTC (NEW!)
5. 🟣 **Upload Video** - Upload MP4/WebM files
6. ⚪ **Start/Stop Detection** - Control AI detection

### Phone Camera Workflow

1. **Click "Phone Camera"** → Pairing token appears
2. **Copy token** → Click "Copy" button
3. **Open phone browser** → Navigate to phone camera page
4. **Paste token** → Tap "Connect"
5. **Allow camera** → Grant permission on phone
6. **Watch stream** → Video appears on laptop
7. **AI detection** → Automatic person detection starts
8. **Disconnect** → Click "Disconnect" when done

### Connection Status

- **Waiting** - Pairing token generated, waiting for phone
- **Connecting** - Phone connected, establishing video stream
- **Connected** - Video streaming, AI detection active
- **Disconnected** - Connection lost or manually disconnected

---

## 🔧 Troubleshooting

### Issue: "Failed to connect to signaling server"

**Cause:** Signaling server not running

**Solution:**
```bash
# Start signaling server
npm run signaling
```

Verify it's running on port 3001:
```bash
# Windows
netstat -ano | findstr :3001

# Mac/Linux
lsof -i :3001
```

### Issue: "Camera access denied" on phone

**Cause:** HTTPS certificate not trusted or permission denied

**Solution:**
1. Ensure you're using `https://` (not `http://`)
2. Trust the certificate on your phone (see Step 4)
3. Allow camera permission when prompted
4. Try a different browser (Chrome recommended)

### Issue: Phone can't connect to laptop

**Cause:** Network isolation or firewall

**Solution:**
1. Ensure phone and laptop are on **same Wi-Fi network**
2. Check firewall settings:
   - **Windows:** Allow Node.js through firewall
   - **Mac:** Allow incoming connections for Terminal/Node
   - **Linux:** Check iptables/ufw rules
3. Try accessing `https://YOUR_LAPTOP_IP:3000` from phone browser first
4. If it works, the issue is with WebSocket (port 3001)

### Issue: "Pairing token expired"

**Cause:** Token valid for only 5 minutes

**Solution:**
1. Click "Phone Camera" again to generate new token
2. Use the new token immediately
3. Tokens expire after 5 minutes for security

### Issue: Video stream not appearing

**Cause:** WebRTC connection failed

**Solution:**
1. Check browser console (F12) for errors
2. Ensure both devices support WebRTC (most modern browsers do)
3. Try refreshing both laptop and phone pages
4. Check if STUN servers are accessible:
   - Some networks block STUN/TURN
   - May need to configure TURN server (advanced)

### Issue: AI detection not working on phone stream

**Cause:** Video stream not properly initialized

**Solution:**
1. Wait for "Phone camera streaming" status
2. Click "Start Detection" if not auto-started
3. Check browser console for MediaPipe errors
4. Try switching to another source and back to phone

### Issue: Certificate warnings on phone

**Cause:** Self-signed certificate not trusted

**Solution:**
- **iOS:** Follow Step 4 instructions carefully
- **Android:** Install certificate as CA certificate
- **Alternative:** Use Chrome flags to ignore certificate errors (development only):
  ```
  chrome://flags/#allow-insecure-localhost
  ```

---

## 🔒 Security Notes

### What's Secure

✅ **Pairing tokens** - High-entropy UUIDs, 5-minute expiry  
✅ **WebSocket validation** - Room-based isolation  
✅ **HTTPS required** - Camera access requires secure context  
✅ **Peer-to-peer video** - Video doesn't pass through server  
✅ **No hardcoded secrets** - All tokens generated dynamically  

### What's Not Production-Ready

⚠️ **Self-signed certificate** - Must be manually trusted  
⚠️ **No authentication** - Signaling server open to LAN  
⚠️ **No TURN server** - May fail on restrictive networks  
⚠️ **Development only** - Not suitable for public internet  

### For Production Deployment

If you want to deploy this publicly:
1. Use Let's Encrypt for valid HTTPS certificate
2. Add authentication to signaling server
3. Set up TURN server for NAT traversal
4. Use proper secrets management
5. Add rate limiting and monitoring

---

## 📊 Testing Checklist

### Functional Tests

- [ ] Signaling server starts successfully
- [ ] Dashboard loads over HTTPS
- [ ] Phone camera page loads on phone
- [ ] Pairing token generated on laptop
- [ ] Phone can connect using token
- [ ] Camera permission prompt appears
- [ ] Video stream reaches laptop
- [ ] MediaPipe detects people from phone
- [ ] Tracking IDs work correctly
- [ ] Bounding boxes and dots display
- [ ] Current/peak counts update
- [ ] Can disconnect and reconnect
- [ ] Can switch to other video sources
- [ ] Resources cleaned up on disconnect

### Browser Compatibility

- [ ] Chrome on Android
- [ ] Safari on iOS
- [ ] Chrome on laptop
- [ ] Firefox on laptop
- [ ] Edge on laptop

### Network Scenarios

- [ ] Same Wi-Fi network (works)
- [ ] Different subnets (may fail)
- [ ] Corporate network (may need TURN)
- [ ] Mobile data (won't work - different network)

---

## 🎯 Known Limitations

1. **Network Requirements**
   - Phone and laptop must be on same Wi-Fi
   - Some networks block WebRTC (corporate, public Wi-Fi)
   - May need TURN server for NAT traversal

2. **Certificate Management**
   - Self-signed cert must be manually trusted
   - Certificate includes only common IPs
   - Must regenerate if laptop IP changes

3. **Browser Restrictions**
   - iOS Safari may pause camera in background
   - Some browsers limit camera resolution
   - WebRTC support varies by browser version

4. **Performance**
   - Video quality depends on network speed
   - High resolution may cause lag
   - Multiple connections not supported

5. **Mobile Specific**
   - Camera may stop if phone locks
   - Background tab may pause stream
   - Battery drain from continuous camera use

---

## 📁 Files Created/Modified

### New Files (4)

1. **`server/signaling-server.js`** (~200 lines)
   - WebSocket signaling server
   - Pairing token management
   - Room handling
   - Message validation

2. **`public/phone-camera.html`** (~300 lines)
   - Phone camera interface
   - WebRTC peer connection
   - Camera access
   - Connection status UI

3. **`scripts/generate-cert.sh`** (~30 lines)
   - OpenSSL certificate generation
   - Instructions for trusting cert

4. **`PHONE_CAMERA_SETUP.md`** (this file)
   - Complete setup instructions
   - Troubleshooting guide
   - Security notes

### Modified Files (3)

1. **`src/pages/AIDetection.tsx`** (~200 lines added)
   - Added phone camera button
   - Added pairing token UI
   - Added WebRTC receiver
   - Added connection status display
   - Integrated phone stream with detection

2. **`vite.config.js`** (~10 lines added)
   - Added HTTPS configuration
   - Auto-detects certificates

3. **`package.json`** (~5 lines added)
   - Added `ws` dependency
   - Added server scripts

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
npm install

# 2. Generate HTTPS certificate
bash scripts/generate-cert.sh

# 3. Start signaling server (Terminal 1)
npm run signaling

# 4. Start dashboard (Terminal 2)
npm run dev

# 5. Open on laptop
# https://YOUR_LAPTOP_IP:3000

# 6. Open on phone
# https://YOUR_LAPTOP_IP:3000/phone-camera.html
```

**Or start both servers at once:**
```bash
npm run dev:all
```

---

## 💡 Tips for Best Experience

1. **Use Chrome** on both laptop and phone for best WebRTC support
2. **Keep phone screen on** during streaming
3. **Use back camera** on phone (better quality)
4. **Good lighting** improves detection accuracy
5. **Stable Wi-Fi** reduces lag and disconnections
6. **Close other apps** on phone to save battery
7. **Use landscape mode** on phone for wider view

---

## 🎓 Technical Details

### WebRTC Flow

1. **Laptop creates room** → Generates pairing token
2. **Phone joins room** → Sends token to signaling server
3. **Phone creates offer** → Sends to signaling server
4. **Laptop receives offer** → Creates answer
5. **Laptop sends answer** → Via signaling server to phone
6. **ICE candidates exchanged** → Establishes direct connection
7. **Video streams peer-to-peer** → Direct phone → laptop

### Signaling Messages

```javascript
// Laptop → Server
{ type: 'create-room' }

// Server → Laptop
{ type: 'room-created', token: 'uuid', roomId: 'uuid' }

// Phone → Server
{ type: 'join-room', token: 'uuid' }

// Server → Phone
{ type: 'room-joined', roomId: 'uuid' }

// Phone → Server → Laptop
{ type: 'offer', data: RTCSessionDescription }

// Laptop → Server → Phone
{ type: 'answer', data: RTCSessionDescription }

// Both → Server → Other
{ type: 'ice-candidate', data: RTCIceCandidate }
```

### Security Features

- **UUID v4 tokens** - 122 bits of entropy
- **5-minute expiry** - Limits window of opportunity
- **Room isolation** - Can't intercept other rooms
- **Message validation** - Rejects malformed messages
- **HTTPS required** - Secure context for camera

---

## ✅ Success Criteria

All of these should work:

- ✅ Phone camera streams to laptop
- ✅ MediaPipe detects people from phone stream
- ✅ Existing tracking and counting works
- ✅ All other video sources still work
- ✅ Secure pairing mechanism
- ✅ Proper cleanup on disconnect
- ✅ Clear setup instructions
- ✅ Troubleshooting guide provided

---

## 🎉 You're Ready!

Your CrowdSafe AI project now supports phone camera streaming!

**Quick test:**
```bash
# Start servers
npm run dev:all

# Open laptop
https://YOUR_LAPTOP_IP:3000

# Click "Phone Camera"
# Copy token
# Open on phone
https://YOUR_LAPTOP_IP:3000/phone-camera.html

# Paste token and connect!
```

**The phone camera stream will appear on your laptop dashboard with full AI detection!** 📱✨

---

## 📞 Support

If you encounter issues:

1. Check browser console (F12) for errors
2. Verify both devices are on same Wi-Fi
3. Ensure signaling server is running
4. Check firewall settings
5. Verify certificate is trusted on phone
6. Try different browsers
7. Review troubleshooting section above

**Good luck with your phone camera streaming!** 🚀
