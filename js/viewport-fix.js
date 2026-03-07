(function () {
    'use strict';

    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var root = document.documentElement;
    var lastH = 0;
    var kbActive = false;
    var lastKeyboardInset = -1;
    var keyboardFrame = 0;
    var chatLockedAppHeight = 0;

    if (isIOS && !root.classList.contains('is-ios')) root.classList.add('is-ios');
    if (isAndroid && !root.classList.contains('is-android')) root.classList.add('is-android');

    function getViewportHeight() {
        var h = window.innerHeight;
        if (window.visualViewport && window.visualViewport.height) h = window.visualViewport.height;

        if (isAndroid) {
            var ch = document.documentElement.clientHeight;
            if (ch > 0 && ch < h) h = ch;
        }

        return Math.round(h);
    }

    function getChatConversation() {
        return document.getElementById('chatConversation');
    }

    function getChatOverlay() {
        return document.getElementById('chatAppOverlay');
    }

    function getChatBody() {
        return document.getElementById('chatConvBody');
    }

    function getChatBottomBar() {
        var conv = getChatConversation();
        return conv ? conv.querySelector('.chat-conv-bottombar') : null;
    }

    function isChatKeyboardContext() {
        var conv = getChatConversation();
        return !!(conv && conv.classList.contains('show'));
    }

    function getAppliedAppHeight() {
        var inlineValue = parseFloat(root.style.getPropertyValue('--app-height'));
        if (inlineValue > 0) return Math.round(inlineValue);

        var computedValue = parseFloat(window.getComputedStyle(root).getPropertyValue('--app-height'));
        if (computedValue > 0) return Math.round(computedValue);

        return lastH || getViewportHeight();
    }

    function lockChatAppHeight() {
        if (!chatLockedAppHeight) chatLockedAppHeight = getAppliedAppHeight();
        if (!chatLockedAppHeight) return;

        lastH = chatLockedAppHeight;
        root.style.setProperty('--app-height', chatLockedAppHeight + 'px');
    }

    function syncChatViewportMetrics() {
        var conv = getChatConversation();
        var bottomBar = getChatBottomBar();
        if (!conv) return;

        if (!bottomBar) {
            conv.style.setProperty('--chat-conv-bottom-bar-height', '0px');
            return;
        }

        var styles = window.getComputedStyle(bottomBar);
        var marginTop = parseFloat(styles.marginTop) || 0;
        var marginBottom = parseFloat(styles.marginBottom) || 0;
        var totalHeight = Math.round(bottomBar.offsetHeight + marginTop + marginBottom);
        conv.style.setProperty('--chat-conv-bottom-bar-height', totalHeight + 'px');
    }

    function getChatKeyboardInset() {
        if (!window.visualViewport) return 0;

        var vv = window.visualViewport;
        var baseHeight = chatLockedAppHeight || getAppliedAppHeight();
        var inset = 0;

        if (isIOS) {
            var vvHeightInset = baseHeight - Math.round(vv.height || 0);
            var innerHeightInset = baseHeight - Math.round(window.innerHeight || 0);
            var clientHeightInset = baseHeight - Math.round(document.documentElement.clientHeight || 0);
            inset = Math.max(vvHeightInset, innerHeightInset, clientHeightInset);
        } else {
            inset = baseHeight - Math.round((vv.height || 0) + (vv.offsetTop || 0));
        }

        if (inset < 0) inset = 0;
        return inset;
    }

    function applyChatKeyboardInset(inset) {
        var conv = getChatConversation();
        var overlay = getChatOverlay();
        var nextInset = Math.max(0, Math.round(inset || 0));

        if (nextInset === lastKeyboardInset && conv) return;
        lastKeyboardInset = nextInset;

        if (conv) {
            conv.style.setProperty('--chat-keyboard-inset', nextInset + 'px');
            conv.classList.toggle('chat-keyboard-active', nextInset > 0);
        }

        if (overlay) {
            overlay.classList.toggle('chat-keyboard-active', nextInset > 0);
        }
    }

    function resetChatKeyboardInset() {
        if (keyboardFrame) {
            cancelAnimationFrame(keyboardFrame);
            keyboardFrame = 0;
        }

        chatLockedAppHeight = 0;
        lastKeyboardInset = -1;
        syncChatViewportMetrics();
        applyChatKeyboardInset(0);
    }

    function getBodyBottomGap(body) {
        return body.scrollHeight - body.clientHeight - body.scrollTop;
    }

    function shouldKeepBodyPinned(body) {
        return !!body && getBodyBottomGap(body) <= 72;
    }

    function setHeight() {
        if (kbActive && isChatKeyboardContext()) {
            lockChatAppHeight();
            return;
        }
        var h = getViewportHeight();
        if (Math.abs(h - lastH) < 1) return;
        lastH = h;
        chatLockedAppHeight = 0;
        root.style.setProperty('--app-height', h + 'px');
    }

    function onKbResize() {
        if (kbActive) fixKb();
    }

    function onKbScroll() {
        if (kbActive && window.visualViewport && window.visualViewport.offsetTop > 0) {
            window.scrollTo(0, 0);
        }
    }

    function fixKb() {
        if (!kbActive || !isChatKeyboardContext()) return;

        if (keyboardFrame) cancelAnimationFrame(keyboardFrame);
        keyboardFrame = requestAnimationFrame(function () {
            var body = getChatBody();
            var keepPinned = shouldKeepBodyPinned(body);
            keyboardFrame = 0;
            lockChatAppHeight();
            syncChatViewportMetrics();
            applyChatKeyboardInset(getChatKeyboardInset());

            if (body && keepPinned) body.scrollTop = body.scrollHeight;
        });
    }

    window._chatInputFocus = function () {
        chatLockedAppHeight = getAppliedAppHeight();
        kbActive = true;
        lockChatAppHeight();
        syncChatViewportMetrics();
        applyChatKeyboardInset(0);

        if (isIOS && window.visualViewport) {
            window.visualViewport.addEventListener('resize', onKbResize);
            window.visualViewport.addEventListener('scroll', onKbScroll);
            setTimeout(fixKb, 100);
            setTimeout(fixKb, 300);
            setTimeout(fixKb, 600);
        }

        if (isAndroid) {
            setTimeout(function () {
                var body = getChatBody();
                if (shouldKeepBodyPinned(body)) body.scrollTop = body.scrollHeight;
            }, 400);
        }
    };

    window._chatInputBlur = function () {
        kbActive = false;
        resetChatKeyboardInset();

        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', onKbResize);
            window.visualViewport.removeEventListener('scroll', onKbScroll);
        }

        setTimeout(function () {
            setHeight();
        }, 100);
    };

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', function () {
        setTimeout(setHeight, 300);
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setHeight);
    }

    window._chatSyncViewportMetrics = syncChatViewportMetrics;
})();
