import { defineConfig } from 'oxfmt';

export default defineConfig({
  ignorePatterns: [
    'pnpm-lock.yaml',
    '**/worker-configuration.d.ts',
    '**/routeTree.gen.ts',
    'packages/*/src/*.d.ts',
    'packages/*/src/*.d.ts.map',
    'packages/db/drizzle/**',
    'packages/db/src/schema/auth.ts',
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
