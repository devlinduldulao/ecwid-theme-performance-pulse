const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  assertValidVersion,
  createReleaseNotes,
  updateJsonVersion,
} = require('../scripts/prepare-release');
const {
  applyPublishConfig,
  createListingTemplate,
  normalizePublishingProfile,
} = require('../scripts/build-publish-bundle');

test('assertValidVersion rejects invalid semver input', () => {
  assert.doesNotThrow(() => assertValidVersion('1.2.3'));
  assert.throws(() => assertValidVersion('v1.2.3'), /valid semver/i);
  assert.throws(() => assertValidVersion('1.2'), /valid semver/i);
});

test('updateJsonVersion updates package and lockfile style version fields', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tpp-version-'));
  const jsonPath = path.join(tempRoot, 'package.json');

  try {
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          version: '1.0.0',
          packages: {
            '': {
              version: '1.0.0',
            },
          },
        },
        null,
        2
      )
    );

    updateJsonVersion(jsonPath, '1.2.3');
    const updated = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    assert.equal(updated.version, '1.2.3');
    assert.equal(updated.packages[''].version, '1.2.3');
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});

test('createReleaseNotes writes a reusable release template', () => {
  const version = '9.9.9-test.0';
  const releaseNotesPath = path.join(path.resolve(__dirname, '..'), 'releases', `v${version}.md`);

  try {
    createReleaseNotes(version);
    const written = fs.readFileSync(releaseNotesPath, 'utf8');

    assert.match(written, /Release v9\.9\.9-test\.0/);
    assert.match(written, /## Validation/);
    assert.match(written, /npm run publish:bundle/);
  } finally {
    fs.rmSync(releaseNotesPath, { force: true });
  }
});

test('applyPublishConfig merges listing overrides without dropping generated assets', () => {
  const base = createListingTemplate('1.2.0', [{ fileName: 'icon-512.png' }]);
  const merged = applyPublishConfig(base, {
    appPageUrl: 'https://app.example/public/index.html',
    supportUrl: 'https://app.example/support',
    features: ['Custom feature'],
  });

  assert.equal(merged.appPageUrl, 'https://app.example/public/index.html');
  assert.equal(merged.supportUrl, 'https://app.example/support');
  assert.deepEqual(merged.features, ['Custom feature']);
  assert.equal(merged.assets.png[0], 'assets/marketplace/raster/icon-512.png');
  assert.equal(merged.assets.screenshots[0], 'assets/marketplace/screenshot-owner-dashboard.png');
});

test('normalizePublishingProfile expands relative public URLs from hostBaseUrl', () => {
  const normalized = normalizePublishingProfile({
    appName: 'Theme Performance Pulse for Ecwid',
    shortDescription: 'Merchant-facing PageSpeed dashboard',
    category: 'Analytics & reporting / merchant tools',
    hostBaseUrl: 'https://devlinduldulao.github.io/ecwid-theme-performance-pulse',
    demoUrl: '/public/index.html',
    supportUrl: '/public/support.html',
    privacyPolicyUrl: '/public/privacy.html',
    termsOfServiceUrl: '/public/terms.html',
    supportTimezone: 'UTC',
  });

  assert.equal(normalized.name, 'Theme Performance Pulse for Ecwid');
  assert.equal(normalized.appPageUrl, 'https://devlinduldulao.github.io/ecwid-theme-performance-pulse/public/index.html');
  assert.equal(normalized.supportUrl, 'https://devlinduldulao.github.io/ecwid-theme-performance-pulse/public/support.html');
  assert.equal(normalized.privacyPolicyUrl, 'https://devlinduldulao.github.io/ecwid-theme-performance-pulse/public/privacy.html');
  assert.equal(normalized.termsOfServiceUrl, 'https://devlinduldulao.github.io/ecwid-theme-performance-pulse/public/terms.html');
  assert.equal(normalized.supportTimezone, 'UTC');
});