# Ecwid by Lightspeed — App & Storefront Development Quickstart Guide

> A step-by-step guide to set up an Ecwid app development environment and scaffold a production-ready project. Ecwid has **three development surfaces** — this guide covers all three so you can pick the one that fits your use case and start coding immediately.

| Surface | What It Is | When to Use |
|---------|-----------|-------------|
| **Storefront Customisation** | JavaScript API + CSS | Modify how the Ecwid widget looks and behaves on any website |
| **Ecwid App (Server-Side)** | Node.js/Python/PHP + REST API + OAuth | Build an app that reads/writes store data (products, orders, customers) |
| **Admin Dashboard App** | HTML/JS iframe in Ecwid admin | Create a settings page inside the Ecwid admin panel |

> **Critical concept:** Ecwid is a **SaaS JavaScript widget**. There is no backend to access, no database to query, no template files to override. The storefront renders itself from Ecwid's CDN. You can only customise it via CSS, the JavaScript Storefront API, and external REST API calls from your own server.

> **New option:** Ecwid now also has an official npm package, `@lightspeed/ecom-headless`, for browser or Node.js use. It provides a modern, typed client for **public, read-only storefront data access** and some storefront utilities. Treat it as a convenience layer for headless/public-token use cases, not as a replacement for OAuth-protected server-side REST API calls or the `EcwidApp` admin iframe SDK.

---

## Prerequisites

| Tool | Minimum Version | Purpose |
|------|----------------|---------|
| Node.js | 24+ (recommended 24 LTS) | Runtime for backend + build tools |
| npm | 11.x | Package management |
| Git | 2.x | Version control |
| A code editor | VS Code, WebStorm, etc. | Development |

Optional package:

- `@lightspeed/ecom-headless` — official Ecwid/Lightspeed headless SDK for typed, read-only public-token access in browser or Node.js projects

### Get Ecwid Credentials

1. Sign up for a free Ecwid account at https://www.ecwid.com/
2. Go to **Ecwid Control Panel → Developers → API keys** (or register at https://developers.ecwid.com/)
3. Note your:
   - **Store ID** (numeric)
   - **API Token** (for direct REST API access)
4. For app development, register an app at the **Ecwid Partner Portal** to get:
   - **Client ID**
   - **Client Secret**

---

# Path A — Storefront Customisation (JavaScript API + CSS)

Use this path to modify how the Ecwid storefront widget looks and behaves on any website. No server needed — this runs in the browser alongside the Ecwid widget.

---

## Step A1 — Create the Project

```bash
mkdir my-ecwid-storefront && cd my-ecwid-storefront
npm init -y
```

---

## Step A2 — Create a Test HTML Page

Create `index.html` — a simple page that embeds the Ecwid widget and your custom scripts:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Ecwid Store</title>
  <link rel="stylesheet" href="custom-storefront.css">
</head>
<body>
  <h1>My Store</h1>

  <!-- Ecwid storefront widget -->
  <div id="my-store-STORE_ID"></div>
  <script>
    xProductBrowser(
      "categoriesPerRow=3",
      "views=grid(20,3) list(60) table(60)",
      "categoryView=grid",
      "searchView=list",
      "id=my-store-STORE_ID"
    );
  </script>
  <script src="https://app.ecwid.com/script.js?STORE_ID" charset="utf-8"></script>

  <!-- Your custom JavaScript (loaded after Ecwid) -->
  <script src="custom-storefront.js"></script>
</body>
</html>
```

> Replace `STORE_ID` with your actual Ecwid store ID.

---

## Step A3 — Create Custom JavaScript (Storefront API)

Create `custom-storefront.js`:

```javascript
// Wait for the Ecwid API to be fully loaded
Ecwid.OnAPILoaded.add(function () {
  console.log('Ecwid storefront API is ready');
});

// React to page navigation
Ecwid.OnPageLoaded.add(function (page) {
  console.log('Page loaded:', page.type);

  switch (page.type) {
    case 'CATEGORY':
      console.log('Category ID:', page.categoryId);
      break;
    case 'PRODUCT':
      console.log('Product ID:', page.productId);
      onProductPage(page.productId);
      break;
    case 'CART':
      console.log('Cart page loaded');
      break;
    case 'ORDER_CONFIRMATION':
      console.log('Order placed:', page.orderNumber);
      break;
  }
});

// Example: add a custom badge to product pages
function onProductPage(productId) {
  setTimeout(function () {
    var title = document.querySelector('.product-details__product-title');
    if (title && !document.querySelector('.custom-badge')) {
      var badge = document.createElement('span');
      badge.className = 'custom-badge';
      badge.textContent = 'NEW';
      title.appendChild(badge);
    }
  }, 500);
}

// Listen for cart changes
Ecwid.OnCartChanged.add(function (cart) {
  console.log('Cart updated — items:', cart.productsQuantity, 'total:', cart.total);
});

// Listen for order placement (useful for analytics)
Ecwid.OnOrderPlaced.add(function (order) {
  console.log('Order #' + order.orderNumber + ' placed, total: ' + order.total);
});
```

### Optional — Use the official headless SDK instead of raw fetch for public data

If you want typed access to public storefront data in a custom frontend, you can install Ecwid's newer npm package:

```bash
npm install @lightspeed/ecom-headless
```

```javascript
import {
  getStoreProfile,
  initStorefrontApi,
} from '@lightspeed/ecom-headless/api';
import { getStoreId } from '@lightspeed/ecom-headless/storefront';

initStorefrontApi({
  publicToken: 'YOUR_PUBLIC_TOKEN',
  storeId: 'YOUR_STORE_ID',
  baseURL: 'https://app.ecwid.com/api/v3/',
});

async function loadStoreProfile() {
  const storeId = await getStoreId();
  const response = await getStoreProfile({ storeId });
  console.log(response);
}

loadStoreProfile().catch(console.error);
```

Use this SDK when you need typed, public storefront reads in JavaScript or TypeScript. Keep using the JavaScript Storefront API for widget lifecycle events and UI hooks such as `Ecwid.OnPageLoaded`, `Ecwid.Cart`, and `Ecwid.OnOrderPlaced`.

---

## Step A4 — Create Custom CSS

Create `custom-storefront.css`:

```css
/* Product card styling */
.ecwid-productBrowser .grid-product__title-inner {
  font-weight: 700;
  color: #1a1a1a;
}

.ecwid-productBrowser .grid-product__price {
  color: #e74c3c;
  font-size: 1.2em;
}

/* Custom badge added by JavaScript */
.custom-badge {
  background: #e74c3c;
  color: #fff;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-size: 0.6em;
  vertical-align: middle;
}

/* Checkout button */
.ecwid-productBrowser .ec-cart__button--checkout {
  background-color: #27ae60;
  border-radius: 8px;
}

/* Hide SKU on product pages (example) */
.ecwid-productBrowser .product-details__product-sku {
  display: none;
}
```

---

## Step A5 — Serve Locally and Test

```bash
npx serve .
```

Open `http://localhost:3000` — you should see your Ecwid store with custom styles and JavaScript behaviour.

---

## Step A6 — Deploy to Production

In production, your custom CSS and JS are injected into the Ecwid store via:

1. **Ecwid Control Panel → Design → Custom CSS** — paste your CSS
2. **Ecwid Control Panel → Design → Custom JavaScript** — paste your JS
3. Or, for apps: request the `customize_storefront` scope and inject via the App API

---

## Step A7 — Initialize Git

```bash
git init
echo "node_modules/" > .gitignore
git add .
git commit -m "[storefront] Initial Ecwid storefront customisation"
```

---

# Path B — Ecwid App (Server-Side with REST API)

Use this path to build an external app that reads and writes Ecwid store data (products, orders, customers) via the REST API v3 and processes webhooks.

`@lightspeed/ecom-headless` can also run in Node.js, but it is still positioned as a public, read-only SDK. For private data, write operations, OAuth scopes, and merchant app installs, keep using your server plus the REST API and OAuth flow described below.

---

## Step B1 — Create the Project

```bash
mkdir my-ecwid-app && cd my-ecwid-app
npm init -y
```

---

## Step B2 — Install Dependencies

```bash
npm install express dotenv
npm install --save-dev nodemon
```

---

## Step B3 — Create the Project Structure

```bash
mkdir -p src/routes src/services src/middleware
```

```
my-ecwid-app/
├── src/
│   ├── index.js                     # Express server entry point
│   ├── routes/
│   │   ├── auth.js                  # OAuth 2.0 callback
│   │   ├── products.js              # Product API proxy routes
│   │   └── webhooks.js              # Webhook handler
│   ├── services/
│   │   └── ecwid-api.js             # Ecwid REST API client
│   └── middleware/
│       └── auth.js                  # Token validation middleware
├── public/
│   └── index.html                   # App dashboard page (for admin iframe)
├── .env                             # Credentials (gitignored)
├── .gitignore
├── package.json
└── README.md
```

---

## Step B4 — Configure Environment Variables

Create `.env`:

```env
PORT=3000
ECWID_STORE_ID=your_store_id
ECWID_API_TOKEN=your_api_token
ECWID_CLIENT_ID=your_client_id
ECWID_CLIENT_SECRET=your_client_secret
ECWID_REDIRECT_URI=http://localhost:3000/auth/callback
```

---

## Step B5 — Create the Ecwid REST API Client

Create `src/services/ecwid-api.js`:

```javascript
const BASE_URL = 'https://app.ecwid.com/api/v3';

class EcwidApi {
  constructor(storeId, token) {
    this.storeId = storeId;
    this.token = token;
    this.base = `${BASE_URL}/${storeId}`;
  }

  async request(endpoint, options = {}) {
    const url = `${this.base}${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${this.token}`;
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ecwid API error ${response.status}: ${error}`);
    }

    if (response.status === 204) return null;
    return response.json();
  }

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/products${query ? '?' + query : ''}`);
  }

  async getProduct(productId) {
    return this.request(`/products/${productId}`);
  }

  async createProduct(data) {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(productId, data) {
    return this.request(`/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProduct(productId) {
    return this.request(`/products/${productId}`, { method: 'DELETE' });
  }

  // Orders
  async getOrders(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/orders${query ? '?' + query : ''}`);
  }

  async getOrder(orderNumber) {
    return this.request(`/orders/${orderNumber}`);
  }

  async updateOrder(orderNumber, data) {
    return this.request(`/orders/${orderNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Customers
  async getCustomers(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/customers${query ? '?' + query : ''}`);
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }
}

module.exports = EcwidApi;
```

---

## Step B6 — Create the OAuth 2.0 Route

Create `src/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();

// Step 1: Redirect user to Ecwid OAuth page
router.get('/install', (req, res) => {
  const authUrl = `https://my.ecwid.com/api/oauth/authorize?` +
    `client_id=${process.env.ECWID_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.ECWID_REDIRECT_URI)}` +
    `&response_type=code` +
    `&scope=read_store_profile+read_catalog+update_catalog+read_orders+update_orders`;

  res.redirect(authUrl);
});

// Step 2: Handle OAuth callback — exchange code for token
router.get('/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

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
    // Store the access_token and store_id securely (database, encrypted file, etc.)
    console.log('Store ID:', tokenData.store_id);
    console.log('Access Token:', tokenData.access_token);
    res.send('App installed successfully! You can close this tab.');
  } else {
    res.status(400).send('OAuth error: ' + JSON.stringify(tokenData));
  }
});

module.exports = router;
```

---

## Step B7 — Create the Webhook Handler

Create `src/routes/webhooks.js`:

```javascript
const express = require('express');
const router = express.Router();

router.post('/', express.json(), (req, res) => {
  const { eventType, storeId, entityId } = req.body;

  // Validate the webhook belongs to your store
  if (String(storeId) !== process.env.ECWID_STORE_ID) {
    return res.status(403).send('Invalid store');
  }

  console.log(`Webhook received: ${eventType} for entity ${entityId}`);

  switch (eventType) {
    case 'order.created':
      console.log('New order:', entityId);
      // Process new order...
      break;
    case 'order.updated':
      console.log('Order updated:', entityId);
      break;
    case 'product.created':
    case 'product.updated':
      console.log('Product changed:', entityId);
      break;
    case 'product.deleted':
      console.log('Product deleted:', entityId);
      break;
    case 'application.installed':
      console.log('App installed on store:', storeId);
      break;
    case 'application.uninstalled':
      console.log('App uninstalled from store:', storeId);
      break;
  }

  res.status(200).send('OK');
});

module.exports = router;
```

---

## Step B8 — Create the Express Server

Create `src/index.js`:

```javascript
require('dotenv').config();

const express = require('express');
const path = require('path');
const EcwidApi = require('./services/ecwid-api');
const authRoutes = require('./routes/auth');
const webhookRoutes = require('./routes/webhooks');

const app = express();
const PORT = process.env.PORT || 3000;

// Ecwid API client
const ecwid = new EcwidApi(process.env.ECWID_STORE_ID, process.env.ECWID_API_TOKEN);

// Serve static files (for admin dashboard iframe page)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.use('/auth', authRoutes);
app.use('/webhooks/ecwid', webhookRoutes);

// Example API proxy route: list products
app.get('/api/products', async (req, res) => {
  try {
    const data = await ecwid.getProducts({
      limit: req.query.limit || 20,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example API proxy route: get single product
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await ecwid.getProduct(req.params.id);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Ecwid app server running on http://localhost:${PORT}`);
});
```

---

## Step B9 — Add Scripts to package.json

Update `package.json`:

```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "echo \"No tests yet\" && exit 0"
  }
}
```

---

## Step B10 — Start Development Server

```bash
npm run dev
```

Test:
- Health check: `http://localhost:3000/health`
- Products: `http://localhost:3000/api/products`
- OAuth install: `http://localhost:3000/auth/install`

---

## Step B11 — Initialize Git

Create `.gitignore`:

```gitignore
node_modules/
.env
```

```bash
git init
git add .
git commit -m "[app] Initial Ecwid app scaffold"
```

---

# Path C — Admin Dashboard App (Ecwid Admin Iframe)

Use this path to create a settings/configuration page that appears inside the Ecwid admin panel when merchants install your app.

---

## Step C1 — Create the Dashboard Page

Create `public/index.html` (this is served inside the Ecwid admin iframe):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Ecwid App</title>
  <!-- Ecwid App UI CSS Framework -->
  <link rel="stylesheet" href="https://djqizrxa6f10j.cloudfront.net/ecwid-sdk/css/1.3.20/ecwid-app-ui.css">
  <script src="https://djqizrxa6f10j.cloudfront.net/ecwid-sdk/js/1.2.9/ecwid-app.js"></script>
</head>
<body>
  <div class="a-card">
    <div class="a-card__header">
      <h2>My App Settings</h2>
    </div>
    <div class="a-card__body">
      <div class="form-area">
        <div class="form-area__title">Configuration</div>

        <!-- Toggle -->
        <label class="field-toggle active">
          <input type="checkbox" id="feature-enabled" checked>
          <div class="field-toggle__body">Enable Feature</div>
        </label>

        <!-- Text input -->
        <div class="a-card__body__item">
          <label class="field-label" for="api-key">API Key</label>
          <input type="text" id="api-key" class="field-input" placeholder="Enter your API key">
        </div>

        <!-- Save button -->
        <div class="a-card__body__item" style="margin-top: 16px;">
          <button id="save-btn" class="btn btn-default btn-medium">Save Settings</button>
        </div>
      </div>

      <!-- Status message -->
      <div id="status-message" style="margin-top: 12px;"></div>
    </div>
  </div>

  <script>
    // Initialize the Ecwid App SDK
    var app = EcwidApp.init({ appId: 'my-app-id' });

    // Get the store's payload (store ID, access token, app state)
    app.getPayload(function (payload) {
      var storeId = payload.store_id;
      var accessToken = payload.access_token;
      var language = payload.lang;

      console.log('Store ID:', storeId);
      console.log('Language:', language);

      // Load saved settings from your backend
      loadSettings(storeId, accessToken);
    });

    // Save button click
    document.getElementById('save-btn').addEventListener('click', function () {
      var settings = {
        featureEnabled: document.getElementById('feature-enabled').checked,
        apiKey: document.getElementById('api-key').value,
      };

      // Save to your backend
      saveSettings(settings);
    });

    function loadSettings(storeId, accessToken) {
      // Fetch settings from your server
      fetch('/api/settings?storeId=' + storeId)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.featureEnabled !== undefined) {
            document.getElementById('feature-enabled').checked = data.featureEnabled;
          }
          if (data.apiKey) {
            document.getElementById('api-key').value = data.apiKey;
          }
        })
        .catch(function () {
          console.log('No saved settings — using defaults');
        });
    }

    function saveSettings(settings) {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
        .then(function () {
          document.getElementById('status-message').innerHTML =
            '<div class="a-alert a-alert--success">Settings saved!</div>';
        })
        .catch(function () {
          document.getElementById('status-message').innerHTML =
            '<div class="a-alert a-alert--error">Error saving settings.</div>';
        });
    }
  </script>
</body>
</html>
```

---

## Step C2 — Register the Dashboard in Ecwid

1. Go to the **Ecwid Partner Portal** (https://developers.ecwid.com/)
2. Edit your app settings
3. Under **App page URL**, enter your server URL (e.g., `https://your-app.com/index.html`)
4. The page will be loaded inside an iframe in the Ecwid admin

---

## Step C3 — The `EcwidApp` SDK Reference

`EcwidApp` is the SDK for the Ecwid admin iframe experience. It is separate from `@lightspeed/ecom-headless`:

- Use `EcwidApp` when your page runs inside Ecwid admin and needs the install payload, app state, iframe resizing, or admin context.
- Use `@lightspeed/ecom-headless` when you need typed, public storefront data access in a browser or Node.js integration.
- Use your own backend plus OAuth-protected REST API calls when you need write access or private merchant data.

```javascript
// Initialize
var app = EcwidApp.init({ appId: 'my-app-id' });

// Get store payload (runs once when iframe loads)
app.getPayload(function (payload) {
  // payload.store_id — Store ID (number)
  // payload.access_token — OAuth access token (string)
  // payload.lang — Store admin language (e.g., 'en')
  // payload.public_token — Public storefront token
});

// Listen for Ecwid admin events
app.onResize(function () {
  // Called when the iframe is resized
});

// Set iframe height (auto-resize)
EcwidApp.setSize({ height: document.body.scrollHeight });
```

---

# Quick Reference — All Three Paths

## Final File Checklists

### Storefront Customisation

```
my-ecwid-storefront/
├── index.html                   ✅ Test page with Ecwid widget embed
├── custom-storefront.js         ✅ JavaScript API event handlers + DOM manipulation
├── custom-storefront.css        ✅ Custom CSS for Ecwid widget
├── .gitignore                   ✅ Git ignore
└── package.json                 ✅ (minimal — for npx serve and tooling)
```

### Ecwid App (Server-Side)

```
my-ecwid-app/
├── src/
│   ├── index.js                 ✅ Express server entry point
│   ├── routes/
│   │   ├── auth.js              ✅ OAuth 2.0 install + callback
│   │   └── webhooks.js          ✅ Webhook event handler
│   ├── services/
│   │   └── ecwid-api.js         ✅ REST API v3 client wrapper
│   └── middleware/              📁 (ready for auth validation, etc.)
├── public/
│   └── index.html               ✅ Admin dashboard page (iframe)
├── .env                         ✅ Credentials (gitignored)
├── .gitignore                   ✅ Git ignore
└── package.json                 ✅ Dependencies + scripts
```

### Admin Dashboard (iframe page)

```
public/
└── index.html                   ✅ Ecwid App UI (CSS framework + EcwidApp SDK)
```

---

## What to Build Next

### Storefront Customisation Tasks

| Task | Where to Start |
|------|---------------|
| Add a promo banner to product pages | `Ecwid.OnPageLoaded.add()` → check `page.type === 'PRODUCT'` → inject DOM |
| Style the checkout button | CSS: `.ecwid-productBrowser .ec-cart__button--checkout { ... }` |
| Track analytics events | `Ecwid.OnOrderPlaced.add()` → send to Google Analytics, Facebook Pixel, etc. |
| Custom "Add to Cart" behaviour | `Ecwid.Cart.addProduct()` with `callback` |
| Modify category page layout | CSS grid/flexbox on `.ecwid-productBrowser .grid-product` containers |

### App (Server-Side) Tasks

| Task | Where to Start |
|------|---------------|
| Sync products to external system | Use `ecwid.getProducts()` + pagination loop, or webhook `product.updated` |
| Process orders automatically | Webhook `order.created` → `ecwid.getOrder()` → fulfillment logic |
| Bulk update product prices | Loop `ecwid.getProducts()` → `ecwid.updateProduct()` for each |
| Create discount coupons | REST API: `POST /discount_coupons` with `read_discount_coupons` + `update_discount_coupons` scopes |
| Add a settings page | Create HTML page → use `EcwidApp.init()` → persist settings in your database |

### Admin Dashboard Tasks

| Task | Where to Start |
|------|---------------|
| Add form inputs | Use Ecwid App UI CSS classes: `.field-input`, `.field-toggle`, `.field-select` |
| Save settings persistently | POST settings to your backend API → store in database |
| Show store data in dashboard | `app.getPayload()` → use `access_token` to call REST API → render in iframe |
| Auto-resize iframe | `EcwidApp.setSize({ height: document.body.scrollHeight })` |

---

## API Rate Limits & Pagination

```javascript
// Ecwid returns paginated results — max 100 items per request
async function getAllProducts(ecwid) {
  const allProducts = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const response = await ecwid.getProducts({ offset, limit });
    allProducts.push(...response.items);

    if (response.items.length < limit) break;
    offset += limit;
  }

  return allProducts;
}

// Rate limiting: ~20 requests/second for published apps
// Handle 429 responses with exponential backoff
```

---

## Key Reminders

- **SaaS widget — no backend, no database, no templates.** Ecwid renders its own storefront. You cannot create controllers, models, template files, or database tables inside Ecwid.
- **REST API for data, JS API for storefront, CSS for styling.** These are the only three surfaces. There is nothing else.
- **`@lightspeed/ecom-headless` is a client library, not a fourth platform surface.** It wraps a subset of public storefront API access with typed browser/Node.js helpers.
- **Never expose `client_secret` or API tokens in browser code.** OAuth token exchange and API calls with secret tokens must happen server-side.
- **`Ecwid.OnAPILoaded` before any JS API call.** Always wait for the API to be ready before calling `Ecwid.Cart.get()`, `Ecwid.openPage()`, etc.
- **Scope CSS to `.ecwid-productBrowser`.** Ecwid's widget DOM uses this root class — scope your styles to avoid leaking into the host page.
- **Pagination is required.** The API returns max 100 items per request. Always loop with `offset` + `limit` for complete data.
- **Handle 429 rate limits.** Implement retry logic with backoff for burst API calls.
- **Ecwid is NOT Shopify, NOT WooCommerce, NOT OpenCart.** No Liquid templates, no PHP hooks, no `$this->db->query()`, no Eloquent. REST API + JavaScript. That's it.
- **`EcwidApp.init()` for admin iframes.** Always initialize with your app ID to receive the store payload (store_id, access_token).
- **Webhooks need a public URL.** Use ngrok or a deployed server for testing webhooks locally.
