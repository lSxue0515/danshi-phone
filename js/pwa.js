(function () {
    'use strict';

    var installBtn = null;

    function setInstallButtonVisible(visible) {
        if (!installBtn) {
            return;
        }
        installBtn.hidden = !visible;
    }

    function clearInstallPrompt() {
        window.deferredPwaInstallPrompt = null;
        setInstallButtonVisible(false);
    }

    function bindInstallButton() {
        installBtn = document.getElementById('pwaInstallBtn');
        if (!installBtn) {
            return;
        }

        installBtn.addEventListener('click', function () {
            var deferredPrompt = window.deferredPwaInstallPrompt;
            if (!deferredPrompt) {
                return;
            }

            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function () {
                clearInstallPrompt();
            }).catch(function () {
                clearInstallPrompt();
            });
        });
    }

    if (!('serviceWorker' in navigator)) {
        console.log('[PWA] Service worker is not supported in this browser.');
        return;
    }

    bindInstallButton();

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        window.deferredPwaInstallPrompt = event;
        setInstallButtonVisible(true);
        console.log('[PWA] beforeinstallprompt captured.');
    });

    window.addEventListener('appinstalled', function () {
        clearInstallPrompt();
        console.log('[PWA] App installed.');
    });

    window.addEventListener('load', function () {
        console.log('[PWA] location.href =', window.location.href);
        console.log('[PWA] display-mode standalone?', window.matchMedia('(display-mode: standalone)').matches);
        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (registration) {
            console.log('[PWA] Service worker registered:', registration.scope);
        }).catch(function (error) {
            console.error('[PWA] Service worker registration failed:', error);
        });
    });
})();
