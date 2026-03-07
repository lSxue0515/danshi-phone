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
        return;
    }

    bindInstallButton();

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        window.deferredPwaInstallPrompt = event;
        setInstallButtonVisible(true);
    });

    window.addEventListener('appinstalled', function () {
        clearInstallPrompt();
    });

    window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js', { scope: './' });
    });
})();
