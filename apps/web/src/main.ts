// React Scan must initialize before React. Keep this entry free of React imports.
if (import.meta.env.DEV) {
  await import("./dev/react-scan.ts");
}

await import("./app.tsx");
