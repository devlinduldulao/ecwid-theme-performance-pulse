(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.ThemePerformancePulseDashboardCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_AUDIT_TARGETS = [
    { label: 'Homepage', url: '' },
    { label: 'Category', url: '' },
    { label: 'Product', url: '' },
    { label: 'Cart', url: '' },
  ];

  var DEFAULT_DASHBOARD_CONFIG = {
    appClientId: '',
    storefrontBaseUrl: '',
    strategy: 'mobile',
    auditTargets: DEFAULT_AUDIT_TARGETS,
  };

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function normalizeUrl(value) {
    var raw = String(value || '').trim();

    if (!raw) {
      return '';
    }

    try {
      return new URL(raw).toString();
    } catch (error) {
      return '';
    }
  }

  function normalizeStrategy(value) {
    var strategy = String(value || '').trim().toLowerCase();
    return strategy === 'desktop' ? 'desktop' : 'mobile';
  }

  function absolutizeUrl(value, baseUrl) {
    var raw = String(value || '').trim();

    if (!raw) {
      return '';
    }

    try {
      if (/^https?:\/\//i.test(raw)) {
        return new URL(raw).toString();
      }

      if (!baseUrl) {
        return '';
      }

      return new URL(raw, normalizeUrl(baseUrl)).toString();
    } catch (error) {
      return '';
    }
  }

  function parseTargets(input, baseUrl) {
    if (Array.isArray(input)) {
      return input
        .map(function (target) {
          var label = String((target && target.label) || '').trim();
          var url = absolutizeUrl((target && target.url) || '', baseUrl);

          if (!label || !url) {
            return null;
          }

          return { label: label, url: url };
        })
        .filter(Boolean);
    }

    return String(input || '')
      .split(/\r?\n/)
      .map(function (line) {
        var trimmed = line.trim();

        if (!trimmed) {
          return null;
        }

        var parts = trimmed.split('|');
        var label = String(parts[0] || '').trim();
        var url = absolutizeUrl(parts.slice(1).join('|').trim(), baseUrl);

        if (!label || !url) {
          return null;
        }

        return { label: label, url: url };
      })
      .filter(Boolean);
  }

  function normalizeDashboardConfig(input) {
    var source = isPlainObject(input) ? input : {};
    var storefrontBaseUrl = normalizeUrl(source.storefrontBaseUrl);
    var auditTargets = parseTargets(source.auditTargets, storefrontBaseUrl);

    return {
      appClientId: String(source.appClientId || '').trim(),
      storefrontBaseUrl: storefrontBaseUrl,
      strategy: normalizeStrategy(source.strategy),
      auditTargets: auditTargets.length
        ? auditTargets
        : DEFAULT_AUDIT_TARGETS.map(function (target) {
            return { label: target.label, url: '' };
          }),
    };
  }

  function serializeDashboardConfig(config) {
    var normalized = normalizeDashboardConfig(config);

    return JSON.stringify({
      appClientId: normalized.appClientId,
      storefrontBaseUrl: normalized.storefrontBaseUrl,
      strategy: normalized.strategy,
      auditTargets: normalized.auditTargets,
    });
  }

  function parseDashboardConfig(input) {
    if (Array.isArray(input) && input.length > 0) {
      return parseDashboardConfig(input[0]);
    }

    if (isPlainObject(input) && input.value !== undefined) {
      return parseDashboardConfig(input.value);
    }

    if (isPlainObject(input)) {
      return normalizeDashboardConfig(input);
    }

    try {
      return normalizeDashboardConfig(JSON.parse(String(input || '{}')));
    } catch (error) {
      return normalizeDashboardConfig({});
    }
  }

  function targetListToText(targets) {
    return (Array.isArray(targets) ? targets : [])
      .filter(function (target) {
        return target && target.label && target.url;
      })
      .map(function (target) {
        return target.label + ' | ' + target.url;
      })
      .join('\n');
  }

  function percentScore(value) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? Math.round(numeric * 100) : null;
  }

  function scoreTone(score) {
    if (score === null) {
      return 'unknown';
    }

    if (score >= 90) {
      return 'good';
    }

    if (score >= 50) {
      return 'watch';
    }

    return 'poor';
  }

  function formatMetricValue(key, value) {
    var numeric = Number(value);

    if (!Number.isFinite(numeric)) {
      return 'n/a';
    }

    if (key === 'cls') {
      return numeric.toFixed(3);
    }

    return Math.round(numeric) + ' ms';
  }

  function extractOpportunity(audits, key, title) {
    var audit = audits[key];

    if (!audit || audit.scoreDisplayMode === 'notApplicable' || audit.score === 1) {
      return null;
    }

    return {
      key: key,
      title: audit.title || title,
      description: audit.displayValue || audit.description || 'Needs investigation',
      tone: scoreTone(percentScore(audit.score)),
    };
  }

  function summarizePageSpeedResult(target, strategy, payload) {
    var lighthouseResult = payload && payload.lighthouseResult ? payload.lighthouseResult : {};
    var categories = lighthouseResult.categories || {};
    var audits = lighthouseResult.audits || {};
    var opportunities = [
      extractOpportunity(audits, 'render-blocking-resources', 'Remove render-blocking resources'),
      extractOpportunity(audits, 'unused-javascript', 'Reduce unused JavaScript'),
      extractOpportunity(audits, 'unused-css-rules', 'Reduce unused CSS'),
      extractOpportunity(audits, 'server-response-time', 'Improve server response time'),
      extractOpportunity(audits, 'uses-text-compression', 'Enable text compression'),
    ].filter(Boolean).slice(0, 3);

    return {
      label: target.label,
      strategy: strategy,
      url: target.url,
      fetchedAt: new Date().toISOString(),
      scores: {
        performance: percentScore(categories.performance && categories.performance.score),
        accessibility: percentScore(categories.accessibility && categories.accessibility.score),
        bestPractices: percentScore(categories['best-practices'] && categories['best-practices'].score),
        seo: percentScore(categories.seo && categories.seo.score),
      },
      metrics: {
        lcp: formatMetricValue('lcp', audits['largest-contentful-paint'] && audits['largest-contentful-paint'].numericValue),
        cls: formatMetricValue('cls', audits['cumulative-layout-shift'] && audits['cumulative-layout-shift'].numericValue),
        inp: formatMetricValue('inp', audits['interaction-to-next-paint'] && audits['interaction-to-next-paint'].numericValue),
        tbt: formatMetricValue('tbt', audits['total-blocking-time'] && audits['total-blocking-time'].numericValue),
      },
      opportunities: opportunities,
      headline: opportunities.length ? opportunities[0].title : 'No high-signal issues detected',
    };
  }

  function summarizeAuditBatch(results) {
    var rows = Array.isArray(results) ? results : [];
    var totals = {
      performance: 0,
      accessibility: 0,
      seo: 0,
      bestPractices: 0,
      count: 0,
      critical: 0,
    };

    rows.forEach(function (row) {
      ['performance', 'accessibility', 'seo', 'bestPractices'].forEach(function (key) {
        if (row.scores[key] !== null) {
          totals[key] += row.scores[key];
        }
      });

      if (row.scores.performance !== null) {
        totals.count += 1;
      }

      if (row.scores.performance !== null && row.scores.performance < 50) {
        totals.critical += 1;
      }
    });

    function average(key) {
      return totals.count ? Math.round(totals[key] / totals.count) : 0;
    }

    return {
      averagePerformance: average('performance'),
      averageAccessibility: average('accessibility'),
      averageSeo: average('seo'),
      averageBestPractices: average('bestPractices'),
      auditedPages: rows.length,
      criticalPages: totals.critical,
    };
  }

  function previewFallbackTargets(baseUrl) {
    var resolvedBaseUrl = normalizeUrl(baseUrl) || 'https://demo-store.example.com/';
    var defaults = [
      { label: 'Homepage', path: '/' },
      { label: 'Category', path: '/collections/spring' },
      { label: 'Product', path: '/products/linen-shirt' },
      { label: 'Cart', path: '/cart' },
    ];

    return defaults.map(function (target) {
      return {
        label: target.label,
        url: absolutizeUrl(target.path, resolvedBaseUrl),
      };
    });
  }

  function buildPreviewAuditResults(config) {
    var normalized = normalizeDashboardConfig(config);
    var targets = normalized.auditTargets.filter(function (target) {
      return target && target.label && target.url;
    });
    var presetRows = [
      {
        scores: { performance: 92, accessibility: 96, bestPractices: 95, seo: 98 },
        metrics: { lcp: '1860 ms', cls: '0.042', inp: '138 ms', tbt: '74 ms' },
        opportunities: [
          { title: 'Trim hero image bytes', description: 'Serve the homepage hero image in next-gen formats.', tone: 'watch' },
          { title: 'Delay third-party reviews widget', description: 'Load the reviews widget after primary content becomes visible.', tone: 'watch' },
        ],
      },
      {
        scores: { performance: 71, accessibility: 89, bestPractices: 84, seo: 93 },
        metrics: { lcp: '2640 ms', cls: '0.081', inp: '212 ms', tbt: '188 ms' },
        opportunities: [
          { title: 'Reduce category filter script cost', description: 'Split large collection filters so they load after first interaction.', tone: 'watch' },
          { title: 'Preload collection hero font', description: 'Move the category headline font into an early preload path.', tone: 'watch' },
        ],
      },
      {
        scores: { performance: 48, accessibility: 82, bestPractices: 78, seo: 91 },
        metrics: { lcp: '3980 ms', cls: '0.154', inp: '286 ms', tbt: '332 ms' },
        opportunities: [
          { title: 'Compress product gallery assets', description: 'Large gallery images are delaying the main product render.', tone: 'poor' },
          { title: 'Defer variant picker bundle', description: 'Load the full variant picker after the above-the-fold content.', tone: 'poor' },
          { title: 'Reduce unused JavaScript', description: 'Unused widget code is inflating product page parse time.', tone: 'watch' },
        ],
      },
      {
        scores: { performance: 64, accessibility: 88, bestPractices: 80, seo: 90 },
        metrics: { lcp: '3010 ms', cls: '0.097', inp: '240 ms', tbt: '224 ms' },
        opportunities: [
          { title: 'Simplify cart recommendations block', description: 'Cart upsell markup is adding a measurable layout shift.', tone: 'watch' },
          { title: 'Shorten checkout script chain', description: 'Third-party cart scripts are delaying interactivity.', tone: 'watch' },
        ],
      },
    ];

    if (!targets.length) {
      targets = previewFallbackTargets(normalized.storefrontBaseUrl);
    }

    return targets.map(function (target, index) {
      var preset = presetRows[index % presetRows.length];

      return {
        label: target.label,
        strategy: normalized.strategy,
        url: target.url,
        fetchedAt: new Date(Date.now() - index * 60000).toISOString(),
        scores: preset.scores,
        metrics: preset.metrics,
        opportunities: preset.opportunities,
        headline: preset.opportunities.length ? preset.opportunities[0].title : 'No high-signal issues detected',
        isPreview: true,
      };
    });
  }

  return {
    DEFAULT_DASHBOARD_CONFIG: DEFAULT_DASHBOARD_CONFIG,
    buildPreviewAuditResults: buildPreviewAuditResults,
    normalizeDashboardConfig: normalizeDashboardConfig,
    parseDashboardConfig: parseDashboardConfig,
    scoreTone: scoreTone,
    serializeDashboardConfig: serializeDashboardConfig,
    summarizeAuditBatch: summarizeAuditBatch,
    summarizePageSpeedResult: summarizePageSpeedResult,
    targetListToText: targetListToText,
  };
});