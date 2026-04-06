module.exports = [
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        Blob: 'readonly',
        Ecwid: 'readonly',
        EcwidApp: 'readonly',
        Intl: 'readonly',
        Math: 'readonly',
        URL: 'readonly',
        console: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        globalThis: 'readonly',
        localStorage: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        performance: 'readonly',
        PerformanceObserver: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['scripts/**/*.js', 'tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        process: 'readonly',
        require: 'readonly',
        setTimeout: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];