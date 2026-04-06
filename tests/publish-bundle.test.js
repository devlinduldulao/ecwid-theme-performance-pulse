const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  buildPublishBundle,
  createListingTemplate,
  RASTER_ASSETS,
  SCREENSHOT_ASSETS,
} = require('../scripts/build-publish-bundle');

test('createListingTemplate includes placeholder publish metadata and PNG asset paths', () => {
  const template = createListingTemplate('1.2.0', [
    { fileName: 'icon-512.png' },
    { fileName: 'banner-1600x900.png' },
  ]);

  assert.equal(template.version, '1.2.0');
  assert.match(template.shortDescription, /PageSpeed/i);
  assert.equal(template.assets.png[0], 'assets/marketplace/raster/icon-512.png');
  assert.equal(template.assets.screenshots[0], 'assets/marketplace/screenshot-owner-dashboard.png');
  assert.equal(template.features.length >= 4, true);
});

test('buildPublishBundle creates app, docs, metadata, and rasterized marketplace assets', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tpp-publish-'));

  try {
    const result = buildPublishBundle({ outputRoot: tempRoot, version: '9.9.9', skipBuild: false });

    assert.equal(result.version, '9.9.9');
    assert.equal(fs.existsSync(path.join(tempRoot, 'app', 'public', 'index.html')), true);
    assert.equal(fs.existsSync(path.join(tempRoot, 'docs', 'PRIVACY.md')), true);
    assert.equal(fs.existsSync(path.join(tempRoot, 'docs', 'SUPPORT.md')), true);
    assert.equal(fs.existsSync(path.join(tempRoot, 'app-listing.template.json')), true);

    const listingTemplate = JSON.parse(fs.readFileSync(path.join(tempRoot, 'app-listing.template.json'), 'utf8'));
    assert.equal(listingTemplate.version, '9.9.9');
    assert.equal(listingTemplate.assets.png.length, RASTER_ASSETS.length);
    assert.equal(listingTemplate.assets.screenshots.length, SCREENSHOT_ASSETS.length);

    RASTER_ASSETS.forEach((asset) => {
      const targetPath = path.join(tempRoot, 'assets', 'marketplace', 'raster', asset.output);
      assert.equal(fs.existsSync(targetPath), true);
      assert.equal(fs.statSync(targetPath).size > 0, true);
    });

    SCREENSHOT_ASSETS.forEach((fileName) => {
      const targetPath = path.join(tempRoot, 'assets', 'marketplace', fileName);
      assert.equal(fs.existsSync(targetPath), true);
      assert.equal(fs.statSync(targetPath).size > 0, true);
    });
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});