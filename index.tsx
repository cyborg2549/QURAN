import { registerSW } from 'virtual:pwa-register';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Register PWA service worker in production; in development, clear any stale dev service workers/caches
try {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    if (import.meta.env.PROD) {
      registerSW({
        immediate: true,
        onOfflineReady() {
          console.log('Quran Kareem PWA is ready to work offline.');
        },
        onRegisteredSW(swScriptUrl, registration) {
          console.log('Service Worker registered:', swScriptUrl);
          if (registration) {
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);
          }
        }
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister().catch(() => {});
        });
      }).catch(() => {});
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => {
            if (key.includes('workbox') || key.includes('vite-plugin-pwa')) {
              caches.delete(key).catch(() => {});
            }
          });
        }).catch(() => {});
      }
    }
  }
} catch (e) {
  // Gracefully continue in environments where service worker registration is restricted
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
