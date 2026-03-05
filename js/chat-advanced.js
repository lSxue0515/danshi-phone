/* ============================================
   chat-advanced.js
   消息APP 聊天设置 - 记忆总结 & 时间感知
   ============================================ */

(function () {
    'use strict';

    // ==========================================
    // 1. 全球时区数据库
    // ==========================================
    var TIMEZONE_DATA = [
        { flag: '🇨🇳', name: '中国', nameEn: 'China', tz: 'Asia/Shanghai', utc: '+8', label: 'UTC+8 北京时间' },
        { flag: '🇯🇵', name: '日本', nameEn: 'Japan', tz: 'Asia/Tokyo', utc: '+9', label: 'UTC+9 日本标准时间' },
        { flag: '🇰🇷', name: '韩国', nameEn: 'Korea', tz: 'Asia/Seoul', utc: '+9', label: 'UTC+9 韩国标准时间' },
        { flag: '🇺🇸', name: '美国(东部)', nameEn: 'USA Eastern', tz: 'America/New_York', utc: '-5/-4', label: 'UTC-5 美东时间' },
        { flag: '🇺🇸', name: '美国(西部)', nameEn: 'USA Pacific', tz: 'America/Los_Angeles', utc: '-8/-7', label: 'UTC-8 美西时间' },
        { flag: '🇺🇸', name: '美国(中部)', nameEn: 'USA Central', tz: 'America/Chicago', utc: '-6/-5', label: 'UTC-6 美中时间' },
        { flag: '🇬🇧', name: '英国', nameEn: 'UK', tz: 'Europe/London', utc: '0/+1', label: 'UTC+0 格林威治时间' },
        { flag: '🇫🇷', name: '法国', nameEn: 'France', tz: 'Europe/Paris', utc: '+1/+2', label: 'UTC+1 中欧时间' },
        { flag: '🇩🇪', name: '德国', nameEn: 'Germany', tz: 'Europe/Berlin', utc: '+1/+2', label: 'UTC+1 中欧时间' },
        { flag: '🇮🇹', name: '意大利', nameEn: 'Italy', tz: 'Europe/Rome', utc: '+1/+2', label: 'UTC+1 中欧时间' },
        { flag: '🇪🇸', name: '西班牙', nameEn: 'Spain', tz: 'Europe/Madrid', utc: '+1/+2', label: 'UTC+1 中欧时间' },
        { flag: '🇷🇺', name: '俄罗斯(莫斯科)', nameEn: 'Russia Moscow', tz: 'Europe/Moscow', utc: '+3', label: 'UTC+3 莫斯科时间' },
        { flag: '🇦🇺', name: '澳大利亚(悉尼)', nameEn: 'Australia Sydney', tz: 'Australia/Sydney', utc: '+10/+11', label: 'UTC+10 澳东时间' },
        { flag: '🇳🇿', name: '新西兰', nameEn: 'New Zealand', tz: 'Pacific/Auckland', utc: '+12/+13', label: 'UTC+12 新西兰时间' },
        { flag: '🇮🇳', name: '印度', nameEn: 'India', tz: 'Asia/Kolkata', utc: '+5:30', label: 'UTC+5:30 印度时间' },
        { flag: '🇹🇭', name: '泰国', nameEn: 'Thailand', tz: 'Asia/Bangkok', utc: '+7', label: 'UTC+7 印度支那时间' },
        { flag: '🇻🇳', name: '越南', nameEn: 'Vietnam', tz: 'Asia/Ho_Chi_Minh', utc: '+7', label: 'UTC+7 印度支那时间' },
        { flag: '🇸🇬', name: '新加坡', nameEn: 'Singapore', tz: 'Asia/Singapore', utc: '+8', label: 'UTC+8 新加坡时间' },
        { flag: '🇲🇾', name: '马来西亚', nameEn: 'Malaysia', tz: 'Asia/Kuala_Lumpur', utc: '+8', label: 'UTC+8 马来西亚时间' },
        { flag: '🇵🇭', name: '菲律宾', nameEn: 'Philippines', tz: 'Asia/Manila', utc: '+8', label: 'UTC+8 菲律宾时间' },
        { flag: '🇮🇩', name: '印度尼西亚(雅加达)', nameEn: 'Indonesia', tz: 'Asia/Jakarta', utc: '+7', label: 'UTC+7 西印尼时间' },
        { flag: '🇦🇪', name: '阿联酋', nameEn: 'UAE', tz: 'Asia/Dubai', utc: '+4', label: 'UTC+4 海湾标准时间' },
        { flag: '🇸🇦', name: '沙特阿拉伯', nameEn: 'Saudi Arabia', tz: 'Asia/Riyadh', utc: '+3', label: 'UTC+3 阿拉伯时间' },
        { flag: '🇹🇷', name: '土耳其', nameEn: 'Turkey', tz: 'Europe/Istanbul', utc: '+3', label: 'UTC+3 土耳其时间' },
        { flag: '🇪🇬', name: '埃及', nameEn: 'Egypt', tz: 'Africa/Cairo', utc: '+2', label: 'UTC+2 东欧时间' },
        { flag: '🇿🇦', name: '南非', nameEn: 'South Africa', tz: 'Africa/Johannesburg', utc: '+2', label: 'UTC+2 南非时间' },
        { flag: '🇧🇷', name: '巴西(圣保罗)', nameEn: 'Brazil', tz: 'America/Sao_Paulo', utc: '-3', label: 'UTC-3 巴西利亚时间' },
        { flag: '🇲🇽', name: '墨西哥', nameEn: 'Mexico', tz: 'America/Mexico_City', utc: '-6/-5', label: 'UTC-6 墨西哥城时间' },
        { flag: '🇨🇦', name: '加拿大(多伦多)', nameEn: 'Canada', tz: 'America/Toronto', utc: '-5/-4', label: 'UTC-5 加东时间' },
        { flag: '🇭🇰', name: '中国香港', nameEn: 'Hong Kong', tz: 'Asia/Hong_Kong', utc: '+8', label: 'UTC+8 香港时间' },
        { flag: '🇹🇼', name: '中国台湾', nameEn: 'Taiwan', tz: 'Asia/Taipei', utc: '+8', label: 'UTC+8 台北时间' },
    ];

    // ==========================================
    // 2. 存储 Key
    // ==========================================
    var STORAGE_KEYS = {
        memoryEnabled: 'danshu_memory_enabled',
        memorySummaries: 'danshu_memory_summaries',
        memoryMsgCount: 'danshu_memory_msg_count',
        timeEnabled: 'danshu_time_enabled',
        timeZone: 'danshu_time_zone',
    };

    // ==========================================
    // 3. 状态管理
    // ==========================================
    var state = {
        memoryEnabled: loadBool(STORAGE_KEYS.memoryEnabled, false),
        memorySummaries: loadJSON(STORAGE_KEYS.memorySummaries, []),
        memoryMsgCount: loadInt(STORAGE_KEYS.memoryMsgCount, 0),
        timeEnabled: loadBool(STORAGE_KEYS.timeEnabled, false),
        timeZone: loadString(STORAGE_KEYS.timeZone, 'Asia/Shanghai'),
        clockTimer: null,
    };

    // ==========================================
    // 4. 工具函数
    // ==========================================
    function loadBool(key, def) { var v = localStorage.getItem(key); return v !== null ? v === 'true' : def; }
    function loadJSON(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
    function loadInt(key, def) { var v = localStorage.getItem(key); return v !== null ? parseInt(v, 10) : def; }
    function loadString(key, def) { return localStorage.getItem(key) || def; }
    function saveBool(key, v) { localStorage.setItem(key, v ? 'true' : 'false'); }
    function saveJSON(key, v) { localStorage.setItem(key, JSON.stringify(v)); }
    function saveInt(key, v) { localStorage.setItem(key, v.toString()); }
    function saveString(key, v) { localStorage.setItem(key, v); }

    function getTimezoneInfo(tzId) {
        for (var i = 0; i < TIMEZONE_DATA.length; i++) {
            if (TIMEZONE_DATA[i].tz === tzId) return TIMEZONE_DATA[i];
        }
        return TIMEZONE_DATA[0]; // 默认中国
    }

    function formatTimeInZone(tzId) {
        var now = new Date();
        try {
            return now.toLocaleTimeString('zh-CN', {
                timeZone: tzId,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
        } catch (e) {
            return now.toLocaleTimeString('zh-CN', { hour12: false });
        }
    }

    function formatDateInZone(tzId) {
        var now = new Date();
        try {
            return now.toLocaleDateString('zh-CN', {
                timeZone: tzId,
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long'
            });
        } catch (e) {
            return now.toLocaleDateString('zh-CN');
        }
    }

    function getTimeOfDay(tzId) {
        var now = new Date();
        var hour;
        try {
            var timeStr = now.toLocaleTimeString('en-US', {
                timeZone: tzId,
                hour: 'numeric',
                hour12: false
            });
            hour = parseInt(timeStr, 10);
        } catch (e) {
            hour = now.getHours();
        }

        if (hour >= 5 && hour < 8) return { period: '清晨', emoji: '🌅' };
        if (hour >= 8 && hour < 11) return { period: '上午', emoji: '☀️' };
        if (hour >= 11 && hour < 13) return { period: '中午', emoji: '🌤️' };
        if (hour >= 13 && hour < 17) return { period: '下午', emoji: '⛅' };
        if (hour >= 17 && hour < 19) return { period: '傍晚', emoji: '🌇' };
        if (hour >= 19 && hour < 22) return { period: '晚上', emoji: '🌙' };
        return { period: '深夜', emoji: '🌃' };
    }

    // ==========================================
    // 5. 构建设置 HTML
    // ==========================================
    function buildAdvancedSettingsHTML() {
        var tzInfo = getTimezoneInfo(state.timeZone);

        var html = '';

        // --- 记忆总结区块 ---
        html += '<div class="chat-adv-section">';
        html += '<div class="chat-adv-section-title">🧠 智能记忆</div>';
        html += '<div class="chat-adv-row">';
        html += '<div class="chat-adv-row-left">';
        html += '<div class="chat-adv-row-icon memory">🧠</div>';
        html += '<div class="chat-adv-row-info">';
        html += '<div class="chat-adv-row-name">记忆总结</div>';
        html += '<div class="chat-adv-row-desc">每20条消息自动总结对话记忆</div>';
        html += '</div>';
        html += '</div>';
        html += '<label class="chat-adv-toggle">';
        html += '<input type="checkbox" id="memoryToggle"' + (state.memoryEnabled ? ' checked' : '') + '>';
        html += '<span class="chat-adv-toggle-slider"></span>';
        html += '</label>';
        html += '</div>';

        // 记忆面板
        html += '<div class="memory-panel' + (state.memoryEnabled ? ' active' : '') + '" id="memoryPanel">';
        html += buildMemoryPanelInner();
        html += '</div>';

        html += '</div>';

        // --- 时间感知区块 ---
        html += '<div class="chat-adv-section">';
        html += '<div class="chat-adv-section-title">⏰ 时间感知</div>';
        html += '<div class="chat-adv-row">';
        html += '<div class="chat-adv-row-left">';
        html += '<div class="chat-adv-row-icon time">🕐</div>';
        html += '<div class="chat-adv-row-info">';
        html += '<div class="chat-adv-row-name">时间感知</div>';
        html += '<div class="chat-adv-row-desc">AI将同步所选地区的真实时间</div>';
        html += '</div>';
        html += '</div>';
        html += '<label class="chat-adv-toggle">';
        html += '<input type="checkbox" id="timeToggle"' + (state.timeEnabled ? ' checked' : '') + '>';
        html += '<span class="chat-adv-toggle-slider"></span>';
        html += '</label>';
        html += '</div>';

        // 时间面板
        html += '<div class="time-panel' + (state.timeEnabled ? ' active' : '') + '" id="timePanel">';
        html += buildTimePanelInner(tzInfo);
        html += '</div>';

        html += '</div>';

        return html;
    }

    function buildMemoryPanelInner() {
        var html = '';
        var progress = state.memoryMsgCount % 20;
        var pct = Math.round((progress / 20) * 100);

        // 状态卡片
        html += '<div class="memory-status-card">';
        html += '<div class="memory-status-header">';
        html += '<span class="memory-status-label">记忆状态</span>';
        html += '<span class="memory-status-badge ' + (state.memoryEnabled ? 'active' : 'idle') + '">';
        html += state.memoryEnabled ? '● 运行中' : '○ 未启用';
        html += '</span>';
        html += '</div>';
        html += '<div class="memory-progress-wrap">';
        html += '<div class="memory-progress-info">';
        html += '<span class="memory-progress-text">距下次总结</span>';
        html += '<span class="memory-progress-count">' + progress + ' / 20 条</span>';
        html += '</div>';
        html += '<div class="memory-progress-bar">';
        html += '<div class="memory-progress-fill" style="width:' + pct + '%"></div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';

        // 已有总结列表
        html += '<div class="memory-summaries">';
        html += '<div class="memory-summaries-title">📋 记忆存档 (' + state.memorySummaries.length + ')</div>';

        if (state.memorySummaries.length === 0) {
            html += '<div class="memory-empty">';
            html += '<div class="memory-empty-icon">📭</div>';
            html += '<div>暂无记忆总结</div>';
            html += '<div style="margin-top:3px;font-size:9.5px;">对话20条后将自动生成</div>';
            html += '</div>';
        } else {
            // 最新的在前
            var list = state.memorySummaries.slice().reverse();
            for (var i = 0; i < list.length; i++) {
                html += '<div class="memory-summary-item" data-idx="' + (state.memorySummaries.length - 1 - i) + '">';
                html += '<div class="memory-summary-time">' + list[i].time + '</div>';
                html += '<div class="memory-summary-text">' + escapeHtml(list[i].text) + '</div>';
                html += '<button class="memory-summary-delete" data-idx="' + (state.memorySummaries.length - 1 - i) + '">✕</button>';
                html += '</div>';
            }
        }
        html += '</div>';

        // 手动总结按钮
        html += '<button class="memory-manual-btn" id="memoryManualBtn">✦ 立即手动总结</button>';

        return html;
    }

    function buildTimePanelInner(tzInfo) {
        var tod = getTimeOfDay(state.timeZone);
        var html = '';

        // 时钟展示卡片
        html += '<div class="time-display-card">';
        html += '<div class="time-display-zone">' + tod.emoji + ' ' + tzInfo.flag + ' ' + tzInfo.name + '</div>';
        html += '<div class="time-display-clock" id="timeDisplayClock">' + formatTimeInZone(state.timeZone) + '</div>';
        html += '<div class="time-display-date" id="timeDisplayDate">' + formatDateInZone(state.timeZone) + '</div>';
        html += '<div class="time-display-offset">' + tzInfo.label + '</div>';
        html += '</div>';

        // 国家选择器
        html += '<div class="time-country-select">';
        html += '<div class="time-country-header" id="timeCountryHeader">';
        html += '<div class="time-country-header-left">';
        html += '<span class="time-country-flag">' + tzInfo.flag + '</span>';
        html += '<div>';
        html += '<div class="time-country-name">' + tzInfo.name + '</div>';
        html += '<div class="time-country-tz">' + tzInfo.label + '</div>';
        html += '</div>';
        html += '</div>';
        html += '<span class="time-country-arrow" id="timeCountryArrow">▼</span>';
        html += '</div>';

        // 下拉列表
        html += '<div class="time-country-list" id="timeCountryList">';
        html += '<div class="time-country-search">';
        html += '<input type="text" id="timeCountrySearchInput" placeholder="搜索国家或地区...">';
        html += '</div>';
        html += '<div id="timeCountryOptions">';
        html += buildCountryOptions('');
        html += '</div>';
        html += '</div>';

        html += '</div>';

        // AI提示
        html += '<div class="time-ai-hint">';
        html += '<span class="time-ai-hint-icon">💡</span>';
        html += '<span class="time-ai-hint-text">';
        html += '开启后，AI（角色）将知晓并严格遵守所选地区的真实时间。';
        html += '例如选择日本，角色会按照日本标准时间（UTC+9）来感知当前时刻。';
        html += '时间会自动同步现实世界，无需手动设置。';
        html += '</span>';
        html += '</div>';

        return html;
    }

    function buildCountryOptions(filter) {
        var html = '';
        var f = filter.toLowerCase();
        for (var i = 0; i < TIMEZONE_DATA.length; i++) {
            var tz = TIMEZONE_DATA[i];
            if (f && tz.name.toLowerCase().indexOf(f) === -1 &&
                tz.nameEn.toLowerCase().indexOf(f) === -1 &&
                tz.tz.toLowerCase().indexOf(f) === -1) {
                continue;
            }
            var selected = tz.tz === state.timeZone ? ' selected' : '';
            html += '<div class="time-country-option' + selected + '" data-tz="' + tz.tz + '">';
            html += '<span class="time-country-option-flag">' + tz.flag + '</span>';
            html += '<div class="time-country-option-info">';
            html += '<div class="time-country-option-name">' + tz.name + '</div>';
            html += '<div class="time-country-option-zone">' + tz.label + '</div>';
            html += '</div>';
            html += '<span class="time-country-option-check">✓</span>';
            html += '</div>';
        }
        if (!html) {
            html = '<div style="padding:16px;text-align:center;font-size:11px;color:rgba(140,130,115,.35);">没有找到匹配的国家</div>';
        }
        return html;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ==========================================
    // 6. 渲染 & 绑定事件
    // ==========================================
    var _container = null;

    /**
     * 渲染高级设置到指定容器
     * @param {HTMLElement|string} container - 容器元素或选择器
     */
    function renderAdvancedSettings(container) {
        if (typeof container === 'string') {
            container = document.querySelector(container);
        }
        if (!container) return;

        _container = container;
        container.innerHTML = buildAdvancedSettingsHTML();
        bindEvents(container);

        if (state.timeEnabled) {
            startClock();
        }
    }

    function bindEvents(container) {
        // -- 记忆开关 --
        var memToggle = container.querySelector('#memoryToggle');
        if (memToggle) {
            memToggle.addEventListener('change', function () {
                state.memoryEnabled = this.checked;
                saveBool(STORAGE_KEYS.memoryEnabled, state.memoryEnabled);
                var panel = container.querySelector('#memoryPanel');
                if (panel) {
                    if (state.memoryEnabled) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                }
                refreshMemoryPanel();
            });
        }

        // -- 时间感知开关 --
        var timeToggle = container.querySelector('#timeToggle');
        if (timeToggle) {
            timeToggle.addEventListener('change', function () {
                state.timeEnabled = this.checked;
                saveBool(STORAGE_KEYS.timeEnabled, state.timeEnabled);
                var panel = container.querySelector('#timePanel');
                if (panel) {
                    if (state.timeEnabled) {
                        panel.classList.add('active');
                        startClock();
                    } else {
                        panel.classList.remove('active');
                        stopClock();
                    }
                }
            });
        }

        // -- 手动总结按钮 --
        bindMemoryManualBtn(container);

        // -- 删除总结 --
        bindDeleteBtns(container);

        // -- 国家选择器展开/收起 --
        var countryHeader = container.querySelector('#timeCountryHeader');
        if (countryHeader) {
            countryHeader.addEventListener('click', function () {
                var list = container.querySelector('#timeCountryList');
                var arrow = container.querySelector('#timeCountryArrow');
                if (list) list.classList.toggle('open');
                if (arrow) arrow.classList.toggle('open');
            });
        }

        // -- 国家搜索 --
        var searchInput = container.querySelector('#timeCountrySearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function () {
                var opts = container.querySelector('#timeCountryOptions');
                if (opts) {
                    opts.innerHTML = buildCountryOptions(this.value);
                    bindCountryOptionClicks(container);
                }
            });
        }

        // -- 国家选项点击 --
        bindCountryOptionClicks(container);
    }

    function bindMemoryManualBtn(container) {
        var btn = container.querySelector('#memoryManualBtn');
        if (btn) {
            btn.addEventListener('click', function () {
                triggerManualSummary();
            });
        }
    }

    function bindDeleteBtns(container) {
        var btns = container.querySelectorAll('.memory-summary-delete');
        btns.forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var idx = parseInt(this.getAttribute('data-idx'), 10);
                if (!isNaN(idx) && idx >= 0 && idx < state.memorySummaries.length) {
                    state.memorySummaries.splice(idx, 1);
                    saveJSON(STORAGE_KEYS.memorySummaries, state.memorySummaries);
                    refreshMemoryPanel();
                }
            });
        });
    }

    function bindCountryOptionClicks(container) {
        var opts = container.querySelectorAll('.time-country-option');
        opts.forEach(function (opt) {
            opt.addEventListener('click', function () {
                var tz = this.getAttribute('data-tz');
                if (!tz) return;

                state.timeZone = tz;
                saveString(STORAGE_KEYS.timeZone, tz);

                // 关闭下拉
                var list = container.querySelector('#timeCountryList');
                var arrow = container.querySelector('#timeCountryArrow');
                if (list) list.classList.remove('open');
                if (arrow) arrow.classList.remove('open');

                // 刷新整个时间面板
                refreshTimePanel();
            });
        });
    }

    function refreshMemoryPanel() {
        if (!_container) return;
        var panel = _container.querySelector('#memoryPanel');
        if (panel) {
            panel.innerHTML = buildMemoryPanelInner();
            bindMemoryManualBtn(_container);
            bindDeleteBtns(_container);
        }
    }

    function refreshTimePanel() {
        if (!_container) return;
        var tzInfo = getTimezoneInfo(state.timeZone);
        var panel = _container.querySelector('#timePanel');
        if (panel) {
            panel.innerHTML = buildTimePanelInner(tzInfo);
            bindEvents(_container); // 重新绑定
            if (state.timeEnabled) startClock();
        }

        // 更新国家选择器头部
        var header = _container.querySelector('#timeCountryHeader');
        if (header) {
            var left = header.querySelector('.time-country-header-left');
            if (left) {
                left.innerHTML =
                    '<span class="time-country-flag">' + tzInfo.flag + '</span>' +
                    '<div>' +
                    '<div class="time-country-name">' + tzInfo.name + '</div>' +
                    '<div class="time-country-tz">' + tzInfo.label + '</div>' +
                    '</div>';
            }
        }
    }

    // ==========================================
    // 7. 实时时钟
    // ==========================================
    function startClock() {
        stopClock();
        updateClockDisplay();
        state.clockTimer = setInterval(updateClockDisplay, 1000);
    }

    function stopClock() {
        if (state.clockTimer) {
            clearInterval(state.clockTimer);
            state.clockTimer = null;
        }
    }

    function updateClockDisplay() {
        if (!_container) return;
        var clockEl = _container.querySelector('#timeDisplayClock');
        var dateEl = _container.querySelector('#timeDisplayDate');
        if (clockEl) clockEl.textContent = formatTimeInZone(state.timeZone);
        if (dateEl) dateEl.textContent = formatDateInZone(state.timeZone);
    }

    // ==========================================
    // 8. 记忆总结 - 核心逻辑
    // ==========================================

    /**
     * 外部调用：每发一条消息调用此方法
     * 当累计到20条时自动触发总结
     */
    function onNewMessage(msgText) {
        if (!state.memoryEnabled) return;

        state.memoryMsgCount++;
        saveInt(STORAGE_KEYS.memoryMsgCount, state.memoryMsgCount);

        if (state.memoryMsgCount % 20 === 0) {
            autoSummarize();
        }

        refreshMemoryPanel();
    }

    /**
     * 自动总结（模拟 — 实际应替换为AI调用）
     */
    function autoSummarize() {
        // 获取最近20条消息用于总结
        var recentMessages = getRecentMessages(20);
        var summaryText = generateSummary(recentMessages);

        var summary = {
            time: new Date().toLocaleString('zh-CN'),
            text: summaryText,
            msgRange: (state.memoryMsgCount - 19) + '-' + state.memoryMsgCount,
        };

        state.memorySummaries.push(summary);
        saveJSON(STORAGE_KEYS.memorySummaries, state.memorySummaries);
        refreshMemoryPanel();
    }

    /**
     * 手动触发总结
     */
    function triggerManualSummary() {
        var recentMessages = getRecentMessages(20);
        if (recentMessages.length === 0) {
            alert('暂无消息可以总结');
            return;
        }

        var summaryText = generateSummary(recentMessages);

        var summary = {
            time: new Date().toLocaleString('zh-CN') + ' (手动)',
            text: summaryText,
            msgRange: '手动总结',
        };

        state.memorySummaries.push(summary);
        saveJSON(STORAGE_KEYS.memorySummaries, state.memorySummaries);
        refreshMemoryPanel();
    }

    /**
     * 获取最近N条消息
     * ★ 需要根据你的实际消息存储结构来修改
     */
    function getRecentMessages(count) {
        // 尝试从你现有的消息系统获取
        var messages = [];

        // 方案1: 如果消息存在全局变量里
        if (window.chatMessages && Array.isArray(window.chatMessages)) {
            messages = window.chatMessages.slice(-count);
        }
        // 方案2: 如果消息存在localStorage里
        else {
            try {
                var stored = localStorage.getItem('danshu_chat_messages');
                if (stored) {
                    var all = JSON.parse(stored);
                    messages = all.slice(-count);
                }
            } catch (e) { }
        }

        // 方案3: 从DOM中抓取
        if (messages.length === 0) {
            var msgEls = document.querySelectorAll('.message-bubble, .chat-message, .msg-content');
            var arr = Array.from(msgEls).slice(-count);
            arr.forEach(function (el) {
                messages.push({
                    role: el.classList.contains('sent') || el.classList.contains('user') ? 'user' : 'char',
                    text: el.textContent.trim()
                });
            });
        }

        return messages;
    }

    /**
     * 生成总结文本
     * ★ 实际项目中应替换为调用AI API来总结
     * 这里提供两种方案
     */
    function generateSummary(messages) {
        if (messages.length === 0) {
            return '暂无足够的对话内容可供总结。';
        }

        // ===== 方案A：简单提取式总结（无需API） =====
        var userMsgs = [];
        var charMsgs = [];

        messages.forEach(function (msg) {
            var text = (msg.text || msg.content || '').trim();
            if (!text) return;
            if (msg.role === 'user' || msg.sender === 'user') {
                userMsgs.push(text);
            } else {
                charMsgs.push(text);
            }
        });

        var summary = '【第' + Math.ceil(state.memoryMsgCount / 20) + '轮记忆】';
        summary += ' 共' + messages.length + '条对话。';

        if (userMsgs.length > 0) {
            // 提取用户最近的关键内容
            var lastUserMsgs = userMsgs.slice(-3);
            summary += ' User提到: ' + lastUserMsgs.map(function (m) {
                return '"' + m.substring(0, 30) + (m.length > 30 ? '...' : '') + '"';
            }).join(', ') + '。';
        }

        if (charMsgs.length > 0) {
            var lastCharMsgs = charMsgs.slice(-3);
            summary += ' Char回应: ' + lastCharMsgs.map(function (m) {
                return '"' + m.substring(0, 30) + (m.length > 30 ? '...' : '') + '"';
            }).join(', ') + '。';
        }

        return summary;
    }

    // ==========================================
    // 9. 为 AI 提供时间和记忆的系统提示
    // ==========================================

    /**
     * 获取需要注入给AI的系统提示
     * ★ 在发送消息给AI时调用此函数，将返回值加入system prompt
     */
    function getAISystemPrompt() {
        var prompts = [];

        // -- 时间感知提示 --
        if (state.timeEnabled) {
            var tzInfo = getTimezoneInfo(state.timeZone);
            var tod = getTimeOfDay(state.timeZone);
            var timeStr = formatTimeInZone(state.timeZone);
            var dateStr = formatDateInZone(state.timeZone);

            prompts.push(
                '[时间感知系统]\n' +
                '当前时间地区：' + tzInfo.name + '（' + tzInfo.label + '）\n' +
                '当前日期：' + dateStr + '\n' +
                '当前时间：' + timeStr + '\n' +
                '当前时段：' + tod.period + '\n' +
                '你（角色）正处于' + tzInfo.name + '的时间体系下，请严格按照此时间来感知和回应。' +
                '例如如果现在是深夜，你应该表现出困倦；如果是早晨，可以说早安；等等。' +
                '请自然地将时间融入对话中，不要生硬地报时。'
            );
        }

        // -- 记忆总结提示 --
        if (state.memoryEnabled && state.memorySummaries.length > 0) {
            var memText = '[记忆系统 - 对话历史总结]\n';
            memText += '以下是你与User之间的历史对话记忆摘要，请据此保持对话连贯性：\n\n';

            // 只取最近5条总结避免太长
            var recent = state.memorySummaries.slice(-5);
            recent.forEach(function (s, i) {
                memText += '记忆' + (i + 1) + ' (' + s.time + '): ' + s.text + '\n';
            });

            memText += '\n请自然地引用这些记忆，不要直接告诉User你在查看记忆总结。';
            prompts.push(memText);
        }

        return prompts.join('\n\n');
    }

    // ==========================================
    // 10. 对外暴露 API
    // ==========================================
    window.ChatAdvanced = {
        /**
         * 渲染高级设置面板到指定容器
         * @param {HTMLElement|string} container
         */
        render: renderAdvancedSettings,

        /**
         * 新消息通知（每发一条消息调用）
         * @param {string} msgText - 消息文本
         */
        onNewMessage: onNewMessage,

        /**
         * 获取AI系统提示（发消息时调用）
         * @returns {string} 需注入的系统提示
         */
        getAISystemPrompt: getAISystemPrompt,

        /**
         * 获取当前时区的时间信息
         * @returns {object} { timeZone, time, date, period, country }
         */
        getTimeInfo: function () {
            if (!state.timeEnabled) return null;
            var tzInfo = getTimezoneInfo(state.timeZone);
            var tod = getTimeOfDay(state.timeZone);
            return {
                timeZone: state.timeZone,
                time: formatTimeInZone(state.timeZone),
                date: formatDateInZone(state.timeZone),
                period: tod.period,
                periodEmoji: tod.emoji,
                country: tzInfo.name,
                flag: tzInfo.flag,
                utcLabel: tzInfo.label,
            };
        },

        /**
         * 获取记忆总结列表
         * @returns {Array}
         */
        getMemories: function () {
            return state.memorySummaries.slice();
        },

        /**
         * 检查功能是否启用
         */
        isMemoryEnabled: function () { return state.memoryEnabled; },
        isTimeEnabled: function () { return state.timeEnabled; },

        /**
         * 销毁（清理定时器）
         */
        destroy: function () {
            stopClock();
            _container = null;
        }
    };

})();
