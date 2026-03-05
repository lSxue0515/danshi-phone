/* ============================================
   蛋薯机 DanShu Pro v2 — favorite.js
   收藏功能 — 气泡菜单收藏 + "我"页面收藏列表
   ============================================ */

var _chatFavorites = [];
var FAV_KEY = 'ds_chat_favorites';

/* ========== 数据操作 ========== */
function loadFavorites() {
    try { _chatFavorites = JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }
    catch (e) { _chatFavorites = []; }
}

function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(_chatFavorites)); }
    catch (e) { showToast('存储空间不足'); }
}

/* ========== 收藏消息 ========== */
function favoriteMsg(idx) {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var m = role.msgs[idx];
    if (!m) return;

    // 检查是否已收藏（基于角色id + 消息索引 + 时间）
    var dupKey = role.id + '_' + idx + '_' + (m.time || '');
    for (var i = 0; i < _chatFavorites.length; i++) {
        if (_chatFavorites[i]._dupKey === dupKey) {
            showToast('已经收藏过了');
            return;
        }
    }

    // 构建收藏对象 — 深拷贝消息，附带来源信息
    var favItem = {
        id: 'fav_' + Date.now() + Math.random().toString(36).substr(2, 5),
        _dupKey: dupKey,
        roleId: role.id,
        roleName: role.name || '未知角色',
        roleAvatar: role.avatar || '',
        from: m.from,
        text: m.text || '',
        time: m.time || '',
        favTime: new Date().toLocaleString(),
        favTimestamp: Date.now()
    };

    // 各类消息类型的额外字段
    if (m.image) {
        favItem.type = 'image';
        favItem.imageData = m.imageData || '';
    } else if (m.voice) {
        favItem.type = 'voice';
        favItem.voiceDuration = m.voiceDuration || 0;
        favItem.voiceTranscript = m.voiceTranscript || '';
        favItem.voiceData = m.voiceData || '';
    } else if (m.sticker) {
        favItem.type = 'sticker';
        favItem.stickerUrl = m.stickerUrl || '';
        favItem.stickerDesc = m.stickerDesc || '';
    } else if (m.transfer) {
        favItem.type = 'transfer';
        favItem.transferAmount = m.transferAmount || 0;
        favItem.transferRemark = m.transferRemark || '';
        favItem.transferDirection = m.transferDirection || '';
        favItem.transferStatus = m.transferStatus || '';
    } else {
        favItem.type = 'text';
    }

    _chatFavorites.unshift(favItem);
    saveFavorites();
    showToast('已收藏');
}

/* ========== 取消收藏 ========== */
function unfavoriteItem(favId) {
    _chatFavorites = _chatFavorites.filter(function (f) { return f.id !== favId; });
    saveFavorites();
    showToast('已取消收藏');
    closeFavoritePage();
    openFavoritePage();
}

/* ========== 清空全部收藏 ========== */
function clearAllFavorites() {
    if (!confirm('确定清空全部收藏？')) return;
    _chatFavorites = [];
    saveFavorites();
    showToast('已清空');
    closeFavoritePage();
    openFavoritePage();
}

/* ================================================
   ======== 收藏页面（仿钱包页面模式） ========
   ================================================ */

function openFavoritePage() {
    closeFavoritePage();
    loadFavorites();
    var overlay = document.getElementById('chatAppOverlay');
    if (!overlay) return;
    overlay.insertAdjacentHTML('beforeend', buildFavoriteHTML());
}

function closeFavoritePage() {
    var el = document.getElementById('chatFavoriteOverlay');
    if (el) el.remove();
}

function buildFavoriteHTML() {
    var h = '<div class="chat-fav-overlay show" id="chatFavoriteOverlay">';
    h += '<div class="chat-fav-panel">';

    // 顶栏
    h += '<div class="chat-fav-header">';
    h += '<div class="chat-fav-back" onclick="closeFavoritePage()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="chat-fav-title">我的收藏</div>';
    h += '<div class="chat-fav-clear" onclick="clearAllFavorites()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>';
    h += '</div>';

    // 统计栏
    h += '<div class="chat-fav-stats">';
    var textCount = 0, imgCount = 0, voiceCount = 0, stickerCount = 0, transferCount = 0;
    for (var s = 0; s < _chatFavorites.length; s++) {
        var typ = _chatFavorites[s].type;
        if (typ === 'text') textCount++;
        else if (typ === 'image') imgCount++;
        else if (typ === 'voice') voiceCount++;
        else if (typ === 'sticker') stickerCount++;
        else if (typ === 'transfer') transferCount++;
    }
    h += '<div class="chat-fav-stat-item"><div class="chat-fav-stat-num">' + _chatFavorites.length + '</div><div class="chat-fav-stat-label">全部</div></div>';
    h += '<div class="chat-fav-stat-item"><div class="chat-fav-stat-num">' + textCount + '</div><div class="chat-fav-stat-label">文字</div></div>';
    h += '<div class="chat-fav-stat-item"><div class="chat-fav-stat-num">' + imgCount + '</div><div class="chat-fav-stat-label">图片</div></div>';
    h += '<div class="chat-fav-stat-item"><div class="chat-fav-stat-num">' + voiceCount + '</div><div class="chat-fav-stat-label">语音</div></div>';
    h += '<div class="chat-fav-stat-item"><div class="chat-fav-stat-num">' + stickerCount + '</div><div class="chat-fav-stat-label">表情</div></div>';
    h += '</div>';

    // 收藏列表
    h += '<div class="chat-fav-list">';
    if (!_chatFavorites.length) {
        h += '<div class="chat-fav-empty">';
        h += '<svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>';
        h += '<p>暂无收藏<br>长按或点击消息气泡可以收藏</p>';
        h += '</div>';
    } else {
        for (var i = 0; i < _chatFavorites.length; i++) {
            h += buildFavItemHTML(_chatFavorites[i]);
        }
    }
    h += '</div>';

    h += '</div></div>';
    return h;
}

function buildFavItemHTML(fav) {
    var h = '';
    h += '<div class="chat-fav-item">';

    // 来源信息
    h += '<div class="chat-fav-item-source">';
    h += '<div class="chat-fav-item-avatar">';
    if (fav.roleAvatar) {
        h += '<img src="' + fav.roleAvatar + '" alt="">';
    } else {
        h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    }
    h += '</div>';
    h += '<div class="chat-fav-item-info">';
    h += '<div class="chat-fav-item-name">' + esc(fav.roleName) + ' <span class="chat-fav-item-from">' + (fav.from === 'self' ? '· 我发的' : '· 对方发的') + '</span></div>';
    h += '<div class="chat-fav-item-time">收藏于 ' + esc(fav.favTime) + '</div>';
    h += '</div>';
    h += '<div class="chat-fav-item-del" onclick="unfavoriteItem(\'' + fav.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '</div>';
    h += '</div>';

    // 消息内容
    h += '<div class="chat-fav-item-body">';

    if (fav.type === 'text') {
        h += '<div class="chat-fav-item-text">' + esc(fav.text) + '</div>';
    } else if (fav.type === 'image') {
        if (fav.imageData) {
            h += '<div class="chat-fav-item-image"><img src="' + fav.imageData + '" alt="图片"></div>';
        }
        if (fav.text && fav.text !== '[图片]') {
            h += '<div class="chat-fav-item-text">' + esc(fav.text) + '</div>';
        }
    } else if (fav.type === 'voice') {
        h += '<div class="chat-fav-item-voice">';
        h += '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        h += '<span>语音消息 ' + formatFavDuration(fav.voiceDuration || 0) + '</span>';
        h += '</div>';
        if (fav.voiceTranscript) {
            h += '<div class="chat-fav-item-text chat-fav-item-transcript">"' + esc(fav.voiceTranscript) + '"</div>';
        }
    } else if (fav.type === 'sticker') {
        if (fav.stickerUrl) {
            h += '<div class="chat-fav-item-sticker"><img src="' + esc(fav.stickerUrl) + '" alt="' + esc(fav.stickerDesc || '表情包') + '"></div>';
        } else {
            h += '<div class="chat-fav-item-text">[表情包]</div>';
        }
    } else if (fav.type === 'transfer') {
        h += '<div class="chat-fav-item-transfer">';
        h += '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
        h += '<span>转账 ¥' + (fav.transferAmount || 0).toFixed(2) + '</span>';
        if (fav.transferRemark) h += '<span class="chat-fav-transfer-remark"> · ' + esc(fav.transferRemark) + '</span>';
        h += '</div>';
    }

    // 原消息时间
    if (fav.time) {
        h += '<div class="chat-fav-item-orig-time">消息时间 ' + esc(fav.time) + '</div>';
    }

    h += '</div>';
    h += '</div>';
    return h;
}

function formatFavDuration(sec) {
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    if (m > 0) return m + '\'' + (s < 10 ? '0' : '') + s + '"';
    return s + '"';
}
