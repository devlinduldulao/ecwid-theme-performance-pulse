# Development Guide

This repo now develops as a static Ecwid package. You do not need to boot a backend server to work on it.

## Local setup

```bash
npm install
npm run preview
```

Use these pages during development:

- `http://localhost:4173/public/index.html`
- `http://localhost:4173/public/storefront-test.html`

The storefront test page is optional. The main product is the owner dashboard in `public/index.html`.

## Main workflows

### Owner dashboard work

Edit these files:

- `public/index.html`
- `src/admin/app.js`
- `src/shared/dashboard-core.js`

The admin page supports two modes:

- standalone preview mode outside Ecwid
- Ecwid app mode, where `EcwidApp` provides store context and the page saves owner settings into app storage

Typical work in this repo now means:

- refining the audit form
- improving PageSpeed result summaries
- adjusting how scores and opportunities are presented to merchants

### Optional storefront work

Edit these files:

- `src/storefront/custom-storefront.js`
- `src/storefront/custom-storefront.css`
- `src/shared/pulse-core.js` when you need shared event or snapshot changes

Use the storefront test page only if you are intentionally working on the optional storefront helper:

- Ecwid page detection
- performance event capture
- floating panel rendering
- browser-local rolling snapshot updates

### Shared core work

`src/shared/dashboard-core.js` is where you should make changes if the same audit rule should apply across the owner dashboard.

That includes:

- audit target parsing
- URL normalization
- PageSpeed result summarization
- owner summary totals

## Testing

Run:

```bash
npm run build
npm run lint
npm test
```

Coverage is split into two layers:

- `tests/dashboard-core.test.js` for audit config and PageSpeed summary logic
- `tests/pulse-core.test.js` for unit-level snapshot and config logic
- `scripts/smoke-test.js` for static asset reachability and page sanity checks

## Ecwid-specific notes

### Ecwid app storage

The admin page writes the reserved `public` app storage key using Ecwid REST API when it has store context. Keep only non-sensitive owner settings there.

### Optional PageSpeed API key

If a merchant needs a higher quota, they can enter a PageSpeed API key in the dashboard. That key is deliberately stored only in local browser storage, not in Ecwid app storage.

### If you later add infrastructure

If the product grows and you decide to accept backend cost later, the natural next step is to add scheduled audits, persistent history, and optional webhook integrations. Until then, keep new features aligned with the static owner-dashboard model.
