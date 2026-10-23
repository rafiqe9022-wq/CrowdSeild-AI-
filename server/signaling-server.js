/**
 * WebSocket Signaling Server for Phone Camera Streaming
 * 
 * This server handles WebRTC signaling (offers, answers, ICE candidates)
 * and manages secure pairing between phone and laptop.
 * 
 * IMPORTANT: Video data does NOT pass through this server.
 * It only exchanges connection metadata for peer-to-peer WebRTC.
 */

import WebSocket from 'ws';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PORT = process.env.SIGNALING_PORT || 3001;
const TOKEN_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Storage for active pairing tokens and rooms
const pairingTokens = new Map(); // token -> { createdAt, laptopWs, phoneWs, roomId }
const rooms = new Map(); // roomId -> { laptopWs, phoneWs }

console.log('🚀 Starting signaling server...');

// Check for HTTPS certificates
const certPath = path.resolve(__dirname, '../certs/cert.pem');
const keyPath = path.resolve(__dirname, '../certs/key.pem');
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

let wss;

if (hasCerts) {
  // Create HTTPS server with WSS support
  const httpsServer = https.createServer({
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  });
  
  wss = new WebSocket.Server({ server: httpsServer });
  
  httpsServer.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Signaling server listening on wss://localhost:${PORT} (HTTPS)`);
    console.log('📱 Ready for phone camera connections');
    console.log('🔒 Secure WebSocket (WSS) enabled');
  });
} else {
  // Fallback to plain WebSocket (for development without HTTPS)
  console.warn('⚠️  No HTTPS certificates found. Using plain WebSocket (ws://)');
  console.warn('⚠️  Phone camera may not work without HTTPS. Run: npm run generate-cert');
  
  wss = new WebSocket.Server({ 
    port: PORT,
    host: '0.0.0.0'
  });
  
  console.log(`✅ Signaling server listening on ws://localhost:${PORT} (HTTP)`);
  console.log('📱 Ready for phone camera connections');
}

wss.on('listening', () => {
  console.log(`✅ Signaling server listening on ws://localhost:${PORT}`);
  console.log('📱 Ready for phone camera connections');
});

wss.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Handle new connections
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  console.log(`🔌 New connection: ${clientId}`);
  
  let clientRole = null; // 'laptop' or 'phone'
  let currentRoom = null;

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId: clientId,
    message: 'Connected to signaling server'
  }));

  // Handle messages from client
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log(`📨 Received from ${clientId}:`, message.type);

      switch (message.type) {
        case 'create-room':
          handleCreateRoom(ws, clientId, message);
          break;
        
        case 'join-room':
          handleJoinRoom(ws, clientId, message);
          break;
        
        case 'offer':
        case 'answer':
        case 'ice-candidate':
          handleSignaling(ws, clientId, message);
          break;
        
        case 'disconnect':
          handleDisconnect(ws, clientId);
          break;
        
        default:
          console.warn(`⚠️ Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });

  // Handle connection close
  ws.on('close', () => {
    console.log(`🔌 Connection closed: ${clientId}`);
    handleDisconnect(ws, clientId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
  });
});

/**
 * Handle room creation by laptop
 */
function handleCreateRoom(ws, clientId, message) {
  const token = uuidv4();
  const roomId = uuidv4();
  
  // Store token with expiry
  pairingTokens.set(token, {
    createdAt: Date.now(),
    laptopWs: ws,
    laptopId: clientId,
    roomId: roomId,
    phoneWs: null,
    phoneId: null
  });
  
  // Store room
  rooms.set(roomId, {
    laptopWs: ws,
    laptopId: clientId,
    phoneWs: null,
    phoneId: null
  });
  
  // Send token to laptop
  ws.send(JSON.stringify({
    type: 'room-created',
    token: token,
    roomId: roomId,
    expiresIn: TOKEN_EXPIRY_MS
  }));
  
  console.log(`🏠 Room created: ${roomId} with token: ${token.substring(0, 8)}...`);
  
  // Set token expiry
  setTimeout(() => {
    if (pairingTokens.has(token)) {
      const tokenData = pairingTokens.get(token);
      if (!tokenData.phoneWs) {
        pairingTokens.delete(token);
        rooms.delete(roomId);
        console.log(`⏰ Token expired: ${token.substring(0, 8)}...`);
        
        // Notify laptop
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'token-expired',
            token: token
          }));
        }
      }
    }
  }, TOKEN_EXPIRY_MS);
}

/**
 * Handle room join by phone
 */
function handleJoinRoom(ws, clientId, message) {
  const { token } = message;
  
  if (!token) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Missing pairing token'
    }));
    return;
  }
  
  const tokenData = pairingTokens.get(token);
  
  if (!tokenData) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Invalid or expired pairing token'
    }));
    return;
  }
  
  if (tokenData.phoneWs) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room already has a phone connected'
    }));
    return;
  }
  
  // Update token data
  tokenData.phoneWs = ws;
  tokenData.phoneId = clientId;
  
  // Update room
  const room = rooms.get(tokenData.roomId);
  if (room) {
    room.phoneWs = ws;
    room.phoneId = clientId;
  }
  
  // Notify phone
  ws.send(JSON.stringify({
    type: 'room-joined',
    roomId: tokenData.roomId,
    message: 'Successfully joined room'
  }));
  
  // Notify laptop
  if (tokenData.laptopWs.readyState === WebSocket.OPEN) {
    tokenData.laptopWs.send(JSON.stringify({
      type: 'phone-connected',
      roomId: tokenData.roomId,
      phoneId: clientId
    }));
  }
  
  console.log(`📱 Phone joined room: ${tokenData.roomId}`);
}

/**
 * Handle WebRTC signaling messages
 */
function handleSignaling(ws, clientId, message) {
  const { type, roomId, data } = message;
  
  if (!roomId || !data) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Missing roomId or data'
    }));
    return;
  }
  
  const room = rooms.get(roomId);
  if (!room) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Room not found'
    }));
    return;
  }
  
  // Determine recipient
  let targetWs = null;
  if (ws === room.laptopWs) {
    targetWs = room.phoneWs;
  } else if (ws === room.phoneWs) {
    targetWs = room.laptopWs;
  } else {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Not a member of this room'
    }));
    return;
  }
  
  if (!targetWs || targetWs.readyState !== WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Recipient not connected'
    }));
    return;
  }
  
  // Forward signaling message
  targetWs.send(JSON.stringify({
    type: type,
    roomId: roomId,
    data: data,
    from: clientId
  }));
  
  console.log(`🔄 Forwarded ${type} in room ${roomId}`);
}

/**
 * Handle client disconnect
 */
function handleDisconnect(ws, clientId) {
  // Find and clean up rooms
  for (const [roomId, room] of rooms.entries()) {
    if (room.laptopWs === ws || room.phoneWs === ws) {
      console.log(`🧹 Cleaning up room: ${roomId}`);
      
      // Notify other party
      const otherWs = room.laptopWs === ws ? room.phoneWs : room.laptopWs;
      if (otherWs && otherWs.readyState === WebSocket.OPEN) {
        otherWs.send(JSON.stringify({
          type: 'peer-disconnected',
          roomId: roomId
        }));
      }
      
      // Clean up room
      rooms.delete(roomId);
      
      // Clean up token
      for (const [token, tokenData] of pairingTokens.entries()) {
        if (tokenData.roomId === roomId) {
          pairingTokens.delete(token);
          break;
        }
      }
      
      break;
    }
  }
}

// Cleanup expired tokens periodically
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of pairingTokens.entries()) {
    if (now - data.createdAt > TOKEN_EXPIRY_MS && !data.phoneWs) {
      pairingTokens.delete(token);
      rooms.delete(data.roomId);
      console.log(`🧹 Cleaned up expired token: ${token.substring(0, 8)}...`);
    }
  }
}, 60 * 1000); // Check every minute

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down signaling server...');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

console.log('📋 Signaling server ready');
console.log(`🔐 Pairing tokens expire after ${TOKEN_EXPIRY_MS / 1000 / 60} minutes`);
