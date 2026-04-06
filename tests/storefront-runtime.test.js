const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const projectRoot = path.resolve(__dirname, '..');
const pulseCoreSource = fs.readFileSync(path.join(projectRoot, 'src', 'shared', 'pulse-core.js'), 'utf8');
const storefrontSource = fs.readFileSync(path.join(projectRoot, 'src', 'storefront', 'custom-storefront.js'), 'utf8');

function createEventBus() {
  const listeners = [];

  return {
    add(callback) {
      listeners.push(callback);
    },
    trigger(payload) {
      listeners.forEach((callback) => callback(payload));
    },
  };
}

async function flush(window, cycles = 4) {
  for (let index = 0; index < cycles; index += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  }
}

async function bootStorefront(options = {}) {
  const dom = new JSDOM(
    [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<body>',
      '<div class="details-product-purchase__add-to-bag">',
      '<button type="button" class="form-control__button--add-to-bag">Add to bag</button>',
      '</div>',
      '</body>',
      '</html>',
    ].join(''),
    {
      runScripts: 'outside-only',
      url: 'https://example.test/storefront-test.html',
    }
  );
  const { window } = dom;
  const warnings = [];
  const apiLoaded = createEventBus();
  const pageLoaded = createEventBus();
  const cartChanged = createEventBus();
  let now = options.now || 1000;

  class FakePerformanceObserver {
    constructor(callback) {
      this.callback = callback;
      this.type = '';
      FakePerformanceObserver.instances.push(this);
    }

    observe(options) {
      this.type = options.type;
    }
  }

  FakePerformanceObserver.instances = [];

  window.console = {
    warn(...args) {
      warnings.push(args.join(' '));
    },
    log() {},
    error() {},
  };
  window.Math.random = () => (options.randomValue === undefined ? 0 : options.randomValue);
  window.performance.now = () => now;
  window.innerWidth = options.innerWidth || 1280;
  window.ThemePerformancePulseEcwidConfig = Object.assign(
    {
      publicConfig: {
        enabled: true,
        sampleRate: 100,
        rollingWindowMinutes: 15,
        maxRecentEvents: 40,
        trackLongTasks: true,
        trackAddToCart: true,
        showStorefrontPanel: true,
        appClientId: 'pulse-app',
        panelTitle: 'Theme Performance Pulse',
      },
    },
    options.bootstrap || {}
  );
  window.Ecwid = {
    OnAPILoaded: apiLoaded,
    OnPageLoaded: pageLoaded,
    OnCartChanged: cartChanged,
    getAppPublicConfig: options.getAppPublicConfig,
  };
  window.PerformanceObserver = options.disablePerformanceObserver ? undefined : FakePerformanceObserver;

  if (typeof options.beforeScripts === 'function') {
    options.beforeScripts(window);
  }

  window.eval(pulseCoreSource);
  window.eval(storefrontSource);
  await flush(window, 4);

  return {
    dom,
    window,
    apiLoaded,
    pageLoaded,
    cartChanged,
    warnings,
    setNow(value) {
      now = value;
    },
    triggerObserver(type, entries) {
      FakePerformanceObserver.instances
        .filter((observer) => observer.type === type)
        .forEach((observer) => {
          observer.callback({
            getEntries() {
              return entries;
            },
          });
        });
    },
    readSnapshot() {
      return JSON.parse(window.localStorage.getItem('theme-performance-pulse:ecwid:snapshot') || 'null');
    },
  };
}

test('storefront runtime records real Ecwid page views and renders the shopper panel', async () => {
  const app = await bootStorefront({
    bootstrap: {
      publicConfig: {
        enabled: true,
        sampleRate: 100,
        rollingWindowMinutes: 15,
        maxRecentEvents: 40,
        trackLongTasks: true,
        trackAddToCart: true,
        showStorefrontPanel: true,
        appClientId: 'pulse-app',
        panelTitle: 'Visitor Pulse',
      },
    },
    getAppPublicConfig() {
      return JSON.stringify({ appClientId: 'pulse-app', sampleRate: 100 });
    },
  });

  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'PRODUCT' });
  await flush(app.window, 4);

  const snapshot = app.readSnapshot();
  assert.equal(snapshot.totals.page_views, 1);
  assert.equal(snapshot.breakdown[0].page_type, 'product');
  assert.match(app.window.document.body.textContent, /Visitor Pulse/);
  assert.match(app.window.document.body.textContent, /Browser Snapshot/);
  app.dom.window.close();
});

test('storefront runtime records slow add-to-cart events from shopper interactions', async () => {
  const app = await bootStorefront();
  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'PRODUCT' });

  const addToBagButton = app.window.document.querySelector('.form-control__button--add-to-bag');
  app.setNow(100);
  addToBagButton.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
  app.setNow(520);
  app.cartChanged.trigger();
  await flush(app.window, 4);

  const snapshot = app.readSnapshot();
  assert.equal(snapshot.totals.slow_add_to_cart, 1);
  assert.equal(snapshot.recent_events.some((event) => event.metric === 'add_to_cart'), true);
  assert.match(app.window.document.body.textContent, /Slow Add To Cart/);
  app.dom.window.close();
});

test('storefront runtime ignores fast add-to-cart interactions below the warning threshold', async () => {
  const app = await bootStorefront();
  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'PRODUCT' });

  const addToBagButton = app.window.document.querySelector('.form-control__button--add-to-bag');
  app.setNow(100);
  addToBagButton.dispatchEvent(new app.window.MouseEvent('click', { bubbles: true }));
  app.setNow(200);
  app.cartChanged.trigger();
  await flush(app.window, 4);

  const snapshot = app.readSnapshot();
  assert.equal(snapshot.totals.slow_add_to_cart, 0);
  assert.equal(snapshot.recent_events.length, 1);
  assert.equal(snapshot.recent_events[0].metric, 'page_view');
  app.dom.window.close();
});

test('storefront runtime records shopper vitals and long tasks on pagehide', async () => {
  const app = await bootStorefront();
  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'CATEGORY' });
  app.triggerObserver('largest-contentful-paint', [{ startTime: 4300 }]);
  app.triggerObserver('layout-shift', [{ value: 0.31, hadRecentInput: false }]);
  app.triggerObserver('longtask', [{ duration: 300 }]);
  app.setNow(100);
  app.window.document.body.dispatchEvent(new app.window.MouseEvent('pointerdown', { bubbles: true }));
  app.setNow(750);
  app.window.dispatchEvent(new app.window.Event('pagehide'));
  await flush(app.window, 4);

  const snapshot = app.readSnapshot();
  assert.equal(snapshot.totals.poor_lcp, 1);
  assert.equal(snapshot.totals.poor_cls, 1);
  assert.equal(snapshot.totals.poor_inp, 1);
  assert.equal(snapshot.totals.long_tasks, 1);
  assert.equal(snapshot.totals.degraded_pages, 1);
  app.dom.window.close();
});

test('storefront runtime survives malformed Ecwid public config and cached snapshots', async () => {
  const app = await bootStorefront({
    beforeScripts(window) {
      window.localStorage.setItem('theme-performance-pulse:ecwid:snapshot', '{bad json');
    },
    getAppPublicConfig() {
      throw new Error('boom');
    },
  });

  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'HOME' });
  await flush(app.window, 4);

  const snapshot = app.readSnapshot();
  assert.equal(Boolean(snapshot), true);
  assert.equal(Array.isArray(snapshot.recent_events), true);
  assert.notEqual(app.window.document.querySelector('.tpp-storefront-panel'), null);
  app.dom.window.close();
});

test('storefront runtime disables sampling cleanly when this shopper is outside the sample', async () => {
  const app = await bootStorefront({
    bootstrap: {
      publicConfig: {
        sampleRate: 1,
        showStorefrontPanel: true,
      },
    },
    randomValue: 0.99,
  });

  app.apiLoaded.trigger();
  app.pageLoaded.trigger({ type: 'PRODUCT' });
  await flush(app.window, 4);

  assert.equal(app.window.localStorage.getItem('theme-performance-pulse:ecwid:snapshot'), null);
  assert.equal(app.window.document.querySelector('.tpp-storefront-panel'), null);
  app.dom.window.close();
});