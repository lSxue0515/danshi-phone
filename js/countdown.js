/* ============================================
   蛋薯机 DanShu Pro v2 — countdown.js
   纪念日小组件 + 内置设置App
   ★ 修复：图片压缩 + try-catch 防爆存储
   ============================================ */

/* ---------- 主屏幕倒数日更新 ---------- */
function updateCountdown() {
    var dateStr = localStorage.getItem('ds_cd_date') || '2026-02-03';
    var title = localStorage.getItem('ds_cd_title') || '恋爱纪念日';

    var start = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = 0;

    var el1 = document.getElementById('displayDays');
    var el2 = document.getElementById('displayTitle');
    var el3 = document.getElementById('displayDate');
    if (el1) el1.textContent = diff;
    if (el2) el2.textContent = title;
    if (el3) el3.textContent = dateStr;

    applyWidgetStyles();
}

/* ---------- 应用保存的样式到主屏幕 ---------- */
function applyWidgetStyles() {
    var widget = document.getElementById('countdownWidget');
    if (!widget) return;

    var fontColor = localStorage.getItem('ds_cd_fontColor');
    if (fontColor) {
        widget.querySelectorAll('.cd-label, .cd-days-num, .cd-days-unit, .cd-title, .cd-date').forEach(function (el) {
            el.style.color = fontColor;
        });
    }

    var fontUrl = localStorage.getItem('ds_cd_fontUrl');
    if (fontUrl) {
        loadCdFont(fontUrl, widget);
    }

    var bgMode = localStorage.getItem('ds_cd_bgMode') || 'color';
    if (bgMode === 'image') {
        var bgImg = localStorage.getItem('ds_cd_bgImage');
        var bgPosX = localStorage.getItem('ds_cd_bgPosX') || '50';
        var bgPosY = localStorage.getItem('ds_cd_bgPosY') || '50';
        var bgScale = localStorage.getItem('ds_cd_bgScale') || '100';
        if (bgImg) {
            widget.style.backgroundImage = 'url(' + bgImg + ')';
            widget.style.backgroundPosition = bgPosX + '% ' + bgPosY + '%';
            widget.style.backgroundSize = bgScale === '100' ? 'cover' : bgScale + '%';
            widget.style.backgroundColor = '';
        }
    } else {
        var bgColor = localStorage.getItem('ds_cd_bgColor');
        widget.style.backgroundImage = 'none';
        widget.style.backgroundColor = bgColor || 'rgba(255, 255, 255, 0.65)';
    }
}

/* ---------- 加载自定义字体 ---------- */
var _cdFontLoaded = '';
function loadCdFont(url, target) {
    if (!url) return;
    if (_cdFontLoaded === url) {
        if (target) target.style.fontFamily = '"CdCustomFont", sans-serif';
        return;
    }
    var fontFace = new FontFace('CdCustomFont', 'url(' + url + ')');
    fontFace.load().then(function (loaded) {
        document.fonts.add(loaded);
        _cdFontLoaded = url;
        if (target) target.style.fontFamily = '"CdCustomFont", sans-serif';
    }).catch(function () { });
}

/* ---------- ★ 图片压缩（修复版） ---------- */
function compressImage(dataUrl, maxWidth, quality, callback) {
    var img = new Image();
    img.onload = function () {
        var w = img.width;
        var h = img.height;
        if (w > maxWidth) {
            h = Math.round(h * maxWidth / w);
            w = maxWidth;
        }
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = function () {
        // ★ 失败不返回原图，返回1px透明像素防爆
        callback('data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    };
    img.src = dataUrl;
}

/* ---------- ★ 智能多级压缩 ---------- */
function smartCompress(dataUrl, targetKB, callback) {
    var levels = [
        [480, 0.7],
        [320, 0.6],
        [200, 0.5],
        [120, 0.45],
        [80, 0.4],
        [64, 0.35],
        [48, 0.3],
        [32, 0.25]
    ];

    // 原始已经足够小
    if (Math.round(dataUrl.length / 1024) <= targetKB) {
        callback(dataUrl);
        return;
    }

    var index = 0;
    function tryNext() {
        if (index >= levels.length) {
            // 全部试完，用最后一级结果
            compressImage(dataUrl, 32, 0.2, callback);
            return;
        }
        var lv = levels[index];
        compressImage(dataUrl, lv[0], lv[1], function (result) {
            if (Math.round(result.length / 1024) <= targetKB) {
                callback(result);
            } else {
                index++;
                tryNext();
            }
        });
    }
    tryNext();
}

/* ---------- ★ 安全写入 localStorage ---------- */
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        console.warn('localStorage写入失败:', key, e.message);
        return false;
    }
}

/* ---------- 打开纪念日设置App ---------- */
function openCountdownApp() {
    var overlay = document.getElementById('cdAppOverlay');
    if (!overlay) return;

    var title = localStorage.getItem('ds_cd_title') || '恋爱纪念日';
    var dateStr = localStorage.getItem('ds_cd_date') || '2026-02-03';
    document.getElementById('cdInputTitle').value = title;
    document.getElementById('cdInputDate').value = dateStr;

    var fontColor = localStorage.getItem('ds_cd_fontColor') || '#503c46';
    document.getElementById('cdFontColorHex').value = fontColor;
    document.getElementById('cdFontColorPicker').value = fontColor.startsWith('#') ? fontColor : '#503c46';
    highlightActiveDot('.cd-color-dot:not(.cd-bg-dot)', fontColor);

    var fontUrl = localStorage.getItem('ds_cd_fontUrl') || '';
    document.getElementById('cdFontUrl').value = fontUrl;

    var bgMode = localStorage.getItem('ds_cd_bgMode') || 'color';
    switchCdBgMode(bgMode, true);

    var bgColor = localStorage.getItem('ds_cd_bgColor') || 'rgba(255,255,255,0.65)';
    document.getElementById('cdBgColorHex').value = bgColor;

    var bgImg = localStorage.getItem('ds_cd_bgImage') || '';
    document.getElementById('cdBgImageUrl').value = bgImg;

    var posX = localStorage.getItem('ds_cd_bgPosX') || '50';
    var posY = localStorage.getItem('ds_cd_bgPosY') || '50';
    var scale = localStorage.getItem('ds_cd_bgScale') || '100';
    document.getElementById('cdBgPosX').value = posX;
    document.getElementById('cdBgPosY').value = posY;
    document.getElementById('cdBgScale').value = scale;
    document.getElementById('cdBgPosXVal').textContent = posX + '%';
    document.getElementById('cdBgPosYVal').textContent = posY + '%';
    document.getElementById('cdBgScaleVal').textContent = scale + '%';

    refreshPreview();

    if (bgImg) {
        showBgPreview(bgImg, posX, posY, scale);
    }

    overlay.classList.add('show');
}

/* ---------- 关闭 ---------- */
function closeCountdownApp() {
    var overlay = document.getElementById('cdAppOverlay');
    if (overlay) overlay.classList.remove('show');
}

/* ---------- 刷新预览卡片 ---------- */
function refreshPreview() {
    var title = document.getElementById('cdInputTitle').value || '恋爱纪念日';
    var dateStr = document.getElementById('cdInputDate').value || '2026-02-03';

    var start = new Date(dateStr + 'T00:00:00');
    var now = new Date();
    now.setHours(0, 0, 0, 0);
    var diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) diff = 0;

    document.getElementById('cdPreviewDays').textContent = diff;
    document.getElementById('cdPreviewTitle').textContent = title;
    document.getElementById('cdPreviewDate').textContent = dateStr;

    var fontColor = document.getElementById('cdFontColorHex').value || '#503c46';
    var card = document.getElementById('cdPreviewCard');
    card.querySelectorAll('.cd-preview-label, .cd-preview-days, .cd-preview-unit, .cd-preview-title, .cd-preview-date').forEach(function (el) {
        el.style.color = fontColor;
    });

    var bgMode = document.getElementById('cdBgModeImage').classList.contains('active') ? 'image' : 'color';
    if (bgMode === 'image') {
        var bgImg = document.getElementById('cdBgImageUrl').value;
        if (bgImg) {
            var posX = document.getElementById('cdBgPosX').value;
            var posY = document.getElementById('cdBgPosY').value;
            var scale = document.getElementById('cdBgScale').value;
            card.style.backgroundImage = 'url(' + bgImg + ')';
            card.style.backgroundPosition = posX + '% ' + posY + '%';
            card.style.backgroundSize = scale === '100' ? 'cover' : scale + '%';
            card.style.backgroundColor = '';
        }
    } else {
        var bgColor = document.getElementById('cdBgColorHex').value || 'rgba(255,255,255,0.65)';
        card.style.backgroundImage = 'none';
        card.style.backgroundColor = bgColor;
    }

    var fontUrl = document.getElementById('cdFontUrl').value;
    if (fontUrl) {
        loadCdFont(fontUrl, card);
    } else {
        card.style.fontFamily = '';
    }
}

/* ---------- 字体颜色 ---------- */
function pickCdFontColor(el) {
    var color = el.getAttribute('data-color');
    document.getElementById('cdFontColorHex').value = color;
    document.getElementById('cdFontColorPicker').value = color;
    highlightActiveDot('.cd-color-dot:not(.cd-bg-dot)', color);
    refreshPreview();
}

function setCdFontColorFromPicker(val) {
    document.getElementById('cdFontColorHex').value = val;
    highlightActiveDot('.cd-color-dot:not(.cd-bg-dot)', val);
    refreshPreview();
}

function setCdFontColorFromHex(val) {
    if (val.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)) {
        document.getElementById('cdFontColorPicker').value = val;
        highlightActiveDot('.cd-color-dot:not(.cd-bg-dot)', val);
    }
    refreshPreview();
}

function highlightActiveDot(selector, color) {
    document.querySelectorAll(selector).forEach(function (d) {
        if (d.getAttribute('data-color') === color) {
            d.classList.add('active');
        } else {
            d.classList.remove('active');
        }
    });
}

/* ---------- 自定义字体 ---------- */
function previewCdFont(url) {
    if (url.trim()) {
        loadCdFont(url.trim(), document.getElementById('cdPreviewCard'));
    } else {
        document.getElementById('cdPreviewCard').style.fontFamily = '';
    }
    refreshPreview();
}

/* ---------- 背景模式切换 ---------- */
function switchCdBgMode(mode, silent) {
    var btnColor = document.getElementById('cdBgModeColor');
    var btnImage = document.getElementById('cdBgModeImage');
    var panelColor = document.getElementById('cdBgColorPanel');
    var panelImage = document.getElementById('cdBgImagePanel');

    if (mode === 'image') {
        btnColor.classList.remove('active');
        btnImage.classList.add('active');
        panelColor.style.display = 'none';
        panelImage.style.display = 'block';
    } else {
        btnColor.classList.add('active');
        btnImage.classList.remove('active');
        panelColor.style.display = 'block';
        panelImage.style.display = 'none';
    }

    if (!silent) refreshPreview();
}

/* ---------- 背景颜色 ---------- */
function pickCdBgColor(el) {
    var color = el.getAttribute('data-color');
    document.getElementById('cdBgColorHex').value = color;
    highlightActiveDot('.cd-bg-dot', color);
    refreshPreview();
}

function setCdBgColorFromPicker(val) {
    document.getElementById('cdBgColorHex').value = val;
    highlightActiveDot('.cd-bg-dot', val);
    refreshPreview();
}

function setCdBgColorFromHex(val) {
    refreshPreview();
}

/* ---------- 背景图 ---------- */
function previewCdBgImage() {
    var url = document.getElementById('cdBgImageUrl').value.trim();
    if (url) {
        var posX = document.getElementById('cdBgPosX').value;
        var posY = document.getElementById('cdBgPosY').value;
        var scale = document.getElementById('cdBgScale').value;
        showBgPreview(url, posX, posY, scale);
    } else {
        document.getElementById('cdBgPreviewWrap').style.display = 'none';
    }
    refreshPreview();
}

function triggerCdBgUpload() {
    document.getElementById('cdBgFileInput').click();
}

/* ★ 核心修复：上传图片先压缩再使用 */
function handleCdBgFile(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        var rawData = e.target.result;

        // 压缩图片：最大宽度600px，质量0.6（JPEG）
        compressImage(rawData, 600, 0.6, function (compressed) {
            document.getElementById('cdBgImageUrl').value = compressed;
            previewCdBgImage();
        });
    };
    reader.readAsDataURL(file);

    // 清空 file input 以便重复选同一张图
    event.target.value = '';
}

function showBgPreview(url, posX, posY, scale) {
    var wrap = document.getElementById('cdBgPreviewWrap');
    var img = document.getElementById('cdBgPreviewImg');
    img.src = url;
    img.style.objectPosition = posX + '% ' + posY + '%';
    if (scale !== '100') {
        img.style.transform = 'scale(' + (scale / 100) + ')';
    } else {
        img.style.transform = '';
    }
    wrap.style.display = 'block';
}

function updateCdBgPosition() {
    var posX = document.getElementById('cdBgPosX').value;
    var posY = document.getElementById('cdBgPosY').value;
    var scale = document.getElementById('cdBgScale').value;
    document.getElementById('cdBgPosXVal').textContent = posX + '%';
    document.getElementById('cdBgPosYVal').textContent = posY + '%';
    document.getElementById('cdBgScaleVal').textContent = scale + '%';

    var img = document.getElementById('cdBgPreviewImg');
    if (img.src) {
        img.style.objectPosition = posX + '% ' + posY + '%';
        if (scale !== '100') {
            img.style.transform = 'scale(' + (scale / 100) + ')';
        } else {
            img.style.transform = '';
        }
    }

    refreshPreview();
}

/* ---------- ★ 保存（加 try-catch + 图片二次压缩） ---------- */
function saveCountdownSettings() {
    var title = document.getElementById('cdInputTitle').value.trim() || '恋爱纪念日';
    var dateStr = document.getElementById('cdInputDate').value || '2026-02-03';
    var fontColor = document.getElementById('cdFontColorHex').value || '#503c46';
    var fontUrl = document.getElementById('cdFontUrl').value.trim();
    var bgMode = document.getElementById('cdBgModeImage').classList.contains('active') ? 'image' : 'color';
    var bgColor = document.getElementById('cdBgColorHex').value || 'rgba(255,255,255,0.65)';
    var bgImg = document.getElementById('cdBgImageUrl').value.trim();
    var posX = document.getElementById('cdBgPosX').value;
    var posY = document.getElementById('cdBgPosY').value;
    var scale = document.getElementById('cdBgScale').value;

    // 先保存非图片的小数据
    safeSetItem('ds_cd_title', title);
    safeSetItem('ds_cd_date', dateStr);
    safeSetItem('ds_cd_fontColor', fontColor);
    safeSetItem('ds_cd_fontUrl', fontUrl);
    safeSetItem('ds_cd_bgMode', bgMode);
    safeSetItem('ds_cd_bgColor', bgColor);
    safeSetItem('ds_cd_bgPosX', posX);
    safeSetItem('ds_cd_bgPosY', posY);
    safeSetItem('ds_cd_bgScale', scale);

    // 图片数据单独处理
    if (bgMode === 'image' && bgImg) {
        // 如果是 base64 数据（本地上传的），检查大小
        if (bgImg.startsWith('data:')) {
            var sizeKB = Math.round(bgImg.length * 3 / 4 / 1024);

            if (sizeKB > 2500) {
                // 超过 2.5MB，再压缩一次
                compressImage(bgImg, 400, 0.4, function (smaller) {
                    if (!safeSetItem('ds_cd_bgImage', smaller)) {
                        // 还是存不下，最后手段：极限压缩
                        compressImage(bgImg, 300, 0.3, function (tiny) {
                            if (!safeSetItem('ds_cd_bgImage', tiny)) {
                                showToast('⚠️ 图片太大存不下，请用图片URL');
                            }
                            finishSave();
                        });
                        return;
                    }
                    finishSave();
                });
                return; // 异步处理，先 return
            }

            // 大小合理，直接存
            if (!safeSetItem('ds_cd_bgImage', bgImg)) {
                // 直接存失败，压缩后再试
                compressImage(bgImg, 400, 0.4, function (smaller) {
                    if (!safeSetItem('ds_cd_bgImage', smaller)) {
                        showToast('⚠️ 图片太大，请用图片URL代替');
                    }
                    finishSave();
                });
                return;
            }
        } else {
            // 是URL链接，直接存（很小）
            safeSetItem('ds_cd_bgImage', bgImg);
        }
    } else {
        // 不用图片背景，清掉旧图片数据释放空间
        localStorage.removeItem('ds_cd_bgImage');
    }

    finishSave();
}

function finishSave() {
    updateCountdown();
    closeCountdownApp();
    showToast('💕 纪念日设置已保存');
}

/* ---------- 清除所有设置 ---------- */
function clearAllCdSettings() {
    var keys = ['ds_cd_title', 'ds_cd_date', 'ds_cd_fontColor', 'ds_cd_fontUrl',
        'ds_cd_bgMode', 'ds_cd_bgColor', 'ds_cd_bgImage',
        'ds_cd_bgPosX', 'ds_cd_bgPosY', 'ds_cd_bgScale'];
    keys.forEach(function (k) { localStorage.removeItem(k); });

    var widget = document.getElementById('countdownWidget');
    if (widget) {
        widget.style.backgroundImage = 'none';
        widget.style.backgroundColor = 'rgba(255, 255, 255, 0.65)';
        widget.style.fontFamily = '';
        widget.querySelectorAll('.cd-label, .cd-days-num, .cd-days-unit, .cd-title, .cd-date').forEach(function (el) {
            el.style.color = '';
        });
    }

    document.getElementById('cdInputTitle').value = '恋爱纪念日';
    document.getElementById('cdInputDate').value = '2026-02-03';
    document.getElementById('cdFontColorHex').value = '#503c46';
    document.getElementById('cdFontColorPicker').value = '#503c46';
    document.getElementById('cdFontUrl').value = '';
    document.getElementById('cdBgColorHex').value = 'rgba(255,255,255,0.65)';
    document.getElementById('cdBgImageUrl').value = '';
    document.getElementById('cdBgPosX').value = 50;
    document.getElementById('cdBgPosY').value = 50;
    document.getElementById('cdBgScale').value = 100;
    document.getElementById('cdBgPosXVal').textContent = '50%';
    document.getElementById('cdBgPosYVal').textContent = '50%';
    document.getElementById('cdBgScaleVal').textContent = '100%';
    document.getElementById('cdBgPreviewWrap').style.display = 'none';

    switchCdBgMode('color');
    document.querySelectorAll('.cd-color-dot').forEach(function (d) { d.classList.remove('active'); });

    var card = document.getElementById('cdPreviewCard');
    if (card) {
        card.style.backgroundImage = 'none';
        card.style.backgroundColor = 'rgba(255,255,255,0.65)';
        card.style.fontFamily = '';
        card.querySelectorAll('.cd-preview-label, .cd-preview-days, .cd-preview-unit, .cd-preview-title, .cd-preview-date').forEach(function (el) {
            el.style.color = '';
        });
    }

    updateCountdown();
    refreshPreview();
    showToast('🗑️ 已清除所有设置');
}

/* ---------- 初始化 ---------- */
document.addEventListener('DOMContentLoaded', function () {
    updateCountdown();

    var titleInput = document.getElementById('cdInputTitle');
    var dateInput = document.getElementById('cdInputDate');
    if (titleInput) titleInput.addEventListener('input', refreshPreview);
    if (dateInput) dateInput.addEventListener('change', refreshPreview);
});

