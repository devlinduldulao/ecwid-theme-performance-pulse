const test = require('node:test');
const assert = require('node:assert/strict');

const core = require('../src/shared/dashboard-core');

test('normalizeDashboardConfig expands relative audit target URLs from storefront base URL', () => {
  const config = core.normalizeDashboardConfig({
    storefrontBaseUrl: 'https://example.ecwid.com/store/',
    auditTargets: 'Homepage | /\nCart | /cart',
  });

  assert.equal(config.auditTargets[0].url, 'https://example.ecwid.com/');
  assert.equal(config.auditTargets[1].url, 'https://example.ecwid.com/cart');
});

test('parseDashboardConfig accepts Ecwid storage wrapper arrays', () => {
  const config = core.parseDashboardConfig([
    {
      key: 'public',
      value: JSON.stringify({
        storefrontBaseUrl: 'https://example.com/',
        strategy: 'desktop',
        auditTargets: [{ label: 'Home', url: 'https://example.com/' }],
      }),
    },
  ]);

  assert.equal(config.strategy, 'desktop');
  assert.equal(config.auditTargets[0].label, 'Home');
});

test('summarizePageSpeedResult extracts scores and opportunities', () => {
  const summary = core.summarizePageSpeedResult(
    { label: 'Homepage', url: 'https://example.com/' },
    'mobile',
    {
      lighthouseResult: {
        categories: {
          performance: { score: 0.41 },
          accessibility: { score: 0.92 },
          'best-practices': { score: 0.88 },
          seo: { score: 0.96 },
        },
        audits: {
          'largest-contentful-paint': { numericValue: 4210 },
          'cumulative-layout-shift': { numericValue: 0.21 },
          'interaction-to-next-paint': { numericValue: 320 },
          'total-blocking-time': { numericValue: 280 },
          'render-blocking-resources': {
            score: 0,
            title: 'Eliminate render-blocking resources',
            displayValue: 'Potential savings of 1,200 ms',
          },
        },
      },
    }
  );

  assert.equal(summary.scores.performance, 41);
  assert.equal(summary.metrics.lcp, '4210 ms');
  assert.equal(summary.opportunities[0].title, 'Eliminate render-blocking resources');
});

test('buildPreviewAuditResults returns sample rows for configured targets', () => {
  const preview = core.buildPreviewAuditResults({
    storefrontBaseUrl: 'https://example.com/',
    strategy: 'desktop',
    auditTargets: 'Homepage | /\nProduct | /products/demo',
  });

  assert.equal(preview.length, 2);
  assert.equal(preview[0].strategy, 'desktop');
  assert.equal(preview[0].isPreview, true);
  assert.match(preview[1].url, /^https:\/\/example\.com\/products\/demo/);
  assert.ok(preview[0].opportunities.length > 0);
});

test('normalizeDashboardConfig falls back to empty default targets when input is invalid', () => {
  const config = core.normalizeDashboardConfig({
    storefrontBaseUrl: 'not-a-url',
    strategy: 'tablet',
    auditTargets: 'Broken row only',
  });

  assert.equal(config.storefrontBaseUrl, '');
  assert.equal(config.strategy, 'mobile');
  assert.equal(config.auditTargets.length, 4);
  assert.equal(config.auditTargets[0].label, 'Homepage');
  assert.equal(config.auditTargets[0].url, '');
});

test('parseDashboardConfig falls back when storage payload is invalid JSON', () => {
  const config = core.parseDashboardConfig('{bad json');

  assert.equal(config.strategy, 'mobile');
  assert.equal(config.auditTargets.length, 4);
  assert.equal(config.auditTargets[1].label, 'Category');
});

test('serializeDashboardConfig round-trips normalized owner settings', () => {
  const serialized = core.serializeDashboardConfig({
    appClientId: ' pulse-app ',
    storefrontBaseUrl: 'https://example.com/store/',
    strategy: 'desktop',
    auditTargets: 'Homepage | /\nCart | /cart',
  });
  const config = core.parseDashboardConfig(serialized);

  assert.equal(config.appClientId, 'pulse-app');
  assert.equal(config.strategy, 'desktop');
  assert.equal(config.auditTargets[0].url, 'https://example.com/');
  assert.equal(config.auditTargets[1].url, 'https://example.com/cart');
});

test('summarizePageSpeedResult tolerates missing categories and ignores non-actionable audits', () => {
  const summary = core.summarizePageSpeedResult(
    { label: 'Homepage', url: 'https://example.com/' },
    'mobile',
    {
      lighthouseResult: {
        categories: {
          performance: { score: 0.91 },
        },
        audits: {
          'render-blocking-resources': {
            score: 1,
            title: 'Already fine',
          },
          'unused-css-rules': {
            scoreDisplayMode: 'notApplicable',
          },
        },
      },
    }
  );

  assert.equal(summary.scores.performance, 91);
  assert.equal(summary.scores.accessibility, null);
  assert.equal(summary.metrics.lcp, 'n/a');
  assert.equal(summary.opportunities.length, 0);
  assert.equal(summary.headline, 'No high-signal issues detected');
});

test('summarizeAuditBatch averages scored rows and counts critical pages', () => {
  const summary = core.summarizeAuditBatch([
    {
      scores: { performance: 40, accessibility: 80, seo: 90, bestPractices: 70 },
    },
    {
      scores: { performance: 80, accessibility: 100, seo: 100, bestPractices: 90 },
    },
    {
      scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
    },
  ]);

  assert.equal(summary.averagePerformance, 60);
  assert.equal(summary.averageAccessibility, 90);
  assert.equal(summary.averageSeo, 95);
  assert.equal(summary.averageBestPractices, 80);
  assert.equal(summary.auditedPages, 3);
  assert.equal(summary.criticalPages, 1);
});

test('buildPreviewAuditResults falls back to demo targets when none are configured', () => {
  const preview = core.buildPreviewAuditResults({ storefrontBaseUrl: 'https://example.com/' });

  assert.equal(preview.length, 4);
  assert.equal(preview[0].url, 'https://example.com/');
  assert.equal(preview[3].url, 'https://example.com/cart');
  assert.equal(preview[2].headline, 'Compress product gallery assets');
});