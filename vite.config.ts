import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { VitePWA } from 'vite-plugin-pwa';

const disableHmrWsPlugin = () => ({
  name: 'disable-hmr-ws',
  apply: 'serve' as const,
  enforce: 'post' as const,
  transform(code: string, id: string) {
    if (id.replace(/\\/g, '/').endsWith('vite/dist/client/client.mjs')) {
      return code
        .replace('throw new Error("send was called before connect");', 'return;')
        .replace('throw new Error("invoke was called before connect");', 'return;')
        .replace(
          'transport.connect(createHMRHandler(handleMessage));',
          '/* Vite HMR WebSocket disabled */'
        );
    }
  },
});

export default defineConfig(() => {
    return {
      base: '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        hmr: false,
        ws: false as const,
      },
      plugins: [
        disableHmrWsPlugin(),
        react(),
        tailwindcss(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: [
            'favicon.ico',
            'apple-touch-icon.png',
            'icon.svg',
            'pwa-192x192.png',
            'pwa-512x512.png',
            'pwa-maskable-512x512.png',
            'fonts/AlQalamQuranMajeed.ttf'
          ],
          manifest: {
            id: '/',
            name: 'Quran Kareem',
            short_name: 'Quran',
            description: 'High-performance Holy Quran application with offline support, Urdu translation, and audio recitation.',
            theme_color: '#000000',
            background_color: '#fdfbf7',
            display: 'standalone',
            orientation: 'any',
            start_url: '/',
            scope: '/',
            icons: [
              {
                src: '/pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/pwa-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/icon.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any'
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
            globIgnores: ['**/aistudio/**'],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 30,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/api\.alquran\.cloud\/v1\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'api-cache-v10',
                  expiration: {
                    maxEntries: 600, // Capacity for all 114 Surahs and 30 Juz
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /^https:\/\/(?:everyayah\.com|download\.quranicaudio\.com)\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'quran-audio-cache-v10',
                  expiration: {
                    maxEntries: 2000,
                    maxAgeSeconds: 60 * 60 * 24 * 90 // 90 Days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              },
              {
                urlPattern: /.*\.(?:mp3|wav|ogg|m4a).*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'audio-recitations-cache-v10',
                  expiration: {
                    maxEntries: 2000,
                    maxAgeSeconds: 60 * 60 * 24 * 90 // 90 Days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ]
          },
          devOptions: {
            enabled: false,
            type: 'module'
          }
        })
      ],
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              react: ['react', 'react-dom'],
              icons: ['lucide-react'],
            },
          },
        },
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
