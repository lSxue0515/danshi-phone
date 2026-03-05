/* ============================================
   蛋薯机 DanShu Pro v2 — chat.js
   聊一聊 App — 浅粉色交互 + 对话页重构
   ============================================ */

var _chatRoles = [];
var _chatCurrentTab = 'messages';
var _chatCurrentConv = null;
var _chatEditingRoleId = null;
var _crAvatarData = '';

var _chatPersonas = [];
var _chatActivePersonaId = '';
var _peEditingId = null;
var _peAvatarData = '';

var _chatWorldBookLib = [];
var _chatStickerLib = [];
var _crMountPersona = '';
var _crMountWorldBook = [];
var _crMountSticker = [];
var _stkMountGroupFilter = '全部'; // 表情包挂载分组筛选

// 对话页双头像
var _convLetAvatar = '';
var _convRightAvatar = '';
var _pendingImageData = null; // 待发送的图片base64
// ★ 统一分组系统
var _contactGroups = [];        // 自定义分组列表
var _contactActiveGroup = '全部'; // 联系人当前选中的分组 tab
var CONTACT_GROUPS_KEY = 'ds_chat_contact_groups';
// 固定分组（联系人页显示，但创建/编辑角色中不出现）
var FIXED_CONTACT_GROUPS = ['置顶', '好友', '家人', '工作'];

function loadContactGroups() {
    try { _contactGroups = JSON.parse(localStorage.getItem(CONTACT_GROUPS_KEY) || '[]'); } catch (e) { _contactGroups = []; }
}
function saveContactGroups() {
    try { localStorage.setItem(CONTACT_GROUPS_KEY, JSON.stringify(_contactGroups)); } catch (e) { }
}
loadContactGroups();
// 获取所有分组名（从角色数据 + 自定义分组中收集）
function getAllGroupNames() {
    var set = {};
    // 固定分组
    for (var i = 0; i < FIXED_CONTACT_GROUPS.length; i++) set[FIXED_CONTACT_GROUPS[i]] = 1;
    // 自定义分组
    for (var i = 0; i < _contactGroups.length; i++) set[_contactGroups[i]] = 1;
    // 从角色数据中收集
    for (var i = 0; i < _chatRoles.length; i++) {
        var g = _chatRoles[i].group;
        if (g && g !== '默认') set[g] = 1;
    }
    set['默认'] = 1;
    return set;
}
// 获取只用于创建/编辑角色的分组（排除固定分组）
function getRoleGroupOptions() {
    var all = getAllGroupNames();
    var result = ['默认'];
    for (var k in all) {
        if (k !== '默认' && FIXED_CONTACT_GROUPS.indexOf(k) === -1) {
            result.push(k);
        }
    }
    return result;
}

function loadChatRoles() {
    try { _chatRoles = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]'); } catch (e) { _chatRoles = []; }
    try { _chatPersonas = JSON.parse(localStorage.getItem('ds_chat_personas') || '[]'); } catch (e) { _chatPersonas = []; }
    function getActivePersona(roleId) {
        var rid = roleId || _chatCurrentConv;
        if (rid) {
            var r = findRole(rid);
            if (r && r.boundPersonaId) {
                var p = findPersona(r.boundPersonaId);
                if (p) return p;
            }
        }
        return findPersona(_chatActivePersonaId);
    }
    try { _chatWorldBookLib = JSON.parse(localStorage.getItem('ds_chat_worldbooks') || '[]'); } catch (e) { _chatWorldBookLib = []; }
    try { _chatStickerLib = JSON.parse(localStorage.getItem('ds_chat_stickers') || '[]'); } catch (e) { _chatStickerLib = []; }
    loadWallet();
    syncChatWorldBookFromApp();
}
function saveChatRoles() { safeSetItem('ds_chat_roles', JSON.stringify(_chatRoles)); }
function savePersonas() { safeSetItem('ds_chat_personas', JSON.stringify(_chatPersonas)); }
function saveActivePersona() { safeSetItem('ds_chat_active_persona', _chatActivePersonaId); }
function saveWorldBookLib() { safeSetItem('ds_chat_worldbooks', JSON.stringify(_chatWorldBookLib)); }
function saveStickerLib() { safeSetItem('ds_chat_stickers', JSON.stringify(_chatStickerLib)); }

function genId() { return 'r' + Date.now() + Math.random().toString(36).substr(2, 5); }
function findRole(id) { for (var i = 0; i < _chatRoles.length; i++) if (_chatRoles[i].id === id) return _chatRoles[i]; return null; }
function findPersona(id) { for (var i = 0; i < _chatPersonas.length; i++) if (_chatPersonas[i].id === id) return _chatPersonas[i]; return null; }
function getActivePersona(roleId) {
    var rid = roleId || _chatCurrentConv;
    if (rid) {
        var role = findRole(rid);
        if (role && role.boundPersonaId) {
            var p = findPersona(role.boundPersonaId);
            if (p) return p;
        }
    }
    return findPersona(_chatActivePersonaId);
}
/* ★ 从世界书 App 同步数据到消息 App */
function syncChatWorldBookFromApp() {
    try {
        var appData = JSON.parse(localStorage.getItem('ds_worldbook_data') || '[]');
        _chatWorldBookLib = [];
        for (var i = 0; i < appData.length; i++) {
            var e = appData[i];
            _chatWorldBookLib.push({
                id: e.id, name: e.name || '', content: e.content || '',
                inject: e.inject || 'before', group: e.group || '默认',
                keywords: e.keywords || '', type: e.type || 'global',
                enabled: e.enabled !== false
            });
        }
        saveWorldBookLib();
    } catch (ex) { }
}
function findWorldBook(id) { for (var i = 0; i < _chatWorldBookLib.length; i++) if (_chatWorldBookLib[i].id === id) return _chatWorldBookLib[i]; return null; }
function findStickerPack(id) { for (var i = 0; i < _chatStickerLib.length; i++) if (_chatStickerLib[i].id === id) return _chatStickerLib[i]; return null; }

var SVG_USER = '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
var SVG_USER_SM = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

function openChatApp() {
    var o = document.getElementById('chatAppOverlay');
    if (!o) return;
    loadChatRoles();
    _chatCurrentTab = 'messages';
    renderChatTab('messages');
    updateChatTabBar();
    o.classList.add('show');
}
function closeChatApp() {
    var o = document.getElementById('chatAppOverlay');
    if (o) o.classList.remove('show');
    closeChatConversation(); closeCreateRole(); closeChatMenu();
    closeProfilePage(); closePersonaEditor();
}

function switchChatTab(t) {
    _chatCurrentTab = t;
    renderChatTab(t);
    updateChatTabBar();
    closeChatMenu();
}
function updateChatTabBar() {
    document.querySelectorAll('.chat-tab-item').forEach(function (el) {
        el.classList.toggle('active', el.getAttribute('data-tab') === _chatCurrentTab);
    });
    var m = { messages: '消息', contacts: '联系人', moments: '动态', me: '我' };
    var t = document.getElementById('chatHeaderTitle');
    if (t) t.textContent = m[_chatCurrentTab] || '消息';
}
function renderChatTab(tab) {
    var b = document.getElementById('chatBody');
    if (!b) return;
    switch (tab) {
        case 'messages': b.innerHTML = renderMessages(); break;
        case 'contacts': b.innerHTML = renderContacts(); break;
        case 'moments': b.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;color:rgba(50,40,55,0.3);font-size:13px;gap:12px"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="rgba(255,180,200,0.5)" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg><p style="text-align:center">动态功能搭建中<br>敬请期待 ✨</p></div>'; break;
        case 'me': b.innerHTML = renderMe(); break;
    }
}

function toggleChatMenu() {
    var m = document.getElementById('chatPlusMenu');
    if (!m) return;

    if (_chatCurrentTab === 'moments') {
        m.innerHTML = '';
    } else {
        m.innerHTML = '<div class="chat-plus-menu-item" onclick="closeChatMenu();openCreateRole()"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg><span>创建角色</span></div>'
            + '<div class="chat-plus-menu-item" onclick="triggerImportRole()"><svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg><span>导入角色卡</span></div>';
    }

    m.classList.toggle('show');
}
function closeChatMenu() {
    var m = document.getElementById('chatPlusMenu');
    if (m) m.classList.remove('show');
}

/* ========== 消息页 ========== */
function renderMessages() {
    var h = '';
    h += '<div class="chat-search-bar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="text" placeholder="搜索角色..." oninput="filterMessages(this.value)"></div>';
    if (!_chatRoles.length) {
        h += '<div class="chat-empty-state"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p>暂无消息<br>点击右上角 + 创建角色开始聊天</p></div>';
        return h;
    }
    h += '<div class="chat-msg-list" id="chatMsgList">';
    var sorted = _chatRoles.slice().sort(function (a, b) {
        if ((a.unread || 0) > 0 && !(b.unread || 0)) return -1;
        if (!(a.unread || 0) && (b.unread || 0) > 0) return 1;
        return (b.lastTime || 0) - (a.lastTime || 0);
    });
    for (var i = 0; i < sorted.length; i++) {
        var r = sorted[i];
        h += '<div class="chat-msg-item" onclick="openConversation(\'' + r.id + '\')" oncontextmenu="event.preventDefault();showRoleContextMenu(event,\'' + r.id + '\')">';
        h += '<div class="chat-msg-avatar">' + (r.avatar ? '<img src="' + r.avatar + '" alt="">' : SVG_USER) + '</div>';
        h += '<div class="chat-msg-info"><div class="chat-msg-name">' + esc(r.nickname || r.name) + '</div><div class="chat-msg-preview">' + esc(r.lastMsg || '暂无消息') + '</div></div>';
        h += '<div class="chat-msg-meta"><div class="chat-msg-time">' + (r.lastTimeStr || '') + '</div>';
        if (r.unread > 0) h += '<div class="chat-msg-badge">' + r.unread + '</div>';
        h += '</div></div>';
    }
    h += '</div>';
    return h;
}
function filterMessages(kw) {
    kw = kw.toLowerCase();
    document.querySelectorAll('.chat-msg-item').forEach(function (el) {
        var n = el.querySelector('.chat-msg-name').textContent.toLowerCase();
        var p = el.querySelector('.chat-msg-preview').textContent.toLowerCase();
        el.style.display = (n.indexOf(kw) !== -1 || p.indexOf(kw) !== -1) ? '' : 'none';
    });
}

/* ========== 联系人页 — 横向胶囊分组 Tab ========== */
function renderContacts() {
    var h = '';

    // 搜索栏
    h += '<div class="chat-search-bar"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="text" placeholder="搜索联系人..." oninput="filterContactsBySearch(this.value)"></div>';

    if (!_chatRoles.length) {
        h += '<div class="chat-empty-state"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>暂无联系人</p></div>';
        return h;
    }

    // ★ 收集所有有角色的分组
    var groupSet = {};
    for (var i = 0; i < _chatRoles.length; i++) {
        var g = _chatRoles[i].group || '默认';
        if (!groupSet[g]) groupSet[g] = [];
        groupSet[g].push(_chatRoles[i]);
    }

    // 排序分组：固定分组优先，然后自定义分组，最后"默认"
    var fixOrder = ['置顶', '好友', '家人', '工作'];
    var allGroupKeys = Object.keys(groupSet);
    var orderedGroups = [];
    for (var fi = 0; fi < fixOrder.length; fi++) {
        if (groupSet[fixOrder[fi]]) orderedGroups.push(fixOrder[fi]);
    }
    for (var ai = 0; ai < allGroupKeys.length; ai++) {
        if (orderedGroups.indexOf(allGroupKeys[ai]) === -1 && allGroupKeys[ai] !== '默认') {
            orderedGroups.push(allGroupKeys[ai]);
        }
    }
    if (groupSet['默认']) orderedGroups.push('默认');

    // ★ 横向胶囊分组 Tab 条
    h += '<div class="contact-group-tabs" id="contactGroupTabs">';
    // "全部" tab
    h += '<div class="contact-group-tab' + (_contactActiveGroup === '全部' ? ' active' : '') + '" onclick="switchContactGroup(\'全部\')">全部</div>';
    for (var ti = 0; ti < orderedGroups.length; ti++) {
        var gn = orderedGroups[ti];
        var cnt = groupSet[gn] ? groupSet[gn].length : 0;
        h += '<div class="contact-group-tab' + (_contactActiveGroup === gn ? ' active' : '') + '" onclick="switchContactGroup(\'' + esc(gn).replace(/'/g, "\\'") + '\')">' + esc(gn) + ' <span class="contact-group-cnt">' + cnt + '</span></div>';
    }
    // ★ 小加号胶囊
    h += '<div class="contact-group-tab contact-group-add" onclick="showAddContactGroupPrompt()">+</div>';
    h += '</div>';

    // ★ 联系人列表（根据选中分组过滤）
    h += '<div class="chat-contact-list-wrap" id="contactListWrap">';
    var filtered = [];
    if (_contactActiveGroup === '全部') {
        filtered = _chatRoles.slice();
    } else {
        for (var ri = 0; ri < _chatRoles.length; ri++) {
            var rg = _chatRoles[ri].group || '默认';
            if (rg === _contactActiveGroup) filtered.push(_chatRoles[ri]);
        }
    }

    if (!filtered.length) {
        h += '<div class="chat-empty-state" style="padding:40px 0;"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><p>该分组暂无联系人</p></div>';
    } else {
        h += '<div class="chat-contact-list">';
        for (var j = 0; j < filtered.length; j++) {
            var c = filtered[j];
            h += '<div class="chat-contact-item" onclick="openConversation(\'' + c.id + '\')" oncontextmenu="event.preventDefault();showRoleContextMenu(event,\'' + c.id + '\')">';
            h += '<div class="chat-contact-avatar">' + (c.avatar ? '<img src="' + c.avatar + '" alt="">' : SVG_USER) + '</div>';
            h += '<div class="chat-contact-info">';
            h += '<div class="chat-contact-name">' + esc(c.nickname || c.name) + '</div>';
            if (c.group && c.group !== '默认') h += '<div class="chat-contact-group-tag">' + esc(c.group) + '</div>';
            h += '</div>';
            if (c.gender) h += '<div class="chat-contact-gender ' + c.gender + '">' + (c.gender === 'male' ? '男' : '女') + '</div>';
            h += '</div>';
        }
        h += '</div>';
    }
    h += '</div>';

    return h;
}

// ★ 切换联系人分组 Tab
function switchContactGroup(groupName) {
    _contactActiveGroup = groupName;
    renderChatTab('contacts');
}

// ★ 搜索联系人
function filterContactsBySearch(keyword) {
    var wrap = document.getElementById('contactListWrap');
    if (!wrap) return;
    var kw = keyword.trim().toLowerCase();
    var items = wrap.querySelectorAll('.chat-contact-item');
    for (var i = 0; i < items.length; i++) {
        var nameEl = items[i].querySelector('.chat-contact-name');
        if (!nameEl) continue;
        var name = nameEl.textContent.toLowerCase();
        items[i].style.display = (!kw || name.indexOf(kw) >= 0) ? '' : 'none';
    }
}

// ★ 添加联系人分组（弹窗输入）
function showAddContactGroupPrompt() {
    var name = prompt('请输入新分组名称：');
    if (!name || !name.trim()) return;
    name = name.trim();
    // 不能和固定分组重名
    if (FIXED_CONTACT_GROUPS.indexOf(name) !== -1) {
        showToast('"' + name + '"是系统分组，无需添加');
        return;
    }
    if (name === '默认' || name === '全部') {
        showToast('该名称为保留名');
        return;
    }
    // 检查是否已存在
    if (_contactGroups.indexOf(name) !== -1) {
        showToast('分组"' + name + '"已存在');
        return;
    }
    _contactGroups.push(name);
    saveContactGroups();
    _contactActiveGroup = name;
    renderChatTab('contacts');
    showToast('已添加分组：' + name);
}

/* ========== "我"页面 ========== */
function renderMe() {
    var p = getActivePersona();
    var name = p ? p.name : '未设置';
    var sig = p ? (p.signature || '暂无签名') : '点击进入个人主页设置';
    var avatar = p ? p.avatar : '';

    var h = '';
    h += '<div class="chat-me-profile" onclick="openProfilePage()">';
    h += '<div class="chat-me-avatar-lg">' + (avatar ? '<img src="' + avatar + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-me-name-lg">' + esc(name) + '</div>';
    h += '<div class="chat-me-sig-lg">' + esc(sig) + '</div>';
    h += '<div class="chat-me-enter-hint"><span>进入个人主页</span><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '</div>';

    h += '<div class="chat-me-menu">';

    h += '<div class="chat-me-menu-group">';
    h += '<div class="chat-me-menu-item" onclick="openWalletPage()"><div class="chat-me-menu-text">钱包</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '<div class="chat-me-menu-item" onclick="openFavoritePage()"><div class="chat-me-menu-text">收藏</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '</div>';
    h += '<div class="chat-me-menu-group">';
    h += '<div class="chat-me-menu-item" onclick="openBeautifyPage()"><div class="chat-me-menu-text">聊天美化</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '<div class="chat-me-menu-item" onclick="openStickerManager()"><div class="chat-me-menu-text">表情包管理</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    h += '</div></div>';

    // 在 renderMe 函数体内，适当位置添加订单入口
    if (typeof renderMeOrdersSection === 'function') {
        h += renderMeOrdersSection();
    }

    return h;
}

function menuItem(text) {
    return '<div class="chat-me-menu-item" onclick="showToast(\'' + text + '\')"><div class="chat-me-menu-text">' + text + '</div><svg class="chat-me-menu-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
}

/* ================================================================
   个人主页
   ================================================================ */
function openProfilePage() {
    var page = document.getElementById('chatProfilePage');
    if (!page) return;
    renderProfilePage();
    page.classList.add('show');
}
function closeProfilePage() {
    var page = document.getElementById('chatProfilePage');
    if (page) page.classList.remove('show');
}
function renderProfilePage() {
    var body = document.getElementById('chatProfileBody');
    if (!body) return;
    var ap = getActivePersona();
    var h = '';
    h += '<div class="chat-profile-current">';
    h += '<div class="chat-profile-cur-avatar">' + (ap && ap.avatar ? '<img src="' + ap.avatar + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-profile-cur-name">' + esc(ap ? ap.name : '未设置') + '</div>';
    h += '<div class="chat-profile-cur-sig">' + esc(ap ? (ap.signature || '暂无签名') : '请新建角色设置你的人设') + '</div>';
    h += '</div>';
    h += '<div class="chat-profile-new-btn" onclick="openPersonaEditor()">';
    h += '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    h += '<span>新建角色</span></div>';
    h += '<div class="chat-profile-list-title">人设预设列表</div>';
    h += '<div class="chat-persona-list">';
    if (!_chatPersonas.length) {
        h += '<div class="chat-persona-empty">暂无人设，点击上方新建</div>';
    } else {
        for (var i = 0; i < _chatPersonas.length; i++) {
            var p = _chatPersonas[i];
            var isActive = p.id === _chatActivePersonaId;
            h += '<div class="chat-persona-card' + (isActive ? ' active' : '') + '" onclick="switchPersona(\'' + p.id + '\')">';
            h += '<div class="chat-persona-card-avatar">' + (p.avatar ? '<img src="' + p.avatar + '" alt="">' : SVG_USER) + '</div>';
            h += '<div class="chat-persona-card-info">';
            h += '<div class="chat-persona-card-name">' + esc(p.name) + (isActive ? ' ✓' : '') + '</div>';
            h += '<div class="chat-persona-card-sig">' + esc(p.signature || p.nickname || '暂无签名') + '</div>';
            h += '</div>';
            h += '<div class="chat-persona-card-actions">';
            h += '<div class="chat-persona-action-btn" onclick="event.stopPropagation();openPersonaEditor(\'' + p.id + '\')"><svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>';
            h += '<div class="chat-persona-action-btn danger" onclick="event.stopPropagation();deletePersona(\'' + p.id + '\')"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>';
            h += '</div></div>';
        }
    }
    h += '</div>';
    body.innerHTML = h;
}
function switchPersona(id) {
    _chatActivePersonaId = id; saveActivePersona();
    renderProfilePage(); renderChatTab('me'); showToast('已切换人设');
}
function deletePersona(id) {
    _chatPersonas = _chatPersonas.filter(function (p) { return p.id !== id; });
    if (_chatActivePersonaId === id) {
        _chatActivePersonaId = _chatPersonas.length ? _chatPersonas[0].id : '';
        saveActivePersona();
    }
    savePersonas(); renderProfilePage(); renderChatTab('me'); showToast('人设已删除');
}

/* ================================================================
   人设编辑器
   ================================================================ */
function openPersonaEditor(editId) {
    _peEditingId = editId || null; _peAvatarData = '';
    var panel = document.getElementById('chatPersonaEditor'); if (!panel) return;
    panel.querySelector('.chat-pe-title').textContent = editId ? '编辑角色' : '新建角色';
    document.getElementById('peName').value = '';
    document.getElementById('peNickname').value = '';
    document.getElementById('peSignature').value = '';
    document.getElementById('peDetail').value = '';
    selectPeGender('male');
    var av = document.getElementById('peAvatarPreview');
    av.innerHTML = SVG_USER + '<div class="chat-pe-avatar-hint">上传头像</div>';
    if (editId) {
        var p = findPersona(editId);
        if (p) {
            document.getElementById('peName').value = p.name || '';
            document.getElementById('peNickname').value = p.nickname || '';
            document.getElementById('peSignature').value = p.signature || '';
            document.getElementById('peDetail').value = p.detail || '';
            selectPeGender(p.gender || 'male');
            if (p.avatar) { _peAvatarData = p.avatar; av.innerHTML = '<img src="' + p.avatar + '" alt=""><div class="chat-pe-avatar-hint">更换头像</div>'; }
        }
    }
    panel.classList.add('show');
}
function closePersonaEditor() {
    var p = document.getElementById('chatPersonaEditor'); if (p) p.classList.remove('show');
    _peEditingId = null; _peAvatarData = '';
}
function selectPeGender(g) {
    document.querySelectorAll('.chat-pe-gender-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-gender') === g); });
}
function getSelectedPeGender() {
    var a = document.querySelector('.chat-pe-gender-btn.active');
    return a ? a.getAttribute('data-gender') : 'male';
}
function triggerPeAvatarUpload() { document.getElementById('peAvatarFile').click(); }
function handlePeAvatarFile(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            _peAvatarData = c;
            document.getElementById('peAvatarPreview').innerHTML = '<img src="' + c + '" alt=""><div class="chat-pe-avatar-hint">更换头像</div>';
            showToast('头像已设置');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}
function savePersona() {
    var name = document.getElementById('peName').value.trim();
    if (!name) { showToast('请输入角色名字'); return; }
    var nickname = document.getElementById('peNickname').value.trim();
    var signature = document.getElementById('peSignature').value.trim();
    var gender = getSelectedPeGender();
    var detail = document.getElementById('peDetail').value.trim();
    if (_peEditingId) {
        var p = findPersona(_peEditingId);
        if (p) { p.name = name; p.nickname = nickname; p.signature = signature; p.gender = gender; p.detail = detail; if (_peAvatarData) p.avatar = _peAvatarData; }
        showToast('角色已更新');
    } else {
        var newId = genId();
        _chatPersonas.push({ id: newId, name: name, nickname: nickname, signature: signature, gender: gender, detail: detail, avatar: _peAvatarData });
        if (_chatPersonas.length === 1) { _chatActivePersonaId = newId; saveActivePersona(); }
        showToast('角色创建成功');
    }
    savePersonas(); closePersonaEditor(); renderProfilePage(); renderChatTab('me');
}
/* ================================================================
   创建AI聊天角色
   ================================================================ */
function openCreateRole(editId) {
    _chatEditingRoleId = editId || null; _crAvatarData = '';
    _crMountPersona = ''; _crMountWorldBook = []; _crMountSticker = [];
    var p = document.getElementById('chatCreateRole'); if (!p) return;
    document.getElementById('crName').value = '';
    document.getElementById('crNickname').value = '';
    document.getElementById('crDetail').value = '';
    // ★ 动态填充分组选项（排除固定分组）
    var crGroupSel = document.getElementById('crGroup');
    crGroupSel.innerHTML = ''; // 清空
    var roleGroups = getRoleGroupOptions();
    for (var rgi = 0; rgi < roleGroups.length; rgi++) {
        var opt = document.createElement('option');
        opt.value = roleGroups[rgi];
        opt.textContent = roleGroups[rgi];
        crGroupSel.appendChild(opt);
    }
    document.getElementById('crGroup').value = '默认';
    document.getElementById('crCustomGroup').value = '';
    document.getElementById('crNotify').checked = true;
    document.getElementById('crBgMsg').checked = false;
    document.getElementById('crMemory').value = 20;
    updateMemoryDisplay();
    selectRoleGender('male');
    updateMountDisplay('persona', ''); updateMountDisplay('worldbook', '未选择'); updateMountDisplay('sticker', '');
    var av = document.getElementById('crAvatarPreview');
    av.innerHTML = SVG_USER + '<div class="chat-cr-avatar-hint">上传头像</div>';
    if (editId) {
        var r = findRole(editId);
        if (r) {
            document.getElementById('crName').value = r.name || '';
            document.getElementById('crNickname').value = r.nickname || '';
            document.getElementById('crDetail').value = r.detail || '';
            document.getElementById('crGroup').value = r.group || '默认';
            document.getElementById('crNotify').checked = r.notify !== false;
            document.getElementById('crBgMsg').checked = !!r.bgMsg;
            document.getElementById('crMemory').value = r.memory || 20;
            updateMemoryDisplay(); selectRoleGender(r.gender || 'male');
            _crMountPersona = r.personaId || ''; _crMountWorldBook = r.worldBookIds || (r.worldBookId ? [r.worldBookId] : []); _crMountSticker = r.stickerIds || (r.stickerId ? [r.stickerId] : []);
            var pn = findPersona(_crMountPersona);
            var wbNames = []; for (var wi = 0; wi < _crMountWorldBook.length; wi++) { var _wb = findWorldBook(_crMountWorldBook[wi]); if (_wb) wbNames.push(_wb.name); }
            var skNames = []; for (var si = 0; si < _crMountSticker.length; si++) { var _sk = findStickerPack(_crMountSticker[si]); if (_sk) skNames.push(_sk.name); }
            updateMountDisplay('persona', pn ? pn.name : ''); updateMountDisplay('worldbook', wbNames.length ? wbNames.join(', ') : ''); updateMountDisplay('sticker', skNames.length ? skNames.join(', ') : '');
            if (r.avatar) { _crAvatarData = r.avatar; av.innerHTML = '<img src="' + r.avatar + '" alt=""><div class="chat-cr-avatar-hint">更换头像</div>'; }
            var gs = document.getElementById('crGroup'); var ex = false;
            for (var oi = 0; oi < gs.options.length; oi++)if (gs.options[oi].value === r.group) { ex = true; break; }
            if (!ex && r.group) { var op = document.createElement('option'); op.value = r.group; op.textContent = r.group; gs.appendChild(op); gs.value = r.group; }
        }
    }
    p.classList.add('show');
}
function closeCreateRole() {
    var p = document.getElementById('chatCreateRole'); if (p) p.classList.remove('show');
    _chatEditingRoleId = null; _crAvatarData = ''; closeMountModal();
}
function selectRoleGender(g) {
    document.querySelectorAll('#chatCreateRole .chat-cr-gender-btn').forEach(function (b) { b.classList.toggle('active', b.getAttribute('data-gender') === g); });
}
function getSelectedGender() {
    var a = document.querySelector('#chatCreateRole .chat-cr-gender-btn.active');
    return a ? a.getAttribute('data-gender') : 'male';
}
function updateMemoryDisplay() {
    document.getElementById('crMemoryVal').textContent = document.getElementById('crMemory').value + '轮';
}
function addCustomGroup() {
    var inp = document.getElementById('crCustomGroup'); var nm = inp.value.trim();
    if (!nm) { showToast('请输入分组名'); return; }
    // 不允许使用固定分组名
    if (FIXED_CONTACT_GROUPS.indexOf(nm) !== -1) {
        showToast('"' + nm + '"是系统分组，不可在此选择');
        return;
    }
    if (nm === '全部') { showToast('该名称为保留名'); return; }
    var sel = document.getElementById('crGroup');
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === nm) { sel.value = nm; inp.value = ''; showToast('已选择: ' + nm); return; }
    // 同步到统一分组列表
    if (_contactGroups.indexOf(nm) === -1) { _contactGroups.push(nm); saveContactGroups(); }
    var op = document.createElement('option'); op.value = nm; op.textContent = nm; sel.appendChild(op); sel.value = nm; inp.value = ''; showToast('已添加分组: ' + nm);
}
function triggerRoleAvatarUpload() { document.getElementById('crAvatarFile').click(); }
function handleRoleAvatarFile(e) {
    var f = e.target.files[0]; if (!f) return; showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) { smartCompress(ev.target.result, 5, function (c) { _crAvatarData = c; document.getElementById('crAvatarPreview').innerHTML = '<img src="' + c + '" alt=""><div class="chat-cr-avatar-hint">更换头像</div>'; showToast('头像已设置'); }); };
    rd.readAsDataURL(f); e.target.value = '';
}

/* ========== 导入角色（JSON 角色卡） ========== */
function triggerImportRole() {
    closeChatMenu();
    document.getElementById('importRoleFile').click();
}

function handleImportRoleFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    showToast('正在解析角色文件...');

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var json = JSON.parse(e.target.result);
            var parsed = parseCharacterCard(json);
            if (!parsed.name) {
                showToast('未能识别角色名，请检查文件格式');
                return;
            }
            fillCreateRoleFromImport(parsed);
            showToast('角色已导入，请检查并保存');
        } catch (err) {
            showToast('文件解析失败：' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ---- 万能角色卡解析：兼容 SillyTavern V1/V2、TavernAI、CAI、Kobold 等 ---- */
function parseCharacterCard(json) {
    var result = { name: '', nickname: '', gender: '', detail: '', greeting: '', scenario: '', personality: '', avatar: '' };

    // ★ SillyTavern V2 格式: { spec: "chara_card_v2", data: { ... } }
    if (json.spec && json.data) {
        json = json.data;
    }

    // ★ Character.AI 导出格式: { character: { ... } }
    if (json.character && typeof json.character === 'object') {
        json = json.character;
    }

    // ★ 包了一层 char 的格式
    if (json.char && typeof json.char === 'object') {
        json = json.char;
    }

    // ★ 某些导出会把角色放在数组里
    if (Array.isArray(json) && json.length > 0) {
        json = json[0];
    }

    // ★ 兼容 Backyard AI 等格式: { aiCharacter: { ... } }
    if (json.aiCharacter && typeof json.aiCharacter === 'object') {
        json = json.aiCharacter;
    }

    // ★ 兼容 Chub.ai 格式: { fullPath, ... node: { ... } }
    if (json.node && typeof json.node === 'object' && json.node.definition) {
        json = json.node;
    }

    // ---------- 提取字段 ----------

    // 名字
    result.name = json.name || json.char_name || json.character_name || '';

    // 昵称（显示名）
    result.nickname = json.nickname || json.display_name || '';

    // 头像
    result.avatar = json.avatar || '';
    if (!result.avatar && json.image) {
        // 有些格式用 image 字段（可能是 URL 或 base64）
        result.avatar = json.image;
    }

    // 性格/人格
    result.personality = json.personality || json.char_persona || '';

    // 场景
    result.scenario = json.scenario || '';

    // 第一条消息（开场白）
    result.greeting = json.first_mes || json.firstMes || json.first_message
        || json.greeting || json.char_greeting || '';

    // ★ 主描述/详细信息 — 这是最核心的字段，兼容多种命名
    var desc = json.description || json.desc || json.char_description || '';
    var definition = json.definition || json.definitions || '';
    var mes_example = json.mes_example || json.example_dialogue
        || json.mes_examples || json.sampleChat || '';
    var system_prompt = json.system_prompt || json.systemPrompt || '';
    var post_hist = json.post_history_instructions || '';
    var creator_notes = json.creator_notes || json.creatorNotes || '';

    // ★ V2 扩展字段
    if (json.extensions && typeof json.extensions === 'object') {
        // 有些 V2 卡把额外信息放在 extensions
    }

    // ★ 拼接为完整的详细信息
    var detailParts = [];

    if (desc) detailParts.push('【描述】\n' + desc);
    if (result.personality) detailParts.push('【性格】\n' + result.personality);
    if (result.scenario) detailParts.push('【场景】\n' + result.scenario);
    if (definition) detailParts.push('【定义】\n' + definition);
    if (system_prompt) detailParts.push('【系统提示】\n' + system_prompt);
    if (post_hist) detailParts.push('【后续指令】\n' + post_hist);
    if (mes_example) detailParts.push('【对话示例】\n' + mes_example);
    if (result.greeting) detailParts.push('【开场白】\n' + result.greeting);
    if (creator_notes) detailParts.push('【创作者备注】\n' + creator_notes);

    // 如果只有一个字段（比如只有 description），就不加标签前缀
    if (detailParts.length === 1) {
        result.detail = (desc || definition || result.personality || result.greeting || '').trim();
    } else {
        result.detail = detailParts.join('\n\n');
    }

    // 如果完全没提取到 detail，试试看有没有 rawContent / content / bio 之类的兜底字段
    if (!result.detail) {
        result.detail = json.content || json.rawContent || json.bio || json.prompt || '';
    }

    // ★ 性别推断
    result.gender = guessGender(json, result);

    return result;
}

/* ---- 性别推断（尽量猜，猜不到默认 male） ---- */
function guessGender(json, parsed) {
    // 直接有 gender 字段
    var g = json.gender || json.char_gender || '';
    if (g) {
        g = g.toLowerCase();
        if (g.indexOf('female') !== -1 || g.indexOf('女') !== -1 || g === 'f') return 'female';
        if (g.indexOf('male') !== -1 || g.indexOf('男') !== -1 || g === 'm') return 'male';
        return 'other';
    }
    // 从描述中简单推断
    var text = (parsed.detail + ' ' + parsed.name + ' ' + (parsed.personality || '')).toLowerCase();
    if (text.indexOf('她') !== -1 || text.indexOf('女') !== -1 || text.indexOf(' she ') !== -1 || text.indexOf(' her ') !== -1) return 'female';
    if (text.indexOf('他') !== -1 || text.indexOf('男') !== -1 || text.indexOf(' he ') !== -1 || text.indexOf(' him ') !== -1) return 'male';
    return 'male';
}

/* ---- 将解析结果填入创建角色页面 ---- */
function fillCreateRoleFromImport(parsed) {
    // 打开创建角色页面（非编辑模式）
    openCreateRole();

    // 填入字段
    var nameEl = document.getElementById('crName');
    var nickEl = document.getElementById('crNickname');
    var detailEl = document.getElementById('crDetail');

    if (nameEl) nameEl.value = parsed.name || '';
    if (nickEl) nickEl.value = parsed.nickname || parsed.name || '';
    if (detailEl) detailEl.value = parsed.detail || '';

    // 性别
    selectRoleGender(parsed.gender || 'male');

    // 头像（如果有 base64 或 URL）
    if (parsed.avatar) {
        var av = parsed.avatar;
        // 如果是相对路径或不完整的 base64，忽略
        if (av.startsWith('data:') || av.startsWith('http://') || av.startsWith('https://')) {
            _crAvatarData = av;
            var avEl = document.getElementById('crAvatarPreview');
            if (avEl) avEl.innerHTML = '<img src="' + av + '" alt=""><div class="chat-cr-avatar-hint">更换头像</div>';
        }
    }
}

/* ========== 挂载 ========== */
function updateMountDisplay(type, name) {
    var el = document.getElementById('crMount_' + type + '_val'); if (!el) return;
    if (name) { el.textContent = name; el.classList.add('active'); }
    else { el.textContent = '未选择'; el.classList.remove('active'); }
}
/* ========== 构建表情包挂载列表（紧凑模式，不显示缩略图） ========== */
function buildStickerMountList(selectedIds) {
    var selArr = Array.isArray(selectedIds) ? selectedIds : [];

    // 从 ds_sticker_groups（表情包管理）读取
    var stkGroups = [];
    try { stkGroups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { stkGroups = []; }

    // 兼容旧的 ds_chat_stickers
    var oldPacks = [];
    try { oldPacks = JSON.parse(localStorage.getItem('ds_chat_stickers') || '[]'); } catch (e) { oldPacks = []; }

    var h = '';

    // ★ 分组筛选条（2个以上分组时显示）
    if (stkGroups.length >= 2) {
        h += '<div class="chat-mount-group-filter" id="stkMountGroupFilter">';
        h += '<div class="chat-mount-group-tag' + (_stkMountGroupFilter === '全部' ? ' active' : '') + '" onclick="filterStkMountGroup(\'全部\')">全部</div>';
        for (var gi = 0; gi < stkGroups.length; gi++) {
            var gn = stkGroups[gi].name || '未命名分组';
            h += '<div class="chat-mount-group-tag' + (_stkMountGroupFilter === gn ? ' active' : '') + '" onclick="filterStkMountGroup(\'' + esc(gn).replace(/'/g, "\\'") + '\')">' + esc(gn) + '</div>';
        }
        h += '</div>';
    }

    // "不挂载" 选项
    h += '<div class="chat-mount-option' + (!selArr.length ? ' selected' : '') + '" onclick="toggleStkMountOption(\'\')">';
    h += '<div class="chat-mount-option-name" style="color:var(--chat-text-hint)">不挂载</div>';
    h += '<div class="chat-mount-option-check">' + (!selArr.length ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';

    var currentFilter = _stkMountGroupFilter || '全部';
    var hasItems = false;
    var hasFiltered = false;

    for (var gi = 0; gi < stkGroups.length; gi++) {
        var grp = stkGroups[gi];
        var gName = grp.name || '未命名分组';
        var grpId = grp.id || ('sg_' + gi);
        var stkCount = grp.stickers ? grp.stickers.length : 0;

        hasItems = true;
        if (currentFilter !== '全部' && gName !== currentFilter) continue;
        if (stkCount === 0) continue;
        hasFiltered = true;

        var sel = selArr.indexOf(grpId) !== -1;

        // 分组标题（多分组时显示）
        if (stkGroups.length >= 2) {
            h += '<div class="chat-mount-group-header">' + esc(gName) + '</div>';
        }

        // ★ 紧凑模式：只显示名称和数量，不显示缩略图
        h += '<div class="chat-mount-option' + (sel ? ' selected' : '') + '" onclick="toggleStkMountOption(\'' + grpId + '\')">';
        h += '<div class="chat-mount-option-name">' + esc(gName) + ' <span style="font-size:11px;color:#999;">(' + stkCount + '张)</span></div>';
        h += '<div class="chat-mount-option-check">' + (sel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';
    }

    // 兼容旧的 ds_chat_stickers
    if (oldPacks.length) {
        if (hasFiltered && stkGroups.length >= 2) {
            h += '<div class="chat-mount-group-header">手动创建</div>';
        }
        for (var oi = 0; oi < oldPacks.length; oi++) {
            var op = oldPacks[oi];
            var opSel = selArr.indexOf(op.id) !== -1;
            h += '<div class="chat-mount-option' + (opSel ? ' selected' : '') + '" onclick="toggleStkMountOption(\'' + op.id + '\')">';
            h += '<div class="chat-mount-option-name">' + esc(op.name) + ' <span style="font-size:11px;color:#999;">(' + (op.urls ? op.urls.length : 0) + '张)</span></div>';
            h += '<div class="chat-mount-option-check">' + (opSel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';
            hasItems = true;
            hasFiltered = true;
        }
    }

    // 空状态
    if (!hasItems) {
        h += '<div style="text-align:center;padding:30px 10px;font-size:12px;color:rgba(120,100,110,0.5);line-height:1.8;">暂无表情包<br>请先到「我」→「表情包管理」中上传表情</div>';
    } else if (!hasFiltered) {
        h += '<div style="text-align:center;padding:20px 10px;font-size:12px;color:rgba(120,100,110,0.5);">该分组下暂无表情</div>';
    }

    return h;
}

/* ★ 分组筛选切换 */
function filterStkMountGroup(groupName) {
    _stkMountGroupFilter = groupName;
    // 重新渲染列表区域
    var modal = document.getElementById('chatMountModal');
    if (!modal) return;
    var body = modal.querySelector('.chat-mount-panel-body');
    if (!body) return;
    body.innerHTML = buildStickerMountList(_crMountSticker);
}

function openMountSelector(type) {
    var overlay = document.getElementById('chatAppOverlay'); if (!overlay) return;
    closeMountModal();
    var title, items, selectedId;
    if (type === 'persona') { title = '选择人设'; items = _chatPersonas; selectedId = _crMountPersona; }
    else if (type === 'worldbook') { title = '选择世界书（多选）'; items = _chatWorldBookLib; selectedId = _crMountWorldBook; }
    else if (type === 'sticker') { title = '选择表情包（多选）'; items = _chatStickerLib; selectedId = _crMountSticker; }
    var h = '<div class="chat-mount-modal show" id="chatMountModal" onclick="if(event.target===this)closeMountModal()">';
    h += '<div class="chat-mount-panel"><div class="chat-mount-panel-header"><div class="chat-mount-panel-title">' + title + '</div>';
    h += '<div class="chat-mount-panel-close" onclick="closeMountModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
    h += '<div class="chat-mount-panel-body">';
    if (type === 'worldbook') {
        if (typeof buildWorldBookMountList === 'function') {
            h += buildWorldBookMountList(selectedId);
        } else {
            var selArr = Array.isArray(selectedId) ? selectedId : [];
            h += '<div class="chat-mount-option' + (!selArr.length ? ' selected' : '') + '" onclick="toggleWbMountOption(\'\')"><div class="chat-mount-option-name" style="color:var(--chat-text-hint)">不挂载</div><div class="chat-mount-option-check">' + (!selArr.length ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';
            for (var i = 0; i < items.length; i++) { var it = items[i], sel = selArr.indexOf(it.id) !== -1; h += '<div class="chat-mount-option' + (sel ? ' selected' : '') + '" onclick="toggleWbMountOption(\'' + it.id + '\')"><div class="chat-mount-option-name">' + esc(it.name) + '</div><div class="chat-mount-option-check">' + (sel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>'; }
        }
        h += '</div>';
        h += '<div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="confirmWbMount()">确定</div><div class="chat-mount-confirm-btn" onclick="openMountCreator(\'worldbook\')" style="margin-left:8px">+ 新建</div></div>';
    } else if (type === 'sticker') {
        // ★ 表情包多选 — 支持分组筛选
        _stkMountGroupFilter = '全部';
        h += buildStickerMountList(selectedId);
        h += '</div>';
        h += '<div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="confirmStkMount()">确定</div><div class="chat-mount-confirm-btn" onclick="openMountCreator(\'sticker\')" style="margin-left:8px">+ 新建</div></div>';
    } else {
        h += '<div class="chat-mount-option' + (selectedId === '' ? ' selected' : '') + '" onclick="selectMountOption(\'' + type + '\',\'\')">' + '<div class="chat-mount-option-name" style="color:var(--chat-text-hint)">不挂载</div>' + '<div class="chat-mount-option-check">' + (selectedId === '' ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>';
        if (!items.length) { h += '<div class="chat-mount-empty">暂无可选项</div>'; }
        else { for (var i = 0; i < items.length; i++) { var it = items[i], sel = it.id === selectedId; h += '<div class="chat-mount-option' + (sel ? ' selected' : '') + '" onclick="selectMountOption(\'' + type + '\',\'' + it.id + '\')">' + '<div class="chat-mount-option-name">' + esc(it.name) + '</div>' + '<div class="chat-mount-option-check">' + (sel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</div></div>'; } }
        h += '</div>';
        if (type !== 'persona') { h += '<div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="openMountCreator(\'' + type + '\')">+ 新建</div></div>'; }
    }
    h += '</div></div>';
    overlay.insertAdjacentHTML('beforeend', h);
}
function closeMountModal() { var m = document.getElementById('chatMountModal'); if (m) m.remove(); }

function toggleWbMountOption(id) {
    if (!Array.isArray(_crMountWorldBook)) _crMountWorldBook = [];
    if (!id) {
        _crMountWorldBook = [];
    } else {
        var idx = _crMountWorldBook.indexOf(id);
        if (idx !== -1) _crMountWorldBook.splice(idx, 1);
        else _crMountWorldBook.push(id);
    }
    var modal = document.getElementById('chatMountModal');
    if (modal) {
        var opts = modal.querySelectorAll('.chat-mount-option');
        opts.forEach(function (el) {
            var onc = el.getAttribute('onclick') || '';
            var match = onc.match(/toggleWbMountOption\(['"](.*?)['"]\)/);
            if (match !== null) {
                var optId = match[1];
                var checkEl = el.querySelector('.chat-mount-option-check');
                if (!checkEl) return;
                if (!optId) {
                    var noneSelected = !_crMountWorldBook.length;
                    el.classList.toggle('selected', noneSelected);
                    checkEl.innerHTML = noneSelected ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '';
                } else {
                    var isSel = _crMountWorldBook.indexOf(optId) !== -1;
                    el.classList.toggle('selected', isSel);
                    checkEl.innerHTML = isSel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '';
                }
            }
        });
    }
}
function confirmWbMount() {
    var names = [];
    for (var i = 0; i < _crMountWorldBook.length; i++) {
        var wb = findWorldBook(_crMountWorldBook[i]);
        if (wb) names.push(wb.name);
    }
    updateMountDisplay('worldbook', names.length ? names.join(', ') : '');
    closeMountModal();
    if (window._mountFromSettings) {
        var role = findRole(_chatCurrentConv);
        if (role) {
            role.worldBookIds = _crMountWorldBook.slice();
            role.worldBookId = _crMountWorldBook[0] || '';
            saveChatRoles();
            showToast(names.length ? '已挂载 ' + names.length + ' 个世界书' : '已取消挂载');
        }
        window._mountFromSettings = false;
        closeChatSettingsPanel();
        openConversation(role.id);
        openChatSettings();
    }
}
function toggleStkMountOption(id) {
    if (!Array.isArray(_crMountSticker)) _crMountSticker = [];
    if (!id) {
        _crMountSticker = [];
    } else {
        var idx = _crMountSticker.indexOf(id);
        if (idx !== -1) _crMountSticker.splice(idx, 1);
        else _crMountSticker.push(id);
    }
    var modal = document.getElementById('chatMountModal');
    if (modal) {
        var opts = modal.querySelectorAll('.chat-mount-option');
        opts.forEach(function (el) {
            var onc = el.getAttribute('onclick') || '';
            // ★ 用更宽松的方式提取 id，兼容各种 id 格式
            var match = onc.match(/toggleStkMountOption\(['"](.*?)['"]\)/);
            if (match !== null) {
                var optId = match[1];
                var checkEl = el.querySelector('.chat-mount-option-check');
                if (!checkEl) return;
                if (!optId) {
                    // "不挂载" 选项
                    var noneSelected = !_crMountSticker.length;
                    el.classList.toggle('selected', noneSelected);
                    checkEl.innerHTML = noneSelected ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '';
                } else {
                    var isSel = _crMountSticker.indexOf(optId) !== -1;
                    el.classList.toggle('selected', isSel);
                    checkEl.innerHTML = isSel ? '<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>' : '';
                }
            }
        });
    }
}
function confirmStkMount() {
    // ★ 从两个数据源查找名称
    var stkGroups = [];
    try { stkGroups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { stkGroups = []; }

    var names = [];
    if (Array.isArray(_crMountSticker)) {
        for (var i = 0; i < _crMountSticker.length; i++) {
            var gId = _crMountSticker[i];
            var found = false;
            // 先从 ds_sticker_groups 找
            for (var g = 0; g < stkGroups.length; g++) {
                if (stkGroups[g].id === gId) { names.push(stkGroups[g].name); found = true; break; }
            }
            // 兼容旧的 _chatStickerLib
            if (!found) {
                var pack = findStickerPack(gId);
                if (pack) names.push(pack.name);
            }
        }
    }
    updateMountDisplay('sticker', names.length ? names.join(', ') : '');
    closeMountModal();

    if (window._mountFromSettings) {
        var role = findRole(_chatCurrentConv);
        if (role) {
            role.stickerIds = _crMountSticker.slice();
            role.stickerId = _crMountSticker[0] || '';
            saveChatRoles();
            showToast(names.length ? '已挂载 ' + names.length + ' 个表情包' : '已取消挂载');
        }
        window._mountFromSettings = false;
        closeChatSettingsPanel();
        openConversation(role.id);
        openChatSettings();
    }
}

function selectMountOption(type, id) {
    if (type === 'persona') {
        _crMountPersona = id;
    } else if (type === 'worldbook') {
        // 世界书是多选数组
        if (!Array.isArray(_crMountWorldBook)) _crMountWorldBook = [];
        if (!id) { _crMountWorldBook = []; }
        else {
            var wIdx = _crMountWorldBook.indexOf(id);
            if (wIdx !== -1) _crMountWorldBook.splice(wIdx, 1);
            else _crMountWorldBook.push(id);
        }
    } else if (type === 'sticker') {
        // 表情包是多选数组
        if (!Array.isArray(_crMountSticker)) _crMountSticker = [];
        if (!id) { _crMountSticker = []; }
        else {
            var sIdx = _crMountSticker.indexOf(id);
            if (sIdx !== -1) _crMountSticker.splice(sIdx, 1);
            else _crMountSticker.push(id);
        }
    }
    var name = '', item;
    if (id) { if (type === 'persona') item = findPersona(id); else if (type === 'worldbook') item = findWorldBook(id); else if (type === 'sticker') item = findStickerPack(id); if (item) name = item.name; }
    updateMountDisplay(type, name); closeMountModal();
}
function openMountCreator(type) {
    closeMountModal(); var title, p1, p2;
    if (type === 'worldbook') { title = '新建世界书'; p1 = '世界书名称'; p2 = '世界观设定、背景故事...'; }
    else if (type === 'sticker') { title = '新建表情包'; p1 = '表情包名称'; p2 = '每行一个表情包图片URL'; }
    var overlay = document.getElementById('chatAppOverlay');

    // ★ 表情包额外加一个分组选择
    var groupField = '';
    if (type === 'sticker') {
        // 收集已有分组名
        var existingGroups = {};
        for (var i = 0; i < _chatStickerLib.length; i++) {
            var g = _chatStickerLib[i].group;
            if (g) existingGroups[g] = true;
        }
        var groupOptions = '<option value="">未分组</option>';
        var gKeys = Object.keys(existingGroups);
        for (var i = 0; i < gKeys.length; i++) {
            groupOptions += '<option value="' + esc(gKeys[i]) + '">' + esc(gKeys[i]) + '</option>';
        }
        groupField = '<div class="chat-cr-field"><label>分组</label>'
            + '<select id="mountNewGroup" class="chat-cr-input" style="padding:8px;border-radius:10px;">' + groupOptions + '</select>'
            + '<div style="display:flex;gap:6px;margin-top:6px;">'
            + '<input type="text" id="mountNewGroupCustom" class="chat-cr-input" placeholder="或输入新分组名" style="flex:1">'
            + '<div class="chat-mount-confirm-btn" onclick="addMountNewGroupOption()" style="white-space:nowrap;padding:6px 12px;font-size:12px;">添加</div>'
            + '</div></div>';
    }

    var h = '<div class="chat-mount-modal show" id="chatMountModal" onclick="if(event.target===this)closeMountModal()">'
        + '<div class="chat-mount-panel"><div class="chat-mount-panel-header"><div class="chat-mount-panel-title">' + title + '</div>'
        + '<div class="chat-mount-panel-close" onclick="closeMountModal()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>'
        + '<div class="chat-mount-panel-body" style="padding:14px">'
        + '<div class="chat-cr-field"><label>名称</label><input type="text" id="mountNewName" class="chat-cr-input" placeholder="' + p1 + '"></div>'
        + groupField
        + '<div class="chat-cr-field"><label>内容</label><textarea id="mountNewContent" class="chat-cr-textarea" rows="5" placeholder="' + p2 + '"></textarea></div>'
        + '</div>'
        + '<div class="chat-mount-panel-footer"><div class="chat-mount-confirm-btn" onclick="saveMountNew(\'' + type + '\')">保存</div></div>'
        + '</div></div>';
    overlay.insertAdjacentHTML('beforeend', h);
}

// ★ 新分组名添加到下拉框
function addMountNewGroupOption() {
    var inp = document.getElementById('mountNewGroupCustom');
    var sel = document.getElementById('mountNewGroup');
    if (!inp || !sel) return;
    var nm = inp.value.trim();
    if (!nm) { showToast('请输入分组名'); return; }
    // 检查是否已存在
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value === nm) { sel.value = nm; inp.value = ''; showToast('已选择: ' + nm); return; }
    }
    var op = document.createElement('option'); op.value = nm; op.textContent = nm;
    sel.appendChild(op); sel.value = nm; inp.value = '';
    showToast('已添加分组: ' + nm);
}

function saveMountNew(type) {
    var name = document.getElementById('mountNewName').value.trim();
    var content = document.getElementById('mountNewContent').value.trim();
    if (!name) { showToast('请输入名称'); return; }
    var id = genId();
    if (type === 'worldbook') {
        _chatWorldBookLib.push({ id: id, name: name, content: content, inject: 'before' });
        // ★ 同步回世界书 App
        try {
            var appData = JSON.parse(localStorage.getItem('ds_worldbook_data') || '[]');
            appData.push({ id: id, name: name, content: content, inject: 'before', group: '默认', keywords: '', type: 'global', enabled: true });
            localStorage.setItem('ds_worldbook_data', JSON.stringify(appData));
        } catch (ex) { }
        saveWorldBookLib();
        if (!Array.isArray(_crMountWorldBook)) _crMountWorldBook = [];
        _crMountWorldBook.push(id);
    } else if (type === 'sticker') {
        var urls = content ? content.split('\n').map(function (s) { return s.trim(); }).filter(Boolean) : [];
        // ★ 读取分组
        var groupSel = document.getElementById('mountNewGroup');
        var group = groupSel ? groupSel.value : '';
        _chatStickerLib.push({ id: id, name: name, urls: urls, group: group });
        saveStickerLib();
        if (!Array.isArray(_crMountSticker)) _crMountSticker = [];
        _crMountSticker.push(id);
    }
    if (type === 'sticker') {
        var _skn = []; for (var _si = 0; _si < _crMountSticker.length; _si++) { var _skp = findStickerPack(_crMountSticker[_si]); if (_skp) _skn.push(_skp.name); }
        updateMountDisplay('sticker', _skn.length ? _skn.join(', ') : '');
    } else {
        updateMountDisplay(type, name);
    }
    closeMountModal(); showToast('已创建: ' + name);
}

/* ========== 保存AI角色 ========== */
function saveRole() {
    var name = document.getElementById('crName').value.trim(); if (!name) { showToast('请输入角色名字'); return; }
    var nickname = document.getElementById('crNickname').value.trim(), gender = getSelectedGender(), detail = document.getElementById('crDetail').value.trim(), group = document.getElementById('crGroup').value, notify = document.getElementById('crNotify').checked, bgMsg = document.getElementById('crBgMsg').checked, memory = parseInt(document.getElementById('crMemory').value) || 20;
    if (_chatEditingRoleId) { var r = findRole(_chatEditingRoleId); if (r) { r.name = name; r.nickname = nickname; r.gender = gender; r.detail = detail; r.group = group; r.personaId = _crMountPersona; r.boundPersonaId = _crMountPersona; r.worldBookIds = Array.isArray(_crMountWorldBook) ? _crMountWorldBook.slice() : []; r.worldBookId = r.worldBookIds[0] || ''; r.stickerIds = Array.isArray(_crMountSticker) ? _crMountSticker.slice() : []; r.stickerId = r.stickerIds[0] || ''; r.notify = notify; r.bgMsg = bgMsg; r.memory = memory; if (_crAvatarData) r.avatar = _crAvatarData; } showToast('角色已更新'); }
    else { var _wbIds = Array.isArray(_crMountWorldBook) ? _crMountWorldBook.slice() : []; var _skIds = Array.isArray(_crMountSticker) ? _crMountSticker.slice() : []; _chatRoles.push({ id: genId(), name: name, nickname: nickname, gender: gender, detail: detail, group: group, personaId: _crMountPersona, boundPersonaId: _crMountPersona, worldBookIds: _wbIds, worldBookId: _wbIds[0] || '', stickerIds: _skIds, stickerId: _skIds[0] || '', notify: notify, bgMsg: bgMsg, memory: memory, avatar: _crAvatarData, msgs: [], lastMsg: '', lastTime: 0, lastTimeStr: '', unread: 0 }); showToast('角色创建成功'); }
    saveChatRoles(); closeCreateRole(); renderChatTab(_chatCurrentTab);
}

/* ========== 右键菜单 ========== */
function showRoleContextMenu(ev, rid) {
    removeContextMenu(); var overlay = document.getElementById('chatAppOverlay'); var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top; if (x + 140 > rect.width) x = rect.width - 150; if (y + 120 > rect.height) y = rect.height - 130;
    var m = document.createElement('div'); m.className = 'chat-ctx-menu'; m.id = 'chatCtxMenu'; m.style.position = 'absolute'; m.style.left = x + 'px'; m.style.top = y + 'px';
    m.innerHTML = '<div class="chat-ctx-menu-item" onclick="editRole(\'' + rid + '\');removeContextMenu()">编辑角色</div><div class="chat-ctx-menu-item" onclick="clearRoleMsgs(\'' + rid + '\');removeContextMenu()">清空聊天</div><div class="chat-ctx-menu-item danger" onclick="deleteRole(\'' + rid + '\');removeContextMenu()">删除角色</div>';
    overlay.appendChild(m); setTimeout(function () { document.addEventListener('click', removeContextMenu, { once: true }); }, 10);
}
function removeContextMenu() { var m = document.getElementById('chatCtxMenu'); if (m) m.remove(); }
function editRole(id) { openCreateRole(id); }
function clearRoleMsgs(id) { var r = findRole(id); if (!r) return; r.msgs = []; r.lastMsg = ''; r.lastTime = 0; r.lastTimeStr = ''; r.unread = 0; saveChatRoles(); renderChatTab(_chatCurrentTab); showToast('聊天已清空'); }
function deleteRole(id) { _chatRoles = _chatRoles.filter(function (r) { return r.id !== id; }); saveChatRoles(); renderChatTab(_chatCurrentTab); showToast('角色已删除'); }

/* ================================================================
   对话页 — 完全重构
   ================================================================ */
function openConversation(rid) {
    var role = findRole(rid); if (!role) return;
    _chatCurrentConv = rid; role.unread = 0; saveChatRoles();
    _chatMultiSelectMode = false; _chatMultiSelected = []; _chatQuoteData = null;

    var conv = document.getElementById('chatConversation'); if (!conv) return;
    var dn = esc(role.nickname || role.name);
    var customLabel = role.customLabel || '';
    var ap = getActivePersona();
    var myAv = ap && ap.avatar ? ap.avatar : '';
    var roleAv = role.avatar || '';

    _convLeftAvatar = roleAv;
    _convRightAvatar = myAv;

    var h = '';
    // 顶栏
    h += '<div class="chat-conv-topbar">';
    h += '<div class="chat-conv-topbar-row">';
    h += '<div class="chat-conv-back" onclick="closeChatConversation()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="chat-conv-topbar-spacer"></div>';
    h += '<div class="chat-conv-more" onclick="openChatSettings()"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></div>';
    h += '</div>';

    // 双头像 + 爱心
    h += '<div class="chat-conv-avatars">';
    h += '<div class="chat-conv-av-box" onclick="triggerConvAvatar(\'left\')">';
    h += roleAv ? '<img src="' + roleAv + '" id="convAvLeft" alt="">' : SVG_USER;
    h += '</div>';
    h += '<div class="chat-conv-heart"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg></div>';
    h += '<div class="chat-conv-av-box" onclick="triggerConvAvatar(\'right\')">';
    h += myAv ? '<img src="' + myAv + '" id="convAvRight" alt="">' : SVG_USER;
    h += '</div></div>';

    // 名称 + 自定义标签
    h += '<div class="chat-conv-name-wrap">';
    h += '<div class="chat-conv-name">' + dn + '</div>';
    h += '<div class="chat-conv-subtitle">' + esc(customLabel || '正在聊天中') + '</div>';
    h += '</div></div>';

    // 消息体
    h += '<div class="chat-conv-body" id="chatConvBody">';
    var msgs = role.msgs || [];
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (i === 0 || (i > 0 && msgs[i].time !== msgs[i - 1].time))
            h += '<div class="chat-bubble-time-center">' + m.time + '</div>';
        if (m.recalled) {
            h += '<div class="chat-bubble-recalled">' + (m.from === 'self' ? '你' : esc(role.nickname || role.name)) + ' 撤回了一条消息</div>';
            continue;
        }
        // ★ 人设变更提示条（居中小字提示）
        if (m.personaChange) {
            h += '<div class="chat-bubble-persona-change">';
            h += '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ';
            h += '身份切换为「' + esc(m.newPersonaName || '默认') + '」';
            h += '</div>';
            continue;
        }
        h += renderBubbleRow(m, i, myAv, roleAv);
    }
    h += '</div>';

    // 底栏
    h += '<div class="chat-conv-bottombar">';
    // 工具栏
    h += '<div class="chat-conv-toolbar">';
    // 语音（文字转语音条）
    h += '<div class="chat-conv-tool" onclick="openVoiceInput()">';
    h += '<svg viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    h += '<span>语音</span></div>';
    // 相机 — 真实拍照
    h += '<div class="chat-conv-tool" onclick="chatPickCamera()"><svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg><span>相机</span></div>';
    // 相册 — 真实选图
    h += '<div class="chat-conv-tool" onclick="chatPickAlbum()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>相册</span></div>';
    h += '<div class="chat-conv-tool" onclick="openTransferPanel()"><svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>转账</span></div>';
    h += '<div class="chat-conv-tool" onclick="openGiftShop()"><svg viewBox="0 0 24 24"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg><span>礼物</span></div>';
    h += '<div class="chat-conv-tool" onclick="openLocationPanel()"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>定位</span></div>';
    h += '</div>';

    // 引用预览条
    h += '<div class="chat-conv-quote-bar" id="chatQuoteBar" style="display:none"><div class="chat-conv-quote-bar-text" id="chatQuoteBarText"></div><div class="chat-conv-quote-bar-close" onclick="clearQuote()">✕</div></div>';

    // 图片预览条
    h += '<div class="chat-conv-image-preview-bar" id="chatImagePreviewBar" style="display:none"><img id="chatImagePreviewThumb" src="" alt=""><div class="chat-conv-image-preview-text">图片已选择，点击发送</div><div class="chat-conv-image-preview-close" onclick="clearPendingImage()">✕</div></div>';

    // 多选工具栏
    h += '<div class="chat-conv-multiselect-bar" id="chatMultiBar" style="display:none"><div class="chat-conv-multi-info" id="chatMultiInfo">已选 0 条</div><div class="chat-conv-multi-actions"><div class="chat-conv-multi-btn danger" onclick="multiDeleteMsgs()">删除选中</div><div class="chat-conv-multi-btn" onclick="exitMultiSelect()">取消</div></div></div>';

    // 输入行 — 续写在左，发送在右
    h += '<div class="chat-conv-input-row" id="chatInputRow">';
    h += '<div class="chat-conv-action-btn" onclick="toggleStickerPanel()" title="表情包"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div>';
    h += '<input class="chat-conv-input" id="chatConvInput" type="text" placeholder="说点什么..." onkeydown="if(event.key===\'Enter\'){sendChatMessage();event.preventDefault();}">';
    // 续写键
    h += '<div class="chat-conv-action-btn send-btn" onclick="continueChat()" title="续写"><svg viewBox="0 0 24 24"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg></div>';
    // 发送键
    h += '<div class="chat-conv-action-btn send-btn" onclick="sendChatMessage()" title="发送"><svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></div>';
    h += '</div>';
    h += '</div>'; // 关闭 bottombar
    // 表情包选择面板（移到 bottombar 外面）
    h += '<div class="chat-sticker-panel" id="chatStickerPanel"></div>';

    // 头像上传
    h += '<input type="file" id="convAvFileLeft" class="chat-conv-av-file" accept="image/*" onchange="handleConvAvFile(event,\'left\')">';
    h += '<input type="file" id="convAvFileRight" class="chat-conv-av-file" accept="image/*" onchange="handleConvAvFile(event,\'right\')">';
    // 隐藏的图片选择input
    h += '<input type="file" id="chatImagePickFile" style="display:none" accept="image/*" onchange="handleChatImagePick(event)">';
    h += '<input type="file" id="chatCameraPickFile" style="display:none" accept="image/*" capture="environment" onchange="handleChatImagePick(event)">';

    conv.innerHTML = h;
    conv.classList.add('show');
    // ★ 壁纸：先立即应用一次，再在 setTimeout 里补一次（双保险）
    var _wpData = loadWallpaper(rid);
    if (_wpData) {
        var _b = document.getElementById('chatConvBody');
        if (_b) applyConvWallpaper(_wpData);
    }
    setTimeout(function () {
        var b = document.getElementById('chatConvBody');
        if (b) {
            b.scrollTop = b.scrollHeight;
            // ★ 再次应用壁纸（确保 DOM 完全渲染后生效）
            var wp = loadWallpaper(rid);
            if (wp) applyConvWallpaper(wp);
        }
        if (typeof applyPendantToChat === 'function') {
            var pid = localStorage.getItem('ds_bf_pendant_active');
            if (pid) {
                try {
                    var pList = JSON.parse(localStorage.getItem('ds_bf_pendant_presets') || '[]');
                    for (var pi = 0; pi < pList.length; pi++) {
                        if (pList[pi].id === pid) { applyPendantToChat(pList[pi]); break; }
                    }
                } catch (e) { }
            }
        }
    }, 80);
}

/* 渲染单条气泡（统一入口，区分语音/文字/图片） */

function renderBubbleRow(m, idx, myAv, roleAv) {
    if (m.voice) return renderVoiceBubbleRow(m, idx, myAv, roleAv);
    if (m.image) return renderImageBubbleRow(m, idx, myAv, roleAv);
    if (m.sticker) return renderStickerBubbleRow(m, idx, myAv, roleAv);
    if (m.transfer) return renderTransferBubbleRow(m, idx, myAv, roleAv);
    if (m.novelCard) return renderNovelCardBubbleRow(m, idx, myAv, roleAv);
    if (m.location) return renderLocationBubbleRow(m, idx, myAv, roleAv);
    if (m.giftCard) return renderGiftCardBubbleRow(m, idx, myAv, roleAv);

    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }
    h += '<div class="chat-bubble">' + esc(m.text);
    // ★ 翻译功能：如果该消息有翻译内容，在气泡内虚线下方显示
    if (m.translation) {
        h += '<div class="chat-bubble-translate-divider"></div>';
        h += '<div class="chat-bubble-translate">' + esc(m.translation) + '</div>';
    }
    h += '</div>';
    // ★ 翻译中的加载提示
    if (m._translating) {
        h += '<div class="chat-bubble-translating">翻译中...</div>';
    }
    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* 渲染图片气泡 */
function renderImageBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }
    h += '<div class="chat-bubble chat-bubble-image" onclick="event.stopPropagation();previewChatImage(\'' + idx + '\')">';
    h += '<img src="' + m.imageData + '" alt="图片" style="max-width:200px;max-height:200px;border-radius:8px;cursor:pointer;display:block;">';
    h += '</div>';
    if (m.text && m.text !== '[图片]') {
        h += '<div class="chat-bubble" style="margin-top:4px;">' + esc(m.text) + '</div>';
    }
    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* 图片预览大图 */
function previewChatImage(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[parseInt(idx)];
    if (!m || !m.imageData) return;
    var conv = document.getElementById('chatConversation'); if (!conv) return;
    var h = '<div class="chat-image-fullscreen" id="chatImageFullscreen" onclick="closeChatImagePreview()">';
    h += '<img src="' + m.imageData + '" alt="">';
    h += '</div>';
    conv.insertAdjacentHTML('beforeend', h);
}
function closeChatImagePreview() {
    var el = document.getElementById('chatImageFullscreen'); if (el) el.remove();
}

function closeChatConversation() {
    var c = document.getElementById('chatConversation');
    if (c) { c.classList.remove('show'); setTimeout(function () { c.innerHTML = ''; }, 300); }
    _chatCurrentConv = null;
    _chatMultiSelectMode = false; _chatMultiSelected = []; _chatQuoteData = null;
    _pendingImageData = null;
    closeStickerPanel();
    closeChatSettingsPanel();
    if (_chatCurrentTab === 'messages') renderChatTab('messages');
}

/* 顶栏头像更换 */
function triggerConvAvatar(side) {
    var f = document.getElementById(side === 'left' ? 'convAvFileLeft' : 'convAvFileRight');
    if (f) f.click();
}
function handleConvAvFile(e, side) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            if (side === 'left') {
                _convLeftAvatar = c;
                var el = document.getElementById('convAvLeft');
                if (el) { el.src = c; }
                else { var box = document.querySelectorAll('.chat-conv-av-box')[0]; if (box) box.innerHTML = '<img src="' + c + '" id="convAvLeft" alt="">'; }
                var role = findRole(_chatCurrentConv);
                if (role) { role.avatar = c; saveChatRoles(); }
            } else {
                _convRightAvatar = c;
                var el2 = document.getElementById('convAvRight');
                if (el2) { el2.src = c; }
                else { var boxes = document.querySelectorAll('.chat-conv-av-box'); if (boxes[1]) boxes[1].innerHTML = '<img src="' + c + '" id="convAvRight" alt="">'; }
            }
            showToast('头像已更换');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}
/* ================================================================
   每角色独立人设切换系统
   ================================================================ */

function openConvPersonaSwitcher() {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var conv = document.getElementById('chatConversation');
    if (!conv) return;
    closeConvPersonaSwitcher();

    var currentBound = role.boundPersonaId || '';

    var h = '<div class="conv-persona-switcher-overlay" id="convPersonaSwitcherOverlay" onclick="if(event.target===this)closeConvPersonaSwitcher()">';
    h += '<div class="conv-persona-switcher-panel">';

    h += '<div class="conv-persona-switcher-header">';
    h += '<div class="conv-persona-switcher-title">为「' + esc(role.nickname || role.name) + '」选择人设</div>';
    h += '<div class="conv-persona-switcher-close" onclick="closeConvPersonaSwitcher()">';
    h += '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '</div></div>';
    h += '<div class="conv-persona-switcher-hint">每个角色独立绑定，互不影响</div>';

    h += '<div class="conv-persona-switcher-list">';

    // 使用全局默认
    var isDefault = !currentBound;
    var globalP = findPersona(_chatActivePersonaId);
    h += '<div class="conv-persona-switcher-item' + (isDefault ? ' active' : '') + '" onclick="bindPersonaToRole(\'\')">';
    h += '<div class="conv-persona-switcher-item-av-wrap">';
    if (globalP && globalP.avatar) {
        h += '<img src="' + globalP.avatar + '" class="conv-persona-switcher-item-av">';
    } else {
        h += '<div class="conv-persona-switcher-item-av-none">●</div>';
    }
    h += '</div>';
    h += '<div class="conv-persona-switcher-item-info"><div class="conv-persona-switcher-item-name">跟随全局' + (globalP ? '（' + esc(globalP.name) + '）' : '') + '</div>';
    h += '<div class="conv-persona-switcher-item-desc">使用个人主页选中的人设</div></div>';
    if (isDefault) h += '<div class="conv-persona-switcher-item-check">✓</div>';
    h += '</div>';

    // 遍历所有人设
    for (var i = 0; i < _chatPersonas.length; i++) {
        var p = _chatPersonas[i];
        var isActive = (p.id === currentBound);
        h += '<div class="conv-persona-switcher-item' + (isActive ? ' active' : '') + '" onclick="bindPersonaToRole(\'' + p.id + '\')">';
        h += '<div class="conv-persona-switcher-item-av-wrap">';
        if (p.avatar) {
            h += '<img src="' + p.avatar + '" class="conv-persona-switcher-item-av">';
        } else {
            h += '<div class="conv-persona-switcher-item-av-letter">' + (p.name || '?').charAt(0) + '</div>';
        }
        h += '</div>';
        h += '<div class="conv-persona-switcher-item-info">';
        h += '<div class="conv-persona-switcher-item-name">' + esc(p.name || '未命名') + '</div>';
        var desc = p.description || p.content || p.bio || '';
        h += '<div class="conv-persona-switcher-item-desc">' + esc(desc.substring(0, 40) || '无简介') + '</div>';
        h += '</div>';
        if (isActive) h += '<div class="conv-persona-switcher-item-check">✓</div>';
        h += '</div>';
    }

    if (_chatPersonas.length === 0) {
        h += '<div class="conv-persona-switcher-empty">还没有创建人设<br>请在「我的」→「人设」中创建</div>';
    }

    h += '</div></div></div>';

    conv.insertAdjacentHTML('beforeend', h);
    setTimeout(function () {
        var ov = document.getElementById('convPersonaSwitcherOverlay');
        if (ov) ov.classList.add('show');
    }, 10);
}

function closeConvPersonaSwitcher() {
    var el = document.getElementById('convPersonaSwitcherOverlay');
    if (el) el.remove();
}

function bindPersonaToRole(personaId) {
    var role = findRole(_chatCurrentConv);
    if (!role) return;

    var oldPersonaId = role.boundPersonaId || role.personaId || '';

    role.boundPersonaId = personaId || '';
    role.personaId = personaId || '';
    saveChatRoles();
    closeConvPersonaSwitcher();

    // 记录人设变更
    if (oldPersonaId !== (personaId || '')) {
        recordPersonaChange(role, oldPersonaId, personaId || '');
        // 追加变更提示到聊天区
        if (role.msgs && role.msgs.length > 0) {
            var lastMsg = role.msgs[role.msgs.length - 1];
            if (lastMsg.personaChange) {
                var body = document.getElementById('chatConvBody');
                if (body) {
                    var changeHtml = '<div class="chat-bubble-persona-change">';
                    changeHtml += '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ';
                    changeHtml += '身份切换为「' + esc(lastMsg.newPersonaName || '默认') + '」';
                    changeHtml += '</div>';
                    body.insertAdjacentHTML('beforeend', changeHtml);
                    body.scrollTop = body.scrollHeight;
                }
            }
        }
    }

    // ★ 局部刷新头像，不重建页面
    refreshUserAvatarInConv();

    var ap = getActivePersona();
    if (ap) {
        showToast('当前窗口切换为「' + ap.name + '」');
    } else {
        showToast('当前窗口已恢复全局人设');
    }
}

/* ================================================================
   相机 & 相册 — 真实图片发送系统
   ================================================================ */
function chatPickCamera() {
    var f = document.getElementById('chatCameraPickFile');
    if (f) f.click();
}
function chatPickAlbum() {
    var f = document.getElementById('chatImagePickFile');
    if (f) f.click();
}
function handleChatImagePick(e) {
    var f = e.target.files[0]; if (!f) return;
    if (!f.type.startsWith('image/')) { showToast('请选择图片文件'); return; }
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 30, function (compressed) {
            _pendingImageData = compressed;
            // 显示预览条
            var bar = document.getElementById('chatImagePreviewBar');
            var thumb = document.getElementById('chatImagePreviewThumb');
            if (bar) bar.style.display = 'flex';
            if (thumb) thumb.src = compressed;
            showToast('图片已选择，点击发送按钮发送');
        });
    };
    rd.readAsDataURL(f);
    e.target.value = '';
}
function clearPendingImage() {
    _pendingImageData = null;
    var bar = document.getElementById('chatImagePreviewBar');
    if (bar) bar.style.display = 'none';
}
/* ================================================================
   聊天设置面板（独立毛玻璃悬浮板块）
   ================================================================ */
function openChatSettings() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    closeChatSettingsPanel();

    var conv = document.getElementById('chatConversation'); if (!conv) return;

    var dn = esc(role.nickname || role.name);
    var roleAv = role.avatar || '';
    var customLabel = role.customLabel || '';
    var curGroup = role.group || '默认';

    var pn = role.personaId ? findPersona(role.personaId) : null;
    var _wbIds = role.worldBookIds || (role.worldBookId ? [role.worldBookId] : []);
    var _wbNames = []; for (var _wi = 0; _wi < _wbIds.length; _wi++) { var _wbi = findWorldBook(_wbIds[_wi]); if (_wbi) _wbNames.push(_wbi.name); }
    var wn = _wbNames.length ? { name: _wbNames.join(', ') } : null;
    var _skIds = role.stickerIds || (role.stickerId ? [role.stickerId] : []);
    var _skNames = []; for (var _si = 0; _si < _skIds.length; _si++) { var _ski = findStickerPack(_skIds[_si]); if (_ski) _skNames.push(_ski.name); }
    var sn = _skNames.length ? { name: _skNames.join(', ') } : null;

    // ★★★ 新增：读取记忆总结和时间感知状态
    var _memEnabled = role.memoryAutoEnabled || false;
    var _timeEnabled = role.timeAwareEnabled || false;
    var _timeZone = role.timeAwareZone || 'Asia/Shanghai';
    var _memSummaries = role.memorySummaries || [];
    var _memMsgCount = role.memoryMsgCount || 0;

    var h = '<div class="chat-settings-overlay show" id="chatSettingsOverlay" onclick="if(event.target===this)closeChatSettingsPanel()">';
    h += '<div class="chat-settings-panel">';

    // 标题栏
    h += '<div class="chat-settings-header">';
    h += '<div class="chat-settings-title">聊天设置</div>';
    h += '<div class="chat-settings-close" onclick="closeChatSettingsPanel()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="chat-settings-body">';

    // 头像
    h += '<div class="chat-settings-avatar-wrap" onclick="triggerSettingsAvatar()">';
    h += '<div class="chat-settings-avatar">' + (roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER) + '</div>';
    h += '<div class="chat-settings-avatar-hint">点击更换头像</div>';
    h += '</div>';
    h += '<input type="file" id="csAvatarFile" style="display:none" accept="image/*" onchange="handleSettingsAvatar(event)">';

    // 备注
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">备注名称</div>';
    h += '<input type="text" class="chat-settings-input" id="csNickname" value="' + esc(role.nickname || '') + '" placeholder="设置备注名">';
    h += '</div>';

    // 自定义标签
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">自定义标签</div>';
    h += '<input type="text" class="chat-settings-input" id="csCustomLabel" value="' + esc(customLabel) + '" placeholder="顶栏名称下方的小字描述">';
    h += '</div>';

    // 修改分组
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">修改分组</div>';
    h += '<select class="chat-settings-select" id="csGroup">';
    var csGroups = getRoleGroupOptions();
    for (var gi = 0; gi < csGroups.length; gi++) {
        h += '<option value="' + esc(csGroups[gi]) + '"' + (curGroup === csGroups[gi] ? ' selected' : '') + '>' + esc(csGroups[gi]) + '</option>';
    }
    var csGroupInList = false;
    for (var cgi = 0; cgi < csGroups.length; cgi++) { if (csGroups[cgi] === curGroup) { csGroupInList = true; break; } }
    if (!csGroupInList && curGroup) {
        h += '<option value="' + esc(curGroup) + '" selected>' + esc(curGroup) + '</option>';
    }
    h += '</select>';
    h += '<div class="chat-settings-custom-group">';
    h += '<input type="text" class="chat-settings-input" id="csCustomGroup" placeholder="自定义分组名">';
    h += '<div class="chat-settings-small-btn" onclick="addSettingsGroup()">添加</div>';
    h += '</div>';
    h += '</div>';

    // 修改角色信息
    h += '<div class="chat-settings-item" onclick="closeChatSettingsPanel();openCreateRole(\'' + role.id + '\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    h += '<span>修改角色信息</span>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载世界书
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'worldbook\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
    h += '<span>挂载世界书</span>';
    h += '<div class="chat-settings-item-value">' + esc(wn ? wn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载人设
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'persona\')">';
    h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '<span>挂载人设</span>';
    h += '<div class="chat-settings-item-value">' + esc(pn ? pn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 挂载表情包
    h += '<div class="chat-settings-item" onclick="openSettingsMount(\'sticker\')">';
    h += '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>';
    h += '<span>挂载表情包</span>';
    h += '<div class="chat-settings-item-value">' + esc(sn ? sn.name : '未选择') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';

    // 聊天壁纸
    var _hasWp = !!loadWallpaper(role.id);
    h += '<div class="chat-settings-item" onclick="triggerChatWallpaperUpload()">';
    h += '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    h += '<span>当前窗口聊天壁纸</span>';
    h += '<div class="chat-settings-item-value">' + (_hasWp ? '已设置' : '未设置') + '</div>';
    h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    if (_hasWp) {
        h += '<div class="chat-settings-item" onclick="removeChatWallpaper()" style="color:#e57373;">';
        h += '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        h += '<span>移除聊天壁纸</span>';
        h += '<svg class="chat-settings-arrow" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>';
    }
    h += '<input type="file" id="csWallpaperFile" style="display:none" accept="image/*" onchange="handleChatWallpaperFile(event)">';

    // 开关：翻译
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">启用翻译</div>';
    h += '<div class="chat-settings-toggle-desc">启用后气泡虚线下方自动翻译</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csTranslate"' + (role.translateOn ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 开关：后台模式
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">后台模式</div>';
    h += '<div class="chat-settings-toggle-desc">切到后台也可收到推送和消息提醒</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csBgMode"' + (role.bgMsg ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 主动消息开关
    if (typeof buildAutoMessageToggle === 'function') {
        h += buildAutoMessageToggle(role);
    }

    // 记忆轮数
    h += '<div class="chat-settings-section">';
    h += '<div class="chat-settings-label">记忆轮数</div>';
    h += '<div class="chat-cr-memory-row">';
    h += '<input type="range" class="chat-cr-range" id="csMemory" min="5" max="100" value="' + (role.memory || 20) + '" oninput="document.getElementById(\'csMemoryVal\').textContent=this.value+\'轮\'">';
    h += '<div class="chat-cr-memory-val" id="csMemoryVal">' + (role.memory || 20) + '轮</div>';
    h += '</div></div>';

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ 新增：记忆总结 模块
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    h += '<div class="cs-adv-divider"><span>🧠 智能功能</span></div>';

    // 记忆总结开关
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">记忆总结</div>';
    h += '<div class="chat-settings-toggle-desc">每20条自动总结记忆，灌输给AI保持连贯</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csMemoryAuto"' + (_memEnabled ? ' checked' : '') + ' onchange="toggleMemoryPanel(this.checked)"><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 记忆总结面板（可展开）
    h += '<div class="cs-memory-panel' + (_memEnabled ? ' active' : '') + '" id="csMemoryPanel">';

    // 记忆进度
    var _memProg = _memMsgCount % 20;
    var _memPct = Math.round((_memProg / 20) * 100);
    h += '<div class="cs-mem-status">';
    h += '<div class="cs-mem-status-row">';
    h += '<span class="cs-mem-label">距下次自动总结</span>';
    h += '<span class="cs-mem-count" id="csMemCountDisplay">' + _memProg + ' / 20 条</span>';
    h += '</div>';
    h += '<div class="cs-mem-bar"><div class="cs-mem-bar-fill" id="csMemBarFill" style="width:' + _memPct + '%"></div></div>';
    h += '</div>';

    // 记忆存档列表
    h += '<div class="cs-mem-list-header">';
    h += '<span>📋 记忆存档 (' + _memSummaries.length + ')</span>';
    h += '<span class="cs-mem-clear-all" onclick="clearAllMemorySummaries()">清空全部</span>';
    h += '</div>';
    h += '<div class="cs-mem-list" id="csMemList">';
    if (_memSummaries.length === 0) {
        h += '<div class="cs-mem-empty">📭 暂无记忆总结<br><span>对话满20条后将自动生成</span></div>';
    } else {
        for (var mi = _memSummaries.length - 1; mi >= 0; mi--) {
            h += '<div class="cs-mem-item">';
            h += '<div class="cs-mem-item-time">' + esc(_memSummaries[mi].time) + '</div>';
            h += '<div class="cs-mem-item-text">' + esc(_memSummaries[mi].text) + '</div>';
            h += '<div class="cs-mem-item-del" onclick="deleteMemorySummary(' + mi + ')">✕</div>';
            h += '</div>';
        }
    }
    h += '</div>';

    // 手动总结按钮
    h += '<div class="cs-mem-manual-btn" onclick="triggerManualMemorySummary()">✦ 立即手动总结</div>';
    h += '</div>'; // .cs-memory-panel

    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    // ★★★ 新增：时间感知 模块
    // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">时间感知</div>';
    h += '<div class="chat-settings-toggle-desc">AI同步所选地区真实时间，知晓当前时刻</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csTimeAware"' + (_timeEnabled ? ' checked' : '') + ' onchange="toggleTimePanel(this.checked)"><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    // 时间感知面板
    h += '<div class="cs-time-panel' + (_timeEnabled ? ' active' : '') + '" id="csTimePanel">';

    // 实时时钟
    var _tzInfo = getTimeZoneData(_timeZone);
    h += '<div class="cs-time-clock-card">';
    h += '<div class="cs-time-zone-label" id="csTimeZoneLabel">' + _tzInfo.flag + ' ' + _tzInfo.name + '</div>';
    h += '<div class="cs-time-clock" id="csTimeClock">' + formatTimeForZone(_timeZone) + '</div>';
    h += '<div class="cs-time-date" id="csTimeDate">' + formatDateForZone(_timeZone) + '</div>';
    h += '<div class="cs-time-offset">' + _tzInfo.label + '</div>';
    h += '</div>';

    // 国家选择
    h += '<div class="cs-time-country-box">';
    h += '<div class="cs-time-country-top" onclick="toggleTimeCountryList()">';
    h += '<div class="cs-time-country-cur">';
    h += '<span class="cs-time-country-flag" id="csTimeCurFlag">' + _tzInfo.flag + '</span>';
    h += '<div>';
    h += '<div class="cs-time-country-name" id="csTimeCurName">' + _tzInfo.name + '</div>';
    h += '<div class="cs-time-country-tz" id="csTimeCurTz">' + _tzInfo.label + '</div>';
    h += '</div>';
    h += '</div>';
    h += '<span class="cs-time-country-arrow" id="csTimeArrow">▼</span>';
    h += '</div>';

    // 国家下拉
    h += '<div class="cs-time-country-dropdown" id="csTimeDropdown">';
    h += '<div class="cs-time-search-wrap"><input type="text" id="csTimeSearch" placeholder="搜索国家或地区..." oninput="filterTimeCountries(this.value)"></div>';
    h += '<div class="cs-time-country-list" id="csTimeCountryList">';
    h += buildTimeCountryListHTML(_timeZone, '');
    h += '</div>';
    h += '</div>';
    h += '</div>'; // .cs-time-country-box

    // 提示
    h += '<div class="cs-time-hint">';
    h += '<span>AI（角色）将严格遵守并知晓所选时区的真实时间。例如选择日本，北京时间15:42时角色感知到的是16:42。</span>';
    h += '</div>';

    h += '</div>'; // .cs-time-panel
    // ★★★ 新增模块结束 ★★★

    // 危险操作
    h += '<div class="chat-settings-danger-zone">';
    h += '<div class="chat-settings-danger-btn" onclick="settingsClearChat()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>清理聊天记录</span></div>';
    h += '<div class="chat-settings-danger-btn delete" onclick="settingsDeleteFriend()"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg><span>删除好友</span></div>';
    h += '</div>';

    h += '</div>'; // .chat-settings-body

    // 保存按钮
    h += '<div class="chat-settings-footer">';
    h += '<div class="chat-settings-save-btn" onclick="saveChatSettings()">保存设置</div>';
    h += '</div>';

    h += '</div></div>';

    conv.insertAdjacentHTML('beforeend', h);

    // ★★★ 新增：启动实时时钟
    if (_timeEnabled) startSettingsClock();
}

function closeChatSettingsPanel() {
    var el = document.getElementById('chatSettingsOverlay');
    if (el) el.remove();
}

function triggerSettingsAvatar() {
    var f = document.getElementById('csAvatarFile'); if (f) f.click();
}

function handleSettingsAvatar(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 5, function (c) {
            var role = findRole(_chatCurrentConv); if (!role) return;
            role.avatar = c; _convLeftAvatar = c; saveChatRoles();
            var avEl = document.querySelector('.chat-settings-avatar');
            if (avEl) avEl.innerHTML = '<img src="' + c + '" alt="">';
            var topAvEl = document.getElementById('convAvLeft');
            if (topAvEl) topAvEl.src = c;
            showToast('头像已更换');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}

function addSettingsGroup() {
    var inp = document.getElementById('csCustomGroup');
    var nm = inp.value.trim(); if (!nm) { showToast('请输入分组名'); return; }
    if (FIXED_CONTACT_GROUPS.indexOf(nm) !== -1) { showToast('"' + nm + '"是系统分组，不可在此选择'); return; }
    if (nm === '全部') { showToast('该名称为保留名'); return; }
    var sel = document.getElementById('csGroup');
    for (var i = 0; i < sel.options.length; i++) if (sel.options[i].value === nm) { sel.value = nm; inp.value = ''; showToast('已选择: ' + nm); return; }
    // 同步到统一分组列表
    if (_contactGroups.indexOf(nm) === -1) { _contactGroups.push(nm); saveContactGroups(); }
    var op = document.createElement('option'); op.value = nm; op.textContent = nm; sel.appendChild(op); sel.value = nm; inp.value = ''; showToast('已添加: ' + nm);
}

function triggerChatWallpaperUpload() {
    var f = document.getElementById('csWallpaperFile'); if (f) f.click();
}

// ===== 修改前（第 1262~1278 行）：=====
function handleChatWallpaperFile(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        smartCompress(ev.target.result, 20, function (c) {
            var role = findRole(_chatCurrentConv); if (!role) return;
            role.chatWallpaper = c;
            // ★ 壁纸单独存储，避免撑爆角色数据的 localStorage 配额
            saveWallpaper(role.id, c);
            saveChatRoles();
            applyConvWallpaper(c);
            showToast('壁纸已设置');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}

// ===== 修改后：=====
function handleChatWallpaperFile(e) {
    var f = e.target.files[0]; if (!f) return;
    showToast('处理中...');
    var rd = new FileReader();
    rd.onload = function (ev) {
        compressWallpaper(ev.target.result, function (c) {
            var role = findRole(_chatCurrentConv); if (!role) return;
            role.chatWallpaper = c;
            saveWallpaper(role.id, c);
            saveChatRoles();
            applyConvWallpaper(c);
            showToast('壁纸已设置 (' + Math.round(c.length / 1024) + 'KB)');
        });
    };
    rd.readAsDataURL(f); e.target.value = '';
}
/* ---- 壁纸专用压缩：保持清晰度，只控制文件大小 ---- */
function compressWallpaper(dataUrl, callback) {
    var img = new Image();
    img.onload = function () {
        var maxW = 960;    // 壁纸最大宽度（手机屏幕够用）
        var maxH = 1600;   // 壁纸最大高度
        var w = img.width;
        var h = img.height;

        // 等比缩放：只在超过上限时才缩小
        if (w > maxW || h > maxH) {
            var ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
        }

        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        // JPEG 质量从 0.85 开始，逐步降低直到 < 500KB
        var quality = 0.85;
        var result = canvas.toDataURL('image/jpeg', quality);

        while (result.length > 500 * 1024 && quality > 0.3) {
            quality -= 0.1;
            result = canvas.toDataURL('image/jpeg', quality);
        }

        callback(result);
    };
    img.onerror = function () {
        showToast('图片加载失败');
        callback(dataUrl);
    };
    img.src = dataUrl;
}

function removeChatWallpaper() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.chatWallpaper = '';
    saveWallpaper(role.id, '');
    saveChatRoles();
    applyConvWallpaper('');
    showToast('壁纸已移除');
    // 刷新设置面板
    closeChatSettingsPanel();
    openChatSettings();
}

/* ---- 壁纸独立存储 ---- */
function saveWallpaper(roleId, dataUrl) {
    try {
        if (dataUrl) {
            localStorage.setItem('ds_wp_' + roleId, dataUrl);
        } else {
            localStorage.removeItem('ds_wp_' + roleId);
        }
    } catch (e) {
        showToast('壁纸太大，存储失败，请选择更小的图片');
    }
}

function loadWallpaper(roleId) {
    // 优先从独立存储读取，兜底读角色数据里的
    var wp = localStorage.getItem('ds_wp_' + roleId);
    if (wp) return wp;
    var role = findRole(roleId);
    return (role && role.chatWallpaper) ? role.chatWallpaper : '';
}

/* ---- 强制应用壁纸到聊天体 ---- */
function applyConvWallpaper(dataUrl) {
    // 壁纸应用到整个 conversation 容器（覆盖顶栏和底栏背后）
    var conv = document.getElementById('chatConversation');
    if (!conv) return;
    if (dataUrl) {
        conv.style.cssText += '; background-image: url("' + dataUrl + '") !important; background-size: cover !important; background-position: center !important;';
    } else {
        conv.style.backgroundImage = '';
        conv.style.backgroundSize = '';
        conv.style.backgroundPosition = '';
    }
}

/* 设置里挂载选择器 — 复用已有的 mount 系统 */
function openSettingsMount(type) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    _crMountPersona = role.personaId || '';
    _crMountWorldBook = role.worldBookIds || (role.worldBookId ? [role.worldBookId] : []);
    _crMountSticker = role.stickerIds || (role.stickerId ? [role.stickerId] : []);
    window._mountFromSettings = true;
    openMountSelector(type);
}

/* 局部刷新对话页的user头像（顶栏+所有气泡），不重建整个页面 */
function refreshUserAvatarInConv() {
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var ap = getActivePersona();
    var newAv = (ap && ap.avatar) ? ap.avatar : '';

    // 1. 更新全局变量
    _convRightAvatar = newAv;

    // 2. 刷新顶栏右侧头像（user头像）
    var boxes = document.querySelectorAll('.chat-conv-av-box');
    if (boxes[1]) {
        if (newAv) {
            boxes[1].innerHTML = '<img src="' + newAv + '" id="convAvRight" alt="">';
        } else {
            boxes[1].innerHTML = SVG_USER;
        }
    }

    // 3. 刷新所有self消息气泡的头像
    var selfRows = document.querySelectorAll('.chat-bubble-row.self .chat-bubble-avatar');
    for (var i = 0; i < selfRows.length; i++) {
        if (newAv) {
            selfRows[i].innerHTML = '<img src="' + newAv + '" alt="">';
        } else {
            selfRows[i].innerHTML = SVG_USER_SM;
        }
    }
}

// 覆写 selectMountOption，支持从设置页同步
var _origSelectMountOption = (typeof selectMountOption === 'function') ? selectMountOption : null;

function selectMountOption(type, id) {
    if (type === 'persona') _crMountPersona = id;
    else if (type === 'worldbook') { _crMountWorldBook = id ? [id] : []; }
    // sticker 现在走 toggleStkMountOption + confirmStkMount
    var name = '', item;
    if (id) {
        if (type === 'persona') item = findPersona(id);
        else if (type === 'worldbook') item = findWorldBook(id);
        else if (type === 'sticker') item = findStickerPack(id);
        if (item) name = item.name;
    }
    updateMountDisplay(type, name);
    closeMountModal();

    if (window._mountFromSettings) {
        var role = findRole(_chatCurrentConv);
        if (role) {
            if (type === 'persona') {
                var oldPersonaId = role.personaId || role.boundPersonaId || '';
                role.personaId = id;
                role.boundPersonaId = id;
                // 记录人设变更
                if (oldPersonaId !== (id || '')) {
                    recordPersonaChange(role, oldPersonaId, id);
                }
            }
            else if (type === 'worldbook') { role.worldBookIds = Array.isArray(_crMountWorldBook) ? _crMountWorldBook.slice() : (id ? [id] : []); role.worldBookId = role.worldBookIds[0] || ''; }
            else if (type === 'sticker') { role.stickerIds = Array.isArray(_crMountSticker) ? _crMountSticker.slice() : (id ? [id] : []); role.stickerId = role.stickerIds[0] || ''; }
            saveChatRoles();
            showToast(name ? '已挂载: ' + name : '已取消挂载');
        }
        window._mountFromSettings = false;

        closeChatSettingsPanel();
        // ★ 重建对话页（让头像、气泡等全部刷新），再重新打开设置面板
        openConversation(role.id);
        openChatSettings();
    }
}
function settingsClearChat() {
    if (!confirm('确认清理所有聊天记录？此操作不可恢复。')) return;
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.msgs = []; role.lastMsg = ''; role.lastTime = 0; role.lastTimeStr = ''; role.unread = 0;
    saveChatRoles();
    closeChatSettingsPanel();
    openConversation(role.id);
    showToast('聊天记录已清理');
}

function settingsDeleteFriend() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    if (!confirm('确认删除好友「' + (role.nickname || role.name) + '」？所有消息将被清除，此操作不可恢复。')) return;
    _chatRoles = _chatRoles.filter(function (r) { return r.id !== role.id; });
    saveChatRoles();
    closeChatSettingsPanel();
    closeChatConversation();
    showToast('已删除好友');
}

function saveChatSettings() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var nickname = document.getElementById('csNickname').value.trim();
    role.nickname = nickname;
    role.customLabel = document.getElementById('csCustomLabel').value.trim();
    role.group = document.getElementById('csGroup').value;
    role.translateOn = document.getElementById('csTranslate').checked;
    role.bgMsg = document.getElementById('csBgMode').checked;

    var autoMsgEl = document.getElementById('csAutoMessage');
    if (autoMsgEl && typeof setCharAutoEnabled === 'function') {
        setCharAutoEnabled(role.id, autoMsgEl.checked);
    }

    role.memory = parseInt(document.getElementById('csMemory').value) || 20;

    // ★★★ 新增：保存记忆总结和时间感知
    var memAutoEl = document.getElementById('csMemoryAuto');
    if (memAutoEl) role.memoryAutoEnabled = memAutoEl.checked;

    var timeAwareEl = document.getElementById('csTimeAware');
    if (timeAwareEl) role.timeAwareEnabled = timeAwareEl.checked;

    // 时区已在选择时实时保存，这里确认一下
    if (role.timeAwareZone === undefined) role.timeAwareZone = 'Asia/Shanghai';

    saveChatRoles();
    stopSettingsClock();
    closeChatSettingsPanel();
    openConversation(role.id);
    showToast('设置已保存');
}

/* ================================================================
   气泡操作菜单
   ================================================================ */
var _chatQuoteData = null;
var _chatMultiSelectMode = false;
var _chatMultiSelected = [];

function showBubbleMenu(ev, idx) {
    ev.stopPropagation();
    if (_chatMultiSelectMode) { toggleMultiSelect(idx); return; }
    removeBubbleMenu();
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || m.recalled) return;

    var overlay = document.getElementById('chatConversation');
    var rect = overlay.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var menuW = 180, menuH = 240;
    if (x + menuW > rect.width) x = rect.width - menuW - 10;
    if (x < 10) x = 10;
    if (y + menuH > rect.height) y = y - menuH;
    if (y < 10) y = 10;

    var panel = document.createElement('div');
    panel.className = 'chat-bubble-menu';
    panel.id = 'chatBubbleMenu';
    panel.style.position = 'absolute';
    panel.style.left = x + 'px';
    panel.style.top = y + 'px';
    panel.style.zIndex = '860';

    var items = '';
    if (m.from === 'other') {
        items += '<div class="chat-bubble-menu-item" onclick="regenReply(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg><span>重回</span></div>';
    }
    items += '<div class="chat-bubble-menu-item" onclick="recallMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg><span>撤回</span></div>';
    items += '<div class="chat-bubble-menu-item" onclick="quoteMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>引用</span></div>';
    items += '<div class="chat-bubble-menu-item" onclick="favoriteMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><span>收藏</span></div>';
    items += '<div class="chat-bubble-menu-item danger" onclick="deleteMsg(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg><span>删除</span></div>';
    items += '<div class="chat-bubble-menu-item" onclick="enterMultiSelect(' + idx + ');removeBubbleMenu()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><polyline points="9 11 12 14 22 4"/></svg><span>多选</span></div>';

    panel.innerHTML = items;
    overlay.appendChild(panel);
    setTimeout(function () { document.addEventListener('click', removeBubbleMenu, { once: true }); }, 10);
}

function removeBubbleMenu() {
    var m = document.getElementById('chatBubbleMenu'); if (m) m.remove();
}

function regenReply(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var start = idx, end = idx;
    while (start > 0 && role.msgs[start - 1] && role.msgs[start - 1].from === 'other' && !role.msgs[start - 1].recalled) start--;
    while (end < role.msgs.length - 1 && role.msgs[end + 1] && role.msgs[end + 1].from === 'other' && !role.msgs[end + 1].recalled) end++;
    role.msgs.splice(start, end - start + 1);
    saveChatRoles();
    openConversation(role.id);
    setTimeout(function () { continueChat(); }, 200);
}

function recallMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    if (!role.msgs[idx]) return;
    role.msgs[idx].recalled = true;
    saveChatRoles();
    var row = document.querySelector('[data-msg-idx="' + idx + '"]');
    if (row) {
        var who = role.msgs[idx].from === 'self' ? '你' : esc(role.nickname || role.name);
        row.outerHTML = '<div class="chat-bubble-recalled">' + who + ' 撤回了一条消息</div>';
    }
    updateLastMsg(role);
    showToast('已撤回');
}

function quoteMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m) return;
    var name = m.from === 'self' ? '我' : (role.nickname || role.name);
    _chatQuoteData = { name: name, text: m.text, idx: idx };
    var bar = document.getElementById('chatQuoteBar');
    var barText = document.getElementById('chatQuoteBarText');
    if (bar && barText) { barText.textContent = name + '：' + m.text; bar.style.display = 'flex'; }
    var inp = document.getElementById('chatConvInput'); if (inp) inp.focus();
}

function clearQuote() {
    _chatQuoteData = null;
    var bar = document.getElementById('chatQuoteBar'); if (bar) bar.style.display = 'none';
}

function deleteMsg(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.msgs.splice(idx, 1); saveChatRoles();
    openConversation(role.id); showToast('已删除');
}

function enterMultiSelect(idx) {
    _chatMultiSelectMode = true; _chatMultiSelected = [idx];
    var inputRow = document.getElementById('chatInputRow');
    var multiBar = document.getElementById('chatMultiBar');
    var quoteBar = document.getElementById('chatQuoteBar');
    if (inputRow) inputRow.style.display = 'none';
    if (quoteBar) quoteBar.style.display = 'none';
    if (multiBar) multiBar.style.display = 'flex';
    updateMultiSelectUI();
}

function exitMultiSelect() {
    _chatMultiSelectMode = false; _chatMultiSelected = [];
    var inputRow = document.getElementById('chatInputRow');
    var multiBar = document.getElementById('chatMultiBar');
    if (inputRow) inputRow.style.display = 'flex';
    if (multiBar) multiBar.style.display = 'none';
    document.querySelectorAll('.chat-bubble-row.multi-selected').forEach(function (el) { el.classList.remove('multi-selected'); });
}

function toggleMultiSelect(idx) {
    var pos = _chatMultiSelected.indexOf(idx);
    if (pos !== -1) _chatMultiSelected.splice(pos, 1);
    else _chatMultiSelected.push(idx);
    updateMultiSelectUI();
}

function updateMultiSelectUI() {
    document.getElementById('chatMultiInfo').textContent = '已选 ' + _chatMultiSelected.length + ' 条';
    document.querySelectorAll('.chat-bubble-row').forEach(function (el) {
        var i = parseInt(el.getAttribute('data-msg-idx'));
        if (!isNaN(i)) el.classList.toggle('multi-selected', _chatMultiSelected.indexOf(i) !== -1);
    });
}

function multiDeleteMsgs() {
    if (!_chatMultiSelected.length) { showToast('未选中任何消息'); return; }
    if (!confirm('确认删除 ' + _chatMultiSelected.length + ' 条消息？')) return;
    var role = findRole(_chatCurrentConv); if (!role) return;
    _chatMultiSelected.sort(function (a, b) { return b - a; });
    for (var i = 0; i < _chatMultiSelected.length; i++) role.msgs.splice(_chatMultiSelected[i], 1);
    saveChatRoles();
    _chatMultiSelectMode = false; _chatMultiSelected = [];
    openConversation(role.id); showToast('已删除');
}

function updateLastMsg(role) {
    var last = null;
    for (var i = role.msgs.length - 1; i >= 0; i--) { if (!role.msgs[i].recalled) { last = role.msgs[i]; break; } }
    role.lastMsg = last ? last.text : '';
    saveChatRoles();
}

/* ================================================================
   发送 & 续写 & AI回复
   ================================================================ */

var _chatGenerating = false;

function sendChatMessage() {
    var inp = document.getElementById('chatConvInput'); if (!inp) return;
    var text = inp.value.trim();
    var role = findRole(_chatCurrentConv); if (!role) return;

    // 记录用户活动时间（用于主动消息30分钟检测）
    if (typeof recordUserActivity === 'function') recordUserActivity(role.id);

    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());

    if (!role.msgs) role.msgs = [];

    var max = (role.memory || 20) * 2;
    if (role.msgs.length >= max) role.msgs = role.msgs.slice(role.msgs.length - max + 2);

    // 如果有待发送的图片
    if (_pendingImageData) {
        var imgMsg = { from: 'self', text: text || '[图片]', time: ts, image: true, imageData: _pendingImageData };
        if (_chatQuoteData) { imgMsg.quoteText = _chatQuoteData.text; imgMsg.quoteName = _chatQuoteData.name; }
        role.msgs.push(imgMsg);
        role.lastMsg = '[图片]'; role.lastTime = now.getTime(); role.lastTimeStr = ts;
        onChatMessageForMemory(role);
        saveChatRoles();

        var body = document.getElementById('chatConvBody');
        if (body) {
            var ap = getActivePersona();
            var myAv = ap && ap.avatar ? ap.avatar : '';
            var idx = role.msgs.length - 1;
            body.insertAdjacentHTML('beforeend', renderBubbleRow(imgMsg, idx, myAv, role.avatar || ''));
            body.scrollTop = body.scrollHeight;
        }
        inp.value = '';
        clearQuote();
        clearPendingImage();
        // ★ 修复：发送图片后自动触发AI回复
        continueChat();
        return;
    }

    /* ---- 检测对话中角色主要使用的语言 ---- */
    function detectConvLanguage(role) {
        if (!role || !role.msgs || role.msgs.length === 0) return 'zh';
        // 从最近的 char 消息中取样
        var samples = '';
        for (var i = role.msgs.length - 1; i >= 0 && samples.length < 500; i--) {
            var m = role.msgs[i];
            if (m.from === 'other' && m.text && !m.transfer && !m.transferIsNotice && !m.redPacket) {
                samples += m.text + ' ';
            }
        }
        if (!samples) return 'zh';

        // 日文检测：含有平假名或片假名
        var jaCount = (samples.match(/[\u3040-\u309F\u30A0-\u30FF]/g) || []).length;
        // 韩文检测：含有韩文字母
        var koCount = (samples.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
        // 中文检测：含有汉字（排除日文中也有的汉字，用假名作为区分）
        var zhCount = (samples.match(/[\u4E00-\u9FFF]/g) || []).length;
        // 英文检测
        var enCount = (samples.match(/[a-zA-Z]{2,}/g) || []).length;

        // 如果有日文假名，优先判定日语（因为日语也包含汉字）
        if (jaCount > 5) return 'ja';
        if (koCount > 5) return 'ko';
        // 英文单词多且汉字少
        if (enCount > 10 && zhCount < 5) return 'en';
        return 'zh';
    }

    // 普通文字消息
    if (!text) return;

    var msgObj = { from: 'self', text: text, time: ts };
    if (_chatQuoteData) { msgObj.quoteText = _chatQuoteData.text; msgObj.quoteName = _chatQuoteData.name; }
    role.msgs.push(msgObj);
    role.lastMsg = text; role.lastTime = now.getTime(); role.lastTimeStr = ts;
    onChatMessageForMemory(role);
    saveChatRoles();

    var body2 = document.getElementById('chatConvBody');
    if (body2) {
        var ap2 = getActivePersona();
        var myAv2 = ap2 && ap2.avatar ? ap2.avatar : '';
        var idx2 = role.msgs.length - 1;
        body2.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, idx2, myAv2, role.avatar || ''));
        body2.scrollTop = body2.scrollHeight;
    }
    inp.value = '';
    clearQuote();
}

function continueChat() {
    var role = findRole(_chatCurrentConv);
    if (!role) { showToast('请先选择角色'); return; }
    if (_chatGenerating) { showToast('正在生成中...'); return; }

    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) {
        showToast('请先在API设置中配置并激活API'); return;
    }

    _chatGenerating = true;

    var body = document.getElementById('chatConvBody');
    var thinkingId = 'thinking_' + Date.now();
    if (body) {
        var avH = _convLeftAvatar ? '<img src="' + _convLeftAvatar + '" alt="">' : SVG_USER_SM;
        body.insertAdjacentHTML('beforeend', '<div class="chat-bubble-row" id="' + thinkingId + '"><div class="chat-bubble-avatar">' + avH + '</div><div class="chat-bubble-content-wrap"><div class="chat-bubble chat-thinking">思考中<span class="chat-thinking-dots"><span>.</span><span>.</span><span>.</span></span></div></div></div>');
        body.scrollTop = body.scrollHeight;
    }

    var messages = buildChatMessages(role);
    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.85, top_p: 0.95, max_tokens: 2048 })
    })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (json) {
            _chatGenerating = false;
            var thinkEl = document.getElementById(thinkingId); if (thinkEl) thinkEl.remove();

            var content = '';
            if (json.choices && json.choices.length > 0) content = (json.choices[0].message && json.choices[0].message.content) || '';
            content = content.trim();
            if (!content) { showToast('AI返回为空'); return; }

            // ★ 提取内嵌翻译：如果有 [trans] 标记，拆分原文和翻译
            var inlineTranslation = '';
            var inlineTransParts = []; // 按 [p] 分段的翻译数组
            if (role.translateOn) {
                var transIdx = content.indexOf('[trans]');
                if (transIdx === -1) transIdx = content.indexOf('[Trans]');
                if (transIdx === -1) transIdx = content.indexOf('[TRANS]');
                if (transIdx > -1) {
                    inlineTranslation = content.substring(transIdx + 7).trim();
                    content = content.substring(0, transIdx).trim();
                    // 按 [p] 分割翻译，对应各段原文
                    inlineTransParts = inlineTranslation.split(/\[p\]/i);
                    for (var tp = 0; tp < inlineTransParts.length; tp++) {
                        inlineTransParts[tp] = inlineTransParts[tp].trim();
                    }
                    // 过滤空段
                    inlineTransParts = inlineTransParts.filter(function (s) { return s.length > 0; });
                }
            }

            var segments = content.split(/\n\n+/);
            var cleanSegments = [];
            for (var i = 0; i < segments.length; i++) { var s = segments[i].trim(); if (s) cleanSegments.push(s); }
            if (cleanSegments.length === 0) { showToast('AI返回为空'); return; }

            var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
            if (!role.msgs) role.msgs = [];
            var body2 = document.getElementById('chatConvBody');
            var ap = getActivePersona();
            var myAv = ap && ap.avatar ? ap.avatar : '';

            for (var j = 0; j < cleanSegments.length; j++) {
                var txt = cleanSegments[j];
                var msgObj = { from: 'other', text: txt, time: ts };

                // ★ 内嵌翻译：按段落一一对应分配翻译
                if (inlineTransParts.length > 0) {
                    if (inlineTransParts.length >= cleanSegments.length) {
                        // 翻译段数 >= 原文段数，一一对应
                        msgObj.translation = inlineTransParts[j];
                    } else if (inlineTransParts.length === 1) {
                        // AI只输出了一整段翻译，全部给最后一条
                        if (j === cleanSegments.length - 1) {
                            msgObj.translation = inlineTransParts[0];
                        }
                    } else {
                        // 翻译段数 < 原文段数，尽量对应，剩余的合并到最后
                        if (j < inlineTransParts.length) {
                            msgObj.translation = inlineTransParts[j];
                        }
                    }
                }

                // 检测AI发的表情包意图 [sticker:描述]
                var stkMatch = txt.match(/^\[sticker:(.+?)\]$/i);
                if (stkMatch) {
                    var stkDesc = stkMatch[1].trim();
                    // 尝试从已有表情包中找匹配的
                    var matchedUrl = findMatchingSticker(stkDesc);
                    if (matchedUrl) {
                        msgObj.sticker = true;
                        msgObj.stickerUrl = matchedUrl;
                        msgObj.stickerDesc = stkDesc;
                        msgObj.text = '[表情包]';
                        delete msgObj.translation; // 表情包不需要翻译
                    }
                }

                // ★ 检测AI发的语音消息意图 [voice:内容]
                var voiceMatch = txt.match(/^\[voice:(.+?)\]$/i);
                if (voiceMatch) {
                    var voiceText = voiceMatch[1].trim();
                    msgObj.voice = true;
                    msgObj.voiceText = voiceText;
                    msgObj.voiceDuration = Math.max(1, Math.ceil(voiceText.length / 4));
                    msgObj.text = '[语音消息]';
                    delete msgObj.translation;
                }

                // ★ 检测AI发送位置的标记 [send_location:charPlace|userPlace]
                var locMatch = txt.match(/\[send_location:([^\]]+)\]/);
                if (locMatch) {
                    var locParts = locMatch[1].split('|');
                    var charPlace = (locParts[0] || '').trim();
                    var userPlace = (locParts[1] || '').trim();
                    // 从回复文本中移除标记
                    txt = txt.replace(/\[send_location:[^\]]+\]/g, '').trim();
                    msgObj.text = txt;
                    // 延迟一点发送位置气泡
                    if (charPlace) {
                        setTimeout(function () {
                            locCharSendLocation(charPlace, userPlace);
                        }, 1200);
                    }
                }

                // ★ 检测AI对转账的决策标记 [accept_transfer:txId] 或 [refuse_transfer:txId]
                var acceptMatch = txt.match(/\[accept_transfer:([^\]]+)\]/);
                var refuseMatch = txt.match(/\[refuse_transfer:([^\]]+)\]/);
                if (acceptMatch) {
                    var aTxId = acceptMatch[1].trim();
                    // 从文本中移除标记
                    msgObj.text = txt.replace(/\[accept_transfer:[^\]]+\]/g, '').trim();
                    // ★ 不再写死中文 fallback，让文本为空时根据聊天记录推断语言
                    if (!msgObj.text) {
                        var lastLang = detectConvLanguage(role);
                        if (lastLang === 'ja') msgObj.text = 'ありがとう、受け取るね～';
                        else if (lastLang === 'en') msgObj.text = 'Thanks, I\'ll accept it~';
                        else if (lastLang === 'ko') msgObj.text = '고마워, 받을게~';
                        else msgObj.text = '已收下，谢谢～';
                    }
                    // 延迟执行收款操作（等气泡渲染后）
                    (function (txIdCopy, roleCopy) {
                        setTimeout(function () { executeTransferAccept(roleCopy, txIdCopy); }, 500);
                    })(aTxId, role);
                } else if (refuseMatch) {
                    var rTxId = refuseMatch[1].trim();
                    msgObj.text = txt.replace(/\[refuse_transfer:[^\]]+\]/g, '').trim();
                    if (!msgObj.text) {
                        var lastLang2 = detectConvLanguage(role);
                        if (lastLang2 === 'ja') msgObj.text = 'このお金は受け取れない…';
                        else if (lastLang2 === 'en') msgObj.text = 'I can\'t accept this...';
                        else if (lastLang2 === 'ko') msgObj.text = '이 돈은 받을 수 없어…';
                        else msgObj.text = '这钱我不能收…';
                    }
                    (function (txIdCopy, roleCopy) {
                        setTimeout(function () { executeTransferRefuse(roleCopy, txIdCopy); }, 500);
                    })(rTxId, role);
                }
                interceptTransferIntent(role, msgObj);

                role.msgs.push(msgObj);
                var msgIdx = role.msgs.length - 1;
                if (body2 && _chatCurrentConv === role.id) {
                    body2.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, msgIdx, myAv, role.avatar || ''));
                }
            }

            // ★ 翻译功能：内嵌翻译未生效时的降级处理（如果AI没输出[trans]标记，走异步翻译）
            if (role.translateOn && !inlineTranslation) {
                (function (roleRef, startMsgIdx, segCount) {
                    for (var ti = 0; ti < segCount; ti++) {
                        (function (msgIndex) {
                            var msg = roleRef.msgs[msgIndex];
                            if (!msg || msg.from === 'self' || msg.sticker || msg.transfer || msg.translation) return;
                            translateMessage(roleRef, msgIndex);
                        })(startMsgIdx + ti);
                    }
                })(role, role.msgs.length - cleanSegments.length, cleanSegments.length);
            }

            role.lastMsg = cleanSegments[cleanSegments.length - 1];
            role.lastTime = now.getTime(); role.lastTimeStr = ts;
            onChatMessageForMemory(role);
            saveChatRoles();

            if (typeof triggerNotification === 'function') {
                triggerNotification(role, cleanSegments[0], false);
            }

            if (body2) body2.scrollTop = body2.scrollHeight;
        })
        .catch(function (err) {
            _chatGenerating = false;
            var thinkEl = document.getElementById(thinkingId); if (thinkEl) thinkEl.remove();
            showToast('AI请求失败: ' + err.message);
        });
}

/* ================================================================
   翻译功能 — 调用 AI API 把外语翻译成中文，显示在气泡虚线下方
   ================================================================ */
function translateMessage(role, msgIndex) {
    var msg = role.msgs[msgIndex];
    if (!msg || !msg.text || msg.translation) return; // 已有翻译则跳过

    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;

    // 标记翻译中
    msg._translating = true;
    refreshTranslateBubble(msgIndex);

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';

    var transMessages = [
        {
            role: 'system',
            content: '你是一个翻译助手。将用户发送的文本翻译成简体中文。只输出翻译结果，不要加任何解释、前缀或标点修饰。如果原文已经是中文，则原样输出。'
        },
        {
            role: 'user',
            content: msg.text
        }
    ];

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiConfig.key
        },
        body: JSON.stringify({
            model: apiConfig.model,
            messages: transMessages,
            temperature: 0.1,
            max_tokens: 1024
        })
    })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (json) {
            delete msg._translating;
            var translated = '';
            if (json.choices && json.choices.length > 0) {
                translated = (json.choices[0].message && json.choices[0].message.content) || '';
            }
            translated = translated.trim();

            // 如果翻译结果和原文一样（说明本身就是中文），不显示翻译
            if (translated && translated !== msg.text && !isSameContent(translated, msg.text)) {
                msg.translation = translated;
                saveChatRoles();
            }
            refreshTranslateBubble(msgIndex);
        })
        .catch(function (err) {
            delete msg._translating;
            console.warn('翻译失败:', err.message);
            refreshTranslateBubble(msgIndex);
        });
}

// 判断翻译结果是否和原文基本相同（去掉标点后比较）
function isSameContent(a, b) {
    var clean = function (s) { return s.replace(/[\s\.,!?;:，。！？；：、""''「」\-—…~～]/g, '').toLowerCase(); };
    return clean(a) === clean(b);
}

// 局部刷新单条气泡的翻译区域（不重建整个对话）
function refreshTranslateBubble(msgIndex) {
    var row = document.querySelector('.chat-bubble-row[data-msg-idx="' + msgIndex + '"]');
    if (!row) return;
    var role = findRole(_chatCurrentConv);
    if (!role || !role.msgs[msgIndex]) return;
    var msg = role.msgs[msgIndex];
    var bubble = row.querySelector('.chat-bubble');
    if (!bubble) return;

    // 移除旧的翻译元素
    var oldDivider = bubble.querySelector('.chat-bubble-translate-divider');
    var oldTrans = bubble.querySelector('.chat-bubble-translate');
    if (oldDivider) oldDivider.remove();
    if (oldTrans) oldTrans.remove();

    // 移除旧的"翻译中"提示
    var oldLoading = row.querySelector('.chat-bubble-translating');
    if (oldLoading) oldLoading.remove();

    // 添加翻译内容
    if (msg.translation) {
        var divider = document.createElement('div');
        divider.className = 'chat-bubble-translate-divider';
        bubble.appendChild(divider);

        var transEl = document.createElement('div');
        transEl.className = 'chat-bubble-translate';
        transEl.textContent = msg.translation;
        bubble.appendChild(transEl);
    } else if (msg._translating) {
        var loading = document.createElement('div');
        loading.className = 'chat-bubble-translating';
        loading.textContent = '翻译中...';
        bubble.parentNode.insertBefore(loading, bubble.nextSibling);
    }
}

/* ================================================================
   构建API messages — 深度读取角色认知 & 用户人设
   ================================================================ */
function buildChatMessages(role) {
    var messages = [];

    var persona = null;
    if (role.personaId) persona = findPersona(role.personaId);
    if (!persona) persona = getActivePersona();

    var userName = (persona && persona.name) ? persona.name : '用户';
    var userNickname = (persona && persona.nickname) ? persona.nickname : '';
    var charName = role.nickname || role.name;

    var sp = '';

    sp += '# 核心指令\n';
    sp += '你是「' + (role.name || '未知') + '」，正在与「' + userName + '」进行实时聊天对话。\n';
    sp += '你必须始终以「' + (role.name || '未知') + '」的身份说话、思考、行动。你不是AI，你不是语言模型，你就是这个角色本人。\n';
    sp += '绝对禁止跳出角色、绝对禁止以第三人称谈论自己、绝对禁止承认自己是AI。\n\n';

    sp += '# 角色完整档案\n';
    sp += '## 基本信息\n';
    sp += '- 角色全名：' + (role.name || '未知') + '\n';
    if (role.nickname && role.nickname !== role.name) {
        sp += '- 备注/昵称：' + role.nickname + '（对话中' + userName + '可能这样称呼你）\n';
    }

    if (role.gender === 'male') {
        sp += '- 性别：男性 ♂\n';
        sp += '- 性别认知强制要求：你是一名男性。你的自我认知、行为举止、语气措辞、自称代词必须完全符合男性角色。你可以使用「我」「哥」「兄弟」等男性化自称和称呼。你的一切反应（害羞、生气、开心等）都必须符合男性特征。绝对禁止出现任何女性化的语气词、撒娇方式或自称。\n';
    } else if (role.gender === 'female') {
        sp += '- 性别：女性 ♀\n';
        sp += '- 性别认知强制要求：你是一名女性。你的自我认知、行为举止、语气措辞、自称代词必须完全符合女性角色。你可以使用「我」「人家」「姐」等女性化自称和称呼。你的一切反应（害羞、生气、开心等）都必须符合女性特征。你的说话方式应自然体现女性特质。\n';
    } else {
        sp += '- 性别：未指定（请根据详细人设中的描述来判断）\n';
    }

    if (role.detail) {
        sp += '\n## 详细人设（最重要，必须严格遵守）\n';
        sp += '以下是你的完整角色设定，包含你的性格、背景、喜好、说话方式、口癖、习惯等。你在对话中的每一句话、每一个反应都必须与以下设定完全一致：\n\n';
        sp += role.detail + '\n\n';
        sp += '【重要提醒】以上人设信息是你扮演这个角色的根本依据。你必须：\n';
        sp += '- 完全内化这些特征，而不只是表面模仿\n';
        sp += '- 如果设定中提到了特定的说话方式、口癖、语气词，你必须在回复中自然地使用它们\n';
        sp += '- 如果设定中提到了性格特征，你的回复情绪、态度必须与之一致\n';
        sp += '- 如果设定中提到了对' + userName + '的关系或态度，你必须在对话中体现出来\n';
        sp += '- 如果设定中有任何禁忌、不喜欢的事物，你遇到相关话题时必须表现出真实反应\n';
    } else {
        sp += '\n## 详细人设\n（该角色暂未设定详细信息，请根据角色名字和性别自由发挥一个合理的人格）\n';
    }

    if (role.customLabel) {
        sp += '\n## 附加身份描述\n';
        sp += role.customLabel + '\n';
    }

    var _allWbIds = role.worldBookIds || (role.worldBookId ? [role.worldBookId] : []);
    var _beforeWbs = [], _middleWbs = [], _afterWbs = [];
    for (var _wbi = 0; _wbi < _allWbIds.length; _wbi++) {
        var _wb = findWorldBook(_allWbIds[_wbi]);
        if (_wb && _wb.content) {
            var _inj = _wb.inject || 'before';
            if (_inj === 'middle') _middleWbs.push(_wb);
            else if (_inj === 'after') _afterWbs.push(_wb);
            else _beforeWbs.push(_wb);
        }
    }
    if (_beforeWbs.length) {
        sp += '\\n# 世界观与背景设定\\n';
        sp += '以下是当前故事/对话所处的世界观背景。你在对话中应当默认遵循这个世界的规则和设定，不要说出与世界观矛盾的内容：\\n\\n';
        for (var _bwi = 0; _bwi < _beforeWbs.length; _bwi++) { sp += _beforeWbs[_bwi].content + '\\n\\n'; }
    }

    sp += '\n# 你的对话对象\n';
    sp += '你正在和以下这个人聊天，请根据对方的信息来调整你的称呼和互动方式：\n\n';

    if (persona) {
        sp += '- 名字：' + (persona.name || '用户') + '\n';
        if (persona.nickname) {
            sp += '- 昵称/别名：' + persona.nickname + '（你可以用这个昵称来称呼对方，也可以根据你们的关系用其他亲密称呼）\n';
        }
        if (persona.gender === 'male') {
            sp += '- 性别：男性。对方是男性，请在互动时注意这一点，称呼和互动方式应与之匹配。\n';
        } else if (persona.gender === 'female') {
            sp += '- 性别：女性。对方是女性，请在互动时注意这一点，称呼和互动方式应与之匹配。\n';
        }
        if (persona.signature) {
            sp += '- 个性签名：' + persona.signature + '（这反映了对方的个性或当前状态）\n';
        }
        if (persona.detail) {
            sp += '- 对方的详细信息：\n' + persona.detail + '\n';
            sp += '（请根据以上信息来理解对方是什么样的人，互动中可以自然地回应和引用这些信息）\n';
        }
    } else {
        sp += '- 名字：用户（对方未设置详细信息，请以自然友好的方式互动）\n';
    }

    if (role.detail && persona && persona.detail) {
        sp += '\n# 关系认知\n';
        sp += '请根据你的角色设定和对方的人设信息，推断你们之间的关系，并在对话中自然体现。\n';
        sp += '如果你的人设中明确提到了与「' + userName + '」的关系（例如恋人、朋友、同事等），则必须严格按照那个关系来互动。\n';
    }

    sp += '\n# 回复格式要求\n';
    sp += '1. 始终保持角色扮演，不要跳出角色，不要用第三人称描述自己。\n';
    sp += '2. 根据你的性格和说话方式来回复，如果有口癖一定要体现。\n';
    sp += '3. 回复自然流畅，像真人在手机上聊天一样，避免过于书面化。\n';
    sp += '4. 如果想表达多个意思，可以用两个换行分成多段（每段会显示为独立的消息气泡，模拟真实聊天连发多条消息的效果）。\n';
    sp += '5. 不要加任何角色名前缀如"' + charName + '："，直接说内容。\n';
    sp += '6. 不要使用markdown格式（不要用*加粗*、不要用标题符号#等）。\n';
    sp += '7. 如果消息中有引用内容（以【引用：...】标记），请针对被引用的具体内容来回复。\n';
    sp += '8. 称呼对方时请使用「' + (userNickname || userName) + '」或你们关系中合适的称呼，不要叫"用户"、"你"以外的泛称。\n';
    sp += '9. 注意聊天语境的连贯性，记住之前对话的内容，不要重复提问或遗忘已知信息。\n';

    if (role.offlineMode) {
        sp += '10. 你可以使用括号描写动作和心理活动，例如（微微低头，脸颊泛红）、（心想：他今天怎么这么认真）。鼓励适当使用以增加沉浸感。\n';
    } else {
        sp += '10. 严格禁止使用任何括号描写动作或心理活动，例如禁止出现（微笑）、（歪头）等。只能使用纯对话文字。如果需要表达动作，请用文字融入对话中，比如"我笑了一下"。\n';
    }

    sp += '11. 回复长度应根据话题自然调节：闲聊可以简短（1-3句），深入话题可以稍长（3-8句），但避免过长的独白。\n';
    sp += '12. 要有真实的情感波动，不要每句话都很积极或中性，应根据话题内容表现出相应的情绪。\n';
    sp += '13. 你可以发送语音消息。当你觉得说话比打字更自然时（比如撒娇、叹气、激动、生气等），可以在单独一个段落中使用 [voice:内容] 格式发送语音消息。内容就是你"说"的话。例如：[voice:哎呀你怎么才回我消息啊]。这会显示为一条语音消息气泡。注意：[voice:...] 必须单独占一个段落，不要和文字混在一起。\n';

    // ★ 内嵌翻译指令：翻译开关打开时，让AI回复自带翻译
    if (role.translateOn) {
        sp += '\n# 翻译输出要求（重要！必须遵守！）\n';
        sp += '你的回复中如果包含任何非简体中文的内容（英语、日语、韩语、法语等任何外语），则必须在回复末尾添加翻译区块。\n';
        sp += '格式规则：\n';
        sp += '1. 先正常写你角色的完整回复（可以有多个段落，段落之间用空行隔开）\n';
        sp += '2. 在所有回复内容写完后，换行写 [trans] 标记\n';
        sp += '3. [trans] 后面的翻译必须和原文段落一一对应，用 [p] 标记分隔每段翻译\n';
        sp += '\n示例：\n';
        sp += 'Hey darling! I missed you so much!\n\n';
        sp += 'By the way, 오늘 날씨가 정말 좋다~\n\n';
        sp += '[trans]\n';
        sp += '嘿亲爱的！我好想你！\n';
        sp += '[p]\n';
        sp += '对了，今天天气真好~\n\n';
        sp += '重要规则：\n';
        sp += '- 每个段落的翻译之间用 [p] 分隔，确保和原文段落数量一致\n';
        sp += '- 只翻译外语部分，中文部分保留原样\n';
        sp += '- 如果回复全部都是中文，不要加 [trans] 标记\n';
        sp += '- [trans] 标记必须单独一行\n';
        sp += '- 翻译要自然通顺，不要生硬的机翻\n';
    }

    messages.push({ role: 'system', content: sp });

    if (role.detail && role.msgs && role.msgs.length > 0) {
        var charIntro = '（角色状态初始化：我是' + role.name + '。';
        if (role.gender === 'male') charIntro += '我是男性。';
        else if (role.gender === 'female') charIntro += '我是女性。';
        if (role.nickname && role.nickname !== role.name) charIntro += '大家也叫我' + role.nickname + '。';
        charIntro += '我正在和' + userName + '聊天。';
        if (persona && persona.gender === 'male') charIntro += userName + '是一位男性。';
        else if (persona && persona.gender === 'female') charIntro += userName + '是一位女性。';
        charIntro += '我会严格按照我的人设来回复。）';
        messages.push({ role: 'assistant', content: charIntro });
    }

    var history = role.msgs || [];
    var memoryLimit = (role.memory || 20) * 2;
    var startIdx = Math.max(0, history.length - memoryLimit);

    for (var i = startIdx; i < history.length; i++) {
        var m = history[i];
        if (m.recalled) continue;

        // ★ 人设变更消息 — 注入为系统级提示，让char认知到user身份变化
        if (m.personaChange) {
            var changeNotice = '【系统通知：你的对话对象刚刚发生了身份切换。';
            changeNotice += '对方从「' + (m.oldPersonaName || '默认身份') + '」变为了「' + (m.newPersonaName || '默认身份') + '」。';
            var newP = m.newPersonaId ? findPersona(m.newPersonaId) : null;
            if (newP) {
                changeNotice += '新身份信息：';
                changeNotice += '名字是「' + (newP.name || '未知') + '」';
                if (newP.gender === 'male') changeNotice += '，性别男性';
                else if (newP.gender === 'female') changeNotice += '，性别女性';
                if (newP.nickname) changeNotice += '，昵称「' + newP.nickname + '」';
                if (newP.detail) changeNotice += '，详细信息：' + newP.detail.substring(0, 100);
                changeNotice += '。';
            } else {
                changeNotice += '对方切换回了默认身份，没有详细信息。';
            }
            changeNotice += '请你根据角色性格，自然地对这个身份变化做出反应。';
            changeNotice += '比如你可能会感到困惑、惊讶、好奇，或者如果你认识这个新身份，表现出相应的态度。';
            changeNotice += '不要生硬地说"你换了人设"，而是用符合角色的方式自然回应这种变化。';
            changeNotice += '如果新旧身份差异很大（比如性别不同、关系不同），你应该表现出明显的察觉和反应。】';
            messages.push({ role: 'system', content: changeNotice });
            continue;
        }

        var content = m.text;
        /* ★ 小说卡片→转为AI可读文本 */
        if (m.novelCard && content && content.indexOf('[小说卡片]') === 0) {
            try {
                var cd = JSON.parse(content.substring(6));
                content = '【用户转发了一篇小说章节给你】\n';
                content += '小说名: 《' + cd.novelTitle + '》\n';
                content += '章节: ' + cd.chapTitle + '\n';
                if (cd.category) content += '分类: ' + cd.category + '\n';
                if (cd.tags && cd.tags.length) content += '标签: ' + cd.tags.join('、') + '\n';
                content += '作者: ' + cd.author + '\n';
                content += '\n--- 章节内容 ---\n' + cd.fullContent + '\n--- 内容结束 ---\n';
                if (cd.authorNote) content += '\n作者有话说: ' + cd.authorNote + '\n';
                content += '\n请你以角色身份对这篇小说内容发表看法、评价或讨论，像是读完后跟朋友分享感想一样自然。';
            } catch (e2) { }
        }

        // 语音消息
        if (m.voice) {
            var vText = m.voiceText || m.voiceTranscript || '';
            if (vText) {
                content = '【对方发送了一条语音消息（时长' + (m.voiceDuration || '?') + '秒），语音内容："' + vText + '"。请当作对方用语音说的话来理解和回复，不要提"语音转文字"这个过程，直接当作对方说的话来回应。你也可以用 [voice:内容] 来回复语音消息。】';
            } else {
                content = '【对方发送了一条语音消息（时长' + (m.voiceDuration || '?') + '秒），内容未知。请根据对话上下文自然回应。】';
            }
        }

        // 转账消息
        if (m.transfer) {
            if (m.from === 'self' && m.transferDirection === 'user_to_char') {
                if (m.transferStatus === 'pending') {
                    content = '【SYSTEM: The user sent you a transfer of ¥' + (m.transferAmount || 0).toFixed(2) + ', note: "' + (m.transferRemark || 'transfer') + '". This transfer has NOT been processed yet — you must decide whether to accept or refuse it. Judge based on your character personality, your relationship with the user, and the conversation context. If you accept, put the tag [accept_transfer:' + (m.transferId || '') + '] on the very last line of your reply. If you refuse, put [refuse_transfer:' + (m.transferId || '') + '] on the very last line instead. IMPORTANT: The tag must be on its own final line. Your spoken reply text MUST stay in the same language you have been using in this conversation — do NOT switch languages.】';

                } else {
                    content = '【SYSTEM: A previous transfer of ¥' + (m.transferAmount || 0).toFixed(2) + ' (note: "' + (m.transferRemark || 'transfer') + '") — status: ' + (m.transferStatus === 'accepted' ? 'you accepted it' : 'you refused and returned it') + '. Already handled, no further response needed.】';
                }
            } else if (m.transferFromChar || (m.from === 'other' && m.transferDirection === 'char_to_user')) {
                content = '【你给用户发了一笔转账 ¥' + (m.transferAmount || 0).toFixed(2) + '，备注："' + (m.transferRemark || '转账') + '"。状态：' + (m.transferStatus === 'accepted' ? '对方已收' : m.transferStatus === 'refunded' ? '对方退回了' : '待确认') + '。】';
            } else if (m.transferIsNotice) {
                content = m.text;
            } else if (m.transferDirection === 'receipt' || m.transferDirection === 'refund') {
                content = m.text;
            }
        }

        // ★ 位置消息 → 告知AI用户分享了位置
        if (m.location) {
            if (m.from === 'self') {
                content = '【SYSTEM: The user shared their location with you. User is at: "' + (m.locUserPlace || 'unknown') + '". Your location is set to: "' + (m.locCharPlace || 'unknown') + '". The distance between you two is approximately ' + (m.locDist ? m.locDist.toFixed(1) : '?') + ' km' + (m.locCar ? ', driving would take about ' + m.locCar + ' minutes' : '') + (m.locFlight ? ', or a flight would take about ' + m.locFlight + ' minutes' : '') + '. React naturally to this location share based on your character personality and your relationship with the user. Consider the distance — are you close enough to meet? Is one of you far away? Comment on the places, the commute, express feelings about the distance, suggest meeting plans if appropriate. If you want to share your own location back, put the tag [send_location:YOUR_PLACE|USER_PLACE] on the very last line (e.g. [send_location:Tokyo|Shanghai]). Only do this if it makes sense in context. Your spoken reply text MUST stay in the same language you have been using in this conversation — do NOT switch languages.】';
            } else {
                content = m.text || '[Location shared / 位置共享]';
            }
        }
        // 图片消息 — 多模态格式，让AI真正看到图片内容
        if (m.image && m.imageData && m.from === 'self') {
            var imgText = '';
            if (m.text && m.text !== '[图片]') {
                imgText = '用户发送了一张图片，并附文字："' + m.text + '"。请仔细观察图片内容，结合附文字自然回复。';
            } else {
                imgText = '用户发送了一张图片。请仔细观察图片中的内容，根据你看到的内容自然回应，例如描述你看到了什么、评论图片、表达感受等。';
            }
            if (m.quoteText) {
                imgText = '【引用：' + m.quoteName + '说"' + m.quoteText + '"】\n' + imgText;
            }
            // 使用OpenAI多模态content格式
            messages.push({
                role: 'user',
                content: [
                    { type: 'text', text: imgText },
                    { type: 'image_url', image_url: { url: m.imageData, detail: 'low' } }
                ]
            });
            continue;
        }

        // 图片消息 — 没有base64数据的老消息（历史兼容）
        if (m.image) {
            if (m.text && m.text !== '[图片]') {
                content = '【对方发送了一张图片，并附文字："' + m.text + '"。请根据文字内容自然回复，你可以评论图片或回应文字。】';
            } else {
                content = '【对方发送了一张图片。你可以自然地回应，例如评论图片、表达感受等。】';
            }
        }

        // 表情包消息 — 如果有URL也传给AI看
        if (m.sticker) {
            if (m.from === 'self') {
                var stkText = '用户发了一个表情包。请仔细观察这个表情包图片的内容，根据你看到的画面自然回应。' + (m.stickerDesc ? '（表情描述：' + m.stickerDesc + '）' : '') + '你可以用文字描述你的反应，也可以在回复中用 [sticker:表情描述] 来表示你也想发一个表情包。';
                if (m.stickerUrl) {
                    // 表情包URL也用多模态格式传给AI看
                    if (m.quoteText) {
                        stkText = '【引用：' + m.quoteName + '说"' + m.quoteText + '"】\n' + stkText;
                    }
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: stkText },
                            { type: 'image_url', image_url: { url: m.stickerUrl, detail: 'low' } }
                        ]
                    });
                    continue;
                }
                content = stkText;
            } else {
                content = m.text || '[表情包]';
            }
        }

        // 附带引用
        if (m.quoteText) {
            content = '【引用：' + m.quoteName + '说"' + m.quoteText + '"】\n' + content;
        }
        if (m.from === 'self') {
            messages.push({ role: 'user', content: content });
        } else {
            messages.push({ role: 'assistant', content: content });
        }
    }

    if (messages.length <= 1 || messages[messages.length - 1].role === 'assistant') {
        var hint = '[继续扮演' + charName + '。';
        hint += '记住你的性别是' + (role.gender === 'male' ? '男性' : role.gender === 'female' ? '女性' : '未指定') + '。';
        if (role.detail) {
            var briefDetail = role.detail.substring(0, 60).replace(/\n/g, ' ');
            hint += '你的关键人设：' + briefDetail + '...。';
        }
        hint += '请根据当前对话情境，用符合你性格的方式自然地说些什么。';
        if (persona && persona.name) hint += '你在和' + persona.name + '说话。';
        hint += ']';
        messages.push({ role: 'user', content: hint });
    }

    // ★ 世界书中间注入
    if (_middleWbs.length) {
        var midContent = '【世界观提醒】以下是当前故事的世界观背景，请在后续对话中遵循：\n';
        for (var _mwi = 0; _mwi < _middleWbs.length; _mwi++) { midContent += _middleWbs[_mwi].content + '\n'; }
        var midIdx = Math.floor(messages.length / 2);
        if (midIdx < 1) midIdx = 1;
        messages.splice(midIdx, 0, { role: 'system', content: midContent });
    }

    // ★ 世界书后置注入
    if (_afterWbs.length) {
        var aftContent = '【世界观与背景设定】以下是当前故事的世界观背景，请务必在回复中遵循这些设定：\n';
        for (var _awi = 0; _awi < _afterWbs.length; _awi++) { aftContent += _afterWbs[_awi].content + '\n'; }
        messages.push({ role: 'system', content: aftContent });
    }

    // ★★★ 时间感知注入 ★★★
    if (role.timeAwareEnabled) {
        var _tz = role.timeAwareZone || 'Asia/Shanghai';
        var _tzInfo = getTimeZoneData(_tz);
        var _tod = getTimePeriod(_tz);
        var timeContent = '# 时间感知（重要）\n';
        timeContent += '你当前所处时区：' + _tzInfo.name + '（' + _tzInfo.label + '）\n';
        timeContent += '当前日期：' + formatDateForZone(_tz) + '\n';
        timeContent += '当前时间：' + formatTimeForZone(_tz) + '\n';
        timeContent += '当前时段：' + _tod.p + '\n';
        timeContent += '你必须按以上时间来感知和回应。深夜表现困倦，清晨说早安，中午聊午饭等。自然融入对话，不要每句都刻意提时间。不要说"我不知道现在几点"。\n';
        messages.push({ role: 'system', content: timeContent });
    }

    // ★★★ 记忆总结注入 ★★★
    if (role.memoryAutoEnabled && role.memorySummaries && role.memorySummaries.length > 0) {
        var memContent = '# 对话记忆（保持对话连贯性）\n';
        memContent += '以下是你和对方之前对话的记忆摘要，请自然地引用和延续：\n\n';
        var _recentMem = role.memorySummaries.slice(-5);
        for (var _mi = 0; _mi < _recentMem.length; _mi++) {
            memContent += '- 记忆' + (_mi + 1) + '（' + _recentMem[_mi].time + '）：' + _recentMem[_mi].text + '\n';
        }
        memContent += '\n自然地运用这些记忆，不要说"根据我的记忆..."，像真的记得一样。\n';
        messages.push({ role: 'system', content: memContent });
    }

    return messages;
}

function formatBubbleText(text) {
    if (!text) return '';
    var d = document.createElement('div'); d.textContent = text;
    return d.innerHTML.replace(/\n/g, '<br>');
}

function esc(t) { if (!t) return ''; var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function pad(n) { return n < 10 ? '0' + n : '' + n; }

/* ========== 钱包系统 ========== */
var _chatWallet = { balance: 10000.00, transactions: [] };
function loadWallet() {
    try { _chatWallet = JSON.parse(localStorage.getItem('ds_chat_wallet') || '{"balance":10000,"transactions":[]}'); } catch (e) { _chatWallet = { balance: 10000, transactions: [] }; }
    if (typeof _chatWallet.balance !== 'number') _chatWallet.balance = 10000;
    if (!Array.isArray(_chatWallet.transactions)) _chatWallet.transactions = [];
}
function saveWallet() { safeSetItem('ds_chat_wallet', JSON.stringify(_chatWallet)); }

/* ================================================================
   语音消息 — 文字转语音条系统
   用户输入文字 → 以语音条样式发送 → AI认知为语音消息
   AI也可以主动发语音 [voice:内容]
   ================================================================ */

function openVoiceInput() {
    var conv = document.getElementById('chatConversation');
    if (!conv) return;
    closeVoiceInput(true);

    var h = '<div class="voice-recorder-overlay" id="voiceRecorderOverlay">';
    h += '<div class="voice-recorder-panel" id="voiceRecorderPanel">';
    h += '<div class="voice-recorder-title">语音消息</div>';
    h += '<div class="voice-input-area">';
    h += '<div class="voice-input-hint">输入你想"说"的内容，将以语音条形式发送</div>';
    h += '<textarea class="voice-input-textarea" id="voiceInputText" placeholder="在这里输入语音内容..." rows="3"></textarea>';
    h += '</div>';
    h += '<div class="voice-recorder-buttons">';
    h += '<div class="voice-recorder-btn cancel" onclick="closeVoiceInput()">';
    h += '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '<span>取消</span></div>';
    h += '<div class="voice-recorder-btn send" onclick="sendVoiceTextMessage()">';
    h += '<svg viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    h += '<span>发送语音</span></div>';
    h += '</div>';
    h += '</div>';
    h += '</div>';

    conv.insertAdjacentHTML('beforeend', h);
    setTimeout(function () {
        var ov = document.getElementById('voiceRecorderOverlay');
        if (ov) ov.classList.add('show');
        var ta = document.getElementById('voiceInputText');
        if (ta) ta.focus();
    }, 10);
}

function closeVoiceInput(silent) {
    var ov = document.getElementById('voiceRecorderOverlay');
    if (ov) {
        ov.classList.remove('show');
        setTimeout(function () { if (ov.parentNode) ov.remove(); }, 200);
    }
    if (!silent) showToast('已取消');
}

function sendVoiceTextMessage() {
    var ta = document.getElementById('voiceInputText');
    if (!ta) return;
    var text = ta.value.trim();
    if (!text) { showToast('请输入语音内容'); return; }

    var role = findRole(_chatCurrentConv);
    if (!role) { showToast('角色不存在'); return; }
    if (!role.msgs) role.msgs = [];

    var now = new Date();
    var ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var duration = Math.max(1, Math.ceil(text.length / 4));

    var msgObj = {
        from: 'self',
        text: '[语音消息]',
        time: ts,
        voice: true,
        voiceText: text,
        voiceDuration: duration
    };

    if (_chatQuoteData) {
        msgObj.quoteText = _chatQuoteData.text;
        msgObj.quoteName = _chatQuoteData.name;
    }

    role.msgs.push(msgObj);
    role.lastMsg = '[语音消息]';
    role.lastTime = now.getTime();
    role.lastTimeStr = ts;
    saveChatRoles();
    onChatMessageForMemory(role);

    var body = document.getElementById('chatConvBody');
    if (body) {
        var ap = getActivePersona();
        var myAv = ap && ap.avatar ? ap.avatar : '';
        var idx = role.msgs.length - 1;
        body.insertAdjacentHTML('beforeend', renderVoiceBubbleRow(msgObj, idx, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }

    clearQuote();
    closeVoiceInput(true);
    showToast('语音已发送');
}

function renderVoiceBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';

    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }

    var dur = m.voiceDuration || 1;
    var barWidth = Math.min(70, Math.max(30, dur * 3));
    h += '<div class="chat-bubble voice-bubble" style="min-width:' + barWidth + '%" onclick="event.stopPropagation();toggleVoiceText(' + idx + ')">';
    h += '<div class="voice-bubble-play-icon">';
    h += '<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>';
    h += '</div>';

    h += '<div class="voice-bubble-waveform">';
    for (var w = 0; w < 16; w++) {
        var rh = 4 + Math.floor(Math.random() * 14);
        h += '<div class="voice-bubble-wave-bar" style="height:' + rh + 'px"></div>';
    }
    h += '</div>';

    h += '<div class="voice-bubble-duration">' + formatVoiceDuration(dur) + '</div>';
    h += '</div>';

    // 语音文字内容（默认隐藏，点击展开）
    var voiceContent = m.voiceText || m.voiceTranscript || '';
    if (voiceContent) {
        h += '<div class="voice-bubble-text-content" id="voiceText_' + idx + '" style="display:none">';
        h += '<div class="voice-bubble-text-inner">' + esc(voiceContent) + '</div>';
        h += '</div>';
    }

    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

function toggleVoiceText(idx) {
    var el = document.getElementById('voiceText_' + idx);
    if (!el) return;
    if (el.style.display === 'none') {
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

function formatVoiceDuration(sec) {
    if (sec < 60) return sec + '"';
    return Math.floor(sec / 60) + '\'' + (sec % 60) + '"';
}

function renderChatPage() { openChatApp(); }

/* ================================================================
   转账系统 — 完整实现 v2
   毛玻璃卡片 + 钱包账单 + 双向收发退回
   所有转账消息统一精美卡片渲染
   ================================================================ */

function openTransferPanel() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var conv = document.getElementById('chatConversation'); if (!conv) return;
    closeTransferPanel();

    var dn = esc(role.nickname || role.name);
    var roleAv = role.avatar || '';

    var h = '<div class="chat-transfer-overlay show" id="chatTransferOverlay" onclick="if(event.target===this)closeTransferPanel()">';
    h += '<div class="chat-transfer-panel">';

    h += '<div class="chat-transfer-header">';
    h += '<div class="chat-transfer-close" onclick="closeTransferPanel()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '<div class="chat-transfer-title">转账给 ' + dn + '</div>';
    h += '</div>';

    h += '<div class="chat-transfer-recipient">';
    h += '<div class="chat-transfer-recipient-avatar">' + (roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM) + '</div>';
    h += '<div class="chat-transfer-recipient-name">' + dn + '</div>';
    h += '</div>';

    h += '<div class="chat-transfer-amount-area">';
    h += '<div class="chat-transfer-currency">¥</div>';
    h += '<input type="number" class="chat-transfer-amount-input" id="transferAmount" placeholder="0.00" min="0.01" max="99999" step="0.01" oninput="updateTransferPreview()">';
    h += '</div>';

    h += '<div class="chat-transfer-quick">';
    var quickAmounts = [5.20, 13.14, 52.00, 100, 200, 520];
    for (var i = 0; i < quickAmounts.length; i++) {
        h += '<div class="chat-transfer-quick-btn" onclick="setTransferAmount(' + quickAmounts[i] + ')">' + quickAmounts[i].toFixed(2) + '</div>';
    }
    h += '</div>';

    h += '<div class="chat-transfer-remark-area">';
    h += '<input type="text" class="chat-transfer-remark-input" id="transferRemark" placeholder="添加转账说明（可选）" maxlength="30">';
    h += '</div>';

    h += '<div class="chat-transfer-balance" id="transferBalanceHint">当前余额：¥' + _chatWallet.balance.toFixed(2) + '</div>';
    h += '<div class="chat-transfer-send-btn" id="transferSendBtn" onclick="sendTransfer()">确认转账</div>';

    h += '</div></div>';
    conv.insertAdjacentHTML('beforeend', h);
}

function closeTransferPanel() {
    var el = document.getElementById('chatTransferOverlay'); if (el) el.remove();
}

function setTransferAmount(val) {
    var inp = document.getElementById('transferAmount');
    if (inp) { inp.value = val.toFixed(2); updateTransferPreview(); }
}

function updateTransferPreview() {
    var inp = document.getElementById('transferAmount');
    var hint = document.getElementById('transferBalanceHint');
    if (!inp || !hint) return;
    var val = parseFloat(inp.value) || 0;
    if (val > _chatWallet.balance) {
        hint.textContent = '余额不足（当前：¥' + _chatWallet.balance.toFixed(2) + '）';
        hint.style.color = '#e74c3c';
    } else {
        hint.textContent = '当前余额：¥' + _chatWallet.balance.toFixed(2);
        hint.style.color = '';
    }
}

/* 发送转账 */
function sendTransfer() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var amountVal = parseFloat(document.getElementById('transferAmount').value);
    if (!amountVal || amountVal <= 0) { showToast('请输入转账金额'); return; }
    if (amountVal > _chatWallet.balance) { showToast('余额不足'); return; }
    var remark = (document.getElementById('transferRemark').value || '').trim();

    _chatWallet.balance -= amountVal;
    var txId = 'tx' + Date.now() + Math.random().toString(36).substr(2, 4);
    _chatWallet.transactions.unshift({
        id: txId, type: 'transfer_out', amount: amountVal,
        remark: remark || '转账', target: role.nickname || role.name,
        time: new Date().toLocaleString(), status: 'pending'
    });
    saveWallet();

    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    if (!role.msgs) role.msgs = [];

    var msgObj = {
        from: 'self', text: '[转账] ¥' + amountVal.toFixed(2), time: ts,
        transfer: true, transferId: txId,
        transferAmount: amountVal, transferRemark: remark || '转账',
        transferStatus: 'pending', transferDirection: 'user_to_char'
    };
    role.msgs.push(msgObj);
    role.lastMsg = '[转账] ¥' + amountVal.toFixed(2);
    role.lastTime = now.getTime(); role.lastTimeStr = ts;
    saveChatRoles();
    onChatMessageForMemory(role);

    appendBubbleToBody(role, msgObj);
    closeTransferPanel();
    showToast('转账已发送，点续写让对方回应');

    // ★ 不再自动调用 charRespondTransfer，转账保持 pending 状态
    // 等用户点续写时，AI 根据上下文决定是否收下
}
/* ================================================================
   拦截AI回复中的转账意图 → 自动触发转账卡片
   在AI回复push到msgs之后、渲染之前调用
   ================================================================ */
function interceptTransferIntent(role, msgObj) {
    if (!msgObj || msgObj.from !== 'other') return false;
    var t = msgObj.text || '';
    // 匹配：转账、发红包、给你转、向你转账 + 金额
    var patterns = [
        /(?:转账|转给你|给你转|向你转账|发红包|打款|汇款)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)/,
        /[¥￥]\s*(\d+(?:\.\d{1,2})?)\s*(?:转账|红包|转给你)/,
        /(?:给你|转你|发你)\s*(\d+(?:\.\d{1,2})?)\s*(?:元|块|¥|￥)?/,
        /(?:转|发)\s*[¥￥]?\s*(\d+(?:\.\d{1,2})?)\s*(?:给你|过去|过来)/
    ];

    for (var i = 0; i < patterns.length; i++) {
        var match = t.match(patterns[i]);
        if (match) {
            var amount = parseFloat(match[1]);
            if (amount > 0 && amount < 100000) {
                // 从文本中提取备注（去掉金额部分）
                var remark = t.replace(match[0], '').trim();
                if (!remark || remark.length > 30) remark = '转账';

                // 把这条消息改造成转账卡片
                var txId = 'ctx' + Date.now() + Math.random().toString(36).substr(2, 4);
                msgObj.transfer = true;
                msgObj.transferId = txId;
                msgObj.transferAmount = amount;
                msgObj.transferRemark = remark || '转账';
                msgObj.transferStatus = 'pending';
                msgObj.transferDirection = 'char_to_user';
                msgObj.text = '[转账] ¥' + amount.toFixed(2);

                // 加入钱包记录
                loadWallet();
                _chatWallet.transactions.unshift({
                    id: txId, type: 'transfer_in', amount: amount,
                    remark: remark || '转账', target: role.nickname || role.name,
                    time: new Date().toLocaleString(), status: 'pending'
                });
                saveWallet();

                return true; // 已拦截
            }
        }
    }
    return false; // 未匹配
}
/* 公共：追加一条气泡到聊天区 */
function appendBubbleToBody(role, msgObj) {
    var body = document.getElementById('chatConvBody');
    if (body && _chatCurrentConv === role.id) {
        var ap = getActivePersona();
        var myAv = ap && ap.avatar ? ap.avatar : '';
        var idx = role.msgs.length - 1;
        body.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, idx, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }
}

/* ========== AI决定收下转账后执行 ========== */
function executeTransferAccept(role, txId) {
    // 找到对应的转账消息
    var transferMsg = null;
    var amount = 0;
    var remark = '转账';
    for (var i = 0; i < role.msgs.length; i++) {
        if (role.msgs[i].transferId === txId) {
            transferMsg = role.msgs[i];
            amount = transferMsg.transferAmount || 0;
            remark = transferMsg.transferRemark || '转账';
            break;
        }
    }
    if (!transferMsg || transferMsg.transferStatus !== 'pending') return;

    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var charName = role.nickname || role.name;

    // 更新状态为已收下
    setTransferStatusEverywhere(role, txId, 'accepted');

    // 插入收款确认卡片
    var receiptMsg = {
        from: 'other', text: '已收款 ¥' + amount.toFixed(2), time: ts,
        transfer: true, transferId: txId + '_receipt',
        transferAmount: amount, transferRemark: remark,
        transferStatus: 'accepted', transferDirection: 'receipt'
    };
    role.msgs.push(receiptMsg);
    role.lastMsg = charName + ' 已收款';
    role.lastTime = Date.now(); role.lastTimeStr = ts;
    saveChatRoles();
    appendBubbleToBody(role, receiptMsg);
    refreshTransferCards(role);
}

/* ========== AI决定退回转账后执行 ========== */
function executeTransferRefuse(role, txId) {
    var transferMsg = null;
    var amount = 0;
    for (var i = 0; i < role.msgs.length; i++) {
        if (role.msgs[i].transferId === txId) {
            transferMsg = role.msgs[i];
            amount = transferMsg.transferAmount || 0;
            break;
        }
    }
    if (!transferMsg || transferMsg.transferStatus !== 'pending') return;

    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var charName = role.nickname || role.name;

    // 退回金额到钱包
    _chatWallet.balance += amount;
    setTransferStatusEverywhere(role, txId, 'refunded');

    // 插入退还确认卡片
    var refundMsg = {
        from: 'other', text: '已退还 ¥' + amount.toFixed(2), time: ts,
        transfer: true, transferId: txId + '_refund',
        transferAmount: amount, transferRemark: '对方已退还',
        transferStatus: 'refunded', transferDirection: 'refund'
    };
    role.msgs.push(refundMsg);
    role.lastMsg = charName + ' 退还了转账';
    role.lastTime = Date.now(); role.lastTimeStr = ts;
    saveChatRoles();
    appendBubbleToBody(role, refundMsg);
    refreshTransferCards(role);
}

/* ========== 保留旧函数名兼容（但不再被自动调用）========== */
function charRespondTransfer(role, txId, amount, remark) {
    // 已废弃：转账决策现在由AI在续写时做出
    // 如需手动触发，走AI流程
    return;
}

/* ========== char主动给user发转账 ========== */
function charSendTransfer(role) {
    if (_chatCurrentConv !== role.id) return;
    var charName = role.nickname || role.name;
    var amount = [5.20, 6.66, 8.88, 13.14, 52.00, 66.66, 88.88, 99.99][Math.floor(Math.random() * 8)];
    var remarks = ['请你喝奶茶☕', '小红包~🧧', '还你的💰', '买点好吃的🍰', '爱你哦💕', '零花钱✨', '嘻嘻😊', '给你花🌸'];
    var remark = remarks[Math.floor(Math.random() * remarks.length)];
    var now = new Date(), ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    var txId = 'ctx' + Date.now() + Math.random().toString(36).substr(2, 4);

    var msgObj = {
        from: 'other', text: '[转账] ¥' + amount.toFixed(2), time: ts,
        transfer: true, transferId: txId,
        transferAmount: amount, transferRemark: remark,
        transferStatus: 'pending', transferDirection: 'char_to_user'
    };
    role.msgs.push(msgObj);
    role.lastMsg = '[转账] ¥' + amount.toFixed(2);
    role.lastTime = Date.now(); role.lastTimeStr = ts;
    saveChatRoles();

    _chatWallet.transactions.unshift({
        id: txId, type: 'transfer_in', amount: amount,
        remark: remark, target: charName,
        time: new Date().toLocaleString(), status: 'pending'
    });
    saveWallet();
    appendBubbleToBody(role, msgObj);
}

/* user接收char的转账 */
function acceptCharTransfer(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || !m.transfer || m.transferDirection !== 'char_to_user') return;
    if (m.transferStatus !== 'pending') { showToast('该转账已处理'); return; }

    m.transferStatus = 'accepted';
    _chatWallet.balance += m.transferAmount;
    var txRec = findWalletTx(m.transferId);
    if (txRec) txRec.status = 'accepted';
    saveWallet(); saveChatRoles();
    refreshTransferCards(role);
    showToast('已收款 ¥' + m.transferAmount.toFixed(2));
}

/* user退回char的转账 */
function refundCharTransfer(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var m = role.msgs[idx]; if (!m || !m.transfer || m.transferDirection !== 'char_to_user') return;
    if (m.transferStatus !== 'pending') { showToast('该转账已处理'); return; }

    m.transferStatus = 'refunded';
    var txRec = findWalletTx(m.transferId);
    if (txRec) txRec.status = 'refunded';
    saveWallet(); saveChatRoles();
    refreshTransferCards(role);
    showToast('已退回转账');
}

function findWalletTx(txId) {
    for (var i = 0; i < _chatWallet.transactions.length; i++) {
        if (_chatWallet.transactions[i].id === txId) return _chatWallet.transactions[i];
    }
    return null;
}

function setTransferStatusEverywhere(role, txId, status) {
    // 更新消息
    for (var i = 0; i < role.msgs.length; i++) {
        if (role.msgs[i].transferId === txId) role.msgs[i].transferStatus = status;
    }
    // 更新钱包
    var tx = findWalletTx(txId);
    if (tx) tx.status = status;
    saveChatRoles(); saveWallet();
}

function refreshTransferCards(role) {
    if (_chatCurrentConv === role.id) openConversation(role.id);
}

/* ================================================================
   渲染转账卡片气泡 — 统一精美版 v2
   所有转账（发出、收到、收款确认、退还确认、char发来的）
   全部渲染为居中毛玻璃卡片
   ================================================================ */
function renderTransferBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    var isSelf = m.from === 'self';
    var dir = m.transferDirection || '';

    h += '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';

    // 头像
    h += '<div class="chat-bubble-avatar">';
    if (isSelf) h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';

    h += '<div class="chat-bubble-content-wrap">';
    if (m.quoteText) {
        h += '<div class="chat-bubble-quote"><span class="chat-bubble-quote-name">' + esc(m.quoteName || '') + '：</span>' + esc(m.quoteText) + '</div>';
    }

    // 卡片状态
    var st = m.transferStatus || 'pending';
    var stLabel = st === 'accepted' ? '已收款' : st === 'refunded' ? '已退还' : '待确认';

    // 卡片标题
    var cardTitle = '';
    var cardIcon = '';
    if (dir === 'user_to_char') {
        cardTitle = '转账给对方';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
    } else if (dir === 'char_to_user') {
        cardTitle = '对方转账给你';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
    } else if (dir === 'receipt') {
        cardTitle = '已确认收款';
        cardIcon = '<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (dir === 'refund') {
        cardTitle = '转账已退还';
        cardIcon = '<svg viewBox="0 0 24 24"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>';
    } else {
        cardTitle = isSelf ? '转账' : '收到转账';
        cardIcon = '<svg viewBox="0 0 24 24"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    }

    h += '<div class="chat-transfer-card ' + st + '" onclick="event.stopPropagation()">';

    // 顶部色条
    h += '<div class="chat-transfer-card-stripe"></div>';

    // 图标 + 标题
    h += '<div class="chat-transfer-card-head">';
    h += '<div class="chat-transfer-card-icon">' + cardIcon + '</div>';
    h += '<div class="chat-transfer-card-title">' + cardTitle + '</div>';
    h += '</div>';

    // 金额
    h += '<div class="chat-transfer-card-amount">¥' + (m.transferAmount || 0).toFixed(2) + '</div>';

    // 备注
    h += '<div class="chat-transfer-card-remark">' + esc(m.transferRemark || '转账') + '</div>';

    // 状态标签
    h += '<div class="chat-transfer-card-status-badge ' + st + '">' + stLabel + '</div>';

    // char发给user的待确认：收款/退回按钮
    if (dir === 'char_to_user' && st === 'pending') {
        h += '<div class="chat-transfer-card-actions">';
        h += '<div class="chat-transfer-card-btn accept" onclick="event.stopPropagation();acceptCharTransfer(' + idx + ')">💰 收款</div>';
        h += '<div class="chat-transfer-card-btn refund" onclick="event.stopPropagation();refundCharTransfer(' + idx + ')">↩ 退回</div>';
        h += '</div>';
    }

    // 底部分割线 + 微信风标识
    h += '<div class="chat-transfer-card-footer">';
    h += '<svg viewBox="0 0 24 24" class="chat-transfer-card-footer-icon"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>';
    h += '<span>蛋薯转账</span>';
    h += '</div>';

    h += '</div>'; // .chat-transfer-card

    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* 渲染小说卡片气泡 */
function renderNovelCardBubbleRow(m, idx, myAv, roleAv) {
    var isSelf = m.from === 'self';
    var h = '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-idx="' + idx + '">';

    if (!isSelf) {
        h += '<div class="chat-bubble-avatar">';
        if (roleAv) h += '<img src="' + roleAv + '">';
        else h += SVG_USER;
        h += '</div>';
    }

    h += '<div class="chat-bubble-col">';

    /* 解析卡片数据 */
    var cardData = null;
    try {
        var raw = m.text || '';
        if (raw.indexOf('[小说卡片]') === 0) {
            cardData = JSON.parse(raw.substring(6));
        }
    } catch (e) { }

    if (cardData) {
        h += '<div class="chat-bubble" style="padding:0;overflow:hidden;max-width:260px;background:transparent;border:none;box-shadow:none">';
        h += '<div style="background:linear-gradient(135deg,#fdf8f2,#f5efe5);border-radius:12px;padding:12px 14px;border:1px solid #e8dfd3;box-shadow:0 2px 8px rgba(0,0,0,.06)">';
        /* 头部 */
        h += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">';
        h += '<span style="font-size:16px">📖</span>';
        h += '<span style="font-size:10px;color:#c07a6a;font-weight:700">柿子小说</span>';
        if (cardData.category) h += '<span style="font-size:9px;color:#b5a68e;background:rgba(212,200,176,.2);padding:1px 6px;border-radius:6px">' + esc(cardData.category) + '</span>';
        h += '</div>';
        /* 标题 */
        h += '<div style="font-size:13px;font-weight:700;color:#5a4d3e;margin-bottom:3px">' + esc(cardData.novelTitle) + '</div>';
        h += '<div style="font-size:11px;color:#8b7e6a;margin-bottom:6px">' + esc(cardData.chapTitle) + '</div>';
        /* 标签 */
        if (cardData.tags && cardData.tags.length) {
            h += '<div style="margin-bottom:6px">';
            for (var ti = 0; ti < cardData.tags.length && ti < 3; ti++) {
                h += '<span style="font-size:9px;color:#c07a6a;background:rgba(192,122,106,.1);padding:1px 6px;border-radius:6px;margin-right:3px">' + esc(cardData.tags[ti]) + '</span>';
            }
            h += '</div>';
        }
        /* 预览 */
        h += '<div style="font-size:10px;color:#a89b8a;line-height:1.6;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden">' + esc(cardData.preview) + '</div>';
        /* 底栏 */
        h += '<div style="margin-top:8px;padding-top:6px;border-top:1px solid #ede6da;display:flex;justify-content:space-between;align-items:center">';
        h += '<span style="font-size:9px;color:#b5a68e">作者: ' + esc(cardData.author) + '</span>';
        h += '<span style="font-size:9px;color:#c07a6a">📄 转发的小说</span>';
        h += '</div>';
        h += '</div>';
        h += '</div>';
    } else {
        h += '<div class="chat-bubble">[小说卡片]</div>';
    }

    /* 时间 */
    if (m.time) h += '<div class="chat-bubble-time">' + m.time + '</div>';
    h += '</div>';

    if (isSelf) {
        h += '<div class="chat-bubble-avatar">';
        if (myAv) h += '<img src="' + myAv + '">';
        else h += SVG_USER;
        h += '</div>';
    }

    h += '</div>';
    return h;
}

/* ================================================================
   钱包页面
   ================================================================ */
function openWalletPage() {
    closeWalletPage();
    var overlay = document.getElementById('chatAppOverlay');
    if (!overlay) return;
    overlay.insertAdjacentHTML('beforeend', buildWalletHTML());
}

function buildWalletHTML() {
    loadWallet();
    var h = '<div class="chat-wallet-overlay show" id="chatWalletOverlay">';
    h += '<div class="chat-wallet-panel">';

    h += '<div class="chat-wallet-header">';
    h += '<div class="chat-wallet-back" onclick="closeWalletPage()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="chat-wallet-title">我的钱包</div>';
    h += '<div style="width:30px"></div>';
    h += '</div>';

    // 余额卡
    h += '<div class="chat-wallet-balance-card">';
    h += '<div class="chat-wallet-balance-deco">💰</div>';
    h += '<div class="chat-wallet-balance-label">账户余额</div>';
    h += '<div class="chat-wallet-balance-amount">¥' + _chatWallet.balance.toFixed(2) + '</div>';
    h += '<div class="chat-wallet-balance-actions">';
    h += '<div class="chat-wallet-action-btn" onclick="walletRecharge()">+ 充值</div>';
    h += '</div>';
    h += '</div>';

    // 统计
    var totalIn = 0, totalOut = 0;
    for (var t = 0; t < _chatWallet.transactions.length; t++) {
        var tx = _chatWallet.transactions[t];
        if (tx.status === 'accepted') {
            if (tx.type === 'transfer_out') totalOut += tx.amount;
            else if (tx.type === 'transfer_in') totalIn += tx.amount;
            else if (tx.type === 'recharge') totalIn += tx.amount;
        }
    }
    h += '<div class="chat-wallet-stats">';
    h += '<div class="chat-wallet-stat-item"><div class="chat-wallet-stat-label">总收入</div><div class="chat-wallet-stat-val in">+¥' + totalIn.toFixed(2) + '</div></div>';
    h += '<div class="chat-wallet-stat-divider"></div>';
    h += '<div class="chat-wallet-stat-item"><div class="chat-wallet-stat-label">总支出</div><div class="chat-wallet-stat-val out">-¥' + totalOut.toFixed(2) + '</div></div>';
    h += '</div>';

    // 账单
    h += '<div class="chat-wallet-bill-title">交易记录</div>';
    h += '<div class="chat-wallet-bill-list">';
    if (!_chatWallet.transactions.length) {
        h += '<div class="chat-wallet-bill-empty">暂无交易记录</div>';
    } else {
        for (var i = 0; i < _chatWallet.transactions.length; i++) {
            var txn = _chatWallet.transactions[i];
            var isOut = txn.type === 'transfer_out';
            var isRecharge = txn.type === 'recharge';
            var statusText = txn.status === 'pending' ? '待确认' : txn.status === 'accepted' ? '已完成' : '已退还';

            var amountClass = 'in';
            var amountPrefix = '+';
            if (isOut && txn.status !== 'refunded') { amountClass = 'out'; amountPrefix = '-'; }
            else if (isOut && txn.status === 'refunded') { amountClass = 'in'; amountPrefix = '+'; }
            else if (txn.type === 'transfer_in' && txn.status === 'refunded') { amountClass = 'muted'; amountPrefix = ''; }

            var iconSvg = '';
            if (isRecharge) {
                iconSvg = '<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
            } else if (isOut) {
                iconSvg = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>';
            } else {
                iconSvg = '<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
            }

            var desc = isRecharge ? '账户充值' : (isOut ? '转账给 ' : '来自 ') + esc(txn.target);

            h += '<div class="chat-wallet-bill-item">';
            h += '<div class="chat-wallet-bill-icon ' + (isOut && txn.status !== 'refunded' ? 'out' : 'in') + '">' + iconSvg + '</div>';
            h += '<div class="chat-wallet-bill-info">';
            h += '<div class="chat-wallet-bill-desc">' + desc + '</div>';
            h += '<div class="chat-wallet-bill-meta">' + esc(txn.remark || '') + ' · ' + (txn.time || '') + '</div>';
            h += '</div>';
            h += '<div class="chat-wallet-bill-amount ' + amountClass + '">';
            h += amountPrefix + '¥' + txn.amount.toFixed(2);
            h += '<div class="chat-wallet-bill-status ' + txn.status + '">' + statusText + '</div>';
            h += '</div>';
            h += '</div>';
        }
    }
    h += '</div>';
    h += '</div></div>';
    return h;
}

function closeWalletPage() {
    var el = document.getElementById('chatWalletOverlay'); if (el) el.remove();
}

function walletRecharge() {
    var amount = prompt('请输入充值金额：', '1000');
    if (!amount) return;
    var val = parseFloat(amount);
    if (isNaN(val) || val <= 0) { showToast('无效金额'); return; }
    _chatWallet.balance += val;
    _chatWallet.transactions.unshift({
        id: 'rc' + Date.now(), type: 'recharge', amount: val,
        remark: '账户充值', target: '系统',
        time: new Date().toLocaleString(), status: 'accepted'
    });
    saveWallet();
    closeWalletPage(); openWalletPage();
    showToast('充值成功 ¥' + val.toFixed(2));
}

/* ================================================================
   注入相机 & 相册按钮到工具栏
   ================================================================ */
function injectImageButtons() {
    var bar = document.querySelector('.conv-input-bar');
    if (!bar) return;
    if (bar.getAttribute('data-img-injected')) return;
    bar.setAttribute('data-img-injected', '1');

    var toolbar = bar.querySelector('.conv-toolbar');
    if (!toolbar) {
        toolbar = bar;
    }

    var sendBtn = bar.querySelector('.conv-send-btn') || bar.querySelector('[onclick*="sendChat"]');

    var btnCam = document.createElement('div');
    btnCam.className = 'conv-tool-btn';
    btnCam.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#d4a0b0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>';
    btnCam.title = '拍照';
    btnCam.style.cssText = 'cursor:pointer;padding:6px;display:flex;align-items:center;';
    btnCam.onclick = function () { chatPickCamera(); };

    var btnAlbum = document.createElement('div');
    btnAlbum.className = 'conv-tool-btn';
    btnAlbum.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#d4a0b0" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
    btnAlbum.title = '相册';
    btnAlbum.style.cssText = 'cursor:pointer;padding:6px;display:flex;align-items:center;';
    btnAlbum.onclick = function () { chatPickAlbum(); };

    var inputEl = bar.querySelector('input') || bar.querySelector('textarea');
    if (inputEl) {
        inputEl.parentNode.insertBefore(btnCam, inputEl);
        inputEl.parentNode.insertBefore(btnAlbum, inputEl);
    } else {
        bar.insertBefore(btnCam, bar.firstChild);
        bar.insertBefore(btnAlbum, btnCam.nextSibling);
    }
}
/* ========== 表情包匹配 ========== */
function findMatchingSticker(desc) {
    try {
        var allGroups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]');
        var allStickers = [];

        // ★ 只从当前角色挂载的分组中取表情
        var mountedIds = [];
        if (_chatCurrentConv) {
            var role = findRole(_chatCurrentConv);
            if (role) {
                mountedIds = role.stickerIds || (role.stickerId ? [role.stickerId] : []);
            }
        }

        // 没挂载就没有表情可用
        if (!mountedIds.length) return '';

        for (var mi = 0; mi < mountedIds.length; mi++) {
            var mId = mountedIds[mi];

            // 从 ds_sticker_groups 找
            for (var gi = 0; gi < allGroups.length; gi++) {
                if (allGroups[gi].id === mId) {
                    var stks = allGroups[gi].stickers || [];
                    for (var j = 0; j < stks.length; j++) {
                        allStickers.push(stks[j]);
                    }
                    break;
                }
            }

            // 兼容旧的 ds_chat_stickers
            var pack = findStickerPack(mId);
            if (pack && pack.urls) {
                for (var u = 0; u < pack.urls.length; u++) {
                    allStickers.push({ url: pack.urls[u], desc: '' });
                }
            }
        }

        if (!allStickers.length) return '';

        // 先尝试 desc 关键词匹配
        if (desc) {
            var descLower = desc.toLowerCase();
            for (var k = 0; k < allStickers.length; k++) {
                if (allStickers[k].desc && allStickers[k].desc.toLowerCase().indexOf(descLower) >= 0) {
                    return allStickers[k].url;
                }
            }
        }
        // 没匹配到就随机选一个
        return allStickers[Math.floor(Math.random() * allStickers.length)].url;
    } catch (e) { return ''; }
}
/* ========== 表情包：缺失的函数补全 ========== */

// 渲染表情包气泡
function renderStickerBubbleRow(m, idx, myAv, roleAv) {
    var isSelf = m.from === 'self';
    var av = isSelf ? myAv : roleAv;
    var avHtml = av ? '<img src="' + av + '">' : SVG_USER;
    var h = '';
    h += '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-av">' + avHtml + '</div>';
    h += '<div class="chat-bubble-sticker">';
    h += '<img src="' + esc(m.stickerUrl || '') + '" alt="' + esc(m.stickerDesc || '表情包') + '" style="max-width:120px;max-height:120px;border-radius:8px;">';
    h += '</div>';
    h += '<div class="chat-bubble-time">' + esc(m.time || '') + '</div>';
    h += '</div>';
    return h;
}

// 打开/关闭表情包面板
function toggleStickerPanel() {
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;
    if (panel.classList.contains('show')) {
        closeStickerPanel();
    } else {
        renderStickerPanel();
        panel.classList.add('show');
    }
}

function closeStickerPanel() {
    var panel = document.getElementById('chatStickerPanel');
    if (panel) panel.classList.remove('show');
}

// 渲染表情包面板内容 — ★ 只显示当前角色挂载的表情包
function renderStickerPanel() {
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;

    // 读取全部分组数据源
    var allGroups = [];
    try { allGroups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { allGroups = []; }

    // ★ 核心：只取当前角色挂载的分组
    var mountedIds = [];
    if (_chatCurrentConv) {
        var role = findRole(_chatCurrentConv);
        if (role) {
            mountedIds = role.stickerIds || (role.stickerId ? [role.stickerId] : []);
        }
    }

    // 如果没有挂载任何表情包
    if (!mountedIds.length) {
        panel.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;line-height:1.8;">该角色未挂载表情包<br>请在角色设置中挂载</div>';
        return;
    }

    // ★ 只收集挂载了的分组
    var groups = [];
    for (var mi = 0; mi < mountedIds.length; mi++) {
        var mId = mountedIds[mi];
        var found = false;

        // 从 ds_sticker_groups 找
        for (var gi = 0; gi < allGroups.length; gi++) {
            if (allGroups[gi].id === mId) {
                groups.push(allGroups[gi]);
                found = true;
                break;
            }
        }

        // 兼容旧的 ds_chat_stickers 数据
        if (!found) {
            var pack = findStickerPack(mId);
            if (pack && pack.urls && pack.urls.length) {
                var stickers = [];
                for (var u = 0; u < pack.urls.length; u++) {
                    stickers.push({ url: pack.urls[u], desc: '' });
                }
                groups.push({ name: pack.name, stickers: stickers });
            }
        }
    }

    if (!groups.length) {
        panel.innerHTML = '<div style="padding:20px;text-align:center;color:#999;font-size:13px;line-height:1.8;">挂载的表情包已被删除<br>请重新挂载</div>';
        return;
    }

    // 渲染面板
    var h = '';

    // 分组 tabs（多组时显示）
    if (groups.length > 1) {
        h += '<div class="stk-panel-tabs">';
        for (var i = 0; i < groups.length; i++) {
            h += '<div class="stk-panel-tab' + (i === 0 ? ' active' : '') + '" onclick="switchStkPanelTab(' + i + ')" data-stk-tab="' + i + '">' + esc(groups[i].name || '表情包') + '</div>';
        }
        h += '</div>';
    }

    // 表情网格（分组内容）
    for (var i = 0; i < groups.length; i++) {
        var grp = groups[i];
        var stickers = grp.stickers || [];
        h += '<div class="stk-panel-grid" data-stk-grid="' + i + '"' + (i > 0 ? ' style="display:none;"' : '') + '>';
        if (!stickers.length) {
            h += '<div class="stk-panel-empty">该分组暂无表情</div>';
        } else {
            for (var j = 0; j < stickers.length; j++) {
                var s = stickers[j];
                h += '<div class="stk-panel-item" onclick="sendStickerMsg(\'' + esc(s.url || '').replace(/'/g, "\\'") + '\',\'' + esc(s.desc || '').replace(/'/g, "\\'") + '\')">';
                h += '<img src="' + esc(s.url || '') + '" alt="' + esc(s.desc || '') + '">';
                h += '</div>';
            }
        }
        h += '</div>';
    }

    panel.innerHTML = h;
}

// ★ 表情面板分组 tab 切换
function switchStkPanelTab(idx) {
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;
    // 切 tab 高亮
    var tabs = panel.querySelectorAll('.stk-panel-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', i === idx);
    }
    // 切内容
    var grids = panel.querySelectorAll('.stk-panel-grid');
    for (var i = 0; i < grids.length; i++) {
        grids[i].style.display = (i === idx) ? '' : 'none';
    }
}

// 发送表情包消息
function sendStickerMsg(url, desc) {
    if (!_chatCurrentConv || !url) return;
    var role = findRole(_chatCurrentConv);
    if (!role) return;
    var now = new Date();
    var ts = formatTime(now);
    var msg = { from: 'self', text: '[表情包]', time: ts, sticker: true, stickerUrl: url, stickerDesc: desc || '' };
    role.msgs.push(msg);
    role.lastMsg = '[表情包]';
    role.lastTime = now.getTime();
    role.lastTimeStr = ts;
    saveChatRoles();

    var body = document.getElementById('chatConvBody');
    if (body) {
        var ap = getActivePersona();
        var myAv = ap && ap.avatar ? ap.avatar : '';
        body.insertAdjacentHTML('beforeend', renderStickerBubbleRow(msg, role.msgs.length - 1, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }
    closeStickerPanel();
}

// 表情包管理页
function openStickerManager() {
    var groups = [];
    try { groups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { groups = []; }

    var h = '<div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;" id="stickerManagerOverlay" onclick="if(event.target===this)closeStickerManager()">';
    h += '<div style="background:#fff;border-radius:16px;width:90%;max-width:400px;max-height:80vh;overflow-y:auto;padding:20px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><b style="font-size:16px;">表情包管理</b><span onclick="closeStickerManager()" style="cursor:pointer;font-size:20px;color:#999;">✕</span></div>';

    if (!groups.length) {
        h += '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">暂无表情包分组</div>';
    } else {
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            h += '<div style="border:1px solid #eee;border-radius:10px;padding:10px;margin-bottom:10px;">';
            h += '<div style="display:flex;justify-content:space-between;align-items:center;"><b>' + esc(g.name || '未命名') + '</b><span onclick="deleteStickerGroup(' + i + ')" style="color:#e55;cursor:pointer;font-size:12px;">删除</span></div>';
            h += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px;">';
            var stickers = g.stickers || [];
            for (var j = 0; j < stickers.length; j++) {
                h += '<img src="' + esc(stickers[j].url || '') + '" style="width:50px;height:50px;object-fit:cover;border-radius:4px;">';
            }
            h += '</div></div>';
        }
    }

    h += '<div style="margin-top:12px;">';
    h += '<input id="stkGrpName" placeholder="分组名称" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:6px;box-sizing:border-box;">';
    h += '<textarea id="stkGrpUrls" placeholder="表情图片URL（每行一个）" rows="4" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;margin-bottom:6px;box-sizing:border-box;resize:vertical;"></textarea>';
    h += '<div onclick="addStickerGroup()" style="background:#f48fb1;color:#fff;text-align:center;padding:10px;border-radius:10px;cursor:pointer;">添加分组</div>';
    h += '</div>';

    h += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', h);
}

function closeStickerManager() {
    var el = document.getElementById('stickerManagerOverlay');
    if (el) el.remove();
}

function addStickerGroup() {
    var name = document.getElementById('stkGrpName').value.trim();
    var urlsText = document.getElementById('stkGrpUrls').value.trim();
    if (!name) { showToast('请输入分组名称'); return; }
    if (!urlsText) { showToast('请输入至少一个URL'); return; }
    var urls = urlsText.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var stickers = urls.map(function (u) { return { url: u, desc: '' }; });

    var groups = [];
    try { groups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { groups = []; }
    groups.push({ name: name, stickers: stickers });
    localStorage.setItem('ds_sticker_groups', JSON.stringify(groups));
    showToast('已添加');
    closeStickerManager();
    openStickerManager();
}

function deleteStickerGroup(idx) {
    var groups = [];
    try { groups = JSON.parse(localStorage.getItem('ds_sticker_groups') || '[]'); } catch (e) { groups = []; }
    groups.splice(idx, 1);
    localStorage.setItem('ds_sticker_groups', JSON.stringify(groups));
    showToast('已删除');
    closeStickerManager();
    openStickerManager();
}

// ★ 翻译功能样式注入
(function () {
    var style = document.createElement('style');
    style.textContent = '.chat-bubble-translate-divider{border-top:1px dashed rgba(0,0,0,0.2);margin:8px 0 6px 0}.chat-bubble-translate{font-size:12px;color:#666;line-height:1.5;white-space:pre-wrap;word-break:break-word}.chat-bubble-row.self .chat-bubble-translate-divider{border-top-color:rgba(255,255,255,0.3)}.chat-bubble-row.self .chat-bubble-translate{color:rgba(255,255,255,0.7)}.chat-bubble-translating{font-size:11px;color:#999;padding:2px 0;font-style:italic}';
    document.head.appendChild(style);
})();

/* ========== 礼物卡片气泡渲染 ========== */
function renderGiftCardBubbleRow(m, idx, myAv, roleAv) {
    var isSelf = m.from === 'self';
    var av = isSelf ? myAv : roleAv;
    var h = '';
    h += '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (av) h += '<img src="' + av + '" alt="">';
    else h += SVG_USER;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    h += '<div class="chat-bubble" style="background:transparent;padding:0;border:none;box-shadow:none;max-width:240px;">';

    // 礼物盒卡片
    var gd = m.giftData || {};
    var imgPart = gd.img
        ? '<img src="' + gd.img + '" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:10px;">'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:rgba(255,220,230,0.3);border-radius:10px;"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="rgba(255,160,180,0.5)" stroke-width="1.5"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V21"/><path d="M3 12h18"/><path d="M12 8c-1-3-5-4-5-1s4 1 5 1"/><path d="M12 8c1-3 5-4 5-1s-4 1-5 1"/></svg></div>';

    var titleText = m.giftCardType === 'request' ? '请帮我付款' : '快来拆封我送你的礼物吧';
    if (m.giftCardType === 'charGift') titleText = '送你一份礼物';

    h += '<div style="width:220px;background:rgba(255,255,255,0.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-radius:16px;border:1px solid rgba(255,255,255,0.7);box-shadow:0 4px 24px rgba(0,0,0,0.06);overflow:hidden;cursor:pointer;" onclick="event.stopPropagation();showGiftCardDetail(\'' + (gd.orderNo || '') + '\')">';
    h += '<div style="padding:12px 14px 8px;font-size:13px;font-weight:700;color:rgba(50,40,55,0.8);text-align:center;">' + esc(titleText) + '</div>';
    h += '<div style="width:100%;height:110px;padding:0 14px;box-sizing:border-box;"><div style="width:100%;height:100%;border-radius:10px;overflow:hidden;background:rgba(248,242,250,0.5);">' + imgPart + '</div></div>';
    h += '<div style="padding:8px 14px 10px;text-align:center;">';
    h += '<div style="font-size:12px;font-weight:600;color:rgba(50,40,55,0.7);margin-bottom:2px;">' + esc(gd.name || '') + '</div>';
    h += '<div style="font-size:14px;font-weight:800;color:rgba(255,110,140,0.9);">' + esc(gd.price || '0.00') + '</div>';
    h += '</div>';

    // 底部按钮区
    if (m.giftCardType === 'request' && !isSelf) {
        h += '<div style="display:flex;border-top:1px solid rgba(0,0,0,0.04);">';
        h += '<div style="flex:1;padding:10px;text-align:center;font-size:12px;font-weight:600;color:rgba(255,130,160,0.9);cursor:pointer;" onclick="event.stopPropagation();charConfirmPay(\'' + esc(gd.orderNo || '') + '\')">帮TA付款</div>';
        h += '</div>';
    } else if (m.giftCardType === 'charGift' && isSelf === false) {
        h += '<div style="display:flex;border-top:1px solid rgba(0,0,0,0.04);">';
        h += '<div style="flex:1;padding:10px;text-align:center;font-size:12px;font-weight:600;color:rgba(80,160,100,0.85);cursor:pointer;border-right:1px solid rgba(0,0,0,0.04);" onclick="event.stopPropagation();acceptCharGift(\'' + esc(gd.orderNo || '') + '\')">收下</div>';
        h += '<div style="flex:1;padding:10px;text-align:center;font-size:12px;font-weight:600;color:rgba(255,130,160,0.9);cursor:pointer;" onclick="event.stopPropagation();userPayForCharGift(\'' + esc(gd.orderNo || '') + '\')">我来付</div>';
        h += '</div>';
    }

    h += '</div>';  // card end
    h += '</div>';  // bubble end
    h += '</div>';  // content-wrap end
    h += '</div>';  // row end
    return h;
}

/* ========== 礼物卡片详情弹窗 ========== */
function showGiftCardDetail(orderNo) {
    if (typeof initGiftData === 'function') initGiftData();
    var order = null;
    for (var i = 0; i < giftOrders.length; i++) {
        if (giftOrders[i].orderNo === orderNo) { order = giftOrders[i]; break; }
    }
    if (!order) { if (typeof showToast === 'function') showToast('订单未找到'); return; }

    var ov = document.getElementById('giftCardDetailPopup');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'giftCardDetailPopup';
        document.querySelector('.phone-frame').appendChild(ov);
    }

    var imgPart = order.giftImg
        ? '<img src="' + order.giftImg + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(150,140,155,0.5);">无图</div>';

    var statusColor = order.status === '已发货' ? 'rgba(80,160,100,0.85)' : (order.status === '待代付' ? 'rgba(255,160,80,0.85)' : 'rgba(50,40,55,0.5)');

    ov.style.cssText = 'position:absolute;inset:0;z-index:999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border-radius:44px;animation:fadeIn 0.2s;';
    ov.innerHTML = '<div style="width:280px;background:rgba(255,255,255,0.92);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border-radius:20px;border:1px solid rgba(255,255,255,0.7);box-shadow:0 8px 40px rgba(0,0,0,0.1);overflow:hidden;" onclick="event.stopPropagation()">'
        + '<div style="width:100%;height:160px;overflow:hidden;background:rgba(248,242,250,0.5);">' + imgPart + '</div>'
        + '<div style="padding:14px 18px;">'
        + '<div style="font-size:16px;font-weight:700;color:rgba(50,40,55,0.85);margin-bottom:4px;">' + escGift(order.giftName) + '</div>'
        + '<div style="font-size:12px;color:rgba(50,40,55,0.35);margin-bottom:8px;">' + escGift(order.giftDesc || '') + '</div>'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'
        + '<span style="font-size:18px;font-weight:800;color:rgba(255,110,140,0.9);">' + order.price + '</span>'
        + '<span style="font-size:11px;font-weight:600;color:' + statusColor + ';padding:2px 8px;border-radius:8px;background:rgba(0,0,0,0.03);">' + escGift(order.status) + '</span>'
        + '</div>'
        + '<div style="font-size:11px;color:rgba(50,40,55,0.3);line-height:1.8;">'
        + '订单号: ' + order.orderNo + '<br>'
        + '时间: ' + formatOrderDate(order.createdAt) + '<br>'
        + '付款: ' + escGift(order.payType || '')
        + (order.address ? '<br>地址: ' + escGift(order.address) : '')
        + '</div>'
        + '</div>'
        + '<div style="padding:10px 18px 14px;border-top:1px solid rgba(0,0,0,0.04);text-align:center;">'
        + '<div style="display:inline-block;padding:8px 28px;border-radius:20px;background:rgba(255,140,170,0.15);color:rgba(255,100,140,0.85);font-size:13px;font-weight:600;cursor:pointer;" onclick="closeGiftCardDetail()">关闭</div>'
        + '</div>'
        + '</div>';

    ov.onclick = function (e) { if (e.target === ov) closeGiftCardDetail(); };
}

function closeGiftCardDetail() {
    var ov = document.getElementById('giftCardDetailPopup');
    if (ov) ov.remove();
}

/* ================================================================
   记忆总结 & 时间感知 — 功能函数
   ================================================================ */

// ============ 时区数据库 ============
var _TIME_ZONES = [
    // 东亚
    { code: 'CN', name: '中国', tz: 'Asia/Shanghai', label: 'UTC+8 北京时间' },
    { code: 'HK', name: '中国香港', tz: 'Asia/Hong_Kong', label: 'UTC+8 香港时间' },
    { code: 'TW', name: '中国台湾', tz: 'Asia/Taipei', label: 'UTC+8 台北时间' },
    { code: 'MO', name: '中国澳门', tz: 'Asia/Macau', label: 'UTC+8 澳门时间' },
    { code: 'JP', name: '日本', tz: 'Asia/Tokyo', label: 'UTC+9 日本标准时间' },
    { code: 'KR', name: '韩国', tz: 'Asia/Seoul', label: 'UTC+9 韩国标准时间' },
    { code: 'KP', name: '朝鲜', tz: 'Asia/Pyongyang', label: 'UTC+9 平壤时间' },
    { code: 'MN', name: '蒙古', tz: 'Asia/Ulaanbaatar', label: 'UTC+8 乌兰巴托时间' },
    // 东南亚
    { code: 'SG', name: '新加坡', tz: 'Asia/Singapore', label: 'UTC+8 新加坡时间' },
    { code: 'MY', name: '马来西亚', tz: 'Asia/Kuala_Lumpur', label: 'UTC+8 马来西亚时间' },
    { code: 'PH', name: '菲律宾', tz: 'Asia/Manila', label: 'UTC+8 菲律宾时间' },
    { code: 'TH', name: '泰国', tz: 'Asia/Bangkok', label: 'UTC+7 泰国时间' },
    { code: 'VN', name: '越南', tz: 'Asia/Ho_Chi_Minh', label: 'UTC+7 越南时间' },
    { code: 'ID', name: '印度尼西亚(西部)', tz: 'Asia/Jakarta', label: 'UTC+7 印尼西部时间' },
    { code: 'ID', name: '印度尼西亚(中部)', tz: 'Asia/Makassar', label: 'UTC+8 印尼中部时间' },
    { code: 'ID', name: '印度尼西亚(东部)', tz: 'Asia/Jayapura', label: 'UTC+9 印尼东部时间' },
    { code: 'MM', name: '缅甸', tz: 'Asia/Yangon', label: 'UTC+6:30 缅甸时间' },
    { code: 'KH', name: '柬埔寨', tz: 'Asia/Phnom_Penh', label: 'UTC+7 柬埔寨时间' },
    { code: 'LA', name: '老挝', tz: 'Asia/Vientiane', label: 'UTC+7 老挝时间' },
    { code: 'BN', name: '文莱', tz: 'Asia/Brunei', label: 'UTC+8 文莱时间' },
    { code: 'TL', name: '东帝汶', tz: 'Asia/Dili', label: 'UTC+9 东帝汶时间' },
    // 南亚
    { code: 'IN', name: '印度', tz: 'Asia/Kolkata', label: 'UTC+5:30 印度时间' },
    { code: 'PK', name: '巴基斯坦', tz: 'Asia/Karachi', label: 'UTC+5 巴基斯坦时间' },
    { code: 'BD', name: '孟加拉国', tz: 'Asia/Dhaka', label: 'UTC+6 孟加拉时间' },
    { code: 'LK', name: '斯里兰卡', tz: 'Asia/Colombo', label: 'UTC+5:30 斯里兰卡时间' },
    { code: 'NP', name: '尼泊尔', tz: 'Asia/Kathmandu', label: 'UTC+5:45 尼泊尔时间' },
    { code: 'AF', name: '阿富汗', tz: 'Asia/Kabul', label: 'UTC+4:30 阿富汗时间' },
    { code: 'MV', name: '马尔代夫', tz: 'Indian/Maldives', label: 'UTC+5 马尔代夫时间' },
    // 中亚
    { code: 'KZ', name: '哈萨克斯坦(阿拉木图)', tz: 'Asia/Almaty', label: 'UTC+6 阿拉木图时间' },
    { code: 'UZ', name: '乌兹别克斯坦', tz: 'Asia/Tashkent', label: 'UTC+5 乌兹别克时间' },
    { code: 'KG', name: '吉尔吉斯斯坦', tz: 'Asia/Bishkek', label: 'UTC+6 吉尔吉斯时间' },
    { code: 'TJ', name: '塔吉克斯坦', tz: 'Asia/Dushanbe', label: 'UTC+5 塔吉克时间' },
    { code: 'TM', name: '土库曼斯坦', tz: 'Asia/Ashgabat', label: 'UTC+5 土库曼时间' },
    // 西亚/中东
    { code: 'AE', name: '阿联酋', tz: 'Asia/Dubai', label: 'UTC+4 海湾时间' },
    { code: 'SA', name: '沙特阿拉伯', tz: 'Asia/Riyadh', label: 'UTC+3 阿拉伯时间' },
    { code: 'TR', name: '土耳其', tz: 'Europe/Istanbul', label: 'UTC+3 土耳其时间' },
    { code: 'IR', name: '伊朗', tz: 'Asia/Tehran', label: 'UTC+3:30 伊朗时间' },
    { code: 'IQ', name: '伊拉克', tz: 'Asia/Baghdad', label: 'UTC+3 伊拉克时间' },
    { code: 'IL', name: '以色列', tz: 'Asia/Jerusalem', label: 'UTC+2 以色列时间' },
    { code: 'JO', name: '约旦', tz: 'Asia/Amman', label: 'UTC+3 约旦时间' },
    { code: 'LB', name: '黎巴嫩', tz: 'Asia/Beirut', label: 'UTC+2 黎巴嫩时间' },
    { code: 'KW', name: '科威特', tz: 'Asia/Kuwait', label: 'UTC+3 科威特时间' },
    { code: 'QA', name: '卡塔尔', tz: 'Asia/Qatar', label: 'UTC+3 卡塔尔时间' },
    { code: 'BH', name: '巴林', tz: 'Asia/Bahrain', label: 'UTC+3 巴林时间' },
    { code: 'OM', name: '阿曼', tz: 'Asia/Muscat', label: 'UTC+4 阿曼时间' },
    { code: 'YE', name: '也门', tz: 'Asia/Aden', label: 'UTC+3 也门时间' },
    { code: 'SY', name: '叙利亚', tz: 'Asia/Damascus', label: 'UTC+3 叙利亚时间' },
    { code: 'GE', name: '格鲁吉亚', tz: 'Asia/Tbilisi', label: 'UTC+4 格鲁吉亚时间' },
    { code: 'AM', name: '亚美尼亚', tz: 'Asia/Yerevan', label: 'UTC+4 亚美尼亚时间' },
    { code: 'AZ', name: '阿塞拜疆', tz: 'Asia/Baku', label: 'UTC+4 阿塞拜疆时间' },
    { code: 'CY', name: '塞浦路斯', tz: 'Asia/Nicosia', label: 'UTC+2 塞浦路斯时间' },
    // 欧洲 - 西欧
    { code: 'GB', name: '英国', tz: 'Europe/London', label: 'UTC+0 格林威治时间' },
    { code: 'IE', name: '爱尔兰', tz: 'Europe/Dublin', label: 'UTC+0 爱尔兰时间' },
    { code: 'FR', name: '法国', tz: 'Europe/Paris', label: 'UTC+1 中欧时间' },
    { code: 'DE', name: '德国', tz: 'Europe/Berlin', label: 'UTC+1 中欧时间' },
    { code: 'NL', name: '荷兰', tz: 'Europe/Amsterdam', label: 'UTC+1 中欧时间' },
    { code: 'BE', name: '比利时', tz: 'Europe/Brussels', label: 'UTC+1 中欧时间' },
    { code: 'LU', name: '卢森堡', tz: 'Europe/Luxembourg', label: 'UTC+1 中欧时间' },
    { code: 'CH', name: '瑞士', tz: 'Europe/Zurich', label: 'UTC+1 中欧时间' },
    { code: 'AT', name: '奥地利', tz: 'Europe/Vienna', label: 'UTC+1 中欧时间' },
    { code: 'LI', name: '列支敦士登', tz: 'Europe/Vaduz', label: 'UTC+1 中欧时间' },
    { code: 'MC', name: '摩纳哥', tz: 'Europe/Monaco', label: 'UTC+1 中欧时间' },
    // 欧洲 - 南欧
    { code: 'IT', name: '意大利', tz: 'Europe/Rome', label: 'UTC+1 中欧时间' },
    { code: 'ES', name: '西班牙', tz: 'Europe/Madrid', label: 'UTC+1 中欧时间' },
    { code: 'PT', name: '葡萄牙', tz: 'Europe/Lisbon', label: 'UTC+0 西欧时间' },
    { code: 'GR', name: '希腊', tz: 'Europe/Athens', label: 'UTC+2 东欧时间' },
    { code: 'MT', name: '马耳他', tz: 'Europe/Malta', label: 'UTC+1 中欧时间' },
    { code: 'HR', name: '克罗地亚', tz: 'Europe/Zagreb', label: 'UTC+1 中欧时间' },
    { code: 'SI', name: '斯洛文尼亚', tz: 'Europe/Ljubljana', label: 'UTC+1 中欧时间' },
    { code: 'RS', name: '塞尔维亚', tz: 'Europe/Belgrade', label: 'UTC+1 中欧时间' },
    { code: 'BA', name: '波黑', tz: 'Europe/Sarajevo', label: 'UTC+1 中欧时间' },
    { code: 'ME', name: '黑山', tz: 'Europe/Podgorica', label: 'UTC+1 中欧时间' },
    { code: 'MK', name: '北马其顿', tz: 'Europe/Skopje', label: 'UTC+1 中欧时间' },
    { code: 'AL', name: '阿尔巴尼亚', tz: 'Europe/Tirane', label: 'UTC+1 中欧时间' },
    // 欧洲 - 北欧
    { code: 'SE', name: '瑞典', tz: 'Europe/Stockholm', label: 'UTC+1 中欧时间' },
    { code: 'NO', name: '挪威', tz: 'Europe/Oslo', label: 'UTC+1 中欧时间' },
    { code: 'DK', name: '丹麦', tz: 'Europe/Copenhagen', label: 'UTC+1 中欧时间' },
    { code: 'FI', name: '芬兰', tz: 'Europe/Helsinki', label: 'UTC+2 东欧时间' },
    { code: 'IS', name: '冰岛', tz: 'Atlantic/Reykjavik', label: 'UTC+0 冰岛时间' },
    // 欧洲 - 东欧
    { code: 'PL', name: '波兰', tz: 'Europe/Warsaw', label: 'UTC+1 中欧时间' },
    { code: 'CZ', name: '捷克', tz: 'Europe/Prague', label: 'UTC+1 中欧时间' },
    { code: 'SK', name: '斯洛伐克', tz: 'Europe/Bratislava', label: 'UTC+1 中欧时间' },
    { code: 'HU', name: '匈牙利', tz: 'Europe/Budapest', label: 'UTC+1 中欧时间' },
    { code: 'RO', name: '罗马尼亚', tz: 'Europe/Bucharest', label: 'UTC+2 东欧时间' },
    { code: 'BG', name: '保加利亚', tz: 'Europe/Sofia', label: 'UTC+2 东欧时间' },
    { code: 'UA', name: '乌克兰', tz: 'Europe/Kyiv', label: 'UTC+2 东欧时间' },
    { code: 'MD', name: '摩尔多瓦', tz: 'Europe/Chisinau', label: 'UTC+2 东欧时间' },
    { code: 'BY', name: '白俄罗斯', tz: 'Europe/Minsk', label: 'UTC+3 莫斯科时间' },
    { code: 'LT', name: '立陶宛', tz: 'Europe/Vilnius', label: 'UTC+2 东欧时间' },
    { code: 'LV', name: '拉脱维亚', tz: 'Europe/Riga', label: 'UTC+2 东欧时间' },
    { code: 'EE', name: '爱沙尼亚', tz: 'Europe/Tallinn', label: 'UTC+2 东欧时间' },
    // 俄罗斯
    { code: 'RU', name: '俄罗斯(莫斯科)', tz: 'Europe/Moscow', label: 'UTC+3 莫斯科时间' },
    { code: 'RU', name: '俄罗斯(叶卡捷琳堡)', tz: 'Asia/Yekaterinburg', label: 'UTC+5 叶卡捷琳堡时间' },
    { code: 'RU', name: '俄罗斯(新西伯利亚)', tz: 'Asia/Novosibirsk', label: 'UTC+7 新西伯利亚时间' },
    { code: 'RU', name: '俄罗斯(海参崴)', tz: 'Asia/Vladivostok', label: 'UTC+10 海参崴时间' },
    { code: 'RU', name: '俄罗斯(堪察加)', tz: 'Asia/Kamchatka', label: 'UTC+12 堪察加时间' },
    // 北美
    { code: 'US', name: '美国(东部)', tz: 'America/New_York', label: 'UTC-5 美东时间' },
    { code: 'US', name: '美国(中部)', tz: 'America/Chicago', label: 'UTC-6 美中时间' },
    { code: 'US', name: '美国(山地)', tz: 'America/Denver', label: 'UTC-7 美山地时间' },
    { code: 'US', name: '美国(西部)', tz: 'America/Los_Angeles', label: 'UTC-8 美西时间' },
    { code: 'US', name: '美国(阿拉斯加)', tz: 'America/Anchorage', label: 'UTC-9 阿拉斯加时间' },
    { code: 'US', name: '美国(夏威夷)', tz: 'Pacific/Honolulu', label: 'UTC-10 夏威夷时间' },
    { code: 'CA', name: '加拿大(东部)', tz: 'America/Toronto', label: 'UTC-5 加东时间' },
    { code: 'CA', name: '加拿大(中部)', tz: 'America/Winnipeg', label: 'UTC-6 加中时间' },
    { code: 'CA', name: '加拿大(山地)', tz: 'America/Edmonton', label: 'UTC-7 加山地时间' },
    { code: 'CA', name: '加拿大(西部)', tz: 'America/Vancouver', label: 'UTC-8 加西时间' },
    { code: 'CA', name: '加拿大(大西洋)', tz: 'America/Halifax', label: 'UTC-4 大西洋时间' },
    { code: 'CA', name: '加拿大(纽芬兰)', tz: 'America/St_Johns', label: 'UTC-3:30 纽芬兰时间' },
    { code: 'MX', name: '墨西哥(中部)', tz: 'America/Mexico_City', label: 'UTC-6 墨西哥时间' },
    { code: 'MX', name: '墨西哥(太平洋)', tz: 'America/Mazatlan', label: 'UTC-7 墨太平洋时间' },
    { code: 'MX', name: '墨西哥(西北)', tz: 'America/Tijuana', label: 'UTC-8 墨西北时间' },
    // 中美洲 & 加勒比
    { code: 'GT', name: '危地马拉', tz: 'America/Guatemala', label: 'UTC-6 危地马拉时间' },
    { code: 'BZ', name: '伯利兹', tz: 'America/Belize', label: 'UTC-6 伯利兹时间' },
    { code: 'SV', name: '萨尔瓦多', tz: 'America/El_Salvador', label: 'UTC-6 萨尔瓦多时间' },
    { code: 'HN', name: '洪都拉斯', tz: 'America/Tegucigalpa', label: 'UTC-6 洪都拉斯时间' },
    { code: 'NI', name: '尼加拉瓜', tz: 'America/Managua', label: 'UTC-6 尼加拉瓜时间' },
    { code: 'CR', name: '哥斯达黎加', tz: 'America/Costa_Rica', label: 'UTC-6 哥斯达黎加时间' },
    { code: 'PA', name: '巴拿马', tz: 'America/Panama', label: 'UTC-5 巴拿马时间' },
    { code: 'CU', name: '古巴', tz: 'America/Havana', label: 'UTC-5 古巴时间' },
    { code: 'JM', name: '牙买加', tz: 'America/Jamaica', label: 'UTC-5 牙买加时间' },
    { code: 'HT', name: '海地', tz: 'America/Port-au-Prince', label: 'UTC-5 海地时间' },
    { code: 'DO', name: '多米尼加', tz: 'America/Santo_Domingo', label: 'UTC-4 多米尼加时间' },
    { code: 'PR', name: '波多黎各', tz: 'America/Puerto_Rico', label: 'UTC-4 波多黎各时间' },
    { code: 'TT', name: '特立尼达和多巴哥', tz: 'America/Port_of_Spain', label: 'UTC-4 特多时间' },
    // 南美
    { code: 'BR', name: '巴西(圣保罗)', tz: 'America/Sao_Paulo', label: 'UTC-3 巴西时间' },
    { code: 'BR', name: '巴西(马瑙斯)', tz: 'America/Manaus', label: 'UTC-4 亚马逊时间' },
    { code: 'AR', name: '阿根廷', tz: 'America/Argentina/Buenos_Aires', label: 'UTC-3 阿根廷时间' },
    { code: 'CL', name: '智利', tz: 'America/Santiago', label: 'UTC-4 智利时间' },
    { code: 'CO', name: '哥伦比亚', tz: 'America/Bogota', label: 'UTC-5 哥伦比亚时间' },
    { code: 'PE', name: '秘鲁', tz: 'America/Lima', label: 'UTC-5 秘鲁时间' },
    { code: 'VE', name: '委内瑞拉', tz: 'America/Caracas', label: 'UTC-4 委内瑞拉时间' },
    { code: 'EC', name: '厄瓜多尔', tz: 'America/Guayaquil', label: 'UTC-5 厄瓜多尔时间' },
    { code: 'BO', name: '玻利维亚', tz: 'America/La_Paz', label: 'UTC-4 玻利维亚时间' },
    { code: 'PY', name: '巴拉圭', tz: 'America/Asuncion', label: 'UTC-4 巴拉圭时间' },
    { code: 'UY', name: '乌拉圭', tz: 'America/Montevideo', label: 'UTC-3 乌拉圭时间' },
    { code: 'GY', name: '圭亚那', tz: 'America/Guyana', label: 'UTC-4 圭亚那时间' },
    { code: 'SR', name: '苏里南', tz: 'America/Paramaribo', label: 'UTC-3 苏里南时间' },
    // 非洲
    { code: 'EG', name: '埃及', tz: 'Africa/Cairo', label: 'UTC+2 东欧时间' },
    { code: 'ZA', name: '南非', tz: 'Africa/Johannesburg', label: 'UTC+2 南非时间' },
    { code: 'NG', name: '尼日利亚', tz: 'Africa/Lagos', label: 'UTC+1 西非时间' },
    { code: 'KE', name: '肯尼亚', tz: 'Africa/Nairobi', label: 'UTC+3 东非时间' },
    { code: 'ET', name: '埃塞俄比亚', tz: 'Africa/Addis_Ababa', label: 'UTC+3 东非时间' },
    { code: 'TZ', name: '坦桑尼亚', tz: 'Africa/Dar_es_Salaam', label: 'UTC+3 东非时间' },
    { code: 'GH', name: '加纳', tz: 'Africa/Accra', label: 'UTC+0 格林威治时间' },
    { code: 'CI', name: '科特迪瓦', tz: 'Africa/Abidjan', label: 'UTC+0 格林威治时间' },
    { code: 'SN', name: '塞内加尔', tz: 'Africa/Dakar', label: 'UTC+0 格林威治时间' },
    { code: 'CM', name: '喀麦隆', tz: 'Africa/Douala', label: 'UTC+1 西非时间' },
    { code: 'CD', name: '刚果(金)', tz: 'Africa/Kinshasa', label: 'UTC+1 西非时间' },
    { code: 'AO', name: '安哥拉', tz: 'Africa/Luanda', label: 'UTC+1 西非时间' },
    { code: 'MA', name: '摩洛哥', tz: 'Africa/Casablanca', label: 'UTC+1 摩洛哥时间' },
    { code: 'TN', name: '突尼斯', tz: 'Africa/Tunis', label: 'UTC+1 中欧时间' },
    { code: 'DZ', name: '阿尔及利亚', tz: 'Africa/Algiers', label: 'UTC+1 中欧时间' },
    { code: 'LY', name: '利比亚', tz: 'Africa/Tripoli', label: 'UTC+2 东欧时间' },
    { code: 'SD', name: '苏丹', tz: 'Africa/Khartoum', label: 'UTC+2 东非时间' },
    { code: 'UG', name: '乌干达', tz: 'Africa/Kampala', label: 'UTC+3 东非时间' },
    { code: 'RW', name: '卢旺达', tz: 'Africa/Kigali', label: 'UTC+2 中非时间' },
    { code: 'MG', name: '马达加斯加', tz: 'Africa/Antananarivo', label: 'UTC+3 东非时间' },
    { code: 'MU', name: '毛里求斯', tz: 'Indian/Mauritius', label: 'UTC+4 毛里求斯时间' },
    // 大洋洲
    { code: 'AU', name: '澳大利亚(悉尼)', tz: 'Australia/Sydney', label: 'UTC+10 澳东时间' },
    { code: 'AU', name: '澳大利亚(墨尔本)', tz: 'Australia/Melbourne', label: 'UTC+10 澳东时间' },
    { code: 'AU', name: '澳大利亚(布里斯班)', tz: 'Australia/Brisbane', label: 'UTC+10 澳东时间(无夏令时)' },
    { code: 'AU', name: '澳大利亚(珀斯)', tz: 'Australia/Perth', label: 'UTC+8 澳西时间' },
    { code: 'AU', name: '澳大利亚(阿德莱德)', tz: 'Australia/Adelaide', label: 'UTC+9:30 澳中时间' },
    { code: 'AU', name: '澳大利亚(达尔文)', tz: 'Australia/Darwin', label: 'UTC+9:30 澳中时间(无夏令时)' },
    { code: 'NZ', name: '新西兰', tz: 'Pacific/Auckland', label: 'UTC+12 新西兰时间' },
    { code: 'FJ', name: '斐济', tz: 'Pacific/Fiji', label: 'UTC+12 斐济时间' },
    { code: 'PG', name: '巴布亚新几内亚', tz: 'Pacific/Port_Moresby', label: 'UTC+10 巴新时间' },
    { code: 'WS', name: '萨摩亚', tz: 'Pacific/Apia', label: 'UTC+13 萨摩亚时间' },
    { code: 'TO', name: '汤加', tz: 'Pacific/Tongatapu', label: 'UTC+13 汤加时间' },
    { code: 'GU', name: '关岛', tz: 'Pacific/Guam', label: 'UTC+10 关岛时间' },
    { code: 'NC', name: '新喀里多尼亚', tz: 'Pacific/Noumea', label: 'UTC+11 新喀时间' },
    // 特殊地区
    { code: 'GL', name: '格陵兰', tz: 'America/Godthab', label: 'UTC-3 格陵兰时间' },
];

function getTimeZoneData(tzId) {
    for (var i = 0; i < _TIME_ZONES.length; i++) {
        if (_TIME_ZONES[i].tz === tzId) return _TIME_ZONES[i];
    }
    return _TIME_ZONES[0];
}

function formatTimeForZone(tzId) {
    try {
        return new Date().toLocaleTimeString('zh-CN', { timeZone: tzId, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    } catch (e) {
        return new Date().toLocaleTimeString('zh-CN', { hour12: false });
    }
}

function formatDateForZone(tzId) {
    try {
        return new Date().toLocaleDateString('zh-CN', { timeZone: tzId, year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    } catch (e) {
        return new Date().toLocaleDateString('zh-CN');
    }
}

function getTimePeriod(tzId) {
    var h;
    try {
        h = parseInt(new Date().toLocaleTimeString('en-US', { timeZone: tzId, hour: 'numeric', hour12: false }), 10);
    } catch (e) {
        h = new Date().getHours();
    }
    if (h >= 5 && h < 8) return { p: '清晨' };
    if (h >= 8 && h < 11) return { p: '上午' };
    if (h >= 11 && h < 13) return { p: '中午' };
    if (h >= 13 && h < 17) return { p: '下午' };
    if (h >= 17 && h < 19) return { p: '傍晚' };
    if (h >= 19 && h < 22) return { p: '晚上' };
    return { p: '深夜' };
}

// ============ 面板展开/收起 ============
function toggleMemoryPanel(on) {
    var p = document.getElementById('csMemoryPanel');
    if (p) { if (on) p.classList.add('active'); else p.classList.remove('active'); }
}

function toggleTimePanel(on) {
    var p = document.getElementById('csTimePanel');
    if (p) { if (on) { p.classList.add('active'); startSettingsClock(); } else { p.classList.remove('active'); stopSettingsClock(); } }
}

// ============ 实时时钟 ============
var _settingsClockTimer = null;

function startSettingsClock() {
    stopSettingsClock();
    _settingsClockTimer = setInterval(function () {
        var role = findRole(_chatCurrentConv);
        var tz = (role && role.timeAwareZone) || 'Asia/Shanghai';
        var cl = document.getElementById('csTimeClock');
        var dt = document.getElementById('csTimeDate');
        if (cl) cl.textContent = formatTimeForZone(tz);
        if (dt) dt.textContent = formatDateForZone(tz);
    }, 1000);
}

function stopSettingsClock() {
    if (_settingsClockTimer) { clearInterval(_settingsClockTimer); _settingsClockTimer = null; }
}

// ============ 国家列表 ============
function buildTimeCountryListHTML(selectedTz, filter) {
    var h = '', f = (filter || '').toLowerCase();
    for (var i = 0; i < _TIME_ZONES.length; i++) {
        var t = _TIME_ZONES[i];
        if (f && t.name.toLowerCase().indexOf(f) === -1 && t.tz.toLowerCase().indexOf(f) === -1 && t.code.toLowerCase().indexOf(f) === -1) continue;
        var sel = t.tz === selectedTz;
        h += '<div class="cs-time-opt' + (sel ? ' sel' : '') + '" onclick="selectTimeCountry(\'' + t.tz + '\')">';
        h += '<span class="cs-time-opt-flag">' + t.code + '</span>';
        h += '<div class="cs-time-opt-info">';
        h += '<div class="cs-time-opt-name">' + t.name + '</div>';
        h += '<div class="cs-time-opt-tz">' + t.label + '</div>';
        h += '</div>';
        h += '<span class="cs-time-opt-chk">' + (sel ? '✓' : '') + '</span>';
        h += '</div>';
    }
    if (!h) h = '<div class="cs-time-empty">没有匹配的国家</div>';
    return h;
}

function toggleTimeCountryList() {
    var dd = document.getElementById('csTimeDropdown');
    var ar = document.getElementById('csTimeArrow');
    if (dd) dd.classList.toggle('open');
    if (ar) ar.classList.toggle('open');
}

function filterTimeCountries(val) {
    var role = findRole(_chatCurrentConv);
    var tz = (role && role.timeAwareZone) || 'Asia/Shanghai';
    var el = document.getElementById('csTimeCountryList');
    if (el) el.innerHTML = buildTimeCountryListHTML(tz, val);
}

function selectTimeCountry(tzId) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.timeAwareZone = tzId;
    saveChatRoles();

    var info = getTimeZoneData(tzId);
    var e;
    e = document.getElementById('csTimeCurFlag'); if (e) e.textContent = info.code;
    e = document.getElementById('csTimeCurName'); if (e) e.textContent = info.name;
    e = document.getElementById('csTimeCurTz'); if (e) e.textContent = info.label;
    e = document.getElementById('csTimeZoneLabel'); if (e) e.textContent = info.code + ' ' + info.name;
    e = document.getElementById('csTimeClock'); if (e) e.textContent = formatTimeForZone(tzId);
    e = document.getElementById('csTimeDate'); if (e) e.textContent = formatDateForZone(tzId);

    var el = document.getElementById('csTimeCountryList');
    var sv = document.getElementById('csTimeSearch');
    if (el) el.innerHTML = buildTimeCountryListHTML(tzId, sv ? sv.value : '');

    toggleTimeCountryList();
    showToast('已切换至 ' + info.name);
}

// ============ 记忆总结功能 ============

// 删除单条记忆
function deleteMemorySummary(idx) {
    var role = findRole(_chatCurrentConv); if (!role) return;
    if (!role.memorySummaries) return;
    role.memorySummaries.splice(idx, 1);
    saveChatRoles();
    refreshMemoryList();
    showToast('已删除');
}

// 清空全部记忆
function clearAllMemorySummaries() {
    if (!confirm('确认清空所有记忆总结？')) return;
    var role = findRole(_chatCurrentConv); if (!role) return;
    role.memorySummaries = [];
    role.memoryMsgCount = 0;
    saveChatRoles();
    refreshMemoryList();
    showToast('记忆已清空');
}

// 刷新记忆列表UI
function refreshMemoryList() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var list = role.memorySummaries || [];
    var count = role.memoryMsgCount || 0;
    var prog = count % 20;
    var pct = Math.round((prog / 20) * 100);

    var ce = document.getElementById('csMemCountDisplay');
    if (ce) ce.textContent = prog + ' / 20 条';
    var bf = document.getElementById('csMemBarFill');
    if (bf) bf.style.width = pct + '%';

    var ml = document.getElementById('csMemList');
    if (!ml) return;
    var h = '';
    if (list.length === 0) {
        h = '<div class="cs-mem-empty">暂无记忆总结<br><span>对话满20条后将自动生成</span></div>';
    } else {
        for (var i = list.length - 1; i >= 0; i--) {
            h += '<div class="cs-mem-item">';
            h += '<div class="cs-mem-item-time">' + esc(list[i].time) + '</div>';
            h += '<div class="cs-mem-item-text">' + esc(list[i].text) + '</div>';
            h += '<div class="cs-mem-item-del" onclick="deleteMemorySummary(' + i + ')">✕</div>';
            h += '</div>';
        }
    }
    ml.innerHTML = h;
}

// 手动触发总结
function triggerManualMemorySummary() {
    var role = findRole(_chatCurrentConv); if (!role) return;
    var msgs = role.msgs || [];
    if (msgs.length === 0) { showToast('暂无消息可总结'); return; }

    var recent = msgs.slice(-20);
    var text = buildMemorySummaryText(recent, role);

    if (!role.memorySummaries) role.memorySummaries = [];
    role.memorySummaries.push({
        time: new Date().toLocaleString('zh-CN') + ' (手动)',
        text: text,
        count: recent.length
    });
    saveChatRoles();
    refreshMemoryList();
    showToast('记忆总结已生成');
}

/**
 * 每条消息发送后调用 — 记忆自动计数+自动总结
 * ★ 在你的发送消息函数中调用：onChatMessageForMemory(role)
 */
function onChatMessageForMemory(role) {
    if (!role || !role.memoryAutoEnabled) return;
    if (!role.memoryMsgCount) role.memoryMsgCount = 0;
    role.memoryMsgCount++;

    if (role.memoryMsgCount % 20 === 0) {
        // 自动总结
        var msgs = role.msgs || [];
        var recent = msgs.slice(-20);
        var text = buildMemorySummaryText(recent, role);

        if (!role.memorySummaries) role.memorySummaries = [];
        role.memorySummaries.push({
            time: new Date().toLocaleString('zh-CN') + ' (自动)',
            text: text,
            count: 20
        });
    }

    saveChatRoles();
}

// 构建总结文本（提取最近消息的关键内容）
function buildMemorySummaryText(msgs, role) {
    var userMsgs = [], charMsgs = [];
    var charName = role.nickname || role.name || 'Char';

    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var txt = (m.text || m.content || '').trim();
        if (!txt) continue;
        if (m.who === 'self' || m.role === 'user' || m.sender === 'user') {
            userMsgs.push(txt);
        } else {
            charMsgs.push(txt);
        }
    }

    var s = '【第' + Math.ceil((role.memoryMsgCount || 1) / 20) + '轮记忆】';
    s += ' 共' + msgs.length + '条对话。';

    if (userMsgs.length > 0) {
        var lu = userMsgs.slice(-3);
        s += ' User说了: ';
        for (var a = 0; a < lu.length; a++) {
            s += '"' + lu[a].substring(0, 40) + (lu[a].length > 40 ? '...' : '') + '"';
            if (a < lu.length - 1) s += ', ';
        }
        s += '。';
    }

    if (charMsgs.length > 0) {
        var lc = charMsgs.slice(-3);
        s += ' ' + charName + '回应: ';
        for (var b = 0; b < lc.length; b++) {
            s += '"' + lc[b].substring(0, 40) + (lc[b].length > 40 ? '...' : '') + '"';
            if (b < lc.length - 1) s += ', ';
        }
        s += '。';
    }

    return s;
}

/**
 * 获取AI系统提示 — 在发送消息给AI时调用
 * ★ 将返回值追加到 system prompt 中
 * 用法：var extra = getMemoryAndTimePrompt(role);
 */
function getMemoryAndTimePrompt(role) {
    if (!role) return '';
    var parts = [];

    // 时间感知
    if (role.timeAwareEnabled) {
        var tz = role.timeAwareZone || 'Asia/Shanghai';
        var info = getTimeZoneData(tz);
        var tod = getTimePeriod(tz);
        parts.push(
            '[时间感知]\n' +
            '当前地区: ' + info.name + '（' + info.label + '）\n' +
            '日期: ' + formatDateForZone(tz) + '\n' +
            '时间: ' + formatTimeForZone(tz) + '\n' +
            '时段: ' + tod.p + '\n' +
            '你（角色）正处于' + info.name + '时间，请自然地将时间融入对话，' +
            '比如深夜可以表现困倦，早上可以说早安。不要生硬报时。'
        );
    }

    // 记忆总结
    if (role.memoryAutoEnabled && role.memorySummaries && role.memorySummaries.length > 0) {
        var ms = role.memorySummaries.slice(-5); // 最近5条
        var mt = '[对话记忆]\n以下是与User的历史记忆摘要，请据此保持对话连贯:\n\n';
        for (var i = 0; i < ms.length; i++) {
            mt += '记忆' + (i + 1) + ' (' + ms[i].time + '): ' + ms[i].text + '\n';
        }
        mt += '\n自然地运用这些记忆，不要告诉User你在查看记忆。';
        parts.push(mt);
    }

    return parts.join('\n\n');
}
