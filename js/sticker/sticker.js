/* ============================================
   蛋薯机 DanShu Pro v2 — sticker.js
   表情包管理 + 对话页表情选择面板
   ============================================ */

/* ========== 数据结构 ==========
   _stickerGroups = [
     { id:'sg_xxx', name:'默认', stickers:[
       { id:'st_xxx', url:'https://...png', desc:'' }
     ]}
   ]
   ========== */

var _stickerGroups = [];
var _stickerActiveGroup = '';
var _stickerPanelOpen = false;

var STK_KEY = 'ds_sticker_groups';

function loadStickerGroups() {
    try { _stickerGroups = JSON.parse(localStorage.getItem(STK_KEY) || '[]'); }
    catch (e) { _stickerGroups = []; }
    if (!_stickerGroups.length) {
        _stickerGroups.push({ id: 'sg_default', name: '默认分组', stickers: [] });
        saveStickerGroups();
    }
}

function saveStickerGroups() {
    try { localStorage.setItem(STK_KEY, JSON.stringify(_stickerGroups)); }
    catch (e) { showToast('存储空间不足'); }
}

function findStickerGroup(id) {
    for (var i = 0; i < _stickerGroups.length; i++) {
        if (_stickerGroups[i].id === id) return _stickerGroups[i];
    }
    return null;
}

/* ================================================
   ======== 表情包管理页面 ========
   ================================================ */

function openStickerManager() {
    var page = document.getElementById('stickerManagerPage');
    if (!page) return;
    loadStickerGroups();
    if (!_stickerActiveGroup && _stickerGroups.length) _stickerActiveGroup = _stickerGroups[0].id;
    renderStickerManager();
    page.style.display = 'flex';
}

function closeStickerManager() {
    var page = document.getElementById('stickerManagerPage');
    if (page) page.style.display = 'none';
}

function renderStickerManager() {
    var body = document.getElementById('stickerManagerBody');
    if (!body) return;

    var h = '';

    // 顶部操作栏：导入 + 导出
    h += '<div class="stk-action-bar">';
    h += '<div class="stk-action-btn" onclick="stkImportJSON()">';
    h += '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
    h += '<span>导入表情包</span></div>';
    h += '<div class="stk-action-btn" onclick="stkExportJSON()">';
    h += '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';
    h += '<span>导出表情包</span></div>';
    h += '</div>';

    // 隐藏的文件input
    h += '<input type="file" id="stkImportFile" accept=".json,.png,.jpg,.jpeg,.gif,.webp" multiple style="display:none" onchange="stkHandleImportFile(event)">';

    // 批量URL导入区
    h += '<div class="stk-section">';
    h += '<div class="stk-section-title">批量导入URL</div>';
    h += '<textarea id="stkBatchUrlInput" class="stk-textarea" rows="4" placeholder="每行一条，支持格式：\n纯URL：https://xxx.com/a.gif\n名字+URL：捶桌痛哭https://xxx.com/a.gif\n支持 png / jpg / jpeg / gif / webp"></textarea>';
    h += '<div class="stk-import-row">';
    h += '<select id="stkBatchTargetGroup" class="stk-select">';
    for (var g = 0; g < _stickerGroups.length; g++) {
        h += '<option value="' + _stickerGroups[g].id + '">' + escapeHtml(_stickerGroups[g].name) + '</option>';
    }
    h += '</select>';
    h += '<div class="stk-btn stk-btn-primary" onclick="stkBatchImportUrl()">导入</div>';
    h += '</div></div>';

    // 分组管理
    h += '<div class="stk-section">';
    h += '<div class="stk-section-title">分组管理</div>';
    h += '<div class="stk-group-bar">';
    for (var i = 0; i < _stickerGroups.length; i++) {
        var grp = _stickerGroups[i];
        var isActive = grp.id === _stickerActiveGroup;
        h += '<div class="stk-group-tab' + (isActive ? ' active' : '') + '" onclick="stkSwitchGroup(\'' + grp.id + '\')">';
        h += escapeHtml(grp.name) + ' (' + grp.stickers.length + ')';
        h += '</div>';
    }
    h += '<div class="stk-group-tab stk-group-add" onclick="stkAddGroup()">+</div>';
    h += '</div>';

    // 当前分组操作
    var curGroup = findStickerGroup(_stickerActiveGroup);
    if (curGroup) {
        h += '<div class="stk-group-actions">';
        h += '<div class="stk-small-btn" onclick="stkRenameGroup(\'' + curGroup.id + '\')" title="重命名">';
        h += '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></div>';
        if (curGroup.id !== 'sg_default') {
            h += '<div class="stk-small-btn stk-danger-btn" onclick="stkDeleteGroup(\'' + curGroup.id + '\')" title="删除分组">';
            h += '<svg viewBox="0 0 24 24" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></div>';
        }
        h += '</div>';

        // 表情包网格
        h += '<div class="stk-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:8px 0">';
        if (!curGroup.stickers.length) {
            h += '<div class="stk-empty" style="grid-column:1/-1">暂无表情包，可批量导入URL或导入JSON文件</div>';
        } else {
            for (var j = 0; j < curGroup.stickers.length; j++) {
                var stk = curGroup.stickers[j];
                h += '<div class="stk-item" data-stk-id="' + stk.id + '" style="position:relative;width:100%;padding-top:100%;background:#fafafa;border-radius:8px;overflow:hidden;border:1px solid #f0e8e8">';
                h += '<img src="' + stk.url + '" alt="" loading="lazy" '
                    + 'style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box" '
                    + 'onerror="this.parentElement.style.opacity=\'0.3\'">';
                if (stk.desc) h += '<div style="position:absolute;bottom:0;left:0;right:0;font-size:9px;color:#888;text-align:center;background:rgba(255,255,255,0.85);padding:2px 3px;line-height:1.2;word-break:break-all">' + escapeHtml(stk.desc) + '</div>';
                h += '<div class="stk-item-del" onclick="event.stopPropagation();stkDeleteOne(\'' + curGroup.id + '\',\'' + stk.id + '\')" style="position:absolute;top:2px;right:2px;width:16px;height:16px;line-height:16px;text-align:center;background:rgba(0,0,0,0.4);color:#fff;border-radius:50%;font-size:12px;cursor:pointer">&times;</div>';
                h += '</div>';
            }
        }
        h += '</div>';
    }
    h += '</div>';

    body.innerHTML = h;
}

/* ---- 分组操作 ---- */
function stkSwitchGroup(id) {
    _stickerActiveGroup = id;
    renderStickerManager();
}

function stkAddGroup() {
    var name = prompt('新分组名称：', '分组 ' + (_stickerGroups.length + 1));
    if (!name) return;
    var grp = { id: 'sg_' + Date.now(), name: name, stickers: [] };
    _stickerGroups.push(grp);
    saveStickerGroups();
    _stickerActiveGroup = grp.id;
    renderStickerManager();
    showToast('分组已创建');
}

function stkRenameGroup(id) {
    var grp = findStickerGroup(id);
    if (!grp) return;
    var name = prompt('重命名分组：', grp.name);
    if (!name) return;
    grp.name = name;
    saveStickerGroups();
    renderStickerManager();
}

function stkDeleteGroup(id) {
    if (!confirm('确认删除此分组及所有表情包？')) return;
    _stickerGroups = _stickerGroups.filter(function (g) { return g.id !== id; });
    saveStickerGroups();
    if (_stickerActiveGroup === id) {
        _stickerActiveGroup = _stickerGroups.length ? _stickerGroups[0].id : '';
    }
    renderStickerManager();
    showToast('分组已删除');
}

function stkDeleteOne(groupId, stickerId) {
    var grp = findStickerGroup(groupId);
    if (!grp) return;
    grp.stickers = grp.stickers.filter(function (s) { return s.id !== stickerId; });
    saveStickerGroups();
    renderStickerManager();
}

/* ---- 批量URL导入 ---- */
function stkBatchImportUrl() {
    var textarea = document.getElementById('stkBatchUrlInput');
    var select = document.getElementById('stkBatchTargetGroup');
    if (!textarea || !select) return;

    var lines = textarea.value.split('\n');
    // 支持格式：
    //   纯URL：  https://xxx.com/a.gif
    //   名字+URL：捶桌痛哭https://xxx.com/a.gif
    //   名字 URL（空格分隔）：捶桌痛哭 https://xxx.com/a.gif
    var imgExtReg = /\.(png|jpg|jpeg|gif|webp)(\?.*)?$/i;
    var urlReg = /https?:\/\/[^\s]+/i;
    var items = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var match = line.match(urlReg);
        if (!match) continue;
        var url = match[0];
        // 提取 URL 前面的文字作为 desc（去掉首尾空格/空格分隔符）
        var desc = line.substring(0, match.index).trim();
        // URL 后面若还有文字也追加到 desc
        var afterUrl = line.substring(match.index + url.length).trim();
        if (afterUrl) desc = desc ? desc + ' ' + afterUrl : afterUrl;
        items.push({ url: url, desc: desc });
    }
    if (!items.length) { showToast('请输入有效的图片URL（支持 png/jpg/jpeg/gif/webp）'); return; }

    var grp = findStickerGroup(select.value);
    if (!grp) { showToast('请选择分组'); return; }

    for (var j = 0; j < items.length; j++) {
        grp.stickers.push({
            id: 'st_' + Date.now() + '_' + j,
            url: items[j].url,
            desc: items[j].desc
        });
    }
    saveStickerGroups();
    textarea.value = '';
    renderStickerManager();
    showToast('已导入 ' + items.length + ' 个表情包');
}

/* ---- JSON导入/导出 ---- */
function stkImportJSON() {
    document.getElementById('stkImportFile').click();
}

function stkHandleImportFile(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            stkProcessImportData(data);
        } catch (err) {
            showToast('JSON解析失败：' + err.message);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function stkProcessImportData(data) {
    var imported = 0;

    // 格式1：完整分组数组 [{id,name,stickers:[{id,url,desc}]}]
    if (Array.isArray(data)) {
        for (var i = 0; i < data.length; i++) {
            var item = data[i];
            if (item.name && Array.isArray(item.stickers)) {
                // 整个分组导入
                var newGrp = {
                    id: 'sg_' + Date.now() + '_' + i,
                    name: item.name,
                    stickers: []
                };
                for (var j = 0; j < item.stickers.length; j++) {
                    var s = item.stickers[j];
                    if (s.url) {
                        newGrp.stickers.push({
                            id: 'st_' + Date.now() + '_' + i + '_' + j,
                            url: s.url,
                            desc: s.desc || ''
                        });
                        imported++;
                    }
                }
                _stickerGroups.push(newGrp);
            } else if (typeof item === 'string') {
                // 格式2：纯URL数组 ["url1","url2"]
                if (!findStickerGroup('sg_default')) {
                    _stickerGroups.push({ id: 'sg_default', name: '默认分组', stickers: [] });
                }
                var def = findStickerGroup('sg_default') || _stickerGroups[0];
                def.stickers.push({
                    id: 'st_' + Date.now() + '_' + i,
                    url: item,
                    desc: ''
                });
                imported++;
            } else if (item.url) {
                // 格式3：对象数组 [{url:"...",desc:"..."}]
                var def2 = findStickerGroup('sg_default') || _stickerGroups[0];
                def2.stickers.push({
                    id: 'st_' + Date.now() + '_' + i,
                    url: item.url,
                    desc: item.desc || ''
                });
                imported++;
            }
        }
    }
    // 格式4：单个分组对象 {name:"xxx",stickers:[...]}
    else if (data.name && Array.isArray(data.stickers)) {
        var grp = {
            id: 'sg_' + Date.now(),
            name: data.name,
            stickers: []
        };
        for (var k = 0; k < data.stickers.length; k++) {
            var sk = data.stickers[k];
            var url = typeof sk === 'string' ? sk : (sk.url || '');
            if (url) {
                grp.stickers.push({
                    id: 'st_' + Date.now() + '_' + k,
                    url: url,
                    desc: (typeof sk === 'object' && sk.desc) ? sk.desc : ''
                });
                imported++;
            }
        }
        _stickerGroups.push(grp);
    }

    if (imported > 0) {
        saveStickerGroups();
        _stickerActiveGroup = _stickerGroups[_stickerGroups.length - 1].id;
        renderStickerManager();
        showToast('成功导入 ' + imported + ' 个表情包');
    } else {
        function stkProcessImportData(data) {
            var imported = 0;

            // 格式1：完整分组数组 [{id,name,stickers:[{id,url,desc}]}]
            if (Array.isArray(data)) {
                for (var i = 0; i < data.length; i++) {
                    var item = data[i];
                    if (item.name && Array.isArray(item.stickers)) {
                        var newGrp = {
                            id: 'sg_' + Date.now() + '_' + i,
                            name: item.name,
                            stickers: []
                        };
                        for (var j = 0; j < item.stickers.length; j++) {
                            var s = item.stickers[j];
                            if (s.url) {
                                newGrp.stickers.push({
                                    id: 'st_' + Date.now() + '_' + i + '_' + j,
                                    url: s.url,
                                    desc: s.desc || ''
                                });
                                imported++;
                            }
                        }
                        _stickerGroups.push(newGrp);
                    } else if (typeof item === 'string') {
                        // 格式2：纯URL数组
                        if (!findStickerGroup('sg_default')) {
                            _stickerGroups.push({ id: 'sg_default', name: '默认分组', stickers: [] });
                        }
                        var def = findStickerGroup('sg_default') || _stickerGroups[0];
                        def.stickers.push({
                            id: 'st_' + Date.now() + '_' + i,
                            url: item,
                            desc: ''
                        });
                        imported++;
                    } else if (item.url || item.imageData || item.originalUrl) {
                        // 格式3：对象数组 [{url/imageData/originalUrl, desc/description}]
                        var def2 = findStickerGroup('sg_default') || _stickerGroups[0];
                        def2.stickers.push({
                            id: 'st_' + Date.now() + '_' + i,
                            url: item.url || item.imageData || item.originalUrl,
                            desc: item.desc || item.description || ''
                        });
                        imported++;
                    }
                }
            }
            // 格式4：单个分组对象 {name:"xxx",stickers:[...]}
            else if (data.name && Array.isArray(data.stickers)) {
                var grp = {
                    id: 'sg_' + Date.now(),
                    name: data.name,
                    stickers: []
                };
                for (var k = 0; k < data.stickers.length; k++) {
                    var sk = data.stickers[k];
                    var url = typeof sk === 'string' ? sk : (sk.url || sk.imageData || sk.originalUrl || '');
                    if (url) {
                        grp.stickers.push({
                            id: 'st_' + Date.now() + '_' + k,
                            url: url,
                            desc: (typeof sk === 'object' && (sk.desc || sk.description)) ? (sk.desc || sk.description) : ''
                        });
                        imported++;
                    }
                }
                _stickerGroups.push(grp);
            }
            // 格式5：外部表情包工具格式 {library:{name}, emojis:[{imageData/originalUrl, description}]}
            else if (data.emojis && Array.isArray(data.emojis)) {
                var groupName = (data.library && data.library.name) ? data.library.name : '导入的表情包';
                var grp5 = {
                    id: 'sg_' + Date.now(),
                    name: groupName,
                    stickers: []
                };
                for (var m = 0; m < data.emojis.length; m++) {
                    var em = data.emojis[m];
                    var emUrl = em.url || em.imageData || em.originalUrl || '';
                    if (emUrl) {
                        grp5.stickers.push({
                            id: 'st_' + Date.now() + '_' + m,
                            url: emUrl,
                            desc: em.desc || em.description || em.name || ''
                        });
                        imported++;
                    }
                }
                _stickerGroups.push(grp5);
            }

            if (imported > 0) {
                saveStickerGroups();
                _stickerActiveGroup = _stickerGroups[_stickerGroups.length - 1].id;
                renderStickerManager();
                showToast('成功导入 ' + imported + ' 个表情包');
            } else {
                showToast('未识别到有效的表情包数据');
            }
        }
        showToast('未识别到有效的表情包数据');
    }
}

function stkExportJSON() {
    if (!_stickerGroups.length) { showToast('暂无表情包可导出'); return; }
    var exportData = [];
    for (var i = 0; i < _stickerGroups.length; i++) {
        var g = _stickerGroups[i];
        var stickers = [];
        for (var j = 0; j < g.stickers.length; j++) {
            stickers.push({ url: g.stickers[j].url, desc: g.stickers[j].desc || '' });
        }
        exportData.push({ name: g.name, stickers: stickers });
    }
    var json = JSON.stringify(exportData, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '表情包_' + new Date().toLocaleDateString() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('已导出表情包');
}

/* ================================================
   ======== 对话页表情包选择面板 ========
   ================================================ */

function toggleStickerPanel() {
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;
    if (_stickerPanelOpen) {
        closeStickerPanel();
    } else {
        openStickerPanel();
    }
}

function openStickerPanel() {
    loadStickerGroups();
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;
    _stickerPanelOpen = true;

    // ★ 只显示当前角色挂载的分组
    var visibleGroups = _getMountedStickerGroups();

    // 当前激活分组若不在可见列表里，重置到第一个
    var activeInVisible = false;
    for (var i = 0; i < visibleGroups.length; i++) {
        if (visibleGroups[i].id === _stickerActiveGroup) { activeInVisible = true; break; }
    }
    if (!activeInVisible) {
        _stickerActiveGroup = visibleGroups.length ? visibleGroups[0].id : '';
    }

    renderStickerPanel(visibleGroups);
    panel.classList.add('show');
}

function closeStickerPanel() {
    var panel = document.getElementById('chatStickerPanel');
    if (panel) panel.classList.remove('show');
    _stickerPanelOpen = false;
}

function renderStickerPanel(visibleGroups) {
    var panel = document.getElementById('chatStickerPanel');
    if (!panel) return;

    // ★ 优先用传入的已过滤分组，否则兜底用全量
    var groups = visibleGroups !== undefined ? visibleGroups : _getMountedStickerGroups();

    var h = '';

    // 多分组时显示 tabs
    if (groups.length > 0) {
        h += '<div class="stk-panel-tabs">';
        for (var i = 0; i < groups.length; i++) {
            var g = groups[i];
            var isActive = g.id === _stickerActiveGroup;
            h += '<div class="stk-panel-tab' + (isActive ? ' active' : '') + '" onclick="stkPanelSwitchGroup(\'' + g.id + '\')">';
            h += escapeHtml(g.name);
            h += '</div>';
        }
        h += '</div>';
    }

    // 找当前激活分组
    var curGroup = null;
    for (var ci = 0; ci < groups.length; ci++) {
        if (groups[ci].id === _stickerActiveGroup) { curGroup = groups[ci]; break; }
    }
    if (!curGroup && groups.length > 0) curGroup = groups[0];

    h += '<div class="stk-panel-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;padding:8px;overflow-y:auto;max-height:220px">';
    if (!curGroup || !curGroup.stickers || !curGroup.stickers.length) {
        var emptyTip = groups.length === 0
            ? '该角色未挂载表情包<br>前往角色设置挂载表情包分组'
            : '暂无表情包<br>前往「我」→ 表情包管理 添加';
        h += '<div class="stk-panel-empty" style="grid-column:1/-1;text-align:center;padding:20px;color:#aaa;font-size:12px">' + emptyTip + '</div>';
    } else {
        for (var j = 0; j < curGroup.stickers.length; j++) {
            var stk = curGroup.stickers[j];
            h += '<div class="stk-panel-item" onclick="sendSticker(\'' + encodeURIComponent(stk.url) + '\',\'' + encodeURIComponent(stk.desc || '') + '\')" '
                + 'style="position:relative;width:100%;padding-top:100%;background:#fafafa;border-radius:8px;overflow:hidden;cursor:pointer;border:1px solid #f0e8e8">';
            h += '<img src="' + stk.url + '" alt="" loading="lazy" '
                + 'style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;padding:4px;box-sizing:border-box" '
                + 'onerror="this.parentElement.style.opacity=\'0.3\'">';
            if (stk.desc) {
                h += '<div style="position:absolute;bottom:0;left:0;right:0;font-size:9px;color:#888;text-align:center;background:rgba(255,255,255,0.88);padding:2px 3px;line-height:1.2;word-break:break-all">' + escapeHtml(stk.desc) + '</div>';
            }
            h += '</div>';
        }
    }
    h += '</div>';

    panel.innerHTML = h;
}

function stkPanelSwitchGroup(id) {
    _stickerActiveGroup = id;
    // ★ 切换时保持挂载过滤
    renderStickerPanel(_getMountedStickerGroups());
}

/* ---- 发送表情包 ---- */
function sendSticker(encodedUrl, encodedDesc) {
    var url = decodeURIComponent(encodedUrl);
    var desc = decodeURIComponent(encodedDesc);
    var role = findRole(_chatCurrentConv);
    if (!role) return;

    closeStickerPanel();

    var now = new Date();
    var ts = pad(now.getHours()) + ':' + pad(now.getMinutes());
    if (!role.msgs) role.msgs = [];

    var msgObj = {
        from: 'self',
        text: '[表情包]',
        time: ts,
        sticker: true,
        stickerUrl: url,
        stickerDesc: desc || ''
    };

    role.msgs.push(msgObj);
    role.lastMsg = '[表情包]';
    role.lastTime = now.getTime();
    role.lastTimeStr = ts;
    saveChatRoles();

    var body = document.getElementById('chatConvBody');
    if (body) {
        var ap = getActivePersona();
        var myAv = ap && ap.avatar ? ap.avatar : '';
        var idx = role.msgs.length - 1;
        body.insertAdjacentHTML('beforeend', renderBubbleRow(msgObj, idx, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }
}

/* ---- 渲染表情包气泡 ---- */
function renderStickerBubbleRow(m, idx, myAv, roleAv) {
    var h = '';
    h += '<div class="chat-bubble-row ' + (m.from === 'self' ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">';
    if (m.from === 'self') h += myAv ? '<img src="' + myAv + '" alt="">' : SVG_USER_SM;
    else h += roleAv ? '<img src="' + roleAv + '" alt="">' : SVG_USER_SM;
    h += '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    h += '<div class="chat-bubble chat-bubble-sticker">';
    h += '<img src="' + m.stickerUrl + '" alt="表情包" class="stk-bubble-img">';
    h += '</div>';
    h += '<div class="chat-bubble-ts">' + (m.time || '') + '</div>';
    h += '</div></div>';
    return h;
}

/* ★ 获取当前对话角色挂载的表情包分组（已过滤，供面板使用） */
function _getMountedStickerGroups() {
    var mountedIds = [];
    // 从 chat.js 的全局变量取当前对话角色
    if (typeof _chatCurrentConv !== 'undefined' && _chatCurrentConv &&
        typeof _chatRoles !== 'undefined' && _chatRoles) {
        for (var i = 0; i < _chatRoles.length; i++) {
            if (_chatRoles[i].id === _chatCurrentConv) {
                mountedIds = _chatRoles[i].stickerIds || (_chatRoles[i].stickerId ? [_chatRoles[i].stickerId] : []);
                break;
            }
        }
    }
    // 没有挂载 → 返回空数组（面板显示"未挂载"提示）
    if (!mountedIds.length) return [];
    // 从 _stickerGroups 里过滤出挂载的
    return _stickerGroups.filter(function (g) {
        return mountedIds.indexOf(g.id) !== -1;
    });
}
