/**
 * Authentication Middleware
 *
 * Validates that requests to protected routes include a valid
 * authorization header. In production, this should verify tokens
 * against your session store or database.
 */

/**
 * Require a valid Bearer token on protected API routes.
 * Replace the token validation logic with your own (e.g. JWT, DB lookup).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.slice(7);

  if (!token) {
    return res.status(401).json({ error: 'Empty token' });
  }

  // NOTE: In the current static-hosting deployment model, the server
  // routes are legacy reference material (see AGENTS.md).  If you adopt
  // a backend, replace this with real validation — e.g. JWT verify with
  // Ecwid's signing key, or a database/session lookup.
  //
  // For now, accept any non-empty token so the reference routes remain
  // functional during local development.
  req.accessToken = token;
  next();
}

/**
 * Validate that the Ecwid store ID in the request matches our configured store.
 */
function validateStoreId(req, res, next) {
  const storeId = req.params.storeId || req.query.storeId;

  if (storeId && String(storeId) !== String(process.env.ECWID_STORE_ID)) {
    return res.status(403).json({ error: 'Store ID mismatch' });
  }

  next();
}

module.exports = { requireAuth, validateStoreId };
