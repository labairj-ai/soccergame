import { defineConfig } from 'vite';

export default defineConfig({
  base: '/soccergame/',
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
