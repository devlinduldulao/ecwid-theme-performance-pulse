const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../src/shared/pulse-core');

test('normalizeConfig clamps numeric values into supported ranges', () => {
  const config = core.normalizeConfig({
    sampleRate: 400,
    rollingWindowMinutes: 0,
    maxRecentEvents: 500,
  });

  assert.equal(config.sampleRate, 100);
  assert.equal(config.rollingWindowMinutes, 1);
  assert.equal(config.maxRecentEvents, 100);
});

test('parsePublicConfig accepts Ecwid storage wrapper arrays', () => {
  const config = core.parsePublicConfig([
    {
      key: 'public',
      value: JSON.stringify({ sampleRate: 55, appClientId: 'pulse-app' }),
    },
  ]);

  assert.equal(config.sampleRate, 55);
  assert.equal(config.appClientId, 'pulse-app');
});

test('recordEvent aggregates poor vitals and degraded pages', () => {
  const config = core.normalizeConfig({ rollingWindowMinutes: 30, maxRecentEvents: 20 });
  const now = 1_700_000_000;
  let snapshot = core.createEmptySnapshot(config, now);

  [
    { type: 'page_view', value: 1 },
    { type: 'web_vital', metric: 'lcp', value: 4500 },
    { type: 'web_vital', metric: 'inp', value: 600 },
    { type: 'web_vital', metric: 'cls', value: 0.3 },
  ].forEach((payload, index) => {
    const event = core.sanitizeEvent(
      Object.assign({}, payload, {
        pageType: 'product',
        deviceType: 'mobile',
        occurredAt: now - index,
      }),
      config,
      now
    );
    snapshot = core.recordEvent(snapshot, event, config, now);
  });

  assert.equal(snapshot.totals.page_views, 1);
  assert.equal(snapshot.totals.poor_lcp, 1);
  assert.equal(snapshot.totals.poor_inp, 1);
  assert.equal(snapshot.totals.poor_cls, 1);
  assert.equal(snapshot.totals.degraded_pages, 1);
  assert.equal(snapshot.breakdown[0].health, 'degraded');
});

test('parsePublicConfig falls back to defaults for invalid JSON payloads', () => {
  const config = core.parsePublicConfig('{not json');

  assert.equal(config.enabled, true);
  assert.equal(config.sampleRate, 100);
  assert.equal(config.panelTitle, 'Theme Performance Pulse');
});

test('serializePublicConfig round-trips monitoring configuration', () => {
  const serialized = core.serializePublicConfig({
    enabled: false,
    sampleRate: 25,
    rollingWindowMinutes: 45,
    maxRecentEvents: 10,
    trackLongTasks: false,
    appClientId: 'pulse-app',
    panelTitle: 'Store Health',
    thresholds: {
      lcp: { good: 1800, poor: 3200 },
    },
  });
  const config = core.parsePublicConfig(serialized);

  assert.equal(config.enabled, false);
  assert.equal(config.sampleRate, 25);
  assert.equal(config.rollingWindowMinutes, 45);
  assert.equal(config.maxRecentEvents, 10);
  assert.equal(config.trackLongTasks, false);
  assert.equal(config.appClientId, 'pulse-app');
  assert.equal(config.panelTitle, 'Store Health');
  assert.equal(config.thresholds.lcp.good, 1800);
  assert.equal(config.thresholds.lcp.poor, 3200);
});

test('inferDeviceType and mapEcwidPageType normalize common values', () => {
  assert.equal(core.inferDeviceType(1440), 'desktop');
  assert.equal(core.inferDeviceType(820), 'tablet');
  assert.equal(core.inferDeviceType(390), 'mobile');
  assert.equal(core.mapEcwidPageType({ type: 'PRODUCT' }), 'product');
  assert.equal(core.mapEcwidPageType({ type: 'ORDER_CONFIRMATION' }), 'checkout');
  assert.equal(core.mapEcwidPageType({ type: 'UNKNOWN' }), 'other');
});

test('sanitizeEvent maps metrics, buckets, and fallback values', () => {
  const config = core.normalizeConfig({
    thresholds: {
      longTask: { warning: 100, critical: 200 },
      addToCart: { warning: 250, critical: 500 },
    },
  });

  const longTask = core.sanitizeEvent(
    {
      type: 'long_task',
      value: 240,
      pageType: 'PRODUCT',
      deviceType: 'DESKTOP',
      occurredAt: 123,
    },
    config,
    999
  );
  const addToCart = core.sanitizeEvent(
    {
      type: 'add_to_cart_delay',
      value: 300,
      pageType: 'cart',
      deviceType: 'mobile',
    },
    config,
    500
  );

  assert.equal(longTask.metric, 'long_task');
  assert.equal(longTask.bucket, 'critical');
  assert.equal(longTask.page_type, 'product');
  assert.equal(longTask.device_type, 'desktop');
  assert.equal(longTask.occurred_at, 123);
  assert.equal(addToCart.metric, 'add_to_cart');
  assert.equal(addToCart.bucket, 'warning');
  assert.equal(addToCart.occurred_at, 500);
});

test('rebuildSnapshot prunes expired events and keeps recent events within normalized limits', () => {
  const config = core.normalizeConfig({ rollingWindowMinutes: 1, maxRecentEvents: 2 });
  const now = 1_700_000_000;
  const snapshot = core.rebuildSnapshot(
    [
      { metric: 'page_view', page_type: 'home', device_type: 'mobile', occurred_at: now - 30 },
      { metric: 'long_task', bucket: 'warning', page_type: 'home', device_type: 'mobile', occurred_at: now - 20 },
      { metric: 'add_to_cart', bucket: 'critical', page_type: 'cart', device_type: 'desktop', occurred_at: now - 10 },
      { metric: 'page_view', page_type: 'home', device_type: 'mobile', occurred_at: now - 120 },
    ],
    config,
    now
  );

  assert.equal(snapshot.totals.page_views, 1);
  assert.equal(snapshot.totals.long_tasks, 1);
  assert.equal(snapshot.totals.slow_add_to_cart, 1);
  assert.equal(config.maxRecentEvents, 5);
  assert.equal(snapshot.recent_events.length, 3);
  assert.equal(snapshot.breakdown.length, 2);
});