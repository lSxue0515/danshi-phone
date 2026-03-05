/* ============================================
   蛋薯机 DanShu Pro v2 — card.js
   ============================================ */

function openCardSettings() {
    // 不再弹提示
}

function toggleColorPicker() {
    var picker = document.getElementById('colorPicker');
    if (picker) picker.classList.toggle('show');
}

function setCardTextColor(color) {
    var title = document.getElementById('cardTitle');
    var text = document.getElementById('cardText');
    if (title) title.style.color = color;
    if (text) text.style.color = color;
    localStorage.setItem('ds_card_color', color);
}

function saveCardContent() {
    var title = document.getElementById('cardTitle');
    var text = document.getElementById('cardText');
    if (title) localStorage.setItem('ds_card_title', title.innerText.replace(/\u200B/g, ''));
    if (text) localStorage.setItem('ds_card_text', text.innerText.replace(/\u200B/g, ''));
}

function loadCardContent() {
    var t = localStorage.getItem('ds_card_title');
    var x = localStorage.getItem('ds_card_text');
    var img = localStorage.getItem('ds_img_cardImage');
    var color = localStorage.getItem('ds_card_color');

    if (t) { var el = document.getElementById('cardTitle'); if (el) el.innerText = t; }
    if (x) { var el2 = document.getElementById('cardText'); if (el2) el2.innerText = x; }
    if (img) { var el3 = document.getElementById('cardImage'); if (el3) el3.src = img; }
    if (color) {
        var title = document.getElementById('cardTitle');
        var text = document.getElementById('cardText');
        if (title) title.style.color = color;
        if (text) text.style.color = color;
    }
}

document.addEventListener('click', function (e) {
    var picker = document.getElementById('colorPicker');
    var btn = document.querySelector('.card-color-btn');
    if (picker && picker.classList.contains('show')) {
        if (!picker.contains(e.target) && (!btn || !btn.contains(e.target))) {
            picker.classList.remove('show');
        }
    }
});

/* ★ 通用：给 contenteditable 元素加空文字保护 */
function _cardProtectEditable(el) {
    if (!el || el.dataset.editFixed) return;
    el.dataset.editFixed = '1';

    // 保证最小尺寸
    if (!el.style.minHeight || el.style.minHeight === '0px') {
        el.style.minHeight = '1.2em';
    }
    el.style.minWidth = el.style.minWidth || '2em';
    var cs = window.getComputedStyle(el);
    if (cs.display === 'inline') {
        el.style.display = 'inline-block';
    }

    el.addEventListener('blur', function () {
        if (!el.textContent.replace(/\u200B/g, '').trim()) {
            el.innerHTML = '\u200B';
        }
    });

    el.addEventListener('focus', function () {
        var raw = el.textContent;
        if (raw === '\u200B' || raw.replace(/\u200B/g, '').trim() === '') {
            el.textContent = '';
            try {
                var range = document.createRange();
                range.selectNodeContents(el);
                range.collapse(false);
                var sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
            } catch (e) { }
        }
    });

    // 初始检查
    if (!el.textContent.trim()) {
        el.innerHTML = '\u200B';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    loadCardContent();

    var ct = document.getElementById('cardTitle');
    var cx = document.getElementById('cardText');
    if (ct) {
        ct.addEventListener('blur', saveCardContent);
        _cardProtectEditable(ct);
    }
    if (cx) {
        cx.addEventListener('blur', saveCardContent);
        _cardProtectEditable(cx);
    }

    // 气泡文字
    var bt = document.getElementById('bubbleTextTop');
    var bb = document.getElementById('bubbleTextBottom');
    var savedBT = localStorage.getItem('ds_bubble_top');
    var savedBB = localStorage.getItem('ds_bubble_bottom');
    if (savedBT && bt) bt.innerText = savedBT;
    if (savedBB && bb) bb.innerText = savedBB;

    if (bt) {
        bt.addEventListener('blur', function () {
            localStorage.setItem('ds_bubble_top', bt.innerText.replace(/\u200B/g, ''));
        });
        _cardProtectEditable(bt);
    }
    if (bb) {
        bb.addEventListener('blur', function () {
            localStorage.setItem('ds_bubble_bottom', bb.innerText.replace(/\u200B/g, ''));
        });
        _cardProtectEditable(bb);
    }

    // 气泡头像
    var al = localStorage.getItem('ds_img_avatarLeft');
    var ar = localStorage.getItem('ds_img_avatarRight');
    if (al) { var imgL = document.getElementById('avatarLeft'); if (imgL) { imgL.src = al; imgL.style.display = 'block'; } }
    if (ar) { var imgR = document.getElementById('avatarRight'); if (imgR) { imgR.src = ar; imgR.style.display = 'block'; } }
});
