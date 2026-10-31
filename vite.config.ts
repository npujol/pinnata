import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    proxy: { '/router': { target: process.env.PI_POCKET_ROUTER_TARGET ?? 'http://127.0.0.1:8090', changeOrigin: true, rewrite: path => path.replace(/^\/router/, '') } },
  },
});
