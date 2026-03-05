/* ============================================
   boot.js — 蛋薯机 DanShu Pro 开机动画 v3
   ============================================ */

(function () {
    'use strict';

    var BOOT_IMG = 'https://s3.bmp.ovh/2026/03/01/nn1m2Yea.png';
    var BOOT_DURATION = 3800;

    /* 预加载图片 */
    var preImg = new Image();
    preImg.src = BOOT_IMG;

    function buildBootScreen() {
        var el = document.createElement('div');
        el.className = 'boot-screen';
        el.id = 'bootScreen';

        var h = '';
        h += '<img class="boot-fullimg" src="' + BOOT_IMG + '" alt="" draggable="false">';
        h += '<div class="boot-particles">';
        for (var i = 1; i <= 5; i++) {
            h += '<div class="boot-spark s-' + i + '"></div>';
        }
        for (var j = 1; j <= 3; j++) {
            h += '<div class="boot-heart h-' + j + '"></div>';
        }
        h += '</div>';
        h += '<div class="boot-shimmer"></div>';

        el.innerHTML = h;
        return el;
    }

    function removePlaceholder() {
        var placeholder = document.getElementById('bootPlaceholder');
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.removeChild(placeholder);
        }
        var bs = document.getElementById('bootBlockStyle');
        if (bs && bs.parentNode) {
            bs.parentNode.removeChild(bs);
        }
    }

    function injectBoot() {
        var phone = document.querySelector('.phone-frame') || document.getElementById('phoneFrame');
        if (!phone) {
            removePlaceholder();
            return;
        }

        var screen = buildBootScreen();

        /* 插入为 phone-frame 的第一个子元素 */
        phone.insertBefore(screen, phone.firstChild);

        /* 等开机图片加载完成后，移除全屏黑色占位 */
        var img = screen.querySelector('.boot-fullimg');

        function onReady() {
            removePlaceholder();
        }

        if (img.complete && img.naturalWidth > 0) {
            onReady();
        } else {
            img.addEventListener('load', onReady);
            img.addEventListener('error', onReady);
            /* 兜底 */
            setTimeout(onReady, 2000);
        }

        /* 到时间后淡出开机画面 */
        setTimeout(function () {
            screen.classList.add('boot-fade-out');
            setTimeout(function () {
                if (screen.parentNode) {
                    screen.parentNode.removeChild(screen);
                }
            }, 900);
        }, BOOT_DURATION);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBoot);
    } else {
        injectBoot();
    }

})();
