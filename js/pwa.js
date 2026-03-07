(function () {
    'use strict';

    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service worker is not supported in this browser.');
        return;
    }

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        window.deferredPwaInstallPrompt = event;
        console.log('[PWA] beforeinstallprompt captured.');
    });

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (registration) {
            console.log('[PWA] Service worker registered:', registration.scope);
        }).catch(function (error) {
            console.error('[PWA] Service worker registration failed:', error);
        });
    });
})();
