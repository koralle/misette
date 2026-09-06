import { defineConfig } from '@pandacss/dev';

export default defineConfig({
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  exclude: [],
  jsxFramework: 'react',
  outdir: 'styled-system',
  theme: {
    extend: {
      tokens: {
        colors: {
          fg: { value: '#111111' },
          bg: { value: '#ffffff' },
        },
      },
    },
  },
  globalCss: {
    html: {
      color: 'fg',
      backgroundColor: 'bg',
    },
  },
});
