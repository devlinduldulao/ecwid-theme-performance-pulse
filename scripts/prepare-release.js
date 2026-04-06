const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const packageJsonPath = path.join(projectRoot, 'package.json');
const packageLockPath = path.join(projectRoot, 'package-lock.json');
const releasesRoot = path.join(projectRoot, 'releases');

function assertValidVersion(version) {
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(version || '').trim())) {
    throw new Error('Version must be a valid semver string such as 1.2.1 or 1.3.0-beta.1');
  }
}

function updateJsonVersion(filePath, version) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  data.version = version;

  if (data.packages && data.packages['']) {
    data.packages[''].version = version;
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function createReleaseNotes(version) {
  fs.mkdirSync(releasesRoot, { recursive: true });

  const releaseNotesPath = path.join(releasesRoot, `v${version}.md`);
  const content = [
    `# Release v${version}`,
    '',
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    '## Summary',
    '',
    '- Describe the main user-facing changes in this release.',
    '',
    '## Validation',
    '',
    '- [ ] npm run build',
    '- [ ] npm run lint',
    '- [ ] npm test',
    '- [ ] npm run publish:bundle',
    '',
    '## Publishing',
    '',
    '- [ ] Confirm app page URL',
    '- [ ] Confirm privacy policy URL',
    '- [ ] Confirm support URL',
    '- [ ] Exported marketplace assets match submission dimensions',
    '',
    '## Notes',
    '',
    '- Add any release-specific caveats or migration notes here.',
    '',
  ].join('\n');

  fs.writeFileSync(releaseNotesPath, content);

  return releaseNotesPath;
}

function prepareRelease(version) {
  assertValidVersion(version);
  updateJsonVersion(packageJsonPath, version);
  updateJsonVersion(packageLockPath, version);
  const releaseNotesPath = createReleaseNotes(version);

  return {
    version,
    releaseNotesPath,
  };
}

if (require.main === module) {
  const version = process.argv[2];

  if (!version) {
    throw new Error('Usage: npm run release:prepare -- <version>');
  }

  const result = prepareRelease(version);
  console.log(`Prepared release v${result.version}`);
  console.log(`Release notes template: ${path.relative(projectRoot, result.releaseNotesPath)}`);
}

module.exports = {
  assertValidVersion,
  createReleaseNotes,
  prepareRelease,
  updateJsonVersion,
};