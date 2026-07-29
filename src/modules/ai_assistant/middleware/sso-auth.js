/**
 * SSO Auto-Login Utility
 * 
 * Login ke SSO server di startup, dapetin token,
 * dan auto-refresh sebelum expired.
 * Token dipakai sebagai default Bearer token.
 */

const axios = require('axios');
const { Logger } = require('../../../utils/logger');
const logger = Logger;

const SSO_URL = process.env.SSO_SERVER_URL || 'http://localhost:9518';
const LOGIN_ENDPOINT = `${SSO_URL}/auth/sso/login`;
const LOGIN_USERNAME = process.env.SSO_USERNAME;
const LOGIN_PASSWORD = process.env.SSO_PASSWORD;
const REFRESH_BEFORE = 5 * 60 * 1000; // Refresh 5 menit sebelum expired

let ssoToken = null;
let tokenExpiry = null;
let refreshTimer = null;

/**
 * Login ke SSO server dan dapetin token
 */
const login = async () => {
  if (!LOGIN_USERNAME || !LOGIN_PASSWORD) {
    logger.warn('SSO_USERNAME atau SSO_PASSWORD tidak dikonfigurasi di .env');
    return null;
  }

  try {
    logger.info(`Logging in to SSO: ${LOGIN_ENDPOINT}`);
    const response = await axios.post(LOGIN_ENDPOINT, {
      email: LOGIN_USERNAME,
      password: LOGIN_PASSWORD,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    // Handle berbagai format response
    const data = response.data?.data || response.data;
    // Cari token di berbagai kemungkinan path
    const token = data?.oauth?.sso_token
      || data?.sso_token
      || data?.token
      || data?.access_token
      || data?.accessToken
      || data?.id_token
      || null;

    if (!token) {
      logger.warn('SSO login berhasil tapi token tidak ditemukan di response');
      return null;
    }

    ssoToken = token;

    // Parse expiry dari JWT kalo ada
    try {
      const jwtDecode = require('jwt-decode');
      const decoded = jwtDecode(token);
      if (decoded.exp) {
        tokenExpiry = decoded.exp * 1000;
        const expiresIn = Math.floor((tokenExpiry - Date.now()) / 1000 / 60);
        logger.info(`SSO login sukses. Token expires in ${expiresIn} minutes`);

        // Schedule auto-refresh
        scheduleRefresh();
      } else {
        tokenExpiry = null;
        logger.info('SSO login sukses (token tanpa expiry)');
      }
    } catch {
      tokenExpiry = null;
      logger.info('SSO login sukses (token didapat)');
    }

    return token;
  } catch (error) {
    const errMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    logger.error(`SSO login gagal: ${errMsg}`);
    ssoToken = null;
    tokenExpiry = null;
    return null;
  }
};

/**
 * Schedule auto-refresh token sebelum expired
 */
const scheduleRefresh = () => {
  if (refreshTimer) clearTimeout(refreshTimer);

  if (!tokenExpiry) return;

  const refreshAt = tokenExpiry - REFRESH_BEFORE - Date.now();
  if (refreshAt <= 0) {
    // Udah mepet, refresh sekarang
    refreshToken();
    return;
  }

  logger.info(`Token refresh scheduled in ${Math.floor(refreshAt / 1000 / 60)} minutes`);
  refreshTimer = setTimeout(refreshToken, refreshAt);
};

/**
 * Refresh token dengan login ulang
 */
const refreshToken = async () => {
  logger.info('Refreshing SSO token...');
  const result = await login();
  if (result) {
    logger.info('SSO token refreshed successfully');
  } else {
    logger.warn('SSO token refresh gagal, akan coba lagi dalam 1 menit');
    refreshTimer = setTimeout(refreshToken, 60 * 1000);
  }
};

/**
 * Get current SSO token
 */
const getToken = () => {
  return ssoToken;
};

/**
 * Check if token is available
 */
const isLoggedIn = () => {
  return ssoToken !== null;
};

/**
 * Stop refresh timer (cleanup)
 */
const stop = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
};

module.exports = {
  login,
  getToken,
  isLoggedIn,
  stop,
};
