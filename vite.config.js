import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // GitHub Pages serves the project under /<repository-name>/
    base: env.VITE_BASE_PATH || '/drop-rush/',
    server: { host: true, port: 5173 },
    preview: { host: true, port: 4173 },
    build: {
      target: 'es2020',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: { three: ['three'] },
        },
      },
    },
  };
});
