/**
 * OAuth 2.0 Routes
 *
 * Handles the Ecwid OAuth flow:
 *   GET  /auth/install   → Redirect user to Ecwid OAuth consent page
 *   GET  /auth/callback  → Exchange authorization code for access token
 */

const express = require('express');

const router = express.Router();

/**
 * Step 1: Redirect the store owner to Ecwid's OAuth authorization page.
 * The user grants your app access to their store data.
 */
router.get('/install', (req, res) => {
  const { ECWID_CLIENT_ID, ECWID_REDIRECT_URI } = process.env;

  if (!ECWID_CLIENT_ID || !ECWID_REDIRECT_URI) {
    return res.status(500).send('OAuth not configured — set ECWID_CLIENT_ID and ECWID_REDIRECT_URI in .env');
  }

  // Only request scopes the app actually uses:
  //   read_store_profile  — read store metadata for storefront URL
  //   customize_storefront — inject optional storefront helper assets
  const scopes = [
    'read_store_profile',
    'customize_storefront',
  ].join('+');

  const authUrl =
    `https://my.ecwid.com/api/oauth/authorize` +
    `?client_id=${encodeURIComponent(ECWID_CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(ECWID_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=${scopes}`;

  res.redirect(authUrl);
});

/**
 * Step 2: Ecwid redirects back here with an authorization code.
 * Exchange it for an access token (server-side — client_secret is never exposed to browser).
 */
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    const tokenResponse = await fetch('https://my.ecwid.com/api/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.ECWID_CLIENT_ID,
        client_secret: process.env.ECWID_CLIENT_SECRET,
        code,
        redirect_uri: process.env.ECWID_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      // In the static-hosting deployment model (default), the admin
      // dashboard receives the access token through the EcwidApp iframe
      // payload — no server-side persistence is needed.
      //
      // If you adopt a backend, store the token securely here:
      //   await db.upsertToken(tokenData.store_id, tokenData.access_token);
      console.log('OAuth success — Store ID:', tokenData.store_id);

      res.send(
        '<h2>App installed successfully!</h2>' +
          '<p>You can close this tab and return to your Ecwid admin.</p>'
      );
    } else {
      console.error('OAuth token exchange failed:', tokenData);
      res.status(400).send('OAuth error — check server logs');
    }
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    res.status(500).send('Internal error during OAuth flow');
  }
});

module.exports = router;
