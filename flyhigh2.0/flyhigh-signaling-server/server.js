import express, { json } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { base64UrlDecode, verifyJwtWithDevFallback, extractCookie } from './src/shared/jwt.js';

const app = express();
const server = createServer(app);

// ── CORS origins from environment ────────────────────────────
const CORS_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000,http://localhost:5174,http://localhost:5175,http://localhost:8081')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// ── Express middleware ───────────────────────────────────────
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", ...CORS_ORIGINS],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
app.use(json());

const io = new Server(server, {
  cors: {
    origin: CORS_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowUpgrades: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  // Reject unauthenticated connections after timeout (10s)
  connectTimeout: 10000,
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// ── JWT Verification ─────────────────────────────────────────
// Delegates to shared module (src/shared/jwt.js).
// Uses dev-mode fallback when JWT_SECRET is not set.

// ── Rate Limiting ─────────────────────────────────────────────
// Per-socket event rate limiting to prevent WebSocket spam
const socketEventCounters = new Map(); // socketId -> { windowStart, counts: Map<event, count> }
const MAX_EVENTS_PER_WINDOW = 30;      // max events per socket per window
const RATE_WINDOW_MS = 10_000;         // 10 second window

function checkSocketRateLimit(socket, eventName) {
  const now = Date.now();
  let tracker = socketEventCounters.get(socket.id);

  if (!tracker || (now - tracker.windowStart) > RATE_WINDOW_MS) {
    tracker = { windowStart: now, counts: new Map() };
    socketEventCounters.set(socket.id, tracker);
  }

  const count = (tracker.counts.get(eventName) || 0) + 1;
  tracker.counts.set(eventName, count);

  // Check total events across all types
  let totalEvents = 0;
  for (const c of tracker.counts.values()) totalEvents += c;

  if (totalEvents > MAX_EVENTS_PER_WINDOW) {
    console.warn(`[SECURITY] Rate limit exceeded for socket ${socket.id} (${totalEvents} events in ${RATE_WINDOW_MS}ms)`);
    return false;
  }

  return true;
}

// Clean up rate limit trackers periodically
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [sid, tracker] of socketEventCounters) {
    if (tracker.windowStart < cutoff) {
      socketEventCounters.delete(sid);
    }
  }
}, 30_000);

// ── State ─────────────────────────────────────────────────────
// Track connected users: socketId -> { email, role, userId, expertId }
const connectedUsers = new Map();
// Track user sockets by email: email -> [socketIds]
const userSocketsByEmail = new Map();
// Track user sockets by userId: userId -> [socketIds]
const userSocketsByUserId = new Map();

// ── Auth middleware ───────────────────────────────────────────
// Applied to sensitive events to verify the sender's identity
function requireAuth(socket) {
  const userData = socket.data;
  if (!userData || !userData.email || userData.email === 'unknown') {
    return false;
  }
  return true;
}

// Validate that the claimed email matches the socket's registered email
function validateSender(socket, claimedEmail) {
  if (!claimedEmail) return false;
  const userData = socket.data;
  if (!userData || !userData.email) return false;
  return userData.email === claimedEmail;
}

// ── Socket.IO handlers ────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(`New connection: ${socket.id}`);

  // ── User registration (with JWT verification) ─────────────
  socket.on('register-user', (data) => {
    if (!checkSocketRateLimit(socket, 'register-user')) {
      return socket.emit('error', { message: 'Rate limit exceeded' });
    }

    const { email, role, userId, expertId, token } = data;

    // JWT verification — require valid token for identity binding
    if (token) {
      const claims = verifyJwtWithDevFallback(token, JWT_SECRET);
      if (!claims) {
        console.warn(`[SECURITY] Rejected register-user: invalid/expired JWT from ${socket.id}`);
        return socket.emit('error', { message: 'Authentication failed. Invalid or expired token.' });
      }

      // Verify claimed identity matches JWT claims
      if (email && claims.email !== email) {
        console.warn(`[SECURITY] Rejected register-user: email mismatch (claimed=${email}, jwt=${claims.email})`);
        return socket.emit('error', { message: 'Identity mismatch.' });
      }

      // Use JWT-verified identity
      const verifiedEmail = claims.email || email;
      const verifiedRole = claims.role || role;
      const verifiedUserId = claims.userId || userId;

      if (!verifiedEmail) {
        return socket.emit('error', { message: 'Email is required.' });
      }

      // Store verified user info on socket
      socket.data = { email: verifiedEmail, role: verifiedRole, userId: verifiedUserId, expertId };

      // Track by socket id
      connectedUsers.set(socket.id, { email: verifiedEmail, role: verifiedRole, userId: verifiedUserId, expertId });

      // Track by email
      if (!userSocketsByEmail.has(verifiedEmail)) {
        userSocketsByEmail.set(verifiedEmail, []);
      }
      const byEmail = userSocketsByEmail.get(verifiedEmail);
      if (!byEmail.includes(socket.id)) {
        byEmail.push(socket.id);
      }

      // Track by userId
      if (verifiedUserId) {
        if (!userSocketsByUserId.has(verifiedUserId)) {
          userSocketsByUserId.set(verifiedUserId, []);
        }
        const byUserId = userSocketsByUserId.get(verifiedUserId);
        if (!byUserId.includes(socket.id)) {
          byUserId.push(socket.id);
        }
      }

      console.log(`User registered (verified): ${verifiedEmail} (${verifiedRole}) socket=${socket.id}`);
    } else if (!JWT_SECRET) {
      // DEV MODE: No JWT_SECRET configured — accept without verification (with warning)
      console.warn(`[SECURITY] DEV MODE: Registering user without JWT verification: ${email}`);
      if (!email) return;

      socket.data = { email, role, userId, expertId };
      connectedUsers.set(socket.id, { email, role, userId, expertId });

      if (!userSocketsByEmail.has(email)) {
        userSocketsByEmail.set(email, []);
      }
      const byEmail = userSocketsByEmail.get(email);
      if (!byEmail.includes(socket.id)) {
        byEmail.push(socket.id);
      }

      if (userId) {
        if (!userSocketsByUserId.has(userId)) {
          userSocketsByUserId.set(userId, []);
        }
        const byUserId = userSocketsByUserId.get(userId);
        if (!byUserId.includes(socket.id)) {
          byUserId.push(socket.id);
        }
      }
    } else {
      // PRODUCTION MODE: JWT_SECRET is set but no token provided in payload —
      // try to read JWT from httpOnly cookie sent with Socket.IO handshake
      const cookieToken = extractCookie(socket, 'accessToken');
      if (cookieToken) {
        const claims = verifyJwtWithDevFallback(cookieToken, JWT_SECRET);
        if (claims) {
          console.log(`User registered (cookie JWT): ${claims.email || email} (${claims.role || role}) socket=${socket.id}`);
          const verifiedEmail = claims.email || email;
          const verifiedRole = claims.role || role;
          const verifiedUserId = claims.userId || userId;
          if (!verifiedEmail) return;

          socket.data = { email: verifiedEmail, role: verifiedRole, userId: verifiedUserId, expertId };
          connectedUsers.set(socket.id, { email: verifiedEmail, role: verifiedRole, userId: verifiedUserId, expertId });

          if (!userSocketsByEmail.has(verifiedEmail)) {
            userSocketsByEmail.set(verifiedEmail, []);
          }
          const byEmail = userSocketsByEmail.get(verifiedEmail);
          if (!byEmail.includes(socket.id)) byEmail.push(socket.id);

          if (verifiedUserId) {
            if (!userSocketsByUserId.has(verifiedUserId)) {
              userSocketsByUserId.set(verifiedUserId, []);
            }
            const byUserId = userSocketsByUserId.get(verifiedUserId);
            if (!byUserId.includes(socket.id)) byUserId.push(socket.id);
          }
          return;
        }
        console.warn(`[SECURITY] Invalid cookie JWT from socket ${socket.id}`);
      }

      // Fallback: no token or invalid — reject in production
      console.warn(`[SECURITY] Rejected register-user: no valid token (JWT_SECRET is configured)`);
      socket.emit('error', { message: 'Authentication required. Please provide a valid token.' });
    }
  });

  // ── Call request notification (requires auth) ──────────────
  socket.on('call-request', (data) => {
    if (!checkSocketRateLimit(socket, 'call-request')) return;
    if (!requireAuth(socket)) {
      return socket.emit('error', { message: 'Authentication required.' });
    }

    // Only CLIENT-role senders may place calls
    if ((socket.data.role || '').toUpperCase() !== 'CLIENT') {
      console.warn(`[SECURITY] Rejected call-request from non-client ${socket.data.email}`);
      return socket.emit('error', { message: 'Forbidden: Only clients can place calls.' });
    }

    const { expertEmail, callRequestId, clientName, expertId, clientId } = data;

    console.log(`Call request from ${clientName} to expert email=${expertEmail} expertId=${expertId}`);

    const socketsByEmail = userSocketsByEmail.get(expertEmail) || [];
    const socketsByExpertId = expertId ? (userSocketsByUserId.get(expertId) || []) : [];
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

  // ── Call response (requires auth) ──────────────────────────
  socket.on('call-response', (data) => {
    if (!checkSocketRateLimit(socket, 'call-response')) return;
    if (!requireAuth(socket)) {
      return socket.emit('error', { message: 'Authentication required.' });
    }

    // Only EXPERT-role senders may respond to calls
    if ((socket.data.role || '').toUpperCase() !== 'EXPERT') {
      console.warn(`[SECURITY] Rejected call-response from non-expert ${socket.data.email}`);
      return socket.emit('error', { message: 'Forbidden: Only experts can respond to calls.' });
    }

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

  // ── Call ended notification (requires auth) ────────────────
  socket.on('notify-call-ended', (data) => {
    if (!checkSocketRateLimit(socket, 'notify-call-ended')) return;
    if (!requireAuth(socket)) {
      return socket.emit('error', { message: 'Authentication required.' });
    }

    const { clientEmail, expertEmail } = data;

    // Sender must be one of the participants of the ended call
    const isParticipant = (clientEmail && socket.data.email === clientEmail)
      || (expertEmail && socket.data.email === expertEmail);
    if (!isParticipant) {
      console.warn(`[SECURITY] Rejected notify-call-ended from non-participant ${socket.data.email}`);
      return socket.emit('error', { message: 'Forbidden: Not a call participant.' });
    }

    if (clientEmail) {
      const clientSockets = userSocketsByEmail.get(clientEmail) || [];
      clientSockets.forEach(sid => io.to(sid).emit('call-ended-by-other'));
    }
    if (expertEmail) {
      const expertSockets = userSocketsByEmail.get(expertEmail) || [];
      expertSockets.forEach(sid => io.to(sid).emit('call-ended-by-other'));
    }
  });

  // ── Room joining (requires auth) ───────────────────────────
  socket.on('join-room', (data) => {
    if (!checkSocketRateLimit(socket, 'join-room')) return;
    if (!requireAuth(socket)) {
      return socket.emit('error', { message: 'Authentication required.' });
    }

    const { roomId, userEmail, role } = data;
    if (!roomId || !userEmail || !role) {
      return socket.emit('error', { message: 'Missing required fields' });
    }

    // Verify room join matches registered identity
    if (!validateSender(socket, userEmail)) {
      console.warn(`[SECURITY] Rejected join-room: email mismatch (socket=${socket.data.email}, claimed=${userEmail})`);
      return socket.emit('error', { message: 'Identity mismatch.' });
    }

    // Leave previous room if any
    if (socket.data.roomId) {
      socket.leave(socket.data.roomId);
    }

    socket.join(roomId);
    // Keep the JWT-verified role — never overwrite with the client-supplied value
    socket.data = { ...socket.data, roomId, userEmail, role: socket.data.role };
    console.log(`${userEmail} (${socket.data.role}) joined room ${roomId}`);
  });

  // ── Signaling handlers (relay — requires auth + room membership) ──
  function isInRoom(socket, roomName) {
    return Boolean(roomName && socket.rooms.has(roomName));
  }

  socket.on('offer', ({ offer, roomName }) => {
    if (!checkSocketRateLimit(socket, 'offer')) return;
    if (!requireAuth(socket)) return socket.emit('error', { message: 'Authentication required.' });
    if (!isInRoom(socket, roomName)) {
      console.warn(`[SECURITY] Rejected offer from ${socket.data.email}: not in room ${roomName}`);
      return socket.emit('error', { message: 'Forbidden: Not a room member.' });
    }
    socket.to(roomName).emit('offer', offer);
  });

  socket.on('answer', ({ answer, roomName }) => {
    if (!checkSocketRateLimit(socket, 'answer')) return;
    if (!requireAuth(socket)) return socket.emit('error', { message: 'Authentication required.' });
    if (!isInRoom(socket, roomName)) {
      console.warn(`[SECURITY] Rejected answer from ${socket.data.email}: not in room ${roomName}`);
      return socket.emit('error', { message: 'Forbidden: Not a room member.' });
    }
    socket.to(roomName).emit('answer', answer);
  });

  socket.on('ice-candidate', ({ candidate, roomName }) => {
    if (!checkSocketRateLimit(socket, 'ice-candidate')) return;
    if (!requireAuth(socket)) return socket.emit('error', { message: 'Authentication required.' });
    if (!isInRoom(socket, roomName)) {
      console.warn(`[SECURITY] Rejected ice-candidate from ${socket.data.email}: not in room ${roomName}`);
      return socket.emit('error', { message: 'Forbidden: Not a room member.' });
    }
    socket.to(roomName).emit('ice-candidate', candidate);
  });

  socket.on('end-call', ({ roomName }) => {
    if (!checkSocketRateLimit(socket, 'end-call')) return;
    if (!requireAuth(socket)) return socket.emit('error', { message: 'Authentication required.' });
    if (!isInRoom(socket, roomName)) {
      console.warn(`[SECURITY] Rejected end-call from ${socket.data.email}: not in room ${roomName}`);
      return socket.emit('error', { message: 'Forbidden: Not a room member.' });
    }
    socket.to(roomName).emit('call-ended');
  });

  socket.on('send-chat-message', ({ roomName, message }) => {
    if (!checkSocketRateLimit(socket, 'send-chat-message')) return;
    if (!requireAuth(socket)) return socket.emit('error', { message: 'Authentication required.' });
    if (!isInRoom(socket, roomName)) {
      console.warn(`[SECURITY] Rejected chat from ${socket.data.email}: not in room ${roomName}`);
      return socket.emit('error', { message: 'Forbidden: Not a room member.' });
    }
    // Sanitize message text length, relay the full message object.
    // Strip isMine so the receiver styles it as a remote message.
    const safeMessage = {
      ...message,
      text: typeof message?.text === 'string' ? message.text.slice(0, 5000) : String(message ?? ''),
      isMine: false,
    };
    socket.to(roomName).emit('chat-message', safeMessage);
  });

  // ── Disconnect ─────────────────────────────────────────────
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

    // Clean up rate limit tracker
    socketEventCounters.delete(socket.id);

    if (roomId) {
      console.log(`User disconnected from ${roomId}: ${email || socket.id}`);
      socket.to(roomId).emit('user-disconnected', { email });
    }
  });
});

// ── Health check ───────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    connections: connectedUsers.size,
    authEnabled: !!JWT_SECRET,
    uptime: process.uptime(),
  });
});

// ── Startup ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
  if (!JWT_SECRET) {
    console.warn('╔══════════════════════════════════════════════════════════════╗');
    console.warn('║  [SECURITY WARNING] JWT_SECRET is not set.                  ║');
    console.warn('║  Authentication is DISABLED — anyone can connect.           ║');
    console.warn('║  Set JWT_SECRET in .env for production use.                 ║');
    console.warn('╚══════════════════════════════════════════════════════════════╝');
  } else {
    console.log('[SECURITY] JWT authentication ENABLED — all connections verified.');
  }
});

// ── Graceful Shutdown ──────────────────────────────────────────
// Handles SIGTERM/SIGINT for containerized environments (Docker, ECS, K8s).
// Notifies connected clients and cleans up in-memory state before exit.
function gracefulShutdown(signal) {
  console.log(`\n[SHUTDOWN] Received ${signal} — shutting down gracefully...`);

  let didExit = false;
  const forceExit = setTimeout(() => {
    if (!didExit) {
      console.error('[SHUTDOWN] Timed out — forcing exit.');
      process.exit(1);
    }
  }, 10_000);

  const finish = (code) => {
    if (didExit) return;
    didExit = true;
    clearTimeout(forceExit);
    process.exit(code);
  };

  // Notify all connected clients
  for (const [socketId] of connectedUsers) {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('server-shutdown', { message: 'Server is restarting. Please reconnect.' });
    }
  }

  // Close Socket.IO first — live WebSocket connections keep the HTTP server
  // open, so server.close() alone would never complete.
  io.close(() => {
    console.log('[SHUTDOWN] Socket.IO server closed.');
    server.close(() => {
      console.log('[SHUTDOWN] HTTP server closed.');
      finish(0);
    });
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
