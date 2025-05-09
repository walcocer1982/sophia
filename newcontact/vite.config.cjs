const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

// https://vite.dev/config/
module.exports = defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://entermocks.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    },
    hmr: {
      overlay: false  // Deshabilitar el overlay de errores HMR
    }
  }
}); 