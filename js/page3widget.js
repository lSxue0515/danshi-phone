/* ============================================
   蛋薯机 DanShu Pro v2 — page3widget.js
   第三页 · 联系卡片 + 票根组件 · 编辑 + 持久化
   ============================================ */

(function () {
    var STORE_KEY = 'ds_p3_contact';

    function loadData() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveData(d) {
        localStorage.setItem(STORE_KEY, JSON.stringify(d));
    }

    /* ===== 初始化 ===== */
    function init() {
        var d = loadData();
        if (d.avatar) {
            var img = document.getElementById('p3ContactAvatar');
            if (img) img.src = d.avatar;
        }
        var textRestore = {
            'p3ContactBubble': 'bubble',
            'p3ContactName': 'name',
            'p3ContactLink': 'link',
            'p3TicketText': 'ticketText'
        };
        for (var rid in textRestore) {
            var rk = textRestore[rid];
            if (d[rk] !== undefined) {
                var rel = document.getElementById(rid);
                if (rel) rel.textContent = d[rk] || '';
            }
        }
        if (d.photo) {
            var img = document.getElementById('p3ContactPhoto');
            if (img) img.src = d.photo;
        }
        if (d.ticketImg) {
            var tImg = document.getElementById('p3TicketImg');
            if (tImg) tImg.src = d.ticketImg;
        }

        bindEditable('p3ContactBubble', 'bubble');
        bindEditable('p3ContactName', 'name');
        bindEditable('p3ContactLink', 'link');
        bindEditable('p3TicketText', 'ticketText');
    }

    function bindEditable(id, key) {
        var el = document.getElementById(id);
        if (!el) return;
        el.dataset.editFixed = '1';

        if (!el.style.minHeight || el.style.minHeight === '0px') {
            el.style.minHeight = '1.2em';
        }
        el.style.minWidth = el.style.minWidth || '2em';
        var cs = window.getComputedStyle(el);
        if (cs.display === 'inline') el.style.display = 'inline-block';

        el.addEventListener('blur', function () {
            var d = loadData();
            var txt = el.textContent.replace(/\u200B/g, '').trim();
            d[key] = txt;
            saveData(d);
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
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        });
        if (!el.textContent.trim()) {
            el.innerHTML = '\u200B';
        }
    }

    /* ===== 上传头像 ===== */
    window.p3PickAvatar = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3ContactAvatar');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.avatar = dataUrl;
            saveData(d);
        });
    };

    /* ===== 上传右侧图片 ===== */
    window.p3PickPhoto = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3ContactPhoto');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.photo = dataUrl;
            saveData(d);
        });
    };

    /* ===== 上传票根图片 ===== */
    window.p3PickTicketImg = function () {
        pickImage(function (dataUrl) {
            var img = document.getElementById('p3TicketImg');
            if (img) img.src = dataUrl;
            var d = loadData();
            d.ticketImg = dataUrl;
            saveData(d);
        });
    };

    /* ===== 聚焦某个字段 ===== */
    window.p3FocusField = function (id) {
        var el = document.getElementById(id);
        if (el) {
            el.focus();
            var range = document.createRange();
            range.selectNodeContents(el);
            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        }
    };

    /* ===== 通用图片选取 ===== */
    function pickImage(callback) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) {
                if (callback) callback(ev.target.result);
            };
            reader.readAsDataURL(file);
        });
        requestAnimationFrame(function () { inp.click(); });
    }

    /* ===== 启动 ===== */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* =============================================
   个人资料卡片 — 图片上传 + 持久化
   ============================================= */
(function () {
    var PK = 'ds_p3_profile';

    function loadP() {
        try { return JSON.parse(localStorage.getItem(PK) || '{}'); } catch (e) { return {}; }
    }
    function saveP(d) {
        localStorage.setItem(PK, JSON.stringify(d));
    }

    /* ===== 通用图片选取 ===== */
    function pickImg(cb) {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);
        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function (ev) { cb(ev.target.result); };
            reader.readAsDataURL(file);
        });
        requestAnimationFrame(function () { inp.click(); });
    }

    /* ===== ★ 上传封面：选图后先弹调整，确定才保存 ===== */
    window.p3PickProfileBanner = function () {
        pickImg(function (url) {
            // ★ 不立即保存！先弹出调整界面
            _p3OpenBannerCrop(url);
        });
    };

    /* ===== Banner 图片显示区域选择器 ===== */
    function _p3OpenBannerCrop(imgUrl) {
        var old = document.getElementById('p3BannerCropOverlay');
        if (old) old.remove();

        var ov = document.createElement('div');
        ov.id = 'p3BannerCropOverlay';
        ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.7);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';

        var box = document.createElement('div');
        box.style.cssText = 'background:#fff;border-radius:16px;padding:20px;width:90%;max-width:340px;text-align:center;';

        var title = document.createElement('div');
        title.textContent = '调整图片显示区域';
        title.style.cssText = 'font-size:14px;font-weight:600;margin-bottom:14px;color:#333;';
        box.appendChild(title);

        var hint = document.createElement('div');
        hint.textContent = '上下拖动图片选择要显示的区域';
        hint.style.cssText = 'font-size:11px;color:#999;margin-bottom:12px;';
        box.appendChild(hint);

        var previewWrap = document.createElement('div');
        previewWrap.style.cssText = 'width:100%;aspect-ratio:16/7;border-radius:12px;overflow:hidden;position:relative;background:#f0f0f0;touch-action:none;cursor:grab;';

        var previewImg = document.createElement('img');
        previewImg.src = imgUrl;
        previewImg.style.cssText = 'width:100%;height:auto;position:absolute;left:0;top:0;pointer-events:none;user-select:none;-webkit-user-drag:none;';
        previewWrap.appendChild(previewImg);
        box.appendChild(previewWrap);

        var offsetY = 0;
        var maxOffset = 0;
        var isDrag = false;
        var startDragY = 0;
        var startOffset = 0;

        previewImg.onload = function () {
            var wrapH = previewWrap.offsetHeight;
            var imgRatio = previewImg.naturalHeight / previewImg.naturalWidth;
            var imgRenderedH = previewWrap.offsetWidth * imgRatio;
            maxOffset = Math.max(0, imgRenderedH - wrapH);
            // 默认居中
            offsetY = -(maxOffset * 0.5);
            previewImg.style.top = offsetY + 'px';
        };

        previewWrap.addEventListener('touchstart', function (e) {
            isDrag = true;
            startDragY = e.touches[0].clientY;
            startOffset = offsetY;
            previewWrap.style.cursor = 'grabbing';
        }, { passive: true });

        previewWrap.addEventListener('touchmove', function (e) {
            if (!isDrag) return;
            var dy = e.touches[0].clientY - startDragY;
            offsetY = Math.max(-maxOffset, Math.min(0, startOffset + dy));
            previewImg.style.top = offsetY + 'px';
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        previewWrap.addEventListener('touchend', function () {
            isDrag = false;
            previewWrap.style.cursor = 'grab';
        });

        previewWrap.addEventListener('mousedown', function (e) {
            isDrag = true;
            startDragY = e.clientY;
            startOffset = offsetY;
            previewWrap.style.cursor = 'grabbing';
            e.preventDefault();
        });

        function onMouseMove(e) {
            if (!isDrag) return;
            var dy = e.clientY - startDragY;
            offsetY = Math.max(-maxOffset, Math.min(0, startOffset + dy));
            previewImg.style.top = offsetY + 'px';
        }
        function onMouseUp() {
            isDrag = false;
            previewWrap.style.cursor = 'grab';
        }
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        function cleanup() {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            ov.remove();
        }

        /* 按钮栏 */
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;gap:10px;margin-top:16px;justify-content:center;';

        /* 取消 = 什么都不做，不换图 */
        var btnCancel = document.createElement('div');
        btnCancel.textContent = '取消';
        btnCancel.style.cssText = 'padding:8px 24px;border-radius:20px;font-size:13px;color:#666;background:#f0f0f0;cursor:pointer;';
        btnCancel.onclick = function () {
            cleanup();
            // ★ 取消时不保存任何东西，图片不变
        };

        /* 确定 = 保存图片 + 位置 */
        var btnConfirm = document.createElement('div');
        btnConfirm.textContent = '确定';
        btnConfirm.style.cssText = 'padding:8px 24px;border-radius:20px;font-size:13px;color:#fff;background:#333;cursor:pointer;';
        btnConfirm.onclick = function () {
            var pct = maxOffset > 0 ? Math.round((-offsetY / maxOffset) * 100) : 50;
            var posValue = 'center ' + pct + '%';

            // ★ 确定时才更新页面上的图片和保存数据
            var bannerImg = document.getElementById('p3ProfileBanner');
            if (bannerImg) {
                bannerImg.src = imgUrl;
                bannerImg.style.objectPosition = posValue;
            }

            var d = loadP();
            d.banner = imgUrl;
            d.bannerPos = posValue;
            saveP(d);

            cleanup();
            if (typeof showToast === 'function') showToast('背景已更换 ✨');
        };

        btnRow.appendChild(btnCancel);
        btnRow.appendChild(btnConfirm);
        box.appendChild(btnRow);

        /* 预设位置 */
        var presetRow = document.createElement('div');
        presetRow.style.cssText = 'display:flex;gap:6px;margin-top:10px;justify-content:center;';
        [
            { label: '顶部', pct: 0 },
            { label: '中间', pct: 50 },
            { label: '底部', pct: 100 }
        ].forEach(function (p) {
            var btn = document.createElement('div');
            btn.textContent = p.label;
            btn.style.cssText = 'padding:4px 14px;border-radius:12px;font-size:11px;color:#666;background:#f5f5f5;cursor:pointer;';
            btn.onclick = function () {
                offsetY = -(maxOffset * p.pct / 100);
                previewImg.style.top = offsetY + 'px';
            };
            presetRow.appendChild(btn);
        });
        box.appendChild(presetRow);
        ov.appendChild(box);

        ov.addEventListener('click', function (e) {
            if (e.target === ov) cleanup();
        });

        document.body.appendChild(ov);
    }

    /* ===== 上传头像 ===== */
    window.p3PickProfileAvatar = function () {
        pickImg(function (url) {
            var img = document.getElementById('p3ProfileAvatar');
            if (img) img.src = url;
            var d = loadP(); d.avatar = url; saveP(d);
        });
    };

    /* ===== 可编辑文字绑定 ===== */
    function bindEdit(id, key) {
        var el = document.getElementById(id);
        if (!el) return;
        el.dataset.editFixed = '1';

        if (!el.style.minHeight || el.style.minHeight === '0px') {
            el.style.minHeight = '1.2em';
        }
        el.style.minWidth = el.style.minWidth || '2em';
        var cs = window.getComputedStyle(el);
        if (cs.display === 'inline') el.style.display = 'inline-block';

        el.addEventListener('blur', function () {
            var d = loadP();
            var txt = el.textContent.replace(/\u200B/g, '').trim();
            d[key] = txt;
            saveP(d);
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
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
        });
        if (!el.textContent.trim()) {
            el.innerHTML = '\u200B';
        }
    }

    /* ===== 初始化：恢复数据 ===== */
    function initProfile() {
        var d = loadP();
        if (d.banner) {
            var img = document.getElementById('p3ProfileBanner');
            if (img) img.src = d.banner;
        }
        if (d.avatar) {
            var img = document.getElementById('p3ProfileAvatar');
            if (img) img.src = d.avatar;
        }
        if (d.bannerPos) {
            var bannerImg = document.getElementById('p3ProfileBanner');
            if (bannerImg) bannerImg.style.objectPosition = d.bannerPos;
        }

        var profRestore = {
            'p3ProfileName': 'name',
            'p3ProfileHandle': 'handle',
            'p3ProfileBio': 'bio',
            'p3ProfileLoc': 'loc'
        };
        for (var pid in profRestore) {
            var pk = profRestore[pid];
            if (d[pk] !== undefined) {
                var pel = document.getElementById(pid);
                if (pel) pel.textContent = d[pk] || '';
            }
        }

        bindEdit('p3ProfileName', 'name');
        bindEdit('p3ProfileHandle', 'handle');
        bindEdit('p3ProfileBio', 'bio');
        bindEdit('p3ProfileLoc', 'loc');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfile);
    } else {
        initProfile();
    }
})();

/* ========== 小拍立得完整功能（专属独立版） ========== */
(function () {
    window.p3PickTicketImgSm = function () {
        var inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = 'image/*';
        inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(inp);

        inp.addEventListener('change', function () {
            var file = inp.files && inp.files[0];
            try { document.body.removeChild(inp); } catch (e) { }
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (ev) {
                var result = ev.target.result;
                var el = document.getElementById('p3TicketImgSm');
                var hint = document.getElementById('p3TicketImgSmHint');

                if (el) el.src = result;
                if (hint) hint.style.display = 'none';

                try {
                    var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
                    d.ticketImgSm = result;
                    localStorage.setItem('ds_p3_contact', JSON.stringify(d));
                } catch (e) { }
            };
            reader.readAsDataURL(file);
        });

        requestAnimationFrame(function () { inp.click(); });
    };

    function initSm() {
        var el = document.getElementById('p3TicketImgSm');
        var hint = document.getElementById('p3TicketImgSmHint');
        var textEl = document.getElementById('p3TicketTextSm');

        try {
            var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
            if (d.ticketImgSm && el) {
                el.src = d.ticketImgSm;
                if (hint) hint.style.display = 'none';
            }
            if (d.ticketTextSm !== undefined && textEl) {
                textEl.textContent = d.ticketTextSm || '';
            }
        } catch (e) { }

        if (textEl) {
            textEl.dataset.editFixed = '1';
            if (!textEl.style.minHeight || textEl.style.minHeight === '0px') {
                textEl.style.minHeight = '1.2em';
            }
            textEl.style.minWidth = textEl.style.minWidth || '2em';
            var cs = window.getComputedStyle(textEl);
            if (cs.display === 'inline') textEl.style.display = 'inline-block';

            textEl.addEventListener('blur', function () {
                try {
                    var d = JSON.parse(localStorage.getItem('ds_p3_contact') || '{}');
                    d.ticketTextSm = textEl.textContent.replace(/\u200B/g, '').trim();
                    localStorage.setItem('ds_p3_contact', JSON.stringify(d));
                } catch (e) { }
                if (!textEl.textContent.replace(/\u200B/g, '').trim()) {
                    textEl.innerHTML = '\u200B';
                }
            });
            textEl.addEventListener('focus', function () {
                var raw = textEl.textContent;
                if (raw === '\u200B' || raw.replace(/\u200B/g, '').trim() === '') {
                    textEl.textContent = '';
                }
            });
            textEl.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); textEl.blur(); }
            });
            if (!textEl.textContent.trim()) {
                textEl.innerHTML = '\u200B';
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSm);
    } else {
        initSm();
    }
})();
