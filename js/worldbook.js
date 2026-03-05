/* ============================================
   蛋薯机 DanShu Pro v2 — worldbook.js
   世界书模块（独立文件）
   统一存储 key = ds_worldbook_data
   ============================================ */

var WB_KEY = 'ds_worldbook_data';
var _wbData = [];
var _wbCurrentTab = 'global';
var _wbEditingId = null;
var _wbSelectedInject = 'before';   // 当前编辑器选中的注入位置

/* ========== 加载 & 保存 ========== */
function loadWbData() {
    try { _wbData = JSON.parse(localStorage.getItem(WB_KEY) || '[]'); } catch (e) { _wbData = []; }
}
function saveWbData() {
    try { localStorage.setItem(WB_KEY, JSON.stringify(_wbData)); } catch (e) { }
    // ★ 同步到消息 App 的 _chatWorldBookLib
    syncWbToChat();
}
loadWbData();

/* ★ 同步：worldbook app 数据 → 消息 app 可读取 */
function syncWbToChat() {
    // 把 _wbData 中已启用的条目同步到 _chatWorldBookLib
    if (typeof _chatWorldBookLib === 'undefined') return;
    _chatWorldBookLib.length = 0;
    for (var i = 0; i < _wbData.length; i++) {
        var e = _wbData[i];
        _chatWorldBookLib.push({
            id: e.id,
            name: e.name || '',
            content: e.content || '',
            inject: e.inject || 'before',
            group: e.group || '默认',
            keywords: e.keywords || '',
            type: e.type || 'global',
            enabled: e.enabled !== false
        });
    }
    if (typeof saveWorldBookLib === 'function') saveWorldBookLib();
}

/* ========== 打开 / 关闭世界书 App ========== */
function openWorldBookApp() {
    var el = document.getElementById('wbAppOverlay');
    if (!el) return;
    el.classList.add('show');
    renderWbList();
    renderWbGroupBar();
}
function closeWorldBookApp() {
    var el = document.getElementById('wbAppOverlay');
    if (el) el.classList.remove('show');
}

/* ========== Tab 切换 ========== */
function switchWbTab(tab) {
    _wbCurrentTab = tab;
    var tabs = document.querySelectorAll('#wbTabBar .wb-tab');
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === tab);
    }
    renderWbList();
}

/* ========== 分组栏渲染 ========== */
function renderWbGroupBar() {
    var bar = document.getElementById('wbGroupBar');
    if (!bar) return;
    loadWbData();
    var groups = {};
    for (var i = 0; i < _wbData.length; i++) {
        var g = _wbData[i].group || '默认';
        if (!groups[g]) groups[g] = 0;
        groups[g]++;
    }
    var h = '<div class="wb-group-chip active" onclick="filterWbGroup(\'all\')">全部</div>';
    for (var name in groups) {
        h += '<div class="wb-group-chip" onclick="filterWbGroup(\'' + esc(name) + '\')">' + esc(name) + ' (' + groups[name] + ')</div>';
    }
    bar.innerHTML = h;
}

var _wbFilterGroup = 'all';
function filterWbGroup(group) {
    _wbFilterGroup = group;
    var chips = document.querySelectorAll('#wbGroupBar .wb-group-chip');
    for (var i = 0; i < chips.length; i++) chips[i].classList.remove('active');
    if (event && event.target) event.target.classList.add('active');
    renderWbList();
}

/* ========== 注入位置标签映射 ========== */
function injectLabel(pos) {
    if (pos === 'after') return '后';
    if (pos === 'middle') return '中';
    return '前';
}
function injectClass(pos) {
    if (pos === 'after') return 'pos-after';
    if (pos === 'middle') return 'pos-middle';
    return 'pos-before';
}

/* ========== 列表渲染 ========== */
function renderWbList() {
    var body = document.getElementById('wbAppBody');
    if (!body) return;
    loadWbData();

    var filtered = [];
    for (var i = 0; i < _wbData.length; i++) {
        var entry = _wbData[i];
        if (_wbCurrentTab === 'global' && entry.type === 'role') continue;
        if (_wbCurrentTab === 'role' && entry.type !== 'role') continue;
        if (_wbFilterGroup !== 'all') {
            var g = entry.group || '默认';
            if (g !== _wbFilterGroup) continue;
        }
        filtered.push(entry);
    }

    if (!filtered.length) {
        body.innerHTML = '<div class="wb-empty">'
            + '<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="#999" stroke-width="1.5">'
            + '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>'
            + '<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>'
            + '<p style="color:rgba(0,0,0,0.35);font-size:13px;margin-top:12px;">暂无世界书条目</p>'
            + '<p style="color:rgba(0,0,0,0.25);font-size:11px;">点击右上角 + 添加</p>'
            + '</div>';
        return;
    }

    var h = '';
    for (var j = 0; j < filtered.length; j++) {
        var e = filtered[j];
        var preview = (e.content || '').substring(0, 60);
        if ((e.content || '').length > 60) preview += '...';
        var pos = e.inject || 'before';

        h += '<div class="wb-entry-card" onclick="editWbEntry(\'' + e.id + '\')">';
        h += '<div class="wb-entry-header">';
        h += '<div class="wb-entry-name">' + esc(e.name || '未命名') + '</div>';
        h += '<div class="wb-entry-toggle ' + (e.enabled !== false ? 'on' : '') + '" onclick="event.stopPropagation();toggleWbEntry(\'' + e.id + '\')">';
        h += '<div class="wb-toggle-dot"></div></div>';
        h += '</div>';
        if (e.group) {
            h += '<div class="wb-entry-group">' + esc(e.group) + '</div>';
        }
        // 注入位置标签
        h += '<div class="wb-entry-inject-tag">注入：' + injectLabel(pos) + '</div>';
        if (e.keywords) {
            h += '<div class="wb-entry-keywords">关键词: ' + esc(e.keywords) + '</div>';
        }
        h += '<div class="wb-entry-preview">' + esc(preview) + '</div>';
        h += '<div class="wb-entry-actions">';
        h += '<div class="wb-entry-delete" onclick="event.stopPropagation();deleteWbEntry(\'' + e.id + '\')">删除</div>';
        h += '</div>';
        h += '</div>';
    }
    body.innerHTML = h;
}

/* ========== 开关条目 ========== */
function toggleWbEntry(id) {
    loadWbData();
    for (var i = 0; i < _wbData.length; i++) {
        if (_wbData[i].id === id) {
            _wbData[i].enabled = !(_wbData[i].enabled !== false);
            break;
        }
    }
    saveWbData();
    renderWbList();
}

/* ========== 删除条目 ========== */
function deleteWbEntry(id) {
    if (!confirm('确定删除这条世界书？')) return;
    loadWbData();
    _wbData = _wbData.filter(function (e) { return e.id !== id; });
    saveWbData();
    renderWbList();
    renderWbGroupBar();
    if (typeof showToast === 'function') showToast('已删除');
}

/* ========== 注入位置 · 折叠选择器 ========== */
function toggleWbInjectDropdown() {
    var section = document.getElementById('wbInjectSection');
    if (section) section.classList.toggle('open');
}

function selectWbInject(pos) {
    _wbSelectedInject = pos;

    // 更新选项高亮
    var opts = document.querySelectorAll('#wbInjectSection .wb-inject-opt');
    for (var i = 0; i < opts.length; i++) {
        opts[i].classList.toggle('active', opts[i].getAttribute('data-pos') === pos);
    }

    // 更新触发器显示
    var display = document.getElementById('wbInjectDisplay');
    if (display) {
        var labels = { before: '前', middle: '中', after: '后' };
        display.textContent = labels[pos] || '前';
        display.setAttribute('data-pos', pos);
    }

    // 选完自动收起
    setTimeout(function () {
        var section = document.getElementById('wbInjectSection');
        if (section) section.classList.remove('open');
    }, 180);
}

/* ========== 打开编辑器（新建 / 编辑） ========== */
function openWbEditor(id) {
    _wbEditingId = id || null;
    var overlay = document.getElementById('wbEditorOverlay');
    if (!overlay) return;
    overlay.classList.add('show');

    var titleEl = document.getElementById('wbEditorTitle');
    var nameInput = document.getElementById('wbEdName');
    var groupSelect = document.getElementById('wbEdGroup');
    var contentArea = document.getElementById('wbEdContent');
    var kwInput = document.getElementById('wbEdKeywords');

    if (_wbEditingId) {
        loadWbData();
        var entry = null;
        for (var i = 0; i < _wbData.length; i++) {
            if (_wbData[i].id === _wbEditingId) { entry = _wbData[i]; break; }
        }
        if (entry) {
            if (titleEl) titleEl.textContent = 'Edit · 编辑';
            if (nameInput) nameInput.value = entry.name || '';
            if (groupSelect) groupSelect.value = entry.group || '默认';
            if (contentArea) contentArea.value = entry.content || '';
            if (kwInput) kwInput.value = entry.keywords || '';
            _wbSelectedInject = entry.inject || 'before';
            selectWbInject(_wbSelectedInject);
            selectWbInject(_wbSelectedInject);
            // 确保折叠关闭
            var sec = document.getElementById('wbInjectSection');
            if (sec) sec.classList.remove('open');
            return;
        }
    }

    // 新建
    if (titleEl) titleEl.textContent = 'New Entry · 新建';
    if (nameInput) nameInput.value = '';
    if (groupSelect) groupSelect.value = '默认';
    if (contentArea) contentArea.value = '';
    if (kwInput) kwInput.value = '';
    _wbSelectedInject = 'before';
    selectWbInject('before');
}

function closeWbEditor() {
    var overlay = document.getElementById('wbEditorOverlay');
    if (overlay) overlay.classList.remove('show');
    _wbEditingId = null;
}

/* ========== 保存条目 ========== */
function saveWbEntry() {
    var nameInput = document.getElementById('wbEdName');
    var groupSelect = document.getElementById('wbEdGroup');
    var contentArea = document.getElementById('wbEdContent');
    var kwInput = document.getElementById('wbEdKeywords');

    var name = nameInput ? nameInput.value.trim() : '';
    var group = groupSelect ? groupSelect.value : '默认';
    var content = contentArea ? contentArea.value.trim() : '';
    var keywords = kwInput ? kwInput.value.trim() : '';
    var inject = _wbSelectedInject || 'before';

    if (!name) { if (typeof showToast === 'function') showToast('请输入名称'); return; }
    if (!content) { if (typeof showToast === 'function') showToast('请输入内容'); return; }

    loadWbData();

    if (_wbEditingId) {
        for (var i = 0; i < _wbData.length; i++) {
            if (_wbData[i].id === _wbEditingId) {
                _wbData[i].name = name;
                _wbData[i].group = group;
                _wbData[i].content = content;
                _wbData[i].keywords = keywords;
                _wbData[i].inject = inject;
                break;
            }
        }
    } else {
        _wbData.push({
            id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            name: name,
            group: group,
            content: content,
            keywords: keywords,
            inject: inject,
            type: _wbCurrentTab === 'role' ? 'role' : 'global',
            enabled: true
        });
    }

    saveWbData();
    closeWbEditor();
    renderWbList();
    renderWbGroupBar();
    if (typeof showToast === 'function') showToast(_wbEditingId ? '已保存 ✨' : '已创建 ✨');
}

/* ========== 编辑已有条目 ========== */
function editWbEntry(id) { openWbEditor(id); }

/* ========== 辅助：HTML 转义 ========== */
function esc(str) {
    if (typeof str !== 'string') return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}
