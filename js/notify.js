/* ============================================
   蛋薯机 DanShu Pro v2 — notify.js
   消息推送通知 + Char主动消息 + 铃声系统
   ============================================ */

/* ========== 全局变量 ========== */
var _notifySound = null;           // Audio 对象
var _notifySoundUrl = '';          // 铃声URL
var _charAutoTimers = {};          // 每个角色的主动消息定时器
var _charLastUserActivity = {};    // 每个角色上次收到user消息的时间戳
var NOTIFY_RINGTONE_KEY = 'ds_notify_ringtone';
var NOTIFY_CHAR_AUTO_KEY = 'ds_notify_char_auto'; // 全局 {roleId: true/false}

/* ========== 初始化 ========== */
document.addEventListener('DOMContentLoaded', function () {
    _notifySoundUrl = localStorage.getItem(NOTIFY_RINGTONE_KEY) || '';
    if (_notifySoundUrl) {
        _notifySound = new Audio(_notifySoundUrl);
        _notifySound.volume = 0.6;
    }
    // 启动所有已开启主动消息的角色定时器
    initAllAutoMessageTimers();
});

/* ========== 铃声系统 ========== */
function loadRingtoneUrl() {
    return localStorage.getItem(NOTIFY_RINGTONE_KEY) || '';
}

function saveRingtoneUrl(url) {
    localStorage.setItem(NOTIFY_RINGTONE_KEY, url);
    _notifySoundUrl = url;
    if (url) {
        _notifySound = new Audio(url);
        _notifySound.volume = 0.6;
    } else {
        _notifySound = null;
    }
}

function testRingtone() {
    var url = document.getElementById('appearRingtoneUrl').value.trim();
    if (!url) { showToast('请先输入铃声URL'); return; }
    try {
        var testAudio = new Audio(url);
        testAudio.volume = 0.6;
        testAudio.play().then(function () {
            showToast('正在播放铃声...');
            setTimeout(function () { testAudio.pause(); testAudio.currentTime = 0; }, 3000);
        }).catch(function () {
            showToast('铃声加载失败，请检查URL');
        });
    } catch (e) {
        showToast('铃声URL无效');
    }
}

function playNotifySound() {
    if (_notifySound && _notifySoundUrl) {
        try {
            _notifySound.currentTime = 0;
            _notifySound.play().catch(function () { /* 用户未交互则静默 */ });
        } catch (e) { }
    }
}

/* ==========================================================
   ======== 推送通知横幅 ========
   ========================================================== */

/**
 * 触发推送通知
 * @param {object} role - 角色对象
 * @param {string} text - 消息文本
 * @param {boolean} isAutoMsg - 是否为主动消息
 */
function triggerNotification(role, text, isAutoMsg) {
    if (!role) return;

    var roleName = role.nickname || role.name || '未知';
    var roleAvatar = role.avatar || '';
    var preview = text.length > 40 ? text.substring(0, 40) + '...' : text;

    // 播放铃声
    playNotifySound();

    // 判断是否在当前角色的对话页中
    var chatOverlay = document.getElementById('chatAppOverlay');
    var isInChat = chatOverlay && chatOverlay.classList.contains('show') && _chatCurrentConv === role.id;

    // 如果正在当前角色的对话页里，不弹推送（直接看到了）
    if (isInChat && !isAutoMsg) return;

    // 增加未读数
    if (_chatCurrentConv !== role.id) {
        role.unread = (role.unread || 0) + 1;
        saveChatRoles();
    }

    // 创建推送横幅
    showNotifyBanner(role.id, roleName, roleAvatar, preview, isAutoMsg);
}

function showNotifyBanner(roleId, name, avatar, text, isAutoMsg) {
    // 先立即移除已有的横幅（不等动画，防止时序冲突）
    removeNotifyBanner(true);
    var frame = document.getElementById('phoneFrame');
    if (!frame) return;

    var avHtml = avatar
        ? '<img src="' + avatar + '" alt="">'
        : '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    var h = '<div class="ds-notify-banner" id="dsNotifyBanner" onclick="handleNotifyTap(\'' + roleId + '\')">';
    h += '<div class="ds-notify-banner-inner">';
    h += '<div class="ds-notify-avatar">' + avHtml + '</div>';
    h += '<div class="ds-notify-content">';
    h += '<div class="ds-notify-header">';
    h += '<span class="ds-notify-name">' + esc(name) + '</span>';
    h += '<span class="ds-notify-label">聊一聊' + (isAutoMsg ? ' · 主动消息' : '') + '</span>';
    h += '</div>';
    h += '<div class="ds-notify-text">' + esc(text) + '</div>';
    h += '</div>';
    h += '<div class="ds-notify-close" onclick="event.stopPropagation();removeNotifyBanner()">×</div>';
    h += '</div></div>';

    frame.insertAdjacentHTML('afterbegin', h);

    // 触发进入动画
    setTimeout(function () {
        var banner = document.getElementById('dsNotifyBanner');
        if (banner) banner.classList.add('show');
    }, 30);

    // 5秒后自动消失（用全局变量管理，防止旧定时器误删新横幅）
    if (window._notifyAutoHideTimer) clearTimeout(window._notifyAutoHideTimer);
    window._notifyAutoHideTimer = setTimeout(function () {
        removeNotifyBanner();
    }, 5000);
}

function removeNotifyBanner(immediate) {
    var b = document.getElementById('dsNotifyBanner');
    if (b) {
        if (immediate) {
            // 立即移除，不等动画（给 showNotifyBanner 内部调用）
            b.removeAttribute('id');
            if (b.parentNode) b.remove();
        } else {
            // 正常带动画消失
            b.removeAttribute('id');  // ★ 先摘掉id，防止新banner被误删
            b.classList.remove('show');
            b.classList.add('hide');
            setTimeout(function () { if (b.parentNode) b.remove(); }, 400);
        }
    }
}

function handleNotifyTap(roleId) {
    removeNotifyBanner();
    // 如果聊天app没开，先打开
    var chatOverlay = document.getElementById('chatAppOverlay');
    if (!chatOverlay || !chatOverlay.classList.contains('show')) {
        openChatApp();
    }
    // 延迟一点再打开对话，确保聊天app已渲染
    setTimeout(function () {
        openConversation(roleId);
    }, 150);
}

/* ==========================================================
   ======== Char主动发消息系统 ========
   ========================================================== */

function getCharAutoSettings() {
    try { return JSON.parse(localStorage.getItem(NOTIFY_CHAR_AUTO_KEY) || '{}'); }
    catch (e) { return {}; }
}

function saveCharAutoSettings(obj) {
    safeSetItem(NOTIFY_CHAR_AUTO_KEY, JSON.stringify(obj));
}

function isCharAutoEnabled(roleId) {
    var s = getCharAutoSettings();
    return !!s[roleId];
}

function setCharAutoEnabled(roleId, enabled) {
    var s = getCharAutoSettings();
    if (enabled) {
        s[roleId] = true;
    } else {
        delete s[roleId];
    }
    saveCharAutoSettings(s);

    if (enabled) {
        startAutoMessageTimer(roleId);
    } else {
        stopAutoMessageTimer(roleId);
    }
}

/* ---- 记录用户最后活动时间 ---- */
function recordUserActivity(roleId) {
    _charLastUserActivity[roleId] = Date.now();
}

/* ---- 定时器管理 ---- */
function initAllAutoMessageTimers() {
    var settings = getCharAutoSettings();
    for (var roleId in settings) {
        if (settings[roleId]) {
            startAutoMessageTimer(roleId);
        }
    }
}

function startAutoMessageTimer(roleId) {
    stopAutoMessageTimer(roleId);
    // 初始化活动时间
    if (!_charLastUserActivity[roleId]) {
        _charLastUserActivity[roleId] = Date.now();
    }
    // 每5分钟检查一次
    _charAutoTimers[roleId] = setInterval(function () {
        checkAndSendAutoMessage(roleId);
    }, 5 * 60 * 1000);
}

function stopAutoMessageTimer(roleId) {
    if (_charAutoTimers[roleId]) {
        clearInterval(_charAutoTimers[roleId]);
        delete _charAutoTimers[roleId];
    }
}

function checkAndSendAutoMessage(roleId) {
    var role = findRole(roleId);
    if (!role) { stopAutoMessageTimer(roleId); return; }

    // 检查是否开启
    if (!isCharAutoEnabled(roleId)) { stopAutoMessageTimer(roleId); return; }

    // 检查API配置
    if (typeof getActiveApiConfig !== 'function') return;
    var apiConfig = getActiveApiConfig();
    if (!apiConfig || !apiConfig.url || !apiConfig.key || !apiConfig.model) return;

    // 30分钟没活动才触发
    var lastActivity = _charLastUserActivity[roleId] || 0;
    var elapsed = Date.now() - lastActivity;
    if (elapsed < 30 * 60 * 1000) return;  // 不到30分钟

    // 概率触发 — 每次检查30%概率
    if (Math.random() > 0.3) return;

    // 正在生成中就跳过
    if (_chatGenerating) return;

    // ★ 发送主动消息
    sendAutoMessage(role, apiConfig);

    // 重置活动时间，防止连续触发
    _charLastUserActivity[roleId] = Date.now();
}

function sendAutoMessage(role, apiConfig) {
    // 构建主动消息的 prompt
    var messages = buildChatMessages(role);

    // 添加一条系统指令让角色主动找话题
    messages.push({
        role: 'system',
        content: '【系统指令】对方已经有一段时间没有回复了。请你以角色身份主动发一条消息联系对方。' +
            '可以是关心对方在做什么、分享一件有趣的事、发一个搞笑的吐槽、或者根据你们之前的聊天内容找一个话题继续聊。' +
            '保持角色性格，语气要自然真实，就像真的在想念对方或无聊时随手发的消息。' +
            '长度1-3句话即可，不要太长。'
    });

    var url = apiConfig.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiConfig.key },
        body: JSON.stringify({ model: apiConfig.model, messages: messages, temperature: 0.9, top_p: 0.95, max_tokens: 512 })
    })
        .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
        .then(function (json) {
            var content = '';
            if (json.choices && json.choices.length > 0) content = (json.choices[0].message && json.choices[0].message.content) || '';
            content = content.trim();
            if (!content) return;

            // 分段
            var segments = content.split(/\n\n+/);
            var cleanSegments = [];
            for (var i = 0; i < segments.length; i++) { var s = segments[i].trim(); if (s) cleanSegments.push(s); }
            if (cleanSegments.length === 0) return;

            var now = new Date();
            var ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
            if (!role.msgs) role.msgs = [];

            for (var j = 0; j < cleanSegments.length; j++) {
                var txt = cleanSegments[j];
                var msgObj = { from: 'other', text: txt, time: ts, autoMsg: true };

                // 检测表情包
                var stkMatch = txt.match(/^\[sticker:(.+?)\]$/i);
                if (stkMatch && typeof findMatchingSticker === 'function') {
                    var stkDesc = stkMatch[1].trim();
                    var matchedUrl = findMatchingSticker(stkDesc);
                    if (matchedUrl) {
                        msgObj.sticker = true;
                        msgObj.stickerUrl = matchedUrl;
                        msgObj.stickerDesc = stkDesc;
                        msgObj.text = '[表情包]';
                    }
                }

                // 转账意图
                if (typeof interceptTransferIntent === 'function') {
                    interceptTransferIntent(role, msgObj);
                }

                role.msgs.push(msgObj);

                // 如果正好在这个角色的对话页中，实时插入气泡
                if (_chatCurrentConv === role.id) {
                    var body = document.getElementById('chatConvBody');
                    if (body) {
                        var ap = getActivePersona();
                        var myAv = ap && ap.avatar ? ap.avatar : '';
                        var msgIdx = role.msgs.length - 1;
                        if (typeof renderBubbleRow === 'function') {
                            body.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, msgIdx, myAv, role.avatar || ''));
                        }
                        body.scrollTop = body.scrollHeight;
                    }
                }
            }

            role.lastMsg = cleanSegments[cleanSegments.length - 1];
            role.lastTime = now.getTime();
            role.lastTimeStr = ts;
            saveChatRoles();

            // 刷新消息列表
            if (_chatCurrentTab === 'messages') {
                var chatOverlay = document.getElementById('chatAppOverlay');
                if (chatOverlay && chatOverlay.classList.contains('show') && !_chatCurrentConv) {
                    renderChatTab('messages');
                }
            }

            // ★ 触发推送通知
            triggerNotification(role, cleanSegments[0], true);
        })
        .catch(function (err) {
            // 主动消息失败不提示，静默处理
            console.log('Auto message failed for ' + role.name + ': ' + err.message);
        });
}


/* ==========================================================
   ======== 外观设置 — 铃声板块渲染 ========
   ========================================================== */

function buildRingtoneSection() {
    var currentUrl = loadRingtoneUrl();
    var h = '';
    h += '<div class="appear-section">';
    h += '<div class="appear-section-title"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>消息铃声</div>';

    h += '<div class="appear-field">';
    h += '<label>铃声URL（支持 mp3 / wav / ogg）</label>';
    h += '<input type="text" class="appear-input" id="appearRingtoneUrl" value="' + esc(currentUrl) + '" placeholder="https://example.com/notify.mp3">';
    h += '</div>';

    h += '<div class="appear-ringtone-btns">';
    h += '<div class="appear-wp-btn" onclick="testRingtone()">';
    h += '<svg viewBox="0 0 24 24" width="14" height="14"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
    h += '<span>试听</span>';
    h += '</div>';
    h += '<div class="appear-wp-btn" onclick="document.getElementById(\'appearRingtoneUrl\').value=\'\';showToast(\'已清空铃声\')">';
    h += '<svg viewBox="0 0 24 24" width="14" height="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    h += '<span>清空</span>';
    h += '</div>';
    h += '</div>';

    h += '<div class="appear-font-hint">设置后，收到角色消息时会播放此铃声。留空则使用默认振动效果。</div>';
    h += '</div>';
    return h;
}


/* ==========================================================
   ======== 聊天设置 — 主动消息开关渲染 ========
   ========================================================== */

function buildAutoMessageToggle(role) {
    var enabled = isCharAutoEnabled(role.id);
    var h = '';
    h += '<div class="chat-settings-toggle-row">';
    h += '<div><div class="chat-settings-toggle-label">允许角色主动消息</div>';
    h += '<div class="chat-settings-toggle-desc">开启后角色会在30分钟无互动时概率主动发消息</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csAutoMessage"' + (enabled ? ' checked' : '') + '><span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';
    return h;
}
