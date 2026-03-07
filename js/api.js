/* ============================================
   蛋薯机 DanShu Pro v2 — api.js
   API 设置内置 App（完整功能）
   ============================================ */

/* ========== 打开 / 关闭 ========== */
function openApiApp() {
    var overlay = document.getElementById('apiAppOverlay');
    if (!overlay) return;

    // 读取当前激活的预设并填入表单
    var activeId = localStorage.getItem('ds_api_active');
    if (activeId) {
        var presets = getApiPresets();
        var active = null;
        for (var i = 0; i < presets.length; i++) {
            if (presets[i].id === activeId) { active = presets[i]; break; }
        }
        if (active) {
            fillFormFromPreset(active);
        }
    }

    renderPresetList();
    overlay.classList.add('show');
}

function closeApiApp() {
    var overlay = document.getElementById('apiAppOverlay');
    if (overlay) overlay.classList.remove('show');
    // 清除编辑状态
    window._apiEditingId = null;
}

/* ========== 预设数据存取 ========== */
function getApiPresets() {
    try {
        var raw = localStorage.getItem('ds_api_presets');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function saveApiPresets(list) {
    try {
        localStorage.setItem('ds_api_presets', JSON.stringify(list));
    } catch (e) {
        showToast('存储空间不足');
    }
}

/* ========== 填充表单 ========== */
function fillFormFromPreset(preset) {
    document.getElementById('apiName').value = preset.name || '';
    document.getElementById('apiUrl').value = preset.url || '';
    document.getElementById('apiKey').value = preset.key || '';

    var sel = document.getElementById('apiModelSelect');
    sel.innerHTML = '';

    if (preset.models && preset.models.length > 0) {
        for (var i = 0; i < preset.models.length; i++) {
            var opt = document.createElement('option');
            opt.value = preset.models[i];
            opt.textContent = preset.models[i];
            sel.appendChild(opt);
        }
        sel.value = preset.selectedModel || preset.models[0];
    } else {
        var defOpt = document.createElement('option');
        defOpt.value = '';
        defOpt.textContent = '-- 请先拉取模型 --';
        sel.appendChild(defOpt);
    }

    document.getElementById('apiModelStatus').textContent =
        preset.models && preset.models.length
            ? '已加载 ' + preset.models.length + ' 个模型'
            : '填写 URL 和 Key 后点击拉取';
}

/* ========== 拉取模型列表 ========== */
function fetchApiModels() {
    var url = document.getElementById('apiUrl').value.trim();
    var key = document.getElementById('apiKey').value.trim();
    var btn = document.getElementById('apiFetchBtn');
    var status = document.getElementById('apiModelStatus');

    if (!url) { showToast('请先填写 API URL'); return; }
    if (!key) { showToast('请先填写 API Key'); return; }

    // 构建 models 端点
    var modelsUrl = url.replace(/\/+$/, '') + '/models';

    btn.classList.add('loading');
    status.textContent = '正在拉取模型列表...';

    fetch(modelsUrl, {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + key
        }
    })
        .then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        })
        .then(function (json) {
            btn.classList.remove('loading');
            var models = [];

            // 兼容 OpenAI 格式
            if (json.data && Array.isArray(json.data)) {
                for (var i = 0; i < json.data.length; i++) {
                    var id = json.data[i].id || json.data[i].name;
                    if (id) models.push(id);
                }
            }
            // 兼容数组直接返回
            else if (Array.isArray(json)) {
                for (var j = 0; j < json.length; j++) {
                    var mid = typeof json[j] === 'string' ? json[j] : (json[j].id || json[j].name);
                    if (mid) models.push(mid);
                }
            }

            models.sort();

            if (models.length === 0) {
                status.textContent = '未找到可用模型';
                showToast('未找到模型数据');
                return;
            }

            // 填充 select
            var sel = document.getElementById('apiModelSelect');
            sel.innerHTML = '';
            for (var k = 0; k < models.length; k++) {
                var opt = document.createElement('option');
                opt.value = models[k];
                opt.textContent = models[k];
                sel.appendChild(opt);
            }

            // 缓存模型列表到临时变量
            window._apiFetchedModels = models;
            status.textContent = '成功拉取 ' + models.length + ' 个模型';
            showToast('拉取到 ' + models.length + ' 个模型');
        })
        .catch(function (err) {
            btn.classList.remove('loading');
            status.textContent = '拉取失败: ' + err.message;
            showToast('拉取失败');
        });
}

/* ========== 保存预设 ========== */
function saveApiPreset() {
    var name = document.getElementById('apiName').value.trim();
    var url = document.getElementById('apiUrl').value.trim();
    var key = document.getElementById('apiKey').value.trim();
    var sel = document.getElementById('apiModelSelect');
    var selectedModel = sel.value;

    if (!name) { showToast('请填写 API 名称'); return; }
    if (!url) { showToast('请填写 API URL'); return; }

    // 收集当前 select 里的所有模型
    var models = [];
    for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value) {
            models.push(sel.options[i].value);
        }
    }

    var presets = getApiPresets();
    var editingId = window._apiEditingId;

    if (editingId) {
        // 更新已有预设
        for (var j = 0; j < presets.length; j++) {
            if (presets[j].id === editingId) {
                presets[j].name = name;
                presets[j].url = url;
                presets[j].key = key;
                presets[j].models = models;
                presets[j].selectedModel = selectedModel;
                break;
            }
        }
        window._apiEditingId = null;
        showToast('预设已更新');
    } else {
        // 新建预设
        var preset = {
            id: 'api_' + Date.now(),
            name: name,
            url: url,
            key: key,
            models: models,
            selectedModel: selectedModel
        };
        presets.push(preset);
        showToast('预设已保存');
    }

    saveApiPresets(presets);

    // 如果没有激活项，自动激活新保存的
    var activeId = localStorage.getItem('ds_api_active');
    if (!activeId && presets.length > 0) {
        localStorage.setItem('ds_api_active', presets[presets.length - 1].id);
    }
    if (editingId) {
        localStorage.setItem('ds_api_active', editingId);
    }

    renderPresetList();
}

/* ========== 渲染预设列表 ========== */
function renderPresetList() {
    var container = document.getElementById('apiPresetList');
    var presets = getApiPresets();
    var activeId = localStorage.getItem('ds_api_active') || '';

    if (presets.length === 0) {
        container.innerHTML = '<div class="api-preset-empty">暂无预设，保存后将显示在这里</div>';
        return;
    }

    var html = '';
    for (var i = 0; i < presets.length; i++) {
        var p = presets[i];
        var isActive = p.id === activeId;

        html += '<div class="api-preset-card' + (isActive ? ' active' : '') + '" onclick="switchApiPreset(\'' + p.id + '\')">';
        html += '  <div class="api-preset-info">';
        html += '    <div class="api-preset-name">' + escapeHtml(p.name) + '</div>';
        html += '    <div class="api-preset-model">' + escapeHtml(p.selectedModel || '未选择模型') + '</div>';
        html += '  </div>';

        if (isActive) {
            html += '  <div class="api-preset-badge">使用中</div>';
        }

        html += '  <div class="api-preset-actions">';
        html += '    <div class="api-preset-action-btn" onclick="event.stopPropagation(); editApiPreset(\'' + p.id + '\')" title="编辑">';
        html += '      <svg viewBox="0 0 24 24" width="13" height="13"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
        html += '    </div>';
        html += '    <div class="api-preset-action-btn delete-btn" onclick="event.stopPropagation(); deleteApiPreset(\'' + p.id + '\')" title="删除">';
        html += '      <svg viewBox="0 0 24 24" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }

    container.innerHTML = html;
}

/* ========== 切换预设 ========== */
function switchApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    localStorage.setItem('ds_api_active', id);
    fillFormFromPreset(target);
    window._apiEditingId = null;
    renderPresetList();
    showToast('已切换: ' + target.name);
}

/* ========== 编辑预设 ========== */
function editApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    fillFormFromPreset(target);
    window._apiEditingId = id;

    // 滚动到顶部
    var body = document.querySelector('.api-app-body');
    if (body) body.scrollTop = 0;

    showToast('正在编辑: ' + target.name);
}

/* ========== 删除预设 ========== */
function deleteApiPreset(id) {
    var presets = getApiPresets();
    var target = null;
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === id) { target = presets[i]; break; }
    }
    if (!target) return;

    if (!confirm('确认删除预设「' + target.name + '」？')) return;

    var newList = [];
    for (var j = 0; j < presets.length; j++) {
        if (presets[j].id !== id) newList.push(presets[j]);
    }
    saveApiPresets(newList);

    // 如果删的是当前激活的，清除激活状态
    if (localStorage.getItem('ds_api_active') === id) {
        localStorage.removeItem('ds_api_active');
        // 如果还有其他预设，自动激活第一个
        if (newList.length > 0) {
            localStorage.setItem('ds_api_active', newList[0].id);
            fillFormFromPreset(newList[0]);
        } else {
            // 清空表单
            document.getElementById('apiName').value = '';
            document.getElementById('apiUrl').value = '';
            document.getElementById('apiKey').value = '';
            document.getElementById('apiModelSelect').innerHTML = '<option value="">-- 请先拉取模型 --</option>';
            document.getElementById('apiModelStatus').textContent = '填写 URL 和 Key 后点击拉取';
        }
    }

    if (window._apiEditingId === id) {
        window._apiEditingId = null;
    }

    renderPresetList();
    showToast('已删除: ' + target.name);
}


/* ========== 导出备份（全部数据） ========== */
function exportApiData() {
    // 收集所有 ds_ 开头的 localStorage 数据
    var allData = {};
    var keyCount = 0;
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key && key.indexOf('ds_') === 0) {
            var raw = localStorage.getItem(key);
            // 尝试解析 JSON，否则保留原始字符串
            try {
                allData[key] = JSON.parse(raw);
            } catch (e) {
                allData[key] = raw;
            }
            keyCount++;
        }
    }

    if (keyCount === 0) {
        showToast('暂无数据可备份');
        return;
    }

    var data = {
        _format: 'danshu_full_backup',
        _version: 2,
        _exportTime: new Date().toISOString(),
        _keyCount: keyCount,
        data: allData
    };

    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'danshu_full_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('全量备份已下载（' + keyCount + ' 项数据）');
}
/* ========== 导入数据 ========== */
function importApiData() {
    document.getElementById('apiImportFile').click();
}

function handleApiImport(event) {
    var file = event.target.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            var data = JSON.parse(e.target.result);
            var importedCount = 0;
            var summary = [];

            // ====== 格式1：蛋薯机全量备份（v2，exportApiData 导出的） ======
            if (data._format === 'danshu_full_backup' && data.data) {
                if (!confirm('检测到蛋薯机全量备份（' + (data._keyCount || '?') + ' 项数据）。\n\n点"确定"覆盖导入，点"取消"放弃。')) {
                    event.target.value = ''; return;
                }
                var keys = Object.keys(data.data);
                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    var v = data.data[k];
                    try {
                        if (typeof v === 'string') {
                            localStorage.setItem(k, v);
                        } else {
                            localStorage.setItem(k, JSON.stringify(v));
                        }
                        importedCount++;
                    } catch (ex) { /* 忽略单条写入失败 */ }
                }
                summary.push('全量恢复 ' + importedCount + ' 项');
                afterImportRefresh(summary);
                event.target.value = ''; return;
            }

            // ====== 格式2：蛋薯机旧版API备份（v1，含 presets 数组 + activeId） ======
            if (data.presets && Array.isArray(data.presets) && data.presets.length > 0 && data.presets[0].url) {
                var existing = getApiPresets();
                for (var j = 0; j < data.presets.length; j++) {
                    data.presets[j].id = data.presets[j].id || ('api_' + Date.now() + '_' + j);
                    existing.push(data.presets[j]);
                }
                saveApiPresets(existing);
                if (data.activeId) localStorage.setItem('ds_api_active', data.activeId);
                importedCount += data.presets.length;
                summary.push('API预设 ' + data.presets.length + ' 个');
            }

            // ====== 格式3：尝试识别角色卡数据 ======
            // 3a：直接是一个角色对象（有 name + 某些角色字段）
            var roleCards = [];
            if (isLikelyRoleCard(data)) {
                roleCards.push(data);
            }
            // 3b：是角色数组
            else if (Array.isArray(data)) {
                for (var m = 0; m < data.length; m++) {
                    if (isLikelyRoleCard(data[m])) roleCards.push(data[m]);
                }
            }
            // 3c：包裹在某个字段里（如 data.roles / data.characters / data.cards）
            else {
                var possibleArrayKeys = ['roles', 'characters', 'cards', 'chat_roles', 'data'];
                for (var p = 0; p < possibleArrayKeys.length; p++) {
                    var arr = data[possibleArrayKeys[p]];
                    if (Array.isArray(arr)) {
                        for (var q = 0; q < arr.length; q++) {
                            if (isLikelyRoleCard(arr[q])) roleCards.push(arr[q]);
                        }
                    }
                }
            }

            if (roleCards.length > 0) {
                var existingRoles = [];
                try { existingRoles = JSON.parse(localStorage.getItem('ds_chat_roles') || '[]'); } catch (ex) { existingRoles = []; }
                for (var n = 0; n < roleCards.length; n++) {
                    var card = normalizeRoleCard(roleCards[n]);
                    existingRoles.push(card);
                }
                try { localStorage.setItem('ds_chat_roles', JSON.stringify(existingRoles)); } catch (ex) { }
                importedCount += roleCards.length;
                summary.push('角色卡 ' + roleCards.length + ' 个');
            }

            // ====== 格式4：尝试识别人设数据 ======
            var personas = [];
            var personaKeys = ['personas', 'chat_personas'];
            for (var pk = 0; pk < personaKeys.length; pk++) {
                var pArr = data[personaKeys[pk]];
                if (Array.isArray(pArr)) {
                    for (var pi = 0; pi < pArr.length; pi++) {
                        if (pArr[pi] && (pArr[pi].name || pArr[pi].nickname)) personas.push(pArr[pi]);
                    }
                }
            }
            if (personas.length > 0) {
                var existingPersonas = [];
                try { existingPersonas = JSON.parse(localStorage.getItem('ds_chat_personas') || '[]'); } catch (ex) { existingPersonas = []; }
                for (var pe = 0; pe < personas.length; pe++) {
                    var ps = personas[pe];
                    if (!ps.id) ps.id = 'p' + Date.now() + Math.random().toString(36).substr(2, 5);
                    existingPersonas.push(ps);
                }
                try { localStorage.setItem('ds_chat_personas', JSON.stringify(existingPersonas)); } catch (ex) { }
                importedCount += personas.length;
                summary.push('人设 ' + personas.length + ' 个');
            }

            // ====== 格式5：尝试识别世界书数据 ======
            var worldbooks = [];
            var wbKeys = ['worldbooks', 'world_books', 'lorebooks', 'entries'];
            for (var wk = 0; wk < wbKeys.length; wk++) {
                var wArr = data[wbKeys[wk]];
                if (Array.isArray(wArr)) {
                    for (var wi = 0; wi < wArr.length; wi++) {
                        if (wArr[wi] && (wArr[wi].name || wArr[wi].title || wArr[wi].keyword)) worldbooks.push(wArr[wi]);
                    }
                }
            }
            if (worldbooks.length > 0) {
                var existingWB = [];
                try { existingWB = JSON.parse(localStorage.getItem('ds_chat_worldbooks') || '[]'); } catch (ex) { existingWB = []; }
                for (var we = 0; we < worldbooks.length; we++) {
                    var wb = worldbooks[we];
                    if (!wb.id) wb.id = 'wb' + Date.now() + Math.random().toString(36).substr(2, 5);
                    existingWB.push(wb);
                }
                try { localStorage.setItem('ds_chat_worldbooks', JSON.stringify(existingWB)); } catch (ex) { }
                importedCount += worldbooks.length;
                summary.push('世界书 ' + worldbooks.length + ' 个');
            }

            // ====== 格式6：尝试识别贴纸数据 ======
            var stickers = data.stickers || data.sticker_packs;
            if (Array.isArray(stickers) && stickers.length > 0) {
                var existingSt = [];
                try { existingSt = JSON.parse(localStorage.getItem('ds_chat_stickers') || '[]'); } catch (ex) { existingSt = []; }
                for (var si = 0; si < stickers.length; si++) {
                    var st = stickers[si];
                    if (!st.id) st.id = 'stk' + Date.now() + Math.random().toString(36).substr(2, 5);
                    existingSt.push(st);
                }
                try { localStorage.setItem('ds_chat_stickers', JSON.stringify(existingSt)); } catch (ex) { }
                importedCount += stickers.length;
                summary.push('贴纸包 ' + stickers.length + ' 个');
            }

            // ====== 格式7：兜底 — 扫描所有 ds_ 开头的键直接写入 ======
            if (importedCount === 0) {
                var dsKeys = Object.keys(data);
                var dsWritten = 0;
                for (var di = 0; di < dsKeys.length; di++) {
                    if (dsKeys[di].indexOf('ds_') === 0) {
                        try {
                            var val = data[dsKeys[di]];
                            localStorage.setItem(dsKeys[di], typeof val === 'string' ? val : JSON.stringify(val));
                            dsWritten++;
                        } catch (ex) { }
                    }
                }
                if (dsWritten > 0) {
                    importedCount += dsWritten;
                    summary.push('原始数据键 ' + dsWritten + ' 个');
                }
            }

            // ====== 结果报告 ======
            if (importedCount === 0) {
                showToast('未能从文件中识别出任何可导入的数据');
            } else {
                afterImportRefresh(summary);
            }

        } catch (err) {
            showToast('导入失败：文件不是有效的 JSON 格式');
            console.error('[导入错误]', err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

/* ---- 判断一个对象是否像角色卡 ---- */
function isLikelyRoleCard(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    // 蛋薯机自己的角色
    if (obj.name && (obj.sysPrompt || obj.system_prompt || obj.greeting || obj.firstMsg || obj.first_mes || obj.description || obj.personality || obj.msgs)) return true;
    // SillyTavern / TavernAI 格式
    if (obj.char_name || obj.character_name) return true;
    if (obj.data && obj.data.name && (obj.data.description || obj.data.personality || obj.data.first_mes)) return true;
    // 其他常见格式
    if (obj.name && obj.scenario) return true;
    return false;
}

/* ---- 将外部角色卡格式归一化为蛋薯机格式 ---- */
function normalizeRoleCard(card) {
    // 如果是 TavernAI v2 格式（data 包裹）
    var src = card.data ? card.data : card;

    var role = {
        id: card.id || ('r' + Date.now() + Math.random().toString(36).substr(2, 5)),
        name: src.name || src.char_name || src.character_name || '未命名角色',
        nickname: src.nickname || '',
        avatar: card.avatar || src.avatar || '',
        sysPrompt: src.sysPrompt || src.system_prompt || src.description || '',
        greeting: src.greeting || src.firstMsg || src.first_mes || src.first_message || '',
        personality: src.personality || '',
        scenario: src.scenario || '',
        exampleDialogue: src.exampleDialogue || src.mes_example || src.example_dialogue || '',
        msgs: card.msgs || [],
        lastMsg: card.lastMsg || '',
        lastTime: card.lastTime || Date.now(),
        lastTimeStr: card.lastTimeStr || '',
        boundPersonaId: card.boundPersonaId || '',
        mountWorldBook: card.mountWorldBook || [],
        mountSticker: card.mountSticker || []
    };

    // 如果有 greeting 但 msgs 为空，自动插入首条消息
    if (role.greeting && (!role.msgs || role.msgs.length === 0)) {
        var now = new Date();
        role.msgs = [{
            from: 'other',
            text: role.greeting,
            time: (now.getHours() < 10 ? '0' : '') + now.getHours() + ':' + (now.getMinutes() < 10 ? '0' : '') + now.getMinutes()
        }];
        role.lastMsg = role.greeting.substring(0, 30);
    }

    return role;
}

/* ---- 导入后刷新各个页面 ---- */
function afterImportRefresh(summary) {
    // 重新加载内存中的数据
    if (typeof loadChatRoles === 'function') loadChatRoles();

    // 刷新API预设列表
    if (typeof renderPresetList === 'function') renderPresetList();

    // 如果有激活预设，填充表单
    var activeId = localStorage.getItem('ds_api_active');
    if (activeId) {
        var presets = getApiPresets();
        for (var i = 0; i < presets.length; i++) {
            if (presets[i].id === activeId) {
                fillFormFromPreset(presets[i]);
                break;
            }
        }
    }

    var msg = '导入成功！\n' + summary.join('，');
    showToast(msg);
    console.log('[导入完成]', summary.join(', '));
}

/* ========== HTML 转义工具 ========== */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ========== 获取当前激活的 API 配置（供其他模块调用） ========== */
function getActiveApiConfig() {
    var activeId = localStorage.getItem('ds_api_active');
    if (!activeId) return null;

    var presets = getApiPresets();
    for (var i = 0; i < presets.length; i++) {
        if (presets[i].id === activeId) {
            return {
                name: presets[i].name,
                url: presets[i].url,
                key: presets[i].key,
                model: presets[i].selectedModel
            };
        }
    }
    return null;
}
/* ========== 修复移动端 input 无法输入 / 粘贴 ========== */
(function () {
    // 阻止手机模拟器外壳拦截 input/select/textarea 的触摸事件
    document.addEventListener('touchstart', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true); // ← 捕获阶段，优先于外壳的事件处理

    document.addEventListener('touchmove', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true);

    document.addEventListener('touchend', function (e) {
        var tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
            e.stopPropagation();
        }
    }, true);
})();
