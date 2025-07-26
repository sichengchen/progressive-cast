/** @type {import('next').NextConfig} */
const fs = require('fs');
const path = require('path');

// Read version from package.json
function getPackageVersion() {
  try {
    const packagePath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    console.warn('Could not read package.json version:', error);
    return 'unknown';
  }
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: getPackageVersion(),
  },
  // Webpack configuration (for non-Turbopack builds)
  webpack: (config, { dev, isServer }) => {
    // Only in production builds
    if (!dev && !isServer) {
      // Ensure version is available during build
      config.plugins.push({
        apply: (compiler) => {
          compiler.hooks.beforeCompile.tap('SetVersion', () => {
            process.env.NEXT_PUBLIC_APP_VERSION = getPackageVersion();
          });
        },
      });
    }
    return config;
  },
};

module.exports = nextConfig;