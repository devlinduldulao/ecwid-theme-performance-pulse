/**
 * Webhook Routes
 *
 * Handles incoming webhook events from Ecwid.
 * Register your webhook URL in the Ecwid Partner Portal or via the API.
 *
 * Ecwid sends POST requests with JSON payloads for events like:
 *   - order.created, order.updated
 *   - product.created, product.updated, product.deleted
 *   - application.installed, application.uninstalled
 */

const express = require('express');

const router = express.Router();

router.post('/', express.json(), (req, res) => {
  const { eventType, storeId, entityId } = req.body;

  // Validate the webhook belongs to our store
  if (String(storeId) !== String(process.env.ECWID_STORE_ID)) {
    console.warn(`Webhook rejected — unknown store ID: ${storeId}`);
    return res.status(403).send('Invalid store');
  }

  console.log(`[webhook] ${eventType} — entity: ${entityId} — store: ${storeId}`);

  switch (eventType) {
    // ─── Order Events ───────────────────────────────────
    case 'order.created':
      handleOrderCreated(storeId, entityId);
      break;

    case 'order.updated':
      handleOrderUpdated(storeId, entityId);
      break;

    // ─── Product Events ─────────────────────────────────
    case 'product.created':
      handleProductCreated(storeId, entityId);
      break;

    case 'product.updated':
      handleProductUpdated(storeId, entityId);
      break;

    case 'product.deleted':
      handleProductDeleted(storeId, entityId);
      break;

    // ─── App Lifecycle Events ───────────────────────────
    case 'application.installed':
      handleAppInstalled(storeId);
      break;

    case 'application.uninstalled':
      handleAppUninstalled(storeId);
      break;

    default:
      console.log(`[webhook] Unhandled event type: ${eventType}`);
  }

  // Always respond 200 quickly — process async if needed
  res.status(200).send('OK');
});

// ─── Event Handlers ───────────────────────────────────────
// Replace these stubs with your business logic.

function handleOrderCreated(storeId, orderNumber) {
  console.log(`[order.created] New order #${orderNumber} in store ${storeId}`);
  // TODO: Fetch order details, send notifications, update external systems, etc.
}

function handleOrderUpdated(storeId, orderNumber) {
  console.log(`[order.updated] Order #${orderNumber} updated in store ${storeId}`);
  // TODO: Sync fulfillment status, update tracking, etc.
}

function handleProductCreated(storeId, productId) {
  console.log(`[product.created] Product ${productId} created in store ${storeId}`);
  // TODO: Sync to external catalog, update search index, etc.
}

function handleProductUpdated(storeId, productId) {
  console.log(`[product.updated] Product ${productId} updated in store ${storeId}`);
  // TODO: Sync changes to external systems
}

function handleProductDeleted(storeId, productId) {
  console.log(`[product.deleted] Product ${productId} deleted from store ${storeId}`);
  // TODO: Remove from external catalog
}

function handleAppInstalled(storeId) {
  console.log(`[app.installed] App installed on store ${storeId}`);
  // TODO: Provision resources, send welcome email, etc.
}

function handleAppUninstalled(storeId) {
  console.log(`[app.uninstalled] App uninstalled from store ${storeId}`);
  // TODO: Clean up resources, revoke tokens, etc.
}

module.exports = router;
