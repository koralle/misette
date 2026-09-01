import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: ['pnpm-lock.yaml'],
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
