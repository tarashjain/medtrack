'use client';

import { useEffect, useState } from 'react';

export default function PWARegister() {
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((err) => console.warn('[SW] Registration failed:', err));
    }

    // Capture the install prompt (Android Chrome)
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Only show if not already installed and not dismissed before
      const dismissed = sessionStorage.getItem('pwa-banner-dismissed');
      if (!dismissed) setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (installPrompt as any).prompt();
    if (result?.outcome === 'accepted') setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa-banner-dismissed', '1');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-80">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/60 p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-base">M</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">Install MedTrack</p>
          <p className="text-xs text-slate-500 mt-0.5">Add to your home screen for offline access</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 py-1.5 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-700 transition-colors"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-xs font-medium hover:bg-slate-50 transition-colors"
            >
              Not now
            </button>
          </div>
        </div>
        <button onClick={handleDismiss} className="text-slate-300 hover:text-slate-500 flex-shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}