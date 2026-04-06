const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { buildStaticArtifacts } = require('../scripts/build');

test('buildStaticArtifacts writes a root redirect for GitHub Pages', () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'tpp-build-'));
  const distRoot = path.join(tempRoot, 'dist');
  const projectRoot = path.resolve(__dirname, '..');
  const sourceRootIndex = fs.readFileSync(path.join(projectRoot, 'index.html'), 'utf8');

  try {
    buildStaticArtifacts({ outputRoot: distRoot });

    const rootIndexPath = path.join(distRoot, 'index.html');
    const rootIndex = fs.readFileSync(rootIndexPath, 'utf8');

    assert.equal(rootIndex, sourceRootIndex);
    assert.match(rootIndex, /window\.location\.replace/);
    assert.match(rootIndex, /\.\/public\/index\.html/);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});