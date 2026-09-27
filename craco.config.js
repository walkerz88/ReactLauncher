const path = require('path');

const pkg = require('./package.json');

// Single source of truth for app identity: package.json (`build.productName`, `name`).
// CRA exposes REACT_APP_* vars to the app (`process.env`) and to `%...%` in index.html.
process.env.REACT_APP_PRODUCT_NAME = pkg.build.productName;
process.env.REACT_APP_STORAGE_PREFIX = pkg.name;
process.env.REACT_APP_VERSION = pkg.version;
process.env.REACT_APP_AUTHOR_NAME = pkg.author.name;
process.env.REACT_APP_AUTHOR_URL = pkg.author.url;

/**
 * CRA (react-scripts 5) has no support for path aliases, so we override its
 * webpack + jest config here. `@` -> `src`.
 * The matching TS mapping lives in `tsconfig.paths.json`.
 */
module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  },
};
