import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: [
    'pnpm-lock.yaml',
    '**/worker-configuration.d.ts',
    '**/routeTree.gen.ts',
    'packages/*/src/*.d.ts',
    'packages/*/src/*.d.ts.map',
  ],
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
