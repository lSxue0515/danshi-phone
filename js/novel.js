/* ============================================
   novel.js — 柿子小说 APP (v4)
   乳白复古INS风 · 单章生成 · 贴人设 · 修复断句
   ============================================ */

/* ===== 状态 ===== */
var _nvTab = 'store';
var _nvModal = '';
var _nvCreateOpen = false;
var _nvReadNovel = null;
var _nvReadChap = 0;
var _nvTocOpen = false;
var _nvGenerating = false;
var _nvGenChapIdx = 0;
var _nvGenNovelId = '';
var _nvComments = JSON.parse(localStorage.getItem('_nvComments') || '{}');
var _nvSharePicker = false;
var _nvShareNovelId = '';
var _nvShareChapIdx = 0;

/* ===== 数据 ===== */
var _nvNovels = JSON.parse(localStorage.getItem('_nvNovels') || '[]');
var _nvProfile = JSON.parse(localStorage.getItem('_nvProfile') || 'null') || {
    avatar: '', banner: '',
    name: '柿子作者', penName: '匿名柿',
    ip: '未知', sig: '用文字编织属于我们的故事'
};
var _nvFavTags = JSON.parse(localStorage.getItem('_nvFavTags') || 'null') || [
    '校园', '甜宠', '古代', '现代', '架空'
];
var _nvCategories = JSON.parse(localStorage.getItem('_nvCategories') || 'null') || [
    '校园', '古代', '架空', '现代', '都市', '奇幻', '末日', '娱乐圈', '电竞', '宫廷', '仙侠', '科幻'
];
var _nvTagPool = JSON.parse(localStorage.getItem('_nvTagPool') || 'null') || [
    '破镜重圆', '狗血', '甜宠', 'ABO', '年上', '年下', '双向暗恋',
    '先婚后爱', 'HE', 'BE', '追妻火葬场', '强制爱', '救赎',
    '青梅竹马', '日久生情', '高岭之花', '双男主', '双女主',
    '悬疑', '权谋', '腹黑', '病娇', '双洁', '1v1', '群像',
    '慢热', '暗恋', '师生', '竹马', '穿越', '重生'
];

var _nvForm = {
    title: '', category: '', tags: [],
    userRole: '', charRole: '',
    synopsis: '', style: '', chapters: 10, cover: ''
};

/* ===== 持久化 ===== */
function _nvSave() {
    try {
        var novelsClean = _nvNovels.map(function (n) {
            var c = Object.assign({}, n);
            if (c.cover && c.cover.length > 500) {
                _nvSaveBlobDB('nvCover_' + c.id, c.cover);
                c.cover = '__idb__';
            }
            return c;
        });
        var profileClean = Object.assign({}, _nvProfile);
        if (profileClean.avatar && profileClean.avatar.length > 500) {
            _nvSaveBlobDB('nvAvatar', profileClean.avatar);
            profileClean.avatar = '__idb__';
        }
        if (profileClean.banner && profileClean.banner.length > 500) {
            _nvSaveBlobDB('nvBanner', profileClean.banner);
            profileClean.banner = '__idb__';
        }
        localStorage.setItem('_nvNovels', JSON.stringify(novelsClean));
        localStorage.setItem('_nvProfile', JSON.stringify(profileClean));
        localStorage.setItem('_nvFavTags', JSON.stringify(_nvFavTags));
        localStorage.setItem('_nvCategories', JSON.stringify(_nvCategories));
        localStorage.setItem('_nvTagPool', JSON.stringify(_nvTagPool));
        localStorage.setItem('_nvComments', JSON.stringify(_nvComments));
    } catch (e) {
        console.warn('Novel save error', e);
        if (typeof showToast === 'function') showToast('存储空间不足');
    }
}

/* ===== IndexedDB ===== */
var _nvBlobDB = null;
function _nvOpenBlobDB(cb) {
    if (_nvBlobDB) { cb(_nvBlobDB); return; }
    try {
        var req = indexedDB.open('NovelBlobDB', 1);
        req.onupgradeneeded = function (e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('blobs'))
                db.createObjectStore('blobs', { keyPath: 'id' });
        };
        req.onsuccess = function (e) { _nvBlobDB = e.target.result; cb(_nvBlobDB); };
        req.onerror = function () { cb(null); };
    } catch (e) { cb(null); }
}
function _nvSaveBlobDB(key, data) {
    _nvOpenBlobDB(function (db) {
        if (!db) return;
        try { db.transaction('blobs', 'readwrite').objectStore('blobs').put({ id: key, data: data }); } catch (e) { }
    });
}
function _nvLoadBlobDB(key, cb) {
    _nvOpenBlobDB(function (db) {
        if (!db) { cb(null); return; }
        try {
            var req = db.transaction('blobs', 'readonly').objectStore('blobs').get(key);
            req.onsuccess = function () { cb(req.result ? req.result.data : null); };
            req.onerror = function () { cb(null); };
        } catch (e) { cb(null); }
    });
}
function _nvRestoreBlobs() {
    var pending = 0, needRender = false;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].cover === '__idb__') {
            pending++;
            (function (idx) {
                _nvLoadBlobDB('nvCover_' + _nvNovels[idx].id, function (d) {
                    if (d) { _nvNovels[idx].cover = d; needRender = true; }
                    if (--pending <= 0 && needRender) _nvRender();
                });
            })(i);
        }
    }
    if (_nvProfile.avatar === '__idb__') {
        pending++;
        _nvLoadBlobDB('nvAvatar', function (d) {
            if (d) { _nvProfile.avatar = d; needRender = true; }
            if (--pending <= 0 && needRender) _nvRender();
        });
    }
    if (_nvProfile.banner === '__idb__') {
        pending++;
        _nvLoadBlobDB('nvBanner', function (d) {
            if (d) { _nvProfile.banner = d; needRender = true; }
            if (--pending <= 0 && needRender) _nvRender();
        });
    }
}

/* ===== 工具 ===== */
function _nvEsc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function _nvId() { return 'nv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6); }

/* ===== 确保聊天数据已加载 ===== */
function _nvEnsureChatLoaded() {
    if (typeof loadChatRoles === 'function') {
        try { loadChatRoles(); } catch (e) { }
    }
}

/* ===== 读取 Char 角色列表 ===== */
function _nvGetChatRoles() {
    _nvEnsureChatLoaded();
    var source = [];
    if (typeof _chatRoles !== 'undefined' && Array.isArray(_chatRoles) && _chatRoles.length > 0) {
        source = _chatRoles;
    }
    if (source.length === 0) {
        try { source = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]'); } catch (e) { }
    }
    var roles = [];
    for (var i = 0; i < source.length; i++) {
        var r = source[i];
        roles.push({
            id: r.id || ('r' + i),
            name: r.name || ('角色' + (i + 1)),
            avatar: r.avatar || '',
            detail: r.detail || r.desc || r.systemPrompt || ''
        });
    }
    return roles;
}

/* ===== 读取 User 人设列表 ===== */
function _nvGetUserPersonas() {
    _nvEnsureChatLoaded();
    var source = [];
    if (typeof _chatPersonas !== 'undefined' && Array.isArray(_chatPersonas) && _chatPersonas.length > 0) {
        source = _chatPersonas;
    }
    if (source.length === 0) {
        try { source = JSON.parse(localStorage.getItem('ds_chat_personas') || '[]'); } catch (e) { }
    }
    var personas = [];
    for (var i = 0; i < source.length; i++) {
        var p = source[i];
        personas.push({
            id: p.id || ('p' + i),
            name: p.name || ('User ' + (i + 1)),
            avatar: p.avatar || '',
            detail: p.detail || p.desc || p.content || ''
        });
    }
    return personas;
}

/* ===== API 配置 ===== */
function _nvGetApiConfig() {
    var url = '', key = '', model = '';
    var elUrl = document.getElementById('apiUrl');
    var elKey = document.getElementById('apiKey');
    var elModel = document.getElementById('apiModelSelect');
    if (elUrl) url = elUrl.value;
    if (elKey) key = elKey.value;
    if (elModel) model = elModel.value;
    if (!url) try { url = localStorage.getItem('apiUrl') || ''; } catch (e) { }
    if (!key) try { key = localStorage.getItem('apiKey') || ''; } catch (e) { }
    if (!model) try { model = localStorage.getItem('apiModel') || ''; } catch (e) { }
    return { url: url, key: key, model: model };
}

/* ===== 打开/关闭 ===== */
function openNovelApp() {
    var el = document.getElementById('novelOverlay');
    if (!el) return;
    _nvRender();
    el.classList.add('show');
    _nvRestoreBlobs();
}
function _nvClose() {
    var el = document.getElementById('novelOverlay');
    if (el) el.classList.remove('show');
}
function _nvSwitchTab(t) { _nvTab = t; _nvRender(); }

/* 实时更新开始按钮状态 */
function _nvUpdateStartBtn() {
    var btn = document.getElementById('nvStartBtn');
    if (!btn) return;
    if (_nvForm.title && _nvForm.category && _nvForm.synopsis && !_nvGenerating) {
        btn.classList.remove('disabled');
    } else {
        btn.classList.add('disabled');
    }
}

/* ===== 主渲染 ===== */
function _nvRender() {
    var el = document.getElementById('novelOverlay');
    if (!el) return;
    var h = '';

    h += '<div class="nv-header">';
    h += '<div class="nv-back" onclick="_nvClose()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="nv-header-title">柿子小说</div>';
    h += '<div class="nv-header-spacer"></div></div>';

    h += '<div class="nv-body">';
    if (_nvTab === 'store') h += _nvRenderStore();
    else if (_nvTab === 'shelf') h += _nvRenderShelf();
    else if (_nvTab === 'me') h += _nvRenderMe();
    h += '</div>';

    h += '<div class="nv-dock">';
    h += '<div class="nv-dock-item' + (_nvTab === 'store' ? ' active' : '') + '" onclick="_nvSwitchTab(\'store\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>';
    h += '<span class="nv-dock-label">书城</span></div>';

    h += '<div class="nv-dock-item' + (_nvTab === 'shelf' ? ' active' : '') + '" onclick="_nvSwitchTab(\'shelf\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>';
    h += '<span class="nv-dock-label">书架</span></div>';

    h += '<div class="nv-dock-item' + (_nvTab === 'me' ? ' active' : '') + '" onclick="_nvSwitchTab(\'me\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '<span class="nv-dock-label">我</span></div>';
    h += '</div>';

    if (_nvCreateOpen) h += _nvRenderCreate();
    if (_nvReadNovel) h += _nvRenderRead();
    if (_nvModal) h += _nvRenderModal();
    if (_nvSharePicker) h += _nvRenderSharePicker();
    el.innerHTML = h;

    el.innerHTML = h;
}

/* ===== 书城 ===== */
function _nvRenderStore() {
    var h = '';
    h += '<div class="nv-store-banner"><div class="nv-store-banner-title">柿子小说</div>';
    h += '<div class="nv-store-banner-sub">写你自己的故事</div></div>';

    h += '<div class="nv-store-sec-title">最新作品</div>';
    h += '<div class="nv-store-grid">';
    var shown = _nvNovels.slice().reverse().slice(0, 6);
    if (!shown.length) {
        h += '<div style="grid-column:1/-1;text-align:center;padding:30px 0;color:#c4b9a8;font-size:12px">还没有作品，去创作吧</div>';
    }
    for (var i = 0; i < shown.length; i++) {
        var n = shown[i];
        h += '<div class="nv-store-card" onclick="_nvOpenRead(\'' + n.id + '\')">';
        h += '<div class="nv-store-cover">';
        if (n.cover && n.cover !== '__idb__') h += '<img src="' + _nvEsc(n.cover) + '">';
        else h += 'NOVEL';
        h += '</div>';
        h += '<div class="nv-store-info"><div class="nv-store-name">' + _nvEsc(n.title) + '</div>';
        h += '<div class="nv-store-author">' + _nvEsc(n.penName || _nvProfile.penName) + '</div>';
        h += '<div class="nv-store-tags">';
        var tags = (n.tags || []).slice(0, 3);
        for (var t = 0; t < tags.length; t++) h += '<span class="nv-store-tag">' + _nvEsc(tags[t]) + '</span>';
        h += '</div></div></div>';
    }
    h += '</div>';

    h += '<div class="nv-store-sec-title">热门分类</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 20px">';
    for (var c = 0; c < _nvCategories.length; c++) {
        h += '<div class="nv-fav-tag" style="font-size:11px">' + _nvEsc(_nvCategories[c]) + '</div>';
    }
    h += '</div>';
    return h;
}

/* ===== 书架 ===== */
function _nvRenderShelf() {
    var h = '';
    if (!_nvNovels.length) {
        h += '<div class="nv-shelf-empty">';
        h += '<div style="width:60px;height:80px;border-radius:8px;background:#e8e0d2;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;color:#b0a48e;font-size:20px;font-weight:800">N</div>';
        h += '<p>书架空空如也</p><p style="font-size:11px;color:#c4b9a8;margin-top:4px">去创建小说开始码字吧</p></div>';
        return h;
    }
    h += '<div class="nv-shelf-list">';
    for (var i = 0; i < _nvNovels.length; i++) {
        var n = _nvNovels[i];
        var genCount = 0;
        if (n.chapters) { for (var ci = 0; ci < n.chapters.length; ci++) { if (n.chapters[ci].content) genCount++; } }
        h += '<div class="nv-shelf-card" onclick="_nvOpenRead(\'' + n.id + '\')">';
        h += '<div class="nv-shelf-cover">';
        if (n.cover && n.cover !== '__idb__') h += '<img src="' + _nvEsc(n.cover) + '">';
        else h += 'N';
        h += '</div>';
        h += '<div class="nv-shelf-info">';
        h += '<div class="nv-shelf-name">' + _nvEsc(n.title) + '</div>';
        h += '<div class="nv-shelf-author">' + _nvEsc(n.penName || _nvProfile.penName) + '</div>';
        h += '<div class="nv-shelf-meta">' + _nvEsc(n.category) + ' / ' + (n.totalChapters || 0) + ' 章</div>';
        h += '<div class="nv-shelf-tags">';
        for (var t = 0; t < Math.min(5, (n.tags || []).length); t++) h += '<span class="nv-shelf-tag">' + _nvEsc(n.tags[t]) + '</span>';
        h += '</div>';
        h += '<div class="nv-shelf-progress">' + genCount + ' / ' + (n.totalChapters || 0) + ' 已完成</div>';
        h += '</div>';
        h += '<div class="nv-shelf-del" onclick="event.stopPropagation();_nvDeleteNovel(\'' + n.id + '\')"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
        h += '</div>';
    }
    h += '</div>';
    return h;
}

/* ===== 我 ===== */
function _nvRenderMe() {
    var h = '';
    var p = _nvProfile;
    var totalWords = 0;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].chapters) {
            for (var ci = 0; ci < _nvNovels[i].chapters.length; ci++) {
                totalWords += (_nvNovels[i].chapters[ci].content || '').length;
            }
        }
    }

    h += '<div class="nv-me-banner" onclick="_nvPickImage(\'banner\')">';
    if (p.banner && p.banner !== '__idb__') h += '<img src="' + _nvEsc(p.banner) + '">';
    h += '<div class="nv-me-banner-hint">点击更换背景</div></div>';

    h += '<div class="nv-me-avatar-wrap"><div class="nv-me-avatar" onclick="_nvPickImage(\'avatar\')">';
    if (p.avatar && p.avatar !== '__idb__') h += '<img src="' + _nvEsc(p.avatar) + '">';
    h += '</div></div>';

    h += '<div class="nv-me-info">';
    h += '<div class="nv-me-name">' + _nvEsc(p.name) + '</div>';
    h += '<div class="nv-me-penname">笔名: ' + _nvEsc(p.penName) + '</div>';
    h += '</div>';

    h += '<div class="nv-me-stats">';
    h += '<div class="nv-me-stat-item"><div class="nv-me-stat-num">' + _nvNovels.length + '</div><div class="nv-me-stat-label">作品</div></div>';
    h += '<div class="nv-me-stat-item"><div class="nv-me-stat-num">' + (totalWords > 10000 ? (totalWords / 10000).toFixed(1) + 'w' : totalWords) + '</div><div class="nv-me-stat-label">码字</div></div>';
    h += '</div>';

    h += '<div class="nv-me-ip">IP属地: ' + _nvEsc(p.ip) + '</div>';
    h += '<div class="nv-me-sig">' + _nvEsc(p.sig) + '</div>';

    h += '<div class="nv-me-edit-btn"><div onclick="_nvModal=\'editProfile\';_nvRender()">编辑资料</div></div>';

    h += '<div class="nv-me-section-card">';
    h += '<div class="nv-me-sec-title">写过的小说</div>';
    h += '<div class="nv-polaroid-grid">';
    for (var i = 0; i < _nvNovels.length; i++) {
        var n = _nvNovels[i];
        h += '<div class="nv-polaroid" onclick="_nvOpenRead(\'' + n.id + '\')">';
        h += '<div class="nv-polaroid-img">';
        if (n.cover && n.cover !== '__idb__') h += '<img src="' + _nvEsc(n.cover) + '">';
        else h += 'N';
        h += '</div>';
        h += '<div class="nv-polaroid-caption">' + _nvEsc(n.title) + '</div>';
        h += '<div class="nv-polaroid-sub">' + _nvEsc(n.category) + ' / ' + (n.totalChapters || 0) + '章</div>';
        h += '</div>';
    }
    h += '<div class="nv-polaroid-add" onclick="_nvOpenCreate()">';
    h += '<div class="nv-polaroid-add-inner"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    h += '<p>新建小说</p></div></div>';
    h += '</div></div>';

    h += '<div class="nv-me-section-card">';
    h += '<div class="nv-me-sec-title">喜欢的类型</div>';
    h += '<div class="nv-fav-tags">';
    for (var f = 0; f < _nvFavTags.length; f++) {
        h += '<div class="nv-fav-tag selected" onclick="_nvRemoveFavTag(' + f + ')">' + _nvEsc(_nvFavTags[f]) + '<span class="nv-fav-tag-del">x</span></div>';
    }
    h += '<div class="nv-fav-tag-add" onclick="_nvAddFavTag()">+ 添加</div>';
    h += '</div></div>';

    h += '<div class="nv-me-bottom-spacer"></div>';
    return h;
}

/* ===== 弹窗 ===== */
function _nvRenderModal() {
    if (_nvModal === 'editProfile') return _nvRenderEditProfile();
    if (_nvModal === 'editNovel') return _nvRenderEditNovel();
    return '';
}
function _nvRenderEditProfile() {
    var p = _nvProfile;
    var h = '<div class="nv-modal-overlay show" onclick="_nvModal=\'\';_nvRender()">';
    h += '<div class="nv-modal" onclick="event.stopPropagation()">';
    h += '<div class="nv-modal-header"><div class="nv-modal-title">编辑资料</div>';
    h += '<div class="nv-modal-close" onclick="_nvModal=\'\';_nvRender()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    h += '<div class="nv-modal-body">';
    h += '<div class="nv-field"><div class="nv-field-label">昵称</div>';
    h += '<input class="nv-field-input" id="nvEditName" value="' + _nvEsc(p.name) + '" placeholder="你的昵称"></div>';
    h += '<div class="nv-field"><div class="nv-field-label">笔名</div>';
    h += '<input class="nv-field-input" id="nvEditPenName" value="' + _nvEsc(p.penName) + '" placeholder="写小说时显示的笔名"></div>';
    h += '<div class="nv-field"><div class="nv-field-label">IP属地</div>';
    h += '<input class="nv-field-input" id="nvEditIP" value="' + _nvEsc(p.ip) + '" placeholder="例如: 北京"></div>';
    h += '<div class="nv-field"><div class="nv-field-label">文案</div>';
    h += '<textarea class="nv-field-textarea" id="nvEditSig" placeholder="个性签名">' + _nvEsc(p.sig) + '</textarea></div>';
    h += '<div class="nv-modal-save" onclick="_nvSaveProfile()">保存</div>';
    h += '</div></div></div>';
    return h;
}
function _nvSaveProfile() {
    var n = document.getElementById('nvEditName');
    var pn = document.getElementById('nvEditPenName');
    var ip = document.getElementById('nvEditIP');
    var sig = document.getElementById('nvEditSig');
    if (n) _nvProfile.name = n.value.trim() || '柿子作者';
    if (pn) _nvProfile.penName = pn.value.trim() || '匿名柿';
    if (ip) _nvProfile.ip = ip.value.trim() || '未知';
    if (sig) _nvProfile.sig = sig.value.trim() || '';
    _nvModal = '';
    _nvSave(); _nvRender();
    if (typeof showToast === 'function') showToast('已保存');
}

/* ===== 图片选择 ===== */
function _nvPickImage(type) {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            if (type === 'avatar') _nvProfile.avatar = e.target.result;
            else if (type === 'banner') _nvProfile.banner = e.target.result;
            _nvSave(); _nvRender();
        };
        reader.readAsDataURL(input.files[0]);
    };
    input.click();
}
function _nvPickNovelCover(novelId) {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            for (var i = 0; i < _nvNovels.length; i++) {
                if (_nvNovels[i].id === novelId) { _nvNovels[i].cover = e.target.result; break; }
            }
            _nvSave(); _nvRender();
        };
        reader.readAsDataURL(input.files[0]);
    };
    input.click();
}

/* ===== 喜欢的类型 ===== */
function _nvRemoveFavTag(idx) { _nvFavTags.splice(idx, 1); _nvSave(); _nvRender(); }
function _nvAddFavTag() {
    var tag = prompt('输入喜欢的类型:');
    if (tag && tag.trim()) { _nvFavTags.push(tag.trim()); _nvSave(); _nvRender(); }
}

/* ===== 删除小说 ===== */
function _nvDeleteNovel(id) {
    if (!confirm('确定删除这本小说吗？')) return;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === id) { _nvNovels.splice(i, 1); break; }
    }
    _nvReadNovel = null;
    _nvSave(); _nvRender();
    if (typeof showToast === 'function') showToast('已删除');
}

/* ===== 创建小说 ===== */
function _nvOpenCreate() {
    _nvForm = { title: '', category: '', tags: [], userRole: '', charRole: '', synopsis: '', style: '', chapters: 10, cover: '' };
    _nvCreateOpen = true;
    _nvRender();
}

function _nvRenderCreate() {
    var h = '<div class="nv-create-overlay show">';
    h += '<div class="nv-header">';
    h += '<div class="nv-back" onclick="_nvCreateOpen=false;_nvRender()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="nv-header-title">创建小说</div>';
    h += '<div class="nv-header-spacer"></div></div>';

    h += '<div class="nv-create-body">';

    h += '<div class="nv-field"><div class="nv-field-label">书名</div>';
    h += '<input class="nv-field-input" id="nvCrTitle" value="' + _nvEsc(_nvForm.title) + '" placeholder="给你的小说取个名字" oninput="_nvForm.title=this.value;_nvUpdateStartBtn()"></div>';

    h += '<div class="nv-field"><div class="nv-field-label">分类</div>';
    h += '<div class="nv-tag-picker">';
    for (var c = 0; c < _nvCategories.length; c++) {
        h += '<div class="nv-tag-opt' + (_nvForm.category === _nvCategories[c] ? ' selected' : '') + '" onclick="_nvForm.category=\'' + _nvEsc(_nvCategories[c]) + '\';_nvRender()">' + _nvEsc(_nvCategories[c]) + '</div>';
    }
    h += '<div class="nv-tag-add-btn" onclick="_nvAddCategory()">+ 自定义</div>';
    h += '</div></div>';

    h += '<div class="nv-field"><div class="nv-field-label">标签 (' + _nvForm.tags.length + '/7)</div>';
    h += '<div class="nv-tag-picker">';
    for (var t = 0; t < _nvTagPool.length; t++) {
        var sel = _nvForm.tags.indexOf(_nvTagPool[t]) >= 0;
        h += '<div class="nv-tag-opt' + (sel ? ' selected' : '') + '" onclick="_nvToggleTag(\'' + _nvEsc(_nvTagPool[t]) + '\')">' + _nvEsc(_nvTagPool[t]) + '</div>';
    }
    h += '<div class="nv-tag-add-btn" onclick="_nvAddCustomTag()">+ 自定义</div>';
    h += '</div></div>';

    h += '<div class="nv-field"><div class="nv-field-label">主角 - User人设</div>';
    h += '<div class="nv-role-pick">';
    var personas = _nvGetUserPersonas();
    if (!personas.length) {
        h += '<div style="font-size:11px;color:#c4b9a8">暂无User人设，请先在聊天APP中创建</div>';
    }
    for (var pi = 0; pi < personas.length; pi++) {
        var pSel = _nvForm.userRole === personas[pi].id;
        h += '<div class="nv-role-opt' + (pSel ? ' selected' : '') + '" onclick="_nvForm.userRole=\'' + personas[pi].id + '\';_nvRender()">';
        h += '<div class="nv-role-avatar">';
        if (personas[pi].avatar) h += '<img src="' + _nvEsc(personas[pi].avatar) + '">';
        h += '</div>';
        h += _nvEsc(personas[pi].name) + '</div>';
    }
    h += '</div></div>';

    h += '<div class="nv-field"><div class="nv-field-label">主角 - Char角色</div>';
    h += '<div class="nv-role-pick">';
    var roles = _nvGetChatRoles();
    if (!roles.length) {
        h += '<div style="font-size:11px;color:#c4b9a8">暂无角色，请先在聊天APP中创建</div>';
    }
    for (var ri = 0; ri < roles.length; ri++) {
        var rSel = _nvForm.charRole === roles[ri].id;
        h += '<div class="nv-role-opt' + (rSel ? ' selected' : '') + '" onclick="_nvForm.charRole=\'' + roles[ri].id + '\';_nvRender()">';
        h += '<div class="nv-role-avatar">';
        if (roles[ri].avatar) h += '<img src="' + _nvEsc(roles[ri].avatar) + '">';
        h += '</div>';
        h += _nvEsc(roles[ri].name) + '</div>';
    }
    h += '</div></div>';

    h += '<div class="nv-field"><div class="nv-field-label">故事走向</div>';
    h += '<textarea class="nv-field-textarea" id="nvCrSynopsis" placeholder="描述你想要的故事走向，例如：两人从相遇到误会到和好..." oninput="_nvForm.synopsis=this.value;_nvUpdateStartBtn()" style="min-height:100px">' + _nvEsc(_nvForm.synopsis) + '</textarea></div>';

    h += '<div class="nv-field"><div class="nv-field-label">文风（选填）</div>';
    h += '<textarea class="nv-field-textarea" id="nvCrStyle" placeholder="例如: 沉郁内敛、细腻温柔、犀利幽默..." oninput="_nvForm.style=this.value" style="min-height:60px">' + _nvEsc(_nvForm.style) + '</textarea></div>';

    h += '<div class="nv-field"><div class="nv-field-label">预计章节</div>';
    h += '<div class="nv-chapter-slider">';
    h += '<input type="range" min="3" max="30" value="' + _nvForm.chapters + '" oninput="_nvForm.chapters=parseInt(this.value);document.getElementById(\'nvChapNum\').textContent=this.value">';
    h += '<div class="nv-chapter-num" id="nvChapNum">' + _nvForm.chapters + '</div>';
    h += '<span style="font-size:11px;color:#b0a48e">章</span>';
    h += '</div></div>';

    h += '<div class="nv-create-start" id="nvStartBtn" onclick="_nvStartGenerate()">开始码字</div>';

    h += '</div></div>';
    return h;
}

/* 自定义分类 */
function _nvAddCategory() {
    var cat = prompt('输入新分类:');
    if (cat && cat.trim()) {
        cat = cat.trim();
        if (_nvCategories.indexOf(cat) < 0) { _nvCategories.push(cat); _nvSave(); }
        _nvForm.category = cat;
        _nvRender();
    }
}

/* 自定义标签 */
function _nvAddCustomTag() {
    if (_nvForm.tags.length >= 7) {
        if (typeof showToast === 'function') showToast('最多选7个标签');
        return;
    }
    var tag = prompt('输入新标签:');
    if (tag && tag.trim()) {
        tag = tag.trim();
        if (_nvTagPool.indexOf(tag) < 0) { _nvTagPool.push(tag); _nvSave(); }
        if (_nvForm.tags.indexOf(tag) < 0) _nvForm.tags.push(tag);
        _nvRender();
    }
}

function _nvToggleTag(tag) {
    var idx = _nvForm.tags.indexOf(tag);
    if (idx >= 0) { _nvForm.tags.splice(idx, 1); }
    else {
        if (_nvForm.tags.length >= 7) {
            if (typeof showToast === 'function') showToast('最多选7个标签');
            return;
        }
        _nvForm.tags.push(tag);
    }
    _nvRender();
}

/* ===== 开始生成（只生成第1章） ===== */
function _nvStartGenerate() {
    if (_nvGenerating) {
        if (typeof showToast === 'function') showToast('正在生成中，请等待');
        return;
    }
    var titleEl = document.getElementById('nvCrTitle');
    var synopsisEl = document.getElementById('nvCrSynopsis');
    var styleEl = document.getElementById('nvCrStyle');
    if (titleEl) _nvForm.title = titleEl.value;
    if (synopsisEl) _nvForm.synopsis = synopsisEl.value;
    if (styleEl) _nvForm.style = styleEl.value;

    if (!_nvForm.title.trim()) { if (typeof showToast === 'function') showToast('请填写书名'); return; }
    if (!_nvForm.category) { if (typeof showToast === 'function') showToast('请选择分类'); return; }
    if (!_nvForm.synopsis.trim()) { if (typeof showToast === 'function') showToast('请填写故事走向'); return; }
    var api = _nvGetApiConfig();
    if (!api.url || !api.key) { if (typeof showToast === 'function') showToast('请先在设置中配置API'); return; }

    var userInfo = '';
    if (_nvForm.userRole) {
        var personas = _nvGetUserPersonas();
        for (var i = 0; i < personas.length; i++) {
            if (personas[i].id === _nvForm.userRole) {
                userInfo = '【' + personas[i].name + '】\n' + personas[i].detail;
                break;
            }
        }
    }
    var charInfo = '';
    if (_nvForm.charRole) {
        var roles = _nvGetChatRoles();
        for (var i = 0; i < roles.length; i++) {
            if (roles[i].id === _nvForm.charRole) {
                charInfo = '【' + roles[i].name + '】\n' + roles[i].detail;
                break;
            }
        }
    }

    var novelId = _nvId();
    var novel = {
        id: novelId, title: _nvForm.title.trim(),
        category: _nvForm.category, tags: _nvForm.tags.slice(),
        penName: _nvProfile.penName, synopsis: _nvForm.synopsis.trim(),
        style: _nvForm.style.trim(), userRole: userInfo, charRole: charInfo,
        totalChapters: _nvForm.chapters, chapters: [],
        cover: _nvForm.cover, createdAt: Date.now()
    };
    for (var ch = 0; ch < _nvForm.chapters; ch++) {
        novel.chapters.push({ title: '第' + (ch + 1) + '章', content: '' });
    }
    _nvNovels.push(novel);
    _nvSave();

    _nvGenNovelId = novelId;
    _nvGenChapIdx = 0;
    _nvCreateOpen = false;
    _nvReadNovel = novelId;
    _nvReadChap = 0;

    /* 只生成第1章 */
    _nvGenerateOneChapter(novelId, 0);
}

/* ===== 单章生成 ===== */
function _nvGenerateOneChapter(novelId, chapIdx) {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === novelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) { _nvGenerating = false; _nvRender(); return; }
    if (chapIdx >= novel.totalChapters) {
        _nvGenerating = false; _nvSave(); _nvRender();
        if (typeof showToast === 'function') showToast('全部章节已生成!');
        return;
    }
    if (novel.chapters[chapIdx] && novel.chapters[chapIdx].content) {
        _nvGenerating = false; _nvRender();
        if (typeof showToast === 'function') showToast('本章已生成');
        return;
    }

    _nvGenerating = true;
    _nvGenNovelId = novelId;
    _nvGenChapIdx = chapIdx;
    _nvRender();

    var api = _nvGetApiConfig();
    var chapNum = chapIdx + 1;
    var totalChap = novel.totalChapters;

    /* ===== 构建 System Prompt（强化人设贴合度） ===== */
    var sp = '你是一位顶级中文小说作家。请严格按照以下设定创作。\n';
    sp += '小说名：' + novel.title + '\n';
    sp += '总章数：' + novel.totalChapters + '\n';
    sp += '分类：' + novel.category + '\n';
    if (novel.tags && novel.tags.length) sp += '标签：' + novel.tags.join('、') + '\n';
    sp += '\n【重要约束】你必须严格遵守以上分类和标签设定。';
    sp += '分类是"' + novel.category + '"，就只能写' + novel.category + '题材的内容。';
    if (novel.tags && novel.tags.length) {
        sp += '标签是"' + novel.tags.join('、') + '"，只能包含这些元素。';
    }
    sp += '绝对禁止出现用户未选择的元素（如用户没选穿越就不准写穿越，没选重生就不准写重生，没选古代就不准写古代背景等）。';
    sp += '故事的世界观、时代背景、情节走向必须与分类和标签完全吻合，不得偏离。\n';
    sp += '总章节数：' + totalChap + '章\n';

    if (novel.userRole) {
        sp += '\n=== 主角A 完整人设 ===\n';
        sp += novel.userRole + '\n';
        sp += '→ 写作要求：主角A说的每一句话都必须像这个人会说的话。严格还原人设中的说话方式、口癖、语气词。';
        sp += '行为举止要体现人设中的性格（比如害羞的人会躲避眼神、强势的人会主动靠近）。';
        sp += '人设中提到的兴趣爱好要自然出现在情节中（比如喜欢吃甜食就写到相关场景）。\n';
    }
    if (novel.charRole) {
        sp += '\n=== 主角B 完整人设 ===\n';
        sp += novel.charRole + '\n';
        sp += '→ 写作要求：主角B说的每一句话都必须像这个人会说的话。严格还原人设中的说话方式、口癖、语气词。';
        sp += '行为举止要体现人设中的性格。人设中提到的兴趣爱好要自然出现在情节中。\n';
    }

    sp += '\n=== 故事大纲 ===\n' + novel.synopsis + '\n';
    if (novel.style) sp += '\n=== 文风 ===\n严格使用此文风：' + novel.style + '\n';

    sp += '\n=== 写作铁律 ===\n';
    sp += '1. 每个角色的台词必须有辨识度，读台词就能分辨是谁在说话\n';
    sp += '2. 角色的小动作、情绪反应必须贴合人设性格，不能OOC\n';
    sp += '3. 人设中的爱好/背景/关系要自然融入剧情\n';
    sp += '4. 要有丰富的场景描写、心理描写、对话\n';
    sp += '5. 每章至少1500字\n';
    sp += '6. ★每章必须在完整的句子和段落处自然结束，绝不能在一句话中间断开。宁可少写也不要断在半截★\n';

    /* 前文回顾 */
    var prevContext = '';
    for (var p = Math.max(0, chapIdx - 2); p < chapIdx; p++) {
        if (novel.chapters[p] && novel.chapters[p].content) {
            var ct = novel.chapters[p].content;
            var limit = (p === chapIdx - 1) ? 1200 : 500;
            prevContext += '\n\n--- ' + novel.chapters[p].title + ' ---\n';
            prevContext += ct.substring(0, limit);
            if (ct.length > limit) prevContext += '\n…(略)…';
            if (p === chapIdx - 1 && ct.length > limit + 300) {
                prevContext += '\n' + ct.substring(ct.length - 300);
            }
        }
    }

    /* User Prompt */
    var up = '请写第' + chapNum + '章（共' + totalChap + '章）。\n\n';
    if (chapNum === 1) {
        up += '这是开篇第一章，请通过具体场景和对话自然引入角色，用言行体现他们的人设性格。\n';
    } else if (chapNum === totalChap) {
        up += '这是最后一章，请完美收束所有情节线。\n';
    } else if (chapNum <= Math.floor(totalChap * 0.3)) {
        up += '当前是故事前期（铺垫阶段），继续建立角色关系。\n';
    } else if (chapNum <= Math.floor(totalChap * 0.7)) {
        up += '当前是故事中期（发展/冲突阶段），推进核心矛盾。\n';
    } else {
        up += '当前是故事后期（高潮/收束阶段），推向结局。\n';
    }
    if (prevContext) up += '\n前文回顾（请承接）：' + prevContext + '\n';
    up += '\n格式：第一行写"第' + chapNum + '章 章节名"，之后写正文。\n';
    up += '★必须在完整句子处结束，不能断在半截话中间★\n';
    up += '\n在正文结束后，另起一行写"【作者有话说】"，然后用作者身份写1-3句话，可以是对本章剧情的碎碎念、剧透预告、或与读者的互动，语气轻松亲切，像真正的网文作者一样。\n';

    var body = {
        model: api.model || 'gpt-4o-mini',
        messages: [
            { role: 'system', content: sp },
            { role: 'user', content: up }
        ],
        temperature: 0.85, max_tokens: 6000
    };

    var xhr = new XMLHttpRequest();
    var apiUrl = api.url.replace(/\/+$/, '');
    /* 防止重复拼接路径 */
    if (apiUrl.indexOf('/chat/completions') < 0) {
        if (apiUrl.indexOf('/v1') < 0) {
            apiUrl += '/v1/chat/completions';
        } else {
            apiUrl += '/chat/completions';
        }
    }
    xhr.open('POST', apiUrl, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + api.key);
    xhr.timeout = 120000; /* 2分钟超时，生成长文需要时间 */
    xhr.onload = function () {
        /* 先检查HTTP状态码 */
        if (xhr.status !== 200) {
            _nvGenerating = false; _nvRender();
            var errMsg = '请求失败 (' + xhr.status + ')';
            try {
                var errRes = JSON.parse(xhr.responseText);
                if (errRes.error && errRes.error.message) errMsg = errRes.error.message;
            } catch (e) { }
            console.error('API error', xhr.status, xhr.responseText);
            if (xhr.status === 401) errMsg = 'API密钥无效，请检查设置';
            else if (xhr.status === 429) errMsg = '请求太频繁，请稍后再试';
            else if (xhr.status === 403) errMsg = 'API访问被拒绝，请检查密钥';
            else if (xhr.status === 404) errMsg = 'API地址错误，请检查URL';
            else if (xhr.status >= 500) errMsg = 'API服务器异常，请稍后重试';
            if (typeof showToast === 'function') showToast(errMsg);
            return;
        }
        try {
            var res = JSON.parse(xhr.responseText);
            var text = res.choices[0].message.content || '';
            text = _nvFixEnding(text);
            var lines = text.split('\n');
            var chapTitle = '第' + chapNum + '章';
            var contentStart = 0;
            for (var li = 0; li < Math.min(5, lines.length); li++) {
                if (lines[li].match(/^第.{1,10}章/) || lines[li].match(/^Chapter/i)) {
                    chapTitle = lines[li].replace(/^#+\s*/, '').trim();
                    contentStart = li + 1; break;
                }
            }
            var rawContent = lines.slice(contentStart).join('\n').trim();
            var authorNote = '';
            var noteIdx = rawContent.indexOf('【作者有话说】');
            if (noteIdx === -1) noteIdx = rawContent.indexOf('【作者的话】');
            if (noteIdx === -1) noteIdx = rawContent.indexOf('作者有话说：');
            if (noteIdx === -1) noteIdx = rawContent.indexOf('作者有话说:');
            if (noteIdx >= 0) {
                authorNote = rawContent.substring(noteIdx).replace(/^【?作者[有的]话说?】?[：:]?\s*/, '').trim();
                rawContent = rawContent.substring(0, noteIdx).trim();
            }
            var chapContent = rawContent;
            novel.chapters[chapIdx].title = chapTitle;
            novel.chapters[chapIdx].content = chapContent;
            novel.chapters[chapIdx].authorNote = authorNote;
            _nvGenerating = false;
            _nvReadChap = chapIdx;
            _nvSave(); _nvRender();
            if (typeof showToast === 'function') showToast(chapTitle + ' 已完成!');
        } catch (e) {
            console.error('Novel gen parse error', e, xhr.responseText);
            _nvGenerating = false; _nvRender();
            if (typeof showToast === 'function') showToast('生成出错: 返回数据解析失败');
        }
    };
    xhr.onerror = function () {
        console.error('XHR onerror', apiUrl);
        _nvGenerating = false; _nvRender();
        if (typeof showToast === 'function') showToast('网络连接失败，请检查API地址是否正确');
    };
    xhr.ontimeout = function () {
        _nvGenerating = false; _nvRender();
        if (typeof showToast === 'function') showToast('请求超时，请稍后重试');
    };
    xhr.send(JSON.stringify(body));
}

/* 继续生成（找第一个空章节） */
function _nvContinueGenerate(novelId) {
    if (_nvGenerating) return;
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === novelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return;
    for (var ch = 0; ch < novel.chapters.length; ch++) {
        if (!novel.chapters[ch].content) {
            _nvGenerateOneChapter(novelId, ch);
            return;
        }
    }
    if (typeof showToast === 'function') showToast('所有章节已生成');
}

/* 断句修复 */
function _nvFixEnding(text) {
    if (!text) return text;
    text = text.trim();
    var last = text.charAt(text.length - 1);
    var ok = ['。', '！', '？', '"', '"', '」', '…', '~', '.', '!', '?'];
    for (var i = 0; i < ok.length; i++) { if (last === ok[i]) return text; }
    if (text.endsWith('——') || text.endsWith('……')) return text;
    var best = -1;
    var ends = ['。', '！', '？', '"', '"', '」'];
    for (var e = 0; e < ends.length; e++) {
        var p = text.lastIndexOf(ends[e]);
        if (p > best) best = p;
    }
    if (best > text.length * 0.6) return text.substring(0, best + 1);
    return text + '……';
}

/* ===== 阅读设置数据 ===== */
var _nvReaderSettings = JSON.parse(localStorage.getItem('_nvReaderSettings') || 'null') || {
    bgColor: '#f5f0ea',
    bgImage: '',
    bgOpacity: 100,
    fontColor: '#5a4e3c',
    fontSize: 15,
    lineHeight: 2.0,
    letterSpacing: 0,
    paragraphSpacing: 12
};
var _nvSettingsOpen = false;

function _nvSaveReaderSettings() {
    try {
        var s = Object.assign({}, _nvReaderSettings);
        if (s.bgImage && s.bgImage.length > 500) {
            _nvSaveBlobDB('nvReaderBgImg', s.bgImage);
            s.bgImage = '__idb__';
        }
        localStorage.setItem('_nvReaderSettings', JSON.stringify(s));
    } catch (e) { }
}

/* 恢复背景图 */
(function () {
    if (_nvReaderSettings.bgImage === '__idb__') {
        _nvLoadBlobDB('nvReaderBgImg', function (d) {
            if (d) _nvReaderSettings.bgImage = d;
        });
    }
})();

/* ===== 阅读页 ===== */
function _nvOpenRead(id) {
    _nvReadNovel = id; _nvReadChap = 0; _nvTocOpen = false; _nvSettingsOpen = false; _nvRender();
}

function _nvRenderRead() {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === _nvReadNovel) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return '';

    var rs = _nvReaderSettings;
    var readBodyStyle = 'padding-bottom:80px;position:relative;';
    readBodyStyle += 'background-color:' + rs.bgColor + ';';
    if (rs.bgImage && rs.bgImage !== '__idb__') {
        readBodyStyle += 'background-image:url(' + rs.bgImage + ');background-size:cover;background-position:center;';
    }

    var h = '<div class="nv-create-overlay show">';

    /* header */
    h += '<div class="nv-header">';
    h += '<div class="nv-back" onclick="_nvReadNovel=null;_nvSettingsOpen=false;_nvRender()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="nv-header-title">' + _nvEsc(novel.title) + '</div>';
    h += '<div style="display:flex;gap:6px">';
    /* 目录按钮 */
    h += '<div class="nv-back" onclick="_nvTocOpen=true;_nvRender()"><svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></div>';
    /* 编辑信息按钮 */
    h += '<div class="nv-back" onclick="_nvEditNovelId=\'' + novel.id + '\';_nvModal=\'editNovel\';_nvRender()"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>';
    /* 设置按钮 */
    h += '<div class="nv-back" onclick="_nvSettingsOpen=!_nvSettingsOpen;_nvRender()"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>';
    h += '</div></div>';

    /* 阅读主体 */
    h += '<div class="nv-create-body" style="' + readBodyStyle + '">';

    /* 透明度遮罩层 */
    if (rs.bgImage && rs.bgImage !== '__idb__' && rs.bgOpacity < 100) {
        var maskAlpha = (100 - rs.bgOpacity) / 100;
        h += '<div style="position:absolute;inset:0;background:rgba(255,255,255,' + maskAlpha.toFixed(2) + ');pointer-events:none;z-index:0"></div>';
    }

    h += '<div style="position:relative;z-index:1">';

    /* 生成中提示 */
    if (_nvGenerating && _nvGenNovelId === novel.id) {
        h += '<div style="text-align:center;padding:20px 0">';
        h += '<div style="font-size:13px;color:#8b7e6a;margin-bottom:6px">正在生成第 ' + (_nvGenChapIdx + 1) + ' 章...</div>';
        h += '<div style="font-size:11px;color:#c4b9a8">已完成的章节可以先阅读</div>';
        h += '</div>';
    }

    var chap = novel.chapters[_nvReadChap];
    if (chap) {
        h += '<div style="text-align:center;font-size:' + (rs.fontSize + 3) + 'px;font-weight:700;color:' + rs.fontColor + ';padding:20px 0 12px">' + _nvEsc(chap.title) + '</div>';
        if (chap.content) {
            var paragraphs = chap.content.split('\n');
            var cmtKey = novel.id + '_' + _nvReadChap;
            h += '<div style="font-size:' + rs.fontSize + 'px;line-height:' + rs.lineHeight + ';color:' + rs.fontColor + ';letter-spacing:' + rs.letterSpacing + 'px;padding:0 4px">';
            for (var pi = 0; pi < paragraphs.length; pi++) {
                var line = paragraphs[pi].trim();
                if (!line) continue;
                var pKey = cmtKey + '_p' + pi;
                var hasCmt = _nvComments[pKey];
                /* 段落 */
                h += '<div style="position:relative;margin:0 0 ' + rs.paragraphSpacing + 'px 0">';
                h += '<p style="text-indent:2em;margin:0">' + _nvEsc(line) + '</p>';
                /* 操作按钮 */
                h += '<div style="display:flex;gap:6px;justify-content:flex-end;margin-top:2px">';
                h += '<span style="font-size:9px;color:#c4b9a8;cursor:pointer;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.02)" onclick="_nvToggleBookmark(\'' + pKey + '\')">' + (hasCmt && hasCmt.bookmark ? '[已标记]' : '[标记]') + '</span>';
                h += '<span style="font-size:9px;color:#c4b9a8;cursor:pointer;padding:2px 6px;border-radius:6px;background:rgba(0,0,0,.02)" onclick="_nvAddParagraphComment(\'' + pKey + '\')">[批注]</span>';
                h += '</div>';
                /* 显示已有标记和评论 */
                if (hasCmt) {
                    if (hasCmt.bookmark) {
                        h += '<div style="font-size:9px;color:#d4c8b0;padding:2px 0 2px 2em;font-style:italic">* 已标记</div>';
                    }
                    if (hasCmt.note) {
                        h += '<div style="font-size:10px;color:#c07a6a;background:rgba(212,200,176,.12);border-left:2px solid #d4c8b0;padding:4px 8px;margin:2px 0 4px 2em;border-radius:0 6px 6px 0">';
                        h += _nvEsc(hasCmt.note);
                        h += ' <span style="color:#ccc;cursor:pointer;font-size:9px" onclick="_nvDeleteComment(\'' + pKey + '\')">[删除]</span>';
                        h += '</div>';
                    }
                }
                h += '</div>';
            }
            h += '</div>';

            /* 作者有话说 */
            if (chap.authorNote) {
                h += '<div style="margin:16px 4px;padding:12px 14px;background:rgba(212,200,176,.12);border-radius:12px;border:1px dashed #ddd5c5">';
                h += '<div style="font-size:11px;font-weight:700;color:#c07a6a;margin-bottom:6px">作者有话说</div>';
                h += '<div style="font-size:11px;color:#8b7e6a;line-height:1.7">' + _nvEsc(chap.authorNote) + '</div>';
                h += '</div>';
            }

            /* 重新生成本章按钮 */
            if (!_nvGenerating) {
                h += '<div style="text-align:center;padding:16px 0 4px">';
                h += '<span style="display:inline-block;padding:8px 18px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5;border-radius:16px;font-size:11px;color:#c07a6a;cursor:pointer" onclick="_nvRegenerateChapter(\'' + novel.id + '\',' + _nvReadChap + ')">重新生成本章</span>';
                h += '</div>';
            }
        } else {
            h += '<div style="text-align:center;padding:40px 0;color:#c4b9a8;font-size:13px">';
            if (_nvGenerating && _nvGenNovelId === novel.id) {
                h += '本章正在生成中...';
            } else {
                h += '本章尚未生成';
                h += '<div style="margin-top:12px"><span style="display:inline-block;padding:8px 20px;background:#d4c8b0;color:#fff;border-radius:20px;font-size:12px;cursor:pointer" onclick="_nvGenerateOneChapter(\'' + novel.id + '\',' + _nvReadChap + ')">生成本章</span></div>';
            }
            h += '</div>';

        }

        /* 上一章 / 目录 / 下一章 */
        h += '<div style="display:flex;justify-content:center;gap:12px;padding:20px 0">';
        if (_nvReadChap > 0) {
            h += '<span style="padding:8px 16px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5;border-radius:16px;font-size:12px;color:#8b7e6a;cursor:pointer" onclick="_nvReadChap--;_nvRender()">上一章</span>';
        }
        h += '<span style="padding:8px 16px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5;border-radius:16px;font-size:12px;color:#8b7e6a;cursor:pointer" onclick="_nvTocOpen=true;_nvRender()">目录</span>';
        if (_nvReadChap < novel.chapters.length - 1) {
            h += '<span style="padding:8px 16px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5;border-radius:16px;font-size:12px;color:#8b7e6a;cursor:pointer" onclick="_nvReadChap++;_nvRender()">下一章</span>';
        }
        h += '</div>';

        /* 生成下一章按钮 */
        var nextIdx = _nvReadChap + 1;
        if (!_nvGenerating && nextIdx < novel.chapters.length && !novel.chapters[nextIdx].content) {
            h += '<div style="text-align:center;padding:8px 0 16px">';
            h += '<span style="display:inline-block;padding:10px 24px;background:#d4c8b0;color:#fff;border-radius:20px;font-size:13px;cursor:pointer" onclick="_nvGenerateOneChapter(\'' + novel.id + '\',' + nextIdx + ')">生成下一章</span>';
            h += '</div>';
        }
    }

    /* 小说信息卡片 */
    h += '<div style="margin:16px 0;padding:14px 16px;background:rgba(250,248,244,.85);border-radius:16px;border:1px solid rgba(0,0,0,.04)">';
    h += '<div style="font-size:12px;font-weight:700;color:#5a4e3c;margin-bottom:8px">小说信息</div>';
    h += '<div style="font-size:11px;color:#8b7e6a;line-height:1.8">';
    h += '<div>分类: ' + _nvEsc(novel.category) + '</div>';
    if (novel.tags && novel.tags.length) {
        h += '<div>标签: ';
        for (var ti = 0; ti < novel.tags.length; ti++) {
            h += '<span style="display:inline-block;padding:1px 6px;border-radius:6px;background:#ede6da;color:#8b7355;font-size:9px;font-weight:600;margin:1px 2px">' + _nvEsc(novel.tags[ti]) + '</span>';
        }
        h += '</div>';
    }
    if (novel.synopsis) h += '<div style="margin-top:4px">简介: ' + _nvEsc(novel.synopsis).substring(0, 80) + (novel.synopsis.length > 80 ? '...' : '') + '</div>';
    h += '</div>';
    h += '<div style="margin-top:8px;text-align:center">';
    h += '<span style="font-size:11px;color:#8b7355;cursor:pointer;padding:4px 14px;border-radius:10px;background:#faf8f4;border:1px solid #ddd5c5" onclick="_nvEditNovelId=\'' + novel.id + '\';_nvModal=\'editNovel\';_nvRender()">编辑信息</span>';
    h += '</div></div>';

    h += '<div style="text-align:center;padding:14px 0">';
    h += '<span style="font-size:11px;color:#b0a48e;cursor:pointer;padding:6px 14px;border-radius:10px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5" onclick="event.stopPropagation();_nvPickNovelCover(\'' + novel.id + '\')">更换封面</span>';
    h += '</div>';
    h += '<div style="text-align:center;padding:10px 0"><span style="font-size:11px;color:#8b7355;cursor:pointer;padding:6px 14px;border-radius:10px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5" onclick="_nvExportNovelTxt(\'' + novel.id + '\')">导出TXT小说</span></div>';
    h += '<div style="text-align:center;padding:10px 0"><span style="font-size:11px;color:#8b7355;cursor:pointer;padding:6px 14px;border-radius:10px;background:rgba(250,248,244,.85);border:1px solid #ddd5c5" onclick="_nvShareToChat(\'' + novel.id + '\',' + _nvReadChap + ')">转发本章给TA</span></div>';
    h += '<div style="text-align:center;padding:10px 0 30px"><span style="font-size:11px;color:#d9534f;cursor:pointer" onclick="_nvDeleteNovel(\'' + novel.id + '\')">删除小说</span></div>';

    h += '</div>'; /* z-index:1 wrapper end */
    h += '</div>'; /* nv-create-body end */

    /* 目录侧栏 */
    if (_nvTocOpen) {
        h += '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.3);z-index:1000" onclick="_nvTocOpen=false;_nvRender()">';
        h += '<div style="position:absolute;right:0;top:0;bottom:0;width:260px;background:#faf8f4;padding:20px 16px;overflow-y:auto" onclick="event.stopPropagation()">';
        h += '<div style="font-size:14px;font-weight:700;color:#5a4e3c;margin-bottom:16px">目录</div>';
        for (var ci = 0; ci < novel.chapters.length; ci++) {
            var hasContent = !!novel.chapters[ci].content;
            var isActive = ci === _nvReadChap;
            h += '<div style="padding:10px 8px;font-size:12px;border-bottom:1px solid #ece6da;cursor:pointer;color:' + (isActive ? '#d4c8b0' : (hasContent ? '#5a4e3c' : '#c4b9a8')) + '" onclick="' + (hasContent ? '_nvReadChap=' + ci + ';_nvTocOpen=false;_nvRender()' : '') + '">';
            h += _nvEsc(novel.chapters[ci].title);
            if (!hasContent) h += ' <span style="font-size:10px;color:#ccc">[未生成]</span>';
            h += '</div>';
        }
        h += '</div></div>';
    }

    /* 阅读设置面板 */
    if (_nvSettingsOpen) {
        h += '<div class="nv-reader-settings-mask show" onclick="_nvSettingsOpen=false;_nvRender()">';
        h += '<div class="nv-reader-settings-panel" onclick="event.stopPropagation()">';
        h += '<div class="nv-rs-handle"></div>';
        h += '<div class="nv-rs-title">阅读设置</div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">背景颜色</div><div class="nv-rs-colors">';
        var bgPresets = [
            { c: '#f5f0ea', n: '默认' }, { c: '#ffffff', n: '纯白' }, { c: '#e8e0d2', n: '羊皮纸' },
            { c: '#cce8cf', n: '护眼绿' }, { c: '#d4e4f7', n: '浅蓝' }, { c: '#f5e6d0', n: '暖黄' },
            { c: '#e8d5e0', n: '浅粉' }, { c: '#2b2b2b', n: '夜间' }, { c: '#1a1a2e', n: '深蓝夜' }
        ];
        for (var bi = 0; bi < bgPresets.length; bi++) {
            var bgActive = rs.bgColor === bgPresets[bi].c ? ' active' : '';
            h += '<div class="nv-rs-color-dot' + bgActive + '" style="background:' + bgPresets[bi].c + '" onclick="_nvSetBgColor(\'' + bgPresets[bi].c + '\')" title="' + bgPresets[bi].n + '"></div>';
        }
        h += '<div class="nv-rs-color-custom" title="自定义颜色">+<input type="color" value="' + rs.bgColor + '" onchange="_nvSetBgColor(this.value)"></div>';
        h += '</div>';
        h += '<div style="margin-top:8px"><span class="nv-rs-bgimg-btn" onclick="_nvPickReaderBg()">选择背景图片</span>';
        if (rs.bgImage && rs.bgImage !== '__idb__') h += '<span class="nv-rs-bgimg-clear" onclick="_nvClearReaderBg()">清除背景图</span>';
        h += '</div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">背景图透明度</div><div class="nv-rs-row">';
        h += '<input type="range" min="10" max="100" value="' + rs.bgOpacity + '" oninput="_nvSetSetting(\'bgOpacity\',parseInt(this.value))">';
        h += '<div class="nv-rs-row-val">' + rs.bgOpacity + '%</div></div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">字体颜色</div><div class="nv-rs-colors">';
        var fontPresets = [
            { c: '#5a4e3c', n: '默认' }, { c: '#333333', n: '深灰' }, { c: '#000000', n: '纯黑' },
            { c: '#666666', n: '灰色' }, { c: '#e8e0d2', n: '浅色' }, { c: '#f5f0ea', n: '白色' }
        ];
        for (var fi = 0; fi < fontPresets.length; fi++) {
            var fActive = rs.fontColor === fontPresets[fi].c ? ' active' : '';
            h += '<div class="nv-rs-color-dot' + fActive + '" style="background:' + fontPresets[fi].c + '" onclick="_nvSetFontColor(\'' + fontPresets[fi].c + '\')" title="' + fontPresets[fi].n + '"></div>';
        }
        h += '<div class="nv-rs-color-custom" title="自定义颜色">+<input type="color" value="' + rs.fontColor + '" onchange="_nvSetFontColor(this.value)"></div>';
        h += '</div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">字体大小</div><div class="nv-rs-row">';
        h += '<input type="range" min="12" max="24" value="' + rs.fontSize + '" oninput="_nvSetSetting(\'fontSize\',parseInt(this.value))">';
        h += '<div class="nv-rs-row-val">' + rs.fontSize + 'px</div></div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">行间距</div><div class="nv-rs-row">';
        h += '<input type="range" min="14" max="36" value="' + Math.round(rs.lineHeight * 10) + '" oninput="_nvSetSetting(\'lineHeight\',parseInt(this.value)/10)">';
        h += '<div class="nv-rs-row-val">' + rs.lineHeight.toFixed(1) + '</div></div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">字间距</div><div class="nv-rs-row">';
        h += '<input type="range" min="0" max="8" value="' + rs.letterSpacing + '" oninput="_nvSetSetting(\'letterSpacing\',parseInt(this.value))">';
        h += '<div class="nv-rs-row-val">' + rs.letterSpacing + 'px</div></div></div>';

        h += '<div class="nv-rs-section"><div class="nv-rs-label">段间距</div><div class="nv-rs-row">';
        h += '<input type="range" min="0" max="40" value="' + rs.paragraphSpacing + '" oninput="_nvSetSetting(\'paragraphSpacing\',parseInt(this.value))">';
        h += '<div class="nv-rs-row-val">' + rs.paragraphSpacing + 'px</div></div></div>';

        h += '<div style="text-align:center;padding-top:6px">';
        h += '<span style="font-size:11px;color:#c07a6a;cursor:pointer;padding:6px 16px;border-radius:10px;background:rgba(0,0,0,.03)" onclick="_nvResetReaderSettings()">恢复默认</span>';
        h += '</div></div></div>';
    }

    h += '</div>';
    return h;
}

/* ===== 阅读设置操作函数 ===== */
function _nvSetBgColor(c) {
    _nvReaderSettings.bgColor = c;
    _nvSaveReaderSettings(); _nvRender();
}
function _nvSetFontColor(c) {
    _nvReaderSettings.fontColor = c;
    _nvSaveReaderSettings(); _nvRender();
}
function _nvSetSetting(key, val) {
    _nvReaderSettings[key] = val;
    _nvSaveReaderSettings(); _nvRender();
}
function _nvPickReaderBg() {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = function () {
        if (!input.files || !input.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            _nvReaderSettings.bgImage = e.target.result;
            _nvSaveReaderSettings(); _nvRender();
        };
        reader.readAsDataURL(input.files[0]);
    };
    input.click();
}
function _nvClearReaderBg() {
    _nvReaderSettings.bgImage = '';
    _nvSaveReaderSettings(); _nvRender();
}
function _nvResetReaderSettings() {
    _nvReaderSettings = {
        bgColor: '#f5f0ea',
        bgImage: '',
        bgOpacity: 100,
        fontColor: '#5a4e3c',
        fontSize: 15,
        lineHeight: 2.0,
        letterSpacing: 0,
        paragraphSpacing: 12
    };
    _nvSaveReaderSettings(); _nvRender();
    if (typeof showToast === 'function') showToast('已恢复默认');
}

/* 继续生成（找第一个空章节） */
function _nvContinueGenerate(novelId) {
    if (_nvGenerating) return;
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === novelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return;
    for (var ch = 0; ch < novel.chapters.length; ch++) {
        if (!novel.chapters[ch].content) {
            _nvGenerateOneChapter(novelId, ch);
            return;
        }
    }
    if (typeof showToast === 'function') showToast('所有章节已生成');
}

/* ===== 重新生成本章 ===== */
var _nvEditNovelId = '';

function _nvRegenerateChapter(novelId, chapIdx) {
    if (_nvGenerating) {
        if (typeof showToast === 'function') showToast('正在生成中，请等待');
        return;
    }
    if (!confirm('确定重新生成本章吗？当前内容将被覆盖。')) return;

    /* 清空当前章节内容 */
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === novelId) {
            if (_nvNovels[i].chapters[chapIdx]) {
                _nvNovels[i].chapters[chapIdx].content = '';
                _nvNovels[i].chapters[chapIdx].title = '第' + (chapIdx + 1) + '章';
            }
            break;
        }
    }
    _nvSave(); _nvRender();

    /* 重新生成 */
    _nvGenerateOneChapter(novelId, chapIdx);
    if (typeof showToast === 'function') showToast('正在重新生成第 ' + (chapIdx + 1) + ' 章...');
}

/* ===== 编辑小说信息弹窗 ===== */
function _nvRenderEditNovel() {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === _nvEditNovelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) { _nvModal = ''; return ''; }

    var h = '<div class="nv-modal-overlay show" onclick="_nvModal=\'\';_nvRender()">';
    h += '<div class="nv-modal" onclick="event.stopPropagation()" style="max-height:85vh">';
    h += '<div class="nv-modal-header"><div class="nv-modal-title">编辑小说信息</div>';
    h += '<div class="nv-modal-close" onclick="_nvModal=\'\';_nvRender()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    h += '<div class="nv-modal-body">';

    /* 书名 */
    h += '<div class="nv-field"><div class="nv-field-label">书名</div>';
    h += '<input class="nv-field-input" id="nvEditTitle" value="' + _nvEsc(novel.title) + '" placeholder="小说名称"></div>';

    /* 分类 */
    h += '<div class="nv-field"><div class="nv-field-label">分类</div>';
    h += '<div class="nv-tag-picker" id="nvEditCategory">';
    for (var c = 0; c < _nvCategories.length; c++) {
        var cSel = novel.category === _nvCategories[c] ? ' selected' : '';
        h += '<span class="nv-tag-opt' + cSel + '" onclick="_nvTmpEditCategory(this,\'' + _nvEsc(_nvCategories[c]) + '\')">' + _nvEsc(_nvCategories[c]) + '</span>';
    }
    h += '</div></div>';

    /* 标签 */
    h += '<div class="nv-field"><div class="nv-field-label">标签 (点击选中/取消)</div>';
    h += '<div class="nv-tag-picker" id="nvEditTags">';
    var currentTags = novel.tags || [];
    for (var t = 0; t < _nvTagPool.length; t++) {
        var tSel = currentTags.indexOf(_nvTagPool[t]) >= 0 ? ' selected' : '';
        h += '<span class="nv-tag-opt' + tSel + '" onclick="this.classList.toggle(\'selected\')">' + _nvEsc(_nvTagPool[t]) + '</span>';
    }
    h += '</div></div>';

    /* 简介 */
    h += '<div class="nv-field"><div class="nv-field-label">简介</div>';
    h += '<textarea class="nv-field-textarea" id="nvEditSynopsis" placeholder="故事简介" style="min-height:80px">' + _nvEsc(novel.synopsis || '') + '</textarea></div>';

    /* 风格 */
    h += '<div class="nv-field"><div class="nv-field-label">文风 (选填)</div>';
    h += '<input class="nv-field-input" id="nvEditStyle" value="' + _nvEsc(novel.style || '') + '" placeholder="如: 轻松幽默 / 虐心 / 慢热"></div>';

    /* 保存 */
    h += '<div class="nv-modal-save" onclick="_nvSaveNovelInfo()">保存修改</div>';
    h += '</div></div></div>';
    return h;
}

/* 分类单选临时切换 */
function _nvTmpEditCategory(el, cat) {
    var siblings = el.parentNode.querySelectorAll('.nv-tag-opt');
    for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('selected');
    el.classList.add('selected');
}

/* 保存小说信息 */
function _nvSaveNovelInfo() {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === _nvEditNovelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return;

    /* 读取书名 */
    var elTitle = document.getElementById('nvEditTitle');
    if (elTitle && elTitle.value.trim()) novel.title = elTitle.value.trim();

    /* 读取分类 */
    var catContainer = document.getElementById('nvEditCategory');
    if (catContainer) {
        var catSelected = catContainer.querySelector('.nv-tag-opt.selected');
        if (catSelected) novel.category = catSelected.textContent.trim();
    }

    /* 读取标签 */
    var tagContainer = document.getElementById('nvEditTags');
    if (tagContainer) {
        var tagEls = tagContainer.querySelectorAll('.nv-tag-opt.selected');
        var newTags = [];
        for (var t = 0; t < tagEls.length; t++) newTags.push(tagEls[t].textContent.trim());
        novel.tags = newTags;
    }

    /* 读取简介 */
    var elSyn = document.getElementById('nvEditSynopsis');
    if (elSyn) novel.synopsis = elSyn.value.trim();

    /* 读取风格 */
    var elStyle = document.getElementById('nvEditStyle');
    if (elStyle) novel.style = elStyle.value.trim();

    _nvModal = '';
    _nvSave(); _nvRender();
    if (typeof showToast === 'function') showToast('小说信息已更新');
}

/* ===== 段落标记/批注 ===== */
function _nvToggleBookmark(pKey) {
    if (!_nvComments[pKey]) _nvComments[pKey] = {};
    _nvComments[pKey].bookmark = !_nvComments[pKey].bookmark;
    if (!_nvComments[pKey].bookmark && !_nvComments[pKey].note) delete _nvComments[pKey];
    _nvSave(); _nvRender();
}

function _nvAddParagraphComment(pKey) {
    var existing = (_nvComments[pKey] && _nvComments[pKey].note) ? _nvComments[pKey].note : '';
    var note = prompt('写下你的批注:', existing);
    if (note === null) return;
    if (!note.trim()) {
        if (_nvComments[pKey]) {
            delete _nvComments[pKey].note;
            if (!_nvComments[pKey].bookmark) delete _nvComments[pKey];
        }
    } else {
        if (!_nvComments[pKey]) _nvComments[pKey] = {};
        _nvComments[pKey].note = note.trim();
    }
    _nvSave(); _nvRender();
}

function _nvDeleteComment(pKey) {
    if (_nvComments[pKey]) {
        delete _nvComments[pKey].note;
        if (!_nvComments[pKey].bookmark) delete _nvComments[pKey];
    }
    _nvSave(); _nvRender();
}

/* ===== 导出TXT小说 ===== */
function _nvExportNovelTxt(novelId) {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === novelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return;

    var txt = '';
    /* 封面页 */
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    txt += '\n';
    txt += '    ' + novel.title + '\n';
    txt += '\n';
    txt += '    作者: ' + (novel.penName || _nvProfile.penName) + '\n';
    txt += '\n';
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    txt += '\n\n';

    /* 小说信息 */
    txt += '【小说信息】\n';
    txt += '书名: ' + novel.title + '\n';
    txt += '作者: ' + (novel.penName || _nvProfile.penName) + '\n';
    txt += '分类: ' + (novel.category || '') + '\n';
    if (novel.tags && novel.tags.length) {
        txt += '标签: ' + novel.tags.join(' / ') + '\n';
    }
    if (novel.synopsis) {
        txt += '简介: ' + novel.synopsis + '\n';
    }
    txt += '总章数: ' + (novel.totalChapters || 0) + ' 章\n';

    /* 统计字数 */
    var totalWords = 0;
    var genCount = 0;
    for (var ci = 0; ci < novel.chapters.length; ci++) {
        if (novel.chapters[ci].content) {
            totalWords += novel.chapters[ci].content.length;
            genCount++;
        }
    }
    txt += '总字数: 约 ' + totalWords + ' 字\n';
    txt += '已生成: ' + genCount + ' / ' + novel.chapters.length + ' 章\n';
    txt += '\n';
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    txt += '\n\n';

    /* 目录 */
    txt += '【目  录】\n\n';
    for (var ci = 0; ci < novel.chapters.length; ci++) {
        var ch = novel.chapters[ci];
        if (ch.content) {
            txt += '  ' + ch.title + '\n';
        } else {
            txt += '  第' + (ci + 1) + '章 [未生成]\n';
        }
    }
    txt += '\n';
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    txt += '\n\n';

    /* 正文 */
    for (var ci = 0; ci < novel.chapters.length; ci++) {
        var ch = novel.chapters[ci];
        if (!ch.content) continue;

        txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        txt += '\n';
        txt += '  ' + ch.title + '\n';
        txt += '\n';
        txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
        txt += '\n';

        var paragraphs = ch.content.split('\n');
        for (var pi = 0; pi < paragraphs.length; pi++) {
            var line = paragraphs[pi].trim();
            if (line) {
                txt += '    ' + line + '\n\n';
            }
        }

        /* 作者有话说 */
        if (ch.authorNote) {
            txt += '\n';
            txt += '  -------- 作者有话说 --------\n';
            txt += '  ' + ch.authorNote + '\n';
            txt += '  ----------------------------\n';
        }

        txt += '\n\n';
    }

    /* 结尾 */
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
    txt += '\n';
    txt += '    《' + novel.title + '》 完\n';
    txt += '\n';
    txt += '    感谢阅读\n';
    txt += '    由「柿子小说」生成\n';
    txt += '\n';
    txt += '━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

    /* 下载 */
    var blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = novel.title + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === 'function') showToast('小说已导出为TXT文件');
}

/* ===== 转发小说到聊一聊 ===== */
function _nvShareToChat(novelId, chapIdx) {
    _nvShareNovelId = novelId;
    _nvShareChapIdx = chapIdx;
    _nvSharePicker = true;
    _nvRender();
}

function _nvRenderSharePicker() {
    if (!_nvSharePicker) return '';
    var roles = [];
    try { roles = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]'); } catch (e) { }
    if (!roles.length) {
        if (typeof showToast === 'function') showToast('还没有聊天角色，先去聊一聊创建吧');
        _nvSharePicker = false;
        return '';
    }

    var h = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center" onclick="_nvSharePicker=false;_nvRender()">';
    h += '<div style="background:#fdf8f2;border-radius:16px;width:85%;max-width:340px;max-height:70vh;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.15)" onclick="event.stopPropagation()">';
    h += '<div style="padding:14px 16px;border-bottom:1px solid #ede6da;font-size:14px;font-weight:700;color:#6b5c4d">选择转发对象</div>';
    h += '<div style="overflow-y:auto;max-height:55vh;padding:8px 12px">';

    for (var i = 0; i < roles.length; i++) {
        var r = roles[i];
        var avatar = '';
        if (r.avatar && r.avatar !== '__idb__' && r.avatar.length > 10) {
            avatar = '<img src="' + _nvEsc(r.avatar) + '" style="width:36px;height:36px;border-radius:50%;object-fit:cover;margin-right:10px;flex-shrink:0">';
        } else {
            avatar = '<div style="width:36px;height:36px;border-radius:50%;background:#e8dfd3;display:flex;align-items:center;justify-content:center;margin-right:10px;font-size:16px;color:#b5a68e;flex-shrink:0">👤</div>';
        }
        h += '<div style="display:flex;align-items:center;padding:10px 8px;border-radius:10px;cursor:pointer;transition:background .15s" onmouseover="this.style.background=\'rgba(212,200,176,.15)\'" onmouseout="this.style.background=\'transparent\'" onclick="_nvDoShareToChat(\'' + r.id + '\')">';
        h += avatar;
        h += '<div><div style="font-size:13px;font-weight:600;color:#5a4d3e">' + _nvEsc(r.nickname || r.name) + '</div>';
        if (r.group && r.group !== '默认') h += '<div style="font-size:10px;color:#b5a68e">' + _nvEsc(r.group) + '</div>';
        h += '</div></div>';
    }

    h += '</div>';
    h += '<div style="padding:10px 16px;text-align:center;border-top:1px solid #ede6da"><span style="font-size:12px;color:#b5a68e;cursor:pointer" onclick="_nvSharePicker=false;_nvRender()">取消</span></div>';
    h += '</div></div>';
    return h;
}

function _nvDoShareToChat(roleId) {
    var novel = null;
    for (var i = 0; i < _nvNovels.length; i++) {
        if (_nvNovels[i].id === _nvShareNovelId) { novel = _nvNovels[i]; break; }
    }
    if (!novel) return;
    var chap = novel.chapters[_nvShareChapIdx];
    if (!chap || !chap.content) {
        if (typeof showToast === 'function') showToast('本章还没有内容');
        return;
    }

    /* 截取前200字作预览 */
    var preview = chap.content.replace(/\n/g, ' ').substring(0, 200);
    if (chap.content.length > 200) preview += '...';

    /* 构造卡片数据 */
    var cardData = {
        type: 'novel_share',
        novelTitle: novel.title,
        chapTitle: chap.title,
        chapIndex: _nvShareChapIdx,
        category: novel.category || '',
        tags: novel.tags || [],
        preview: preview,
        fullContent: chap.content,
        authorNote: chap.authorNote || '',
        author: novel.penName || _nvProfile.penName || '匿名柿'
    };

    var cardJson = JSON.stringify(cardData);
    var msgText = '[小说卡片]' + cardJson;
    var ts = Date.now();
    var timeStr = new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
        var roles = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]');
        var role = null;
        for (var ri = 0; ri < roles.length; ri++) {
            if (roles[ri].id === roleId) { role = roles[ri]; break; }
        }
        if (!role) { showToast('角色不存在'); return; }
        if (!role.msgs) role.msgs = [];

        /* 推入小说卡片消息 */
        role.msgs.push({
            from: 'self',
            text: msgText,
            time: timeStr,
            novelCard: true
        });

        /* 更新最后消息预览 */
        role.lastMsg = '[小说] ' + novel.title + ' - ' + chap.title;
        role.lastTime = ts;
        role.lastTimeStr = timeStr;

        localStorage.setItem('ds_chat_roles', JSON.stringify(roles));

        _nvSharePicker = false;
        _nvRender();
        if (typeof showToast === 'function') showToast('已转发给 ' + (role.nickname || role.name));
    } catch (e) {
        console.warn('Share to chat error', e);
        if (typeof showToast === 'function') showToast('转发失败');
    }
}

/* ===== 初始化 ===== */
_nvRestoreBlobs();
