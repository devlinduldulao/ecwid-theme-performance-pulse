# Architecture

This Ecwid version now centers on the merchant dashboard, not on public visitor instrumentation.

## Platform model

Ecwid gives you one primary surface for this product without adding your own backend:

| Surface | Purpose | Storage |
|---------|---------|---------|
| Admin iframe page | Save audit targets and run performance audits for the business owner | Ecwid app storage `public` key, with local fallback |

Optional storefront assets remain in the repo, but they are not the core product surface.

## Current architecture

```text
Ecwid admin iframe
    -> public/index.html
    -> src/admin/app.js
    -> src/shared/dashboard-core.js
    -> EcwidApp SDK payload
    -> Ecwid app storage key: public
    -> saved audit targets + on-demand PageSpeed runs
```

## Shared dashboard core

`src/shared/dashboard-core.js` centralizes owner-dashboard logic:

- audit target parsing
- relative URL expansion from storefront base URL
- PageSpeed result summarization
- owner-facing summary cards

This lets the admin UI stay thin and keeps the audit behavior unit-testable.

## Admin flow

1. `public/index.html` loads inside Ecwid admin or standalone in a browser.
2. `src/admin/app.js` initializes `EcwidApp` when available.
3. If Ecwid payload data is available, the admin page reads and writes the reserved `public` app storage key through Ecwid REST API calls.
4. The merchant saves storefront base URL, audit targets, and preferred device strategy.
5. The dashboard calls PageSpeed Insights directly from the browser for those saved URLs.
6. Results stay in browser-local storage for quick re-open during the same owner workflow.

## Why there is no centralized audit history

Without your own backend, this project has nowhere durable and private to store shared audit history or scheduled runs. Ecwid app storage is good for lightweight configuration, not for a growing analytics dataset.

That leaves two honest options:

- browser-run audits with lightweight saved settings, which this repo implements
- centralized history and background jobs, which would require a developer-hosted backend

## Security model

The static version keeps these boundaries:

- no database credentials
- no Redis or queue credentials
- no server-side secrets required for the default path
- optional PageSpeed API key stays local in the owner browser
- store-scoped non-sensitive settings saved through Ecwid app storage when the admin iframe provides access

## Legacy server folder

`src/server/` remains in the repository as reference material from the original hosted-app starter, but it is not part of the recommended deployment path for this project.
