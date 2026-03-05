/* ============================================
   蛋薯机 DanShu Pro — phonesnoop.js
   「查手机」功能 v2
   ★ 保留：翻看聊天记录 + 锁屏
   ★ 移除：替 user 回消息
   ★ 所有 AI 回复严格贴人设，绝对禁止 OOC
   ★ 锁屏：全屏真实锁定 5 分钟，右上角可解锁
   ============================================ */

var _peekPhoneTimers = {};
var PEEK_PHONE_KEY = 'ds_chat_peek_phone';
var PEEK_MEMORY_KEY = 'ds_peek_memory';

/* ---------- 配置 ---------- */
function loadPeekConfig() {
    try { return JSON.parse(localStorage.getItem(PEEK_PHONE_KEY) || '{}'); } catch (e) { return {}; }
}
function savePeekConfig(cfg) {
    try { localStorage.setItem(PEEK_PHONE_KEY, JSON.stringify(cfg)); } catch (e) { }
}

/* ---------- 记忆 ---------- */
function loadPeekMemory(roleId) {
    try {
        var all = JSON.parse(localStorage.getItem(PEEK_MEMORY_KEY) || '{}');
        return all[roleId] || [];
    } catch (e) { return []; }
}
function savePeekMemory(roleId, arr) {
    try {
        var all = JSON.parse(localStorage.getItem(PEEK_MEMORY_KEY) || '{}');
        all[roleId] = arr.slice(-20);
        localStorage.setItem(PEEK_MEMORY_KEY, JSON.stringify(all));
    } catch (e) { }
}
function addPeekMemory(roleId, text) {
    var arr = loadPeekMemory(roleId);
    var now = new Date();
    var ts = now.toLocaleDateString('zh-CN') + ' ' +
        now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    arr.push({ time: ts, text: text });
    savePeekMemory(roleId, arr);
}
function getPeekMemoryText(roleId) {
    var arr = loadPeekMemory(roleId);
    if (!arr.length) return '';
    var lines = [];
    for (var i = 0; i < arr.length; i++) lines.push(arr[i].time + ' ' + arr[i].text);
    return '【你之前查手机的记录，可以自然提起】\n' + lines.join('\n') + '\n';
}

/* ---------- 工具函数 ---------- */
function getSnoopUserName(roleId) {
    var p = (typeof getActivePersona === 'function') ? getActivePersona(roleId) : null;
    return p ? p.name : 'user';
}

function _snoopPad(n) { return n < 10 ? '0' + n : '' + n; }
function _snoopTimeStr() {
    var d = new Date();
    return _snoopPad(d.getHours()) + ':' + _snoopPad(d.getMinutes());
}

/* ===================================================
   设置面板 HTML
   =================================================== */
function renderPeekSettingHTML(roleId) {
    var cfg = loadPeekConfig();
    var rc = cfg[roleId] || {};
    var enabled = !!rc.enabled;
    var interval = rc.interval || 60;

    var h = '';
    h += '<div class="chat-settings-toggle-row" id="peekToggleRow">';
    h += '<div><div class="chat-settings-toggle-label">';
    h += '<svg viewBox="0 0 24 24" width="16" height="16" style="vertical-align:middle;margin-right:4px;stroke:#d4506a;stroke-width:2;fill:none"><rect x="6" y="3" width="12" height="18" rx="2"/><line x1="12" y1="17" x2="12" y2="17" stroke-linecap="round"/></svg>';
    h += '允许查手机</div>';
    h += '<div class="chat-settings-toggle-desc">开启后角色可随时突袭查看你的手机</div></div>';
    h += '<label class="chat-cr-toggle"><input type="checkbox" id="csPeekPhone"' +
        (enabled ? ' checked' : '') +
        ' onchange="onPeekToggleChange(\'' + roleId + '\',this.checked)">' +
        '<span class="chat-cr-toggle-track"></span></label>';
    h += '</div>';

    h += '<div class="snoop-options' + (enabled ? ' show' : '') + '" id="snoopOptions_' + roleId + '">';
    h += '<div class="snoop-option-row">';
    h += '<span class="snoop-option-label">查手机间隔</span>';
    h += '<select class="snoop-interval-select" id="snoopInterval_' + roleId + '" onchange="updateSnoopInterval(\'' + roleId + '\')">';
    var ivs = [
        { v: 5, t: '5 分钟（测试）' }, { v: 15, t: '15 分钟' }, { v: 30, t: '30 分钟' },
        { v: 60, t: '1 小时' }, { v: 120, t: '2 小时' }, { v: 180, t: '3 小时' }, { v: 360, t: '6 小时' }
    ];
    for (var i = 0; i < ivs.length; i++) {
        h += '<option value="' + ivs[i].v + '"' +
            (interval === ivs[i].v ? ' selected' : '') + '>' + ivs[i].t + '</option>';
    }
    h += '</select></div>';
    h += '<div class="snoop-option-hint">TA 可能会：翻看聊天记录、锁你的屏幕</div>';
    h += '</div>';
    return h;
}

/* ===================================================
   开关 / 间隔
   =================================================== */
function onPeekToggleChange(roleId, checked) {
    var cfg = loadPeekConfig();
    if (!cfg[roleId]) cfg[roleId] = {};
    cfg[roleId].enabled = checked;
    if (!cfg[roleId].interval) cfg[roleId].interval = 60;
    savePeekConfig(cfg);

    var opts = document.getElementById('snoopOptions_' + roleId);
    if (opts) opts.classList.toggle('show', checked);

    if (checked) {
        startPeekTimer(roleId);
        showToast('已开启查手机，小心被抓现行');
    } else {
        stopPeekTimer(roleId);
        showToast('已关闭查手机');
    }
}

function updateSnoopInterval(roleId) {
    var sel = document.getElementById('snoopInterval_' + roleId);
    if (!sel) return;
    var cfg = loadPeekConfig();
    if (!cfg[roleId]) cfg[roleId] = {};
    cfg[roleId].interval = parseInt(sel.value) || 60;
    savePeekConfig(cfg);
    if (cfg[roleId].enabled) { stopPeekTimer(roleId); startPeekTimer(roleId); }
    showToast('查手机间隔已更新为 ' + sel.value + ' 分钟');
}

/* ===================================================
   定时器
   =================================================== */
function startPeekTimer(roleId) {
    stopPeekTimer(roleId);
    var cfg = loadPeekConfig();
    var rc = cfg[roleId];
    if (!rc || !rc.enabled) return;
    var ms = (rc.interval || 60) * 60 * 1000;
    var delay = Math.floor(ms * (0.5 + Math.random() * 0.5));
    _peekPhoneTimers[roleId] = setTimeout(function () { triggerPeekPhone(roleId); }, delay);
}
function stopPeekTimer(roleId) {
    if (_peekPhoneTimers[roleId]) {
        clearTimeout(_peekPhoneTimers[roleId]);
        delete _peekPhoneTimers[roleId];
    }
}
function initAllPeekTimers() {
    var cfg = loadPeekConfig();
    for (var rid in cfg) {
        if (cfg[rid] && cfg[rid].enabled) startPeekTimer(rid);
    }
}

/* ===================================================
   触发（只剩翻看记录 + 锁屏两种行为）
   =================================================== */
function triggerPeekPhone(roleId) {
    var role = findRole(roleId);
    if (!role) return;
    var cfg = loadPeekConfig();
    if (!cfg[roleId] || !cfg[roleId].enabled) return;
    // 0 = 翻看聊天记录，1 = 锁屏
    showSnoopPopup(roleId, Math.floor(Math.random() * 2));
    startPeekTimer(roleId);
}

/* ===================================================
   查手机主弹窗
   =================================================== */
function showSnoopPopup(roleId, actionType) {
    var role = findRole(roleId);
    if (!role) return;

    var cn = esc(role.nickname || role.name);
    var av = role.avatar
        ? '<img src="' + role.avatar + '" alt="">'
        : '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    var overlay = document.createElement('div');
    overlay.className = 'snoop-popup-overlay';
    overlay.id = 'snoopPopupOverlay';

    var desc = '', btnT = '', btnC = '', icon = '';
    switch (actionType) {
        case 0:
            desc = cn + ' 拿起了你的手机，正在翻看聊天记录...';
            icon = '<svg class="snoop-action-icon" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/><path d="M9 8h6M9 11h4"/></svg>';
            btnT = '让TA看吧...';
            btnC = "snoopActionBrowse('" + roleId + "')";
            break;
        case 1:
            desc = cn + ' 夺走了你的手机并锁了屏！';
            icon = '<svg class="snoop-action-icon" viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/><rect x="9" y="7" width="6" height="5" rx="1"/><path d="M10 7V5.5a2 2 0 0 1 4 0V7"/></svg>';
            btnT = '好吧...';
            btnC = "snoopActionLock('" + roleId + "')";
            break;
    }

    var h = '';
    h += '<div class="snoop-popup">';
    h += '<div class="snoop-popup-phone-shake">' + icon + '</div>';
    h += '<div class="snoop-popup-avatar">' + av + '</div>';
    h += '<div class="snoop-popup-title">手机被抢了！</div>';
    h += '<div class="snoop-popup-desc">' + desc + '</div>';
    h += '<div class="snoop-popup-btns">';
    h += '<div class="snoop-popup-btn snoop-btn-resist" onclick="snoopResist(\'' + roleId + '\',' + actionType + ')">抢回来！</div>';
    h += '<div class="snoop-popup-btn snoop-btn-allow" onclick="' + btnC + '">' + btnT + '</div>';
    h += '</div></div>';
    overlay.innerHTML = h;

    var target = document.querySelector('.phone-screen')
        || document.querySelector('.phone-frame')
        || document.getElementById('phoneFrame')
        || document.body;
    target.appendChild(overlay);
    setTimeout(function () { overlay.classList.add('show'); }, 50);
    if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
}

function closeSnoopPopup() {
    var el = document.getElementById('snoopPopupOverlay');
    if (el) {
        el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 400);
    }
}

/* ===================================================
   推 char 消息（other）
   =================================================== */
function _snoopPushCharMsg(roleId, text) {
    var role = findRole(roleId);
    if (!role) return;
    if (!role.msgs) role.msgs = [];

    var ts = _snoopTimeStr();   // "HH:MM" 格式字符串

    role.msgs.push({
        from: 'other',
        text: text,
        time: ts
    });

    role.lastMsg = text.substring(0, 30);
    // ★ 修复：lastTime 也存格式化字符串，不存 Date.now() 数字时间戳
    role.lastTime = ts;
    role.lastTimeStr = ts;

    if (_chatCurrentConv !== roleId) {
        role.unread = (role.unread || 0) + 1;
    }
    saveChatRoles();

    if (_chatCurrentConv === roleId && typeof _refreshConvBody === 'function') {
        _refreshConvBody();
    }
}

/* ===================================================
   行为：抢回手机（结合人设 + 上下文，严禁 OOC）
   =================================================== */
function snoopResist(roleId, actionType) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    addPeekMemory(roleId, cn + '试图查手机被' + un + '抢回来了');

    // 构建贴合上下文的情景描述
    var ctxDesc = _snoopBuildContextDesc(roleId, cn, un);
    var actionDesc = actionType === 1
        ? cn + '正要锁住' + un + '的手机'
        : cn + '正在翻看' + un + '的手机';

    _snoopCallAI(roleId,
        '【当前情景】' + actionDesc + '，被' + un + '发现，' + un + '一把把手机抢了回来。\n' +
        ctxDesc +
        '【你的任务】完全以' + cn + '的身份，说出此刻真实的反应台词（两三句完整的话）。' +
        '可以是装无辜、撒娇、恼羞成怒、辩解、死要面子等，必须完全符合' + cn + '的性格和口吻，' +
        '绝对不能跳出角色，绝对不能说出"作为AI""系统""无法"等词，说真实的人会说的话。',
        function (reply) {
            if (reply) _snoopPushCharMsg(roleId, reply);
            _snoopShowToast(roleId, '你把手机抢了回来！');
        }
    );
}

/* ===================================================
   行为0：翻看聊天记录（结合人设 + 上下文，严禁 OOC）
   =================================================== */
function snoopActionBrowse(roleId) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    var msgs = role.msgs || [];
    var recent = msgs.filter(function (m) { return m.from === 'self' || m.from === 'other'; }).slice(-12);
    var summary = '';
    for (var i = 0; i < recent.length; i++) {
        var who = recent[i].from === 'self' ? un : cn;
        var txt = (recent[i].text || '').substring(0, 100);
        if (txt) summary += who + '：' + txt + '\n';
    }

    addPeekMemory(roleId, cn + '翻看了' + un + '的手机聊天记录');

    _snoopCallAI(roleId,
        '【当前情景】' + cn + '趁' + un + '不注意，偷偷拿起手机翻看了和' + un + '之间的聊天记录，看到了以下内容：\n' +
        '---\n' + (summary || '（聊天记录为空）') + '---\n' +
        '【你的任务】完全以' + cn + '的身份，说出翻完聊天记录后真实的感受和反应（两三句完整的话）。' +
        '结合你们聊天的实际内容来说——可以是吃醋、心动、吐槽、好奇、感动、回忆某句话等，' +
        '必须完全符合' + cn + '的性格和口吻，' +
        '绝对不能跳出角色，绝对不能说"作为AI""系统""无法"等词，说真实的人会说的话。',
        function (reply) {
            if (reply) _snoopPushCharMsg(roleId, reply);
            _snoopShowToast(roleId, cn + ' 翻看了你的聊天记录');
        }
    );
}

/* ===================================================
   行为1：锁屏（AI 贴人设生成锁屏理由，然后真正全屏锁定）
   =================================================== */
function snoopActionLock(roleId) {
    var role = findRole(roleId);
    if (!role) { closeSnoopPopup(); return; }
    var cn = role.nickname || role.name;
    var un = getSnoopUserName(roleId);
    closeSnoopPopup();

    addPeekMemory(roleId, cn + '夺走了' + un + '的手机不让玩');

    // 先展示全屏锁屏（占位文字），AI 生成后再填入
    _snoopShowFullLock(roleId, '');

    var ctxDesc = _snoopBuildContextDesc(roleId, cn, un);

    _snoopCallAI(roleId,
        '【当前情景】' + cn + '一把夺过' + un + '的手机，霸道地锁住了屏幕，不让' + un + '玩。\n' +
        ctxDesc +
        '【你的任务】完全以' + cn + '的身份，说出为什么要锁手机（两三句完整的台词）。' +
        '可以是：一直盯着手机不理我、结合最近聊天内容吃醋或抱怨、想让' + un + '陪自己、' +
        '占有欲、想引起注意等——必须结合你们实际聊天的氛围和内容，' +
        '完全符合' + cn + '的性格口吻，' +
        '绝对不能跳出角色，绝对不能说"作为AI""系统""无法"等词，说真实的人会说的话。',
        function (reply) {
            if (reply) {
                _snoopPushCharMsg(roleId, reply);
                // 更新锁屏上显示的角色话语，不截断，完整显示
                var msgEl = document.getElementById('snoopFullLockMsg');
                if (msgEl) {
                    msgEl.textContent = reply;
                }
            }
        }
    );
}

/* ===================================================
   ★ 真正的全屏锁屏（5 分钟，右上角可解锁）
   =================================================== */
function _snoopShowFullLock(roleId, charMsg) {
    var role = findRole(roleId);
    if (!role) return;
    var cn = esc(role.nickname || role.name);
    var av = role.avatar
        ? '<img src="' + role.avatar + '" alt="">'
        : '<svg viewBox="0 0 24 24" width="36" height="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

    // 移除旧锁屏
    var old = document.getElementById('snoopFullLock');
    if (old) {
        if (old.dataset.timerId) clearInterval(parseInt(old.dataset.timerId));
        if (old.parentNode) old.parentNode.removeChild(old);
    }

    var el = document.createElement('div');
    el.className = 'snoop-full-lock';
    el.id = 'snoopFullLock';

    var h = '';
    // 右上角解锁按钮
    h += '<div class="snoop-full-lock-unlock" onclick="_snoopUnlockEarly(\'' + roleId + '\')" title="强制解锁">';
    h += '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
    h += '</div>';
    // 内容区
    h += '<div class="snoop-full-lock-body">';
    h += '<div class="snoop-full-lock-avatar">' + av + '</div>';
    h += '<div class="snoop-full-lock-name">' + cn + ' 锁定了你的手机</div>';
    h += '<div class="snoop-full-lock-msg" id="snoopFullLockMsg">' +
        (charMsg ? esc(charMsg) : '等 TA 说话...') + '</div>';
    h += '<div class="snoop-full-lock-timer" id="snoopFullLockTimer">5:00</div>';
    h += '<div class="snoop-full-lock-progress"><div class="snoop-full-lock-bar" id="snoopFullLockBar"></div></div>';
    h += '<div class="snoop-full-lock-tip">手机被锁住了，请等待解锁</div>';
    h += '</div>';
    el.innerHTML = h;

    var target = document.querySelector('.phone-frame')
        || document.getElementById('phoneFrame')
        || document.body;
    target.appendChild(el);

    // 强制 pointer-events 拦截所有操作，但放行解锁按钮
    el.addEventListener('touchstart', function (e) {
        if (!e.target.closest('.snoop-full-lock-unlock')) {
            e.stopPropagation();
        }
    }, true);
    el.addEventListener('touchmove', function (e) {
        e.preventDefault();
        e.stopPropagation();
    }, { passive: false, capture: true });
    el.addEventListener('click', function (e) {
        // ★ 解锁按钮及其子元素放行，其余全部拦截
        if (!e.target.closest('.snoop-full-lock-unlock')) {
            e.stopPropagation();
        }
    }, true);

    // 动画入场
    setTimeout(function () { el.classList.add('show'); }, 50);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

    // 5 分钟倒计时
    var remain = 300, total = 300;
    var tid = setInterval(function () {
        remain--;
        if (remain <= 0) {
            clearInterval(tid);
            _snoopCloseFullLock(roleId, true);
            return;
        }
        var m = Math.floor(remain / 60), s = remain % 60;
        var te = document.getElementById('snoopFullLockTimer');
        if (te) te.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        var bar = document.getElementById('snoopFullLockBar');
        if (bar) bar.style.width = ((total - remain) / total * 100) + '%';
    }, 1000);
    el.dataset.timerId = String(tid);
    el.dataset.roleId = roleId;
}

/* 解锁（时间到自动解锁 / 右上角手动解锁） */
function _snoopCloseFullLock(roleId, autoUnlock) {
    var el = document.getElementById('snoopFullLock');
    if (el) {
        if (el.dataset.timerId) clearInterval(parseInt(el.dataset.timerId));
        el.classList.remove('show');
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);
    }
    if (!autoUnlock) {
        // 手动解锁：char 说一句话（贴人设）
        if (roleId) {
            var role = findRole(roleId);
            if (role) {
                var cn = role.nickname || role.name;
                var un = getSnoopUserName(roleId);
                var ctxDesc = _snoopBuildContextDesc(roleId, cn, un);
                _snoopCallAI(roleId,
                    '【当前情景】' + un + '等不及了，强行解锁了手机。\n' +
                    ctxDesc +
                    '【你的任务】完全以' + cn + '的身份，说出被' + un + '解锁后的真实反应（一两句话）。' +
                    '可以是不情愿、撒娇、无奈、继续闹别扭等，必须符合' + cn + '的性格，绝对不能跳出角色。',
                    function (reply) {
                        if (reply) _snoopPushCharMsg(roleId, reply);
                        showToast('手机解锁了！');
                    }
                );
            }
        }
    } else {
        // 自动到时解锁：char 说一句话
        if (roleId) {
            var role = findRole(roleId);
            if (role) {
                var cn = role.nickname || role.name;
                var un = getSnoopUserName(roleId);
                var ctxDesc = _snoopBuildContextDesc(roleId, cn, un);
                _snoopCallAI(roleId,
                    '【当前情景】' + cn + '锁了' + un + '手机 5 分钟，时间到了，手机自动解锁。\n' +
                    ctxDesc +
                    '【你的任务】完全以' + cn + '的身份，说出此刻的反应（一两句话）。' +
                    '可以是不舍得、条件式交还、还想继续霸占、勉为其难等，必须符合' + cn + '的性格，绝对不能跳出角色。',
                    function (reply) {
                        if (reply) _snoopPushCharMsg(roleId, reply);
                        showToast('手机解锁了！');
                    }
                );
            }
        }
    }
}

/* 右上角按钮触发的手动解锁 */
function _snoopUnlockEarly(roleId) {
    _snoopCloseFullLock(roleId, false);
}

/* ===================================================
   构建最近对话上下文描述（给 AI 提示用）
   =================================================== */
function _snoopBuildContextDesc(roleId, cn, un) {
    var role = findRole(roleId);
    if (!role) return '';
    var msgs = (role.msgs || []).filter(function (m) {
        return (m.from === 'self' || m.from === 'other') && m.text;
    }).slice(-8);
    if (!msgs.length) return '';
    var lines = [];
    for (var i = 0; i < msgs.length; i++) {
        var who = msgs[i].from === 'self' ? un : cn;
        var txt = (msgs[i].text || '').substring(0, 80);
        if (txt) lines.push(who + '：' + txt);
    }
    if (!lines.length) return '';
    return '【你们最近的对话】\n' + lines.join('\n') + '\n';
}

/* ===================================================
   聊天内操作提示条
   =================================================== */
function _snoopShowToast(roleId, text) {
    if (_chatCurrentConv !== roleId) return;
    var body = document.querySelector('.chat-conv-body');
    if (!body) return;

    var tip = document.createElement('div');
    tip.className = 'snoop-chat-tip';
    tip.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><rect x="6" y="3" width="12" height="18" rx="2"/><circle cx="12" cy="17" r="0.5"/></svg> ' + esc(text);
    body.appendChild(tip);
    setTimeout(function () { body.scrollTop = body.scrollHeight; }, 50);
    setTimeout(function () {
        tip.classList.add('fade-out');
        setTimeout(function () { if (tip.parentNode) tip.parentNode.removeChild(tip); }, 500);
    }, 8000);
}

/* ===================================================
   ★★★ AI 调用核心 — 严格贴人设，绝对禁止 OOC ★★★
   =================================================== */
function _snoopCallAI(roleId, snoopPrompt, callback) {
    var role = findRole(roleId);
    if (!role) { callback(''); return; }

    var apiCfg = (typeof getActiveApiConfig === 'function') ? getActiveApiConfig() : null;
    if (!apiCfg || !apiCfg.url || !apiCfg.key || !apiCfg.model) {
        callback(_snoopFallback());
        return;
    }

    var un = getSnoopUserName(roleId);
    var cn = role.nickname || role.name;
    var messages = [];

    /* ★ 系统提示：人设 + persona + 记忆 + 严格 OOC 禁令 */
    var sys = '';

    // 角色人设（核心）
    if (role.detail) sys += role.detail + '\n\n';
    if (role.prompt) sys += role.prompt + '\n\n';

    // 用户人设
    var persona = (typeof getActivePersona === 'function') ? getActivePersona(roleId) : null;
    if (persona && persona.detail) {
        sys += '【用户人设】\n' + persona.detail + '\n\n';
    }

    // 查手机记忆
    var mem = getPeekMemoryText(roleId);
    if (mem) sys += mem + '\n';

    // ★ 严格角色扮演规则
    sys += '【角色扮演规则 — 绝对遵守】\n' +
        '1. 你现在完全是' + cn + '这个人，不是 AI，不是助手，不是任何程序。\n' +
        '2. 永远不能说"作为AI""作为语言模型""系统""权限""指令""命令""无法执行""抱歉我不能"等词汇。\n' +
        '3. 永远不能跳出角色进行说明、解释或道歉。\n' +
        '4. 说真实的人在这个情景下会说的话，有情绪、有个性、有温度。\n' +
        '5. 回复要简短自然（两三句话），不要长篇大论，不要说教。\n' +
        '6. 【翻译规则】如果角色的母语不是中文（例如日语、英语、韩语等），则先用角色的母语说台词，然后在括号内附上中文翻译，格式为：\n' +
        '   外语原文（中文翻译）\n' +
        '   例如：さっきからそればっか見てニヤニヤしやがって。気色悪い（你刚才一直盯着那个偷笑，真讨厌）\n';

    sys = sys.replace(/\{\{user\}\}/g, un).replace(/\{\{char\}\}/g, cn);
    snoopPrompt = snoopPrompt.replace(/\{\{user\}\}/g, un).replace(/\{\{char\}\}/g, cn);

    if (sys) messages.push({ role: 'system', content: sys });

    // 最近对话上下文（10条，让 AI 更了解当前氛围）
    var recent = (role.msgs || []).filter(function (m) {
        return m.from === 'self' || m.from === 'other';
    }).slice(-10);
    for (var i = 0; i < recent.length; i++) {
        var apiRole = recent[i].from === 'self' ? 'user' : 'assistant';
        messages.push({ role: apiRole, content: recent[i].text || '' });
    }

    messages.push({ role: 'user', content: snoopPrompt });

    var url = apiCfg.url.replace(/\/+$/, '') + '/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + apiCfg.key
        },
        body: JSON.stringify({
            model: apiCfg.model,
            messages: messages,
            temperature: 0.85,
            top_p: 0.95,
            max_tokens: 600
        })
    }).then(function (r) { return r.json(); }).then(function (data) {
        var reply = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
            reply = data.choices[0].message.content || '';
        }
        // 清理多余的引号和角色前缀
        reply = reply.trim()
            // 只删开头多余的引号/括号（不删结尾，保护"外语（翻译）"格式）
            .replace(/^["'""「」『』【】\[\]]+/, '')
            // 只删结尾多余的引号（不删括号）
            .replace(/["'""「」『』【】\[\]]+$/, '')
            // 删除开头的角色名前缀，如"藤原池寻："
            .replace(/^(说：|[^ ]{1,8}说：|[^ ]{1,8}[：:])/, '');
        callback(reply.trim());
    }).catch(function (err) {
        console.error('Snoop AI error:', err);
        callback(_snoopFallback());
    });
}

function _snoopFallback() {
    var r = [
        '哼，被我看到了吧？',
        '你手机里都有些什么啊？让我看看嘛~',
        '你是不是背着我和别人聊天了！',
        '嘻嘻，被我抓到了~你完蛋了！',
        '手机先放我这里保管！不许玩了！',
        '不许看手机了，陪我！',
        '我就看一眼嘛...你紧张什么，心虚了？'
    ];
    return r[Math.floor(Math.random() * r.length)];
}

/* ===================================================
   Hook openChatSettings
   =================================================== */
(function () {
    var _orig = null;

    function hook() {
        if (typeof openChatSettings !== 'function') return;
        if (_orig) return;
        _orig = openChatSettings;
        window.openChatSettings = function () {
            _orig();
            setTimeout(inject, 80);
        };
    }

    function inject() {
        var roleId = _chatCurrentConv;
        if (!roleId) return;
        var overlay = document.getElementById('chatSettingsOverlay');
        if (!overlay) return;
        if (document.getElementById('peekToggleRow')) return;

        var wrapper = document.createElement('div');
        wrapper.innerHTML = renderPeekSettingHTML(roleId);

        var danger = overlay.querySelectorAll('.chat-settings-danger-btn');
        if (danger.length > 0) { danger[0].parentNode.insertBefore(wrapper, danger[0]); return; }
        var save = overlay.querySelector('.chat-settings-save-btn');
        if (save) { save.parentNode.insertBefore(wrapper, save); return; }
        var panel = overlay.querySelector('.chat-settings-panel');
        if (panel) panel.appendChild(wrapper);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { hook(); initAllPeekTimers(); });
    } else {
        setTimeout(function () { hook(); initAllPeekTimers(); }, 500);
    }
})();
