import crypto from 'crypto';

/**
 * Shared JWT verification module used by both server.js (local Socket.IO)
 * and lambda.js (AWS Lambda + API Gateway WebSocket).
 *
 * Single source of truth for HMAC signature verification and identity binding.
 */

/**
 * Decode a base64url-encoded string (JWT standard) to UTF-8.
 */
export function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

/**
 * Verify a JWT token's HMAC signature and expiry.
 *
 * @param {string} token - The JWT token to verify
 * @param {string|null} jwtSecret - Base64-encoded HMAC secret (null = disabled)
 * @returns {object|null} The decoded claims if valid, null otherwise
 */
export function verifyJwt(token, jwtSecret) {
  if (!jwtSecret) {
    console.warn('[SECURITY] JWT_SECRET not set — authentication is DISABLED.');
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const header = parts[0];
    const payloadPart = parts[1];
    const signature = parts[2];

    // Read algorithm from JWT header — Java JJWT auto-selects HS256/HS384/HS512
    // based on key size, so we must match it.
    const headerJson = JSON.parse(base64UrlDecode(header));
    const alg = headerJson.alg || 'HS256';
    const algoMap = { HS256: 'sha256', HS384: 'sha384', HS512: 'sha512' };
    const hashAlgo = algoMap[alg] || 'sha256';

    // Verify signature using the correct HMAC algorithm
    const data = `${header}.${payloadPart}`;
    const key = Buffer.from(jwtSecret, 'base64');
    const expectedSig = crypto
      .createHmac(hashAlgo, key)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    if (signature !== expectedSig) {
      console.warn(`[SECURITY] Invalid JWT signature (alg=${alg})`);
      return null;
    }

    const claims = JSON.parse(base64UrlDecode(payloadPart));

    // Check expiry
    if (claims.exp && claims.exp * 1000 < Date.now()) {
      console.warn('[SECURITY] Expired JWT token');
      return null;
    }

    return claims;
  } catch (err) {
    console.warn(`[SECURITY] JWT verification error: ${err.message}`);
    return null;
  }
}

/**
 * Dev-mode fallback: accepts tokens without cryptographic verification
 * when JWT_SECRET is not configured. ONLY for local development.
 */
export function verifyJwtWithDevFallback(token, jwtSecret) {
  if (!jwtSecret) {
    console.warn('[SECURITY] JWT_SECRET not set — DEV MODE (no verification). Set JWT_SECRET in production!');
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(base64UrlDecode(parts[1]));
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }
  return verifyJwt(token, jwtSecret);
}

/**
 * Extract a named cookie from Socket.IO handshake headers.
 * Socket.IO sends httpOnly cookies with the initial HTTP request.
 */
export function extractCookie(socketOrRequest, cookieName) {
  try {
    const raw = socketOrRequest?.handshake?.headers?.cookie
      || socketOrRequest?.request?.headers?.cookie
      || socketOrRequest?.headers?.cookie
      || '';
    if (!raw) return null;
    const cookies = Object.fromEntries(
      raw.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
    );
    return cookies[cookieName] || null;
  } catch {
    return null;
  }
}
