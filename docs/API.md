# API Reference

This repo no longer exposes its own application API as part of the recommended deployment path. Instead, it relies on Ecwid platform APIs and SDKs.

## Ecwid APIs used by the static version

### PageSpeed Insights API

Used in `src/admin/app.js`.

Main usage:

- `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=...&strategy=...`

Purpose:

- run owner-triggered audits against saved storefront URLs
- collect category scores and lab metrics without a custom backend

### Ecwid App SDK

Used in `src/admin/app.js`.

Main usage:

- `EcwidApp.init(...)`
- `app.getPayload(...)`
- `EcwidApp.setSize(...)`

Purpose:

- detect Ecwid iframe context
- get store-scoped access data when available
- resize the admin iframe

### Ecwid App Storage

Used by the admin page for non-sensitive owner settings.

Read endpoint:

```text
GET https://app.ecwid.com/api/v3/{storeId}/storage/public
Authorization: Bearer {access_token}
```

Write endpoint:

```text
POST https://app.ecwid.com/api/v3/{storeId}/storage/public
Authorization: Bearer {access_token}
Content-Type: application/json

{ "value": "{...json string...}" }
```

The owner-settings payload is stored under the reserved `public` key.

## Internal owner-dashboard model

`src/shared/dashboard-core.js` defines the audit settings and summary model used by the owner dashboard.

### Saved config shape

```json
{
  "appClientId": "theme-performance-pulse",
  "storefrontBaseUrl": "https://example.com/",
  "strategy": "mobile",
  "auditTargets": [
    {
      "label": "Homepage",
      "url": "https://example.com/"
    }
  ]
}
```

### Audit result summary shape

```json
{
  "label": "Homepage",
  "strategy": "mobile",
  "url": "https://example.com/",
  "scores": {
    "performance": 41,
    "accessibility": 92,
    "bestPractices": 88,
    "seo": 96
  },
  "metrics": {
    "lcp": "4210 ms",
    "cls": "0.210",
    "inp": "320 ms",
    "tbt": "280 ms"
  },
  "opportunities": []
}
```

## Not part of the recommended static path

The repository still contains optional storefront helper code and a legacy `src/server/` tree from the earlier hosted-app starter. Neither is the primary runtime contract for this owner-dashboard product.
