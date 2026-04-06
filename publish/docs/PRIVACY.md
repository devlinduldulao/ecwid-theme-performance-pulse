# Privacy Policy

## Theme Performance Pulse for Ecwid

Theme Performance Pulse is a static owner-dashboard app for Ecwid merchants.

## Data handling summary

- The app stores non-sensitive owner settings such as storefront base URL, audit targets, and preferred device strategy.
- When the app is running inside Ecwid admin, those settings may be stored in Ecwid app storage under the reserved `public` key.
- When the app is running outside Ecwid admin, those settings may be stored in browser-local storage for preview and development.
- Audit runs call the public Google PageSpeed Insights API directly from the merchant browser.
- Optional PageSpeed API keys stay in the merchant browser and are not written to Ecwid app storage by this app.

## Data not collected by the default static deployment

- no hosted application database
- no Redis cache
- no always-on Node.js server
- no centralized cross-merchant analytics history
- no payment information processing

## Third-party services

The owner dashboard may send audit requests to Google PageSpeed Insights when the merchant chooses to run an audit.

## Merchant responsibility

Before publishing, replace this document with your final legal copy if your business or hosting setup introduces additional data handling.