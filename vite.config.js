import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        about: resolve(root, 'about/index.html'),
        contact: resolve(root, 'contact/index.html'),
        privacy: resolve(root, 'privacy/index.html'),
      },
    },
  },
});
