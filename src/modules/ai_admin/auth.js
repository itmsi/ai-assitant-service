/**
 * Autentikasi UI admin AI
 * Login memakai ADMIN_USERNAME / ADMIN_PASSWORD dari .env, token JWT ditandatangani JWT_SECRET
 */

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const TOKEN_SCOPE = 'ai-admin';
const TOKEN_EXPIRES_IN = process.env.AI_ADMIN_TOKEN_EXPIRES_IN || '12h';

const getSecret = () => process.env.AI_ADMIN_JWT_SECRET || process.env.JWT_SECRET || '';

// Bandingkan lewat hash agar waktu perbandingan tidak bergantung panjang/isi input
const safeEqual = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const isConfigured = () => Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD && getSecret());

const login = (username, password) => {
  if (!isConfigured()) {
    const error = new Error('Login admin belum dikonfigurasi (ADMIN_USERNAME, ADMIN_PASSWORD, JWT_SECRET)');
    error.status = 503;
    throw error;
  }
  const userOk = safeEqual(username || '', process.env.ADMIN_USERNAME);
  const passOk = safeEqual(password || '', process.env.ADMIN_PASSWORD);
  if (!userOk || !passOk) {
    const error = new Error('Username atau password salah');
    error.status = 401;
    throw error;
  }
  return jwt.sign({ sub: process.env.ADMIN_USERNAME, scope: TOKEN_SCOPE }, getSecret(), {
    expiresIn: TOKEN_EXPIRES_IN,
  });
};

const requireAdmin = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !getSecret()) {
    return res.status(401).json({ success: false, message: 'Silakan login terlebih dahulu' });
  }
  try {
    const payload = jwt.verify(token, getSecret());
    if (payload.scope !== TOKEN_SCOPE) throw new Error('scope');
    req.admin = { username: payload.sub };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi login tidak valid atau kedaluwarsa' });
  }
};

module.exports = {
  login,
  requireAdmin,
};
