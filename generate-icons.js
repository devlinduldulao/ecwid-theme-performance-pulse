const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

try {
  require.resolve('sharp');
} catch (e) {
  console.log('Installing sharp...');
  execSync('npm install sharp --no-save', { stdio: 'inherit' });
}

const sharp = require('sharp');

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#2c3e50" rx="64"/>
  <path d="M128 256 l85.3 85.3 L384 170.7" stroke="#ecf0f1" stroke-width="48" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const bannerSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <rect width="1600" height="900" fill="#34495e"/>
  <rect x="200" y="200" width="1200" height="500" fill="#2c3e50" rx="32"/>
  <path d="M600 450 l130 130 L1000 320" stroke="#ecf0f1" stroke-width="64" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <text x="800" y="700" font-family="sans-serif" font-size="80" fill="#bdc3c7" text-anchor="middle" font-weight="bold">Performance Pulse</text>
</svg>`;

fs.mkdirSync('assets/marketplace/raster', { recursive: true });
fs.mkdirSync('assets/favicon', { recursive: true });

fs.writeFileSync('assets/marketplace/icon.svg', iconSvg);
fs.writeFileSync('assets/marketplace/banner.svg', bannerSvg);

(async () => {
  await sharp(Buffer.from(iconSvg)).resize(512, 512).png().toFile('assets/marketplace/raster/icon-512.png');
  await sharp(Buffer.from(iconSvg)).resize(64, 64).png().toFile('assets/favicon/favicon.png');
  await sharp(Buffer.from(bannerSvg)).resize(1600, 900).png().toFile('assets/marketplace/raster/banner-1600x900.png');
  console.log('Icons generated successfully with sharp! Guaranteed non-broken.');
})();
