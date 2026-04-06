# Theme Performance Pulse for Ecwid — AI Agent Instructions

> Conventions and patterns for AI coding agents working on this project.
> This file is read automatically by GitHub Copilot, Cursor, Cline, and similar AI assistants.

---

## Project Overview

| Key | Value                                                        |
|-----|--------------------------------------------------------------|
| Plugin Name | theme-performance-pulse-ecwid                                 |
| Platform | Ecwid by Lightspeed (SaaS e-commerce widget)                 |
| Architecture | Static owner dashboard + Admin iframe + Ecwid app storage     |
| Store API | Ecwid REST API v3                                            |
| Storefront API | Ecwid JavaScript API                                         |
| Auth | Ecwid app iframe payload when available                        |
| Runtime | Static hosting + browser JavaScript                           |

---

## Documentation

Refer to the complete documentation in the `docs/` folder:

- [API.md](docs/API.md) — Ecwid APIs used by the owner dashboard and the audit result model
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Static owner-dashboard architecture and Ecwid app storage usage
- [DEVELOPMENT.md](docs/DEVELOPMENT.md) — Local static development workflow and test commands
- [DEPLOYMENT.md](docs/DEPLOYMENT.md) — Static hosting and Ecwid app configuration

---

## Critical Rules

### 1. Ecwid is a SaaS Widget — NOT a Self-Hosted Platform

- **No server-side rendering** — Ecwid renders its own storefront via a JS widget
- **No database access** — All data via REST API only
- **No PHP/Python templates** — Storefront customisation is CSS + JavaScript
- **No WordPress/Shopify/Magento patterns** — This is NOT WooCommerce, NOT Shopify, NOT Magento

### 2. Primary Development Surface

| Surface | How to Customize |
|---------|-----------------|
| Admin Dashboard | HTML/JS iframe with EcwidApp SDK |

Optional storefront helpers may still exist, but they are not the core product surface.

`src/server/` is legacy reference material, not the recommended deployment path.

### 3. Security Rules

- Do not expose secret tokens in client-side code
- Use Ecwid app storage `public` data only for non-sensitive owner settings
- Preserve the no-backend deployment model unless the task explicitly requires infrastructure

### 4. Lightspeed Design System & UI

- **Ecwid Native Look and Feel:** When building UI components for the Admin Dashboard or storefront, always adhere to the [Lightspeed Brand System and UI Guidelines](https://brand.lightspeedhq.com/document/170#/brand-system/logo-1).
- **Seamless Integration:** Ensure typography, colors, logos, and spacing follow the monochrome and clearspace principles of the Lightspeed branding so the app feels natively integrated into the Ecwid admin panel. Avoid generic UI frameworks that break the Ecwid visual aesthetic without proper theming.

---

## File Map

| File | Purpose |
|------|---------|
| `src/shared/dashboard-core.js` | Shared audit config and PageSpeed summary logic |
| `src/admin/app.js` | Admin dashboard JS |
| `public/index.html` | Admin dashboard HTML (iframe page) |
| `public/storefront-test.html` | Optional local storefront test page |
| `scripts/build.js` | Static build output into dist/ |
| `tests/dashboard-core.test.js` | Unit coverage for audit summary logic |
| `tests/pulse-core.test.js` | Unit coverage for snapshot rules |

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Files | kebab-case | `ecwid-api.js` |
| Variables | camelCase | `storeId` |
| CSS classes (custom) | prefixed | `.tpp-audit-card` |
| JS API events | PascalCase | `EcwidApp.init` |

---

## Common Mistakes to Avoid

```javascript
// ❌ No database queries — Ecwid has no database access
Product.find({ status: 'active' });          // WRONG
db.query('SELECT * FROM products');          // WRONG

// ❌ No fake centralized analytics claims without a backend
// "Every audit is shared to all merchants and devices" // WRONG in this repo

// ❌ No WordPress/WooCommerce/Shopify/Magento patterns
add_action('woocommerce_checkout', fn);      // WRONG
{{ product.title }}                           // WRONG (Liquid)

// ✅ Correct: owner-triggered audit summarization
const result = ThemePerformancePulseDashboardCore.summarizePageSpeedResult(target, strategy, payload);

// ✅ Correct: Ecwid admin iframe integration
var app = EcwidApp.init({ appId: 'theme-performance-pulse' });
```

---

## Testing Requirements

**Every feature or bug fix MUST include unit tests.** No pull request will be accepted without accompanying tests that cover the new or changed behavior.

- Write unit tests for all new features before marking them complete
- Write unit tests for every bug fix that reproduce the bug and verify the fix
- Aim for meaningful coverage — test business logic, edge cases, and error paths
- Use the project's established testing framework and conventions
- Tests must pass in CI before a PR can be merged

---

## PR/Review Checklist

- [ ] No secret tokens exposed to the browser
- [ ] Public config remains non-sensitive
- [ ] No direct database queries or backend assumptions
- [ ] Admin dashboard tested inside Ecwid admin iframe
- [ ] Build output created and validated when deployment changes
- [ ] Unit tests included for all new features and bug fixes

## Quality Gates

- After any new feature, bug fix, or refactor, always lint, run build, and run test
- Do not consider the task complete until these checks pass, unless the user explicitly asks not to run them or the environment prevents it
- Every new feature must include automated tests that cover the new behavior, including both happy paths and unhappy paths where practical
- Bug fixes should include a regression test when practical
- Refactors must keep existing tests passing and should add tests if behavior changes or previously untested behavior becomes important