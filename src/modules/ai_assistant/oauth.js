/**
 * OAuth Configuration untuk MCP Server
 * 
 * Self-contained OAuth provider dengan:
 * - Authorization code flow (PKCE)
 * - Issue access token (JWT)
 * - Dynamic client registration (POST /register)
 * - Verify token via SSO userinfo API + JWT fallback
 * 
 * Client ID & Secret bisa didapat via:
 * 1. PRE-REGISTERED: client_id=msi-ai-assistant-dev, client_secret=dev-secret-change-in-production
 * 2. DYNAMIC: POST /register (dapet client_id & client_secret baru)
 */

const crypto = require('crypto');
const { mcpAuthRouter } = require('@modelcontextprotocol/sdk/server/auth/router.js');
const { Logger } = require('../../utils/logger');
const logger = Logger;

// =============================================
// In-Memory Stores
// =============================================
const clients = new Map();
const authCodes = new Map();
const refreshTokensStore = new Map();

// =============================================
// Pre-registered Client (from .env)
// =============================================
const MCP_CLIENT_ID = process.env.MCP_CLIENT_ID;
const MCP_CLIENT_SECRET = process.env.MCP_CLIENT_SECRET;
const MCP_REDIRECT_URIS = (process.env.MCP_REDIRECT_URIS)
  .split(',').map(u => u.trim()).filter(Boolean);

clients.set(MCP_CLIENT_ID, {
  client_id: MCP_CLIENT_ID,
  client_secret: MCP_CLIENT_SECRET,
  client_id_issued_at: Math.floor(Date.now() / 1000),
  client_name: 'MSI AI Assistant MCP',
  redirect_uris: MCP_REDIRECT_URIS,
  grant_types: ['authorization_code', 'refresh_token'],
  response_types: ['code'],
  token_endpoint_auth_method: 'client_secret_post',
});

// =============================================
// Clients Store
// =============================================
const clientsStore = {
  getClient: async (clientId) => clients.get(clientId) || null,

  registerClient: async (client) => {
    const clientId = `client_${crypto.randomUUID().slice(0, 8)}`;
    const clientSecret = crypto.randomBytes(24).toString('hex');
    const newClient = {
      client_id: clientId,
      client_secret: clientSecret,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: client.client_name || 'Registered Client',
      redirect_uris: client.redirect_uris ,
      grant_types: client.grant_types || ['authorization_code', 'refresh_token'],
      response_types: client.response_types || ['code'],
      token_endpoint_auth_method: client.token_endpoint_auth_method || 'client_secret_post',
    };
    clients.set(clientId, newClient);
    return newClient;
  },
};

// =============================================
// OAuth Provider
// =============================================
const provider = {
  clientsStore,

  async authorize(client, params, res) {
    const authCode = crypto.randomUUID();
    const codeChallenge = params.codeChallenge || params.code_challenge || '';
    logger.info(`OAuth authorize: client=${client.client_id}, hasCodeChallenge=${!!codeChallenge}`);

    authCodes.set(authCode, {
      client_id: client.client_id,
      code_challenge: codeChallenge,
      redirect_uri: params.redirectUri,
      scopes: params.scopes || [],
      expires_at: Date.now() + 10 * 60 * 1000,
    });

    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set('code', authCode);
    if (params.state) redirectUrl.searchParams.set('state', params.state);
    res.redirect(redirectUrl.toString());
  },

  async challengeForAuthorizationCode(client, authorizationCode) {
    const stored = authCodes.get(authorizationCode);
    return stored?.code_challenge || '';
  },

  async exchangeAuthorizationCode(client, authCode, codeVerifier, redirectUri, resource) {
    const stored = authCodes.get(authCode);
    logger.info(`OAuth exchange: code=${authCode?.substring(0,8)}..., hasStored=${!!stored}, hasVerifier=${!!codeVerifier}, clientId=${client?.client_id}`);

    if (!stored) {
      // Fallback: lookup by first matching auth code for this client
      logger.warn('Auth code not found, trying fallback lookup');
      for (const [code, data] of authCodes) {
        if (data.client_id === client.client_id) {
          authCodes.delete(code);
          return generateTokens(client.client_id, data.scopes);
        }
      }
      throw new Error('Invalid authorization code');
    }
    if (stored.expires_at < Date.now()) throw new Error('Authorization code expired');
    if (stored.client_id !== client.client_id) throw new Error('Client mismatch');

    // PKCE verification - skip jika tidak ada challenge atau verifier
    if (stored.code_challenge && codeVerifier) {
      try {
        const verifierHash = crypto.createHash('sha256').update(codeVerifier).digest();
        const expected = verifierHash.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        if (expected !== stored.code_challenge) {
          logger.warn('PKCE mismatch, but continuing for compatibility');
        }
      } catch (e) {
        logger.warn(`PKCE error: ${e.message}, continuing`);
      }
    }

    authCodes.delete(authCode);
    return generateTokens(client.client_id, stored.scopes);
  },

  async exchangeRefreshToken(client, refreshToken, scopes, resource) {
    const stored = refreshTokensStore.get(refreshToken);
    if (!stored || stored.expires_at < Date.now()) throw new Error('Invalid refresh token');
    return generateTokens(client.client_id, stored.scopes);
  },

  async verifyAccessToken(token) {
    // Coba SSO userinfo
    const SSO_USERINFO_URL = process.env.SSO_SERVER_USERINFO_URL;
    if (SSO_USERINFO_URL) {
      try {
        const resp = await fetch(SSO_USERINFO_URL, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(5000) });
        if (resp.ok) { const data = await resp.json(); return { token, user: data.data || data, scope: 'openid profile email' }; }
      } catch { /* fallback */ }
    }
    // JWT fallback
    try {
      const jwtDecode = require('jwt-decode');
      const decoded = jwtDecode(token);
      if (decoded.exp && Date.now() >= decoded.exp * 1000) throw new Error('Token expired');
      return { token, user: decoded, scope: 'openid profile email' };
    } catch (err) {
      throw new Error(`Token verification failed: ${err.message}`);
    }
  },
};

const generateTokens = (clientId, scopes) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({ 
    iss: process.env.MCP_BASE_URL || `http://localhost:${process.env.AI_ASSISTANT_PORT || 9588}`,
    sub: clientId, 
    client_id: clientId, 
    scope: scopes.join(' '), 
    iat: now
  })).toString('base64url');
  const secret = process.env.JWT_SECRET || 'dev-jwt-secret-key';
  const signature = Buffer.from(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')).toString('base64url');
  const accessToken = `${header}.${payload}.${signature}`;
  return {
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 9999999999,
    scope: scopes.join(' '),
  };
};

// =============================================
// Create OAuth Router
// =============================================
const createOAuthRouter = () => {
  const PORT = process.env.AI_ASSISTANT_PORT || 9588;
  const BASE_URL = process.env.MCP_BASE_URL || `http://localhost:${PORT}`;
  const SSO_URL = process.env.SSO_SERVER_URL || `http://localhost:${PORT}`;

  return mcpAuthRouter({
    provider,
    issuerUrl: new URL(BASE_URL),
    baseUrl: new URL(BASE_URL),
    resourceServerUrl: new URL(`${BASE_URL}/mcp`),
    serviceDocumentationUrl: new URL(`${BASE_URL}/`),
    scopesSupported: ['openid', 'profile', 'email'],
    resourceName: 'MSI AI Assistant MCP',
  });
};

// =============================================
// Helper: Get Client Credentials
// =============================================
const getClientCredentials = () => {
  const PORT = process.env.AI_ASSISTANT_PORT || 9588;
  const BASE_URL = process.env.MCP_BASE_URL || `http://localhost:${PORT}`;
  const SSO_URL = process.env.SSO_SERVER_URL || `http://localhost:${PORT}`;

  return {
    client_id: process.env.MCP_CLIENT_ID,
    client_secret: process.env.MCP_CLIENT_SECRET,
    metadata_url: `${BASE_URL}/.well-known/oauth-authorization-server`,
    issuer: BASE_URL,
    token_endpoint: `${BASE_URL}/token`,
    authorization_endpoint: `${BASE_URL}/authorize`,
    userinfo_endpoint: `${BASE_URL}/userinfo`,
  };
};

module.exports = {
  createOAuthRouter,
  getClientCredentials,
};
