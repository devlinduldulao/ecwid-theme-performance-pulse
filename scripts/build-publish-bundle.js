const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { buildStaticArtifacts, defaultDistRoot } = require('./build');

const projectRoot = path.resolve(__dirname, '..');
const publishRoot = path.join(projectRoot, 'publish');
const marketplaceRoot = path.join(projectRoot, 'assets', 'marketplace');
const docsRoot = path.join(projectRoot, 'docs');
const publishConfigPath = path.join(projectRoot, 'app-listing.config.json');
const publishConfigTemplatePath = path.join(projectRoot, 'app-listing.config.template.json');
const publishingProfilePath = path.join(projectRoot, 'config', 'publishing-profile.json');

const RASTER_ASSETS = [
  { source: 'icon.svg', output: 'icon-512.png', width: 512, height: 512 },
  { source: 'banner.svg', output: 'banner-1600x900.png', width: 1600, height: 900 },
];

const SCREENSHOT_ASSETS = [
  'screenshot-owner-dashboard.png',
  'screenshot-preview-mode.png',
];

function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function removeDirectory(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
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

function renderPng(sourcePath, targetPath, width, height) {
  const svg = fs.readFileSync(sourcePath, 'utf8');
  const renderer = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: width,
    },
  });
  const pngData = renderer.render();

  fs.writeFileSync(targetPath, pngData.asPng());

  return {
    fileName: path.basename(targetPath),
    width,
    height,
  };
}

function readPackageVersion() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
  return packageJson.version;
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toAbsoluteUrl(baseUrl, value) {
  if (typeof value !== 'string' || value.length === 0) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (typeof baseUrl !== 'string' || baseUrl.length === 0) {
    return value;
  }

  if (value.startsWith('/')) {
    return `${baseUrl.replace(/\/$/, '')}${value}`;
  }

  return new URL(value, `${baseUrl.replace(/\/$/, '')}/`).toString();
}

function normalizePublishingProfile(profile) {
  const source = profile && typeof profile === 'object' ? profile : {};
  const hostBaseUrl = typeof source.hostBaseUrl === 'string' ? source.hostBaseUrl : undefined;
  const normalized = {};

  if (typeof source.appName === 'string') {
    normalized.name = source.appName;
  }

  if (typeof source.shortDescription === 'string') {
    normalized.shortDescription = source.shortDescription;
  }

  if (typeof source.category === 'string') {
    normalized.category = source.category;
  }

  const appPageUrl = toAbsoluteUrl(hostBaseUrl, source.demoUrl);
  const supportUrl = toAbsoluteUrl(hostBaseUrl, source.supportUrl);
  const privacyPolicyUrl = toAbsoluteUrl(hostBaseUrl, source.privacyPolicyUrl);
  const termsOfServiceUrl = toAbsoluteUrl(hostBaseUrl, source.termsOfServiceUrl);

  if (appPageUrl) {
    normalized.appPageUrl = appPageUrl;
  }

  if (supportUrl) {
    normalized.supportUrl = supportUrl;
  }

  if (privacyPolicyUrl) {
    normalized.privacyPolicyUrl = privacyPolicyUrl;
  }

  if (termsOfServiceUrl) {
    normalized.termsOfServiceUrl = termsOfServiceUrl;
  }

  [
    'tagline',
    'hostBaseUrl',
    'businessName',
    'supportEmail',
    'supportResponseWindow',
    'supportTimezone',
    'legalEffectiveDate',
    'privacyContactBlurb',
    'termsWarrantyBlurb',
    'screenshots',
    'technicalNotes',
  ].forEach((key) => {
    if (key in source) {
      normalized[key] = source[key];
    }
  });

  return normalized;
}

function readPublishConfig() {
  const templateConfig = readJsonFile(publishConfigTemplatePath);
  const publishingProfile = normalizePublishingProfile(readJsonFile(publishingProfilePath));

  if (fs.existsSync(publishConfigPath)) {
    return {
      ...templateConfig,
      ...readJsonFile(publishConfigPath),
    };
  }

  return {
    ...templateConfig,
    ...publishingProfile,
  };
}

function applyPublishConfig(baseTemplate, overrides) {
  const source = overrides && typeof overrides === 'object' ? overrides : {};

  return {
    ...baseTemplate,
    ...source,
    assets: baseTemplate.assets,
    features: Array.isArray(source.features) ? source.features : baseTemplate.features,
    notes: Array.isArray(source.notes) ? source.notes : baseTemplate.notes,
  };
}

function createListingTemplate(version, rasterFiles) {
  return {
    name: 'Theme Performance Pulse',
    slug: 'theme-performance-pulse-ecwid',
    version,
    appPageUrl: 'https://your-host.example/public/index.html',
    supportUrl: 'https://your-host.example/support',
    privacyPolicyUrl: 'https://your-host.example/privacy',
    category: 'Analytics & Reporting',
    pricingModel: 'Free',
    shortDescription:
      'Audit your Ecwid storefront from the owner dashboard with live PageSpeed checks and a preview demo mode.',
    features: [
      'Owner-side dashboard inside Ecwid admin',
      'Preview demo mode with fake sample data',
      'Browser-run PageSpeed audits for key storefront URLs',
      'No database, Redis, or hosted Node.js collector required',
    ],
    assets: {
      svg: {
        icon: 'assets/marketplace/icon.svg',
        banner: 'assets/marketplace/banner.svg',
      },
      screenshots: SCREENSHOT_ASSETS.map((fileName) => `assets/marketplace/${fileName}`),
      png: rasterFiles.map((file) => `assets/marketplace/raster/${file.fileName}`),
    },
    notes: [
      'Replace placeholder URLs before submission.',
      'Verify final dimensions against the latest Ecwid submission form before uploading.',
    ],
  };
}

function buildPublishBundle(options = {}) {
  const version = options.version || readPackageVersion();
  const outputRoot = options.outputRoot || publishRoot;
  const buildOutputRoot = options.buildOutputRoot || defaultDistRoot;
  const publishConfig = options.publishConfig || readPublishConfig();

  if (!options.skipBuild) {
    buildStaticArtifacts({ outputRoot: buildOutputRoot });
  }

  removeDirectory(outputRoot);
  ensureDirectory(outputRoot);

  const deployRoot = path.join(outputRoot, 'app');
  const docsOutputRoot = path.join(outputRoot, 'docs');
  const assetsOutputRoot = path.join(outputRoot, 'assets', 'marketplace');
  const rasterOutputRoot = path.join(assetsOutputRoot, 'raster');

  copyDirectory(buildOutputRoot, deployRoot);
  ensureDirectory(docsOutputRoot);
  ensureDirectory(assetsOutputRoot);
  ensureDirectory(rasterOutputRoot);

  ['PRIVACY.md', 'SUPPORT.md', 'PUBLISHING.md'].forEach((fileName) => {
    fs.copyFileSync(path.join(docsRoot, fileName), path.join(docsOutputRoot, fileName));
  });

  ['icon.svg', 'banner.svg'].concat(SCREENSHOT_ASSETS).forEach((fileName) => {
    fs.copyFileSync(path.join(marketplaceRoot, fileName), path.join(assetsOutputRoot, fileName));
  });

  const rasterFiles = RASTER_ASSETS.map((asset) =>
    renderPng(
      path.join(marketplaceRoot, asset.source),
      path.join(rasterOutputRoot, asset.output),
      asset.width,
      asset.height
    )
  );

  const listingTemplate = applyPublishConfig(createListingTemplate(version, rasterFiles), publishConfig);

  fs.writeFileSync(
    path.join(outputRoot, 'app-listing.template.json'),
    JSON.stringify(listingTemplate, null, 2) + '\n'
  );

  fs.writeFileSync(
    path.join(outputRoot, 'README.txt'),
    [
      `Theme Performance Pulse for Ecwid publish bundle v${version}`,
      '',
      'Contents:',
      '- app/: static app files ready for hosting',
      '- docs/: privacy, support, and publishing checklists',
      '- assets/marketplace/: icon/banner vectors, live PNG screenshots, and raster PNG exports',
      '- app-listing.template.json: placeholder listing metadata to finalize before submission',
      '',
      'Replace placeholder URLs in app-listing.template.json before submitting the app.',
    ].join('\n') + '\n'
  );

  return {
    outputRoot,
    version,
    rasterFiles,
  };
}

if (require.main === module) {
  const result = buildPublishBundle();
  console.log(`Built publish bundle into ${path.relative(projectRoot, result.outputRoot)}/`);
}

module.exports = {
  applyPublishConfig,
  RASTER_ASSETS,
  SCREENSHOT_ASSETS,
  buildPublishBundle,
  createListingTemplate,
  normalizePublishingProfile,
  readPublishConfig,
  renderPng,
};