# Releasing

Use this workflow when you want to cut a real tagged release for the Ecwid app.

## 1. Prepare the version

Run:

```bash
npm run release:prepare -- 1.2.1
```

This will:

- update `package.json`
- update `package-lock.json`
- create `releases/v1.2.1.md`

## 2. Review submission metadata

If you want the publish bundle to contain real submission URLs, create:

```text
app-listing.config.json
```

using `app-listing.config.template.json` as the starting point.

Alternatively, keep your broader marketplace metadata in:

```text
config/publishing-profile.json
```

When `app-listing.config.json` is not present, `npm run publish:bundle` will derive the publish metadata from that profile instead.

## 3. Validate everything

Run:

```bash
npm run build
npm run lint
npm test
npm run publish:bundle
```

## 4. Create the tag

Use a `v`-prefixed tag that matches the package version:

```bash
git tag v1.2.1
git push origin v1.2.1
```

The GitHub Actions release workflow will validate the app and attach both the `dist/` zip and the publish-bundle zip to the GitHub Release.

## 5. Final publishing check

Before submitting to Ecwid, confirm:

- hosted app page URL is correct
- privacy and support URLs are public and correct
- generated PNG assets match the latest Ecwid submission size requirements
- release notes in `releases/` describe the shipped changes accurately