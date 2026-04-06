const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const distRoot = path.join(projectRoot, 'dist');
const directoriesToCopy = ['public', 'src'];
const filesToCopy = ['README.md', '_headers'];

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

removeDirectory(distRoot);
ensureDirectory(distRoot);

directoriesToCopy.forEach((dirName) => {
  copyDirectory(path.join(projectRoot, dirName), path.join(distRoot, dirName));
});

filesToCopy.forEach((fileName) => {
  fs.copyFileSync(path.join(projectRoot, fileName), path.join(distRoot, fileName));
});

console.log('Built static artifacts into dist/.');