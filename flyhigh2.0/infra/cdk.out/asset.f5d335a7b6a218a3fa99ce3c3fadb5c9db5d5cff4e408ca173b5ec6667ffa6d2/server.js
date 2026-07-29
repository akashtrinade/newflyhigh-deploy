import express, { json } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
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
    const socketsByUserId = userSocketsByUserId.get(expertEmail) || [];
    const socketsByExpertId = expertId ? (userSocketsByUserId.get(expertId) || []) : [];

    // Combine all unique socket IDs
    const allSockets = new Set([...socketsByEmail, ...socketsByUserId, ...socketsByExpertId]);

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

server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
});