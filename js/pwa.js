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
        logPwaDebug('[PWA] sw controlled?', !!navigator.serviceWorker.controller);

        var manifestLink = document.querySelector('link[rel="manifest"]');
        logPwaDebug('[PWA] manifest href attr =', manifestLink ? manifestLink.getAttribute('href') : 'null');
        logPwaDebug('[PWA] manifest href resolved =', manifestLink ? manifestLink.href : 'null');

        if (manifestLink && manifestLink.href) {
            fetch(manifestLink.href, { cache: 'no-store' }).then(function (response) {
                logPwaDebug('[PWA] manifest fetch ok?', response.ok);
                logPwaDebug('[PWA] manifest fetch status =', response.status);
                if (!response.ok) {
                    return null;
                }
                return response.json();
            }).then(function (manifest) {
                if (!manifest) {
                    return;
                }

                logPwaDebug('[PWA] manifest id =', manifest.id || 'null');
                logPwaDebug('[PWA] manifest start_url =', manifest.start_url || 'null');
                logPwaDebug('[PWA] manifest scope =', manifest.scope || 'null');
                logPwaDebug('[PWA] manifest display =', manifest.display || 'null');

                var icons = Array.isArray(manifest.icons) ? manifest.icons : [];
                var iconSrcList = icons.map(function (icon) {
                    return icon && icon.src ? icon.src : 'null';
                });

                logPwaDebug('[PWA] manifest icons count =', icons.length);
                logPwaDebug('[PWA] manifest icons src =', iconSrcList.join(', '));

                icons.forEach(function (icon) {
                    if (!icon || !icon.src) {
                        logPwaDebug('[PWA] icon failed:', 'null');
                        return;
                    }

                    var iconUrl = new URL(icon.src, manifestLink.href).href;
                    var img = new Image();
                    img.onload = function () {
                        logPwaDebug('[PWA] icon ok:', iconUrl);
                    };
                    img.onerror = function () {
                        logPwaDebug('[PWA] icon failed:', iconUrl);
                    };
                    img.src = iconUrl;
                });
            }).catch(function (error) {
                logPwaDebug('[PWA] manifest fetch failed:', String(error));
            });
        }

        navigator.serviceWorker.register('./sw.js', { scope: './' }).then(function (registration) {
            logPwaDebug('[PWA] Service worker registered:', registration.scope);
        }).catch(function (error) {
            logPwaDebug('[PWA] Service worker registration failed:', String(error));
        });
    });
})();
