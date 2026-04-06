# Deployment Guide

The recommended deployment for this repo is static hosting only.

## What you need

1. A static file host
2. An Ecwid app entry point for the owner dashboard
3. No database
4. No Redis
5. No always-on Node.js server

## Credentials you do and do not need

For the current static deployment model, you only need the non-secret Ecwid app metadata during setup:

- client ID
- access scopes
- app page URL
- support URL
- privacy policy URL

You do not need these values for `npm run build`, `npm test`, `npm run publish:bundle`, GitHub Pages deployment, or GitHub Releases:

- client secret
- secret token
- private single-store access token

Do not place those secrets in client-side JavaScript, static HTML, marketplace assets, or tracked config files.

## Good free hosting choices

- GitHub Pages
- Netlify
- Cloudflare Pages

Any host that can serve the repository as plain static files is enough.

## Recommended Ecwid app settings

After hosting the repo, configure these URLs in your Ecwid app settings:

| Setting | Value |
|---------|-------|
| App page URL | `https://your-host/public/index.html` |

Optional helper assets can still point at:

- `https://your-host/src/storefront/custom-storefront.js`
- `https://your-host/src/storefront/custom-storefront.css`

This gives you:

- a merchant-facing admin page
- saved owner settings through Ecwid app storage when Ecwid provides store context
- static deployment with no paid backend services

## Manual fallback deployment

If you are not wiring the app into Ecwid yet, you can still host the dashboard as a standalone page for preview and QA.

## What the admin page saves

When loaded inside Ecwid admin, the static admin page writes the reserved `public` app storage key. That stored JSON is intended for non-sensitive owner settings such as storefront base URL, saved audit targets, and preferred device strategy.

Do not store API secrets there, and do not treat it as analytics history.

## Production checklist

- [ ] Static host is reachable over HTTPS
- [ ] `public/index.html` loads correctly on the hosted domain
- [ ] Owner dashboard saves settings correctly inside Ecwid admin
- [ ] `npm run build` produces deployable files in `dist/`
- [ ] Optional storefront helper files are reachable only if you intend to use them

## GitHub Actions secrets checklist

Current workflows in `.github/workflows/` do not require Ecwid secrets because they only build, lint, test, package, and deploy static files.

Safe current state:

- `ci.yml`: no Ecwid secrets required
- `deploy-pages.yml`: no Ecwid secrets required beyond GitHub Pages permissions
- `release.yml`: no Ecwid secrets required

Only add GitHub Actions Secrets if you later introduce server-side behavior such as OAuth token exchange, private REST calls, or automated Ecwid admin mutations from CI.

If that happens, store them only as encrypted repository or environment secrets:

- `ECWID_CLIENT_SECRET`
- `ECWID_SECRET_TOKEN`
- any deployment-specific private token

## When this deployment model stops being enough

Move to a hosted backend only if you decide you need:

- centralized live metrics across browsers
- long-term retention
- scheduled or recurring audits
- webhook automations
- private token usage outside the admin iframe
