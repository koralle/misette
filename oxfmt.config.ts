import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['pnpm-lock.yaml', '**/worker-configuration.d.ts'],
  jsxSingleQuote: true,
  printWidth: 120,
  singleAttributePerLine: true,
  singleQuote: true,
  sortImports: {
    internalPattern: ['@misette/'],
  },
  sortPackageJson: {
    sortScripts: true,
  },
});
