/* ============================================
   蛋薯机 DanShu Pro — storage.js
   IndexedDB 大数据存储 + localStorage 减压
   ============================================ */

var _dsDB = null;
var _dsDBReady = false;
var _dsDBQueue = [];
var DS_DB_NAME = 'DanShuProDB';
var DS_DB_VERSION = 1;
var DS_DB_STORE = 'blobs';

// ============ IndexedDB 初始化 ============
(function () {
    if (!window.indexedDB) { console.warn('[storage] IndexedDB not supported'); return; }
    var req = indexedDB.open(DS_DB_NAME, DS_DB_VERSION);
    req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(DS_DB_STORE)) {
            db.createObjectStore(DS_DB_STORE);
        }
    };
    req.onsuccess = function (e) {
        _dsDB = e.target.result;
        _dsDBReady = true;
        // 处理队列
        for (var i = 0; i < _dsDBQueue.length; i++) {
            _dsDBQueue[i]();
        }
        _dsDBQueue = [];
        // 首次迁移
        _dsMigrateFromLocalStorage();
    };
    req.onerror = function () { console.warn('[storage] IndexedDB open failed'); };
})();

// ============ IndexedDB 读写 ============
function dsDBPut(key, value, cb) {
    if (!_dsDBReady) { _dsDBQueue.push(function () { dsDBPut(key, value, cb); }); return; }
    try {
        var tx = _dsDB.transaction(DS_DB_STORE, 'readwrite');
        tx.objectStore(DS_DB_STORE).put(value, key);
        tx.oncomplete = function () { if (cb) cb(true); };
        tx.onerror = function () { if (cb) cb(false); };
    } catch (e) { if (cb) cb(false); }
}

function dsDBGet(key, cb) {
    if (!_dsDBReady) { _dsDBQueue.push(function () { dsDBGet(key, cb); }); return; }
    try {
        var tx = _dsDB.transaction(DS_DB_STORE, 'readonly');
        var req = tx.objectStore(DS_DB_STORE).get(key);
        req.onsuccess = function () { cb(req.result !== undefined ? req.result : null); };
        req.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
}

function dsDBDelete(key, cb) {
    if (!_dsDBReady) { _dsDBQueue.push(function () { dsDBDelete(key, cb); }); return; }
    try {
        var tx = _dsDB.transaction(DS_DB_STORE, 'readwrite');
        tx.objectStore(DS_DB_STORE).delete(key);
        tx.oncomplete = function () { if (cb) cb(true); };
        tx.onerror = function () { if (cb) cb(false); };
    } catch (e) { if (cb) cb(false); }
}

// ============ 安全写入 localStorage（带自动降级） ============
// 这个函数会替换/覆盖 utils.js 里的 safeSetItem
function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (e) {
        // localStorage 满了，尝试清理后重试
        console.warn('[storage] localStorage quota exceeded for key:', key, '- attempting cleanup');
        _dsEmergencyCleanup();
        try {
            localStorage.setItem(key, value);
            return true;
        } catch (e2) {
            // 还是不行，把这个key的数据转到IndexedDB
            console.warn('[storage] Still failed, saving to IndexedDB instead');
            dsDBPut('ls_fallback_' + key, value);
            showToast('存储空间紧张，已自动优化');
            return false;
        }
    }
}

// ============ 紧急清理：把最大的几个key迁移到IndexedDB ============
function _dsEmergencyCleanup() {
    var keysToMigrate = [
        'ds_chat_roles',
        'ds_sticker_groups',
        'ds_chat_stickers',
        'ds_chat_moments',
        'ds_chat_worldbooks',
        'ds_chat_personas'
    ];

    // 找所有壁纸key
    for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf('ds_wp_') === 0) {
            keysToMigrate.push(k);
        }
    }

    // 按大小排序，优先迁移最大的
    var items = [];
    for (var j = 0; j < keysToMigrate.length; j++) {
        var val = localStorage.getItem(keysToMigrate[j]);
        if (val && val.length > 10000) { // >10KB 才迁移
            items.push({ key: keysToMigrate[j], size: val.length });
        }
    }
    items.sort(function (a, b) { return b.size - a.size; });

    // 迁移最大的几个，释放空间
    var freed = 0;
    for (var m = 0; m < items.length && freed < 2 * 1024 * 1024; m++) {
        var val2 = localStorage.getItem(items[m].key);
        if (val2) {
            dsDBPut('ls_fallback_' + items[m].key, val2);
            // 不删除localStorage里的（避免数据丢失），但截断它
            try { localStorage.setItem(items[m].key, '[]'); } catch (e) { }
            freed += items[m].size;
        }
    }
}

// ============ 首次迁移：把图片数据从角色消息中剥离 ============
function _dsMigrateFromLocalStorage() {
    // 检查是否已迁移
    if (localStorage.getItem('ds_storage_migrated') === 'v2') return;

    var changed = false;

    // 1. 迁移聊天消息中的 imageData 到 IndexedDB
    try {
        var rolesStr = localStorage.getItem('ds_chat_roles');
        if (rolesStr && rolesStr.length > 500000) { // >500KB才处理
            var roles = JSON.parse(rolesStr);
            for (var i = 0; i < roles.length; i++) {
                var msgs = roles[i].msgs;
                if (!msgs) continue;
                for (var j = 0; j < msgs.length; j++) {
                    if (msgs[j].imageData && msgs[j].imageData.length > 1000) {
                        var imgKey = 'img_' + roles[i].id + '_' + j + '_' + (msgs[j].ts || j);
                        dsDBPut(imgKey, msgs[j].imageData);
                        msgs[j]._imgKey = imgKey; // 替换为引用
                        delete msgs[j].imageData;  // 删除原始数据
                        changed = true;
                    }
                }
            }
            if (changed) {
                try { localStorage.setItem('ds_chat_roles', JSON.stringify(roles)); } catch (e) { }
            }
        }
    } catch (e) { console.warn('[storage] Migration of chat images failed:', e); }

    // 2. 迁移壁纸
    for (var k = 0; k < localStorage.length; k++) {
        var lk = localStorage.key(k);
        if (lk && lk.indexOf('ds_wp_') === 0) {
            var wpVal = localStorage.getItem(lk);
            if (wpVal && wpVal.length > 50000) {
                dsDBPut(lk, wpVal);
                try { localStorage.removeItem(lk); } catch (e) { }
                changed = true;
            }
        }
    }

    // 3. 迁移动态图片
    try {
        var momStr = localStorage.getItem('ds_chat_moments');
        if (momStr && momStr.length > 200000) {
            var moms = JSON.parse(momStr);
            for (var mi = 0; mi < moms.length; mi++) {
                var imgs = moms[mi].images;
                if (!imgs) continue;
                for (var mj = 0; mj < imgs.length; mj++) {
                    if (imgs[mj] && imgs[mj].length > 5000) {
                        var mImgKey = 'mimg_' + moms[mi].id + '_' + mj;
                        dsDBPut(mImgKey, imgs[mj]);
                        imgs[mj] = '__idb__' + mImgKey; // 标记
                        changed = true;
                    }
                }
            }
            if (changed) {
                try { localStorage.setItem('ds_chat_moments', JSON.stringify(moms)); } catch (e) { }
            }
        }
    } catch (e) { console.warn('[storage] Migration of moments images failed:', e); }

    localStorage.setItem('ds_storage_migrated', 'v2');
    if (changed) console.log('[storage] Migration complete - freed localStorage space');
}

// ============ 读取图片数据（兼容旧数据和IndexedDB） ============
function dsGetImageData(msg, callback) {
    // 新格式：从IndexedDB读
    if (msg._imgKey) {
        dsDBGet(msg._imgKey, function (data) {
            callback(data || '');
        });
        return;
    }
    // 旧格式：直接返回
    callback(msg.imageData || '');
}

// ============ 保存聊天图片到IndexedDB ============
function dsSaveImageMsg(roleId, msg) {
    if (!msg.imageData || msg.imageData.length < 1000) return;
    var imgKey = 'img_' + roleId + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    dsDBPut(imgKey, msg.imageData);
    msg._imgKey = imgKey;
    delete msg.imageData;
}

// ============ 壁纸读写（IndexedDB优先） ============
function dsSaveWallpaper(roleId, dataUrl, callback) {
    var key = 'ds_wp_' + roleId;
    dsDBPut(key, dataUrl, function (ok) {
        // 不再存 localStorage
        try { localStorage.removeItem(key); } catch (e) { }
        if (callback) callback(ok);
    });
}

function dsLoadWallpaper(roleId, callback) {
    var key = 'ds_wp_' + roleId;
    // 先试IndexedDB
    dsDBGet(key, function (data) {
        if (data) { callback(data); return; }
        // 兜底localStorage
        var ls = localStorage.getItem(key);
        callback(ls || '');
    });
}

// ============ 动态图片读取 ============
function dsLoadMomentImage(marker, callback) {
    if (!marker || typeof marker !== 'string') { callback(marker || ''); return; }
    if (marker.indexOf('__idb__') === 0) {
        var imgKey = marker.substring(7);
        dsDBGet(imgKey, function (data) {
            callback(data || '');
        });
        return;
    }
    callback(marker);
}

// ============ 存储用量统计 ============
function dsGetStorageInfo(callback) {
    var lsUsed = 0;
    try {
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            var v = localStorage.getItem(k);
            if (v) lsUsed += k.length + v.length;
        }
    } catch (e) { }

    var info = {
        localStorageUsed: lsUsed,
        localStorageUsedMB: (lsUsed * 2 / 1024 / 1024).toFixed(2), // UTF-16
        localStorageMax: '5-10 MB (mobile)'
    };

    if (_dsDBReady && navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(function (est) {
            info.idbUsed = est.usage || 0;
            info.idbUsedMB = ((est.usage || 0) / 1024 / 1024).toFixed(2);
            info.idbQuota = est.quota || 0;
            info.idbQuotaMB = ((est.quota || 0) / 1024 / 1024).toFixed(0);
            callback(info);
        }).catch(function () { callback(info); });
    } else {
        callback(info);
    }
}

// ============ 手动清理存储 ============
function dsCleanupStorage() {
    if (!confirm('将清理聊天中的旧图片缓存（文字消息不受影响），确认？')) return;

    try {
        var rolesStr = localStorage.getItem('ds_chat_roles');
        if (rolesStr) {
            var roles = JSON.parse(rolesStr);
            var cleaned = 0;
            for (var i = 0; i < roles.length; i++) {
                var msgs = roles[i].msgs;
                if (!msgs) continue;
                for (var j = 0; j < msgs.length; j++) {
                    if (msgs[j].imageData && msgs[j].imageData.length > 1000) {
                        var imgKey = 'img_' + roles[i].id + '_' + j + '_' + (msgs[j].ts || j);
                        dsDBPut(imgKey, msgs[j].imageData);
                        msgs[j]._imgKey = imgKey;
                        delete msgs[j].imageData;
                        cleaned++;
                    }
                }
            }
            if (cleaned > 0) {
                localStorage.setItem('ds_chat_roles', JSON.stringify(roles));
                // 重新加载角色数据
                if (typeof loadChatRoles === 'function') loadChatRoles();
            }
            showToast('已清理 ' + cleaned + ' 张图片缓存');
        }
    } catch (e) {
        showToast('清理失败: ' + e.message);
    }

    // 刷新显示
    if (typeof dsShowStorageInfo === 'function') dsShowStorageInfo();
}

function dsShowStorageInfo() {
    dsGetStorageInfo(function (info) {
        var el = document.getElementById('storageInfoArea');
        if (!el) return;
        var h = '';
        h += '📦 localStorage: <b>' + info.localStorageUsedMB + ' MB</b> / ' + info.localStorageMax + '<br>';
        if (info.idbUsedMB !== undefined) {
            h += '💾 IndexedDB: <b>' + info.idbUsedMB + ' MB</b> / ' + info.idbQuotaMB + ' MB';
        }
        el.innerHTML = h;
    });
}