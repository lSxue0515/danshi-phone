/* ============================================
   蛋薯机 DanShu Pro v2 — pages.js
   ============================================ */

(function () {
    var track, viewport, dots;
    var current = 0, total = 3;       // ★ 改成3页
    var startX = 0, moveX = 0, isDragging = false;
    var trackWidth = 0;

    function init() {
        track = document.getElementById('pagesTrack');
        viewport = document.getElementById('pagesViewport');
        dots = document.querySelectorAll('.dot');

        if (!track || !viewport) return;

        viewport.addEventListener('touchstart', onStart, { passive: true });
        viewport.addEventListener('touchmove', onMove, { passive: false });
        viewport.addEventListener('touchend', onEnd);

        viewport.addEventListener('mousedown', onStart);
        viewport.addEventListener('mousemove', onMove);
        viewport.addEventListener('mouseup', onEnd);
        viewport.addEventListener('mouseleave', onEnd);

        dots.forEach(function (d) {
            d.addEventListener('click', function () {
                goTo(parseInt(d.dataset.page));
            });
        });
    }

    function onStart(e) {
        isDragging = true;
        startX = e.touches ? e.touches[0].clientX : e.clientX;
        moveX = 0;
        trackWidth = viewport.offsetWidth;
        track.classList.add('dragging');
    }

    function onMove(e) {
        if (!isDragging) return;
        var x = e.touches ? e.touches[0].clientX : e.clientX;
        moveX = x - startX;
        var offset = -(current * trackWidth) + moveX;
        track.style.transform = 'translateX(' + offset + 'px)';
        if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        track.classList.remove('dragging');
        var threshold = trackWidth * 0.2;
        if (moveX < -threshold && current < total - 1) {
            current++;
        } else if (moveX > threshold && current > 0) {
            current--;
        }
        goTo(current);
    }

    function goTo(page) {
        current = page;
        var pct = 100 / total;                              // ★ 每页占比 = 33.333%
        track.style.transform = 'translateX(-' + (current * pct) + '%)';
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === current);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
