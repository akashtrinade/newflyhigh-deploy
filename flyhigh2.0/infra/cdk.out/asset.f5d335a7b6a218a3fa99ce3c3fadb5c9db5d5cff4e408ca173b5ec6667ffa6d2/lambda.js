import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';

// ── AWS clients ──────────────────────────────────────────────
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE || 'flyhigh-connections';
const ROOMS_TABLE = process.env.ROOMS_TABLE || 'flyhigh-rooms';
const CONNECTION_TTL_SECONDS = 3 * 60 * 60; // 3 hours

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

async function broadcastToRoom(endpoint, roomId, data, excludeConnectionId = null) {
  const room = await getRoom(roomId);
  if (!room || !room.connectionIds) return;

  const targets = room.connectionIds.filter(cid => cid !== excludeConnectionId);
  await Promise.allSettled(
    targets.map(cid => postToConnection(endpoint, cid, data))
  );
}

// ── Route handlers ───────────────────────────────────────────

async function handleConnect(event) {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};

  const userData = {
    email: queryParams.email || 'unknown',
    role: queryParams.role || 'unknown',
    userId: queryParams.userId || null,
    expertId: queryParams.expertId || null,
  };

  await addConnection(connectionId, userData);
  console.log(`Connected: ${connectionId} (${userData.email}, ${userData.role})`);
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

  switch (action) {
    // ── User registration ──────────────────────────────
    case 'register-user': {
      const conn = await getConnection(connectionId);
      if (conn) {
        await docClient.send(new UpdateCommand({
          TableName: CONNECTIONS_TABLE,
          Key: { connectionId },
          UpdateExpression: 'SET email = :email, #role = :role, userId = :userId, expertId = :expertId',
          ExpressionAttributeNames: { '#role': 'role' },
          ExpressionAttributeValues: {
            ':email': data.email || conn.email,
            ':role': data.role || conn.role,
            ':userId': data.userId || conn.userId,
            ':expertId': data.expertId || conn.expertId,
          },
        }));
      }
      break;
    }

    // ── Call request notification ──────────────────────
    case 'call-request': {
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

      // Create room if it doesn't exist
      const existingRoom = await getRoom(roomId);
      if (!existingRoom) {
        await createRoom(roomId, connectionId, data.callRequestId || null);
      } else {
        await addToRoom(roomId, connectionId);
      }

      await updateConnectionRoom(connectionId, roomId);
      console.log(`${userEmail || connectionId} (${role}) joined room ${roomId}`);
      break;
    }

    // ── WebRTC signaling relay ─────────────────────────
    case 'offer':
    case 'answer':
    case 'ice-candidate': {
      const { roomName } = data;
      if (!roomName) break;
      await broadcastToRoom(endpoint, roomName, body, connectionId);
      break;
    }

    // ── Chat messages ──────────────────────────────────
    case 'send-chat-message': {
      const { roomName } = data;
      if (!roomName) break;
      await broadcastToRoom(endpoint, roomName, {
        action: 'chat-message',
        message: data.message,
      }, connectionId);
      break;
    }

    // ── Session extended (from backend) ────────────────
    case 'session-extended': {
      const { roomName, newExpiry, extendedBy } = data;
      if (!roomName) break;
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
      await broadcastToRoom(endpoint, roomName, {
        action: 'call-ended',
      }, connectionId);

      // Clean up room
      if (roomName) {
        await deleteRoom(roomName);
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
