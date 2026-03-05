(function () {
    'use strict';

    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/i.test(ua);
    var root = document.documentElement;

    // 确保 class 在（head里已加过一次，这里兜底）
    if (isIOS && !root.classList.contains('is-ios')) root.classList.add('is-ios');
    if (isAndroid && !root.classList.contains('is-android')) root.classList.add('is-android');

    // ========== 实时视口高度 ==========
    var lastH = 0;

    function setHeight() {
        if (window.innerWidth > 768) return;

        var h = window.innerHeight;
        if (window.visualViewport) h = window.visualViewport.height;

        if (isAndroid) {
            var ch = document.documentElement.clientHeight;
            if (ch > 0 && ch < h) h = ch;
        }

        if (Math.abs(h - lastH) < 1) return;
        lastH = h;

        root.style.setProperty('--app-height', h + 'px');

        var frame = document.getElementById('phoneFrame');
        if (frame) frame.style.height = h + 'px';
    }

    setHeight();
    window.addEventListener('resize', setHeight);
    window.addEventListener('orientationchange', function () { setTimeout(setHeight, 300); });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', setHeight);
    }

    // ========== iOS 键盘修复 ==========
    // 核心：键盘弹出时 visualViewport.height 变小
    // 我们把 phone-frame 高度缩到可见区域，聊天界面自然跟着缩

    var kbActive = false;

    window._chatInputFocus = function () {
        kbActive = true;
        if (isIOS && window.visualViewport) {
            window.visualViewport.addEventListener('resize', onKbResize);
            window.visualViewport.addEventListener('scroll', onKbScroll);
            setTimeout(fixKb, 100);
            setTimeout(fixKb, 300);
            setTimeout(fixKb, 600);
        }
        if (isAndroid) {
            setTimeout(function () {
                var b = document.getElementById('chatConvBody');
                if (b) b.scrollTop = b.scrollHeight;
            }, 400);
        }
    };

    window._chatInputBlur = function () {
        kbActive = false;
        if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', onKbResize);
            window.visualViewport.removeEventListener('scroll', onKbScroll);
        }
        // 恢复
        var conv = document.getElementById('chatConversation');
        if (conv) conv.style.height = '';
        setTimeout(function () {
            window.scrollTo(0, 0);
            setHeight();
        }, 100);
    };

    function onKbResize() {
        if (kbActive) fixKb();
    }

    function onKbScroll() {
        if (window.visualViewport && window.visualViewport.offsetTop > 0) {
            window.scrollTo(0, 0);
        }
    }

    function fixKb() {
        if (!kbActive || !window.visualViewport) return;

        var h = window.visualViewport.height;

        // 缩小 phone-frame 到可见高度
        var frame = document.getElementById('phoneFrame');
        if (frame) frame.style.height = h + 'px';

        // 聊天容器也缩到这个高度
        var conv = document.getElementById('chatConversation');
        if (conv) conv.style.height = h + 'px';

        // 滚到最新消息
        var body = document.getElementById('chatConvBody');
        if (body) body.scrollTop = body.scrollHeight;

        // 禁止页面滚动
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
    }

})();
