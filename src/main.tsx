import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App';
import { PaletteManager } from './core/theme/palette-manager';
import './index.css';

// Apply initial cognitive color palette
PaletteManager.applyPalette(PaletteManager.getInitialPalette());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register Service Worker for offline PWA capabilities
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
