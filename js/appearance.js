/* ============================================
   蛋薯机 DanShu Pro v2 — appearance.js
   外观设置 — smartCompress + safeSetItem 全链路防爆
   ============================================ */

var ICON_LIST = [
    { id: 'icon_api', name: 'API' },
    { id: 'icon_appear', name: '外观' },
    { id: 'icon_tieba', name: '论坛' },
    { id: 'icon_diary', name: '日记本' },
    { id: 'icon_theater', name: '线下剧场' },
    { id: 'icon_weather', name: '天气' },
    { id: 'icon_music', name: '音乐' },
    { id: 'icon_peek', name: '偷偷看' },
    { id: 'icon_dock_msg', name: '消息' },
    { id: 'icon_dock_note', name: '柿子小说' },
    { id: 'icon_dock_worldbook', name: '世界书' },
    { id: 'icon_game', name: '游戏' },
    { id: 'icon_catnip', name: '猫尾薄荷' },
    { id: 'icon_mood', name: '心绪回响' },
    { id: 'icon_video', name: '视频' }
];

var _editingIconId = null;

/* ========== 打开 / 关闭 ========== */
function openAppearanceApp() {
    var overlay = document.getElementById('appearAppOverlay');
    if (!overlay) return;
    loadAppearanceSettings();
    renderIconGrid();
    overlay.classList.add('show');
}

function closeAppearanceApp() {
    var overlay = document.getElementById('appearAppOverlay');
    if (overlay) overlay.classList.remove('show');
}

/* ========== 读取设置 ========== */
function loadAppearanceSettings() {
    var wpUrl = localStorage.getItem('ds_appear_wallpaper') || '';
    document.getElementById('appearWpUrl').value = wpUrl;
    refreshWallpaperPreview();

    var fontUrl = localStorage.getItem('ds_appear_fontUrl') || '';
    document.getElementById('appearFontUrl').value = fontUrl;

    var bubbleColor = localStorage.getItem('ds_appear_bubbleColor') || 'rgba(80,60,70,0.9)';
    document.getElementById('appearBubbleColorHex').value = bubbleColor;
    if (bubbleColor.startsWith('#')) {
        document.getElementById('appearBubbleColorPicker').value = bubbleColor;
    }
    highlightAppearColorDot(bubbleColor);

    var statusbar = localStorage.getItem('ds_appear_statusbar');
    document.getElementById('appearStatusbarToggle').checked = statusbar !== 'hidden';

    // 加载铃声URL
    var ringtoneUrl = '';
    if (typeof loadRingtoneUrl === 'function') {
        ringtoneUrl = loadRingtoneUrl();
    }
    var ringtoneInput = document.getElementById('appearRingtoneUrl');
    if (ringtoneInput) ringtoneInput.value = ringtoneUrl;

    // ★ 加载图标文字颜色
    var labelColor = localStorage.getItem('ds_appear_labelColor') || '';
    var labelColorHex = document.getElementById('appearLabelColorHex');
    if (labelColorHex) labelColorHex.value = labelColor;
    if (labelColor && labelColor.startsWith('#')) {
        var labelPicker = document.getElementById('appearLabelColorPicker');
        if (labelPicker) labelPicker.value = labelColor;
    }
    highlightLabelColorDot(labelColor);
}

/* ========== 壁纸 ========== */
function refreshWallpaperPreview() {
    var url = document.getElementById('appearWpUrl').value.trim();
    var img = document.getElementById('appearWpPreviewImg');
    if (url) {
        img.src = url;
        img.style.display = 'block';
    } else {
        var wallpaper = document.getElementById('wallpaper');
        var current = getComputedStyle(wallpaper).backgroundImage;
        var match = current.match(/url\(["']?(.+?)["']?\)/);
        if (match && match[1] && match[1] !== 'none') {
            img.src = match[1];
            img.style.display = 'block';
        } else {
            img.style.display = 'none';
        }
    }
}

function triggerAppearWpUpload() {
    document.getElementById('appearWpFile').click();
}

function handleAppearWpFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    showToast('正在处理壁纸...');
    var reader = new FileReader();
    reader.onload = function (e) {
        // ★ 壁纸专用压缩：高画质，存IndexedDB避免爆localStorage
        compressWallpaperHQ(e.target.result, function (compressed) {
            var sizeKB = Math.round(compressed.length / 1024);
            document.getElementById('appearWpUrl').value = compressed;
            refreshWallpaperPreview();
            showToast('壁纸处理完成 (' + sizeKB + 'KB)');
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

/* ========== 自定义图标图片 ========== */
function getIconImage(iconId) {
    return localStorage.getItem('ds_icon_' + iconId) || '';
}

function renderIconGrid() {
    var container = document.getElementById('appearIconGrid');
    var html = '';
    for (var i = 0; i < ICON_LIST.length; i++) {
        var item = ICON_LIST[i];
        var imgSrc = getIconImage(item.id);
        var hasImg = !!imgSrc;

        html += '<div class="appear-icon-item" onclick="triggerIconUpload(\'' + item.id + '\')">';
        html += '  <div class="appear-icon-item-box' + (hasImg ? ' has-custom' : '') + '">';
        if (hasImg) {
            html += '    <img src="' + imgSrc + '" alt="">';
            html += '    <div class="appear-icon-clear" onclick="event.stopPropagation(); clearSingleIcon(\'' + item.id + '\')">';
            html += '      <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
            html += '    </div>';
        } else {
            html += '    <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        }
        html += '  </div>';
        html += '  <div class="appear-icon-item-name">' + item.name + '</div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function triggerIconUpload(iconId) {
    _editingIconId = iconId;
    document.getElementById('iconCustomFile').click();
}

function handleIconCustomFile(event) {
    var file = event.target.files[0];
    if (!file || !_editingIconId) return;

    var iconId = _editingIconId;
    showToast('正在处理图标...');

    var reader = new FileReader();
    reader.onload = function (e) {
        smartCompress(e.target.result, 8, function (compressed) {
            var sizeKB = Math.round(compressed.length / 1024);
            var key = 'ds_icon_' + iconId;

            if (safeSetItem(key, compressed)) {
                applyOneIconImage(iconId, compressed);
                renderIconGrid();
                showToast('图标已更换 (' + sizeKB + 'KB)');
            } else {
                for (var i = 0; i < ICON_LIST.length; i++) {
                    if (ICON_LIST[i].id !== iconId) {
                        localStorage.removeItem('ds_icon_' + ICON_LIST[i].id);
                    }
                }
                var wp = localStorage.getItem('ds_appear_wallpaper');
                if (wp && wp.indexOf('data:image') !== -1) {
                    localStorage.removeItem('ds_appear_wallpaper');
                }

                try {
                    localStorage.setItem(key, compressed);
                    applyOneIconImage(iconId, compressed);
                    renderIconGrid();
                    showToast('图标已更换（已自动清理旧数据）');
                } catch (finalErr) {
                    showToast('存储空间严重不足，建议清除浏览器数据');
                }
            }
            _editingIconId = null;
        });
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function clearSingleIcon(iconId) {
    localStorage.removeItem('ds_icon_' + iconId);
    removeOneIconImage(iconId);
    renderIconGrid();
    showToast('已恢复默认图标');
}

function applyOneIconImage(iconId, imgSrc) {
    var el = document.getElementById(iconId);
    if (!el) return;
    if (!el.getAttribute('data-original-svg')) {
        el.setAttribute('data-original-svg', el.innerHTML);
    }
    el.innerHTML = '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;position:absolute;top:0;left:0;z-index:2;">';
}

function removeOneIconImage(iconId) {
    var el = document.getElementById(iconId);
    if (!el) return;
    var original = el.getAttribute('data-original-svg');
    if (original) {
        el.innerHTML = original;
    }
}

function applyAllIconImages() {
    for (var i = 0; i < ICON_LIST.length; i++) {
        var el = document.getElementById(ICON_LIST[i].id);
        if (el && !el.getAttribute('data-original-svg')) {
            el.setAttribute('data-original-svg', el.innerHTML);
        }
    }
    for (var j = 0; j < ICON_LIST.length; j++) {
        var id = ICON_LIST[j].id;
        var src = getIconImage(id);
        if (src) applyOneIconImage(id, src);
    }
}

/* ========== 气泡字体颜色 ========== */
function pickAppearBubbleColor(el) {
    var color = el.getAttribute('data-color');
    document.getElementById('appearBubbleColorHex').value = color;
    if (color.startsWith('#')) {
        document.getElementById('appearBubbleColorPicker').value = color;
    }
    highlightAppearColorDot(color);
}

function setAppearBubbleFromPicker(val) {
    document.getElementById('appearBubbleColorHex').value = val;
    highlightAppearColorDot(val);
}

function setAppearBubbleFromHex(val) {
    if (val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
        document.getElementById('appearBubbleColorPicker').value = val;
    }
    highlightAppearColorDot(val);
}

function highlightAppearColorDot(color) {
    document.querySelectorAll('.appear-color-dot').forEach(function (d) {
        d.classList.toggle('active', d.getAttribute('data-color') === color);
    });
}

function applyBubbleColor(color) {
    document.querySelectorAll('.bubble-text').forEach(function (el) {
        el.style.color = color;
    });
}

/* ========== ★ 图标文字颜色 ========== */
function pickLabelColor(el) {
    var color = el.getAttribute('data-color');
    var hex = document.getElementById('appearLabelColorHex');
    if (hex) hex.value = color;
    if (color.startsWith('#')) {
        var picker = document.getElementById('appearLabelColorPicker');
        if (picker) picker.value = color;
    }
    highlightLabelColorDot(color);
}

function setLabelColorFromPicker(val) {
    var hex = document.getElementById('appearLabelColorHex');
    if (hex) hex.value = val;
    highlightLabelColorDot(val);
}

function setLabelColorFromHex(val) {
    if (val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
        var picker = document.getElementById('appearLabelColorPicker');
        if (picker) picker.value = val;
    }
    highlightLabelColorDot(val);
}

function highlightLabelColorDot(color) {
    document.querySelectorAll('.appear-label-color-dot').forEach(function (d) {
        d.classList.toggle('active', d.getAttribute('data-color') === color);
    });
}

function applyLabelColor(color) {
    document.querySelectorAll('.app-name').forEach(function (el) {
        el.style.color = color || '';
    });
}

/* ========== 全局字体 ========== */
var _globalFontLoaded = '';
function applyGlobalFont(url) {
    if (!url) {
        document.getElementById('phoneFrame').style.fontFamily = '';
        return;
    }
    if (_globalFontLoaded === url) {
        document.getElementById('phoneFrame').style.fontFamily = '"GlobalCustomFont", sans-serif';
        return;
    }
    var fontFace = new FontFace('GlobalCustomFont', 'url(' + url + ')');
    fontFace.load().then(function (loaded) {
        document.fonts.add(loaded);
        _globalFontLoaded = url;
        document.getElementById('phoneFrame').style.fontFamily = '"GlobalCustomFont", sans-serif';
    }).catch(function () {
        showToast('字体加载失败');
    });
}

/* ========== 顶栏开关 ========== */
function applyStatusbarState(visible) {
    var frame = document.getElementById('phoneFrame');
    if (visible) {
        frame.classList.remove('statusbar-hidden');
    } else {
        frame.classList.add('statusbar-hidden');
    }
}

/* ========== 保存全部外观设置 ========== */
function saveAppearanceSettings() {
    var wpUrl = document.getElementById('appearWpUrl').value.trim();
    var fontUrl = document.getElementById('appearFontUrl').value.trim();
    var bubbleColor = document.getElementById('appearBubbleColorHex').value.trim() || 'rgba(80,60,70,0.9)';
    var statusbar = document.getElementById('appearStatusbarToggle').checked;
    var labelColor = '';
    var labelColorEl = document.getElementById('appearLabelColorHex');
    if (labelColorEl) labelColor = labelColorEl.value.trim();

    if (wpUrl) {
        if (wpUrl.startsWith('data:')) {
            showToast('正在保存壁纸...');
            // ★ 壁纸存IndexedDB，localStorage只存标记
            compressWallpaperHQ(wpUrl, function (compressed) {
                // 尝试存IndexedDB
                _wpSaveToDB(compressed, function (ok) {
                    if (ok) {
                        // localStorage存标记，实际数据在IndexedDB
                        safeSetItem('ds_appear_wallpaper', '__idb_wp__');
                        doFinishAppearSave(compressed, fontUrl, bubbleColor, statusbar, labelColor);
                    } else {
                        // 回退：尝试直接存localStorage
                        if (safeSetItem('ds_appear_wallpaper', compressed)) {
                            doFinishAppearSave(compressed, fontUrl, bubbleColor, statusbar, labelColor);
                        } else {
                            showToast('壁纸太大无法保存，请使用图片URL链接');
                        }
                    }
                });
            });
            return;
        }
        // URL链接直接存
        safeSetItem('ds_appear_wallpaper', wpUrl);
    } else {
        localStorage.removeItem('ds_appear_wallpaper');
    }

    doFinishAppearSave(wpUrl, fontUrl, bubbleColor, statusbar, labelColor);
}

function doFinishAppearSave(wpSrc, fontUrl, bubbleColor, statusbar, labelColor) {
    // 保存铃声
    var ringtoneUrl = document.getElementById('appearRingtoneUrl');
    if (ringtoneUrl && typeof saveRingtoneUrl === 'function') {
        saveRingtoneUrl(ringtoneUrl.value.trim());
    }

    safeSetItem('ds_appear_fontUrl', fontUrl);
    safeSetItem('ds_appear_bubbleColor', bubbleColor);
    safeSetItem('ds_appear_statusbar', statusbar ? 'visible' : 'hidden');

    // ★ 保存图标文字颜色
    if (labelColor) {
        safeSetItem('ds_appear_labelColor', labelColor);
    } else {
        localStorage.removeItem('ds_appear_labelColor');
    }

    // ★ 应用壁纸（wpSrc可能是实际数据或URL）
    var wallpaper = document.getElementById('wallpaper');
    if (wpSrc) {
        wallpaper.style.backgroundImage = 'url(' + wpSrc + ')';
    } else {
        var savedWp = localStorage.getItem('ds_appear_wallpaper');
        if (savedWp && savedWp !== '__idb_wp__') {
            wallpaper.style.backgroundImage = 'url(' + savedWp + ')';
        } else if (!savedWp) {
            wallpaper.style.backgroundImage = '';
        }
    }

    if (fontUrl) { applyGlobalFont(fontUrl); }
    else { document.getElementById('phoneFrame').style.fontFamily = ''; }
    applyBubbleColor(bubbleColor);
    applyLabelColor(labelColor);
    applyStatusbarState(statusbar);

    closeAppearanceApp();
    showToast('外观设置已保存');
}
/* ========== 清除全部外观设置 ========== */
function clearAllAppearSettings() {
    if (!confirm('确认清除所有外观设置？')) return;

    ['ds_appear_wallpaper', 'ds_appear_fontUrl',
        'ds_appear_bubbleColor', 'ds_appear_statusbar'].forEach(function (k) {
            localStorage.removeItem(k);
        });

    // 清除铃声
    if (typeof saveRingtoneUrl === 'function') {
        saveRingtoneUrl('');
    }
    var ringtoneInput = document.getElementById('appearRingtoneUrl');
    if (ringtoneInput) ringtoneInput.value = '';

    for (var i = 0; i < ICON_LIST.length; i++) {
        localStorage.removeItem('ds_icon_' + ICON_LIST[i].id);
        removeOneIconImage(ICON_LIST[i].id);
    }

    document.getElementById('wallpaper').style.backgroundImage = '';
    document.getElementById('phoneFrame').style.fontFamily = '';
    _globalFontLoaded = '';
    document.querySelectorAll('.bubble-text').forEach(function (el) { el.style.color = ''; });
    applyStatusbarState(true);

    document.getElementById('appearWpUrl').value = '';
    document.getElementById('appearFontUrl').value = '';
    document.getElementById('appearBubbleColorHex').value = 'rgba(80,60,70,0.9)';
    document.getElementById('appearBubbleColorPicker').value = '#503c46';
    document.getElementById('appearStatusbarToggle').checked = true;
    highlightAppearColorDot('');
    refreshWallpaperPreview();
    renderIconGrid();

    var usage = getStorageUsage();
    showToast('已清除，当前占用 ' + usage.usedKB + 'KB');
}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', function () {
    var savedWp = localStorage.getItem('ds_appear_wallpaper');
    if (savedWp) {
        if (savedWp === '__idb_wp__') {
            // ★ 从IndexedDB恢复壁纸
            _wpLoadFromDB(function (data) {
                if (data) {
                    document.getElementById('wallpaper').style.backgroundImage = 'url(' + data + ')';
                }
            });
        } else {
            document.getElementById('wallpaper').style.backgroundImage = 'url(' + savedWp + ')';
        }
    }

    var fontUrl = localStorage.getItem('ds_appear_fontUrl');
    if (fontUrl) applyGlobalFont(fontUrl);

    var bubbleColor = localStorage.getItem('ds_appear_bubbleColor');
    if (bubbleColor) applyBubbleColor(bubbleColor);

    var labelColor = localStorage.getItem('ds_appear_labelColor');
    if (labelColor) applyLabelColor(labelColor);

    var statusbar = localStorage.getItem('ds_appear_statusbar');
    if (statusbar === 'hidden') applyStatusbarState(false);

    setTimeout(function () { applyAllIconImages(); }, 100);
});

/* ========== ★ 壁纸高画质压缩 + IndexedDB存储 ========== */

/**
 * 壁纸专用高画质压缩
 * - 最大宽度 1080px（手机足够清晰）
 * - JPEG quality 从 0.92 开始，目标 ≤ 800KB
 * - 比 smartCompress 的 60KB 宽松十几倍，画质清晰
 */
function compressWallpaperHQ(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
        var maxW = 1080, maxH = 1920;
        var w = img.width, h = img.height;
        // 等比缩放
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }

        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // 从高画质开始逐步降低，直到 ≤ 800KB
        var quality = 0.92;
        var result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > 800 * 1024 && quality > 0.3) {
            quality -= 0.08;
            result = canvas.toDataURL('image/jpeg', quality);
        }

        // 如果还是太大，缩小尺寸
        if (result.length > 800 * 1024 && w > 600) {
            var scale = 0.7;
            canvas.width = Math.round(w * scale);
            canvas.height = Math.round(h * scale);
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            result = canvas.toDataURL('image/jpeg', 0.85);
        }

        callback(result);
    };
    img.onerror = function () {
        // 无法作为图片加载，原样返回
        callback(dataUrl);
    };
    img.src = dataUrl;
}

/* --- 壁纸 IndexedDB 存储 --- */
var _wpDBName = 'DanShuWallpaper';
var _wpDBVersion = 1;

function _wpOpenDB(cb) {
    var req = indexedDB.open(_wpDBName, _wpDBVersion);
    req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('wallpaper')) {
            db.createObjectStore('wallpaper', { keyPath: 'id' });
        }
    };
    req.onsuccess = function (e) { cb(e.target.result); };
    req.onerror = function () { cb(null); };
}

function _wpSaveToDB(dataUrl, callback) {
    _wpOpenDB(function (db) {
        if (!db) { callback(false); return; }
        try {
            var tx = db.transaction('wallpaper', 'readwrite');
            var store = tx.objectStore('wallpaper');
            store.put({ id: 'current', data: dataUrl });
            tx.oncomplete = function () { callback(true); };
            tx.onerror = function () { callback(false); };
        } catch (e) { callback(false); }
    });
}

function _wpLoadFromDB(callback) {
    _wpOpenDB(function (db) {
        if (!db) { callback(null); return; }
        try {
            var tx = db.transaction('wallpaper', 'readonly');
            var store = tx.objectStore('wallpaper');
            var req = store.get('current');
            req.onsuccess = function () {
                callback(req.result ? req.result.data : null);
            };
            req.onerror = function () { callback(null); };
        } catch (e) { callback(null); }
    });
}

