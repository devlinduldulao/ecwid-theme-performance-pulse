const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const defaultDistRoot = path.join(projectRoot, 'dist');
const directoriesToCopy = ['public', 'src'];
const filesToCopy = ['README.md', '_headers', 'index.html'];

function removeDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function copyDirectory(sourcePath, targetPath) {
  ensureDirectory(targetPath);

  fs.readdirSync(sourcePath, { withFileTypes: true }).forEach((entry) => {
    const sourceEntry = path.join(sourcePath, entry.name);
    const targetEntry = path.join(targetPath, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourceEntry, targetEntry);
      return;
    }

    fs.copyFileSync(sourceEntry, targetEntry);
  });
}

function buildStaticArtifacts(options = {}) {
  const outputRoot = options.outputRoot || defaultDistRoot;

  removeDirectory(outputRoot);
  ensureDirectory(outputRoot);

  directoriesToCopy.forEach((dirName) => {
    copyDirectory(path.join(projectRoot, dirName), path.join(outputRoot, dirName));
  });

  filesToCopy.forEach((fileName) => {
    fs.copyFileSync(path.join(projectRoot, fileName), path.join(outputRoot, fileName));
  });

  return outputRoot;
}

if (require.main === module) {
  buildStaticArtifacts();
  console.log('Built static artifacts into dist/.');
}

module.exports = {
  buildStaticArtifacts,
  defaultDistRoot,
};