import { defineConfig } from 'vite';

// P5 (patch 0.64) — build src/main.ts into js/ea.js as a classic IIFE that sets window.EA.
// The legacy monolith loads js/ea.js before its inline script (same pattern as js/ux-foundation.js)
// so helper names resolve at parse time. Not minified — keep js/ea.js readable/diffable in git.
//   npm run build:bridge
export default defineConfig({
  build: {
    outDir: 'js',
    emptyOutDir: false, // ห้ามล้าง js/ (มี ux-foundation.js, asset-registry.js อยู่)
    lib: {
      entry: 'src/main.ts',
      formats: ['iife'],
      name: 'EA',
      fileName: () => 'ea.js',
    },
    minify: false,
    target: 'es2019',
  },
});
