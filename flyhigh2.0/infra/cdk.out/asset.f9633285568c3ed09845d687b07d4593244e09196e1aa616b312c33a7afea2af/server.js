import express, { json } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import crypto from 'crypto';
import cors from 'cors';

const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173", "http://localhost:8081", "http://localhost:5174", "http://localhost:5175"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  connectTimeout: 45000
});

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(json());

// Track connected users
// { socketId -> { email, role, userId, expertId } }
const connectedUsers = new Map();

// Track user sockets by email: { email -> [socketIds] }
const userSocketsByEmail = new Map();

// Track user sockets by userId: { userId -> [socketIds] }
const userSocketsByUserId = new Map();

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // ── User registration ──
  socket.on('register-user', (data) => {
    const { email, role, userId, expertId } = data;
    if (!email) return;

    // Store user info on socket
    socket.data = { email, role, userId, expertId };

    // Track by socket id
    connectedUsers.set(socket.id, { email, role, userId, expertId });

    // Track by email
    if (!userSocketsByEmail.has(email)) {
      userSocketsByEmail.set(email, []);
    }
    const byEmail = userSocketsByEmail.get(email);
    if (!byEmail.includes(socket.id)) {
      byEmail.push(socket.id);
    }

    // Also track by userId if available (for looking up by MongoDB ID)
    if (userId) {
      if (!userSocketsByUserId.has(userId)) {
        userSocketsByUserId.set(userId, []);
      }
      const byUserId = userSocketsByUserId.get(userId);
      if (!byUserId.includes(socket.id)) {
        byUserId.push(socket.id);
      }
    }

    console.log(`User registered: ${email} (${role}) socket=${socket.id}`);
  });

  // ── Call request notification ──
  socket.on('call-request', (data) => {
    const { expertEmail, callRequestId, clientName, expertId, clientId } = data;
    console.log(`Call request from ${clientName} to expert email=${expertEmail} expertId=${expertId}`);

    // Try to send by email first
    const socketsByEmail = userSocketsByEmail.get(expertEmail) || [];
    // Also try by userId (expertId from the call request)
    const socketsByExpertId = expertId ? (userSocketsByUserId.get(expertId) || []) : [];

    // Combine all unique socket IDs
    const allSockets = new Set([...socketsByEmail, ...socketsByExpertId]);

    if (allSockets.size === 0) {
      console.log(`No connected sockets found for expert ${expertEmail} (id: ${expertId})`);
    }

    allSockets.forEach(sid => {
      console.log(`Sending incoming-call to socket ${sid}`);
      io.to(sid).emit('incoming-call', {
        callRequestId,
        clientName,
        clientId,
        expertId
      });
    });
  });

  // ── Call response (accept/reject) ──
  socket.on('call-response', (data) => {
    const { clientEmail, callRequestId, action, roomId, rejectReason } = data;
    console.log(`Call response: ${action} for call ${callRequestId} to client ${clientEmail}`);

    const clientSockets = userSocketsByEmail.get(clientEmail) || [];
    clientSockets.forEach(sid => {
      io.to(sid).emit('call-status-update', {
        callRequestId,
        action,
        roomId,
        rejectReason
      });
    });
  });

  // ── Call ended notification ──
  socket.on('notify-call-ended', (data) => {
    const { clientEmail, expertEmail } = data;
    
    if (clientEmail) {
      const clientSockets = userSocketsByEmail.get(clientEmail) || [];
      clientSockets.forEach(sid => io.to(sid).emit('call-ended-by-other'));
    }
    if (expertEmail) {
      const expertSockets = userSocketsByEmail.get(expertEmail) || [];
      expertSockets.forEach(sid => io.to(sid).emit('call-ended-by-other'));
    }
  });

  // Room joining
  socket.on('join-room', (data) => {
    const { roomId, userEmail, role } = data;
    if (!roomId || !userEmail || !role) {
      return socket.emit('error', 'Missing required fields');
    }

    // Leave previous room if any
    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
    }

    socket.join(roomId);
    socket.data = { ...socket.data, roomId, userEmail, role };
    console.log(`${userEmail} (${role}) joined room ${roomId}`);
  });

  // Signaling handlers
  socket.on('offer', ({ offer, roomName }) => {
    socket.to(roomName).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomName }) => {
    socket.to(roomName).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, roomName }) => {
    socket.to(roomName).emit('ice-candidate', candidate);
  });

  socket.on('end-call', ({ roomName }) => {
    socket.to(roomName).emit('call-ended');
  });

  socket.on('send-chat-message', ({ roomName, message }) => {
    socket.to(roomName).emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    const { roomId, email, userId } = socket.data || {};
    
    // Remove from connected users
    connectedUsers.delete(socket.id);
    
    // Remove from email map
    if (email) {
      const byEmail = userSocketsByEmail.get(email) || [];
      const filtered = byEmail.filter(sid => sid !== socket.id);
      if (filtered.length === 0) {
        userSocketsByEmail.delete(email);
      } else {
        userSocketsByEmail.set(email, filtered);
      }
    }

    // Remove from userId map
    if (userId) {
      const byUserId = userSocketsByUserId.get(userId) || [];
      const filtered = byUserId.filter(sid => sid !== socket.id);
      if (filtered.length === 0) {
        userSocketsByUserId.delete(userId);
      } else {
        userSocketsByUserId.set(userId, filtered);
      }
    }

    if (roomId) {
      console.log(`User disconnected from ${roomId}: ${email || socket.id}`);
      socket.to(roomId).emit('user-disconnected', { email });
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Raw WebSocket handler — for frontend WebSocket clients
// (runs alongside Socket.IO on the same port; Socket.IO handles
//  /socket.io/ upgrades, this handles everything else)
// ═══════════════════════════════════════════════════════════════

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const rawWsClients = new Map(); // socket → { email, role, userId, expertId, roomId }

function acceptWebSocket(req, socket, head) {
  const key = req.headers['sec-websocket-key'];
  if (!key) {
    socket.destroy();
    return;
  }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
  );
}

function decodeWebSocketFrame(buffer) {
  if (buffer.length < 2) return null;
  const firstByte = buffer[0];
  const opcode = firstByte & 0x0f;
  const secondByte = buffer[1];
  const masked = (secondByte & 0x80) !== 0;
  let payloadLength = secondByte & 0x7f;
  let offset = 2;

  if (payloadLength === 126) {
    if (buffer.length < 4) return null;
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    if (buffer.length < 10) return null;
    payloadLength = Number(buffer.readBigUInt64BE(2));
    offset = 10;
  }

  if (buffer.length < offset + (masked ? 4 : 0) + payloadLength) return null;

  let payload;
  if (masked) {
    const mask = buffer.slice(offset, offset + 4);
    offset += 4;
    payload = Buffer.alloc(payloadLength);
    for (let i = 0; i < payloadLength; i++) {
      payload[i] = buffer[offset + i] ^ mask[i % 4];
    }
  } else {
    payload = buffer.slice(offset, offset + payloadLength);
  }

  return { opcode, payload: payload.toString('utf8') };
}

function encodeWebSocketFrame(data) {
  const json = JSON.stringify(data);
  const payload = Buffer.from(json, 'utf8');
  const length = payload.length;
  let frame;

  if (length < 126) {
    frame = Buffer.alloc(2 + length);
    frame[0] = 0x81; // FIN + text opcode
    frame[1] = length;
    payload.copy(frame, 2);
  } else if (length < 65536) {
    frame = Buffer.alloc(4 + length);
    frame[0] = 0x81;
    frame[1] = 126;
    frame.writeUInt16BE(length, 2);
    payload.copy(frame, 4);
  } else {
    frame = Buffer.alloc(10 + length);
    frame[0] = 0x81;
    frame[1] = 127;
    frame.writeBigUInt64BE(BigInt(length), 2);
    payload.copy(frame, 10);
  }
  return frame;
}

function sendRawWs(socket, data) {
  try {
    if (!socket.destroyed) {
      socket.write(encodeWebSocketFrame(data));
    }
  } catch (e) {
    // socket may be closed
  }
}

function broadcastToRoomRaw(roomId, data, excludeSocket) {
  for (const [ws, client] of rawWsClients) {
    if (ws !== excludeSocket && client.roomId === roomId && !ws.destroyed) {
      sendRawWs(ws, data);
    }
  }
}

function rawWsDisconnect(ws) {
  const client = rawWsClients.get(ws);
  if (!client) return;

  const { email, userId, roomId } = client;

  // Notify room peers
  if (roomId) {
    broadcastToRoomRaw(roomId, { action: 'user-disconnected', email }, ws);
  }

  // Clean up from tracking maps (shared with Socket.IO)
  if (email) {
    const byEmail = userSocketsByEmail.get(email) || [];
    userSocketsByEmail.set(email, byEmail.filter(sid => sid !== ws._rawId));
    if (userSocketsByEmail.get(email).length === 0) userSocketsByEmail.delete(email);
  }
  if (userId) {
    const byUserId = userSocketsByUserId.get(userId) || [];
    userSocketsByUserId.set(userId, byUserId.filter(sid => sid !== ws._rawId));
    if (userSocketsByUserId.get(userId).length === 0) userSocketsByUserId.delete(userId);
  }

  rawWsClients.delete(ws);
  console.log(`RawWS disconnected: ${email || 'unknown'}`);
}

server.on('upgrade', (req, socket, head) => {
  // Let Socket.IO handle /socket.io/ paths
  if (req.url.startsWith('/socket.io/')) return;

  acceptWebSocket(req, socket, head);

  const rawId = `raw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  socket._rawId = rawId;
  rawWsClients.set(socket, { email: null, role: null, userId: null, expertId: null, roomId: null });

  let buffer = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 2) {
      const secondByte = buffer[1];
      let frameLength = 2;
      const payloadLen = secondByte & 0x7f;
      if (payloadLen === 126) frameLength += 2;
      else if (payloadLen === 127) frameLength += 8;
      frameLength += 4; // mask
      const totalLen = frameLength + (payloadLen === 126 ? (buffer.length >= 4 ? buffer.readUInt16BE(2) : 0) :
                    payloadLen === 127 ? (buffer.length >= 10 ? Number(buffer.readBigUInt64BE(2)) : 0) :
                    payloadLen);

      const frame = decodeWebSocketFrame(buffer);
      if (!frame) break;

      buffer = buffer.slice(buffer.indexOf(frame.payload, 8) + frame.payload.length + 8);
      // Re-sync: just consume what we decoded
      if (frame.opcode === 0x8) {
        // Close frame
        rawWsDisconnect(socket);
        socket.end();
        return;
      }
      if (frame.opcode === 0x9) {
        // Ping → Pong
        const pong = Buffer.alloc(2 + (frame.payload.length || 0));
        pong[0] = 0x8a; pong[1] = 0x00;
        if (!socket.destroyed) socket.write(pong);
        continue;
      }

      let data;
      try { data = JSON.parse(frame.payload); } catch { continue; }

      const client = rawWsClients.get(socket);
      const { action, ...payload } = data;

      // ── Route by action (same logic as Socket.IO handlers) ──
      switch (action) {
        case 'register-user': {
          const { email, role, userId, expertId } = payload;
          if (!email) break;
          client.email = email;
          client.role = role;
          client.userId = userId;
          client.expertId = expertId;
          // Also track in shared maps
          if (!userSocketsByEmail.has(email)) userSocketsByEmail.set(email, []);
          userSocketsByEmail.get(email).push(rawId);
          if (userId) {
            if (!userSocketsByUserId.has(userId)) userSocketsByUserId.set(userId, []);
            userSocketsByUserId.get(userId).push(rawId);
          }
          console.log(`RawWS registered: ${email} (${role})`);
          break;
        }
        case 'call-request': {
          const { expertEmail, callRequestId, clientName, expertId, clientId } = payload;
          const socketsByEmail = userSocketsByEmail.get(expertEmail) || [];
          const socketsByExpertId = expertId ? (userSocketsByUserId.get(expertId) || []) : [];
          const allSockets = new Set([...socketsByEmail, ...socketsByExpertId]);
          allSockets.forEach(sid => {
            // Check if it's a Socket.IO socket
            const ioClient = io.sockets.sockets.get(sid);
            if (ioClient) {
              io.to(sid).emit('incoming-call', { callRequestId, clientName, clientId, expertId });
            } else {
              // Raw WebSocket — find and send
              for (const [ws, c] of rawWsClients) {
                if (ws._rawId === sid && !ws.destroyed) {
                  sendRawWs(ws, { action: 'incoming-call', callRequestId, clientName, clientId, expertId });
                }
              }
            }
          });
          break;
        }
        case 'call-response': {
          const { clientEmail, callRequestId, callAction, roomId, rejectReason } = payload;
          const clientSockets = userSocketsByEmail.get(clientEmail) || [];
          clientSockets.forEach(sid => {
            const ioClient = io.sockets.sockets.get(sid);
            if (ioClient) {
              io.to(sid).emit('call-status-update', { callRequestId, callAction, roomId, rejectReason });
            } else {
              for (const [ws, c] of rawWsClients) {
                if (ws._rawId === sid && !ws.destroyed) {
                  sendRawWs(ws, { action: 'call-status-update', callRequestId, callAction, roomId, rejectReason });
                }
              }
            }
          });
          break;
        }
        case 'notify-call-ended': {
          const { clientEmail, expertEmail } = payload;
          [clientEmail, expertEmail].filter(Boolean).forEach(email => {
            (userSocketsByEmail.get(email) || []).forEach(sid => {
              const ioClient = io.sockets.sockets.get(sid);
              if (ioClient) {
                io.to(sid).emit('call-ended-by-other');
              } else {
                for (const [ws, c] of rawWsClients) {
                  if (ws._rawId === sid && !ws.destroyed) sendRawWs(ws, { action: 'call-ended-by-other' });
                }
              }
            });
          });
          break;
        }
        case 'join-room': {
          const { roomId } = payload;
          client.roomId = roomId;
          console.log(`RawWS joined room ${roomId}`);
          break;
        }
        case 'offer':
        case 'answer':
        case 'ice-candidate': {
          const { roomName } = payload;
          if (roomName) broadcastToRoomRaw(roomName, data, socket);
          break;
        }
        case 'end-call': {
          const { roomName } = payload;
          if (roomName) broadcastToRoomRaw(roomName, { action: 'call-ended' }, socket);
          break;
        }
        case 'send-chat-message': {
          const { roomName, message } = payload;
          if (roomName) broadcastToRoomRaw(roomName, { action: 'chat-message', message }, socket);
          break;
        }
        case 'session-extended': {
          const { roomName } = payload;
          if (roomName) broadcastToRoomRaw(roomName, data, null); // notify all including sender
          break;
        }
      }
    }
  });

  socket.on('close', () => rawWsDisconnect(socket));
  socket.on('error', () => rawWsDisconnect(socket));
});

server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
  console.log(`  Socket.IO: ws://localhost:${PORT}/socket.io/`);
  console.log(`  Raw WS:    ws://localhost:${PORT}`);
});