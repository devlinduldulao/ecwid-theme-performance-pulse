/**
 * Settings Routes
 *
 * Manages app settings for the admin dashboard.
 * In production, persist settings in a database.
 * This boilerplate uses an in-memory store for demonstration.
 */

const express = require('express');

const router = express.Router();

// In-memory settings store — replace with database in production
const settingsStore = new Map();

/**
 * GET /api/settings?storeId=<id>
 * Load settings for a given store.
 */
router.get('/', (req, res) => {
  const { storeId } = req.query;

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId parameter' });
  }

  const settings = settingsStore.get(String(storeId)) || {
    featureEnabled: true,
    apiKey: '',
  };

  res.json(settings);
});

/**
 * POST /api/settings
 * Save settings for a given store.
 *
 * Body: { storeId, featureEnabled, apiKey, ... }
 */
router.post('/', express.json(), (req, res) => {
  const { storeId, ...settings } = req.body;

  if (!storeId) {
    return res.status(400).json({ error: 'Missing storeId in request body' });
  }

  settingsStore.set(String(storeId), settings);
  console.log(`[settings] Saved settings for store ${storeId}:`, settings);

  res.json({ success: true });
});

module.exports = router;
