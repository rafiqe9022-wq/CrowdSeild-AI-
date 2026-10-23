# Phone Camera Streaming Implementation Plan

## Project Audit Summary

### Current Architecture Confirmed ✅

After inspecting the codebase, I confirm the following:

1. **Frontend Stack**: React 18 + TypeScript + Vite + Tailwind CSS
2. **AI Detection**: MediaPipe Tasks Vision (EfficientDet Lite0 model)
3. **Person Tracking**: IoU-based tracking with motion prediction (`src/utils/personTracker.ts`)
4. **Current Video Sources**: 
   - Demo image (Unsplash URL)
   - YouTube video (manual counting)
   - Laptop webcam (getUserMedia)
   - Uploaded video files
5. **Detection Pipeline**: 
   - `videoRef` → `canvasRef` → MediaPipe detection → PersonTracker → UI overlay
   - Uses `requestAnimationFrame` for frame processing
   - Proper cleanup on unmount
6. **Dev Server**: Already configured with `host: "0.0.0.0"` on port 3000 (accessible from LAN)

### Key Integration Points

- **Video Element**: `videoRef.current` accepts `MediaStream` via `srcObject`
- **Detection Loop**: `detectFrame()` processes frames from `videoRef.current`
- **State Management**: `videoSource` state controls which input is active
- **Cleanup**: Proper track stopping and connection closing needed

---

## Implementation Architecture

### 1. Signaling Server (Node.js + WebSocket)

**Location**: `server/signaling-server.js`

**Purpose**: 
- Exchange WebRTC offers/answers/ICE candidates
- Manage pairing tokens and room membership
- Validate connections

**Technology**:
- `ws` library for WebSocket
- `uuid` for pairing tokens (already in dependencies)
- No video data passes through this server

**Security**:
- High-entropy pairing tokens (UUID v4)
- Token expiration (5 minutes)
- Room-based isolation
- Message validation

### 2. Phone Camera Page (Static HTML + JavaScript)

**Location**: `public/phone-camera.html`

**Purpose**:
- Access phone camera via `getUserMedia()`
- Create WebRTC peer connection
- Send video stream to laptop

**Requirements**:
- Must be served over HTTPS (for camera access)
- Mobile-responsive UI
- Camera permission handling
- Connection status display

### 3. Laptop Dashboard Integration

**Location**: `src/pages/AIDetection.tsx` (modify existing)

**Purpose**:
- Add "Phone Camera" as new video source
- Display pairing QR code/token
- Receive WebRTC stream
- Integrate with existing detection pipeline

**Changes**:
- Add `phone` to `videoSource` type
- Add phone camera button and UI
- Add WebRTC receiver logic
- Add pairing token generation
- Integrate received stream with `videoRef`

### 4. HTTPS Setup

**Location**: Project root

**Purpose**:
- Enable camera access on phone (requires secure context)
- Use self-signed certificate for development

**Approach**:
- Generate self-signed cert with OpenSSL
- Configure Vite to use HTTPS
- Provide instructions for trusting cert on phone

---

## File Changes Required

### New Files

1. **`server/signaling-server.js`**
   - WebSocket signaling server
   - Pairing token management
   - Room handling
   - ~150 lines

2. **`public/phone-camera.html`**
   - Phone camera interface
   - WebRTC peer connection
   - Camera access
   - ~300 lines

3. **`scripts/generate-cert.sh`**
   - OpenSSL certificate generation
   - ~20 lines

4. **`PHONE_CAMERA_SETUP.md`**
   - Complete setup instructions
   - Troubleshooting guide
   - ~200 lines

### Modified Files

1. **`src/pages/AIDetection.tsx`**
   - Add phone camera button
   - Add WebRTC receiver
   - Add pairing UI
   - Integrate phone stream
   - ~100 lines added

2. **`vite.config.js`**
   - Add HTTPS configuration
   - ~10 lines added

3. **`package.json`**
   - Add `ws` dependency
   - Add server scripts
   - ~5 lines added

---

## Implementation Steps

### Phase 1: Signaling Server (30 min)

1. Create `server/signaling-server.js`
2. Implement WebSocket server
3. Add pairing token generation
4. Add room management
5. Add message validation
6. Test server startup

### Phase 2: HTTPS Setup (15 min)

1. Create certificate generation script
2. Generate self-signed certificate
3. Update `vite.config.js` for HTTPS
4. Test HTTPS access

### Phase 3: Phone Camera Page (45 min)

1. Create `public/phone-camera.html`
2. Implement camera access
3. Implement WebRTC peer connection
4. Add pairing token input
5. Add connection status UI
6. Test on phone

### Phase 4: Dashboard Integration (45 min)

1. Add phone camera button to UI
2. Add pairing token display
3. Implement WebRTC receiver
4. Integrate stream with videoRef
5. Add connection status
6. Test end-to-end

### Phase 5: Testing & Documentation (30 min)

1. Test all video sources
2. Test switching between sources
3. Test disconnect handling
4. Write setup instructions
5. Write troubleshooting guide

**Total Estimated Time**: ~2.5 hours

---

## Security Considerations

### 1. Pairing Tokens
- Use UUID v4 (high entropy)
- Expire after 5 minutes
- Single-use per session
- Validate on server

### 2. Network Security
- Signaling server only on localhost or LAN
- Never expose to public internet
- Use firewall rules if needed

### 3. HTTPS
- Required for camera access on mobile
- Self-signed cert for development
- Clear instructions for trusting cert

### 4. WebRTC
- Peer-to-peer video (not through server)
- STUN/TURN configuration
- ICE candidate validation

### 5. Cleanup
- Stop all media tracks on disconnect
- Close peer connections
- Close WebSocket connections
- Clear pairing tokens

---

## Testing Checklist

### Functional Tests

- [ ] Signaling server starts successfully
- [ ] Phone camera page loads over HTTPS
- [ ] Camera permission prompt appears on phone
- [ ] Pairing token generated on laptop
- [ ] Phone can connect using pairing token
- [ ] Video stream reaches laptop
- [ ] MediaPipe detects people from phone stream
- [ ] Tracking IDs work correctly
- [ ] Bounding boxes and dots display
- [ ] Current/peak counts update

### Integration Tests

- [ ] Can switch from phone to webcam
- [ ] Can switch from phone to uploaded video
- [ ] Can switch from phone to demo image
- [ ] No duplicate detection loops
- [ ] Phone disconnect cleans up resources
- [ ] Laptop disconnect cleans up resources

### Edge Cases

- [ ] Camera permission denied
- [ ] Invalid pairing token
- [ ] Expired pairing token
- [ ] Network disconnection
- [ ] Phone browser doesn't support WebRTC
- [ ] Multiple phones try to connect
- [ ] Laptop browser doesn't support WebRTC

### Browser Compatibility

- [ ] Chrome on Android
- [ ] Safari on iOS
- [ ] Chrome on laptop
- [ ] Firefox on laptop
- [ ] Edge on laptop

---

## Dependencies to Add

```json
{
  "dependencies": {
    "ws": "^8.16.0"
  }
}
```

**Note**: `uuid` is already in dependencies.

---

## Commands to Add

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "typecheck": "tsc --noEmit",
    "signaling": "node server/signaling-server.js",
    "dev:all": "npm run signaling & npm run dev",
    "generate-cert": "bash scripts/generate-cert.sh"
  }
}
```

---

## Known Limitations

1. **Self-Signed Certificate**: Phone must manually trust the certificate
2. **Network Requirements**: Phone and laptop must be on same Wi-Fi
3. **Firewall**: May need to open ports 3000 (HTTPS) and 3001 (WebSocket)
4. **WebRTC**: Some networks may require TURN server (not implemented)
5. **iOS Safari**: May have additional restrictions on camera access
6. **Background Tab**: Phone browser may stop camera if tab is backgrounded

---

## Future Enhancements (Not in Scope)

1. TURN server for networks without direct P2P
2. Multiple phone support
3. Phone camera controls (zoom, flash)
4. Recording phone stream
5. Audio streaming
6. Production HTTPS certificate (Let's Encrypt)
7. Authentication for signaling server

---

## Success Criteria

✅ Phone camera streams to laptop  
✅ MediaPipe detects people from phone stream  
✅ Existing tracking and counting works  
✅ All other video sources still work  
✅ Secure pairing mechanism  
✅ Proper cleanup on disconnect  
✅ Clear setup instructions  
✅ Troubleshooting guide provided  

---

## Next Steps

1. Review and approve this plan
2. Install new dependencies (`ws`)
3. Implement signaling server
4. Set up HTTPS
5. Create phone camera page
6. Integrate with dashboard
7. Test thoroughly
8. Document setup process

**Ready to proceed?** Let me know if you approve this plan or if you need any modifications before I start implementation.
