/**
 * SSO Token Verification Middleware
 * 
 * Memverifikasi token SSO dengan dua metode:
 * 1. Primary: Verifikasi ke SSO Server userinfo API (validasi real-time)
 * 2. Fallback: Decode JWT lokal jika SSO server tidak reachable
 */

const axios = require('axios');
const jwtDecode = require('jwt-decode');
const { Logger } = require('../../../utils/logger');
const logger = Logger;

const SSO_USERINFO_URL = process.env.SSO_SERVER_USERINFO_URL || 'http://localhost:9518/api/v1/auth/sso/userinfo';
const SSO_TIMEOUT = parseInt(process.env.SSO_TIMEOUT || '10000');

/**
 * Extract Bearer token dari Authorization header
 */
const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  
  return parts[1];
};

/**
 * Verifikasi token ke SSO Server userinfo API
 */
const verifyTokenWithSSO = async (token) => {
  try {
    const response = await axios.get(SSO_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: SSO_TIMEOUT,
    });

    if (response.status === 200 && response.data) {
      return {
        valid: true,
        user: response.data.data || response.data,
      };
    }
    
    return { valid: false, error: 'SSO server returned non-200 status' };
  } catch (error) {
    const errMsg = error.code === 'ECONNREFUSED' 
      ? 'SSO Server tidak merespon (koneksi ditolak)' 
      : error.message;
    logger.warn(`⚠️  ${errMsg}. Menggunakan JWT decode sebagai fallback.`);
    return null; // null = fallback to JWT decode
  }
};

/**
 * Fallback: Decode JWT lokal tanpa verifikasi signature
 */
const decodeJWT = (token) => {
  try {
    const decoded = jwtDecode(token);
    if (!decoded) {
      return { valid: false, error: 'Failed to decode JWT' };
    }
    
    // Check expiration
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return { valid: false, error: 'Token expired' };
    }

    return {
      valid: true,
      user: decoded,
    };
  } catch (error) {
    return { valid: false, error: `JWT decode error: ${error.message}` };
  }
};

/**
 * SSO Token Middleware
 * Wajib memiliki Bearer token di header Authorization.
 * Token diverifikasi ke SSO server, fallback ke JWT decode.
 */
const requireSSOToken = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'SSO token diperlukan. Kirim Authorization: Bearer <token>',
      });
    }

    // Try SSO server verification first
    const ssoResult = await verifyTokenWithSSO(token);
    
    if (ssoResult === null) {
      // SSO server unreachable, fallback to JWT decode
      const jwtResult = decodeJWT(token);
      
      if (!jwtResult.valid) {
        return res.status(401).json({
          success: false,
          message: `Token tidak valid: ${jwtResult.error}`,
        });
      }

      // Attach user info to request (dari JWT)
      req.user = jwtResult.user;
      req.authToken = token;
      req.isAuthenticated = true;
      req.authMethod = 'jwt-fallback';
      
      logger.info(`Authenticated via JWT fallback: ${jwtResult.user.sub || jwtResult.user.userId || 'unknown'}`);
      return next();
    }

    if (!ssoResult.valid) {
      return res.status(401).json({
        success: false,
        message: `Token SSO tidak valid: ${ssoResult.error}`,
      });
    }

    // Attach user info to request (dari SSO server)
    req.user = ssoResult.user;
    req.authToken = token;
    req.isAuthenticated = true;
    req.authMethod = 'sso-server';
    
    logger.info(`Authenticated via SSO server: ${ssoResult.user.sub || ssoResult.user.userId || ssoResult.user.employee_id || 'unknown'}`);
    next();
  } catch (error) {
    logger.error(`SSO middleware error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat verifikasi token SSO',
    });
  }
};

/**
 * SSO Token Middleware (Optional)
 * Jika tidak ada token, tetap lanjut sebagai anonymous user.
 */
const optionalSSOToken = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      req.user = null;
      req.authToken = null;
      req.isAuthenticated = false;
      return next();
    }

    // Try SSO verification, fallback to JWT decode
    const ssoResult = await verifyTokenWithSSO(token);
    let userData;

    if (ssoResult === null) {
      const jwtResult = decodeJWT(token);
      if (jwtResult.valid) {
        userData = jwtResult.user;
      }
    } else if (ssoResult.valid) {
      userData = ssoResult.user;
    }

    if (userData) {
      req.user = userData;
      req.authToken = token;
      req.isAuthenticated = true;
    } else {
      req.user = null;
      req.authToken = token;
      req.isAuthenticated = false;
    }

    next();
  } catch (error) {
    // On error, continue as anonymous
    req.user = null;
    req.authToken = null;
    req.isAuthenticated = false;
    next();
  }
};

module.exports = {
  requireSSOToken,
  optionalSSOToken,
  extractToken,
  verifyTokenWithSSO,
  decodeJWT,
};
