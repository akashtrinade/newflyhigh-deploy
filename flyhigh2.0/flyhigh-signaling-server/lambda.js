import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { base64UrlDecode, verifyJwt } from './src/shared/jwt.js';

// ── AWS clients ──────────────────────────────────────────────
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'flyhigh-connections';
const ROOMS_TABLE = process.env.ROOMS_TABLE || 'flyhigh-rooms';
const CONNECTION_TTL_SECONDS = 3 * 60 * 60; // 3 hours
const JWT_SECRET = process.env.JWT_SECRET; // Base64-encoded HMAC key

// ── JWT Verification ─────────────────────────────────────────
// Delegates to shared module (src/shared/jwt.js).
// Lambda ALWAYS requires JWT_SECRET — no dev fallback.

// ── Helpers ──────────────────────────────────────────────────

function getEndpoint(event) {
  const domain = event.requestContext.domainName;
  const stage = event.requestContext.stage;
  return `https://${domain}/${stage}`;
}

function makeApiClient(endpoint) {
  return new ApiGatewayManagementApiClient({
    endpoint,
    region: process.env.AWS_REGION,
  });
}

async function postToConnection(endpoint, connectionId, data) {
  const client = makeApiClient(endpoint);
  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(data),
    }));
  } catch (err) {
    if (err.name === 'GoneException') {
      // Connection is stale — remove from DynamoDB
      await docClient.send(new DeleteCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
      }));
    } else {
      console.error(`Error posting to ${connectionId}:`, err.message);
    }
  }
}

async function getConnection(connectionId) {
  const result = await docClient.send(new GetCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId },
  }));
  return result.Item;
}

async function getConnectionsByField(field, value) {
  const result = await docClient.send(new QueryCommand({
    TableName: CONNECTIONS_TABLE,
    IndexName: field === 'email' ? 'email-index' : 'userId-index',
    KeyConditionExpression: '#field = :value',
    ExpressionAttributeNames: { '#field': field },
    ExpressionAttributeValues: { ':value': value },
  }));
  return result.Items || [];
}

async function addConnection(connectionId, userData) {
  const ttl = Math.floor(Date.now() / 1000) + CONNECTION_TTL_SECONDS;
  await docClient.send(new PutCommand({
    TableName: CONNECTIONS_TABLE,
    Item: {
      connectionId,
      email: userData.email,
      role: userData.role,
      userId: userData.userId || null,
      expertId: userData.expertId || null,
      authenticated: true,
      connectedAt: Math.floor(Date.now() / 1000),
      activeRoomId: null,
      ttl,
    },
  }));
}

async function removeConnection(connectionId) {
  await docClient.send(new DeleteCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId },
  }));
}

async function updateConnectionRoom(connectionId, roomId) {
  await docClient.send(new UpdateCommand({
    TableName: CONNECTIONS_TABLE,
    Key: { connectionId },
    UpdateExpression: 'SET activeRoomId = :roomId',
    ExpressionAttributeValues: { ':roomId': roomId },
  }));
}

async function getRoom(roomId) {
  const result = await docClient.send(new GetCommand({
    TableName: ROOMS_TABLE,
    Key: { roomId },
  }));
  return result.Item;
}

async function createRoom(roomId, connectionId, callRequestId = null) {
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours
  await docClient.send(new PutCommand({
    TableName: ROOMS_TABLE,
    Item: {
      roomId,
      connectionIds: [connectionId],
      callRequestId,
      createdAt: Math.floor(Date.now() / 1000),
      ttl,
    },
  }));
}

async function addToRoom(roomId, connectionId) {
  await docClient.send(new UpdateCommand({
    TableName: ROOMS_TABLE,
    Key: { roomId },
    UpdateExpression: 'ADD connectionIds :cid',
    ExpressionAttributeValues: { ':cid': new Set([connectionId]) },
    ConditionExpression: 'attribute_exists(roomId)',
  }));
}

async function removeFromRoom(roomId, connectionId) {
  await docClient.send(new UpdateCommand({
    TableName: ROOMS_TABLE,
    Key: { roomId },
    UpdateExpression: 'DELETE connectionIds :cid',
    ExpressionAttributeValues: { ':cid': new Set([connectionId]) },
  }));
}

async function deleteRoom(roomId) {
  await docClient.send(new DeleteCommand({
    TableName: ROOMS_TABLE,
    Key: { roomId },
  }));
}

// Soft-delete: mark the room for cleanup in ROOM_END_GRACE_SECONDS instead of
// deleting immediately, so late-arriving disconnect/leave events don't race.
async function softDeleteRoom(roomId) {
  await docClient.send(new UpdateCommand({
    TableName: ROOMS_TABLE,
    Key: { roomId },
    UpdateExpression: 'SET ttl = :ttl',
    ExpressionAttributeValues: {
      ':ttl': Math.floor(Date.now() / 1000) + 5 * 60, // 5 minute grace period
    },
  }));
}

async function broadcastToRoom(endpoint, roomId, data, excludeConnectionId = null) {
  const room = await getRoom(roomId);
  if (!room || !room.connectionIds) return;

  const targets = room.connectionIds.filter(cid => cid !== excludeConnectionId);
  await Promise.allSettled(
    targets.map(cid => postToConnection(endpoint, cid, data))
  );
}

function isRoomMember(conn, roomName) {
  return Boolean(conn && conn.activeRoomId && conn.activeRoomId === roomName);
}

function roleIs(conn, expected) {
  return Boolean(conn && conn.role && conn.role.toUpperCase() === expected);
}

// ── Route handlers ───────────────────────────────────────────

async function handleConnect(event) {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};

  // ── JWT Authentication ──────────────────────────────────
  const token = queryParams.token;
  let userData;

  if (token) {
    const claims = verifyJwt(token, JWT_SECRET);
    if (!claims) {
      console.warn(`[SECURITY] Rejected WebSocket connection ${connectionId}: invalid/expired JWT`);
      return { statusCode: 401, body: 'Unauthorized: Invalid or expired token' };
    }
    // Use JWT-verified identity — ignore client-provided params
    userData = {
      email: claims.email || 'unknown',
      role: claims.role || 'unknown',
      userId: claims.userId || null,
      expertId: queryParams.expertId || null,
      authenticated: true,
    };
    console.log(`Connected (verified): ${connectionId} (${userData.email}, ${userData.role})`);
  } else if (JWT_SECRET) {
    // Production: JWT_SECRET is set but no token provided — REJECT
    console.warn(`[SECURITY] Rejected WebSocket connection ${connectionId}: no token provided`);
    return { statusCode: 401, body: 'Unauthorized: Token required' };
  } else {
    // JWT_SECRET must always be set in Lambda.
    // Reject connection — do NOT accept unauthenticated connections.
    console.error(`[SECURITY] JWT_SECRET not set — REJECTING connection ${connectionId}`);
    return { statusCode: 500, body: 'Server configuration error' };
  }

  await addConnection(connectionId, userData);
  return { statusCode: 200, body: 'Connected' };
}

async function handleDisconnect(event) {
  const connectionId = event.requestContext.connectionId;
  const endpoint = getEndpoint(event);

  const conn = await getConnection(connectionId);
  if (!conn) {
    console.log(`Unknown connection disconnected: ${connectionId}`);
    return { statusCode: 200, body: 'Disconnected' };
  }

  // Notify room peers
  if (conn.activeRoomId) {
    await broadcastToRoom(endpoint, conn.activeRoomId, {
      action: 'user-disconnected',
      email: conn.email,
      role: conn.role,
    }, connectionId);
    await removeFromRoom(conn.activeRoomId, connectionId);
  }

  await removeConnection(connectionId);
  console.log(`Disconnected: ${connectionId} (${conn.email})`);
  return { statusCode: 200, body: 'Disconnected' };
}

// ── Rate Limiting (in-memory, per-connection) ──────────────────
// NOTE: In-memory rate limiting resets on every Lambda cold start.
// Multiple concurrent cold starts = fresh counters per container.
// For production with high concurrency, replace with DynamoDB atomic
// counters (TTL-based) or use API Gateway usage plans / throttling.
const connectionEventCounters = new Map();

function checkConnectionRateLimit(connectionId, action) {
  const now = Date.now();
  const WINDOW_MS = 10_000;     // 10 second window
  const MAX_EVENTS = 30;        // max total events per window

  let tracker = connectionEventCounters.get(connectionId);
  if (!tracker || (now - tracker.windowStart) > WINDOW_MS) {
    tracker = { windowStart: now, counts: new Map() };
    connectionEventCounters.set(connectionId, tracker);
  }

  const count = (tracker.counts.get(action) || 0) + 1;
  tracker.counts.set(action, count);

  let total = 0;
  for (const c of tracker.counts.values()) total += c;

  if (total > MAX_EVENTS) {
    console.warn(`[SECURITY] Lambda rate limit exceeded for ${connectionId}`);
    return false;
  }
  return true;
}

async function handleDefault(event) {
  const connectionId = event.requestContext.connectionId;
  const endpoint = getEndpoint(event);
  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { action, ...data } = body;

  // ── Rate limit check ──────────────────────────────────
  if (!checkConnectionRateLimit(connectionId, action)) {
    return { statusCode: 429, body: 'Rate limit exceeded' };
  }

  // ── Auth check for sensitive actions ──────────────────
  const conn = await getConnection(connectionId);
  const isAuthenticated = conn && conn.authenticated === true;

  // Actions that require authentication
  const AUTH_REQUIRED = [
    'call-request', 'call-response', 'notify-call-ended',
    'join-room', 'offer', 'answer', 'ice-candidate',
    'end-call', 'send-chat-message'
  ];

  if (AUTH_REQUIRED.includes(action) && !isAuthenticated) {
    console.warn(`[SECURITY] Rejected unauthenticated "${action}" from ${connectionId}`);
    return { statusCode: 401, body: 'Unauthorized: Authentication required' };
  }

  switch (action) {
    // ── User registration ──────────────────────────────
    case 'register-user': {
      if (!conn) break;

      // If connection was JWT-authenticated, don't allow overwriting identity
      if (conn.authenticated && data.email && data.email !== conn.email) {
        console.warn(`[SECURITY] Rejected register-user: attempt to change identity from ${conn.email} to ${data.email}`);
        break;
      }

      const updateExpr = conn.authenticated
        ? 'SET expertId = :expertId'  // Only allow updating expertId on authenticated connections
        : 'SET email = :email, #role = :role, userId = :userId, expertId = :expertId';

      const exprAttrValues = conn.authenticated
        ? { ':expertId': data.expertId || conn.expertId }
        : {
            ':email': data.email || conn.email,
            ':role': data.role || conn.role,
            ':userId': data.userId || conn.userId,
            ':expertId': data.expertId || conn.expertId,
          };

      await docClient.send(new UpdateCommand({
        TableName: CONNECTIONS_TABLE,
        Key: { connectionId },
        UpdateExpression: updateExpr,
        ExpressionAttributeNames: conn.authenticated ? undefined : { '#role': 'role' },
        ExpressionAttributeValues: exprAttrValues,
      }));
      break;
    }

    // ── Call request notification ──────────────────────
    case 'call-request': {
      if (!roleIs(conn, 'CLIENT')) {
        console.warn(`[SECURITY] Rejected call-request: sender is not a CLIENT (${conn?.email})`);
        return { statusCode: 403, body: 'Forbidden: Only clients can place calls' };
      }

      const { expertEmail, expertId, callRequestId, clientName, clientId } = data;

      // Look up expert by expertId first, then by email
      let expertConns = [];
      if (expertId) {
        expertConns = await getConnectionsByField('userId', expertId);
      }
      if (expertConns.length === 0 && expertEmail) {
        expertConns = await getConnectionsByField('email', expertEmail);
      }

      await Promise.allSettled(
        expertConns.map(conn =>
          postToConnection(endpoint, conn.connectionId, {
            action: 'incoming-call',
            callRequestId,
            clientName,
            clientId,
            expertId,
          })
        )
      );
      break;
    }

    // ── Call response (accept/reject) ──────────────────
    case 'call-response': {
      if (!roleIs(conn, 'EXPERT')) {
        console.warn(`[SECURITY] Rejected call-response: sender is not an EXPERT (${conn?.email})`);
        return { statusCode: 403, body: 'Forbidden: Only experts can respond to calls' };
      }

      const { clientEmail, callRequestId, callAction, roomId, rejectReason } = data;

      if (clientEmail) {
        const clientConns = await getConnectionsByField('email', clientEmail);
        await Promise.allSettled(
          clientConns.map(conn =>
            postToConnection(endpoint, conn.connectionId, {
              action: 'call-status-update',
              callRequestId,
              callAction,
              roomId,
              rejectReason,
            })
          )
        );
      }
      break;
    }

    // ── Call ended notification ────────────────────────
    case 'notify-call-ended': {
      const { clientEmail, expertEmail } = data;

      // Sender must be one of the participants of the ended call
      const isParticipant = (clientEmail && conn.email === clientEmail)
        || (expertEmail && conn.email === expertEmail);
      if (!isParticipant) {
        console.warn(`[SECURITY] Rejected notify-call-ended: sender ${conn?.email} is not a participant`);
        return { statusCode: 403, body: 'Forbidden: Not a call participant' };
      }

      if (clientEmail) {
        const clientConns = await getConnectionsByField('email', clientEmail);
        await Promise.allSettled(
          clientConns.map(conn =>
            postToConnection(endpoint, conn.connectionId, { action: 'call-ended-by-other' })
          )
        );
      }
      if (expertEmail) {
        const expertConns = await getConnectionsByField('email', expertEmail);
        await Promise.allSettled(
          expertConns.map(conn =>
            postToConnection(endpoint, conn.connectionId, { action: 'call-ended-by-other' })
          )
        );
      }
      break;
    }

    // ── Join room ──────────────────────────────────────
    case 'join-room': {
      const { roomId, userEmail, role } = data;
      if (!roomId) break;

      // The claimed identity must match the JWT-verified connection email
      if (userEmail && conn.email !== userEmail) {
        console.warn(`[SECURITY] Rejected join-room: email mismatch (connection=${conn.email}, claimed=${userEmail})`);
        return { statusCode: 403, body: 'Forbidden: Identity mismatch' };
      }

      // Create room if it doesn't exist
      const existingRoom = await getRoom(roomId);
      if (!existingRoom) {
        await createRoom(roomId, connectionId, data.callRequestId || null);
      } else {
        await addToRoom(roomId, connectionId);
      }

      await updateConnectionRoom(connectionId, roomId);
      console.log(`${userEmail || conn.email || connectionId} (${role || conn.role}) joined room ${roomId}`);
      break;
    }

    // ── WebRTC signaling relay ─────────────────────────
    case 'offer':
    case 'answer':
    case 'ice-candidate': {
      const { roomName } = data;
      if (!roomName) break;
      if (!isRoomMember(conn, roomName)) {
        console.warn(`[SECURITY] Rejected ${action}: ${conn?.email} not a member of room ${roomName}`);
        return { statusCode: 403, body: 'Forbidden: Not a room member' };
      }
      await broadcastToRoom(endpoint, roomName, body, connectionId);
      break;
    }

    // ── Chat messages ──────────────────────────────────
    case 'send-chat-message': {
      const { roomName } = data;
      if (!roomName) break;
      if (!isRoomMember(conn, roomName)) {
        console.warn(`[SECURITY] Rejected send-chat-message: ${conn?.email} not a member of room ${roomName}`);
        return { statusCode: 403, body: 'Forbidden: Not a room member' };
      }
      const message = data.message;
      const safeMessage = {
        ...(typeof message === 'object' && message !== null ? message : {}),
        text: typeof message?.text === 'string' ? message.text.slice(0, 5000) : String(message ?? ''),
        isMine: false,
      };
      await broadcastToRoom(endpoint, roomName, {
        action: 'chat-message',
        message: safeMessage,
      }, connectionId);
      break;
    }

    // ── Session extended (from backend) ────────────────
    case 'session-extended': {
      const { roomName, newExpiry, extendedBy } = data;
      if (!roomName) break;
      if (!isRoomMember(conn, roomName)) {
        console.warn(`[SECURITY] Rejected session-extended: ${conn?.email} not a member of room ${roomName}`);
        return { statusCode: 403, body: 'Forbidden: Not a room member' };
      }
      await broadcastToRoom(endpoint, roomName, {
        action: 'session-extended',
        newExpiry,
        extendedBy,
      }, null); // notify everyone including sender
      break;
    }

    // ── End call ───────────────────────────────────────
    case 'end-call': {
      const { roomName } = data;
      if (!roomName) break;
      if (!isRoomMember(conn, roomName)) {
        console.warn(`[SECURITY] Rejected end-call: ${conn?.email} not a member of room ${roomName}`);
        return { statusCode: 403, body: 'Forbidden: Not a room member' };
      }
      await broadcastToRoom(endpoint, roomName, {
        action: 'call-ended',
      }, connectionId);

      // Soft-cleanup: keep the room briefly for in-flight disconnect/leave events
      if (roomName) {
        await softDeleteRoom(roomName);
      }
      break;
    }

    default:
      console.log(`Unknown action: ${action} from ${connectionId}`);
  }

  return { statusCode: 200, body: 'OK' };
}

// ── Main handler ─────────────────────────────────────────────

export const handler = async (event) => {
  const routeKey = event.requestContext.routeKey;
  console.log(`Route: ${routeKey}, ConnectionId: ${event.requestContext.connectionId}`);

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);
      case '$disconnect':
        return await handleDisconnect(event);
      case '$default':
        return await handleDefault(event);
      default:
        return { statusCode: 400, body: `Unknown route: ${routeKey}` };
    }
  } catch (err) {
    console.error('Handler error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
