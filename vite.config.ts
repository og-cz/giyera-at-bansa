import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths so the built game loads from file:// inside the desktop app.
  base: './',
});
