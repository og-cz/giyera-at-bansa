import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  // Relative asset paths so the built game loads from file:// inside the desktop app.
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
});
