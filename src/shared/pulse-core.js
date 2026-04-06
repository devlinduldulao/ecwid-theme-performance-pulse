(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
    return;
  }

  root.ThemePerformancePulseCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var DEFAULT_THRESHOLDS = {
    lcp: { good: 2500, poor: 4000 },
    cls: { good: 0.1, poor: 0.25 },
    inp: { good: 200, poor: 500 },
    longTask: { warning: 120, critical: 250 },
    addToCart: { warning: 300, critical: 800 },
  };

  var DEFAULT_CONFIG = {
    version: 1,
    enabled: true,
    sampleRate: 100,
    rollingWindowMinutes: 15,
    maxRecentEvents: 40,
    trackLongTasks: true,
    trackAddToCart: true,
    showStorefrontPanel: true,
    appClientId: '',
    panelTitle: 'Theme Performance Pulse',
    thresholds: DEFAULT_THRESHOLDS,
  };

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function clampNumber(value, fallback, minimum, maximum) {
    var parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.min(Math.max(parsed, minimum), maximum);
  }

  function allowedString(value, allowed, fallback) {
    var normalized = String(value || '').trim().toLowerCase();
    return allowed.indexOf(normalized) >= 0 ? normalized : fallback;
  }

  function roundMetric(value) {
    return Math.round(Number(value || 0) * 10000) / 10000;
  }

  function mergeThresholds(input) {
    var merged = JSON.parse(JSON.stringify(DEFAULT_THRESHOLDS));

    if (!isPlainObject(input)) {
      return merged;
    }

    Object.keys(merged).forEach(function (key) {
      if (!isPlainObject(input[key])) {
        return;
      }

      Object.keys(merged[key]).forEach(function (limitKey) {
        if (input[key][limitKey] === undefined) {
          return;
        }

        merged[key][limitKey] = clampNumber(
          input[key][limitKey],
          merged[key][limitKey],
          0,
          60000
        );
      });
    });

    return merged;
  }

  function normalizeConfig(input) {
    var source = isPlainObject(input) ? input : {};

    return {
      version: DEFAULT_CONFIG.version,
      enabled: source.enabled !== false,
      sampleRate: clampNumber(source.sampleRate, DEFAULT_CONFIG.sampleRate, 1, 100),
      rollingWindowMinutes: clampNumber(
        source.rollingWindowMinutes,
        DEFAULT_CONFIG.rollingWindowMinutes,
        1,
        120
      ),
      maxRecentEvents: clampNumber(
        source.maxRecentEvents,
        DEFAULT_CONFIG.maxRecentEvents,
        5,
        100
      ),
      trackLongTasks: source.trackLongTasks !== false,
      trackAddToCart: source.trackAddToCart !== false,
      showStorefrontPanel: source.showStorefrontPanel !== false,
      appClientId: String(source.appClientId || '').trim(),
      panelTitle: String(source.panelTitle || DEFAULT_CONFIG.panelTitle).trim() || DEFAULT_CONFIG.panelTitle,
      thresholds: mergeThresholds(source.thresholds),
    };
  }

  function parseJsonCandidate(value) {
    if (isPlainObject(value)) {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    var trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    try {
      return JSON.parse(trimmed);
    } catch (error) {
      try {
        return JSON.parse(trimmed.replace(/'/g, '"'));
      } catch (secondError) {
        return null;
      }
    }
  }

  function parsePublicConfig(input) {
    if (Array.isArray(input) && input.length > 0) {
      return parsePublicConfig(input[0]);
    }

    if (isPlainObject(input) && input.value !== undefined) {
      return normalizeConfig(parseJsonCandidate(input.value));
    }

    return normalizeConfig(parseJsonCandidate(input) || input);
  }

  function serializePublicConfig(config) {
    var normalized = normalizeConfig(config);

    return JSON.stringify({
      enabled: normalized.enabled,
      sampleRate: normalized.sampleRate,
      rollingWindowMinutes: normalized.rollingWindowMinutes,
      maxRecentEvents: normalized.maxRecentEvents,
      trackLongTasks: normalized.trackLongTasks,
      trackAddToCart: normalized.trackAddToCart,
      showStorefrontPanel: normalized.showStorefrontPanel,
      appClientId: normalized.appClientId,
      panelTitle: normalized.panelTitle,
      thresholds: normalized.thresholds,
    });
  }

  function inferDeviceType(width) {
    if (width >= 1024) {
      return 'desktop';
    }

    if (width >= 768) {
      return 'tablet';
    }

    return 'mobile';
  }

  function mapEcwidPageType(page) {
    var type = page && page.type ? String(page.type).toUpperCase() : '';

    switch (type) {
      case 'PRODUCT':
        return 'product';
      case 'CATEGORY':
        return 'category';
      case 'CART':
        return 'cart';
      case 'SEARCH':
        return 'search';
      case 'CHECKOUT':
        return 'checkout';
      case 'ORDER_CONFIRMATION':
        return 'checkout';
      case 'ACCOUNT':
        return 'account';
      case 'FRONTPAGE':
      case 'HOME':
        return 'home';
      default:
        return 'other';
    }
  }

  function inferVitalRating(metric, value, thresholds) {
    var limits = thresholds[metric] || DEFAULT_THRESHOLDS[metric];

    if (!limits) {
      return 'good';
    }

    if (value <= limits.good) {
      return 'good';
    }

    if (value <= limits.poor) {
      return 'needs-improvement';
    }

    return 'poor';
  }

  function inferBucket(metric, rating, value, thresholds) {
    if (metric === 'long_task') {
      if (value >= thresholds.longTask.critical) {
        return 'critical';
      }

      if (value >= thresholds.longTask.warning) {
        return 'warning';
      }

      return 'nominal';
    }

    if (metric === 'add_to_cart') {
      if (value >= thresholds.addToCart.critical) {
        return 'critical';
      }

      if (value >= thresholds.addToCart.warning) {
        return 'warning';
      }

      return 'nominal';
    }

    if (metric === 'page_view') {
      return 'nominal';
    }

    return rating;
  }

  function sanitizeEvent(payload, config, nowSeconds) {
    var normalizedConfig = normalizeConfig(config);
    var type = allowedString(payload.type, ['page_view', 'web_vital', 'long_task', 'add_to_cart_delay'], 'page_view');
    var metric = 'page_view';

    if (type === 'web_vital') {
      metric = allowedString(payload.metric, ['lcp', 'cls', 'inp'], 'lcp');
    } else if (type === 'long_task') {
      metric = 'long_task';
    } else if (type === 'add_to_cart_delay') {
      metric = 'add_to_cart';
    }

    var value = roundMetric(payload.value || 0);
    var rating = payload.rating || inferVitalRating(metric, value, normalizedConfig.thresholds);
    var bucket = payload.bucket || inferBucket(metric, rating, value, normalizedConfig.thresholds);

    return {
      type: type,
      metric: metric,
      value: value,
      rating: allowedString(rating, ['good', 'needs-improvement', 'poor'], 'good'),
      bucket: allowedString(bucket, ['good', 'needs-improvement', 'poor', 'nominal', 'warning', 'critical'], 'nominal'),
      page_type: allowedString(
        payload.pageType || payload.page_type,
        ['home', 'category', 'product', 'cart', 'checkout', 'search', 'account', 'other'],
        'other'
      ),
      device_type: allowedString(
        payload.deviceType || payload.device_type,
        ['mobile', 'tablet', 'desktop', 'other'],
        'other'
      ),
      context: isPlainObject(payload.context) ? payload.context : {},
      occurred_at: clampNumber(payload.occurredAt || payload.occurred_at || nowSeconds, nowSeconds, 1, 9999999999),
    };
  }

  function createEmptySnapshot(config, nowSeconds) {
    var normalizedConfig = normalizeConfig(config);

    return {
      generated_at: nowSeconds,
      window_seconds: normalizedConfig.rollingWindowMinutes * 60,
      max_recent_events: normalizedConfig.maxRecentEvents,
      totals: {
        page_views: 0,
        poor_lcp: 0,
        poor_cls: 0,
        poor_inp: 0,
        long_tasks: 0,
        slow_add_to_cart: 0,
        degraded_pages: 0,
      },
      incidents: [],
      breakdown: [],
      recent_events: [],
    };
  }

  function flattenIncidents(incidents) {
    var rows = [];

    Object.keys(incidents).forEach(function (metric) {
      Object.keys(incidents[metric]).forEach(function (key) {
        var count = incidents[metric][key];

        if (count < 3) {
          return;
        }

        var parts = key.split('|');
        rows.push({
          metric: metric,
          page_type: parts[0],
          device_type: parts[1],
          count: count,
        });
      });
    });

    return rows;
  }

  function rebuildSnapshot(events, config, nowSeconds) {
    var normalizedConfig = normalizeConfig(config);
    var cutoff = nowSeconds - normalizedConfig.rollingWindowMinutes * 60;
    var recentEvents = (Array.isArray(events) ? events : [])
      .filter(function (event) {
        return Number(event && event.occurred_at) >= cutoff;
      })
      .sort(function (left, right) {
        return Number(right.occurred_at) - Number(left.occurred_at);
      });
    var snapshot = createEmptySnapshot(normalizedConfig, nowSeconds);
    var breakdown = {};
    var incidents = { lcp: {}, cls: {}, inp: {} };

    recentEvents.forEach(function (event) {
      var key = event.page_type + '|' + event.device_type;

      if (!breakdown[key]) {
        breakdown[key] = {
          page_type: event.page_type,
          device_type: event.device_type,
          page_views: 0,
          poor_vitals: 0,
          long_tasks: 0,
          slow_add_to_cart: 0,
          health: 'healthy',
          last_seen: event.occurred_at,
        };
      }

      breakdown[key].last_seen = Math.max(breakdown[key].last_seen, event.occurred_at);

      if (event.metric === 'page_view') {
        snapshot.totals.page_views += 1;
        breakdown[key].page_views += 1;
      }

      if (event.metric === 'lcp' && event.rating === 'poor') {
        snapshot.totals.poor_lcp += 1;
        breakdown[key].poor_vitals += 1;
        incidents.lcp[key] = (incidents.lcp[key] || 0) + 1;
      }

      if (event.metric === 'cls' && event.rating === 'poor') {
        snapshot.totals.poor_cls += 1;
        breakdown[key].poor_vitals += 1;
        incidents.cls[key] = (incidents.cls[key] || 0) + 1;
      }

      if (event.metric === 'inp' && event.rating === 'poor') {
        snapshot.totals.poor_inp += 1;
        breakdown[key].poor_vitals += 1;
        incidents.inp[key] = (incidents.inp[key] || 0) + 1;
      }

      if (event.metric === 'long_task' && (event.bucket === 'warning' || event.bucket === 'critical')) {
        snapshot.totals.long_tasks += 1;
        breakdown[key].long_tasks += 1;
      }

      if (event.metric === 'add_to_cart' && (event.bucket === 'warning' || event.bucket === 'critical')) {
        snapshot.totals.slow_add_to_cart += 1;
        breakdown[key].slow_add_to_cart += 1;
      }
    });

    snapshot.breakdown = Object.keys(breakdown)
      .map(function (key) {
        var row = breakdown[key];

        if (row.poor_vitals >= 3 || row.long_tasks >= 5 || row.slow_add_to_cart >= 3) {
          row.health = 'degraded';
          snapshot.totals.degraded_pages += 1;
        } else if (row.poor_vitals > 0 || row.long_tasks > 0 || row.slow_add_to_cart > 0) {
          row.health = 'watch';
        }

        return row;
      })
      .sort(function (left, right) {
        return Number(right.last_seen) - Number(left.last_seen);
      });
    snapshot.incidents = flattenIncidents(incidents);
    snapshot.recent_events = recentEvents.slice(0, normalizedConfig.maxRecentEvents);

    return snapshot;
  }

  function recordEvent(snapshot, event, config, nowSeconds) {
    var existingEvents = Array.isArray(snapshot && snapshot.recent_events) ? snapshot.recent_events.slice() : [];
    existingEvents.push(event);
    return rebuildSnapshot(existingEvents, config, nowSeconds);
  }

  return {
    DEFAULT_CONFIG: DEFAULT_CONFIG,
    DEFAULT_THRESHOLDS: DEFAULT_THRESHOLDS,
    createEmptySnapshot: createEmptySnapshot,
    inferBucket: inferBucket,
    inferDeviceType: inferDeviceType,
    inferVitalRating: inferVitalRating,
    mapEcwidPageType: mapEcwidPageType,
    normalizeConfig: normalizeConfig,
    parsePublicConfig: parsePublicConfig,
    rebuildSnapshot: rebuildSnapshot,
    recordEvent: recordEvent,
    sanitizeEvent: sanitizeEvent,
    serializePublicConfig: serializePublicConfig,
  };
});