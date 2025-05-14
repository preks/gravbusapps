import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'consumer-app',
      // remotes: {
      //   'remote-app': 'http://localhost:3001/assets/remoteEntry.js',
      // },
      remotes: {
        // module federation is being handled dynamically. see app.tsx
        // add dummy.js to prevent vite from throwing an error
        dummy: "dummy.js",
      },
      shared: ['react', 'react-dom', 'antd']
    })
  ],
  server: {
    port: 3002,
    cors: true,
    host: true
  },
  build: {
    modulePreload: false,
    target: 'es2022', // Updated to es2022 to support top-level await
    minify: 'terser',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        format: 'es' // Ensure ES module format output
      }
    }
  }
});
