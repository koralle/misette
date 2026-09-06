import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  exclude: [],
  globalCss: {
    html: {
      backgroundColor: "bg",
      color: "fg",
    },
  },
  include: ["./src/**/*.{ts,tsx}"],
  jsxFramework: "react",
  outdir: "styled-system",
  preflight: true,
  theme: {
    extend: {
      tokens: {
        colors: {
          bg: { value: "#ffffff" },
          fg: { value: "#111111" },
        },
      },
    },
  },
});
