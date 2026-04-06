const http = require('http');
const fs = require('fs');
const path = require('path');
const { buildStaticArtifacts } = require('./build');

const projectRoot = path.resolve(__dirname, '..');
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml; charset=utf-8',
};

function serveFile(req, res) {
  const rootIndexPath = path.join(projectRoot, 'index.html');
  const requestPath = req.url === '/' && fs.existsSync(rootIndexPath) ? '/index.html' : req.url;
  const targetPath = path.join(projectRoot, decodeURIComponent(requestPath));

  if (!targetPath.startsWith(projectRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(targetPath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(targetPath)] || 'text/plain; charset=utf-8',
    });
    res.end(data);
  });
}

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
    passed += 1;
  } catch (error) {
    console.log(`  FAIL ${name} - ${error.message}`);
    failed += 1;
  }
}

async function run() {
  const server = http.createServer(serveFile);

  server.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    await test('Admin page loads', async () => {
      const response = await fetch(`${baseUrl}/public/index.html`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Ecwid Owner Dashboard')) {
        throw new Error('admin page did not load expected content');
      }
    });

    await test('Root page bootstraps the dashboard without redirecting', async () => {
      const response = await fetch(`${baseUrl}/`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Loading the owner dashboard without leaving this URL.')) {
        throw new Error('root page did not serve the dashboard bootstrap shell');
      }

      if (body.includes('window.location.replace') || body.includes('http-equiv="refresh"')) {
        throw new Error('root page still contains redirect behavior');
      }
    });

    await test('Storefront test page loads', async () => {
      const response = await fetch(`${baseUrl}/public/storefront-test.html`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Ecwid storefront monitoring preview')) {
        throw new Error('storefront test page did not load expected content');
      }
    });

    await test('Support page loads', async () => {
      const response = await fetch(`${baseUrl}/public/support.html`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Theme Performance Pulse support covers')) {
        throw new Error('support page did not load expected content');
      }
    });

    await test('Privacy policy page loads', async () => {
      const response = await fetch(`${baseUrl}/public/privacy.html`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('static owner dashboard for Ecwid merchants')) {
        throw new Error('privacy page did not load expected content');
      }
    });

    await test('Terms page loads', async () => {
      const response = await fetch(`${baseUrl}/public/terms.html`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Terms of Service')) {
        throw new Error('terms page did not load expected content');
      }
    });

    await test('Shared monitoring core is reachable', async () => {
      const response = await fetch(`${baseUrl}/src/shared/pulse-core.js`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('ThemePerformancePulseCore')) {
        throw new Error('shared monitoring core missing');
      }
    });

    await test('Shared dashboard core is reachable', async () => {
      const response = await fetch(`${baseUrl}/src/shared/dashboard-core.js`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('ThemePerformancePulseDashboardCore')) {
        throw new Error('shared dashboard core missing');
      }
    });

    await test('Storefront tracker is reachable', async () => {
      const response = await fetch(`${baseUrl}/src/storefront/custom-storefront.js`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Browser Snapshot')) {
        throw new Error('storefront tracker missing expected UI label');
      }
    });

    await test('Marketplace icon asset is reachable', async () => {
      const response = await fetch(`${baseUrl}/assets/marketplace/icon.svg`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Theme Performance Pulse')) {
        throw new Error('marketplace icon missing expected content');
      }
    });

    await test('Marketplace banner asset is reachable', async () => {
      const response = await fetch(`${baseUrl}/assets/marketplace/banner.svg`);
      const body = await response.text();

      if (response.status !== 200 || !body.includes('Owner Dashboard')) {
        throw new Error('marketplace banner missing expected content');
      }
    });

    await test('Marketplace owner screenshot is reachable', async () => {
      const response = await fetch(`${baseUrl}/assets/marketplace/screenshot-owner-dashboard.png`);

      if (response.status !== 200 || response.headers.get('content-type') !== 'image/png') {
        throw new Error('marketplace owner screenshot missing or served with wrong type');
      }
    });

    await test('Marketplace preview screenshot is reachable', async () => {
      const response = await fetch(`${baseUrl}/assets/marketplace/screenshot-preview-mode.png`);

      if (response.status !== 200 || response.headers.get('content-type') !== 'image/png') {
        throw new Error('marketplace preview screenshot missing or served with wrong type');
      }
    });

    await test('Path traversal is rejected', async () => {
      const response = await fetch(`${baseUrl}/..%2Fpackage.json`);

      if (response.status !== 403) {
        throw new Error(`expected 403 for traversal path, got ${response.status}`);
      }
    });

    await test('Missing files return not found', async () => {
      const response = await fetch(`${baseUrl}/public/does-not-exist.html`);

      if (response.status !== 404) {
        throw new Error(`expected 404 for missing file, got ${response.status}`);
      }
    });

    await test('Build script emits dist artifacts', async () => {
      buildStaticArtifacts();

      if (!fs.existsSync(path.join(projectRoot, 'dist', 'public', 'index.html'))) {
        throw new Error('build script did not create dist/public/index.html');
      }

      if (!fs.existsSync(path.join(projectRoot, 'dist', 'README.md'))) {
        throw new Error('build script did not copy README.md into dist');
      }

      if (!fs.existsSync(path.join(projectRoot, 'dist', 'index.html'))) {
        throw new Error('build script did not copy root index.html into dist');
      }
    });

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    server.close(() => process.exit(failed > 0 ? 1 : 0));
  });
}

run();
