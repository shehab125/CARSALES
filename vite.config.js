import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  root: 'src',
  build: {
    outDir: '../dist',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'src/index.html',
        auth: 'src/auth.html',
        profile: 'src/profile.html',
        sell: 'src/sell.html',
        subscription: 'src/subscription.html',
        carDetail: 'src/car-detail.html',
        search: 'src/search.html',
        contact: 'src/contact.html',
        about: 'src/about.html',
        admin: 'src/admin_enhanced_updated.html'
      }
    }
  }
});