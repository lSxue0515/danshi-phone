/* ============================================
   theater.js — 线下剧场 Offline Theater
   橙光/Galgame 式演出 + 自定义CSS设置
   ============================================ */

var _thView = 'list';
var _thRole = null;
var _thBg = '';
var _thHistory = [];
var _thSegments = [];
var _thSegIdx = 0;
var _thPhase = 'input';
var _thInputText = '';
var _thPersona = null;
var _thCustomCSS = '';
var _thStyleEl = null;

// ===== 记忆总结系统 =====
var _thMemSummaries = [];   // 每个阶段的总结 [{phase:N, summary:'...', count:N}]
var _thLastSumCount = 0;    // 上次触发总结时的对话条数


/* ★ vivo等安卓机型键盘弹出适配 */
var _thKbFixTimer = null;

function _thInitKeyboardFix() {
    // 如果已经初始化过就跳过
    if (window._thKbFixInited) return;
    window._thKbFixInited = true;

    // 方案1：使用 visualViewport API（现代浏览器推荐）
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', _thHandleViewportResize);
        window.visualViewport.addEventListener('scroll', _thHandleViewportScroll);
    }

    // 方案2：兜底 resize 监听
    var lastH = window.innerHeight;
    window.addEventListener('resize', function () {
        if (_thView !== 'stage') return;
        var newH = window.innerHeight;
        // 键盘弹出：高度减少超过150px
        if (lastH - newH > 150) {
            _thOnKeyboardShow(newH);
        }
        // 键盘收起：高度恢复
        if (newH - lastH > 150) {
            _thOnKeyboardHide();
        }
        lastH = newH;
    });
}

function _thHandleViewportResize() {
    if (_thView !== 'stage') return;
    var vv = window.visualViewport;
    if (!vv) return;
    var stage = document.querySelector('.thtr-stage');
    if (!stage) return;

    // 用 visualViewport.height 设置舞台实际可见高度
    stage.style.height = vv.height + 'px';
    stage.style.maxHeight = vv.height + 'px';

    // 确保不滚动到奇怪的位置
    if (_thKbFixTimer) clearTimeout(_thKbFixTimer);
    _thKbFixTimer = setTimeout(function () {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, 50);
}

function _thHandleViewportScroll() {
    if (_thView !== 'stage') return;
    // 阻止 visualViewport 的滚动偏移
    window.scrollTo(0, 0);
}

function _thOnKeyboardShow(viewportH) {
    var stage = document.querySelector('.thtr-stage');
    if (!stage) return;
    stage.style.height = viewportH + 'px';
    stage.style.maxHeight = viewportH + 'px';

    // 强制修正滚动位置
    setTimeout(function () {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
    }, 100);
}

function _thOnKeyboardHide() {
    var stage = document.querySelector('.thtr-stage');
    if (!stage) return;
    // 恢复全屏
    stage.style.height = '100%';
    stage.style.maxHeight = '';
    setTimeout(function () {
        window.scrollTo(0, 0);
    }, 100);
}

/* ===== 文风系统 ===== */
var _thStyles = [];
var _thActiveStyle = null;

try { _thBg = localStorage.getItem('_thBg') || ''; } catch (e) { }
try { _thCustomCSS = localStorage.getItem('_thCustomCSS') || ''; } catch (e) { }
try {
    var _ss = localStorage.getItem('_thStyles');
    if (_ss) _thStyles = JSON.parse(_ss);
} catch (e) { }
try {
    var _sa = localStorage.getItem('_thActiveStyleId');
    if (_sa && _thStyles.length) {
        for (var si = 0; si < _thStyles.length; si++) {
            if (_thStyles[si].id === _sa) { _thActiveStyle = _thStyles[si]; break; }
        }
    }
} catch (e) { }

function _thSaveStyles() {
    try { localStorage.setItem('_thStyles', JSON.stringify(_thStyles)); } catch (e) { }
    try { localStorage.setItem('_thActiveStyleId', _thActiveStyle ? _thActiveStyle.id : ''); } catch (e) { }
}

/* ===== 记忆存储 ===== */
function _thMemoryKey(roleId) { return '_thMem_' + (roleId || 'default'); }

function _thSaveMemory() {
    if (!_thRole) return;
    try {
        localStorage.setItem(_thMemoryKey(_thRole.id), JSON.stringify({
            history: _thHistory, segments: _thSegments, segIdx: _thSegIdx,
            phase: _thPhase, personaId: _thPersona ? _thPersona.id : null
        }));
    } catch (e) { }
}

function _thLoadMemory(roleId) {
    try { var raw = localStorage.getItem(_thMemoryKey(roleId)); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

function _thClearMemory(roleId) {
    try { localStorage.removeItem(_thMemoryKey(roleId)); } catch (e) { }
}

/* ===== 记忆总结存储 ===== */
function _thSumKey(roleId) { return '_thSum_' + (roleId || 'default'); }

function _thLoadSummaries(roleId) {
    try { var r = localStorage.getItem(_thSumKey(roleId)); return r ? JSON.parse(r) : []; } catch (e) { return []; }
}

function _thSaveSummaries(roleId, arr) {
    try { localStorage.setItem(_thSumKey(roleId), JSON.stringify(arr)); } catch (e) { }
}

function _thClearSummaries(roleId) {
    try { localStorage.removeItem(_thSumKey(roleId)); } catch (e) { }
}

/* 每10条对话自动触发一次总结 */
function _thAutoSummaryCheck() {
    if (!_thRole) return;
    var total = _thHistory.length;
    // 每隔10条触发一次（只统计user+assistant，也就是_thHistory全部）
    if (total > 0 && total % 10 === 0 && total !== _thLastSumCount) {
        _thLastSumCount = total;
        _thRunSummary(false);
    }
}

/* 执行总结（manual=true表示手动拉取） */
function _thRunSummary(manual) {
    var api = _thGetApi();
    if (!api.url || !api.key) {
        if (manual && typeof showToast === 'function') showToast('请先设置API');
        return;
    }
    if (!_thRole) return;

    var roleId = _thRole.id;
    var existingSums = _thLoadSummaries(roleId);
    var phaseNum = existingSums.length + 1;

    // 取最近10条做本阶段总结（手动模式取全部未总结部分）
    var startIdx = manual ? (_thLastSumCount) : (Math.max(0, _thHistory.length - 10));
    var slice = _thHistory.slice(startIdx);
    if (slice.length === 0) {
        if (manual && typeof showToast === 'function') showToast('暂无新内容可总结');
        return;
    }

    if (manual && typeof showToast === 'function') showToast('正在生成记忆总结...');

    var r = _thRole;
    var sys = '你是剧情总结助手。请对以下对话内容进行阶段总结，要求：\n';
    sys += '1. 概括本阶段的核心事件、情感走向、关键转折\n';
    sys += '2. 用第三人称叙述，简洁清晰，100-200字\n';
    sys += '3. 标注情感基调（如：温馨/紧张/暧昧/伤感等）\n';
    sys += '4. 不要罗列每句话，要提炼精华\n';
    sys += '角色：' + (r.name || '未知') + '\n';

    var msgs = [{ role: 'system', content: sys }];
    var dialogText = '';
    for (var i = 0; i < slice.length; i++) {
        var m = slice[i];
        var spk = m.role === 'user' ? (_thPersona ? _thPersona.name : 'YOU') : (r.name || 'AI');
        dialogText += spk + '：' + m.content + '\n\n';
    }
    msgs.push({ role: 'user', content: '请总结以下第' + phaseNum + '阶段对话：\n\n' + dialogText });

    var endpoint = _thBuildEndpoint(api.url);
    fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({ model: api.model, messages: msgs, temperature: 0.7, max_tokens: 512 })
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var text = '';
            if (data.choices && data.choices[0]) {
                if (data.choices[0].message) text = data.choices[0].message.content || '';
                else if (data.choices[0].text) text = data.choices[0].text;
            }
            if (!text) return;
            var newSum = {
                phase: phaseNum,
                summary: text.trim(),
                count: _thHistory.length,
                time: new Date().toLocaleDateString('zh-CN')
            };
            existingSums.push(newSum);
            _thSaveSummaries(roleId, existingSums);
            if (manual && typeof showToast === 'function') showToast('第' + phaseNum + '阶段总结已生成');
            // 如果记忆面板正开着，刷新它
            if (document.getElementById('thtrMemPanel')) { _thCloseMemPanel(); _thOpenMemPanel(); }
        })
        .catch(function (err) {
            if (manual && typeof showToast === 'function') showToast('总结失败: ' + (err.message || ''));
        });
}

/* 初始化时注入自定义CSS */
function _thInitCustomCSS() {
    if (_thStyleEl) return;
    _thStyleEl = document.createElement('style');
    _thStyleEl.id = 'thtrCustomStyle';
    document.head.appendChild(_thStyleEl);
    _thApplyCSS();
}
function _thApplyCSS() {
    if (!_thStyleEl) _thInitCustomCSS();
    _thStyleEl.textContent = _thCustomCSS;
}


function openTheaterApp() {
    // ★ 防止安卓键盘弹出时缩放页面
    var vpMeta = document.querySelector('meta[name="viewport"]');
    if (vpMeta && vpMeta.content.indexOf('interactive-widget') === -1) {
        vpMeta.content = vpMeta.content + ', interactive-widget=resizes-content';
    }
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _thView = 'list'; _thRole = null;
    el.classList.add('show');
    _thInitCustomCSS();
    _thRenderList();
}
function closeTheaterApp() {
    _thSaveMemory();
    var el = document.getElementById('theaterOverlay');
    if (el) el.classList.remove('show');
    // ★ 恢复滚动位置
    setTimeout(function () { window.scrollTo(0, 0); }, 100);
    // ★ 清理键盘适配状态
    var stage = document.querySelector('.thtr-stage');
    if (stage) { stage.style.height = ''; stage.style.maxHeight = ''; }
}

function _thGetApi() {
    var url = '', key = '', model = '';
    try {
        url = localStorage.getItem('apiUrl') || '';
        key = localStorage.getItem('apiKey') || '';
        model = localStorage.getItem('selectedModel') || '';
    } catch (e) { }
    if (!url) try { var el = document.getElementById('apiUrl'); if (el) url = el.value.trim(); } catch (e) { }
    if (!key) try { var el = document.getElementById('apiKey'); if (el) key = el.value.trim(); } catch (e) { }
    if (!model) try { var el = document.getElementById('apiModelSelect'); if (el) model = el.value.trim(); } catch (e) { }
    if (!url) try { url = localStorage.getItem('api_url') || localStorage.getItem('apiBaseUrl') || ''; } catch (e) { }
    if (!key) try { key = localStorage.getItem('api_key') || localStorage.getItem('apiSecretKey') || ''; } catch (e) { }
    if (!model) try { model = localStorage.getItem('apiModel') || localStorage.getItem('model') || ''; } catch (e) { }
    if (!model) model = 'gpt-3.5-turbo';
    return { url: url.trim(), key: key.trim(), model: model.trim() };
}

function _thBuildEndpoint(baseUrl) {
    var u = baseUrl.replace(/\/+$/, '');
    if (u.indexOf('/chat/completions') >= 0) return u;
    if (u.indexOf('/v1') >= 0) return u + '/chat/completions';
    return u + '/v1/chat/completions';
}

function _thEsc(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function _thFmt(text) {
    var s = _thEsc(text);
    s = s.replace(/「([^」]*)」/g, '<span class="thtr-quote">「$1」</span>');
    s = s.replace(/\*([^*]+)\*/g, '<em class="thtr-action">$1</em>');
    return s;
}

/* ===== 角色列表 ===== */
function _thRenderList() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];

    var h = '';
    h += '<div class="thtr-header">';
    h += '<div class="thtr-hdr-btn" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-hdr-title">OFFLINE THEATER</div>';
    h += '<div class="thtr-hdr-btn" onclick="_thPickBg()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-list-body">';
    h += '<div class="thtr-list-top">';
    h += '<div class="thtr-list-title">Offline Theater 线下剧场</div>';
    h += '<div class="thtr-list-sub">Choose a character 选择角色开始演出</div>';
    h += '</div>';

    h += '<div class="thtr-grid">';
    if (roles.length === 0) {
        h += '<div class="thtr-empty">No characters yet 暂无角色</div>';
    }
    for (var i = 0; i < roles.length; i++) {
        var r = roles[i];
        var hasMem = !!_thLoadMemory(r.id);
        h += '<div class="thtr-card" onclick="_thSelectRole(\'' + _thEsc(r.id || '') + '\')">';
        h += '<div class="thtr-card-av">';
        if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="thtr-card-name">' + _thEsc(r.name || 'unnamed') + '</div>';
        if (hasMem) h += '<div style="font-size:8px;color:#999;margin-top:3px;letter-spacing:.5px;">● 有存档</div>';
        h += '</div>';
    }
    h += '</div></div>';

    el.innerHTML = h;
}

/* ===== 角色详情 ===== */
function _thSelectRole(roleId) {
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    _thRole = null;
    for (var i = 0; i < roles.length; i++) {
        if (roles[i].id === roleId) { _thRole = roles[i]; break; }
    }
    if (!_thRole) return;
    _thView = 'detail';

    var mem = _thLoadMemory(roleId);
    if (mem) {
        _thHistory = mem.history || [];
        _thSegments = mem.segments || [];
        _thSegIdx = mem.segIdx || 0;
        _thPhase = mem.phase || 'input';
        _thLastSumCount = _thHistory.length;   // ← 新增，防止加载后立即触发
        _thPersona = null;
        if (mem.personaId) {
            var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
            for (var pi = 0; pi < personas.length; pi++) {
                if (personas[pi].id === mem.personaId) { _thPersona = personas[pi]; break; }
            }
        }
    } else {
        _thHistory = []; _thSegments = []; _thSegIdx = 0;
        _thPhase = 'input'; _thPersona = null;
    }

    _thRenderDetail();
}

function _thRenderDetail() {
    var el = document.getElementById('theaterOverlay'); if (!el || !_thRole) return;
    var r = _thRole;
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    var hasMem = !!_thLoadMemory(r.id);

    var h = '';
    h += '<div class="thtr-detail-page">';
    h += '<div class="thtr-detail-card">';
    h += '<div class="thtr-detail-top">';
    h += '<div class="thtr-dtag">OFFLINE</div>';
    h += '<div class="thtr-detail-actions">';
    h += '<div class="thtr-detail-act" onclick="_thPickBg()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '<div class="thtr-detail-act" onclick="_thView=\'list\';_thRenderList()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-detail-act" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    h += '<div class="thtr-detail-welcome">';
    h += '<div class="thtr-detail-big">WELCOME, ' + _thEsc(r.name || '').toUpperCase() + '</div>';
    if (r.detail) h += '<div class="thtr-detail-desc">' + _thEsc((r.detail || '').substring(0, 80)) + '</div>';
    h += '</div>';

    h += '<div class="thtr-detail-avatar">';
    if (r.avatar) h += '<img src="' + _thEsc(r.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="thtr-detail-name">' + _thEsc(r.name || 'unnamed') + '</div>';
    h += '</div>';

    if (personas.length > 0) {
        h += '<div class="thtr-persona-sec">';
        h += '<div class="thtr-persona-label">YOUR PERSONA 选择人设</div>';
        h += '<div class="thtr-persona-list">';
        for (var pi = 0; pi < personas.length; pi++) {
            var p = personas[pi];
            var isA = (_thPersona && _thPersona.id === p.id);
            h += '<div class="thtr-persona-item' + (isA ? ' active' : '') + '" onclick="_thPickPersona(\'' + _thEsc(p.id || '') + '\')">';
            h += '<div class="thtr-persona-av">';
            if (p.avatar) h += '<img src="' + _thEsc(p.avatar) + '">';
            else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            h += '</div>';
            h += '<span>' + _thEsc(p.name || 'unnamed') + '</span>';
            h += '</div>';
        }
        h += '</div></div>';
    }

    if (hasMem && _thHistory.length > 0) {
        h += '<div style="display:flex;gap:10px;margin-top:22px;">';
        h += '<div class="thtr-start-btn" onclick="_thResumeStage()" style="flex:1;text-align:center;">CONTINUE 继续</div>';
        h += '<div class="thtr-start-btn" onclick="_thNewStage()" style="flex:1;text-align:center;opacity:.6;">NEW 新开始</div>';
        h += '</div>';
    } else {
        h += '<div class="thtr-start-btn" onclick="_thEnterStage()">START 开始演出</div>';
    }

    h += '</div>';
    el.innerHTML = h;

    el.innerHTML = h;

    // ★ 初始化键盘适配（针对vivo S18 Pro等机型）
    _thInitKeyboardFix();

    // ★ 给输入框添加 focus/blur 事件，主动处理键盘弹出
    var inp = document.getElementById('thtrInput');
    if (inp) {
        inp.addEventListener('focus', function () {
            // 键盘即将弹出，延迟一点等浏览器完成布局
            setTimeout(function () {
                window.scrollTo(0, 0);
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
                // 确保输入框在可视区域内
                var bar = document.querySelector('.thtr-stage-bottom');
                if (bar) bar.scrollIntoView({ block: 'end', behavior: 'smooth' });
            }, 300);
        });

        inp.addEventListener('blur', function () {
            // 键盘收起，恢复布局
            setTimeout(function () {
                _thOnKeyboardHide();
            }, 200);
        });
    }

}

function _thPickPersona(pid) {
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    _thPersona = null;
    for (var i = 0; i < personas.length; i++) {
        if (personas[i].id === pid) { _thPersona = personas[i]; break; }
    }
    _thRenderDetail();
}

/* ===== 舞台 ===== */
function _thEnterStage() {
    _thView = 'stage'; _thPhase = 'input';
    _thHistory = []; _thSegments = []; _thSegIdx = 0;
    _thSaveMemory();
    _thRenderStage();
}

function _thResumeStage() {
    _thView = 'stage';
    if (_thPhase === 'generating') _thPhase = 'waiting';
    _thRenderStage();
}

function _thNewStage() {
    if (!_thRole) return;
    _thClearMemory(_thRole.id);
    _thClearSummaries(_thRole.id);   // ← 新增
    _thLastSumCount = 0;              // ← 新增
    _thEnterStage();
}

function _thRenderStage() {
    var el = document.getElementById('theaterOverlay'); if (!el || !_thRole) return;
    var r = _thRole;

    var bgCss = _thBg
        ? 'background-image:url(' + _thBg + ');background-size:cover;background-position:center;'
        : 'background:linear-gradient(180deg,#d5d7d6 0%,#c5c7c6 100%);';

    var h = '';
    h += '<div class="thtr-stage" style="' + bgCss + 'display:flex;flex-direction:column;height:100%;max-height:100%;overflow:hidden;">';

    /* 顶栏 */
    h += '<div class="thtr-stage-top" style="flex-shrink:0;">';
    h += '<div class="thtr-stage-name">' + _thEsc(r.name) + '</div>';
    h += '<div class="thtr-stage-btns">';
    /* ★ 记忆总结按钮 */
    h += '<div class="thtr-stage-btn thtr-mem-btn" onclick="_thOpenMemPanel()" title="Memory Summary 记忆总结"><svg viewBox="0 0 24 24"><path d="M12 2a5 5 0 015 5c0 2.1-1.2 3.9-3 4.7V13h2l-4 4-4-4h2v-1.3A5 5 0 0112 2z"/><path d="M9 17H6a2 2 0 00-2 2v1h16v-1a2 2 0 00-2-2h-3"/></svg></div>';
    /* ★ 文风按钮 */
    h += '<div class="thtr-stage-btn" onclick="_thOpenWF()" title="Writing Style 文风"><svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>';
    /* ★ 对话记录按钮 */
    h += '<div class="thtr-stage-btn" onclick="_thShowLog()" title="Dialog Log 对话记录"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg></div>';
    /* 齿轮设置 */
    h += '<div class="thtr-stage-btn" onclick="_thOpenStyle()" title="Style Settings 样式设置"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></div>';
    /* 换背景 */
    h += '<div class="thtr-stage-btn" onclick="_thPickBg()" title="Background 背景"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>';
    h += '<div class="thtr-stage-btn" onclick="_thBackDetail()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
    h += '<div class="thtr-stage-btn" onclick="closeTheaterApp()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    /* 对话区 */
    h += '<div class="thtr-stage-dialog" style="flex:1;overflow-y:auto;min-height:0;">';

    if (_thPhase === 'generating') {
        h += '<div class="thtr-dlg-box thtr-output-box">';
        h += '<div class="thtr-dlg-speaker">' + _thEsc(r.name) + '</div>';
        h += '<div class="thtr-dlg-text"><span class="thtr-typing-anim">Thinking 思考中</span></div>';
        h += '</div>';

    } else if (_thPhase === 'reading' && _thSegments.length > 0) {
        var seg = _thSegments[_thSegIdx] || '';
        var isLast = (_thSegIdx >= _thSegments.length - 1);

        h += '<div class="thtr-dlg-box thtr-output-box clickable" onclick="_thTapDialog()">';
        h += '<div class="thtr-dlg-speaker">' + _thEsc(r.name) + '</div>';
        h += '<div class="thtr-dlg-text">' + _thFmt(seg) + '</div>';
        /* ★ 右下角 ◁ 页码 ▷ */
        h += '<div class="thtr-dlg-controls">';
        h += '<div class="thtr-dlg-ctrl-btn' + (_thSegIdx <= 0 ? ' disabled' : '') + '" onclick="event.stopPropagation();_thPrevSeg()"><svg viewBox="0 0 24 24"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg></div>';
        h += '<span class="thtr-seg-idx">' + (_thSegIdx + 1) + ' / ' + _thSegments.length + '</span>';
        h += '<div class="thtr-dlg-ctrl-btn' + (isLast ? ' disabled' : '') + '" onclick="event.stopPropagation();_thNextSeg()"><svg viewBox="0 0 24 24"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></div>';
        h += '</div>';
        h += '<div class="thtr-dlg-hint">';
        if (!isLast) {
            h += '<span class="thtr-hint-arrow"></span>';
        } else {
            h += '<span class="thtr-hint-end">- Scene End 本段结束 -</span>';
        }
        h += '</div>';
        h += '</div>';

    } else if (_thPhase === 'waiting') {
        h += '<div class="thtr-dlg-box thtr-output-box">';
        h += '<div class="thtr-dlg-speaker">SYSTEM 系统</div>';
        h += '<div class="thtr-dlg-text">Scene complete. Enter your next line below.<br>本段演出结束，请在下方输入你的下一句台词。</div>';
        h += '</div>';

    } else {
        h += '<div class="thtr-dlg-box thtr-output-box idle">';
        h += '<div class="thtr-dlg-text idle-text">Enter your line below and tap WRITE to continue.<br>在下方输入台词，点击续写开始演出。</div>';
        h += '</div>';
    }

    h += '</div>';

    /* 底部输入 */
    h += '<div class="thtr-stage-bottom" style="flex-shrink:0;">';
    h += '<div class="thtr-stage-bar thtr-input-bar">';
    h += '<input type="text" class="thtr-stage-inp thtr-input-field" id="thtrInput" placeholder="Your line 你的台词..." value="' + _thEsc(_thInputText) + '" ' + (_thPhase === 'generating' ? 'disabled' : '') + ' onkeydown="if(event.key===\'Enter\')_thSend()">';
    h += '<div class="thtr-bar-btn" onclick="_thSend()">SEND 发送</div>';
    h += '<div class="thtr-bar-btn alt" onclick="_thGenerate()">WRITE 续写</div>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;

    // ★ 不再自动focus（vivo等机型键盘弹出会导致页面错位）
    // 用户需要时自己点击输入框即可
}

/* ===== 点击对话框翻页 ===== */
function _thTapDialog() {
    if (_thPhase !== 'reading') return;
    if (_thSegIdx < _thSegments.length - 1) {
        _thSegIdx++;
        _thSaveMemory();
        _thRenderStage();
    } else {
        _thPhase = 'waiting';
        _thSaveMemory();
        _thRenderStage();
    }
}

/* ★ 上一段 / 下一段 */
function _thPrevSeg() {
    if (_thPhase !== 'reading' || _thSegIdx <= 0) return;
    _thSegIdx--;
    _thSaveMemory();
    _thRenderStage();
}
function _thNextSeg() {
    if (_thPhase !== 'reading' || _thSegIdx >= _thSegments.length - 1) return;
    _thSegIdx++;
    _thSaveMemory();
    _thRenderStage();
}

/* ===== 样式设置面板 ===== */
function _thOpenStyle() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;

    /* 防止重复打开 */
    if (document.getElementById('thtrStylePanel')) return;

    var cssVal = _thCustomCSS.replace(/"/g, '&quot;');

    var h = '<div class="thtr-style-overlay">';
    h += '<div class="thtr-style-card">';
    h += '<div class="thtr-style-header">';
    h += '<div class="thtr-style-title">STYLE SETTINGS 样式设置</div>';
    h += '<div class="thtr-style-close" onclick="_thCloseStyle()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-style-body">';
    h += '<div class="thtr-style-label">Custom CSS 自定义样式</div>';
    h += '<div class="thtr-style-hint">Use these classes to customize 使用以下class自定义样式：</div>';
    h += '<div class="thtr-style-classes">';
    h += '<code>.thtr-output-box</code> — Output box 输出框<br>';
    h += '<code>.thtr-dlg-speaker</code> — Speaker name 说话人名<br>';
    h += '<code>.thtr-dlg-text</code> — Text content 文字内容<br>';
    h += '<code>.thtr-quote</code> — Dialog「」对话引用<br>';
    h += '<code>.thtr-action</code> — *Action* 动作描写<br>';
    h += '<code>.thtr-input-bar</code> — Input bar 输入栏<br>';
    h += '<code>.thtr-input-field</code> — Input field 输入框<br>';
    h += '<code>.thtr-bar-btn</code> — Buttons 按钮<br>';
    h += '</div>';

    h += '<textarea class="thtr-style-textarea" id="thtrCSSInput" placeholder="/* Example 示例 */\n.thtr-output-box {\n  background: rgba(0,0,0,.6);\n  border: 1px solid rgba(255,255,255,.1);\n}\n.thtr-dlg-text {\n  color: #eee;\n  font-size: 13px;\n}\n.thtr-input-bar {\n  background: rgba(0,0,0,.4);\n}\n.thtr-input-field {\n  color: #fff;\n}">' + _thEsc(_thCustomCSS) + '</textarea>';

    h += '<div class="thtr-style-btns">';
    h += '<div class="thtr-style-btn" onclick="_thPreviewCSS()">PREVIEW 预览</div>';
    h += '<div class="thtr-style-btn primary" onclick="_thSaveCSS()">SAVE 保存</div>';
    h += '<div class="thtr-style-btn danger" onclick="_thResetCSS()">RESET 重置</div>';
    h += '</div>';

    h += '</div></div></div>';

    var panel = document.createElement('div');
    panel.id = 'thtrStylePanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:110;';
    panel.innerHTML = h;
    el.appendChild(panel);
}

function _thCloseStyle() {
    var p = document.getElementById('thtrStylePanel');
    if (p) p.remove();
}

function _thPreviewCSS() {
    var ta = document.getElementById('thtrCSSInput');
    if (!ta) return;
    _thCustomCSS = ta.value;
    _thApplyCSS();
    if (typeof showToast === 'function') showToast('Preview applied 预览已生效');
}

function _thSaveCSS() {
    var ta = document.getElementById('thtrCSSInput');
    if (!ta) return;
    _thCustomCSS = ta.value;
    _thApplyCSS();
    try { localStorage.setItem('_thCustomCSS', _thCustomCSS); } catch (e) { }
    if (typeof showToast === 'function') showToast('Saved 已保存');
    _thCloseStyle();
}

function _thResetCSS() {
    _thCustomCSS = '';
    _thApplyCSS();
    try { localStorage.removeItem('_thCustomCSS'); } catch (e) { }
    var ta = document.getElementById('thtrCSSInput');
    if (ta) ta.value = '';
    if (typeof showToast === 'function') showToast('Reset 已重置');
}

/* ===== 发送 / 生成 ===== */
function _thSend() {
    var inp = document.getElementById('thtrInput');
    if (!inp) return;
    var text = inp.value.trim();
    if (!text) return;
    _thInputText = '';
    _thHistory.push({ role: 'user', content: text });
    _thPhase = 'input';
    _thSaveMemory();
    _thAutoSummaryCheck();
    _thRenderStage();
}

function _thGenerate() {
    if (_thPhase === 'generating') return;
    var api = _thGetApi();
    if (!api.url || !api.key) {
        if (typeof showToast === 'function') showToast('请先设置API');
        return;
    }

    _thPhase = 'generating';
    _thSaveMemory();
    _thRenderStage();

    var r = _thRole;

    /* 构建 system prompt — 保持原始白描风格 */
    var sys = '';
    sys += '你是「' + (r.name || '未知') + '」，正在和对方进行一场线下面对面的互动。\n';
    if (r.detail) sys += '你的设定：' + r.detail.substring(0, 2000) + '\n\n';

    if (_thPersona) {
        sys += '对方：' + (_thPersona.name || '对方') + '\n';
        if (_thPersona.detail) sys += '对方设定：' + _thPersona.detail.substring(0, 500) + '\n\n';
    }

    /* ★ 文风注入 — 如果选了文风就强制用文风要求 */
    if (_thActiveStyle && _thActiveStyle.prompt) {
        sys += '【文风要求 — 必须严格遵守，不可偏离】\n';
        sys += _thActiveStyle.prompt + '\n\n';
    }

    sys += '【输出要求】\n';
    sys += '以白描手法写作，像小说正文一样自然叙事。\n';
    sys += '不要堆砌形容词，不要过度描写外貌和穿着，不要反复描写五官和瞳孔。\n';
    sys += '动作一笔带过，重点放在对话内容、语气、态度、互动节奏上。\n';
    sys += '对话用「」，叙述用白描，干净利落，像余华、东野圭吾、村上春树的笔法。\n';
    sys += '角色说话要有性格，不要客套废话，要有真实感和生活气息。\n';
    sys += '心理活动可以写但要克制，一两句点到为止，不要大段独白。\n';
    sys += '只写你扮演的角色，不写对方的动作和对话。\n';
    sys += '每段之间空一行，每段50-120字左右。\n';
    sys += '总字数不少于1000字。\n';

    var msgs = [{ role: 'system', content: sys }];
    for (var i = 0; i < _thHistory.length; i++) {
        msgs.push({ role: _thHistory[i].role, content: _thHistory[i].content });
    }
    if (msgs.length === 1) {
        msgs.push({ role: 'user', content: '（场景开始，你先开口。）' });
    }

    var endpoint = _thBuildEndpoint(api.url);

    fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + api.key
        },
        body: JSON.stringify({
            model: api.model,
            messages: msgs,
            temperature: 0.85,
            max_tokens: 4096
        })
    })
        .then(function (res) { return res.json(); })
        .then(function (data) {
            var text = '';
            if (data.choices && data.choices[0]) {
                if (data.choices[0].message) text = data.choices[0].message.content || '';
                else if (data.choices[0].text) text = data.choices[0].text;
            }
            if (!text) {
                _thPhase = 'input'; _thSaveMemory(); _thRenderStage();
                if (typeof showToast === 'function') showToast('Empty response 空回复');
                return;
            }
            _thHistory.push({ role: 'assistant', content: text });
            _thAutoSummaryCheck();   // ← 新增
            _thSegments = _thSplitSegs(text);
            _thSegIdx = 0;
            _thPhase = 'reading';
            _thSaveMemory();
            _thRenderStage();
        })
        .catch(function (err) {
            _thPhase = 'input'; _thSaveMemory(); _thRenderStage();
            if (typeof showToast === 'function') showToast('Error: ' + (err.message || err));
        });
}

/* ===== 分段 — 原始橙光式 ===== */
function _thSplitSegs(text) {
    var rawSegs = text.split(/\n\s*\n/);
    var segs = [];
    for (var i = 0; i < rawSegs.length; i++) {
        var s = rawSegs[i].trim();
        if (!s) continue;
        if (s.length <= 120) {
            segs.push(s);
        } else {
            var parts = s.split(/(?<=[。！？…」\n])/);
            var buf = '';
            for (var j = 0; j < parts.length; j++) {
                buf += parts[j];
                if (buf.length >= 60) {
                    segs.push(buf.trim());
                    buf = '';
                }
            }
            if (buf.trim()) segs.push(buf.trim());
        }
    }
    if (segs.length === 0 && text.trim()) segs.push(text.trim());
    return segs;
}

/* ===== 工具 ===== */
function _thBackDetail() { _thSaveMemory(); _thView = 'detail'; _thRenderDetail(); }

function _thPickBg() {
    var inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.onchange = function () {
        if (!inp.files || !inp.files[0]) return;
        var reader = new FileReader();
        reader.onload = function (e) {
            _thBg = e.target.result;
            try { localStorage.setItem('_thBg', _thBg); } catch (err) { }
            if (_thView === 'stage') _thRenderStage();
            else if (_thView === 'detail') _thRenderDetail();
            else _thRenderList();
        };
        reader.readAsDataURL(inp.files[0]);
    };
    inp.click();
}

/* ===== ★ 对话记录面板（右上角按钮打开） ===== */
function _thShowLog() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    if (document.getElementById('thtrLogPanel')) return;
    var r = _thRole;

    var h = '<div class="thtr-log-overlay">';
    h += '<div class="thtr-log-header">';
    h += '<div class="thtr-log-title">DIALOG LOG 对话记录</div>';
    h += '<div class="thtr-log-close" onclick="_thCloseLog()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-log-list">';
    if (_thHistory.length === 0) {
        h += '<div style="text-align:center;padding:60px 20px;color:#aaa;font-size:10px;letter-spacing:.5px;">暂无对话记录</div>';
    }
    for (var i = 0; i < _thHistory.length; i++) {
        var msg = _thHistory[i];
        var speaker = msg.role === 'user' ? (_thPersona ? _thPersona.name : 'YOU') : (r ? r.name : 'AI');
        h += '<div class="thtr-log-item">';
        h += '<div class="thtr-log-role">' + _thEsc(speaker) + '</div>';
        h += '<div class="thtr-log-text">' + _thFmt(msg.content) + '</div>';
        h += '</div>';
    }
    h += '</div></div>';

    var panel = document.createElement('div');
    panel.id = 'thtrLogPanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:110;';
    panel.innerHTML = h;
    el.appendChild(panel);
}

function _thCloseLog() {
    var p = document.getElementById('thtrLogPanel');
    if (p) p.remove();
}

/* ===== ★ 文风设置面板 ===== */
function _thOpenWF() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    if (document.getElementById('thtrWFPanel')) return;

    var h = '<div class="thtr-style-overlay">';
    h += '<div class="thtr-style-card">';
    h += '<div class="thtr-style-header">';
    h += '<div class="thtr-style-title">WRITING STYLE 文风设置</div>';
    h += '<div class="thtr-style-close" onclick="_thCloseWF()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div>';

    h += '<div class="thtr-style-body">';

    /* 当前文风 */
    h += '<div class="thtr-style-label">当前文风 Active Style</div>';
    if (_thActiveStyle) {
        h += '<div style="background:rgba(255,255,255,.5);border-radius:10px;padding:10px 12px;margin-bottom:14px;">';
        h += '<div style="font-size:11px;font-weight:700;color:#444;">' + _thEsc(_thActiveStyle.name) + '</div>';
        h += '<div style="font-size:9px;color:#888;margin-top:4px;line-height:1.5;">' + _thEsc(_thActiveStyle.prompt.substring(0, 120)) + (_thActiveStyle.prompt.length > 120 ? '...' : '') + '</div>';
        h += '<div style="margin-top:8px;"><span class="thtr-style-btn danger" style="font-size:9px;padding:4px 12px;" onclick="_thClearActiveWF()">取消使用</span></div>';
        h += '</div>';
    } else {
        h += '<div style="color:#aaa;font-size:10px;margin-bottom:14px;">未选择文风，将使用默认白描叙述</div>';
    }

    /* 预设列表 */
    h += '<div class="thtr-style-label">预设列表 Presets</div>';
    if (_thStyles.length === 0) {
        h += '<div style="color:#bbb;font-size:10px;margin-bottom:14px;">暂无预设，在下方创建</div>';
    }
    for (var wi = 0; wi < _thStyles.length; wi++) {
        var ws = _thStyles[wi];
        var isActive = (_thActiveStyle && _thActiveStyle.id === ws.id);
        h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid rgba(0,0,0,.04);">';
        h += '<div style="flex:1;">';
        h += '<div style="font-size:10px;font-weight:700;color:#444;">' + _thEsc(ws.name) + (isActive ? ' <span style="color:#6a5;font-size:8px;">● 使用中</span>' : '') + '</div>';
        h += '<div style="font-size:9px;color:#999;margin-top:2px;line-height:1.4;">' + _thEsc(ws.prompt.substring(0, 60)) + (ws.prompt.length > 60 ? '...' : '') + '</div>';
        h += '</div>';
        if (!isActive) h += '<span class="thtr-style-btn" style="font-size:8px;padding:3px 10px;" onclick="_thUseWF(' + wi + ')">使用</span>';
        h += '<span class="thtr-style-btn danger" style="font-size:8px;padding:3px 10px;" onclick="_thDelWF(' + wi + ')">删除</span>';
        h += '</div>';
    }

    /* 新建 */
    h += '<div class="thtr-style-label" style="margin-top:16px;">新建文风 Create New</div>';
    h += '<input type="text" id="thtrWFName" placeholder="文风名称，如：冷硬白描 / 诗意抒情 / 悬疑暗黑..." style="width:100%;padding:8px 12px;border:1px solid rgba(0,0,0,.08);border-radius:8px;font-size:11px;background:rgba(255,255,255,.5);margin-bottom:8px;box-sizing:border-box;">';
    h += '<textarea id="thtrWFPrompt" placeholder="文风描述/要求，例如：\n\n以白描手法叙述，语言简练克制，不用华丽辞藻。对话干净利落，动作描写用短句。整体氛围冷峻。" style="width:100%;height:120px;padding:10px 12px;border:1px solid rgba(0,0,0,.08);border-radius:8px;font-size:10px;line-height:1.6;background:rgba(255,255,255,.5);resize:vertical;box-sizing:border-box;"></textarea>';

    h += '<div class="thtr-style-btns">';
    h += '<div class="thtr-style-btn primary" onclick="_thAddWF()">保存预设 Save</div>';
    h += '</div>';

    h += '</div></div></div>';

    var panel = document.createElement('div');
    panel.id = 'thtrWFPanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:110;';
    panel.innerHTML = h;
    el.appendChild(panel);
}

function _thCloseWF() { var p = document.getElementById('thtrWFPanel'); if (p) p.remove(); }

function _thAddWF() {
    var nameEl = document.getElementById('thtrWFName');
    var promptEl = document.getElementById('thtrWFPrompt');
    if (!nameEl || !promptEl) return;
    var name = nameEl.value.trim(), prompt = promptEl.value.trim();
    if (!name || !prompt) { if (typeof showToast === 'function') showToast('请填写文风名称和描述'); return; }
    var ws = { id: 'wf_' + Date.now(), name: name, prompt: prompt };
    _thStyles.push(ws);
    _thActiveStyle = ws;
    _thSaveStyles();
    if (typeof showToast === 'function') showToast('已保存并启用: ' + name);
    _thCloseWF(); _thOpenWF();
}

function _thUseWF(idx) {
    if (idx >= 0 && idx < _thStyles.length) {
        _thActiveStyle = _thStyles[idx]; _thSaveStyles();
        if (typeof showToast === 'function') showToast('已启用: ' + _thActiveStyle.name);
        _thCloseWF(); _thOpenWF();
    }
}

function _thDelWF(idx) {
    if (idx >= 0 && idx < _thStyles.length) {
        var removed = _thStyles.splice(idx, 1)[0];
        if (_thActiveStyle && _thActiveStyle.id === removed.id) _thActiveStyle = null;
        _thSaveStyles(); _thCloseWF(); _thOpenWF();
    }
}

function _thClearActiveWF() {
    _thActiveStyle = null; _thSaveStyles(); _thCloseWF(); _thOpenWF();
}


/* ===== ★ 记忆总结面板 ===== */
function _thOpenMemPanel() {
    var el = document.getElementById('theaterOverlay'); if (!el) return;
    if (document.getElementById('thtrMemPanel')) return;
    var roleId = _thRole ? _thRole.id : null;
    var sums = roleId ? _thLoadSummaries(roleId) : [];

    var h = '<div class="thtr-log-overlay">';
    h += '<div class="thtr-log-header">';
    h += '<div class="thtr-log-title">MEMORY SUMMARY 记忆总结</div>';
    h += '<div style="display:flex;align-items:center;gap:8px;">';
    h += '<div class="thtr-mem-pull-btn" onclick="_thManualSummary()">手动拉取</div>';
    h += '<div class="thtr-log-close" onclick="_thCloseMemPanel()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>';
    h += '</div></div>';

    h += '<div class="thtr-log-list">';

    if (sums.length === 0) {
        h += '<div class="thtr-mem-empty">';
        h += '<div class="thtr-mem-empty-title">暂无记忆总结</div>';
        h += '<div class="thtr-mem-empty-hint">每10条对话自动生成一次<br>也可点击右上角「手动拉取」</div>';
        h += '</div>';
    } else {
        for (var i = 0; i < sums.length; i++) {
            var s = sums[i];
            var cardId = 'thtrMemCard' + i;
            var bodyId = 'thtrMemBody' + i;
            h += '<div class="thtr-mem-phase-card" id="' + cardId + '">';
            /* 头部：点击折叠/展开 */
            h += '<div class="thtr-mem-phase-header" onclick="_thToggleMemCard(' + i + ')">';
            h += '<div class="thtr-mem-phase-badge">第 ' + s.phase + ' 阶段</div>';
            h += '<div style="display:flex;align-items:center;gap:8px;">';
            h += '<div class="thtr-mem-phase-meta">' + _thEsc(s.time || '') + ' · 第' + s.count + '条</div>';
            h += '<div class="thtr-mem-chevron" id="thtrMemChev' + i + '">&#8964;</div>';
            h += '</div></div>';
            /* 内容区（默认折叠，点击展开） */
            h += '<div class="thtr-mem-phase-body" id="' + bodyId + '" style="display:none;">';
            h += '<div class="thtr-mem-phase-text">' + _thEsc(s.summary) + '</div>';
            h += '<div class="thtr-mem-phase-actions">';
            h += '<div class="thtr-mem-copy-btn" onclick="_thCopySum(' + i + ')">复制全文</div>';
            h += '</div></div>';
            h += '</div>';
        }
    }

    h += '</div></div>';

    var panel = document.createElement('div');
    panel.id = 'thtrMemPanel';
    panel.style.cssText = 'position:absolute;inset:0;z-index:110;';
    panel.innerHTML = h;
    el.appendChild(panel);
}

function _thCloseMemPanel() {
    var p = document.getElementById('thtrMemPanel');
    if (p) p.remove();
}

function _thManualSummary() {
    // 手动拉取：强制用当前未被总结的内容生成
    if (!_thRole) return;
    var existingSums = _thLoadSummaries(_thRole.id);
    // 找出上次总结到的位置
    var lastCount = existingSums.length > 0 ? existingSums[existingSums.length - 1].count : 0;
    _thLastSumCount = lastCount;
    _thRunSummary(true);
}


/* 展开/折叠某个阶段卡片 */
function _thToggleMemCard(idx) {
    var body = document.getElementById('thtrMemBody' + idx);
    var chev = document.getElementById('thtrMemChev' + idx);
    if (!body) return;
    if (body.style.display === 'none') {
        body.style.display = 'block';
        if (chev) chev.style.transform = 'rotate(180deg)';
    } else {
        body.style.display = 'none';
        if (chev) chev.style.transform = 'rotate(0deg)';
    }
}

/* 复制某个阶段总结全文 */
function _thCopySum(idx) {
    var roleId = _thRole ? _thRole.id : null;
    if (!roleId) return;
    var sums = _thLoadSummaries(roleId);
    if (!sums[idx]) return;
    var text = '【第' + sums[idx].phase + '阶段总结】\n' + sums[idx].summary;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            if (typeof showToast === 'function') showToast('已复制第' + sums[idx].phase + '阶段总结');
        }).catch(function () { _thCopyFallback(text); });
    } else {
        _thCopyFallback(text);
    }
}

function _thCopyFallback(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:-999px;left:-999px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        if (typeof showToast === 'function') showToast('已复制');
    } catch (e) {
        if (typeof showToast === 'function') showToast('复制失败，请手动长按');
    }
    document.body.removeChild(ta);
}
