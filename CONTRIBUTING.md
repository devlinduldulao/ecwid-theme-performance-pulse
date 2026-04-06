# Contributing

## Getting Started

1. Clone the repo
2. Run `npm install`
3. Copy `.env.example` to `.env` and fill in your Ecwid credentials
4. Run `npm run dev`

## Development Workflow

1. Create a feature branch: `git checkout -b feat/my-feature`
2. Make your changes
3. Run `npm run lint` to check for issues
4. Commit with conventional commit messages:
   - `feat: add order webhook handler`
   - `fix: handle pagination edge case`
   - `docs: update API reference`
5. Push and open a PR

## Code Style

- Use `const` and `let`, never `var`
- Prefer `async/await` over raw Promises
- Keep functions small and focused
- Add JSDoc comments for public APIs
- Follow the naming conventions in AGENTS.md

## Adding New Features

- **New API route:** Create file in `src/server/routes/`, register in `src/server/index.js`
- **New webhook handler:** Add case in `src/server/routes/webhooks.js`
- **Storefront feature:** Edit `src/storefront/custom-storefront.js`
- **Admin dashboard feature:** Edit `public/index.html` and `src/admin/app.js`
- **New API client method:** Add to `src/server/services/ecwid-api.js`

## Important Rules

- Never commit `.env` or any file containing secrets
- Always validate `storeId` in webhook handlers
- Handle API pagination (max 100 items per request)
- Scope CSS to `.ecwid-productBrowser`
- Use `Ecwid.OnAPILoaded` before calling JS API methods
