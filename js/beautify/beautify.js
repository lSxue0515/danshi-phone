/* ============================================
   蛋薯机 DanShu Pro v2 — beautify.js
   聊天美化（CSS气泡主题 + 全局背景）
   ============================================ */

var _bfActiveCssId = '';

/* ========== 打开 / 关闭 ========== */
function openBeautifyPage() {
    var page = document.getElementById('beautifyPage');
    if (!page) return;
    loadBeautifyState();
    renderCssPresetList();
    refreshWallpaperPreviewBf();
    setTimeout(function () { liveUpdateBubblePreview(); }, 100);
    page.classList.add('show');
}

function closeBeautifyPage() {
    var page = document.getElementById('beautifyPage');
    if (page) page.classList.remove('show');
}

/* ========== 本地存储键 ========== */
var BF_KEYS = {
    cssPresets: 'ds_bf_css_presets',
    cssActive: 'ds_bf_css_active',
    wallpaper: 'ds_bf_wallpaper'
};

/* ========== 通用存取 ========== */
function bfGetList(key) {
    try {
        var raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
}

function bfSaveList(key, list) {
    try {
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        showToast('存储空间不足');
    }
}

/* ========== 加载状态 ========== */
function loadBeautifyState() {
    _bfActiveCssId = localStorage.getItem(BF_KEYS.cssActive) || '';

    if (_bfActiveCssId) {
        var cssPresets = bfGetList(BF_KEYS.cssPresets);
        for (var j = 0; j < cssPresets.length; j++) {
            if (cssPresets[j].id === _bfActiveCssId) {
                var el = document.getElementById('bfCssCode');
                if (el) el.value = cssPresets[j].css || '';
                break;
            }
        }
    }

    var wp = localStorage.getItem(BF_KEYS.wallpaper) || '';
    var wpEl = document.getElementById('bfWallpaperUrl');
    if (wpEl) wpEl.value = wp.startsWith('data:') ? '' : wp;
}

/* ================================================
   ======== CSS 气泡主题 ========
   ================================================ */

function injectCustomCss(css) {
    var styleId = 'ds-custom-css-theme';
    var existing = document.getElementById(styleId);
    if (existing) existing.remove();
    if (!css || !css.trim()) return;
    var style = document.createElement('style');
    style.id = styleId;
    style.textContent = css;
    document.head.appendChild(style);
}

var _bfBubblePreviewTimer = null;

function liveUpdateBubblePreview() {
    clearTimeout(_bfBubblePreviewTimer);
    _bfBubblePreviewTimer = setTimeout(function () {
        var codeEl = document.getElementById('bfCssCode');
        var styleEl = document.getElementById('bfBubblePreviewStyle');
        if (!codeEl || !styleEl) return;

        var css = codeEl.value.trim();
        if (!css) {
            styleEl.textContent = '';
            return;
        }

        var scopedCss = scopeCssToPreview(css);
        styleEl.textContent = scopedCss;
    }, 100);
}

function scopeCssToPreview(css) {
    var prefix = '#bfBubblePreviewBox';
    var result = '';
    var depth = 0;
    var buffer = '';
    var i = 0;
    var len = css.length;

    while (i < len) {
        var ch = css.charAt(i);

        if (ch === '/' && i + 1 < len && css.charAt(i + 1) === '*') {
            var endIdx = css.indexOf('*/', i + 2);
            if (endIdx === -1) endIdx = len;
            else endIdx += 2;
            if (depth === 0) {
                result += css.substring(i, endIdx);
            } else {
                buffer += css.substring(i, endIdx);
            }
            i = endIdx;
            continue;
        }

        if (ch === '{') {
            if (depth === 0) {
                var rawSelectors = buffer.split(',');
                var prefixed = [];
                for (var s = 0; s < rawSelectors.length; s++) {
                    var sel = rawSelectors[s].trim();
                    if (!sel) continue;
                    if (sel.charAt(0) === '@') {
                        prefixed.push(sel);
                    } else {
                        // ★ 将聊天页选择器映射为预览区选择器
                        var mappedSel = mapSelectorToPreview(sel);
                        prefixed.push(prefix + ' ' + mappedSel);

                        // ★ 同时保留原始选择器的scoped版本（以防用户用简单选择器）
                        if (mappedSel !== sel) {
                            prefixed.push(prefix + ' ' + sel);
                        }
                    }
                }
                result += prefixed.join(', ') + ' {\n';
                buffer = '';
            } else {
                buffer += ch;
            }
            depth++;
            i++;
            continue;
        }

        if (ch === '}') {
            depth--;
            if (depth <= 0) {
                depth = 0;
                result += buffer + '}\n';
                buffer = '';
            } else {
                buffer += ch;
            }
            i++;
            continue;
        }

        buffer += ch;
        i++;
    }

    if (buffer.trim()) result += buffer;
    return result;
}

/* ★ 将聊天页CSS选择器映射到预览区对应的class */
function mapSelectorToPreview(sel) {
    var mapped = sel;

    // 1. .chat-bubble-row.self ... .chat-bubble → .chat-bubble-self
    mapped = mapped.replace(
        /\.chat-bubble-row\.self\s+(?:\.chat-bubble-content-wrap\s+)?\.chat-bubble\b/g,
        '.chat-bubble-self'
    );

    // 2. .chat-bubble-row:not(.self) ... .chat-bubble → .chat-bubble（char气泡）
    mapped = mapped.replace(
        /\.chat-bubble-row:not\(\.self\)\s+(?:\.chat-bubble-content-wrap\s+)?\.chat-bubble\b/g,
        '.chat-bubble'
    );

    // 3. .chat-bubble-row.self → .beautify-bp-row.beautify-bp-right
    mapped = mapped.replace(/\.chat-bubble-row\.self\b/g, '.beautify-bp-row.beautify-bp-right');

    // 4. .chat-bubble-row → .beautify-bp-row（通用行）
    mapped = mapped.replace(/\.chat-bubble-row\b/g, '.beautify-bp-row');

    // 5. .chat-bubble-content-wrap → 直接移除（预览区没有这层包裹）
    mapped = mapped.replace(/\s*\.chat-bubble-content-wrap\s*/g, ' ');

    // 6. .chat-conv-body → .beautify-bubble-preview-box
    mapped = mapped.replace(/\.chat-conv-body\b/g, '.beautify-bubble-preview-box');

    // 清理多余空格
    mapped = mapped.replace(/\s+/g, ' ').trim();

    return mapped;
}

function previewCssTheme() {
    var css = document.getElementById('bfCssCode').value.trim();
    injectCustomCss(css);
    showToast('已应用到聊天');
}

function saveCssPreset() {
    var css = document.getElementById('bfCssCode').value.trim();
    if (!css) { showToast('请先输入CSS代码'); return; }

    var name = prompt('给这个主题起个名字：', 'CSS主题 ' + (bfGetList(BF_KEYS.cssPresets).length + 1));
    if (!name) return;

    var preset = {
        id: 'css_' + Date.now(),
        name: name,
        css: css,
        time: new Date().toLocaleString()
    };

    var presets = bfGetList(BF_KEYS.cssPresets);
    presets.push(preset);
    bfSaveList(BF_KEYS.cssPresets, presets);

    _bfActiveCssId = preset.id;
    localStorage.setItem(BF_KEYS.cssActive, preset.id);

    injectCustomCss(css);
    renderCssPresetList();
    showToast('主题已保存并应用');
}

function renderCssPresetList() {
    var container = document.getElementById('bfCssPresetList');
    if (!container) return;
    var presets = bfGetList(BF_KEYS.cssPresets);

    if (presets.length === 0) {
        container.innerHTML = '<div class="beautify-preset-empty">暂无主题预设</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < presets.length; i++) {
        var p = presets[i];
        var isActive = p.id === _bfActiveCssId;

        html += '<div class="beautify-preset-card' + (isActive ? ' active' : '') + '" onclick="switchCssPreset(\'' + p.id + '\')">';
        html += '  <div class="beautify-preset-thumb">';
        html += '    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
        html += '  </div>';
        html += '  <div class="beautify-preset-info">';
        html += '    <div class="beautify-preset-name">' + esc(p.name) + '</div>';
        html += '    <div class="beautify-preset-desc">' + (p.css.length) + '字符 · ' + esc(p.time || '') + '</div>';
        html += '  </div>';
        if (isActive) html += '  <div class="beautify-preset-badge">使用中</div>';
        html += '  <div class="beautify-preset-actions">';
        html += '    <div class="beautify-preset-act-btn delete-btn" onclick="event.stopPropagation(); deleteCssPreset(\'' + p.id + '\')" title="删除">';
        html += '      <svg viewBox="0 0 24 24" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    container.innerHTML = html;
}

function switchCssPreset(id) {
    var presets = bfGetList(BF_KEYS.cssPresets);
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) {
            _bfActiveCssId = id;
            localStorage.setItem(BF_KEYS.cssActive, id);
            document.getElementById('bfCssCode').value = presets[i].css;
            liveUpdateBubblePreview();
            injectCustomCss(presets[i].css);
            renderCssPresetList();
            showToast('已切换: ' + presets[i].name);
            return;
        }
    }
}

function deleteCssPreset(id) {
    if (!confirm('确认删除此主题预设？')) return;
    var presets = bfGetList(BF_KEYS.cssPresets);
    var newList = [];
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id !== id) newList.push(presets[i]);
    }
    bfSaveList(BF_KEYS.cssPresets, newList);

    if (_bfActiveCssId === id) {
        _bfActiveCssId = '';
        localStorage.removeItem(BF_KEYS.cssActive);
        injectCustomCss('');
        document.getElementById('bfCssCode').value = '';
        liveUpdateBubblePreview();
    }
    renderCssPresetList();
    showToast('已删除');
}

/* ================================================
   ======== 全局背景 ========
   ================================================ */

function triggerWallpaperUpload() {
    document.getElementById('bfWallpaperFile').click();
}

function handleWallpaperFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    showToast('正在处理背景...');
    var reader = new FileReader();
    reader.onload = function (e) {
        if (typeof smartCompress === 'function') {
            smartCompress(e.target.result, 80, function (compressed) {
                document.getElementById('bfWallpaperUrl').value = compressed;
                refreshWallpaperPreviewBf();
                showToast('背景已加载 (' + Math.round(compressed.length / 1024) + 'KB)');
            });
        } else {
            document.getElementById('bfWallpaperUrl').value = e.target.result;
            refreshWallpaperPreviewBf();
        }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

function refreshWallpaperPreviewBf() {
    var url = document.getElementById('bfWallpaperUrl').value.trim();
    if (!url) url = localStorage.getItem(BF_KEYS.wallpaper) || '';

    var img = document.getElementById('bfWallpaperImg');
    var placeholder = document.getElementById('bfWallpaperPlaceholder');

    if (url) {
        img.src = url;
        img.style.display = 'block';
        if (placeholder) placeholder.style.display = 'none';
    } else {
        img.style.display = 'none';
        if (placeholder) placeholder.style.display = '';
    }
}

function applyWallpaper() {
    var url = document.getElementById('bfWallpaperUrl').value.trim();
    if (!url) { showToast('请先设置背景图片'); return; }

    if (url.startsWith('data:')) {
        if (typeof safeSetItem === 'function') {
            if (!safeSetItem(BF_KEYS.wallpaper, url)) {
                showToast('背景太大无法保存，请使用URL链接');
                return;
            }
        } else {
            try { localStorage.setItem(BF_KEYS.wallpaper, url); }
            catch (e) { showToast('存储空间不足'); return; }
        }
    } else {
        localStorage.setItem(BF_KEYS.wallpaper, url);
    }

    applyChatWallpaper(url);
    refreshWallpaperPreviewBf();
    showToast('聊天背景已应用');
}

function applyChatWallpaper(url) {
    // ★ 壁纸设在 chatAppOverlay 上（整个聊天App可见）
    var overlay = document.getElementById('chatAppOverlay');
    if (overlay) {
        if (url) {
            overlay.style.backgroundImage = 'url(' + url + ')';
            overlay.style.backgroundSize = 'cover';
            overlay.style.backgroundPosition = 'center';
        } else {
            overlay.style.backgroundImage = '';
            overlay.style.backgroundSize = '';
            overlay.style.backgroundPosition = '';
        }
    }
    // ★ 清除上次残留在 chatConversation 上的旧样式（兼容过渡）
    var conv = document.getElementById('chatConversation');
    if (conv) {
        conv.style.backgroundImage = '';
        conv.style.backgroundSize = '';
        conv.style.backgroundPosition = '';
    }
}

/* ================================================
   ======== 恢复默认外观 ========
   ================================================ */
function resetAllBeautify() {
    if (!confirm('确认恢复默认外观？将清除所有聊天美化设置。')) return;

    Object.keys(BF_KEYS).forEach(function (k) {
        localStorage.removeItem(BF_KEYS[k]);
    });

    _bfActiveCssId = '';

    injectCustomCss('');
    applyChatWallpaper('');

    var codeEl = document.getElementById('bfCssCode');
    if (codeEl) codeEl.value = '';
    liveUpdateBubblePreview();
    var wpEl = document.getElementById('bfWallpaperUrl');
    if (wpEl) wpEl.value = '';

    renderCssPresetList();
    refreshWallpaperPreviewBf();

    showToast('已恢复默认外观');
}

/* ================================================
   ======== 页面初始化 ========
   ================================================ */
document.addEventListener('DOMContentLoaded', function () {
    var activeCssId = localStorage.getItem(BF_KEYS.cssActive);
    if (activeCssId) {
        var cssPresets = bfGetList(BF_KEYS.cssPresets);
        for (var i = 0; i < cssPresets.length; i++) {
            if (cssPresets[i].id === activeCssId) {
                _bfActiveCssId = activeCssId;
                injectCustomCss(cssPresets[i].css);
                break;
            }
        }
    }

    var wp = localStorage.getItem(BF_KEYS.wallpaper);
    if (wp) applyChatWallpaper(wp);
});
