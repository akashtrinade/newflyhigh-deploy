# CLAUDE.md — FlyHigh Signaling Server

## Build & Run

```bash
node server.js            # Start signaling server (port 5000)
PORT=6000 node server.js  # Custom port
```

## Stack

- **Node.js** (target v26) + **Express 4.22**
- **Socket.IO 4.7** — WebSocket with room support
- **Mongoose 8** — MongoDB ODM for notifications
- **dotenv** — environment config
- **cors** — CORS middleware

## Architecture

```
server.js (208 lines, single file)
├── HTTP server (Express)
│   └── GET / → health check
├── Socket.IO server
│   ├── register-user     — Maps socket → user (email, userId)
│   ├── call-request      — Routes call request to expert
│   ├── call-response     — Routes response back to client
│   ├── notify-call-ended — Notifies other party call ended
│   ├── join-room         — Joins WebRTC signaling room
│   ├── offer             — Relays WebRTC offer
│   ├── answer            — Relays WebRTC answer
│   ├── ice-candidate     — Relays ICE candidates
│   ├── end-call          — Ends call, leaves room, notifies
│   ├── send-chat-message — Relays chat messages
│   └── disconnect        — Cleans up user tracking
└── In-memory state (resets on restart)
    ├── connectedUsers        Map<socketId, {email, userId}>
    ├── userSocketsByEmail    Map<email, Set<socketId>>
    └── userSocketsByUserId   Map<userId, Set<socketId>>
```

## Key Patterns

- **User tracking**: Three Maps for O(1) lookup by socket, email, or userId.
- **Call routing**: `call-request` broadcasts to all sockets of the target expert. `call-response` sends back to requesting client.
- **Rooms**: Socket.IO rooms for WebRTC signaling — client and expert join same room for direct relay.
- **Notifications**: Mongoose `Notification` model stores chat and video-call notifications in MongoDB.
- **No auth enforcement** — the signaling server trusts that the backend already authenticated the user.

## MongoDB Model

```javascript
// models/Notification.js
{
  userId: String,        // Target user
  type: String,          // 'chat' | 'video-call'
  message: String,
  fromUser: String,
  roomId: String,
  read: Boolean,
  createdAt: Date
}
```

## CORS Origins

`localhost:3000, localhost:5173, localhost:5174, localhost:5175, localhost:8081`

## Gotchas

1. **In-memory state resets on restart** — all connected users are disconnected. Consider Redis for production.
2. **Single file server** — all 208 lines in `server.js`. For scaling, split into handlers, services, models.
3. **No authentication** — the signaling server trusts the caller's identity. The backend handles actual auth.
4. **No rate limiting** — WebSocket events are not throttled. Could be abused for spam.
5. **MongoDB connection string** — check `server.js` for the `mongoose.connect()` URI. Must match the backend's database.
6. **Port must match frontend** — if you change the port, update the Socket.IO URL in `flyhigh-ui/src/hooks/useSocket.ts`.
7. **CORS origins are hardcoded** — adding a new frontend port requires updating the array in `server.js`.

## Verification Checklist

After any signaling change:
- [ ] Server starts: `node server.js`
- [ ] Health check: `curl http://localhost:5000/`
- [ ] Socket.IO connects from frontend (check browser Network → WS tab)
- [ ] Call request reaches target user
- [ ] WebRTC signaling flows: offer → answer → ICE candidates
- [ ] Chat messages relay correctly
- [ ] Disconnect cleanup works (no stale entries in Maps)
