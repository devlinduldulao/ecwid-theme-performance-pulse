(function () {
  'use strict';

  var dashboardCore = window.ThemePerformancePulseDashboardCore;

  if (!dashboardCore) {
    return;
  }

  var bootstrap = window.ThemePerformancePulseAdminBootstrap || {};
  var state = {
    appId: bootstrap.appId || 'theme-performance-pulse',
    mode: 'standalone',
    storeId: '',
    accessToken: '',
    config: dashboardCore.normalizeDashboardConfig(bootstrap.publicConfig || {}),
    localPsiKey: '',
    previewMode: false,
    previewResults: [],
    results: [],
  };
  var localConfigKey = 'theme-performance-pulse:ecwid:dashboard-config';
  var localApiKeyKey = 'theme-performance-pulse:ecwid:psi-api-key';
  var localPreviewModeKey = 'theme-performance-pulse:ecwid:preview-mode';
  var localResultsKey = 'theme-performance-pulse:ecwid:last-results';
  var els = {
    appClientId: document.getElementById('app-client-id'),
    apiKey: document.getElementById('psi-api-key'),
    auditTargets: document.getElementById('audit-targets'),
    connectionMode: document.getElementById('connection-mode'),
    dashboardHint: document.getElementById('dashboard-hint'),
    emptyResults: document.getElementById('tpp-empty-results'),
    exitPreviewBannerBtn: document.getElementById('exit-preview-banner-btn'),
    guideStep1: document.getElementById('guide-step-1'),
    guideStep2: document.getElementById('guide-step-2'),
    guideStep3: document.getElementById('guide-step-3'),
    jsUrl: document.getElementById('asset-js-url'),
    lastRun: document.getElementById('last-run-at'),
    liveBanner: document.getElementById('tpp-live-banner'),
    previewBadge: document.getElementById('preview-mode-badge'),
    previewBanner: document.getElementById('tpp-preview-banner'),
    previewButton: document.getElementById('preview-toggle-btn'),
    results: document.getElementById('tpp-audit-results'),
    runButton: document.getElementById('run-audit-btn'),
    saveButton: document.getElementById('save-btn'),
    status: document.getElementById('status-message'),
    storeId: document.getElementById('store-id'),
    storefrontBaseUrl: document.getElementById('storefront-base-url'),
    strategy: document.getElementById('audit-strategy'),
    summaryFields: document.querySelectorAll('[data-tpp-field]'),
  };

  function getAssetUrl(pathName) {
    return new URL(pathName, window.location.href).href;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function resizeIframe() {
    if (!window.EcwidApp || typeof EcwidApp.setSize !== 'function') {
      return;
    }

    setTimeout(function () {
      EcwidApp.setSize({ height: document.body.scrollHeight + 24 });
    }, 100);
  }

  function showStatus(message, type) {
    var alertClass = type === 'error' ? 'a-alert--error' : 'a-alert--success';
    els.status.innerHTML = '<div class="a-alert ' + alertClass + '">' + escapeHtml(message) + '</div>';
    resizeIframe();
  }

  function localConfig() {
    return dashboardCore.parseDashboardConfig(window.localStorage.getItem(localConfigKey));
  }

  function saveLocalConfig(config) {
    window.localStorage.setItem(localConfigKey, dashboardCore.serializeDashboardConfig(config));
  }

  function loadLocalResults() {
    try {
      return JSON.parse(window.localStorage.getItem(localResultsKey) || '[]');
    } catch (error) {
      return [];
    }
  }

  function saveLocalResults(results) {
    window.localStorage.setItem(localResultsKey, JSON.stringify(results));
  }

  function displayResults() {
    return state.previewMode ? state.previewResults : state.results;
  }

  function syncPreviewUi() {
    if (!els.previewButton || !els.previewBadge) {
      return;
    }

    els.previewButton.textContent = state.previewMode ? 'Exit Preview' : 'Preview Demo';
    els.previewButton.setAttribute('aria-pressed', state.previewMode ? 'true' : 'false');
    els.previewButton.classList.toggle('btn-primary', state.previewMode);
    els.previewButton.classList.toggle('btn-default', !state.previewMode);
    els.previewBadge.textContent = state.previewMode ? 'Sample data — not from your store' : 'Live audit results';
    els.previewBadge.className = state.previewMode ? 'tpp-meta is-preview' : 'tpp-meta';

    if (els.previewBanner) {
      els.previewBanner.classList.toggle('is-visible', state.previewMode);
    }

    var hasLiveResults = !state.previewMode && state.results.length > 0;

    if (els.liveBanner) {
      els.liveBanner.classList.toggle('is-visible', hasLiveResults);
    }
  }

  function setPreviewMode(enabled) {
    state.previewMode = Boolean(enabled);
    window.localStorage.setItem(localPreviewModeKey, state.previewMode ? 'true' : 'false');

    if (state.previewMode) {
      state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
    }

    syncPreviewUi();
    renderConnectionState();
    renderResults(displayResults());
  }

  function applyConfig(config) {
    els.appClientId.value = config.appClientId;
    els.storefrontBaseUrl.value = config.storefrontBaseUrl;
    els.auditTargets.value = dashboardCore.targetListToText(config.auditTargets);
    els.strategy.value = config.strategy;
    els.apiKey.value = state.localPsiKey;
  }

  function readConfig() {
    return dashboardCore.normalizeDashboardConfig({
      appClientId: els.appClientId.value.trim(),
      storefrontBaseUrl: els.storefrontBaseUrl.value.trim(),
      strategy: els.strategy.value,
      auditTargets: els.auditTargets.value,
    });
  }

  async function fetchAppStorageConfig() {
    var response = await fetch(
      'https://app.ecwid.com/api/v3/' + encodeURIComponent(state.storeId) + '/storage/public',
      {
        headers: {
          Authorization: 'Bearer ' + state.accessToken,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Ecwid app storage read failed with status ' + response.status);
    }

    return dashboardCore.parseDashboardConfig(await response.json());
  }

  async function saveAppStorageConfig(config) {
    var response = await fetch(
      'https://app.ecwid.com/api/v3/' + encodeURIComponent(state.storeId) + '/storage/public',
      {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + state.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ value: dashboardCore.serializeDashboardConfig(config) }),
      }
    );

    if (!response.ok) {
      throw new Error('Ecwid app storage save failed with status ' + response.status);
    }
  }

  function renderConnectionState() {
    els.storeId.textContent = state.storeId || 'Not connected to an Ecwid store';
    els.connectionMode.textContent =
      state.mode === 'ecwid' ? 'Ecwid owner dashboard connected' : 'Standalone owner preview';
    els.dashboardHint.textContent =
      state.mode === 'ecwid'
        ? 'Saved audit settings sync into Ecwid app storage. The optional PageSpeed API key stays only in this browser and is never written to Ecwid.'
        : 'This page is outside the Ecwid iframe, so audit settings and results stay only in this browser until you load it from your Ecwid app.';
    els.jsUrl.textContent = getAssetUrl('../src/storefront/custom-storefront.js');
    syncPreviewUi();
  }

  function renderSummary(results) {
    var summary = dashboardCore.summarizeAuditBatch(results);

    els.summaryFields.forEach(function (field) {
      var key = field.getAttribute('data-tpp-field');
      field.textContent = String(summary[key] || 0);
    });

    els.lastRun.textContent = results.length ? new Date(results[0].fetchedAt).toLocaleString() : 'No audits run yet';
  }

  function renderScoreCell(label, value) {
    var tone = dashboardCore.scoreTone(value);
    return '<div class="tpp-score-cell is-' + tone + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value === null ? 'n/a' : value) + '</strong></div>';
  }

  function renderMetricCell(label, value) {
    return '<div class="tpp-metric-cell"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function updateGuideSteps() {
    var hasUrl = els.storefrontBaseUrl && els.storefrontBaseUrl.value.trim();
    var hasTargets = els.auditTargets && els.auditTargets.value.trim();
    var hasResults = state.results.length > 0;

    if (els.guideStep1) {
      els.guideStep1.classList.toggle('is-done', Boolean(hasUrl));
    }

    if (els.guideStep2) {
      els.guideStep2.classList.toggle('is-done', Boolean(hasTargets));
    }

    if (els.guideStep3) {
      els.guideStep3.classList.toggle('is-done', hasResults);
    }
  }

  function renderResults(results) {
    renderSummary(results);
    updateGuideSteps();

    if (!results.length) {
      els.emptyResults.hidden = false;
      els.results.innerHTML = '';
      resizeIframe();
      return;
    }

    els.emptyResults.hidden = true;
    els.results.innerHTML = results
      .map(function (result) {
        var isPreview = Boolean(result.isPreview);
        var badgeHtml = isPreview
          ? '<span class="tpp-data-badge tpp-data-badge--sample">Sample Data</span>'
          : '<span class="tpp-data-badge tpp-data-badge--live">Live Data</span>';
        var cardClass = 'tpp-audit-card is-' + dashboardCore.scoreTone(result.scores.performance) + (isPreview ? ' is-sample' : '');
        var eyebrowSuffix = isPreview ? ' &middot; NOT real data' : ' &middot; from Google PageSpeed';

        return [
          '<article class="' + cardClass + '">',
          '<header class="tpp-audit-card__header">',
            '<div>' + badgeHtml + '<p class="tpp-audit-card__eyebrow">' + escapeHtml(result.strategy) + ' audit' + eyebrowSuffix + '</p><h3>' + escapeHtml(result.label) + '</h3><p class="tpp-audit-card__url">' + escapeHtml(result.url) + '</p></div>',
          '<div class="tpp-score-pill is-' + dashboardCore.scoreTone(result.scores.performance) + '">' + escapeHtml(result.scores.performance === null ? 'n/a' : result.scores.performance) + '</div>',
          '</header>',
          '<div class="tpp-score-grid">',
          renderScoreCell('Performance', result.scores.performance),
          renderScoreCell('Accessibility', result.scores.accessibility),
          renderScoreCell('Best Practices', result.scores.bestPractices),
          renderScoreCell('SEO', result.scores.seo),
          '</div>',
          '<div class="tpp-metric-grid">',
          renderMetricCell('LCP', result.metrics.lcp),
          renderMetricCell('CLS', result.metrics.cls),
          renderMetricCell('INP', result.metrics.inp),
          renderMetricCell('TBT', result.metrics.tbt),
          '</div>',
          '<section class="tpp-opportunity-list">',
          '<h4>Top opportunities</h4>',
          result.opportunities.length
            ? result.opportunities.map(function (item) {
                return '<article class="tpp-opportunity-row is-' + item.tone + '"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.description) + '</span></article>';
              }).join('')
            : '<div class="tpp-empty-inline">No major opportunities detected in this run.</div>',
          '</section>',
          '</article>',
        ].join('');
      })
      .join('');

    resizeIframe();
  }

  async function runAudit() {
    state.config = readConfig();
    state.localPsiKey = els.apiKey.value.trim();
    window.localStorage.setItem(localApiKeyKey, state.localPsiKey);
    saveLocalConfig(state.config);

    if (state.previewMode) {
      setPreviewMode(false);
    }

    renderConnectionState();

    var targets = state.config.auditTargets.filter(function (target) {
      return target.url;
    });

    if (!targets.length) {
      showStatus('Add at least one valid audit target before running an audit.', 'error');
      return;
    }

    els.runButton.disabled = true;
    els.runButton.textContent = 'Running audit...';
    showStatus('Running PageSpeed audits for your saved storefront URLs.', 'success');

    try {
      var results = [];

      for (var index = 0; index < targets.length; index += 1) {
        var target = targets[index];
        var requestUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
        requestUrl.searchParams.set('url', target.url);
        requestUrl.searchParams.set('strategy', state.config.strategy);
        requestUrl.searchParams.set('category', 'PERFORMANCE');
        requestUrl.searchParams.append('category', 'ACCESSIBILITY');
        requestUrl.searchParams.append('category', 'BEST_PRACTICES');
        requestUrl.searchParams.append('category', 'SEO');

        if (state.localPsiKey) {
          requestUrl.searchParams.set('key', state.localPsiKey);
        }

        var response = await fetch(requestUrl.toString());

        if (!response.ok) {
          throw new Error('PageSpeed request failed for ' + target.label + ' with status ' + response.status);
        }

        results.push(dashboardCore.summarizePageSpeedResult(target, state.config.strategy, await response.json()));
      }

      state.results = results;
      saveLocalResults(results);
      renderResults(results);
      showStatus('Audit completed for ' + String(results.length) + ' storefront pages.', 'success');
    } catch (error) {
      showStatus(error.message || 'PageSpeed audit failed.', 'error');
    } finally {
      els.runButton.disabled = false;
      els.runButton.textContent = 'Run Audit';
      resizeIframe();
    }
  }

  async function bootstrapEcwid() {
    state.localPsiKey = window.localStorage.getItem(localApiKeyKey) || '';
    state.results = loadLocalResults();
    state.previewMode = window.localStorage.getItem(localPreviewModeKey) === 'true';

    if (!window.EcwidApp || typeof EcwidApp.init !== 'function') {
      state.config = localConfig();
      applyConfig(state.config);
      renderConnectionState();
      if (state.previewMode) {
        state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
      }
      renderResults(displayResults());
      return;
    }

    try {
      var app = EcwidApp.init({ appId: state.appId });

      if (!app || typeof app.getPayload !== 'function') {
        state.config = localConfig();
        applyConfig(state.config);
        renderConnectionState();
        if (state.previewMode) {
          state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
        }
        renderResults(displayResults());
        return;
      }

      app.getPayload(async function (payload) {
        state.mode = 'ecwid';
        state.storeId = String(payload.store_id || '');
        state.accessToken = String(payload.access_token || '');
        state.config = localConfig();

        if (state.storeId && state.accessToken) {
          try {
            state.config = await fetchAppStorageConfig();
            showStatus('Loaded saved audit settings from Ecwid app storage.', 'success');
          } catch (error) {
            showStatus('Falling back to browser-local audit settings for this session.', 'error');
          }
        }

        applyConfig(state.config);
        renderConnectionState();
        if (state.previewMode) {
          state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
        }
        renderResults(displayResults());
      });
    } catch (error) {
      state.config = localConfig();
      applyConfig(state.config);
      renderConnectionState();
      if (state.previewMode) {
        state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
      }
      renderResults(displayResults());
      showStatus('Ecwid iframe SDK was unavailable, so the dashboard stayed in standalone mode.', 'error');
    }
  }

  els.saveButton.addEventListener('click', async function () {
    state.config = readConfig();
    state.localPsiKey = els.apiKey.value.trim();
    window.localStorage.setItem(localApiKeyKey, state.localPsiKey);
    saveLocalConfig(state.config);

    try {
      if (state.mode === 'ecwid' && state.storeId && state.accessToken) {
        await saveAppStorageConfig(state.config);
        showStatus('Owner dashboard settings saved to Ecwid app storage.', 'success');
      } else {
        showStatus('Owner dashboard settings saved locally in this browser.', 'success');
      }
    } catch (error) {
      showStatus('Saved locally, but Ecwid app storage update failed.', 'error');
    }

    renderConnectionState();

    if (state.previewMode) {
      state.previewResults = dashboardCore.buildPreviewAuditResults(state.config);
    }

    renderResults(displayResults());
  });

  els.previewButton.addEventListener('click', function () {
    state.config = readConfig();
    saveLocalConfig(state.config);

    if (state.previewMode) {
      setPreviewMode(false);
      showStatus(
        state.results.length
          ? 'Preview mode disabled. Showing the latest live audit results saved in this browser.'
          : 'Preview mode disabled. Run a live audit when you want real PageSpeed data.',
        'success'
      );
      return;
    }

    setPreviewMode(true);
    showStatus('Preview mode enabled with sample owner dashboard data.', 'success');
  });

  els.runButton.addEventListener('click', function () {
    runAudit().catch(function (error) {
      showStatus(error.message || 'Audit run failed.', 'error');
    });
  });

  if (els.exitPreviewBannerBtn) {
    els.exitPreviewBannerBtn.addEventListener('click', function () {
      setPreviewMode(false);
      showStatus(
        state.results.length
          ? 'Preview mode disabled. Showing the latest live audit results saved in this browser.'
          : 'Preview mode disabled. Run a live audit when you want real PageSpeed data.',
        'success'
      );
    });
  }

  bootstrapEcwid();
})();
