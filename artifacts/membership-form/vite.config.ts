import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// PORT and BASE_PATH are required when running on Replit (dev/preview server).
// When building for external deployment (e.g. Vercel) they are not needed —
// Vercel manages serving and the app is always at the root path.
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;

// On Replit the platform always injects BASE_PATH.
// For Vercel / other static hosts the app lives at root ("/").
const basePath = process.env.BASE_PATH ?? '/';

// Only load Replit-specific plugins when running inside a Repl.
const isReplit = process.env.REPL_ID !== undefined;
const isProduction = process.env.NODE_ENV === 'production';

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    // Runtime error overlay — Replit dev only
    ...(isReplit && !isProduction
      ? [
          (await import('@replit/vite-plugin-runtime-error-modal')).default(),
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
