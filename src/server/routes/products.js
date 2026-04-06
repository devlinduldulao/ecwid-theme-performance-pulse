/**
 * Product Routes
 *
 * Proxy routes that expose Ecwid product data through your own API.
 * Useful for frontend dashboards, admin panels, or third-party integrations.
 */

const express = require('express');

const router = express.Router();

/**
 * GET /api/products
 * List products with optional pagination and search.
 *
 * Query params:
 *   - limit (default: 20, max: 100)
 *   - offset (default: 0)
 *   - keyword (optional search term)
 */
router.get('/', async (req, res) => {
  try {
    const data = await req.app.locals.ecwid.getProducts({
      limit: Math.min(Number(req.query.limit) || 20, 100),
      offset: Number(req.query.offset) || 0,
      ...(req.query.keyword && { keyword: req.query.keyword }),
    });
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch products:', error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

/**
 * GET /api/products/:id
 * Get a single product by ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const product = await req.app.locals.ecwid.getProduct(req.params.id);
    res.json(product);
  } catch (error) {
    console.error(`Failed to fetch product ${req.params.id}:`, error.message);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router;
