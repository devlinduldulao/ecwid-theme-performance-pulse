# Publishing Checklist

This repo is now prepared for a static Ecwid app submission, but a few store-specific values still need to be filled in before you submit.

## What is already prepared

- static owner dashboard build output in `dist/`
- publish bundle output in `publish/`
- CI workflow for build, lint, and test
- GitHub Pages deployment workflow for static hosting
- GitHub Release workflow for tagged releases
- listing asset source files in `assets/marketplace/`
- raster PNG exports generated from the icon and banner SVG files
- live PNG screenshots captured from the running owner dashboard
- privacy and support documentation in `docs/`
- preview mode and live audit mode covered by automated tests

## What you still need to provide

- your production app page URL
- your production support email or support form URL
- your production privacy policy URL
- your final pricing and billing model
- your final category selection in the Ecwid app submission flow

You can keep these values in `app-listing.config.json` so `npm run publish:bundle` injects them into the generated listing metadata automatically.

## Ecwid market request and app review inputs

For Ecwid's market request form and app review workflow, these values are typically safe to provide:

- app name
- company website
- app category and purpose
- app description and merchant benefit
- expected install range
- client ID
- requested access scopes
- hosted app page URL
- hosted privacy policy URL
- hosted support URL

Do not paste these into a general intake form unless Ecwid explicitly asks for them through a secure review step:

- client secret
- secret token
- private single-store token

The current app is a static owner dashboard. Its packaging and marketplace submission do not depend on those secret values being stored in this repo.

## Suggested submission package

### App identity

- Name: Theme Performance Pulse
- Short value statement: Merchant dashboard for auditing Ecwid storefront performance without a backend.
- Primary audience: Ecwid business owners and merchants

### Listing copy starter

- Headline: Audit your Ecwid storefront from the owner dashboard
- Short description: Save key storefront URLs, run PageSpeed audits on demand, and preview the dashboard with sample data before going live.
- Key features:
  - owner-side dashboard inside Ecwid admin
  - browser-run PageSpeed audits for storefront URLs
  - preview demo mode with sample data
  - no database, Redis, or hosted Node.js collector required

### Visual assets

Source files are stored in `assets/marketplace/`.

- app icon: `assets/marketplace/icon.svg`
- banner: `assets/marketplace/banner.svg`
- screenshot: `assets/marketplace/screenshot-owner-dashboard.png`
- screenshot: `assets/marketplace/screenshot-preview-mode.png`

Run the local app, refresh the marketplace screenshots when the UI changes, then run `npm run publish:bundle` to assemble the submission bundle automatically.

## Runtime checklist before submission

- `npm run build` succeeds
- `npm run publish:bundle` succeeds
- `npm run lint` succeeds
- `npm test` succeeds
- hosted `public/index.html` is reachable over HTTPS
- Ecwid app page URL points to the hosted owner dashboard
- app storage read/write works in a real Ecwid admin session
- optional PageSpeed API key is never stored in Ecwid app storage

## Safe submission checklist

- [ ] Client ID is recorded in your Ecwid app setup
- [ ] Requested scopes match the actual app behavior
- [ ] No client secret or secret token is committed to the repo
- [ ] No secret values appear in screenshots, publish assets, or app listing files
- [ ] Hosted URLs in the Ecwid submission are production HTTPS URLs

## Required policy/support surfaces

- privacy policy: `docs/PRIVACY.md`
- support policy: `docs/SUPPORT.md`

Host these pages somewhere public and use their HTTPS URLs in your submission.

## Release automation

- `.github/workflows/release.yml` validates the app on version tags
- the release workflow uploads both a `dist/` zip and a publish-bundle zip to GitHub Releases
- `publish/app-listing.template.json` is generated as a placeholder metadata file for final submission editing