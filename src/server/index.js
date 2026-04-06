/**
 * Demo Ecwid Plugin — Express Server
 *
 * Entry point for the server-side Ecwid app.
 * Provides:
 *   - OAuth 2.0 install/callback flow
 *   - REST API proxy routes (products, settings)
 *   - Webhook event handler
 *   - Static file serving for admin dashboard (iframe)
 *   - Health check endpoint
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const EcwidApi = require('./services/ecwid-api');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const settingsRoutes = require('./routes/settings');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Ecwid API Client ─────────────────────────────────────
// Shared instance available via app.locals in route handlers
if (process.env.ECWID_STORE_ID && process.env.ECWID_API_TOKEN) {
  app.locals.ecwid = new EcwidApi(process.env.ECWID_STORE_ID, process.env.ECWID_API_TOKEN);
} else {
  console.warn('⚠ ECWID_STORE_ID or ECWID_API_TOKEN not set — API routes will fail. Check your .env file.');
}

// ─── Middleware ────────────────────────────────────────────
// Serve the admin dashboard (public/ directory) as static files
app.use(express.static(path.join(__dirname, '..', '..', 'public')));

// ─── Routes ───────────────────────────────────────────────
app.use('/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/webhooks/ecwid', webhookRoutes);

// ─── Health Check ─────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    plugin: 'demo-ecwid-plugin',
    storeConfigured: Boolean(process.env.ECWID_STORE_ID),
    timestamp: new Date().toISOString(),
  });
});

// ─── Start Server ─────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🚀 demo-ecwid-plugin server running at http://localhost:${PORT}\n`);
  console.log(`  Endpoints:`);
  console.log(`    Health:     GET  http://localhost:${PORT}/health`);
  console.log(`    Products:   GET  http://localhost:${PORT}/api/products`);
  console.log(`    Settings:   GET  http://localhost:${PORT}/api/settings?storeId=...`);
  console.log(`    OAuth:      GET  http://localhost:${PORT}/auth/install`);
  console.log(`    Webhooks:   POST http://localhost:${PORT}/webhooks/ecwid`);
  console.log(`    Dashboard:  GET  http://localhost:${PORT}/index.html\n`);
});
