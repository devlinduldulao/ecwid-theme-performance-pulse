(() => {
  'use strict';

  var core = window.ThemePerformancePulseCore;

  if (!core || !window.Ecwid) {
    return;
  }

  var runtimeConfig = core.normalizeConfig(window.ThemePerformancePulseEcwidConfig || {});
  var snapshotKey = 'theme-performance-pulse:ecwid:snapshot';
  var currentPageType = 'other';
  var clsValue = 0;
  var lcpValue = 0;
  var interactionStart = 0;
  var addToCartStartedAt = 0;
  var panelReady = false;

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function storageAvailable() {
    try {
      return Boolean(window.localStorage);
    } catch (error) {
      return false;
    }
  }

  function loadSnapshot() {
    if (!storageAvailable()) {
      return core.createEmptySnapshot(runtimeConfig, nowSeconds());
    }

    try {
      var saved = window.localStorage.getItem(snapshotKey);
      var parsed = saved ? JSON.parse(saved) : null;
      return core.rebuildSnapshot(parsed && parsed.recent_events, runtimeConfig, nowSeconds());
    } catch (error) {
      return core.createEmptySnapshot(runtimeConfig, nowSeconds());
    }
  }

  function saveSnapshot(snapshot) {
    if (!storageAvailable()) {
      return;
    }

    window.localStorage.setItem(snapshotKey, JSON.stringify(snapshot));
  }

  function loadPublicConfig() {
    if (runtimeConfig.appClientId && typeof Ecwid.getAppPublicConfig === 'function') {
      try {
        var publicConfig = Ecwid.getAppPublicConfig(runtimeConfig.appClientId);
        runtimeConfig = core.normalizeConfig(
          Object.assign({}, runtimeConfig, core.parsePublicConfig(publicConfig))
        );
      } catch (error) {
        console.warn('[theme-performance-pulse] Failed to read public config:', error.message);
      }
    }

    if (window.ThemePerformancePulseEcwidConfig && window.ThemePerformancePulseEcwidConfig.publicConfig) {
      runtimeConfig = core.normalizeConfig(
        Object.assign({}, runtimeConfig, window.ThemePerformancePulseEcwidConfig.publicConfig)
      );
    }
  }

  function sampledIn() {
    return Math.random() * 100 <= runtimeConfig.sampleRate;
  }

  function record(payload) {
    if (!runtimeConfig.enabled) {
      return;
    }

    var event = core.sanitizeEvent(
      Object.assign({}, payload, {
        pageType: currentPageType,
        deviceType: core.inferDeviceType(
          window.innerWidth || document.documentElement.clientWidth || 0
        ),
        occurredAt: nowSeconds(),
      }),
      runtimeConfig,
      nowSeconds()
    );
    var snapshot = core.recordEvent(loadSnapshot(), event, runtimeConfig, nowSeconds());
    saveSnapshot(snapshot);
    renderPanel(snapshot);
  }

  function ensurePanel() {
    if (!runtimeConfig.showStorefrontPanel || panelReady) {
      return;
    }

    var panel = document.createElement('aside');
    panel.className = 'tpp-storefront-panel';
    panel.innerHTML = [
      '<button class="tpp-storefront-panel__toggle" type="button" aria-expanded="true">',
      '<span>' + runtimeConfig.panelTitle + '</span>',
      '<strong>Browser Snapshot</strong>',
      '</button>',
      '<div class="tpp-storefront-panel__body">',
      '<div class="tpp-storefront-panel__summary" id="tpp-storefront-summary"></div>',
      '<div class="tpp-storefront-panel__section">',
      '<h3>Page Health</h3>',
      '<div id="tpp-storefront-breakdown" class="tpp-storefront-empty">No events yet.</div>',
      '</div>',
      '<div class="tpp-storefront-panel__section">',
      '<h3>Recent Signals</h3>',
      '<div id="tpp-storefront-events" class="tpp-storefront-empty">Waiting for page activity.</div>',
      '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(panel);
    panel.querySelector('.tpp-storefront-panel__toggle').addEventListener('click', function () {
      var body = panel.querySelector('.tpp-storefront-panel__body');
      var expanded = panel.getAttribute('data-collapsed') !== 'true';
      panel.setAttribute('data-collapsed', expanded ? 'true' : 'false');
      body.hidden = expanded;
      this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    });

    panelReady = true;
  }

  function renderPanel(snapshot) {
    if (!runtimeConfig.showStorefrontPanel) {
      return;
    }

    ensurePanel();

    var summary = document.getElementById('tpp-storefront-summary');
    var breakdown = document.getElementById('tpp-storefront-breakdown');
    var events = document.getElementById('tpp-storefront-events');

    if (!summary || !breakdown || !events) {
      return;
    }

    summary.innerHTML = [
      renderMetric('Samples', snapshot.totals.page_views),
      renderMetric('Poor LCP', snapshot.totals.poor_lcp),
      renderMetric('Poor INP', snapshot.totals.poor_inp),
      renderMetric('Slow Add To Cart', snapshot.totals.slow_add_to_cart),
    ].join('');

    if (!snapshot.breakdown.length) {
      breakdown.className = 'tpp-storefront-empty';
      breakdown.textContent = 'No grouped metrics yet.';
    } else {
      breakdown.className = 'tpp-storefront-breakdown';
      breakdown.innerHTML = snapshot.breakdown
        .slice(0, 4)
        .map(function (row) {
          return [
            '<article class="tpp-storefront-breakdown__card is-' + row.health + '">',
            '<header><strong>' + row.page_type + '</strong><span>' + row.device_type + '</span></header>',
            '<p>' + row.page_views + ' views</p>',
            '<p>' + row.poor_vitals + ' poor vitals</p>',
            '<p>' + row.long_tasks + ' long tasks</p>',
            '<p>' + row.slow_add_to_cart + ' slow carts</p>',
            '</article>',
          ].join('');
        })
        .join('');
    }

    if (!snapshot.recent_events.length) {
      events.className = 'tpp-storefront-empty';
      events.textContent = 'Waiting for page activity.';
      return;
    }

    events.className = 'tpp-storefront-events';
    events.innerHTML = snapshot.recent_events
      .slice(0, 5)
      .map(function (event) {
        return [
          '<article class="tpp-storefront-events__row">',
          '<div><strong>' + event.metric + '</strong><span>' + event.page_type + ' / ' + event.device_type + '</span></div>',
          '<div><strong>' + event.bucket + '</strong><span>' + new Date(event.occurred_at * 1000).toLocaleTimeString() + '</span></div>',
          '</article>',
        ].join('');
      })
      .join('');
  }

  function renderMetric(label, value) {
    return [
      '<div class="tpp-storefront-metric">',
      '<span>' + label + '</span>',
      '<strong>' + String(value) + '</strong>',
      '</div>',
    ].join('');
  }

  function installPerformanceObservers() {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    try {
      var lcpObserver = new PerformanceObserver(function (entryList) {
        var entries = entryList.getEntries();
        var lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          lcpValue = Math.round(lastEntry.startTime);
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch (error) {
      void error;
    }

    try {
      var clsObserver = new PerformanceObserver(function (entryList) {
        entryList.getEntries().forEach(function (entry) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (error) {
      void error;
    }

    if (!runtimeConfig.trackLongTasks) {
      return;
    }

    try {
      var longTaskObserver = new PerformanceObserver(function (entryList) {
        entryList.getEntries().forEach(function (entry) {
          var duration = Math.round(entry.duration);

          if (duration < runtimeConfig.thresholds.longTask.warning) {
            return;
          }

          record({
            type: 'long_task',
            value: duration,
          });
        });
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
    } catch (error) {
      void error;
    }
  }

  document.addEventListener(
    'pointerdown',
    function () {
      interactionStart = performance.now();

      if (!runtimeConfig.trackAddToCart) {
        return;
      }

      var target = document.activeElement;

      if (
        target &&
        target.matches &&
        target.matches('.details-product-purchase__add-to-bag .form-control__button--add-to-bag')
      ) {
        addToCartStartedAt = performance.now();
      }
    },
    { passive: true }
  );

  document.addEventListener(
    'click',
    function (event) {
      if (
        runtimeConfig.trackAddToCart &&
        event.target &&
        event.target.closest &&
        event.target.closest('.details-product-purchase__add-to-bag .form-control__button--add-to-bag')
      ) {
        addToCartStartedAt = performance.now();
      }
    },
    { passive: true }
  );

  window.addEventListener('pagehide', function () {
    if (lcpValue > 0) {
      record({ type: 'web_vital', metric: 'lcp', value: lcpValue });
    }

    if (clsValue > 0) {
      record({ type: 'web_vital', metric: 'cls', value: Number(clsValue.toFixed(4)) });
    }

    if (interactionStart > 0) {
      record({
        type: 'web_vital',
        metric: 'inp',
        value: Math.round(performance.now() - interactionStart),
      });
    }
  });

  Ecwid.OnAPILoaded.add(function () {
    loadPublicConfig();

    if (!sampledIn()) {
      runtimeConfig = core.normalizeConfig(
        Object.assign({}, runtimeConfig, { enabled: false, showStorefrontPanel: false })
      );
      return;
    }

    installPerformanceObservers();
    renderPanel(loadSnapshot());
  });

  Ecwid.OnPageLoaded.add(function (page) {
    currentPageType = core.mapEcwidPageType(page);
    record({ type: 'page_view', value: 1 });
  });

  Ecwid.OnCartChanged.add(function () {
    if (!runtimeConfig.trackAddToCart || addToCartStartedAt === 0) {
      return;
    }

    var duration = Math.round(performance.now() - addToCartStartedAt);
    addToCartStartedAt = 0;

    if (duration < runtimeConfig.thresholds.addToCart.warning) {
      return;
    }

    record({ type: 'add_to_cart_delay', value: duration });
  });
})();
