# Theme Performance Pulse for Ecwid

Static Ecwid admin app for business owners who want a performance dashboard in their store admin without paying for a database, Redis, or a hosted Node.js server.

## What changed

The Ecwid repo is no longer positioned as a hosted integration starter. It now targets the cheapest workable owner dashboard:

- business owners save audit targets from the Ecwid admin page
- the dashboard runs on-demand PageSpeed audits against storefront URLs
- merchants can toggle a preview demo mode with fake sample results to review the UI before running live audits
- store settings are saved in Ecwid app storage under the reserved `public` key when available
- any optional PageSpeed API key stays only in the merchant browser
- no database, queue, Redis, or always-on API server is required

## Constraint to understand up front

Ecwid supports a static admin app and store-scoped app configuration, but it does not give this project a free, safe, centralized analytics backend.

That means this repo supports:

- store-scoped owner settings
- on-demand URL audits from the admin dashboard
- static hosting for the app page and optional storefront assets

It does not support, without extra infrastructure:

- cross-visitor live monitoring
- long-term audit history shared across devices
- webhook-driven automations
- private REST proxying

## Project structure

```text
theme-performance-pulse/
├── public/
│   ├── index.html                 # Owner dashboard for Ecwid admin
│   └── storefront-test.html       # Optional storefront harness retained for local testing
├── src/
│   ├── admin/
│   │   └── app.js                 # Owner dashboard logic + PageSpeed audit runner
│   ├── shared/
│   │   ├── dashboard-core.js      # Shared audit config and PageSpeed result summarization
│   │   └── pulse-core.js          # Legacy storefront event logic retained as optional reference
│   ├── storefront/
│   │   ├── custom-storefront.css  # Optional storefront helper styling
│   │   └── custom-storefront.js   # Optional storefront helper script
│   └── server/                    # Legacy hosted-app reference, not required for deployment
├── scripts/
│   ├── build.js                   # Static build output into dist/
│   └── smoke-test.js              # Static smoke checks
├── tests/
│   ├── dashboard-core.test.js     # Unit coverage for audit config and summaries
│   └── pulse-core.test.js         # Unit coverage for the shared monitoring core
└── docs/
```

## Quick start

```bash
npm install
npm run build
npm run publish:bundle
npm run preview
```

Then open:

- `http://localhost:4173/public/index.html`
- `http://localhost:4173/public/storefront-test.html`

The storefront test page is optional now. The main product is the admin dashboard in `public/index.html`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Copy the static app into `dist/` for deployment |
| `npm run publish:bundle` | Build `dist/`, copy marketplace screenshots, render icon/banner PNG assets, and assemble a release-ready bundle in `publish/` |
| `npm run preview` | Serve the project root as a static site on port 4173 |
| `npm run storefront` | Serve the same static assets on port 5000 |
| `npm run lint` | Lint source, scripts, and tests |
| `npm test` | Run unit tests and static smoke checks |

## How the owner dashboard works

### 1. Owner settings

The merchant configures:

- storefront base URL
- audit target URLs such as homepage, category, product, and cart
- device strategy: mobile or desktop
- optional PageSpeed API key kept only in the current browser

### 2. Audit runner

`src/admin/app.js` calls the public PageSpeed Insights API directly from the browser and summarizes:

- performance score
- accessibility score
- best-practices score
- SEO score
- LCP, CLS, INP, and TBT
- highest-signal optimization opportunities

### 3. Preview mode

The owner can toggle `Preview Demo` to load browser-local sample data that simulates a healthy homepage, watch-list category/cart pages, and a weaker product page. This helps the merchant review the dashboard layout before running a live audit.

### 4. Store-scoped persistence

When the page is loaded inside Ecwid admin, non-sensitive owner settings are stored in Ecwid app storage. Outside Ecwid, the page falls back to browser-local storage for development and preview.

### 5. Static deployment

Everything ships as static files. `npm run build` copies the deployable app into `dist/`.

## Recommended deployment

Host the repository as static files on a free host such as GitHub Pages, Netlify, or Cloudflare Pages, then configure your Ecwid app to use:

- app page URL: `https://your-host/public/index.html`

Optional storefront helper URLs can still point at:

- `https://your-host/src/storefront/custom-storefront.js`
- `https://your-host/src/storefront/custom-storefront.css`

If you are not using a custom app yet, you can still host the dashboard as a standalone page for testing before wiring it into Ecwid.

## When you would still need a backend

Add a real backend only if you need one of these:

- centralized history across users and devices
- scheduled background audits
- private API access beyond app storage
- webhooks or order/product automations

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/API.md](docs/API.md)
- [docs/PUBLISHING.md](docs/PUBLISHING.md)
- [docs/PRIVACY.md](docs/PRIVACY.md)
- [docs/RELEASING.md](docs/RELEASING.md)
- [docs/SUPPORT.md](docs/SUPPORT.md)

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the architecture.

## Development

See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full development guide.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for deployment instructions.

---

## Ecwid Resources

### Getting Started

| Resource | Link |
|----------|------|
| Ecwid Developer Portal (register apps) | https://developers.ecwid.com/ |
| App Development Guide | https://api-docs.ecwid.com/docs/get-started |
| Ecwid App Market (see published apps) | https://www.ecwid.com/apps |
| Sign Up for Free Ecwid Account | https://www.ecwid.com/ |
| Ecwid Control Panel (store admin) | https://my.ecwid.com/ |

### REST API v3

| Resource | Link |
|----------|------|
| API Overview & Reference | https://api-docs.ecwid.com/reference/overview |
| Products API | https://api-docs.ecwid.com/reference/products |
| Orders API | https://api-docs.ecwid.com/reference/orders |
| Customers API | https://api-docs.ecwid.com/reference/customers |
| Categories API | https://api-docs.ecwid.com/reference/categories |
| Discount Coupons API | https://api-docs.ecwid.com/reference/discount-coupons |
| Store Profile API | https://api-docs.ecwid.com/reference/store-profile |
| Product Variations API | https://api-docs.ecwid.com/reference/product-variations |
| Abandoned Carts API | https://api-docs.ecwid.com/reference/abandoned-carts |
| Shipping Options API | https://api-docs.ecwid.com/reference/shipping-options |
| Tax Settings API | https://api-docs.ecwid.com/reference/taxes |
| Application Storage API | https://api-docs.ecwid.com/reference/storage |
| Starter Site API | https://api-docs.ecwid.com/reference/starter-site |

### Authentication & Security

| Resource | Link |
|----------|------|
| OAuth 2.0 Authentication | https://api-docs.ecwid.com/docs/authentication |
| Access Scopes Reference | https://api-docs.ecwid.com/docs/access-scopes |
| API Tokens & Keys | https://api-docs.ecwid.com/docs/api-tokens |

### Storefront Customisation

| Resource | Link |
|----------|------|
| JavaScript Storefront API | https://api-docs.ecwid.com/docs/customize-storefront |
| Storefront JS API Reference | https://api-docs.ecwid.com/docs/storefront-js-api-reference |
| Custom CSS for Storefront | https://api-docs.ecwid.com/docs/customize-appearance |
| Page Events (OnPageLoaded, etc.) | https://api-docs.ecwid.com/docs/page-events |
| Cart Methods (add, remove, get) | https://api-docs.ecwid.com/docs/cart-methods |
| Public App Config (storefront injection) | https://api-docs.ecwid.com/docs/public-app-config |
| SEO for Ecwid Stores | https://api-docs.ecwid.com/docs/seo |

### App Development

| Resource | Link |
|----------|------|
| Native Apps (admin iframe) | https://api-docs.ecwid.com/docs/native-apps |
| Ecwid App UI CSS Framework | https://api-docs.ecwid.com/docs/ecwid-css-framework |
| EcwidApp JS SDK Reference | https://api-docs.ecwid.com/docs/ecwidapp-js-sdk |
| App Storage (key-value per store) | https://api-docs.ecwid.com/docs/app-storage |
| Webhooks | https://api-docs.ecwid.com/docs/webhooks |
| Webhook Events Reference | https://api-docs.ecwid.com/docs/webhook-events |
| Custom Shipping Methods | https://api-docs.ecwid.com/docs/add-shipping-method |
| Custom Payment Methods | https://api-docs.ecwid.com/docs/add-payment-method |
| Custom Discount Logic | https://api-docs.ecwid.com/docs/add-custom-discount |
| App Listing Requirements | https://api-docs.ecwid.com/docs/app-listing-requirements |

### Embedding & Widgets

| Resource | Link |
|----------|------|
| Add Ecwid to Any Website | https://api-docs.ecwid.com/docs/add-ecwid-to-a-site |
| Product Browser Widget Config | https://api-docs.ecwid.com/docs/product-browser |
| Buy Now Buttons | https://api-docs.ecwid.com/docs/buy-now-buttons |
| Single Sign-On (SSO) | https://api-docs.ecwid.com/docs/single-sign-on |

### Guides & Tutorials

| Resource | Link |
|----------|------|
| API Rate Limits | https://api-docs.ecwid.com/docs/rate-limits |
| Error Codes Reference | https://api-docs.ecwid.com/docs/errors |
| Testing Your App | https://api-docs.ecwid.com/docs/testing |
| Publishing to App Market | https://api-docs.ecwid.com/docs/publishing |
| Ecwid Community Forum | https://community.ecwid.com/ |
| Ecwid Help Center | https://support.ecwid.com/ |
| Ecwid Status Page | https://status.ecwid.com/ |
| Ecwid Blog | https://www.ecwid.com/blog |

---

## License

MIT
