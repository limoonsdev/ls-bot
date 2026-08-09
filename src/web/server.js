/**
 * =====================================================
 * WEB SERVER - NEXT.JS CUSTOM SERVER
 * =====================================================
 */

const express = require('express');
const next = require('next');
const { getLogger } = require('../utils/logger');

const logger = getLogger();
const dev = process.env.NODE_ENV !== 'production';

// Initialize Next.js (dir points to project root)
const nextApp = next({ dev, dir: process.cwd() });
const handle = nextApp.getRequestHandler();

const app = express();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || '111111111111111111'; // Fallback to avoid crash if env missing
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3000/callback';

/**
 * OAuth2 Login Redirect
 */
app.get('/api/auth/login', (req, res) => {
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=identify`;
  res.redirect(authUrl);
});

/**
 * Callback handler - Removed old verification logic
 * Directs straight to dashboard as requested.
 */
app.get('/callback', (req, res) => {
  // Here you can handle the code if needed for dashboard login
  // For now, it just redirects to the frontend dashboard.
  res.redirect('/dashboard');
});

/**
 * Status endpoint
 */
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * Next.js catch-all route MUST be the last route
 */
app.all('*', (req, res) => {
  return handle(req, res);
});

/**
 * Start server
 */
async function startServer(port = 3000) {
  try {
    logger.info('WebServer', 'Preparing Next.js app...');
    await nextApp.prepare();
    
    return new Promise((resolve, reject) => {
      const server = app.listen(port, () => {
        logger.info('WebServer', `✅ Next.js + Express server started on port ${port}`, {
          port,
          dev
        });
        resolve(server);
      }).on('error', reject);
    });
  } catch (err) {
    logger.error('WebServer', 'Failed to start Next.js', { error: err.message });
    throw err;
  }
}

module.exports = { startServer, app };
