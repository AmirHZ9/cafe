import { defineConfig } from 'vite';

export default defineConfig({
  // The preview sandbox proxies requests through its own host name.
  server: {
    allowedHosts: true,
    host: true,
  },
  preview: {
    allowedHosts: true,
    host: true,
  },
});
