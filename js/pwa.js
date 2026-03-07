(function () {
    'use strict';

    var installBtn = null;
    var debugPanel = null;

    function logPwaDebug() {
        var message = Array.prototype.slice.call(arguments).map(function (part) {
            if (typeof part === 'string') {
                return part;
            }

            try {
                return JSON.stringify(part);
            } catch (error) {
                return String(part);
            }
        }).join(' ');

        console.log(message);

        if (!debugPanel) {
            debugPanel = document.getElementById('pwaDebugPanel');
        }
        if (!debugPanel) {
            return;
        }

        debugPanel.textContent += (debugPanel.textContent ? '\n' : '') + message;
        debugPanel.scrollTop = debugPanel.scrollHeight;
    }

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
        logPwaDebug('[PWA] Service worker is not supported in this browser.');
        return;
    }

    bindInstallButton();

    window.addEventListener('beforeinstallprompt', function (event) {
        event.preventDefault();
        window.deferredPwaInstallPrompt = event;
        setInstallButtonVisible(true);
        logPwaDebug('[PWA] beforeinstallprompt captured.');
    });

    window.addEventListener('appinstalled', function () {
        clearInstallPrompt();
        logPwaDebug('[PWA] App installed.');
    });

    window.addEventListener('load', function () {
        logPwaDebug('[PWA] location.href =', window.location.href);
        logPwaDebug('[PWA] display-mode standalone?', window.matchMedia('(display-mode: standalone)').matches);
        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (registration) {
            logPwaDebug('[PWA] Service worker registered:', registration.scope);
        }).catch(function (error) {
            logPwaDebug('[PWA] Service worker registration failed:', String(error));
        });
    });
})();
