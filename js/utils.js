/* ============================================
   蛋薯机 DanShu Pro v2 — utils.js
   通用工具函数
   ============================================ */

/* ========== Toast 提示 ========== */
function showToast(msg) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(function () {
        toast.classList.remove('show');
    }, 2000);
}

/* ========== 触发隐藏 file input ========== */
var _currentTarget = '';

function triggerFile(targetId) {
    _currentTarget = targetId;
    document.getElementById('fileInput').click();
}

function handleFileSelect(event) {
    var file = event.target.files[0];
    if (!file || !_currentTarget) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        var targetEl = document.getElementById(_currentTarget);
        if (targetEl) {
            targetEl.src = e.target.result;
        }
        // 保存到 localStorage
        try {
            localStorage.removeItem('ds_img_' + _currentTarget);
            localStorage.setItem('ds_img_' + _currentTarget, e.target.result);
        } catch (err) {
            // 图片太大就压缩后存
            if (typeof smartCompress === 'function') {
                var saveKey = _currentTarget;
                smartCompress(e.target.result, 30, function (compressed) {
                    try {
                        localStorage.removeItem('ds_img_' + saveKey);
                        localStorage.setItem('ds_img_' + saveKey, compressed);
                    } catch (e2) {
                        showToast('图片太大，无法保存');
                    }
                });
            } else {
                showToast('图片太大，无法保存');
            }
        }
        _currentTarget = '';
    };
    reader.readAsDataURL(file);
    event.target.value = '';
}

/* ========== 状态栏时间 ========== */
function updateStatusTime() {
    var now = new Date();
    var h = String(now.getHours()).padStart(2, '0');
    var m = String(now.getMinutes()).padStart(2, '0');
    var el = document.getElementById('statusTime');
    if (el) el.textContent = h + ':' + m;
}

/* ========== localStorage 安全写入（升级版） ========== */

/**
 * ★ 安全写入localStorage
 * - 先删旧值腾空间再写
 * - 失败后自动清理可牺牲的大数据再重试
 */
function safeSetItem(key, value) {
    // 第1步：先删掉同key旧数据腾空间
    try { localStorage.removeItem(key); } catch (e) {}

    // 第2步：尝试写入
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        // 第3步：空间不足 → 自动清理可牺牲的大体积数据
        console.warn('[safeSetItem] 空间不足，尝试清理...', key, '数据大小:', Math.round(value.length / 1024) + 'KB');
        autoFreeSpace();

        // 第4步：清理后重试
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e2) {
            console.error('[safeSetItem] 清理后仍然失败', key);
            return false;
        }
    }
}

/**
 * 自动腾空间：找出localStorage中最大的base64图片数据删掉
 * 优先删可恢复的（壁纸/图标/纪念日背景等图片数据）
 */
function autoFreeSpace() {
    var sacrificeKeys = [];

    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        // 只清理大于5KB且包含base64图片的数据
        if (v && v.length > 5000 && v.indexOf('data:image') !== -1) {
            sacrificeKeys.push({ key: k, size: v.length });
        }
    }

    // 按大小降序排列，先删最大的
    sacrificeKeys.sort(function (a, b) { return b.size - a.size; });

    // 最多删3个最大的
    var deleted = 0;
    for (var j = 0; j < sacrificeKeys.length && deleted < 3; j++) {
        var sk = sacrificeKeys[j].key;
        console.warn('[autoFreeSpace] 删除:', sk, Math.round(sacrificeKeys[j].size / 1024) + 'KB');
        localStorage.removeItem(sk);
        deleted++;
    }

    if (deleted > 0) {
        console.log('[autoFreeSpace] 已清理 ' + deleted + ' 项旧数据');
    }
}

/**
 * 查看当前localStorage使用量
 */
function getStorageUsage() {
    var total = 0;
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        var v = localStorage.getItem(k);
        total += k.length + (v ? v.length : 0);
    }
    return {
        usedKB: Math.round(total / 1024),
        usedMB: (total / 1024 / 1024).toFixed(2)
    };
}

/* ========== 恢复保存的图片 ========== */
function restoreSavedImages() {
    var imageKeys = ['cardImage', 'avatarLeft', 'avatarRight'];
    imageKeys.forEach(function (id) {
        var saved = localStorage.getItem('ds_img_' + id);
        if (saved) {
            var el = document.getElementById(id);
            if (el) el.src = saved;
        }
    });
}

/* ========== contenteditable 文本保存/恢复 ========== */
function setupEditableSave() {
    var editables = ['cardTitle', 'cardText', 'bubbleTextTop', 'bubbleTextBottom'];
    editables.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;

        // 恢复
        var saved = localStorage.getItem('ds_text_' + id);
        if (saved !== null) el.textContent = saved;

        // 监听变化
        el.addEventListener('blur', function () {
            try {
                localStorage.setItem('ds_text_' + id, el.textContent);
            } catch (e) {}
        });
    });
}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', function () {
    updateStatusTime();
    setInterval(updateStatusTime, 15000);
    restoreSavedImages();
    setupEditableSave();
});
