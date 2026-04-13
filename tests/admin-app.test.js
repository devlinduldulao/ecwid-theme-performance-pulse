const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(projectRoot, 'public', 'index.html'), 'utf8');
const dashboardCoreSource = fs.readFileSync(path.join(projectRoot, 'src', 'shared', 'dashboard-core.js'), 'utf8');
const adminSource = fs.readFileSync(path.join(projectRoot, 'src', 'admin', 'app.js'), 'utf8');

function createResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    },
  };
}

async function flush(window, cycles = 4) {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

async function bootApp(options = {}) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://example.test/public/index.html',
  });
  const { window } = dom;
  const fetchCalls = [];
  const fetchQueue = Array.isArray(options.fetchQueue) ? options.fetchQueue.slice() : [];

  window.fetch = async (url, init) => {
    fetchCalls.push({ url, init: init || {} });

    if (typeof options.fetchImpl === 'function') {
      return options.fetchImpl(url, init, fetchCalls.length - 1);
    }

    if (!fetchQueue.length) {
      throw new Error(`Unexpected fetch for ${url}`);
    }

    return fetchQueue.shift();
  };

  window.console = console;
  window.ThemePerformancePulseAdminBootstrap = Object.assign(
    { appId: 'theme-performance-pulse' },
    options.bootstrap || {}
  );

  if (typeof options.beforeScripts === 'function') {
    options.beforeScripts(window);
  }

  if (options.ecwidApp) {
    window.EcwidApp = options.ecwidApp;
  }

  window.eval(dashboardCoreSource);
  window.eval(adminSource);

  await flush(window, options.flushCycles || 6);

  return { dom, window, document: window.document, fetchCalls };
}

test('standalone bootstrap restores preview mode from local storage', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://merchant.example/',
          auditTargets: 'Homepage | /',
        })
      );
      window.localStorage.setItem('theme-performance-pulse:ecwid:preview-mode', 'true');
    },
  });

  assert.equal(app.document.getElementById('preview-toggle-btn').textContent, 'Exit Preview');
  assert.equal(app.document.getElementById('preview-mode-badge').textContent, 'Sample data — not from your store');
  assert.match(app.document.getElementById('tpp-audit-results').textContent, /Homepage/);
  assert.equal(app.document.getElementById('status-message').textContent, '');
  app.dom.window.close();
});

test('save settings in standalone mode persists config locally', async () => {
  const app = await bootApp();

  app.document.getElementById('app-client-id').value = 'pulse-app';
  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /\nCart | /cart';
  app.document.getElementById('audit-strategy').value = 'desktop';
  app.document.getElementById('psi-api-key').value = 'browser-only-key';
  app.document.getElementById('save-btn').click();
  await flush(app.window);

  const savedConfig = JSON.parse(app.window.localStorage.getItem('theme-performance-pulse:ecwid:dashboard-config'));

  assert.equal(savedConfig.appClientId, 'pulse-app');
  assert.equal(savedConfig.strategy, 'desktop');
  assert.equal(savedConfig.auditTargets[1].url, 'https://merchant.example/cart');
  assert.equal(app.window.localStorage.getItem('theme-performance-pulse:ecwid:psi-api-key'), 'browser-only-key');
  assert.match(app.document.getElementById('status-message').textContent, /saved locally/i);
  app.dom.window.close();
});

test('run audit blocks empty target lists with an error message', async () => {
  const app = await bootApp();

  app.document.getElementById('audit-targets').value = '';
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window);

  assert.equal(app.fetchCalls.length, 0);
  assert.match(app.document.getElementById('status-message').textContent, /add at least one valid audit target/i);
  assert.equal(app.document.getElementById('run-audit-btn').textContent, 'Run Audit');
  app.dom.window.close();
});

test('run audit saves live results and exits preview mode after a successful PageSpeed response', async () => {
  const app = await bootApp({
    fetchQueue: [
      createResponse(200, {
        lighthouseResult: {
          categories: {
            performance: { score: 0.88 },
            accessibility: { score: 0.9 },
            'best-practices': { score: 0.85 },
            seo: { score: 0.93 },
          },
          audits: {
            'largest-contentful-paint': { numericValue: 2050 },
            'cumulative-layout-shift': { numericValue: 0.08 },
            'interaction-to-next-paint': { numericValue: 180 },
            'total-blocking-time': { numericValue: 120 },
            'render-blocking-resources': {
              score: 0,
              title: 'Eliminate render-blocking resources',
              displayValue: 'Potential savings 400 ms',
            },
          },
        },
      }),
    ],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /';
  app.document.getElementById('psi-api-key').value = 'psi-key';
  app.document.getElementById('preview-toggle-btn').click();
  await flush(app.window);
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window, 8);

  assert.equal(app.fetchCalls.length, 1);
  assert.match(app.fetchCalls[0].url, /runPagespeed/);
  assert.match(app.fetchCalls[0].url, /key=psi-key/);
  assert.equal(app.document.getElementById('preview-toggle-btn').textContent, 'Preview Demo');
  assert.equal(app.document.getElementById('preview-mode-badge').textContent, 'Live audit results');
  assert.match(app.document.getElementById('tpp-audit-results').textContent, /Eliminate render-blocking resources/);
  assert.match(app.document.getElementById('status-message').textContent, /Audit completed/i);
  assert.match(app.window.localStorage.getItem('theme-performance-pulse:ecwid:last-results'), /Homepage/);
  app.dom.window.close();
});

test('run audit surfaces PageSpeed failures and restores the run button state', async () => {
  const app = await bootApp({
    fetchQueue: [createResponse(503, { error: 'temporary failure' })],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /';
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window, 8);

  assert.match(app.document.getElementById('status-message').textContent, /PageSpeed request failed/i);
  assert.equal(app.document.getElementById('run-audit-btn').disabled, false);
  assert.equal(app.document.getElementById('run-audit-btn').textContent, 'Run Audit');
  app.dom.window.close();
});

test('ecwid bootstrap loads app storage settings when iframe payload is available', async () => {
  const app = await bootApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 12345, access_token: 'token-123' });
          },
        };
      },
      setSize() {},
    },
    fetchQueue: [
      createResponse(200, {
        value: JSON.stringify({
          storefrontBaseUrl: 'https://stored.example/',
          strategy: 'desktop',
          auditTargets: [{ label: 'Homepage', url: 'https://stored.example/' }],
        }),
      }),
    ],
  });

  assert.equal(app.fetchCalls.length, 1);
  assert.match(app.fetchCalls[0].url, /\/storage\/public$/);
  assert.equal(app.fetchCalls[0].init.headers.Authorization, 'Bearer token-123');
  assert.equal(app.document.getElementById('connection-mode').textContent, 'Ecwid owner dashboard connected');
  assert.equal(app.document.getElementById('storefront-base-url').value, 'https://stored.example/');
  assert.equal(app.document.getElementById('audit-strategy').value, 'desktop');
  assert.match(app.document.getElementById('status-message').textContent, /Loaded saved audit settings/i);
  app.dom.window.close();
});

test('ecwid bootstrap falls back to browser-local settings when app storage read fails', async () => {
  const app = await bootApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 12345, access_token: 'token-123' });
          },
        };
      },
      setSize() {},
    },
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://browser-local.example/',
          auditTargets: 'Homepage | /',
        })
      );
    },
    fetchQueue: [createResponse(503, { error: 'read failed' })],
  });

  assert.equal(app.document.getElementById('connection-mode').textContent, 'Ecwid owner dashboard connected');
  assert.equal(app.document.getElementById('storefront-base-url').value, 'https://browser-local.example/');
  assert.match(app.document.getElementById('status-message').textContent, /Falling back to browser-local audit settings/i);
  app.dom.window.close();
});

test('save settings in ecwid mode writes owner settings to app storage on success', async () => {
  const app = await bootApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 12345, access_token: 'token-123' });
          },
        };
      },
      setSize() {},
    },
    fetchQueue: [
      createResponse(200, { value: JSON.stringify({ auditTargets: [] }) }),
      createResponse(200, { ok: true }),
    ],
  });

  app.document.getElementById('app-client-id').value = 'pulse-app';
  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /\nCart | /cart';
  app.document.getElementById('audit-strategy').value = 'desktop';
  app.document.getElementById('save-btn').click();
  await flush(app.window, 8);

  assert.equal(app.fetchCalls.length, 2);
  assert.equal(app.fetchCalls[1].init.method, 'POST');
  assert.equal(app.fetchCalls[1].init.headers.Authorization, 'Bearer token-123');
  assert.match(app.fetchCalls[1].init.body, /merchant\.example/);
  assert.match(app.fetchCalls[1].init.body, /\\"strategy\\":\\"desktop\\"/);
  assert.match(app.document.getElementById('status-message').textContent, /saved to Ecwid app storage/i);
  app.dom.window.close();
});

test('run audit requests all configured targets against live PageSpeed data', async () => {
  const pageSpeedPayload = {
    lighthouseResult: {
      categories: {
        performance: { score: 0.91 },
        accessibility: { score: 0.94 },
        'best-practices': { score: 0.9 },
        seo: { score: 0.96 },
      },
      audits: {
        'largest-contentful-paint': { numericValue: 1900 },
        'cumulative-layout-shift': { numericValue: 0.04 },
        'interaction-to-next-paint': { numericValue: 130 },
        'total-blocking-time': { numericValue: 90 },
      },
    },
  };
  const app = await bootApp({
    fetchQueue: [createResponse(200, pageSpeedPayload), createResponse(200, pageSpeedPayload)],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /\nProduct | /products/linen-shirt';
  app.document.getElementById('audit-strategy').value = 'desktop';
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window, 10);

  assert.equal(app.fetchCalls.length, 2);
  assert.match(app.fetchCalls[0].url, /url=https%3A%2F%2Fmerchant\.example%2F/);
  assert.match(app.fetchCalls[1].url, /products%2Flinen-shirt/);
  assert.match(app.fetchCalls[0].url, /strategy=desktop/);
  assert.match(app.document.getElementById('status-message').textContent, /Audit completed for 2 storefront pages/i);
  assert.match(app.document.getElementById('tpp-audit-results').textContent, /Homepage/);
  assert.match(app.document.getElementById('tpp-audit-results').textContent, /Product/);
  app.dom.window.close();
});

test('bootstrap tolerates invalid cached live results and keeps the dashboard usable', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem('theme-performance-pulse:ecwid:last-results', '{bad json');
    },
  });

  assert.equal(app.document.getElementById('last-run-at').textContent, 'No audits run yet');
  assert.equal(app.document.getElementById('tpp-empty-results').hidden, false);
  app.dom.window.close();
});

test('save settings in ecwid mode falls back gracefully when app storage write fails', async () => {
  const app = await bootApp({
    ecwidApp: {
      init() {
        return {
          getPayload(callback) {
            callback({ store_id: 12345, access_token: 'token-123' });
          },
        };
      },
      setSize() {},
    },
    fetchQueue: [
      createResponse(200, { value: JSON.stringify({ auditTargets: [] }) }),
      createResponse(500, { error: 'write failed' }),
    ],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /';
  app.document.getElementById('save-btn').click();
  await flush(app.window, 8);

  assert.equal(app.fetchCalls.length, 2);
  assert.equal(app.fetchCalls[1].init.method, 'POST');
  assert.match(app.document.getElementById('status-message').textContent, /Saved locally, but Ecwid app storage update failed/i);
  assert.match(app.window.localStorage.getItem('theme-performance-pulse:ecwid:dashboard-config'), /merchant\.example/);
  app.dom.window.close();
});

test('preview mode shows preview banner and hides live banner', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://merchant.example/',
          auditTargets: 'Homepage | /',
        })
      );
      window.localStorage.setItem('theme-performance-pulse:ecwid:preview-mode', 'true');
    },
  });

  const previewBanner = app.document.getElementById('tpp-preview-banner');
  const liveBanner = app.document.getElementById('tpp-live-banner');

  assert.ok(previewBanner.classList.contains('is-visible'), 'Preview banner should be visible in preview mode');
  assert.ok(!liveBanner.classList.contains('is-visible'), 'Live banner should be hidden in preview mode');
  app.dom.window.close();
});

test('live results show live banner and hide preview banner', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://merchant.example/',
          auditTargets: 'Homepage | /',
        })
      );
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:last-results',
        JSON.stringify([
          {
            label: 'Homepage',
            strategy: 'mobile',
            url: 'https://merchant.example/',
            fetchedAt: new Date().toISOString(),
            scores: { performance: 85, accessibility: 90, bestPractices: 88, seo: 92 },
            metrics: { lcp: '2000 ms', cls: '0.050', inp: '150 ms', tbt: '100 ms' },
            opportunities: [],
            headline: 'No high-signal issues detected',
          },
        ])
      );
    },
  });

  const previewBanner = app.document.getElementById('tpp-preview-banner');
  const liveBanner = app.document.getElementById('tpp-live-banner');

  assert.ok(!previewBanner.classList.contains('is-visible'), 'Preview banner should be hidden for live data');
  assert.ok(liveBanner.classList.contains('is-visible'), 'Live banner should be visible for live results');
  app.dom.window.close();
});

test('preview mode audit cards carry sample data badge and is-sample class', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://merchant.example/',
          auditTargets: 'Homepage | /',
        })
      );
      window.localStorage.setItem('theme-performance-pulse:ecwid:preview-mode', 'true');
    },
  });

  const resultsHtml = app.document.getElementById('tpp-audit-results').innerHTML;

  assert.match(resultsHtml, /tpp-data-badge--sample/, 'Preview cards should have sample badge');
  assert.match(resultsHtml, /is-sample/, 'Preview cards should have is-sample class');
  assert.match(resultsHtml, /NOT real data/, 'Preview cards should state NOT real data');
  app.dom.window.close();
});

test('live audit cards carry live data badge without is-sample class', async () => {
  const app = await bootApp({
    fetchQueue: [
      createResponse(200, {
        lighthouseResult: {
          categories: {
            performance: { score: 0.88 },
            accessibility: { score: 0.9 },
            'best-practices': { score: 0.85 },
            seo: { score: 0.93 },
          },
          audits: {
            'largest-contentful-paint': { numericValue: 2050 },
            'cumulative-layout-shift': { numericValue: 0.08 },
            'interaction-to-next-paint': { numericValue: 180 },
            'total-blocking-time': { numericValue: 120 },
          },
        },
      }),
    ],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /';
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window, 8);

  const resultsHtml = app.document.getElementById('tpp-audit-results').innerHTML;

  assert.match(resultsHtml, /tpp-data-badge--live/, 'Live cards should have live badge');
  assert.match(resultsHtml, /from Google PageSpeed/, 'Live cards should state from Google PageSpeed');
  assert.ok(!resultsHtml.includes('is-sample'), 'Live cards should not have is-sample class');
  app.dom.window.close();
});

test('exit preview banner button exits preview mode', async () => {
  const app = await bootApp({
    beforeScripts(window) {
      window.localStorage.setItem(
        'theme-performance-pulse:ecwid:dashboard-config',
        JSON.stringify({
          storefrontBaseUrl: 'https://merchant.example/',
          auditTargets: 'Homepage | /',
        })
      );
      window.localStorage.setItem('theme-performance-pulse:ecwid:preview-mode', 'true');
    },
  });

  assert.ok(app.document.getElementById('tpp-preview-banner').classList.contains('is-visible'));
  app.document.getElementById('exit-preview-banner-btn').click();
  await flush(app.window);

  assert.ok(!app.document.getElementById('tpp-preview-banner').classList.contains('is-visible'), 'Preview banner should hide after exit');
  assert.equal(app.document.getElementById('preview-toggle-btn').textContent, 'Preview Demo');
  assert.match(app.document.getElementById('status-message').textContent, /Preview mode disabled/i);
  app.dom.window.close();
});

test('quick start guide is present in the dashboard', async () => {
  const app = await bootApp();

  assert.ok(app.document.getElementById('guide-step-1'), 'Guide step 1 should exist');
  assert.ok(app.document.getElementById('guide-step-2'), 'Guide step 2 should exist');
  assert.ok(app.document.getElementById('guide-step-3'), 'Guide step 3 should exist');
  assert.match(app.document.querySelector('#guide-step-1 .tpp-guide-step__content strong').textContent, /storefront URL/i);
  app.dom.window.close();
});

test('empty state shows step-by-step instructions', async () => {
  const app = await bootApp();

  const emptyState = app.document.getElementById('tpp-empty-results');

  assert.ok(!emptyState.hidden, 'Empty state should be visible when no results');
  assert.match(emptyState.textContent, /No audit results yet/i);
  assert.match(emptyState.textContent, /Enter your storefront URL/i);
  assert.match(emptyState.textContent, /Run Audit/i);
  app.dom.window.close();
});

test('guide steps mark as done when fields are populated and audit runs', async () => {
  const app = await bootApp({
    fetchQueue: [
      createResponse(200, {
        lighthouseResult: {
          categories: {
            performance: { score: 0.88 },
            accessibility: { score: 0.9 },
            'best-practices': { score: 0.85 },
            seo: { score: 0.93 },
          },
          audits: {
            'largest-contentful-paint': { numericValue: 2050 },
            'cumulative-layout-shift': { numericValue: 0.08 },
            'interaction-to-next-paint': { numericValue: 180 },
            'total-blocking-time': { numericValue: 120 },
          },
        },
      }),
    ],
  });

  app.document.getElementById('storefront-base-url').value = 'https://merchant.example/';
  app.document.getElementById('audit-targets').value = 'Homepage | /';
  app.document.getElementById('run-audit-btn').click();
  await flush(app.window, 8);

  assert.ok(app.document.getElementById('guide-step-1').classList.contains('is-done'), 'Step 1 should be done after URL is entered');
  assert.ok(app.document.getElementById('guide-step-2').classList.contains('is-done'), 'Step 2 should be done after targets are set');
  assert.ok(app.document.getElementById('guide-step-3').classList.contains('is-done'), 'Step 3 should be done after audit runs');
  app.dom.window.close();
});