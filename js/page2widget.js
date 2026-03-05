/* ============================================
   蛋薯机 DanShu Pro v2 — page2widget.js
   第二页大组件 + 第一页双人组件
   ============================================ */

var P2_KEY = 'ds_page2_widget';
var _p2Data = null;
var _p2Playing = false;
var _p2Timer = null;
var _p2Progress = 0;
var _p2Duration = 325;

function _p2Load() {
    try { _p2Data = JSON.parse(localStorage.getItem(P2_KEY)); } catch (e) { }
    if (!_p2Data) _p2Data = {};
}
function _p2Save() {
    try { localStorage.setItem(P2_KEY, JSON.stringify(_p2Data)); } catch (e) { }
}
_p2Load();

/* ========== 初始化 ========== */
function initPage2Widget() {
    _p2BindEditable('p2SearchText', 'searchText');
    _p2BindEditable('p2Caption', 'caption');
    _p2BindEditable('p2PlayerTitle', 'playerTitle');
    _p2BindEditable('p2NoteLine1', 'noteLine1');
    _p2BindEditable('p2NoteLine2', 'noteLine2');
    _p2BindEditable('p2NoteLine3', 'noteLine3');
    _p2BindEditable('p2NoteFooter', 'noteFooter');

    // 恢复文本
    var textFields = {
        'p2SearchText': 'searchText',
        'p2Caption': 'caption',
        'p2PlayerTitle': 'playerTitle',
        'p2NoteLine1': 'noteLine1',
        'p2NoteLine2': 'noteLine2',
        'p2NoteLine3': 'noteLine3',
        'p2NoteFooter': 'noteFooter'
    };
    // 恢复文本
    for (var elId in textFields) {
        var key = textFields[elId];
        if (_p2Data[key] !== undefined) {  // ★ 改这里，允许空字符串
            var el = document.getElementById(elId);
            if (el) el.textContent = _p2Data[key] || '\u200B';  // ★ 空时放零宽字符
        }
    }

    // 恢复图片
    if (_p2Data.imgLeft) {
        var el = document.getElementById('p2ImgLeft');
        var box = document.getElementById('p2BoxLeft');
        if (el) el.src = _p2Data.imgLeft;
        if (box) box.classList.add('p2-has-img');
    }
    if (_p2Data.imgRight) {
        var el = document.getElementById('p2ImgRight');
        var box = document.getElementById('p2BoxRight');
        if (el) el.src = _p2Data.imgRight;
        if (box) box.classList.add('p2-has-img');
    }
    if (_p2Data.playerBg) {
        var bgEl = document.getElementById('p2PlayerBg');
        var coverBox = document.querySelector('.p2-player-cover');
        if (bgEl) bgEl.src = _p2Data.playerBg;
        if (coverBox) coverBox.classList.add('p2-has-bg');
    }
    if (_p2Data.avatar) {
        var avEl = document.getElementById('p2Avatar');
        var avBox = document.querySelector('.p2-search-avatar');
        if (avEl) avEl.src = _p2Data.avatar;
        if (avBox) avBox.classList.add('p2-has-avatar');
    }
    if (_p2Data.noteAvatar) {
        var naEl = document.getElementById('p2NoteAvatar');
        var naBox = document.querySelector('.p2-note-avatar');
        if (naEl) naEl.src = _p2Data.noteAvatar;
        if (naBox) naBox.classList.add('p2-has-note-avatar');
    }

    // 更新便签日期
    _p2UpdateNoteDate();
    setInterval(_p2UpdateNoteDate, 60000);

    // ========== 双人组件初始化（现在在第一页） ==========
    _p2BindEditable('p2DuoBubbleL', 'duoBubbleL');
    _p2BindEditable('p2DuoBubbleR', 'duoBubbleR');
    _p2BindEditable('p2DuoCaption', 'duoCaption');
    _p2BindEditable('p2DuoSong', 'duoSong');
    _p2BindEditable('p2DuoDecor', 'duoDecor');

    var duoTextFields = {
        'p2DuoBubbleL': 'duoBubbleL',
        'p2DuoBubbleR': 'duoBubbleR',
        'p2DuoCaption': 'duoCaption',
        'p2DuoSong': 'duoSong',
        'p2DuoDecor': 'duoDecor'
    };
    for (var dId in duoTextFields) {
        var dKey = duoTextFields[dId];
        if (_p2Data[dKey] !== undefined) {  // ★ 改这里
            var dEl = document.getElementById(dId);
            if (dEl) dEl.textContent = _p2Data[dKey] || '\u200B';  // ★ 空时放零宽字符
        }
    }
    if (_p2Data.duoAvatarL) {
        var daL = document.getElementById('p2DuoAvatarL');
        if (daL) { daL.src = _p2Data.duoAvatarL; daL.closest('.p2-duo-avatar').classList.add('p2-has-duo-avatar'); }
    }
    if (_p2Data.duoAvatarR) {
        var daR = document.getElementById('p2DuoAvatarR');
        if (daR) { daR.src = _p2Data.duoAvatarR; daR.closest('.p2-duo-avatar').classList.add('p2-has-duo-avatar'); }
    }
    // 初始化播放器进度
    _p2DuoProgress = 37;
    _p2DuoUpdateBar();

    // 初始化拍立得轮播
    _p2CarInit();
}

/* ========== 更新便签日期 ========== */
function _p2UpdateNoteDate() {
    var el = document.getElementById('p2NoteDate');
    if (el) {
        var day = new Date().getDate();
        el.textContent = day;
    }
}

function _p2BindEditable(elId, key) {
    var el = document.getElementById(elId);
    if (!el) return;

    /* ★ 保证空元素也有最小高度可点击 */
    el.style.minHeight = el.style.minHeight || '1em';

    el.addEventListener('blur', function () {
        _p2Load();
        var txt = el.textContent.trim();
        _p2Data[key] = txt;
        _p2Save();
        /* ★ 如果清空了，插入一个零宽字符保持可编辑 */
        if (!txt && !el.textContent.trim()) {
            el.innerHTML = '\u200B';
        }
    });

    el.addEventListener('focus', function () {
        /* ★ 聚焦时如果只有零宽字符，清掉让用户正常输入 */
        if (el.textContent === '\u200B') {
            el.textContent = '';
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    });

    /* ★ 初始就检查一下是否为空 */
    if (!el.textContent.trim()) {
        el.innerHTML = '\u200B';
    }
}

/* ========== 头像选择（搜索栏） ========== */
function p2PickAvatar() {
    _p2PickFile(function (result) {
        var el = document.getElementById('p2Avatar');
        var box = document.querySelector('.p2-search-avatar');
        if (el) el.src = result;
        if (box) box.classList.add('p2-has-avatar');
        _p2Load();
        _p2Data.avatar = result;
        _p2Save();
    }, 80, 80);
}

/* ========== 头像选择（便签卡片） ========== */
function p2PickNoteAvatar() {
    _p2PickFile(function (result) {
        var el = document.getElementById('p2NoteAvatar');
        var box = document.querySelector('.p2-note-avatar');
        if (el) el.src = result;
        if (box) box.classList.add('p2-has-note-avatar');
        _p2Load();
        _p2Data.noteAvatar = result;
        _p2Save();
    }, 100, 100);
}

/* ========== 图片选择（左/右） ========== */
function p2PickImage(which) {
    var maxW = which === 'left' ? 460 : 280;
    var maxH = which === 'left' ? 560 : 280;
    _p2PickFile(function (result) {
        var elId = which === 'left' ? 'p2ImgLeft' : 'p2ImgRight';
        var boxId = which === 'left' ? 'p2BoxLeft' : 'p2BoxRight';
        var el = document.getElementById(elId);
        var box = document.getElementById(boxId);
        if (el) el.src = result;
        if (box) box.classList.add('p2-has-img');
        _p2Load();
        _p2Data[which === 'left' ? 'imgLeft' : 'imgRight'] = result;
        _p2Save();
        if (typeof showToast === 'function') showToast('图片已更换 ✨');
    }, maxW, maxH);
}

/* ========== 播放器封面选择 ========== */
function p2PickPlayerBg() {
    _p2PickFile(function (result) {
        var el = document.getElementById('p2PlayerBg');
        var box = document.querySelector('.p2-player-cover');
        if (el) el.src = result;
        if (box) box.classList.add('p2-has-bg');
        _p2Load();
        _p2Data.playerBg = result;
        _p2Save();
        if (typeof showToast === 'function') showToast('封面已更换 🎵');
    }, 200, 200);
}

/* ========== 双人组件 — 头像选择 ========== */
function p2PickDuoAvatar(side) {
    _p2PickFile(function (result) {
        var el = document.getElementById('p2DuoAvatar' + side);
        if (el) {
            el.src = result;
            el.closest('.p2-duo-avatar').classList.add('p2-has-duo-avatar');
        }
        _p2Load();
        _p2Data['duoAvatar' + side] = result;
        _p2Save();
    }, 150, 150);
}

/* ========== 通用文件选择+压缩 ========== */
function _p2PickFile(callback, maxW, maxH) {
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;top:-9999px;visibility:hidden;';
    inp.addEventListener('change', function () {
        var file = inp.files && inp.files[0];
        document.body.removeChild(inp);
        if (!file) return;
        var rd = new FileReader();
        rd.onload = function () {
            var img = new Image();
            img.onload = function () {
                var w = img.width, h = img.height;
                if (w > maxW) { h = h * maxW / w; w = maxW; }
                if (h > maxH) { w = w * maxH / h; h = maxH; }
                var cv = document.createElement('canvas');
                cv.width = Math.round(w);
                cv.height = Math.round(h);
                cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                var quality = 0.7;
                var result = cv.toDataURL('image/jpeg', quality);
                while (result.length > 110 * 1024 * 1.37 && quality > 0.15) {
                    quality -= 0.1;
                    w = Math.round(w * 0.8);
                    h = Math.round(h * 0.8);
                    cv.width = w; cv.height = h;
                    cv.getContext('2d').drawImage(img, 0, 0, w, h);
                    result = cv.toDataURL('image/jpeg', quality);
                }
                callback(result);
            };
            img.src = rd.result;
        };
        rd.readAsDataURL(file);
    });
    document.body.appendChild(inp);
    setTimeout(function () { inp.click(); }, 50);
}

/* ========== 第二页小播放器控制 ========== */
function p2PlayPause() {
    _p2Playing = !_p2Playing;
    var icon = document.getElementById('p2PlayIcon');
    if (_p2Playing) {
        if (icon) icon.innerHTML = '<polygon points="6 3 20 12 6 21 6 3"/>';
        _p2StartTimer();
    } else {
        if (icon) icon.innerHTML = '<line x1="10" y1="6" x2="10" y2="18"/><line x1="14" y1="6" x2="14" y2="18"/>';
        _p2StopTimer();
    }
}

function p2Prev() {
    _p2Progress = Math.max(0, _p2Progress - 10);
    _p2UpdateBar();
}

function p2Next() {
    _p2Progress = Math.min(100, _p2Progress + 10);
    _p2UpdateBar();
}

function _p2StartTimer() {
    _p2StopTimer();
    _p2Timer = setInterval(function () {
        _p2Progress += 100 / _p2Duration;
        if (_p2Progress >= 100) { _p2Progress = 0; p2PlayPause(); }
        _p2UpdateBar();
    }, 1000);
}

function _p2StopTimer() {
    if (_p2Timer) { clearInterval(_p2Timer); _p2Timer = null; }
}

function _p2UpdateBar() {
    var fill = document.getElementById('p2BarFill');
    var dot = document.getElementById('p2BarDot');
    var timeNow = document.getElementById('p2TimeNow');
    if (fill) fill.style.width = _p2Progress + '%';
    if (dot) dot.style.left = _p2Progress + '%';
    if (timeNow) {
        var sec = Math.floor(_p2Progress / 100 * _p2Duration);
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        timeNow.textContent = (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }
}

function p2BarClick(e) {
    var wrap = e.currentTarget;
    var rect = wrap.getBoundingClientRect();
    var x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - rect.left;
    _p2Progress = Math.max(0, Math.min(100, x / rect.width * 100));
    _p2UpdateBar();
}

/* ========== 双人组件播放器控制 ========== */
var _p2DuoPlaying = false;
var _p2DuoTimer = null;
var _p2DuoProgress = 37;
var _p2DuoDuration = 228;

function p2DuoPlayPause() {
    _p2DuoPlaying = !_p2DuoPlaying;
    var icon = document.getElementById('p2DuoPlayIcon');
    if (_p2DuoPlaying) {
        if (icon) icon.innerHTML = '<polygon points="6 3 20 12 6 21 6 3"/>';
        _p2DuoStartTimer();
    } else {
        if (icon) icon.innerHTML = '<line x1="10" y1="5" x2="10" y2="19"/><line x1="14" y1="5" x2="14" y2="19"/>';
        _p2DuoStopTimer();
    }
}

function p2DuoPrev() {
    _p2DuoProgress = Math.max(0, _p2DuoProgress - 10);
    _p2DuoUpdateBar();
}

function p2DuoNext() {
    _p2DuoProgress = Math.min(100, _p2DuoProgress + 10);
    _p2DuoUpdateBar();
}

function p2DuoStar() {
    if (typeof showToast === 'function') showToast('已收藏 ⭐');
}

function p2DuoHeart() {
    if (typeof showToast === 'function') showToast('已喜欢 ♥');
}

function _p2DuoStartTimer() {
    _p2DuoStopTimer();
    _p2DuoTimer = setInterval(function () {
        _p2DuoProgress += 100 / _p2DuoDuration;
        if (_p2DuoProgress >= 100) { _p2DuoProgress = 0; p2DuoPlayPause(); }
        _p2DuoUpdateBar();
    }, 1000);
}

function _p2DuoStopTimer() {
    if (_p2DuoTimer) { clearInterval(_p2DuoTimer); _p2DuoTimer = null; }
}

function _p2DuoUpdateBar() {
    var fill = document.getElementById('p2DuoBarFill');
    var dot = document.getElementById('p2DuoBarDot');
    var timeNow = document.getElementById('p2DuoTimeNow');
    if (fill) fill.style.width = _p2DuoProgress + '%';
    if (dot) dot.style.left = _p2DuoProgress + '%';
    if (timeNow) {
        var sec = Math.floor(_p2DuoProgress / 100 * _p2DuoDuration);
        var m = Math.floor(sec / 60);
        var s = sec % 60;
        timeNow.textContent = m + ':' + (s < 10 ? '0' : '') + s;
    }
}

function p2DuoBarClick(e) {
    var wrap = e.currentTarget;
    var rect = wrap.getBoundingClientRect();
    var x = (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || 0) - rect.left;
    _p2DuoProgress = Math.max(0, Math.min(100, x / rect.width * 100));
    _p2DuoUpdateBar();
}

/* ========== DOM Ready ========== */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage2Widget);
} else {
    setTimeout(initPage2Widget, 100);
}
