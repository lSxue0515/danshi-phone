/* ============================================
   game.js — 游戏大厅 + UNO + 麻将(四地区)
   ============================================ */
var _gameView = 'lobby', _gameType = '', _gameSelectedPersona = '', _gameSelectedChars = [];
var _unoState = null, _mjState = null;
var _mjRegion = 'northeast', _mjRounds = 4;
var _turtleState = null;
var _ludoState = null;

function openGameApp() {
    var el = document.getElementById('gameOverlay'); if (!el) return;
    if (typeof loadChatRoles === 'function') loadChatRoles();
    _gameView = 'lobby'; el.innerHTML = gameBuildLobby(); el.classList.add('show');
}
function closeGameApp() {
    var el = document.getElementById('gameOverlay');
    if (el) el.classList.remove('show');
    _unoState = null; _mjState = null; _ddzState = null; _sheepState = null;
    _turtleState = null; _ludoState = null;
}

/* ===== 大厅 ===== */
function gameBuildLobby() {
    var h = '<div class="game-header"><div class="game-back" onclick="closeGameApp()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">GAME CENTER</div><div class="game-header-spacer"></div></div>';
    h += '<div class="game-lobby"><div class="game-lobby-title">Game Center 游戏大厅</div><div class="game-lobby-sub">选择游戏，邀请角色一起玩</div><div class="game-cards">';
    h += '<div class="game-card uno" onclick="gamePickType(\'uno\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="18" rx="3"/><path d="M7 8v8M12 8v5a3 3 0 006 0V8"/></svg></div><div class="game-card-name">UNO</div><div class="game-card-desc">经典卡牌 Classic Cards</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>2-10人</div></div>';
    h += '<div class="game-card mahjong" onclick="gamePickType(\'mahjong\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="9" rx="1.5"/><rect x="3" y="15" width="7" height="6" rx="1.5"/><rect x="14" y="15" width="7" height="6" rx="1.5"/></svg></div><div class="game-card-name">Mahjong 麻将</div><div class="game-card-desc">四地区玩法 Regional Rules</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>4人</div></div>';
    h += '<div class="game-card landlord" onclick="gamePickType(\'landlord\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div class="game-card-name">Landlord 斗地主</div><div class="game-card-desc">经典扑克 Classic Poker</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3人</div></div>';
    h += '<div class="game-card guess" onclick="gamePickType(\'guess\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div><div class="game-card-name">Charades 你说我猜</div><div class="game-card-desc">开发中 Coming Soon</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>3-10人</div></div>';
    h += '<div class="game-card sheep" onclick="gamePickType(\'sheep\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M12 2C9 2 7 4 7 6c-2 0-4 2-4 4s2 4 4 4h1v4a2 2 0 002 2h4a2 2 0 002-2v-4h1c2 0 4-2 4-4s-2-4-4-4c0-2-2-4-5-4z"/></svg></div><div class="game-card-name">Sheep 羊了个羊</div><div class="game-card-desc">三消闯关 Tile Match</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>单人</div></div>';
    h += '<div class="game-card crush" onclick="gamePickType(\'crush\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg></div><div class="game-card-name">Crush 消消乐</div><div class="game-card-desc">开发中 Coming Soon</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>单人</div></div>';
    h += '<div class="game-card link" onclick="gamePickType(\'link\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg></div><div class="game-card-name">Link 连连看</div><div class="game-card-desc">开发中 Coming Soon</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>单人</div></div>';
    h += '<div class="game-card turtle" onclick="gamePickType(\'turtle\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01"/></svg></div><div class="game-card-name">Turtle Soup 海龟汤</div><div class="game-card-desc">情境推理 Lateral Thinking</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>2人</div></div>';
    h += '<div class="game-card ludo" onclick="gamePickType(\'ludo\')"><div class="game-card-icon"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></div><div class="game-card-name">Ludo 飞行棋</div><div class="game-card-desc">经典棋盘 Classic Board</div><div class="game-card-players"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>2-4人</div></div>';

    h += '</div></div>';

    return h;
}

function gamePickType(type) {
    if (type === 'sheep') { _gameType = 'sheep'; _gameView = 'sheep'; sheepStart(); return; }
    if (type === 'turtle') { _gameType = 'turtle'; _gameSelectedPersona = ''; _gameSelectedChars = []; _gameView = 'setup'; var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup(); return; }
    if (type === 'ludo') { _gameType = 'ludo'; _gameSelectedPersona = ''; _gameSelectedChars = []; _gameView = 'setup'; var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup(); return; }
    if (type !== 'uno' && type !== 'mahjong' && type !== 'landlord') { if (typeof showToast === 'function') showToast('开发中，敬请期待'); return; }
    _gameType = type; _gameSelectedPersona = ''; _gameSelectedChars = []; _gameView = 'setup';
    var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup();
}

/* ===== Setup ===== */
function _gameBuildSetup() {
    var minP = 2, maxP = 10;
    if (_gameType === 'mahjong') { minP = 3; maxP = 3; }
    if (_gameType === 'landlord') { minP = 2; maxP = 2; }
    if (_gameType === 'guess') { minP = 2; maxP = 9; }
    if (_gameType === 'turtle') { minP = 1; maxP = 1; }
    if (_gameType === 'ludo') { minP = 1; maxP = 3; }
    var tl = { uno: 'UNO', mahjong: 'Mahjong 麻将', landlord: 'Landlord 斗地主', guess: 'Charades 你说我猜', turtle: 'Turtle Soup 海龟汤', ludo: 'Ludo 飞行棋' };
    var h = '<div class="game-header"><div class="game-back" onclick="gameBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">' + (tl[_gameType] || '') + '</div><div class="game-header-spacer"></div></div>';
    h += '<div class="game-setup show"><div class="game-setup-title">Room Setup 组建房间</div><div class="game-setup-sub">选择你的人设和对手角色</div>';

    // 麻将额外：地区+局数
    if (_gameType === 'mahjong') {
        var regions = [
            { id: 'northeast', name: '东北麻将 Northeast', desc: '136张 / 三色全 / 宝牌(混子) / 可吃碰杠' },
            { id: 'sichuan', name: '四川麻将 Sichuan', desc: '108张 / 定缺 / 血战到底 / 不可吃' },
            { id: 'yunnan', name: '云南麻将 Yunnan', desc: '112张 / 鸡牌 / 花牌 / 可吃碰杠' },
            { id: 'hubei', name: '湖北麻将 Hubei', desc: '108张 / 卡五星 / 开口胡 / 不可吃' }
        ];
        h += '<div class="mj-config-sec"><div class="mj-config-label"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Region 地区玩法</div>';
        h += '<div class="mj-region-list">';
        for (var ri = 0; ri < regions.length; ri++) {
            var rg = regions[ri];
            h += '<div class="mj-region-item' + (rg.id === _mjRegion ? ' active' : '') + '" data-mj-region="' + rg.id + '">' + rg.name + '</div>';
        }
        h += '</div>';
        var curDesc = ''; for (var rd = 0; rd < regions.length; rd++) { if (regions[rd].id === _mjRegion) curDesc = regions[rd].desc; }
        h += '<div class="mj-region-desc">' + curDesc + '</div></div>';

        h += '<div class="mj-config-sec"><div class="mj-config-label"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Rounds 局数设置</div>';
        h += '<div class="mj-round-row"><div class="mj-round-btn" data-mj-round="dec">-</div><div class="mj-round-val">' + _mjRounds + '</div><div class="mj-round-btn" data-mj-round="inc">+</div><div class="mj-round-unit">局/轮 per round</div></div></div>';
    }

    // 人设
    h += '<div class="game-setup-sec"><div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Your Persona 你的人设</div><div class="game-persona-list" id="gamePersonaList">';
    var personas = (typeof _chatPersonas !== 'undefined' && _chatPersonas) ? _chatPersonas : [];
    if (!personas.length) h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无人设，请先在聊天App中创建</div>';
    for (var i = 0; i < personas.length; i++) {
        var p = personas[i], pid = p.id || '', isA = (_gameSelectedPersona === pid);
        h += '<div class="game-persona-item' + (isA ? ' active' : '') + '" data-game-persona="' + _gEsc(pid) + '">';
        h += '<div class="game-persona-av">';
        if (p.avatar) h += '<img src="' + _gEsc(p.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div><div class="game-persona-name">' + _gEsc(p.name || '未命名') + '</div></div>';
    }
    h += '</div></div>';

    // 角色
    h += '<div class="game-setup-sec"><div class="game-setup-sec-title"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>Opponents 对手角色 <span style="color:rgba(120,100,112,.2);font-weight:400;font-size:8.5px">(' + minP + '-' + maxP + '人)</span></div><div class="game-char-grid" id="gameCharGrid">';
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    if (!roles.length) h += '<div style="font-size:10px;color:rgba(120,100,112,.3);padding:4px 0">暂无角色，请先在聊天App中创建</div>';
    for (var j = 0; j < roles.length; j++) {
        var r = roles[j], rid = r.id || '', isSel = (_gameSelectedChars.indexOf(rid) !== -1);
        h += '<div class="game-char-item' + (isSel ? ' selected' : '') + '" data-game-char="' + _gEsc(rid) + '">';
        h += '<div class="game-char-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><div class="game-char-av">';
        if (r.avatar) h += '<img src="' + _gEsc(r.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div><div class="game-char-name">' + _gEsc(r.name || '未命名') + '</div></div>';
    }
    h += '</div><div class="game-char-count">已选 ' + _gameSelectedChars.length + ' / ' + maxP + '</div></div>';

    var canStart = _gameSelectedPersona && _gameSelectedChars.length >= minP && _gameSelectedChars.length <= maxP;
    h += '<button class="game-start-btn ' + _gameType + '" id="gameStartBtn" ' + (canStart ? '' : 'disabled') + '>Start 开始游戏</button></div>';
    return h;
}

/* 事件委托 — click */
/* 事件委托 — click */
document.addEventListener('click', function (e) {
    // 人设
    var pi = e.target.closest('[data-game-persona]');
    if (pi) { var pid = pi.getAttribute('data-game-persona'); if (pid) { _gameSelectedPersona = pid; _gameRefreshSetup(); } return; }
    // 角色
    var ci = e.target.closest('[data-game-char]');
    if (ci) { var rid = ci.getAttribute('data-game-char'); if (rid) _gameToggleChar(rid); return; }
    // 开始
    if (e.target.id === 'gameStartBtn' && !e.target.disabled) { gameStart(); return; }
    // 麻将地区
    var mr = e.target.closest('[data-mj-region]');
    if (mr) { _mjRegion = mr.getAttribute('data-mj-region'); _gameRefreshSetup(); return; }
    // 局数
    var rd = e.target.closest('[data-mj-round]');
    if (rd) { var a = rd.getAttribute('data-mj-round'); if (a === 'inc' && _mjRounds < 16) _mjRounds++; if (a === 'dec' && _mjRounds > 1) _mjRounds--; _gameRefreshSetup(); return; }
    // 麻将操作
    var ma = e.target.closest('[data-mj-action]');
    if (ma) { _mjHandleAction(ma.getAttribute('data-mj-action')); return; }
    // 麻将出牌
    var mt = e.target.closest('[data-mj-play]');
    if (mt) { var ti = parseInt(mt.getAttribute('data-mj-play')); _mjUserDiscard(ti); return; }
    // UNO操作
    var t = e.target.closest('[data-uno-action]');
    if (t) { _handleUnoAction(t.getAttribute('data-uno-action')); return; }
    // 斗地主操作
    var da = e.target.closest('[data-ddz-action]');
    if (da) { _ddzHandleAction(da.getAttribute('data-ddz-action')); return; }
    // 斗地主选牌
    var dc = e.target.closest('[data-ddz-card]');
    if (dc) { _ddzToggleCard(parseInt(dc.getAttribute('data-ddz-card'))); return; }
    // 海龟汤操作
    var ta = e.target.closest('[data-turtle-action]');
    if (ta) { _turtleAction(ta.getAttribute('data-turtle-action')); return; }
    // 飞行棋操作
    var la = e.target.closest('[data-ludo-action]');
    if (la) { _ludoAction(la.getAttribute('data-ludo-action')); return; }
    // 飞行棋选飞机
    var lp = e.target.closest('[data-ludo-plane]');
    if (lp) { _ludoPickPlane(parseInt(lp.getAttribute('data-ludo-plane'))); return; }
});

function gameBackToLobby() { _gameView = 'lobby'; var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = gameBuildLobby(); }
function _gameRefreshSetup() { var el = document.getElementById('gameOverlay'); if (el) el.innerHTML = _gameBuildSetup(); }
function _gameToggleChar(id) {
    var maxP = (_gameType === 'mahjong') ? 3 : (_gameType === 'landlord') ? 2 : (_gameType === 'guess') ? 9 : (_gameType === 'turtle') ? 1 : (_gameType === 'ludo') ? 3 : 10;
    var idx = _gameSelectedChars.indexOf(id);
    if (idx !== -1) _gameSelectedChars.splice(idx, 1);
    else { if (_gameSelectedChars.length >= maxP) { if (typeof showToast === 'function') showToast('最多选择' + maxP + '个角色'); return; } _gameSelectedChars.push(id); }
    _gameRefreshSetup();
}
function gameStart() { if (_gameType === 'uno') unoStart(); if (_gameType === 'mahjong') mjStart(); if (_gameType === 'landlord') ddzStart(); if (_gameType === 'turtle') turtleStart(); if (_gameType === 'ludo') ludoStart(); }

/* ==========================================
   麻将引擎 MAHJONG ENGINE
   ========================================== */
var MJ_WINDS = ['东', '南', '西', '北'];
var MJ_JIAN = ['中', '发', '白'];
var MJ_SUITS = ['wan', 'tiao', 'tong'];
var MJ_SUIT_CN = { wan: '万', tiao: '条', tong: '筒' };

function _mjBuildTiles() {
    var tiles = [];
    for (var si = 0; si < 3; si++) {
        for (var n = 1; n <= 9; n++) {
            for (var c = 0; c < 4; c++) {
                tiles.push({ suit: MJ_SUITS[si], num: n, id: MJ_SUITS[si] + n + '_' + c });
            }
        }
    }
    if (_mjRegion === 'northeast') {
        for (var wi = 0; wi < 4; wi++) { for (var wc = 0; wc < 4; wc++)tiles.push({ suit: 'feng', num: wi, id: 'feng' + wi + '_' + wc }); }
        for (var ji = 0; ji < 3; ji++) { for (var jc = 0; jc < 4; jc++)tiles.push({ suit: 'jian', num: ji, id: 'jian' + ji + '_' + jc }); }
    }
    if (_mjRegion === 'yunnan') { for (var fi = 0; fi < 4; fi++)tiles.push({ suit: 'hua', num: fi, id: 'hua' + fi }); }
    return _mjShuffle(tiles);
}
function _mjShuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function _mjTileName(t) {
    if (t.suit === 'feng') return MJ_WINDS[t.num] + '风';
    if (t.suit === 'jian') return MJ_JIAN[t.num];
    if (t.suit === 'hua') return ['春', '夏', '秋', '冬'][t.num] || '花';
    return t.num + (MJ_SUIT_CN[t.suit] || '');
}
function _mjTileShort(t) {
    if (t.suit === 'feng') return MJ_WINDS[t.num];
    if (t.suit === 'jian') return MJ_JIAN[t.num];
    if (t.suit === 'hua') return ['春', '夏', '秋', '冬'][t.num] || '花';
    return t.num + '';
}
function _mjTileSuitClass(t) { return t.suit; }
function _mjSortHand(hand) {
    var order = { wan: 0, tiao: 1, tong: 2, feng: 3, jian: 4, hua: 5 };
    hand.sort(function (a, b) { return (order[a.suit] || 0) * 100 + a.num - (order[b.suit] || 0) * 100 - b.num; });
}

function mjStart() {

    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var pl = [];
    pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], melds: [], discards: [], isUser: true, score: 0, wind: 0, dingque: -1 });
    for (var i = 0; i < _gameSelectedChars.length; i++) {
        var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null;
        if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', detail: r.detail || '', hand: [], melds: [], discards: [], isUser: false, score: 0, wind: i + 1, dingque: -1 });
    }
    var tiles = _mjBuildTiles();
    for (var p = 0; p < 4; p++) { pl[p].hand = tiles.splice(0, p === 0 ? 14 : 13); _mjSortHand(pl[p].hand); }
    var bao = null;
    if (_mjRegion === 'northeast' && tiles.length > 0) bao = tiles[tiles.length - 1];
    _mjState = {
        players: pl, wall: tiles, phase: 'play', currentPlayer: 0,
        dealer: 0, roundNum: 1, totalRounds: _mjRounds,
        region: _mjRegion, bao: bao,
        logs: [], pendingAction: null, lastDiscard: null, lastDiscardPlayer: -1,
        canChi: (_mjRegion === 'northeast' || _mjRegion === 'yunnan'),
        needDingque: (_mjRegion === 'sichuan' || _mjRegion === 'hubei'),
        gameOver: false
    };
    if (_mjState.needDingque) {
        _mjState.phase = 'dingque';
        for (var ai = 1; ai < 4; ai++)_mjAiDingque(ai);
        _mjRender();
    } else {
        _mjState.phase = 'discard';
        _mjLog(pl[0].name + ' 是庄家 Dealer');
        _mjRender();
    }
}

function _mjAiDingque(pIdx) {
    var pl = _mjState.players[pIdx], count = { wan: 0, tiao: 0, tong: 0 };
    for (var i = 0; i < pl.hand.length; i++) { var s = pl.hand[i].suit; if (count[s] !== undefined) count[s]++; }
    var mn = 'wan', mv = 99; for (var k in count) { if (count[k] < mv) { mv = count[k]; mn = k; } }
    pl.dingque = MJ_SUITS.indexOf(mn);
}
function _mjUserDingque(suitIdx) {
    if (!_mjState || _mjState.phase !== 'dingque') return;
    _mjState.players[0].dingque = suitIdx;
    _mjLog('你选择定缺 ' + MJ_SUIT_CN[MJ_SUITS[suitIdx]]);
    _mjState.phase = 'discard'; _mjState.currentPlayer = 0; _mjRender();
}

function _mjUserDiscard(tileIdx) {
    var s = _mjState; if (!s || s.phase !== 'discard' || s.currentPlayer !== 0) return;
    var pl = s.players[0]; if (tileIdx < 0 || tileIdx >= pl.hand.length) return;
    var tile = pl.hand[tileIdx];
    if (s.needDingque && pl.dingque >= 0) {
        var dqSuit = MJ_SUITS[pl.dingque], hasDq = false;
        for (var i = 0; i < pl.hand.length; i++) { if (pl.hand[i].suit === dqSuit) { hasDq = true; break; } }
        if (hasDq && tile.suit !== dqSuit) { if (typeof showToast === 'function') showToast('请先出掉定缺花色的牌'); return; }
    }
    _mjDoDiscard(0, tileIdx);
}

function _mjDoDiscard(pIdx, tileIdx) {
    var s = _mjState, pl = s.players[pIdx];
    var tile = pl.hand.splice(tileIdx, 1)[0];
    pl.discards.push(tile);
    s.lastDiscard = tile; s.lastDiscardPlayer = pIdx;
    _mjLog(pl.name + ' 打出 ' + _mjTileName(tile));
    // ★ 先渲染，让用户看到出了什么牌
    _mjRender();

    var actions = _mjCheckOtherActions(pIdx, tile);
    if (actions.length > 0) {
        var acted = false;
        for (var ai = 0; ai < actions.length; ai++) {
            var a = actions[ai];
            if (a.pIdx === 0) continue;
            if (a.type === 'hu' && Math.random() < 0.9) {
                setTimeout(function () { if (_mjState) _mjDoHu(a.pIdx, tile, pIdx); }, 800);
                acted = true; break;
            }
            if (a.type === 'gang' && Math.random() < 0.7) {
                setTimeout(function () { if (_mjState) _mjDoPeng(a.pIdx, tile, pIdx, true); }, 800);
                acted = true; break;
            }
            if (a.type === 'peng' && Math.random() < 0.8) {
                setTimeout(function () { if (_mjState) _mjDoPeng(a.pIdx, tile, pIdx, false); }, 800);
                acted = true; break;
            }
        }
        if (acted) return;
    }
    // ★ 延迟后轮到下家摸牌
    s.currentPlayer = (pIdx + 1) % 4;
    s.phase = 'draw';
    var delay = pIdx === 0 ? 800 : 1200; // 给用户看对手出牌的时间
    setTimeout(function () { if (_mjState && _mjState.phase === 'draw') _mjDoDraw(_mjState.currentPlayer); }, delay);
}

function _mjDoDraw(pIdx) {
    var s = _mjState;
    if (s.wall.length === 0) { _mjDraw(); return; }
    var tile = s.wall.shift(), pl = s.players[pIdx];
    if (tile.suit === 'hua') {
        pl.melds.push({ type: 'hua', tiles: [tile] });
        _mjLog(pl.name + ' 摸到花牌 ' + _mjTileName(tile));
        _mjDoDraw(pIdx); return;
    }
    pl.hand.push(tile); _mjSortHand(pl.hand);
    if (_mjCheckHu(pl)) {
        if (pl.isUser) {
            s.phase = 'discard'; s.pendingAction = { type: 'canHu', pIdx: pIdx };
            _mjRender(); return;
        } else {
            if (Math.random() < 0.85) {
                setTimeout(function () { if (_mjState) _mjDoHu(pIdx, null, -1); }, 600);
                return;
            }
        }
    }
    s.phase = 'discard'; s.currentPlayer = pIdx;
    if (!pl.isUser) {
        // ★ AI出牌延迟1.5-2.5秒，让用户看清
        setTimeout(function () { if (_mjState) _mjAiDiscard(pIdx); }, 1500 + Math.random() * 1000);
    }
    _mjRender();
}

function _mjAiDiscard(pIdx) {
    var s = _mjState; if (!s || s.phase !== 'discard') return;
    var pl = s.players[pIdx]; if (pl.isUser) return;
    var bestIdx = 0, bestScore = -1;
    for (var i = 0; i < pl.hand.length; i++) {
        var t = pl.hand[i], sc = 0;
        if (s.needDingque && pl.dingque >= 0 && t.suit === MJ_SUITS[pl.dingque]) sc += 100;
        var same = 0; for (var j = 0; j < pl.hand.length; j++) { if (j !== i && pl.hand[j].suit === t.suit && Math.abs(pl.hand[j].num - t.num) <= 1) same++; }
        if (same === 0) sc += 50;
        if ((t.suit === 'feng' || t.suit === 'jian') && same === 0) sc += 30;
        sc += Math.random() * 10;
        if (sc > bestScore) { bestScore = sc; bestIdx = i; }
    }
    _mjDoDiscard(pIdx, bestIdx);
}

function _mjDoPeng(pIdx, tile, fromIdx, isGang) {
    var s = _mjState, pl = s.players[pIdx];
    var cnt = isGang ? 3 : 2, removed = [];
    for (var i = pl.hand.length - 1; i >= 0 && removed.length < cnt; i--) {
        if (pl.hand[i].suit === tile.suit && pl.hand[i].num === tile.num) removed.push(pl.hand.splice(i, 1)[0]);
    }
    var dp = s.players[fromIdx];
    for (var d = dp.discards.length - 1; d >= 0; d--) { if (dp.discards[d].id === tile.id) { dp.discards.splice(d, 1); break; } }
    removed.push(tile);
    pl.melds.push({ type: isGang ? 'minggang' : 'peng', tiles: removed });
    _mjLog(pl.name + (isGang ? ' 杠 ' : ' 碰 ') + _mjTileName(tile));
    if (isGang) { s.currentPlayer = pIdx; s.phase = 'draw'; setTimeout(function () { if (_mjState) _mjDoDraw(pIdx); }, 600); }
    else { s.currentPlayer = pIdx; s.phase = 'discard'; if (!pl.isUser) setTimeout(function () { if (_mjState) _mjAiDiscard(pIdx); }, 1200); _mjRender(); }
}

function _mjCheckOtherActions(fromIdx, tile) {
    var s = _mjState, actions = [];
    for (var i = 1; i <= 3; i++) {
        var pIdx = (fromIdx + i) % 4, pl = s.players[pIdx], same = 0;
        for (var j = 0; j < pl.hand.length; j++) { if (pl.hand[j].suit === tile.suit && pl.hand[j].num === tile.num) same++; }
        if (same >= 3) actions.push({ pIdx: pIdx, type: 'gang' });
        else if (same >= 2) actions.push({ pIdx: pIdx, type: 'peng' });
    }
    return actions;
}

function _mjCheckHu(pl) {
    var hand = pl.hand; if (hand.length % 3 !== 2) return false;
    if (hand.length === 14) { var pairs = true; for (var i = 0; i < hand.length; i += 2) { if (i + 1 >= hand.length || hand[i].suit !== hand[i + 1].suit || hand[i].num !== hand[i + 1].num) { pairs = false; break; } } if (pairs) return true; }
    return _mjCheckStdHu(hand);
}
function _mjCheckStdHu(tiles) {
    var counts = {}; for (var i = 0; i < tiles.length; i++) { var key = tiles[i].suit + '_' + tiles[i].num; counts[key] = (counts[key] || 0) + 1; }
    var keys = Object.keys(counts);
    for (var k = 0; k < keys.length; k++) { if (counts[keys[k]] >= 2) { var copy = {}; for (var c in counts) copy[c] = counts[c]; copy[keys[k]] -= 2; if (_mjCheckMelds(copy)) return true; } }
    return false;
}
function _mjCheckMelds(counts) {
    var first = null; for (var k in counts) { if (counts[k] > 0) { first = k; break; } }
    if (!first) return true;
    var parts = first.split('_'), suit = parts[0], num = parseInt(parts[1]);
    if (counts[first] >= 3) { var c1 = {}; for (var k in counts) c1[k] = counts[k]; c1[first] -= 3; if (_mjCheckMelds(c1)) return true; }
    if (suit === 'wan' || suit === 'tiao' || suit === 'tong') {
        var k2 = suit + '_' + (num + 1), k3 = suit + '_' + (num + 2);
        if (counts[k2] && counts[k2] > 0 && counts[k3] && counts[k3] > 0) { var c2 = {}; for (var k in counts) c2[k] = counts[k]; c2[first]--; c2[k2]--; c2[k3]--; if (_mjCheckMelds(c2)) return true; }
    }
    return false;
}

function _mjDoHu(winnerIdx, huTile, fromIdx) {
    var s = _mjState, pl = s.players[winnerIdx], pts = 10;
    if (fromIdx === -1) pts += 5;
    _mjLog(pl.name + ' 胡了! +' + pts + '分');
    pl.score += pts;
    for (var i = 0; i < 4; i++) { if (i !== winnerIdx) s.players[i].score -= Math.floor(pts / 3); }
    if (s.roundNum >= s.totalRounds) {
        s.phase = 'result'; s.gameOver = true;
        var scStr = ''; for (var si = 0; si < 4; si++) scStr += s.players[si].name + ':' + s.players[si].score + ' ';
    }
    else { s.roundNum++; setTimeout(function () { _mjNextRound(); }, 2000); }
    _mjRender();
}
function _mjDraw() {
    var s = _mjState; _mjLog('流局 海底');
    if (s.roundNum >= s.totalRounds) {
        s.phase = 'result'; s.gameOver = true;
        var scStr = ''; for (var si = 0; si < 4; si++) scStr += s.players[si].name + ':' + s.players[si].score + ' ';
    }
    else { s.roundNum++; setTimeout(function () { _mjNextRound(); }, 2000); }
    _mjRender();
}
function _mjNextRound() {
    if (!_mjState) return;
    var s = _mjState, scores = []; for (var i = 0; i < 4; i++)scores.push(s.players[i].score);
    var tiles = _mjBuildTiles();
    for (var p = 0; p < 4; p++) {
        s.players[p].hand = tiles.splice(0, p === s.dealer ? 14 : 13);
        _mjSortHand(s.players[p].hand);
        s.players[p].melds = []; s.players[p].discards = [];
        s.players[p].score = scores[p]; s.players[p].dingque = -1;
    }
    s.wall = tiles; s.lastDiscard = null; s.lastDiscardPlayer = -1;
    if (_mjRegion === 'northeast' && tiles.length > 0) s.bao = tiles[tiles.length - 1];
    s.currentPlayer = s.dealer;
    if (s.needDingque) { s.phase = 'dingque'; for (var ai = 1; ai < 4; ai++)_mjAiDingque(ai); }
    else { s.phase = 'discard'; }
    _mjLog('第' + s.roundNum + '局开始'); _mjRender();
}

function _mjHandleAction(act) {
    var s = _mjState; if (!s) return;
    if (act === 'hu' && s.pendingAction && s.pendingAction.type === 'canHu') { _mjDoHu(0, null, -1); return; }
    if (act === 'skip' && s.pendingAction) { s.pendingAction = null; s.phase = 'discard'; _mjRender(); return; }
    if (act === 'quit') { if (s.phase !== 'result') { if (!confirm('确定退出麻将？')) return; } _mjState = null; gameBackToLobby(); return; }
    if (act === 'again') { _mjState.roundNum = 1; _mjNextRound(); return; }
    if (act === 'lobby') { _mjState = null; gameBackToLobby(); return; }
    if (act.indexOf('dingque-') === 0) { _mjUserDingque(parseInt(act.substring(8))); return; }
}
function _mjLog(msg) { if (_mjState) _mjState.logs.push(msg); }

/* 局部刷新聊天框 */
function _mjRenderChatOnly() {
    var box = document.getElementById('mjChatBox');
    if (!box) return;
    var h = '';
    var show = _mjChatLog.slice(-15);
    for (var i = 0; i < show.length; i++) {
        var m = show[i];
        h += '<div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:3px;' + (m.isUser ? 'flex-direction:row-reverse' : '') + '">';
        h += '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden;background:rgba(160,140,150,.08);flex-shrink:0">';
        if (m.avatar) h += '<img src="' + _gEsc(m.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
        h += '</div>';
        h += '<div style="max-width:70%;padding:3px 7px;border-radius:8px;font-size:8px;line-height:1.4;' + (m.isUser ? 'background:rgba(143,181,160,.15);color:#4a6a52' : 'background:rgba(255,255,255,.6);color:#5a4a52') + '">';
        h += '<div style="font-size:6.5px;color:rgba(120,100,112,.35);margin-bottom:1px">' + _gEsc(m.name) + '</div>';
        // 支持换行显示（外国角色翻译会换行）
        var lines = m.text.split('\n');
        for (var li = 0; li < lines.length; li++) {
            h += (li > 0 ? '<br>' : '') + _gEsc(lines[li]);
        }
        h += '</div></div>';
    }
    box.innerHTML = h;
    box.scrollTop = box.scrollHeight;
}

/* ===== 渲染麻将(完整重写) ===== */
function _mjRender() {
    var el = document.getElementById('gameOverlay'); if (!el || !_mjState) return;
    var s = _mjState, h = '';
    // 计算旋转容器尺寸(宽高互换实现横屏)
    var ew = el.offsetWidth || 390, eh = el.offsetHeight || 844;
    var wrapW = eh, wrapH = ew;
    // 横屏容器
    h += '<div class="ls-wrap" style="width:' + wrapW + 'px;height:' + wrapH + 'px;margin-left:-' + (wrapW / 2) + 'px;margin-top:-' + (wrapH / 2) + 'px">';
    // header
    h += '<div class="game-header" style="background:rgba(234,230,226,.9);padding:8px 12px 6px"><div class="game-back" data-mj-action="quit"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title" style="color:#5a4a52;font-size:11px">麻将</div><div style="font-size:7px;color:rgba(90,74,82,.4)">R' + s.roundNum + '/' + s.totalRounds + ' 余' + s.wall.length + '</div></div>';
    // 牌桌grid：左char1 / 上char2 / 右char3 / 中央 / 下user
    h += '<div class="mj-table-ls">';
    // ---- 左座 char1(players[1]) ----
    var p1 = s.players[1], a1 = (1 === s.currentPlayer && (s.phase === 'discard' || s.phase === 'draw'));
    h += '<div class="mj-seat mj-seat-left' + (a1 ? ' active' : '') + '">';
    h += '<div class="mj-seat-av" style="width:38px;height:38px">';
    if (p1.avatar) h += '<img src="' + _gEsc(p1.avatar) + '">';
    h += '</div><div class="mj-seat-name">' + _gEsc(p1.name) + '</div>';
    h += '<div class="mj-seat-cnt">' + p1.hand.length + '张 ' + p1.score + '分</div>';
    h += '</div>';
    // ---- 上座 char2(players[2]) ----
    var p2 = s.players[2], a2 = (2 === s.currentPlayer && (s.phase === 'discard' || s.phase === 'draw'));
    h += '<div class="mj-seat mj-seat-top' + (a2 ? ' active' : '') + '">';
    h += '<div class="mj-seat-av" style="width:38px;height:38px">';
    if (p2.avatar) h += '<img src="' + _gEsc(p2.avatar) + '">';
    h += '</div><div class="mj-seat-name">' + _gEsc(p2.name) + '</div>';
    h += '<div class="mj-seat-cnt">' + p2.hand.length + '张 ' + p2.score + '分</div>';
    h += '</div>';
    // ---- 右座 char3(players[3]) ----
    var p3 = s.players[3], a3 = (3 === s.currentPlayer && (s.phase === 'discard' || s.phase === 'draw'));
    h += '<div class="mj-seat mj-seat-right' + (a3 ? ' active' : '') + '">';
    h += '<div class="mj-seat-av" style="width:38px;height:38px">';
    if (p3.avatar) h += '<img src="' + _gEsc(p3.avatar) + '">';
    h += '</div><div class="mj-seat-name">' + _gEsc(p3.name) + '</div>';
    h += '<div class="mj-seat-cnt">' + p3.hand.length + '张 ' + p3.score + '分</div>';
    h += '</div>';
    // ---- 中央(log+牌河) ----
    h += '<div class="mj-center-ls">';
    h += '<div class="mj-center-log" id="mjLog">';
    var logA = s.log || [];
    for (var li = Math.max(0, logA.length - 20); li < logA.length; li++) h += '<div>' + _gEsc(logA[li]) + '</div>';
    h += '</div>';
    h += '<div class="mj-center-discards">';
    for (var di = 0; di < 4; di++) { var dp = s.players[di]; for (var dd = 0; dd < dp.discards.length; dd++) { var dt = dp.discards[dd]; h += '<div class="mj-discard-tile ' + _mjTileSuitClass(dt) + '" style="width:22px;height:28px;font-size:11px">' + _mjTileShort(dt) + '</div>'; } }
    h += '</div></div>';
    // ---- 底部user(players[0]) ----
    h += '<div class="mj-hand-ls">';
    // 操作按钮
    if (s.pendingAction && s.pendingAction.type === 'canHu') {
        h += '<div class="mj-action-ls"><div class="mj-action-btn primary" data-mj-action="hu">胡!</div><div class="mj-action-btn gray" data-mj-action="skip">跳过</div></div>';
    }
    var me = s.players[0], myA = (s.currentPlayer === 0 && s.phase === 'discard');
    h += '<div class="mj-hand-ls-info">';
    h += '<div style="display:flex;align-items:center;gap:3px;padding:2px 6px;border-radius:7px;' + (myA ? 'background:rgba(143,181,160,.15);border:1px solid rgba(143,181,160,.15)' : 'background:rgba(255,255,255,.35);border:1px solid rgba(160,140,150,.06)') + '">';
    h += '<div style="width:30px;height:30px;border-radius:50%;overflow:hidden">';
    if (me.avatar) h += '<img src="' + _gEsc(me.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
    h += '</div><span style="font-size:11px;font-weight:600;color:#5a4a52">' + _gEsc(me.name) + '</span>';
    h += '<span style="font-size:9px;color:rgba(120,100,112,.3)">分:' + me.score + '</span></div></div>';
    // 手牌
    h += '<div class="mj-hand-ls-cards">';
    for (var hi = 0; hi < me.hand.length; hi++) {
        var ht = me.hand[hi], canP = (s.currentPlayer === 0 && s.phase === 'discard');
        h += '<div class="mj-tile ' + _mjTileSuitClass(ht) + (canP ? ' playable' : '') + '" style="width:32px;height:44px"' + (canP ? ' data-mj-play="' + hi + '"' : '') + '>';
        h += '<div class="mj-tile-val" style="font-size:14px">' + _mjTileShort(ht) + '</div>';
        h += '<div class="mj-tile-suit" style="font-size:8px">' + (MJ_SUIT_CN[ht.suit] || '') + '</div></div>';
    }
    if (me.melds.length > 0) {
        h += '<div style="display:flex;gap:2px;margin-left:4px;align-items:flex-end">';
        for (var mi = 0; mi < me.melds.length; mi++) { h += '<div style="display:flex;gap:0">'; for (var mti = 0; mti < me.melds[mi].tiles.length; mti++) { var mtt = me.melds[mi].tiles[mti]; h += '<div class="mj-meld-tile ' + _mjTileSuitClass(mtt) + '" style="width:26px;height:34px;font-size:11px">' + _mjTileShort(mtt) + '</div>'; } h += '</div>'; }
        h += '</div>';
    }
    h += '</div></div>'; // /mj-hand-ls-cards /mj-hand-ls
    h += '</div>'; // /mj-table-ls
    // 定缺overlay(四川)
    if (s.region === 'sichuan' && s.phase === 'dingque' && me.dingque === -1) {
        h += '<div class="mj-dingque-overlay show"><div class="mj-dingque-box">';
        h += '<div class="mj-dingque-title">定缺 Choose Exclude</div>';
        h += '<div class="mj-dingque-sub">选择一个花色，整局不能出该花色的牌胡牌</div>';
        h += '<div class="mj-dingque-opts">';
        h += '<div class="mj-dingque-btn wan" data-mj-action="dingque-0"><div class="mj-dingque-btn-label">万</div><div class="mj-dingque-btn-sub">Wan</div></div>';
        h += '<div class="mj-dingque-btn tiao" data-mj-action="dingque-1"><div class="mj-dingque-btn-label">条</div><div class="mj-dingque-btn-sub">Tiao</div></div>';
        h += '<div class="mj-dingque-btn tong" data-mj-action="dingque-2"><div class="mj-dingque-btn-label">筒</div><div class="mj-dingque-btn-sub">Tong</div></div>';
        h += '</div></div></div>';
    }
    // 结算
    if (s.gameOver && s.phase === 'result') {
        h += '<div class="mj-result show"><div class="mj-result-title">Game Over 对局结束</div>';
        h += '<div class="mj-result-sub">' + s.totalRounds + '局结算</div><div class="mj-result-scores">';
        var sorted = []; for (var si = 0; si < 4; si++) sorted.push({ idx: si, score: s.players[si].score });
        sorted.sort(function (a, b) { return b.score - a.score; });
        for (var sr = 0; sr < sorted.length; sr++) {
            var sp = s.players[sorted[sr].idx], isW = (sr === 0);
            h += '<div class="mj-result-row' + (isW ? ' winner' : '') + '"><div class="mj-result-av" style="width:36px;height:36px">';
            if (sp.avatar) h += '<img src="' + _gEsc(sp.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
            h += '</div><div class="mj-result-name">' + _gEsc(sp.name) + '</div><div class="mj-result-pts' + (sp.score < 0 ? ' neg' : '') + '">' + sp.score + '</div></div>';
        }
        h += '</div><div class="mj-result-btns">';
        h += '<div class="mj-result-btn primary" data-mj-action="again">再来 Again</div>';
        h += '<div class="mj-result-btn secondary" data-mj-action="lobby">大厅 Lobby</div>';
        h += '</div></div>';
    }
    h += '</div>'; // /ls-wrap
    el.innerHTML = h;
    var logEl = document.getElementById('mjLog');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
}

/* ==========================================
   UNO 引擎 (保持原有完整代码)
   ========================================== */
var UNO_COLORS = ['red', 'yellow', 'blue', 'green'], UNO_SPECIALS = ['skip', 'reverse', 'draw2'];
function unoBuildDeck() { var d = []; for (var ci = 0; ci < 4; ci++) { var c = UNO_COLORS[ci]; d.push({ color: c, value: '0', type: 'number', id: 'n' + c + '0' }); for (var n = 1; n <= 9; n++) { d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'a' }); d.push({ color: c, value: '' + n, type: 'number', id: 'n' + c + n + 'b' }); } for (var si = 0; si < 3; si++) { d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'a' }); d.push({ color: c, value: UNO_SPECIALS[si], type: 'special', id: 's' + c + UNO_SPECIALS[si] + 'b' }); } } for (var w = 0; w < 4; w++) { d.push({ color: 'wild', value: 'wild', type: 'wild', id: 'ww' + w }); d.push({ color: 'wild', value: 'wild4', type: 'wild', id: 'w4' + w }); } return d; }
function unoShuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function unoStart() { var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null; var pl = []; pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], isUser: true, score: 0, saidUno: false }); for (var i = 0; i < _gameSelectedChars.length; i++) { var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null; if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', hand: [], isUser: false, score: 0, saidUno: false }); } var deck = unoShuffle(unoBuildDeck()); for (var p = 0; p < pl.length; p++)pl[p].hand = deck.splice(0, 7); var fd = null; for (var d = 0; d < deck.length; d++) { if (deck[d].value !== 'wild4') { fd = deck.splice(d, 1)[0]; break; } } if (!fd) fd = deck.shift(); var tc = fd.color; if (tc === 'wild') tc = UNO_COLORS[Math.floor(Math.random() * 4)]; _unoState = { players: pl, deck: deck, discard: [fd], topColor: tc, currentPlayer: 1, direction: 1, drawStack: 0, phase: 'play', logs: [], pendingWildCard: null }; _unoHandleStartCard(fd); _unoRender(); _unoLog(pl[_unoState.currentPlayer].name + ' 先出牌'); if (_unoState.currentPlayer !== 0) setTimeout(function () { _unoAiTurn(); }, 1100); }
function _unoHandleStartCard(c) { if (c.value === 'skip') _unoState.currentPlayer = _unoNext(); else if (c.value === 'reverse') _unoState.direction *= -1; else if (c.value === 'draw2') _unoState.drawStack = 2; }
function _unoNext() { var s = _unoState; return (s.currentPlayer + s.direction + s.players.length) % s.players.length; }
function _unoAdvance() { _unoState.currentPlayer = _unoNext(); for (var i = 0; i < _unoState.players.length; i++) { if (_unoState.players[i].hand.length > 1) _unoState.players[i].saidUno = false; } _unoRender(); if (_unoState.currentPlayer !== 0 && _unoState.phase === 'play') setTimeout(function () { if (_unoState && _unoState.phase === 'play') _unoAiTurn(); }, 800 + Math.random() * 500); }
function _unoCanPlay(card) { var s = _unoState, top = s.discard[s.discard.length - 1]; if (card.color === 'wild') return true; if (s.drawStack > 0 && card.value === 'draw2') return true; if (s.drawStack > 0) return false; if (card.color === s.topColor) return true; if (card.value === top.value) return true; return false; }
function _handleUnoAction(act) { var s = _unoState; if (!s) return; if (act === 'draw') { if (s.currentPlayer !== 0 || s.phase !== 'play') return; if (s.drawStack > 0) { var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(0, cnt); _unoLog('你 抽了' + cnt + '张'); _unoAdvance(); return; } if (s.deck.length === 0) _unoReshuffle(); if (s.deck.length > 0) { var dr = s.deck.shift(); s.players[0].hand.push(dr); _unoLog('你 抽了1张'); if (_unoCanPlay(dr)) { _unoRender(); return; } } _unoAdvance(); } else if (act === 'pass') { if (s.currentPlayer !== 0 || s.phase !== 'play') return; _unoLog('你 跳过'); _unoAdvance(); } else if (act === 'uno') { if (s.players[0].hand.length <= 2) { s.players[0].saidUno = true; _unoShowShout(); _unoLog('你喊了UNO!'); } } else if (act === 'again') { unoStart(); } else if (act === 'lobby') { _unoState = null; gameBackToLobby(); } else if (act === 'quit') { if (s.phase === 'play') { if (!confirm('确定退出?')) return; } _unoState = null; gameBackToLobby(); } else if (act.indexOf('play-') === 0) { var ci = parseInt(act.substring(5)); if (s.currentPlayer !== 0 || s.phase !== 'play') return; var card = s.players[0].hand[ci]; if (!card || !_unoCanPlay(card)) { if (typeof showToast === 'function') showToast('这张牌不能出'); return; } _unoPlayCard(0, ci); } else if (act.indexOf('color-') === 0) { var color = act.substring(6); s.topColor = color; s.phase = 'play'; _unoLog('你选择了' + _unoColorCN(color)); var wc = s.pendingWildCard; s.pendingWildCard = null; _unoApplyEffect(wc, 0); } }
function _unoPlayCard(pIdx, cIdx) { var s = _unoState, pl = s.players[pIdx]; var card = pl.hand.splice(cIdx, 1)[0]; s.discard.push(card); _unoLog(pl.name + ' 打出' + _unoCardCN(card)); if (card.color === 'wild') { if (pl.isUser) { s.pendingWildCard = card; s.phase = 'colorPick'; _unoRender(); return; } else { s.topColor = _unoAiColor(pl); _unoLog(pl.name + ' 选了' + _unoColorCN(s.topColor)); } } else { s.topColor = card.color; } _unoApplyEffect(card, pIdx); }
function _unoApplyEffect(card, pIdx) { var s = _unoState, pl = s.players[pIdx]; if (pl.hand.length === 0) { _unoWin(pIdx); return; } if (pl.hand.length === 1 && !pl.isUser) { pl.saidUno = true; _unoShowShout(); _unoLog(pl.name + ' UNO!'); } if (card.value === 'skip') { var sk = _unoNext(); _unoLog(s.players[sk].name + ' 被跳过'); s.currentPlayer = sk; _unoAdvance(); return; } if (card.value === 'reverse') { s.direction *= -1; _unoLog('方向反转'); if (s.players.length === 2) { _unoAdvance(); return; } } if (card.value === 'draw2') { s.drawStack += 2; _unoAdvance(); _unoCheckStack(); return; } if (card.value === 'wild4') { s.drawStack += 4; _unoAdvance(); _unoCheckStack(); return; } _unoAdvance(); }
function _unoCheckStack() { var s = _unoState; if (s.drawStack <= 0) return; var cur = s.players[s.currentPlayer], has = false; for (var i = 0; i < cur.hand.length; i++) { if (cur.hand[i].value === 'draw2') { has = true; break; } } if (has) return; var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(s.currentPlayer, cnt); _unoLog(cur.name + ' 抽了' + cnt + '张'); _unoAdvance(); }
function _unoForceDraw(pIdx, n) { var s = _unoState; for (var i = 0; i < n; i++) { if (!s.deck.length) _unoReshuffle(); if (s.deck.length) s.players[pIdx].hand.push(s.deck.shift()); } _unoRender(); }
function _unoReshuffle() { var s = _unoState, top = s.discard.pop(); s.deck = unoShuffle(s.discard); s.discard = [top]; }
function _unoAiTurn() { var s = _unoState; if (!s || s.phase !== 'play') return; var pIdx = s.currentPlayer, pl = s.players[pIdx]; if (pl.isUser) return; if (s.drawStack > 0) { for (var i = 0; i < pl.hand.length; i++) { if (pl.hand[i].value === 'draw2') { _unoPlayCard(pIdx, i); return; } } var cnt = s.drawStack; s.drawStack = 0; _unoForceDraw(pIdx, cnt); _unoLog(pl.name + ' 抽了' + cnt + '张'); _unoAdvance(); return; } var ok = []; for (var j = 0; j < pl.hand.length; j++) { if (_unoCanPlay(pl.hand[j])) ok.push(j); } if (!ok.length) { if (!s.deck.length) _unoReshuffle(); if (s.deck.length) { var d = s.deck.shift(); pl.hand.push(d); _unoLog(pl.name + ' 抽了1张'); if (_unoCanPlay(d) && Math.random() < .5) { setTimeout(function () { if (_unoState) _unoPlayCard(pIdx, pl.hand.length - 1); }, 350); return; } } _unoAdvance(); return; } var pick; if (Math.random() < .3) pick = ok[Math.floor(Math.random() * ok.length)]; else { pick = ok[0]; var mx = -1; for (var m = 0; m < ok.length; m++) { var sv = _unoScore(pl.hand[ok[m]]); if (sv > mx) { mx = sv; pick = ok[m]; } } } _unoPlayCard(pIdx, pick); }
function _unoAiColor(pl) { var ct = { red: 0, yellow: 0, blue: 0, green: 0 }; for (var i = 0; i < pl.hand.length; i++) { var c = pl.hand[i].color; if (ct[c] !== undefined) ct[c]++; } var best = 'red', mx = 0; for (var k in ct) { if (ct[k] > mx) { mx = ct[k]; best = k; } } return best; }
function _unoWin(wIdx) { var s = _unoState; s.phase = 'result'; var total = 0; for (var i = 0; i < s.players.length; i++) { if (i === wIdx) continue; for (var j = 0; j < s.players[i].hand.length; j++)total += _unoScore(s.players[i].hand[j]); } s.players[wIdx].score += total; _unoLog(s.players[wIdx].name + ' 获胜 +' + total); _unoRender(); }
function _unoScore(c) { if (c.type === 'number') return parseInt(c.value) || 0; if (c.value === 'skip' || c.value === 'reverse' || c.value === 'draw2') return 20; return 50; }
function _unoRender() { var el = document.getElementById('gameOverlay'); if (!el || !_unoState) return; var s = _unoState, h = ''; h += '<div class="game-header" style="background:rgba(42,61,48,.92);backdrop-filter:blur(12px);border-bottom:none"><div class="game-back" data-uno-action="quit" style="background:rgba(255,255,255,.08)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6" style="stroke:#ccc"/></svg></div><div class="game-header-title" style="color:rgba(255,255,255,.75)">UNO</div><div class="game-header-spacer"></div></div>'; h += '<div class="uno-game show"><div class="uno-table">'; h += '<div class="uno-direction ' + (s.direction === 1 ? 'cw' : 'ccw') + '"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="1.2" stroke-dasharray="5,4"/>' + (s.direction === 1 ? '<polygon points="82,45 92,50 82,55" fill="rgba(255,255,255,.1)"/>' : '<polygon points="18,45 8,50 18,55" fill="rgba(255,255,255,.1)"/>') + '</svg></div>'; h += '<div class="uno-opponents">'; for (var i = 1; i < s.players.length; i++) { var op = s.players[i], isA = (i === s.currentPlayer && s.phase === 'play'), cn = Math.min(op.hand.length, 5); h += '<div class="uno-opp' + (isA ? ' active' : '') + (op.saidUno && op.hand.length === 1 ? ' uno-call' : '') + '">'; h += '<div class="uno-opp-badge">UNO</div><div class="uno-opp-av">'; if (op.avatar) h += '<img src="' + _gEsc(op.avatar) + '">'; h += '</div><div class="uno-opp-name">' + _gEsc(op.name) + '</div><div class="uno-opp-cards">'; for (var cb = 0; cb < cn; cb++)h += '<div class="uno-opp-card-back"></div>'; h += '</div><div class="uno-opp-count">' + op.hand.length + '</div></div>'; } h += '</div>'; h += '<div class="uno-center"><div class="uno-draw-pile" data-uno-action="draw"><div class="uno-draw-pile-text">Draw 抽牌<br>' + s.deck.length + '</div></div><div class="uno-discard">' + _unoCardHTML(s.discard[s.discard.length - 1], -1, true) + '</div></div>'; h += '<div class="uno-log" id="unoLog">'; var ls = Math.max(0, s.logs.length - 3); for (var li = ls; li < s.logs.length; li++)h += '<div class="uno-log-item">' + _gEsc(s.logs[li]) + '</div>'; h += '</div></div>'; h += '<div class="uno-hand-area"><div class="uno-hand-info"><div class="uno-hand-name"><div class="dot" style="background:' + (s.currentPlayer === 0 ? '#7ab07e' : '#666') + '"></div>' + _gEsc(s.players[0].name) + ' / ' + s.players[0].hand.length + '张</div><div class="uno-hand-actions">'; if (s.currentPlayer === 0 && s.phase === 'play') { h += '<button class="uno-btn red" data-uno-action="uno" ' + (s.players[0].hand.length <= 2 ? '' : 'disabled') + '>UNO!</button>'; h += '<button class="uno-btn gray" data-uno-action="pass">Pass 跳过</button>'; } h += '</div></div><div class="uno-hand-scroll">'; for (var hi = 0; hi < s.players[0].hand.length; hi++) { var hc = s.players[0].hand[hi], cp = (s.currentPlayer === 0 && s.phase === 'play' && _unoCanPlay(hc)); h += _unoCardHTML(hc, hi, false, cp); } h += '</div></div></div>'; if (s.phase === 'colorPick') { h += '<div class="uno-color-pick show"><div class="uno-color-pick-box"><div class="uno-color-pick-title">Pick Color 选择颜色</div><div class="uno-color-btn r" data-uno-action="color-red">红 Red</div><div class="uno-color-btn y" data-uno-action="color-yellow">黄 Yellow</div><div class="uno-color-btn b" data-uno-action="color-blue">蓝 Blue</div><div class="uno-color-btn g" data-uno-action="color-green">绿 Green</div></div></div>'; } if (s.phase === 'result') { var wI = -1; for (var wi = 0; wi < s.players.length; wi++) { if (s.players[wi].hand.length === 0) { wI = wi; break; } } h += '<div class="uno-result show"><div class="uno-result-title">' + (wI === 0 ? '你赢了 You Win!' : _gEsc(s.players[wI >= 0 ? wI : 0].name) + ' 获胜 Wins') + '</div><div class="uno-result-sub">Round Result 本局结算</div><div class="uno-result-scores">'; for (var ri = 0; ri < s.players.length; ri++) { var rp = s.players[ri], isW = (ri === wI); h += '<div class="uno-result-row' + (isW ? ' winner' : '') + '"><div class="uno-result-av">'; if (rp.avatar) h += '<img src="' + _gEsc(rp.avatar) + '">'; h += '</div><div class="uno-result-name">' + _gEsc(rp.name) + '</div><div class="uno-result-score">' + rp.score + '</div></div>'; } h += '</div><div class="uno-result-btns"><button class="uno-result-btn primary" data-uno-action="again">Again 再来</button><button class="uno-result-btn secondary" data-uno-action="lobby">Lobby 大厅</button></div></div>'; } h += '<div class="uno-shout" id="unoShout">UNO!</div>'; el.innerHTML = h; }
function _unoCardHTML(card, idx, isDis, playable) { var cc = card.color === 'wild' ? 'wild' : card.color; var vd = card.value, sym = ''; if (card.value === 'skip') { vd = '\u2298'; sym = 'Skip'; } else if (card.value === 'reverse') { vd = '\u27F2'; sym = 'Rev'; } else if (card.value === 'draw2') { vd = '+2'; sym = 'Draw'; } else if (card.value === 'wild') { vd = '\u2726'; sym = 'Wild'; } else if (card.value === 'wild4') { vd = '+4'; sym = 'W+4'; } var da = ''; if (!isDis && idx >= 0 && playable) da = ' data-uno-action="play-' + idx + '"'; return '<div class="uno-card ' + cc + (playable ? ' playable' : '') + '"' + da + '><div class="uno-card-corner tl">' + vd + '</div><div class="uno-card-val">' + vd + '</div>' + (sym ? '<div class="uno-card-sym">' + sym + '</div>' : '') + '<div class="uno-card-corner br">' + vd + '</div></div>'; }
function _unoCardCN(c) { var cn = { red: '红', yellow: '黄', blue: '蓝', green: '绿', wild: '' }; var vn = c.value; if (vn === 'skip') vn = '跳过'; else if (vn === 'reverse') vn = '反转'; else if (vn === 'draw2') vn = '+2'; else if (vn === 'wild') vn = '变色'; else if (vn === 'wild4') vn = '+4'; return (cn[c.color] || '') + vn; }
function _unoColorCN(c) { return { red: '红色', yellow: '黄色', blue: '蓝色', green: '绿色' }[c] || c; }
function _unoLog(msg) { if (!_unoState) return; _unoState.logs.push(msg); var le = document.getElementById('unoLog'); if (le) { le.innerHTML += '<div class="uno-log-item">' + _gEsc(msg) + '</div>'; while (le.children.length > 5) le.removeChild(le.firstChild); } }
function _unoShowShout() { var el = document.getElementById('unoShout'); if (el) { el.classList.add('show'); setTimeout(function () { if (el) el.classList.remove('show'); }, 1400); } }
function _gEsc(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
/* ==========================================
   斗地主引擎 DDZ (FIGHT THE LANDLORD) ENGINE
   ========================================== */
var _ddzState = null;

// 牌面定义：54张，3最小 → 大王最大
var DDZ_RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'];
var DDZ_SUITS = ['♠', '♥', '♣', '♦'];
var DDZ_RANK_VAL = {};
(function () { for (var i = 0; i < DDZ_RANKS.length; i++) DDZ_RANK_VAL[DDZ_RANKS[i]] = i + 3; DDZ_RANK_VAL['小王'] = 16; DDZ_RANK_VAL['大王'] = 17; })();

function _ddzBuildDeck() {
    var deck = [];
    for (var r = 0; r < DDZ_RANKS.length; r++) {
        for (var s = 0; s < 4; s++) {
            deck.push({ rank: DDZ_RANKS[r], suit: DDZ_SUITS[s], val: DDZ_RANK_VAL[DDZ_RANKS[r]], id: DDZ_RANKS[r] + DDZ_SUITS[s] });
        }
    }
    deck.push({ rank: '小王', suit: '', val: 16, id: '小王', isJoker: true, color: 'black' });
    deck.push({ rank: '大王', suit: '', val: 17, id: '大王', isJoker: true, color: 'red' });
    // 洗牌
    for (var i = deck.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    return deck;
}

function _ddzSortHand(hand) {
    hand.sort(function (a, b) { return b.val - a.val || DDZ_SUITS.indexOf(a.suit) - DDZ_SUITS.indexOf(b.suit); });
}

function _ddzCardDisplay(c) {
    if (c.isJoker) return c.rank;
    return c.suit + c.rank;
}

function _ddzCardColor(c) {
    if (c.isJoker) return c.color || 'black';
    return (c.suit === '♥' || c.suit === '♦') ? 'red' : 'black';
}

function ddzStart() {
    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var pl = [];
    pl.push({ id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '', hand: [], isUser: true, isLandlord: false, score: 0, lastPlayed: [], lastAction: '' });
    for (var i = 0; i < _gameSelectedChars.length; i++) {
        var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null;
        if (r) pl.push({ id: r.id, name: r.name || '角色', avatar: r.avatar || '', detail: r.detail || '', hand: [], isUser: false, isLandlord: false, score: 0, lastPlayed: [], lastAction: '' });
    }
    var deck = _ddzBuildDeck();
    // 发牌：每人17张，留3张底牌
    for (var p = 0; p < 3; p++) { pl[p].hand = deck.splice(0, 17); _ddzSortHand(pl[p].hand); }
    var dizhu = deck.splice(0, 3); // 3张底牌

    _ddzState = {
        players: pl,
        dizhuCards: dizhu,       // 底牌
        phase: 'bid',            // bid / play / result
        currentPlayer: Math.floor(Math.random() * 3),
        bidCurrent: -1,          // 当前叫谁
        bidHighest: 0,           // 最高叫分
        bidHighestPlayer: -1,    // 最高叫分的人
        bidCount: 0,             // 已叫次数
        bidStartPlayer: -1,      // 叫地主起始玩家
        landlordIdx: -1,
        lastPlay: null,          // {cards:[], type:'', player: idx}
        lastPlayPlayer: -1,
        passCount: 0,
        turnPlayer: -1,
        multiplier: 1,
        bombCount: 0,
        spring: false,           // 春天
        logs: [],
        selectedCards: [],       // user选中的牌idx
        gameOver: false
    };
    _ddzState.bidCurrent = _ddzState.currentPlayer;
    _ddzState.bidStartPlayer = _ddzState.currentPlayer;
    _ddzLog('新一局开始，等待叫地主...');
    _ddzRender();

    // 如果AI先叫
    if (_ddzState.bidCurrent !== 0) {
        setTimeout(function () { _ddzAiBid(_ddzState.bidCurrent); }, 800);
    }
}

function _ddzLog(msg) { if (_ddzState) _ddzState.logs.push(msg); }

/* ===== 叫地主/抢地主 ===== */
function _ddzUserBid(score) {
    // score: 0=不叫, 1/2/3
    var s = _ddzState; if (!s || s.phase !== 'bid' || s.bidCurrent !== 0) return;
    _ddzProcessBid(0, score);
}

function _ddzAiBid(pIdx) {
    var s = _ddzState; if (!s || s.phase !== 'bid') return;
    var pl = s.players[pIdx];
    // 简单AI：根据手牌质量决定叫分
    var bigCards = 0;
    for (var i = 0; i < pl.hand.length; i++) {
        if (pl.hand[i].val >= 13) bigCards++; // A/2/王
    }
    var score = 0;
    if (bigCards >= 5 && s.bidHighest < 3) score = 3;
    else if (bigCards >= 3 && s.bidHighest < 2) score = Math.max(s.bidHighest + 1, 2);
    else if (bigCards >= 2 && s.bidHighest < 1) score = 1;
    else score = 0; // 不叫
    if (score <= s.bidHighest) score = 0;
    _ddzLog(pl.name + (score > 0 ? ' 叫 ' + score + ' 分' : ' 不叫'));
    _ddzProcessBid(pIdx, score);
}

function _ddzProcessBid(pIdx, score) {
    var s = _ddzState;
    if (score > s.bidHighest) {
        s.bidHighest = score;
        s.bidHighestPlayer = pIdx;
    }
    if (pIdx === 0) {
        _ddzLog(s.players[0].name + (score > 0 ? ' 叫 ' + score + ' 分' : ' 不叫'));
    }
    s.bidCount++;

    // 3分直接成地主
    if (score === 3) {
        _ddzSetLandlord(pIdx);
        return;
    }

    // 3人都叫过了
    if (s.bidCount >= 3) {
        if (s.bidHighestPlayer >= 0) {
            _ddzSetLandlord(s.bidHighestPlayer);
        } else {
            // 没人叫，重新发牌
            _ddzLog('没人叫地主，重新发牌');
            setTimeout(function () { ddzStart(); }, 1500);
        }
        _ddzRender();
        return;
    }

    // 下一个人叫
    s.bidCurrent = (pIdx + 1) % 3;
    _ddzRender();
    if (s.bidCurrent !== 0) {
        setTimeout(function () { _ddzAiBid(s.bidCurrent); }, 600 + Math.random() * 400);
    }
}

function _ddzSetLandlord(pIdx) {
    var s = _ddzState;
    s.landlordIdx = pIdx;
    s.players[pIdx].isLandlord = true;
    s.multiplier = s.bidHighest;
    // 地主拿底牌
    for (var i = 0; i < s.dizhuCards.length; i++) s.players[pIdx].hand.push(s.dizhuCards[i]);
    _ddzSortHand(s.players[pIdx].hand);
    _ddzLog(s.players[pIdx].name + ' 成为地主！底分 ' + s.bidHighest);
    s.phase = 'play';
    s.turnPlayer = pIdx;
    s.lastPlay = null;
    s.lastPlayPlayer = -1;
    s.passCount = 0;
    _ddzRender();

    if (pIdx !== 0) {
        setTimeout(function () { _ddzAiPlay(pIdx); }, 1000);
    }
}

/* ===== 牌型识别 ===== */
function _ddzAnalyze(cards) {
    if (!cards || cards.length === 0) return null;
    var n = cards.length;
    var vals = cards.map(function (c) { return c.val; }).sort(function (a, b) { return a - b; });
    var counts = {};
    for (var i = 0; i < vals.length; i++) counts[vals[i]] = (counts[vals[i]] || 0) + 1;
    var keys = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    var maxCnt = 0; for (var k in counts) { if (counts[k] > maxCnt) maxCnt = counts[k]; }

    // 火箭
    if (n === 2 && vals[0] === 16 && vals[1] === 17) return { type: 'rocket', main: 17, len: 1 };

    // 炸弹
    if (n === 4 && keys.length === 1 && counts[keys[0]] === 4) return { type: 'bomb', main: keys[0], len: 1 };

    // 单张
    if (n === 1) return { type: 'single', main: vals[0], len: 1 };

    // 对子
    if (n === 2 && keys.length === 1) return { type: 'pair', main: keys[0], len: 1 };

    // 三张
    if (n === 3 && keys.length === 1 && counts[keys[0]] === 3) return { type: 'triple', main: keys[0], len: 1 };

    // 三带一
    if (n === 4 && keys.length === 2) {
        for (var i = 0; i < keys.length; i++) {
            if (counts[keys[i]] === 3) return { type: 'triple1', main: keys[i], len: 1 };
        }
    }

    // 三带二
    if (n === 5 && keys.length === 2) {
        var tri = -1, pair = -1;
        for (var i = 0; i < keys.length; i++) {
            if (counts[keys[i]] === 3) tri = keys[i];
            if (counts[keys[i]] === 2) pair = keys[i];
        }
        if (tri >= 0 && pair >= 0) return { type: 'triple2', main: tri, len: 1 };
    }

    // 顺子（>=5张连续，不含2和王）
    if (n >= 5 && keys.length === n) {
        var allSingle = true; for (var k in counts) { if (counts[k] !== 1) { allSingle = false; break; } }
        if (allSingle && keys[keys.length - 1] <= 14) { // <= A
            var isSeq = true; for (var i = 1; i < keys.length; i++) { if (keys[i] !== keys[i - 1] + 1) { isSeq = false; break; } }
            if (isSeq) return { type: 'straight', main: keys[keys.length - 1], len: n };
        }
    }

    // 连对（>=3对连续）
    if (n >= 6 && n % 2 === 0) {
        var allPair = true; for (var k in counts) { if (counts[k] !== 2) { allPair = false; break; } }
        if (allPair && keys.length === n / 2 && keys[keys.length - 1] <= 14) {
            var isSeq = true; for (var i = 1; i < keys.length; i++) { if (keys[i] !== keys[i - 1] + 1) { isSeq = false; break; } }
            if (isSeq) return { type: 'pairSeq', main: keys[keys.length - 1], len: keys.length };
        }
    }

    // 飞机（>=2组连续三张，可带翼）
    var triKeys = [];
    for (var k in counts) { if (counts[k] >= 3) triKeys.push(Number(k)); }
    triKeys.sort(function (a, b) { return a - b; });
    if (triKeys.length >= 2) {
        // 找最长连续三张序列
        for (var start = 0; start < triKeys.length; start++) {
            for (var end = triKeys.length - 1; end > start; end--) {
                var seq = true;
                for (var i = start + 1; i <= end; i++) { if (triKeys[i] !== triKeys[i - 1] + 1 || triKeys[i] > 14) { seq = false; break; } }
                if (!seq) continue;
                var planeLen = end - start + 1;
                var planeCards = planeLen * 3;
                var wingCards = n - planeCards;
                if (wingCards === 0) return { type: 'plane', main: triKeys[end], len: planeLen };
                if (wingCards === planeLen) return { type: 'plane1', main: triKeys[end], len: planeLen }; // 带单
                if (wingCards === planeLen * 2) return { type: 'plane2', main: triKeys[end], len: planeLen }; // 带对
            }
        }
    }

    // 四带二（4+2单 或 4+1对）
    if (keys.length >= 2) {
        for (var i = 0; i < keys.length; i++) {
            if (counts[keys[i]] === 4) {
                var rest = n - 4;
                if (rest === 2) return { type: 'four2', main: keys[i], len: 1 };
                if (rest === 4) {
                    // 两对?
                    var pairCnt = 0;
                    for (var j = 0; j < keys.length; j++) { if (j !== i && counts[keys[j]] === 2) pairCnt++; }
                    if (pairCnt === 2) return { type: 'four2p', main: keys[i], len: 1 };
                }
            }
        }
    }

    return null; // 无效牌型
}

function _ddzCanBeat(prev, curr) {
    if (!prev) return true;
    if (curr.type === 'rocket') return true;
    if (curr.type === 'bomb') {
        if (prev.type === 'rocket') return false;
        if (prev.type === 'bomb') return curr.main > prev.main;
        return true;
    }
    // 同牌型同长度比大小
    if (curr.type !== prev.type || curr.len !== prev.len) return false;
    return curr.main > prev.main;
}

/* ===== 用户出牌 ===== */
function _ddzToggleCard(idx) {
    var s = _ddzState; if (!s || s.phase !== 'play' || s.turnPlayer !== 0) return;
    var sel = s.selectedCards;
    var pos = sel.indexOf(idx);
    if (pos >= 0) sel.splice(pos, 1);
    else sel.push(idx);
    _ddzRender();
}

function _ddzUserPlay() {
    var s = _ddzState; if (!s || s.phase !== 'play' || s.turnPlayer !== 0) return;
    if (s.selectedCards.length === 0) return;
    var pl = s.players[0];
    var cards = [];
    for (var i = 0; i < s.selectedCards.length; i++) {
        cards.push(pl.hand[s.selectedCards[i]]);
    }
    var analysis = _ddzAnalyze(cards);
    if (!analysis) { if (typeof showToast === 'function') showToast('无效牌型'); return; }

    // 检查是否能压过上家
    if (s.lastPlay && s.lastPlayPlayer !== 0) {
        if (!_ddzCanBeat(s.lastPlay, analysis)) { if (typeof showToast === 'function') showToast('管不上'); return; }
    }

    _ddzDoPlay(0, cards, analysis);
}

function _ddzUserPass() {
    var s = _ddzState; if (!s || s.phase !== 'play' || s.turnPlayer !== 0) return;
    if (!s.lastPlay || s.lastPlayPlayer === 0) { if (typeof showToast === 'function') showToast('你是首出，必须出牌'); return; }
    _ddzDoPass(0);
}

function _ddzDoPlay(pIdx, cards, analysis) {
    var s = _ddzState, pl = s.players[pIdx];
    // 从手牌移除
    var ids = {}; for (var i = 0; i < cards.length; i++) ids[cards[i].id] = true;
    pl.hand = pl.hand.filter(function (c) { return !ids[c.id]; });
    s.selectedCards = [];
    pl.lastPlayed = cards.slice(); pl.lastAction = 'play';

    // 记录出牌
    s.lastPlay = analysis;
    s.lastPlay.cards = cards;
    s.lastPlayPlayer = pIdx;
    s.passCount = 0;

    var typeName = { single: '单张', pair: '对子', triple: '三张', triple1: '三带一', triple2: '三带二', straight: '顺子', pairSeq: '连对', plane: '飞机', plane1: '飞机带翼', plane2: '飞机带翼', four2: '四带二', four2p: '四带二对', bomb: '炸弹', rocket: '火箭' };
    var cardStr = cards.map(function (c) { return _ddzCardDisplay(c); }).join(' ');
    _ddzLog(pl.name + ' 出 ' + (typeName[analysis.type] || '') + ': ' + cardStr);

    // 炸弹/火箭翻倍
    if (analysis.type === 'bomb' || analysis.type === 'rocket') {
        s.bombCount++;
        s.multiplier *= 2;
    }

    // 检查胜负
    if (pl.hand.length === 0) {
        _ddzGameOver(pIdx);
        return;
    }

    // 下一个人
    s.turnPlayer = (pIdx + 1) % 3;
    _ddzRender();

    if (s.turnPlayer !== 0) {
        setTimeout(function () { _ddzAiPlay(s.turnPlayer); }, 800 + Math.random() * 600);
    }
}

function _ddzDoPass(pIdx) {
    var s = _ddzState;
    s.players[pIdx].lastPlayed = []; s.players[pIdx].lastAction = 'pass';
    _ddzLog(s.players[pIdx].name + ' 过');
    s.passCount++;

    // 连续2人过牌，轮回到出牌者，自由出
    if (s.passCount >= 2) {
        s.turnPlayer = s.lastPlayPlayer;
        s.lastPlay = null;
        s.passCount = 0;
        _ddzRender();
        if (s.turnPlayer !== 0) {
            setTimeout(function () { _ddzAiPlay(s.turnPlayer); }, 800);
        }
        return;
    }

    s.turnPlayer = (pIdx + 1) % 3;
    _ddzRender();
    if (s.turnPlayer !== 0) {
        setTimeout(function () { _ddzAiPlay(s.turnPlayer); }, 600 + Math.random() * 400);
    }
}

/* ===== AI出牌 ===== */
function _ddzAiPlay(pIdx) {
    var s = _ddzState; if (!s || s.phase !== 'play' || s.turnPlayer !== pIdx) return;
    var pl = s.players[pIdx];

    if (!s.lastPlay || s.lastPlayPlayer === pIdx) {
        // 自由出：出最小的单张
        var card = pl.hand[pl.hand.length - 1];
        var analysis = _ddzAnalyze([card]);
        _ddzDoPlay(pIdx, [card], analysis);
        return;
    }

    // 尝试找能打过上家的牌
    var prev = s.lastPlay;
    var found = _ddzAiFindPlay(pl.hand, prev);
    if (found) {
        var analysis = _ddzAnalyze(found);
        _ddzDoPlay(pIdx, found, analysis);
    } else {
        _ddzDoPass(pIdx);
    }
}

function _ddzAiFindPlay(hand, prev) {
    var type = prev.type;

    // 火箭（始终检查）
    var xw = null, dw = null;
    for (var i = 0; i < hand.length; i++) {
        if (hand[i].rank === '小王') xw = hand[i];
        if (hand[i].rank === '大王') dw = hand[i];
    }

    if (type === 'single') {
        for (var i = hand.length - 1; i >= 0; i--) {
            if (hand[i].val > prev.main) return [hand[i]];
        }
    }

    if (type === 'pair') {
        var counts = _ddzGroupByVal(hand);
        for (var v = prev.main + 1; v <= 15; v++) {
            if (counts[v] && counts[v].length >= 2) return counts[v].slice(0, 2);
        }
    }

    if (type === 'triple' || type === 'triple1' || type === 'triple2') {
        var counts = _ddzGroupByVal(hand);
        for (var v = prev.main + 1; v <= 15; v++) {
            if (counts[v] && counts[v].length >= 3) {
                var tri = counts[v].slice(0, 3);
                if (type === 'triple') return tri;
                if (type === 'triple1') {
                    for (var w in counts) { if (Number(w) !== v && counts[w].length >= 1) return tri.concat([counts[w][0]]); }
                }
                if (type === 'triple2') {
                    for (var w in counts) { if (Number(w) !== v && counts[w].length >= 2) return tri.concat(counts[w].slice(0, 2)); }
                }
            }
        }
    }

    if (type === 'straight') {
        var len = prev.len;
        var singles = _ddzGroupByVal(hand);
        for (var start = prev.main - len + 2; start <= 14 - len + 1; start++) {
            if (start + len - 1 > 14) break;
            if (start + len - 1 <= prev.main) continue;
            var ok = true, cards = [];
            for (var v = start; v < start + len; v++) {
                if (!singles[v] || singles[v].length < 1) { ok = false; break; }
                cards.push(singles[v][0]);
            }
            if (ok) return cards;
        }
    }

    if (type === 'pairSeq') {
        var len = prev.len;
        var groups = _ddzGroupByVal(hand);
        for (var start = prev.main - len + 2; start <= 14 - len + 1; start++) {
            if (start + len - 1 > 14) break;
            if (start + len - 1 <= prev.main) continue;
            var ok = true, cards = [];
            for (var v = start; v < start + len; v++) {
                if (!groups[v] || groups[v].length < 2) { ok = false; break; }
                cards.push(groups[v][0]); cards.push(groups[v][1]);
            }
            if (ok) return cards;
        }
    }

    // 炸弹压（除非上家也是炸弹且更大）
    if (type !== 'rocket') {
        var counts = _ddzGroupByVal(hand);
        for (var v = (type === 'bomb' ? prev.main + 1 : 3); v <= 15; v++) {
            if (counts[v] && counts[v].length >= 4) return counts[v].slice(0, 4);
        }
        // 火箭
        if (xw && dw) return [xw, dw];
    }

    return null;
}

function _ddzGroupByVal(hand) {
    var g = {};
    for (var i = 0; i < hand.length; i++) {
        var v = hand[i].val;
        if (!g[v]) g[v] = [];
        g[v].push(hand[i]);
    }
    return g;
}

/* ===== 胜负结算 ===== */
function _ddzGameOver(winnerIdx) {
    var s = _ddzState;
    var landlord = s.landlordIdx;
    var winnerIsLandlord = (winnerIdx === landlord);

    // 春天检测：地主赢了且农民一张没出 / 农民赢了且地主只出了一手
    var isSpring = false;
    if (winnerIsLandlord) {
        var farmersPlayed = false;
        for (var i = 0; i < 3; i++) {
            if (i !== landlord && s.players[i].hand.length < 17) farmersPlayed = true;
        }
        if (!farmersPlayed) { isSpring = true; s.multiplier *= 2; }
    }

    var baseScore = s.bidHighest * s.multiplier;
    if (winnerIsLandlord) {
        s.players[landlord].score += baseScore * 2;
        for (var i = 0; i < 3; i++) { if (i !== landlord) s.players[i].score -= baseScore; }
        _ddzLog('地主 ' + s.players[landlord].name + ' 赢了！' + (isSpring ? '(春天×2)' : '') + ' +' + (baseScore * 2) + '分');
    } else {
        s.players[landlord].score -= baseScore * 2;
        for (var i = 0; i < 3; i++) { if (i !== landlord) s.players[i].score += baseScore; }
        _ddzLog('农民赢了！' + (isSpring ? '(反春天×2)' : '') + ' 地主 -' + (baseScore * 2) + '分');
    }
    var scStr = ''; for (var si = 0; si < 3; si++) scStr += s.players[si].name + ':' + s.players[si].score + ' ';
    s.phase = 'result';
    s.gameOver = true;
    _ddzRender();
}

/* ===== 渲染 ===== */
function _ddzRender() {
    var el = document.getElementById('gameOverlay'); if (!el || !_ddzState) return;
    var s = _ddzState, h = '';
    var ew = el.offsetWidth || 390, eh = el.offsetHeight || 844;
    var wrapW = eh, wrapH = ew;
    // 横屏容器
    h += '<div class="ls-wrap" style="width:' + wrapW + 'px;height:' + wrapH + 'px;margin-left:-' + (wrapW / 2) + 'px;margin-top:-' + (wrapH / 2) + 'px">';
    // header
    h += '<div class="game-header" style="padding:8px 12px 6px"><div class="game-back" data-ddz-action="quit"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title" style="font-size:11px">斗地主</div><div class="game-header-spacer"></div></div>';

    // 判断当前活跃玩家（叫地主阶段用bidCurrent，出牌阶段用turnPlayer）
    var activeP = -1;
    if (s.phase === 'bid') activeP = s.bidCurrent;
    else if (s.phase === 'play') activeP = s.turnPlayer;

    // 牌桌grid
    h += '<div class="ddz-table-ls">';

    // ---- 左座 char1(players[1]) ----
    var op1 = s.players[1], ia1 = (1 === activeP);
    h += '<div class="ddz-seat ddz-seat-left' + (ia1 ? ' active' : '') + '">';
    h += '<div class="ddz-seat-av" style="width:38px;height:38px">';
    if (op1.avatar) h += '<img src="' + _gEsc(op1.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div><div class="ddz-seat-name">' + _gEsc(op1.name) + '</div>';
    h += '<div class="ddz-seat-cnt">' + op1.hand.length + '张</div>';
    if (s.landlordIdx === 1) h += '<div class="ddz-seat-tag">地主</div>';
    if (op1.lastPlayed && op1.lastPlayed.length > 0) {
        h += '<div class="ddz-seat-played">';
        for (var lp1 = 0; lp1 < op1.lastPlayed.length; lp1++) {
            var c1 = op1.lastPlayed[lp1], r1 = (['♥', '♦'].indexOf(c1.suit) >= 0 || c1.rank === 'Joker');
            h += '<span style="font-size:12px;color:' + (r1 ? '#c9908e' : '#5a4a52') + ';margin:0 2px">' + _gEsc(c1.rank) + (c1.suit || '') + '</span>';
        }
        h += '</div>';
    } else if (op1.lastAction === 'pass') {
        h += '<div class="ddz-seat-played" style="color:rgba(120,100,112,.3)">不出</div>';
    }
    h += '</div>';

    // ---- 右座 char2(players[2]) ----
    var op2 = s.players[2], ia2 = (2 === activeP);
    h += '<div class="ddz-seat ddz-seat-right' + (ia2 ? ' active' : '') + '">';
    h += '<div class="ddz-seat-av" style="width:38px;height:38px">';
    if (op2.avatar) h += '<img src="' + _gEsc(op2.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div><div class="ddz-seat-name">' + _gEsc(op2.name) + '</div>';
    h += '<div class="ddz-seat-cnt">' + op2.hand.length + '张</div>';
    if (s.landlordIdx === 2) h += '<div class="ddz-seat-tag">地主</div>';
    if (op2.lastPlayed && op2.lastPlayed.length > 0) {
        h += '<div class="ddz-seat-played">';
        for (var lp2 = 0; lp2 < op2.lastPlayed.length; lp2++) {
            var c2 = op2.lastPlayed[lp2], r2 = (['♥', '♦'].indexOf(c2.suit) >= 0 || c2.rank === 'Joker');
            h += '<span style="font-size:12px;color:' + (r2 ? '#c9908e' : '#5a4a52') + ';margin:0 2px">' + _gEsc(c2.rank) + (c2.suit || '') + '</span>';
        }
        h += '</div>';
    } else if (op2.lastAction === 'pass') {
        h += '<div class="ddz-seat-played" style="color:rgba(120,100,112,.3)">不出</div>';
    }
    h += '</div>';

    // ---- 中央区 ----
    h += '<div class="ddz-center-ls">';
    h += '<div class="ddz-center-log">';
    var logA = s.logs || [];
    for (var li = Math.max(0, logA.length - 6); li < logA.length; li++) h += _gEsc(logA[li]) + ' ';
    h += '</div>';
    // 底牌
    if (s.diPai && s.diPai.length > 0 && s.phase !== 'bid') {
        h += '<div style="display:flex;gap:2px;justify-content:center;margin:2px 0">';
        for (var dpi = 0; dpi < s.diPai.length; dpi++) {
            var dpcc = s.diPai[dpi], dRed = (['♥', '♦'].indexOf(dpcc.suit) >= 0);
            h += '<div style="width:30px;height:40px;background:#fffefa;border-radius:4px;border:1px solid rgba(160,140,150,.1);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.5">';
            h += '<div style="font-size:12px;color:' + (dRed ? '#c9908e' : '#5a4a52') + '">' + _gEsc(dpcc.rank) + '</div>';
            h += '<div style="font-size:9px;color:' + (dRed ? '#c9908e' : '#5a4a52') + '">' + dpcc.suit + '</div></div>';
        }
        h += '</div>';
    } else if (s.dizhuCards && s.dizhuCards.length > 0 && s.phase !== 'bid') {
        h += '<div style="display:flex;gap:2px;justify-content:center;margin:2px 0">';
        for (var dpi2 = 0; dpi2 < s.dizhuCards.length; dpi2++) {
            var dpcc2 = s.dizhuCards[dpi2], dRed2 = (['♥', '♦'].indexOf(dpcc2.suit) >= 0);
            h += '<div style="width:30px;height:40px;background:#fffefa;border-radius:4px;border:1px solid rgba(160,140,150,.1);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:.5">';
            h += '<div style="font-size:12px;color:' + (dRed2 ? '#c9908e' : '#5a4a52') + '">' + _gEsc(dpcc2.rank) + '</div>';
            h += '<div style="font-size:9px;color:' + (dRed2 ? '#c9908e' : '#5a4a52') + '">' + dpcc2.suit + '</div></div>';
        }
        h += '</div>';
    }
    // user最后出的牌(显示在中央)
    var me = s.players[0];
    if (me.lastPlayed && me.lastPlayed.length > 0) {
        h += '<div style="display:flex;gap:2px;justify-content:center;margin:3px 0">';
        for (var mp = 0; mp < me.lastPlayed.length; mp++) {
            var mc = me.lastPlayed[mp], mRed = (['♥', '♦'].indexOf(mc.suit) >= 0 || mc.rank === 'Joker');
            h += '<span style="font-size:11px;font-weight:600;color:' + (mRed ? '#c9908e' : '#5a4a52') + ';margin:0 1px">' + _gEsc(mc.rank) + (mc.suit || '') + '</span>';
        }
        h += '</div>';
    } else if (me.lastAction === 'pass') {
        h += '<div style="text-align:center;font-size:10px;color:rgba(120,100,112,.3);margin:3px 0">不出</div>';
    }
    h += '</div>';

    // ---- 操作栏 ----
    h += '<div class="ddz-bottom-ls">';
    if (s.phase === 'bid' && s.bidCurrent === 0) {
        h += '<div class="ddz-act-btn" data-ddz-action="bid-0" style="background:rgba(160,140,150,.08);color:#8a7580;border:1px solid rgba(160,140,150,.1);cursor:pointer;border-radius:8px;padding:6px 16px;font-size:11px">不叫</div>';
        for (var bv = 1; bv <= 3; bv++) {
            if (bv >= (s.currentBid || 0) + 1) h += '<div class="ddz-act-btn" data-ddz-action="bid-' + bv + '" style="background:rgba(143,168,197,.12);color:#6a8ab0;border:1px solid rgba(143,168,197,.15);cursor:pointer;border-radius:8px;padding:6px 16px;font-size:11px">' + bv + '分</div>';
        }
    } else if (s.phase === 'play' && s.turnPlayer === 0) {
        h += '<div class="ddz-act-btn" data-ddz-action="play" style="background:rgba(143,168,197,.12);color:#6a8ab0;border:1px solid rgba(143,168,197,.15);cursor:pointer;border-radius:8px;padding:6px 16px;font-size:11px">出牌</div>';
        h += '<div class="ddz-act-btn" data-ddz-action="pass" style="background:rgba(160,140,150,.08);color:#8a7580;border:1px solid rgba(160,140,150,.1);cursor:pointer;border-radius:8px;padding:6px 16px;font-size:11px">不出</div>';
        h += '<div class="ddz-act-btn" data-ddz-action="hint" style="background:rgba(160,140,150,.05);color:rgba(120,100,112,.4);border:1px solid rgba(160,140,150,.06);cursor:pointer;border-radius:8px;padding:6px 16px;font-size:11px">提示</div>';
    }
    h += '</div>';

    // ---- 底部user手牌 ----
    h += '<div class="ddz-hand-ls">';
    h += '<div style="display:flex;align-items:center;gap:5px;padding:2px 6px;font-size:9px;color:#5a4a52">';
    if (me.avatar) h += '<img src="' + _gEsc(me.avatar) + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover">';
    h += '<span style="font-weight:600">' + _gEsc(me.name) + '</span>';
    if (s.landlordIdx === 0) h += '<span style="font-size:7px;padding:1px 4px;border-radius:3px;background:rgba(201,144,142,.15);color:#c9908e">地主</span>';
    h += '<span style="color:rgba(120,100,112,.3)">分:' + me.score + '</span></div>';
    h += '<div class="ddz-hand-ls-cards">';
    for (var ci = 0; ci < me.hand.length; ci++) {
        var c = me.hand[ci], sel = (s.selectedCards && s.selectedCards.indexOf(ci) >= 0);
        var isRed = (['♥', '♦'].indexOf(c.suit) >= 0 || c.rank === 'Joker');
        h += '<div class="ddz-card' + (sel ? ' selected' : '') + '" style="width:38px;height:54px" data-ddz-card="' + ci + '">';
        h += '<div class="ddz-card-rank" style="color:' + (isRed ? '#c9908e' : '#5a4a52') + ';font-size:14px">' + _gEsc(c.rank) + '</div>';
        h += '<div class="ddz-card-suit" style="color:' + (isRed ? '#c9908e' : '#5a4a52') + ';font-size:10px">' + (c.suit || '') + '</div></div>';
    }
    h += '</div></div>';
    h += '</div>'; // /ddz-table-ls

    // 结算
    if (s.gameOver && s.phase === 'result') {
        h += '<div class="ddz-result show"><div class="ddz-result-title">Game Over</div>';
        h += '<div class="ddz-result-scores">';
        for (var ri = 0; ri < 3; ri++) {
            var rp = s.players[ri];
            h += '<div class="ddz-result-row' + (rp.score > 0 ? ' winner' : '') + '"><div class="ddz-result-av" style="width:36px;height:36px">';
            if (rp.avatar) h += '<img src="' + _gEsc(rp.avatar) + '" style="width:100%;height:100%;object-fit:cover">';
            h += '</div><div class="ddz-result-name">' + _gEsc(rp.name) + (s.landlordIdx === ri ? ' 👑' : '') + '</div>';
            h += '<div class="ddz-result-pts' + (rp.score < 0 ? ' neg' : '') + '">' + rp.score + '</div></div>';
        }
        h += '</div><div class="ddz-result-btns">';
        h += '<div class="ddz-result-btn primary" data-ddz-action="again">再来 Again</div>';
        h += '<div class="ddz-result-btn secondary" data-ddz-action="lobby">大厅 Lobby</div>';
        h += '</div></div>';
    }
    h += '</div>'; // /ls-wrap
    el.innerHTML = h;
}

/* ===== 操作处理 ===== */
function _ddzHandleAction(act) {
    var s = _ddzState;
    if (act === 'quit') {
        if (s && s.phase !== 'result') { if (!confirm('确定退出斗地主？')) return; }
        _ddzState = null; gameBackToLobby(); return;
    }
    if (act === 'again') { ddzStart(); return; }
    if (act === 'lobby') { _ddzState = null; gameBackToLobby(); return; }
    if (act === 'play') { _ddzUserPlay(); return; }
    if (act === 'pass') { _ddzUserPass(); return; }
    if (act === 'hint') { _ddzHint(); return; }
    if (act.indexOf('bid-') === 0) { _ddzUserBid(parseInt(act.substring(4))); return; }
}

function _ddzHint() {
    var s = _ddzState; if (!s || s.turnPlayer !== 0) return;
    var pl = s.players[0];
    s.selectedCards = [];

    if (!s.lastPlay || s.lastPlayPlayer === 0) {
        // 自由出：选最小的单张
        s.selectedCards = [pl.hand.length - 1];
    } else {
        var found = _ddzAiFindPlay(pl.hand, s.lastPlay);
        if (found) {
            var ids = {}; for (var i = 0; i < found.length; i++) ids[found[i].id] = true;
            for (var i = 0; i < pl.hand.length; i++) {
                if (ids[pl.hand[i].id]) s.selectedCards.push(i);
            }
        } else {
            if (typeof showToast === 'function') showToast('没有能出的牌');
        }
    }

    function _ddzMiniCard(card) {
        var isRed = (['♥', '♦'].indexOf(card.suit) >= 0 || card.rank === 'Joker');
        var c = isRed ? '#c9908e' : '#5a4a52';
        return '<span style="font-size:7px;color:' + c + ';margin:0 1px">' + _gEsc(card.rank) + (card.suit || '') + '</span>';
    }

    _ddzRender();
}


/* ==========================================
   羊了个羊 SHEEP ENGINE
   ========================================== */
var _sheepState = null;

function sheepStart() {
    var el = document.getElementById('gameOverlay');
    if (!el) return;
    _sheepState = _sheepInitLevel();
    _sheepRender();
}

function _sheepInitLevel() {
    // 难度提升：16种图案，每种15张（15÷3=5组消除），共240张
    // 5层堆叠，层间错位更密集，遮挡更多，卡槽仅7格
    var ICONS = ['🍎', '🍊', '🍋', '🍇', '🍓', '🌸', '🍰', '☕', '🎀', '💎', '🌙', '⭐', '🍌', '🥥', '🍑', '🎵'];
    var pool = [];
    for (var i = 0; i < ICONS.length; i++) {
        for (var j = 0; j < 15; j++) pool.push(ICONS[i]);
    }
    // Fisher-Yates 洗牌
    for (var k = pool.length - 1; k > 0; k--) {
        var r = Math.floor(Math.random() * (k + 1));
        var tmp = pool[k]; pool[k] = pool[r]; pool[r] = tmp;
    }
    // 5层布局，总格数 = 48+48+48+48+48 = 240，恰好容纳全部240张
    // 每层 6行×8列 = 48格，层间用不同偏移制造大量遮挡
    var layerConfigs = [
        { rows: 6, cols: 8, rowOff: 0, colOff: 0 }, // 底层
        { rows: 6, cols: 8, rowOff: 0.5, colOff: 0.5 }, // 第2层错位
        { rows: 6, cols: 8, rowOff: 0, colOff: 0 }, // 第3层同底
        { rows: 6, cols: 8, rowOff: 0.5, colOff: 0.5 }, // 第4层错位
        { rows: 6, cols: 8, rowOff: 0.25, colOff: 0.25 }  // 顶层斜插，遮挡最多
    ];
    var allTiles = [];
    var idx = 0;
    for (var li = 0; li < layerConfigs.length; li++) {
        var cfg = layerConfigs[li];
        for (var ro = 0; ro < cfg.rows; ro++) {
            for (var co = 0; co < cfg.cols; co++) {
                if (idx < pool.length) {
                    allTiles.push({
                        icon: pool[idx++],
                        row: ro + cfg.rowOff,
                        col: co + cfg.colOff,
                        layer: li,
                        id: idx
                    });
                }
            }
        }
    }
    return {
        tiles: allTiles,
        slot: [],
        maxSlot: 7,      // 卡槽保持7格，难度保证
        helpUsed: false,
        helpChar: null,
        helpMsg: '',
        showHelp: false,
        showCharPick: false,
        gameOver: false,
        win: false
    };
}

function _sheepIsTileBlocked(tile, allTiles) {
    // 被更高层的牌遮挡 = 有重叠区域的更高层牌
    for (var i = 0; i < allTiles.length; i++) {
        var t = allTiles[i];
        if (t.id === tile.id) continue;
        if (t.layer <= tile.layer) continue;
        // 检查是否有重叠(每张牌占1x1的格子)
        if (Math.abs(t.row - tile.row) < 1 && Math.abs(t.col - tile.col) < 1) {
            return true;
        }
    }
    return false;
}

function _sheepClickTile(tileId) {
    if (!_sheepState || _sheepState.gameOver) return;
    var s = _sheepState;
    // 找到这张牌
    var tileIdx = -1;
    for (var i = 0; i < s.tiles.length; i++) {
        if (s.tiles[i].id === tileId) { tileIdx = i; break; }
    }
    if (tileIdx === -1) return;
    var tile = s.tiles[tileIdx];
    // 检查是否被遮挡
    if (_sheepIsTileBlocked(tile, s.tiles)) return;
    // 从场上移除
    s.tiles.splice(tileIdx, 1);
    // 加入卡槽（插入到同icon的旁边）
    var insertPos = s.slot.length;
    for (var j = 0; j < s.slot.length; j++) {
        if (s.slot[j].icon === tile.icon) {
            // 找到同类，插到后面
            insertPos = j + 1;
            while (insertPos < s.slot.length && s.slot[insertPos].icon === tile.icon) insertPos++;
            break;
        }
    }
    s.slot.splice(insertPos, 0, tile);
    // 检查消除：找3张相同的
    _sheepCheckEliminate();
    // 检查胜负
    if (s.tiles.length === 0 && s.slot.length === 0) {
        s.gameOver = true; s.win = true;
    } else if (s.slot.length >= s.maxSlot) {
        // 再检查一次是否有可消除的
        _sheepCheckEliminate();
        if (s.slot.length >= s.maxSlot) {
            s.gameOver = true; s.win = false;
        }
    }
    _sheepRender();
}

function _sheepCheckEliminate() {
    var s = _sheepState;
    var changed = true;
    while (changed) {
        changed = false;
        var counts = {};
        for (var i = 0; i < s.slot.length; i++) {
            var icon = s.slot[i].icon;
            if (!counts[icon]) counts[icon] = [];
            counts[icon].push(i);
        }
        for (var key in counts) {
            if (counts[key].length >= 3) {
                // 移除前3个
                var toRemove = counts[key].slice(0, 3);
                toRemove.sort(function (a, b) { return b - a; });
                for (var r = 0; r < toRemove.length; r++) {
                    s.slot.splice(toRemove[r], 1);
                }
                changed = true;
                break;
            }
        }
    }
}

function _sheepUseHelp() {
    if (!_sheepState || _sheepState.helpUsed) return;
    _sheepState.showCharPick = true;
    _sheepRender();
}

function _sheepPickHelpChar(charId) {
    if (!_sheepState) return;
    var s = _sheepState;
    var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    var char = null;
    for (var i = 0; i < roles.length; i++) {
        if (roles[i].id === charId) { char = roles[i]; break; }
    }
    if (!char) return;
    s.helpUsed = true;
    s.helpChar = char;
    s.showCharPick = false;

    // 根据人设随机生成一句话
    var encouraging = [
        '加油哦，我相信你可以的~',
        '别着急，慢慢来！',
        '你比你想的厉害多了！',
        '坚持住，胜利就在眼前！',
        '我看好你，冲！',
        '深呼吸，你能行的~',
        '这关不难的，放轻松~'
    ];
    var sarcastic = [
        '就这？你认真的吗...',
        '这都过不了也太菜了吧',
        '我要是你就不玩了',
        '哈哈哈你是故意输的吧',
        '需要我帮你按吗？',
        '算了，帮帮你这个笨蛋',
        '你的手是用来干嘛的？'
    ];
    var calm = [
        '先看看有没有三张一样的',
        '试试从顶层开始消',
        '注意卡槽别满了',
        '同一种图案尽量一起拿',
        '别乱点，想好再拿',
        '优先消掉层数多的那堆',
        '留意被压住的牌'
    ];
    // 混合所有语句，随机选
    var allMsgs = encouraging.concat(sarcastic).concat(calm);
    var msg = allMsgs[Math.floor(Math.random() * allMsgs.length)];

    // 如果角色有detail/description，加个性化前缀
    var name = char.name || '???';
    s.helpMsg = msg;
    s.showHelp = true;

    // ★ 修复：移除卡槽中出现次数不足3张的那种牌（避免凑不成组导致永久卡死）
    // 统计卡槽中各图案数量
    if (s.slot.length > 0) {
        var slotCounts = {};
        for (var sc = 0; sc < s.slot.length; sc++) {
            var ic = s.slot[sc].icon;
            slotCounts[ic] = (slotCounts[ic] || 0) + 1;
        }
        // 优先选不足3张的图案的牌放回去（这些牌留在槽里也消不掉）
        var removeIdx = -1;
        for (var si2 = 0; si2 < s.slot.length; si2++) {
            if (slotCounts[s.slot[si2].icon] < 3) { removeIdx = si2; break; }
        }
        // 如果都够3张，则移除最后一张（腾出空间）
        if (removeIdx === -1) removeIdx = s.slot.length - 1;
        var removed = s.slot.splice(removeIdx, 1)[0];
        removed.layer = 4;
        removed.row = 0.5 + Math.floor(Math.random() * 4);
        removed.col = Math.floor(Math.random() * 5);
        removed.id = Date.now();
        s.tiles.push(removed);
    }

    _sheepRender();
}

function _sheepCloseHelp() {
    if (!_sheepState) return;
    _sheepState.showHelp = false;
    _sheepRender();
}

function _sheepRestart() {
    _sheepState = _sheepInitLevel();
    _sheepRender();
}

function _sheepBackToLobby() {
    _sheepState = null;
    _gameView = 'lobby';
    var el = document.getElementById('gameOverlay');
    if (el) el.innerHTML = gameBuildLobby();
}

function _sheepRender() {
    var el = document.getElementById('gameOverlay');
    if (!el || !_sheepState) return;
    var s = _sheepState;
    var h = '';
    // header
    h += '<div class="game-header"><div class="game-back" onclick="_sheepBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">SHEEP 羊了个羊</div><div class="game-header-spacer"></div></div>';

    h += '<div class="sheep-game">';

    // 顶部信息栏
    h += '<div class="sheep-info">';
    h += '<div class="sheep-remaining">剩余 <span>' + s.tiles.length + '</span> 张</div>';
    h += '<div class="sheep-btns">';
    if (!s.helpUsed && !s.gameOver) {
        h += '<div class="sheep-help-btn" onclick="_sheepUseHelp()"><svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>求助角色</div>';
    } else if (s.helpUsed) {
        h += '<div class="sheep-help-used">已求助 ✓</div>';
    }
    h += '<div class="sheep-restart-btn" onclick="_sheepRestart()">重来</div>';
    h += '</div></div>';

    // 牌桌区
    // 每张牌 cellW×cellH，8列×6行，总宽 = 8*cellW + 额外层偏移
    // 用 cellW=40, cellH=44，8列总宽=320px，外加最大层偏移(0.5*40=20)=340px
    var cellW = 40, cellH = 44;
    var boardCols = 8, boardRows = 6;
    // board 实际宽高：多出半格偏移量 + 边距
    var boardW = boardCols * cellW + Math.ceil(cellW * 0.5) + 8;  // ~368px
    var boardH = boardRows * cellH + Math.ceil(cellH * 0.5) + 8;  // ~294px
    h += '<div class="sheep-board" id="sheepBoard" style="position:relative;width:' + boardW + 'px;height:' + boardH + 'px;margin:8px auto 0;flex-shrink:0">';
    var sorted = s.tiles.slice().sort(function (a, b) {
        if (a.layer !== b.layer) return a.layer - b.layer;
        if (a.row !== b.row) return a.row - b.row;
        return a.col - b.col;
    });
    for (var i = 0; i < sorted.length; i++) {
        var t = sorted[i];
        var blocked = _sheepIsTileBlocked(t, s.tiles);
        var topPx = t.row * cellH + 4;
        var leftPx = t.col * cellW + 4;
        var zIdx = t.layer * 100 + Math.floor(t.row * 10) + Math.floor(t.col);
        var shadow = t.layer === 0 ? 'none' : '0 ' + t.layer + 'px ' + (t.layer * 3) + 'px rgba(0,0,0,.10)';
        var brightness = blocked ? '0.65' : '1';
        h += '<div class="sheep-tile' + (blocked ? ' blocked' : '') + '" ';
        h += 'style="position:absolute;width:' + (cellW - 2) + 'px;height:' + (cellH - 2) + 'px;line-height:' + (cellH - 2) + 'px;font-size:22px;text-align:center;';
        h += 'top:' + topPx + 'px;left:' + leftPx + 'px;z-index:' + zIdx + ';box-shadow:' + shadow + ';filter:brightness(' + brightness + ');" ';
        if (!blocked) h += 'onclick="_sheepClickTile(' + t.id + ')" ';
        h += '>' + t.icon + '</div>';
    }
    h += '</div>';

    // 卡槽
    h += '<div class="sheep-slot" style="display:flex;justify-content:center;gap:4px;padding:8px 12px;flex-wrap:nowrap">';
    for (var j = 0; j < s.maxSlot; j++) {
        if (j < s.slot.length) {
            var sc = s.slot[j];
            h += '<div class="sheep-slot-cell filled">' + sc.icon + '</div>';
        } else {
            h += '<div class="sheep-slot-cell empty"></div>';
        }
    }
    h += '</div>';

    h += '</div>'; // /sheep-game

    // 角色选择弹窗
    if (s.showCharPick) {
        h += '<div class="sheep-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center">';
        h += '<div class="sheep-modal" style="position:relative;z-index:10000;max-height:80vh;overflow-y:auto">';
        h += '<div class="sheep-modal-title">选择求助角色</div>';
        h += '<div class="sheep-modal-sub">选一个角色帮你~每局只能求助一次</div>';
        h += '<div class="sheep-char-list">';
        var roles = (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
        if (!roles.length) {
            h += '<div style="font-size:11px;color:rgba(120,100,112,.35);padding:16px;text-align:center">暂无角色<br>请先在聊天App中创建</div>';
        }
        for (var ci = 0; ci < roles.length; ci++) {
            var cr = roles[ci];
            h += '<div class="sheep-char-item" onclick="_sheepPickHelpChar(\'' + _gEsc(cr.id) + '\')">';
            h += '<div class="sheep-char-av">';
            if (cr.avatar) h += '<img src="' + _gEsc(cr.avatar) + '">';
            else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
            h += '</div><div class="sheep-char-name">' + _gEsc(cr.name || '???') + '</div></div>';
        }
        h += '</div>';
        h += '<div class="sheep-modal-cancel" onclick="_sheepState.showCharPick=false;_sheepRender()">取消</div>';
        h += '</div></div>';
    }

    // 帮助消息弹窗
    if (s.showHelp && s.helpChar) {
        h += '<div class="sheep-overlay" onclick="_sheepCloseHelp()" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center">';
        h += '<div class="sheep-help-bubble" onclick="event.stopPropagation()" style="position:relative;z-index:10000">';
        h += '<div class="sheep-help-avatar">';
        if (s.helpChar.avatar) h += '<img src="' + _gEsc(s.helpChar.avatar) + '">';
        h += '</div>';
        h += '<div class="sheep-help-name">' + _gEsc(s.helpChar.name || '???') + '</div>';
        h += '<div class="sheep-help-msg">"' + _gEsc(s.helpMsg) + '"</div>';
        h += '<div class="sheep-help-effect">已将卡槽最左边的牌放回场上~</div>';
        h += '<div class="sheep-help-close" onclick="_sheepCloseHelp()">知道了</div>';
        h += '</div></div>';
    }

    // 胜负弹窗
    if (s.gameOver) {
        h += '<div class="sheep-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center">';
        h += '<div class="sheep-result" style="position:relative;z-index:10000">';
        if (s.win) {
            h += '<div class="sheep-result-icon">🎉</div>';
            h += '<div class="sheep-result-title">通关成功！</div>';
            h += '<div class="sheep-result-sub">你真厉害~所有牌都消完了</div>';
        } else {
            h += '<div class="sheep-result-icon">😢</div>';
            h += '<div class="sheep-result-title">挑战失败</div>';
            h += '<div class="sheep-result-sub">卡槽满了...再试一次吧</div>';
        }
        h += '<div class="sheep-result-btns">';
        h += '<div class="sheep-result-btn primary" onclick="_sheepRestart()">再来一局</div>';
        h += '<div class="sheep-result-btn secondary" onclick="_sheepBackToLobby()">返回大厅</div>';
        h += '</div></div></div>';
    }

    el.innerHTML = h;
}

/* ==========================================
   海龟汤 TURTLE SOUP ENGINE
   ========================================== */

function turtleStart() {
    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var r = (typeof findRole === 'function' && _gameSelectedChars[0]) ? findRole(_gameSelectedChars[0]) : null;
    if (!r) { if (typeof showToast === 'function') showToast('请选择一个角色作为出题人'); return; }

    _turtleState = {
        host: { name: r.name || '出题人', avatar: r.avatar || '', detail: r.detail || '', id: r.id },
        player: { name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '' },
        phase: 'loading', // loading → playing → reveal
        surface: '',      // 汤面（谜题）
        bottom: '',       // 汤底（答案）
        qas: [],          // [{q, a, type}]  type: yes/no/irrelevant
        inputText: '',
        generating: false,
        revealed: false
    };
    _turtleRender();
    _turtleGenPuzzle();
}

function _turtleGenPuzzle() {
    var s = _turtleState; if (!s) return;
    s.phase = 'loading'; s.generating = true; _turtleRender();

    var sysPrompt = '你是一个海龟汤出题人。海龟汤是一种情景推理游戏：你给出一个看似荒诞的简短故事（汤面），玩家通过提问是非题来还原真相（汤底）。\n\n请生成一道海龟汤题目。要求：\n1. 汤面要简短（2-4句话），情景怪异但有逻辑\n2. 汤底要合理，能解释汤面的所有怪异之处\n3. 难度适中，需要5-15个问题才能猜到\n\n请严格按以下JSON格式回复，不要添加任何其他内容：\n{"surface":"汤面内容","bottom":"汤底内容"}';

    if (s.host.detail) {
        sysPrompt += '\n\n你的角色设定：' + s.host.detail.substring(0, 500);
    }

    var apiUrl = '', apiKey = '', model = '';
    try {
        apiUrl = localStorage.getItem('ds_api_url') || '';
        apiKey = localStorage.getItem('ds_api_key') || '';
        model = localStorage.getItem('ds_api_model') || 'gpt-3.5-turbo';
    } catch (e) { }

    if (!apiUrl || !apiKey) {
        s.surface = '一个男人走进餐厅，点了一碗海龟汤，喝了一口后突然哭了起来，然后走出餐厅，第二天他被发现死在了家中。为什么？';
        s.bottom = '这个男人曾经和朋友在海上遇难漂流，朋友告诉他这是海龟汤让他喝下去活命。但来到餐厅喝到真正的海龟汤后，他发现味道完全不同，这才明白当年喝的是朋友用自己的肉做的汤。他无法承受真相，选择了自杀。';
        s.phase = 'playing'; s.generating = false; _turtleRender();
        return;
    }

    var body = {
        model: model,
        messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: '请出一道海龟汤题目。' }
        ],
        temperature: 0.9,
        max_tokens: 800
    };

    fetch(apiUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify(body)
    }).then(function (r) { return r.json(); }).then(function (data) {
        if (!_turtleState) return;
        var text = '';
        try { text = data.choices[0].message.content.trim(); } catch (e) { }
        try {
            var jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                var obj = JSON.parse(jsonMatch[0]);
                s.surface = obj.surface || '解析失败';
                s.bottom = obj.bottom || '未知答案';
            } else {
                s.surface = text || '生成失败，请重试';
                s.bottom = '（AI未能按格式生成）';
            }
        } catch (e) {
            s.surface = text || '生成失败';
            s.bottom = '（解析错误）';
        }
        s.phase = 'playing'; s.generating = false; _turtleRender();
    }).catch(function (e) {
        if (!_turtleState) return;
        s.surface = '一个女孩在生日那天收到了一双红色的鞋子，她非常开心。但第二天，她把鞋子扔到了河里。为什么？';
        s.bottom = '那双鞋是她失踪的妈妈最喜欢的款式。她收到后以为妈妈回来了，到处找却找不到人。后来她发现鞋是爸爸的新女友买的，只是碰巧款式一样。她愤怒又失望，把鞋扔进了河里。';
        s.phase = 'playing'; s.generating = false; _turtleRender();
    });
}

function _turtleAsk(question) {
    var s = _turtleState; if (!s || s.phase !== 'playing' || s.generating) return;
    if (!question.trim()) return;

    s.generating = true;
    s.qas.push({ q: question, a: '思考中...', type: 'pending' });
    s.inputText = '';
    _turtleRender();

    var sysPrompt = '你是海龟汤的出题人。\n汤面：' + s.surface + '\n汤底：' + s.bottom +
        '\n\n玩家在通过提问来猜测真相。你只能回答以下几种：\n- "是" — 如果问题与汤底相符\n- "不是" — 如果问题与汤底不符\n- "不相关" — 如果问题与汤底没有关系\n- "是，但不完全是" — 如果部分正确\n- "接近了！" — 如果非常接近真相\n\n只回复上述关键词之一，最多加一句简短的引导提示（不要透露答案）。如果玩家基本猜对了全部真相，回复"恭喜你猜对了！🎉"并简短确认。';

    if (s.host.detail) sysPrompt += '\n\n你的性格设定（融入到回复语气中）：' + s.host.detail.substring(0, 300);

    var msgs = [{ role: 'system', content: sysPrompt }];
    for (var i = 0; i < s.qas.length - 1; i++) {
        msgs.push({ role: 'user', content: s.qas[i].q });
        msgs.push({ role: 'assistant', content: s.qas[i].a });
    }
    msgs.push({ role: 'user', content: question });

    var apiUrl = '', apiKey = '', model = '';
    try {
        apiUrl = localStorage.getItem('ds_api_url') || '';
        apiKey = localStorage.getItem('ds_api_key') || '';
        model = localStorage.getItem('ds_api_model') || 'gpt-3.5-turbo';
    } catch (e) { }

    if (!apiUrl || !apiKey) {
        var lastQA = s.qas[s.qas.length - 1];
        var answers = ['是', '不是', '不相关', '是，但不完全是'];
        lastQA.a = answers[Math.floor(Math.random() * answers.length)];
        lastQA.type = lastQA.a.indexOf('是') === 0 ? 'yes' : (lastQA.a === '不是' ? 'no' : 'irrelevant');
        s.generating = false; _turtleRender(); return;
    }

    fetch(apiUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({ model: model, messages: msgs, temperature: 0.3, max_tokens: 150 })
    }).then(function (r) { return r.json(); }).then(function (data) {
        if (!_turtleState) return;
        var answer = '';
        try { answer = data.choices[0].message.content.trim(); } catch (e) { answer = '（回复失败）'; }
        var lastQA = s.qas[s.qas.length - 1];
        lastQA.a = answer;
        if (answer.indexOf('恭喜') >= 0 || answer.indexOf('猜对') >= 0) lastQA.type = 'correct';
        else if (answer.indexOf('是') === 0 || answer.indexOf('对') === 0) lastQA.type = 'yes';
        else if (answer.indexOf('不是') >= 0 || answer.indexOf('不对') >= 0) lastQA.type = 'no';
        else if (answer.indexOf('接近') >= 0) lastQA.type = 'close';
        else lastQA.type = 'irrelevant';
        s.generating = false; _turtleRender();
        // 自动滚到底
        var chatEl = document.getElementById('turtleChatArea');
        if (chatEl) setTimeout(function () { chatEl.scrollTop = chatEl.scrollHeight; }, 50);
    }).catch(function () {
        if (!_turtleState) return;
        var lastQA = s.qas[s.qas.length - 1];
        lastQA.a = '（网络错误）'; lastQA.type = 'irrelevant';
        s.generating = false; _turtleRender();
    });
}

function _turtleAction(act) {
    var s = _turtleState; if (!s) return;
    if (act === 'send') {
        var inp = document.getElementById('turtleInput');
        var txt = inp ? inp.value.trim() : '';
        if (txt) _turtleAsk(txt);
    }
    if (act === 'reveal') { s.revealed = true; _turtleRender(); }
    if (act === 'hide') { s.revealed = false; _turtleRender(); }
    if (act === 'newgame') { turtleStart(); }
    if (act === 'back') { gameBackToLobby(); }
}

function _turtleRender() {
    var s = _turtleState; if (!s) return;
    var el = document.getElementById('gameOverlay'); if (!el) return;
    var h = '<div class="game-header"><div class="game-back" onclick="gameBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">TURTLE SOUP 海龟汤</div><div class="game-header-spacer"></div></div>';

    h += '<div class="turtle-game">';

    /* 出题人信息 */
    h += '<div class="turtle-host">';
    h += '<div class="turtle-host-av">';
    if (s.host.avatar) h += '<img src="' + _gEsc(s.host.avatar) + '">';
    else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    h += '</div>';
    h += '<div class="turtle-host-info"><div class="turtle-host-name">出题人 · ' + _gEsc(s.host.name) + '</div><div class="turtle-host-tag">🐢 海龟汤 Lateral Thinking Puzzle</div></div>';
    h += '</div>';

    if (s.phase === 'loading') {
        h += '<div class="turtle-loading"><div class="turtle-loading-icon">🐢</div><div class="turtle-loading-text">正在生成谜题...</div></div>';
    } else {
        /* 汤面 */
        h += '<div class="turtle-surface"><div class="turtle-surface-label">🍜 汤面 Surface</div><div class="turtle-surface-text">' + _gEsc(s.surface) + '</div></div>';

        /* 汤底 */
        if (s.revealed) {
            h += '<div class="turtle-bottom"><div class="turtle-bottom-label">🥣 汤底 Truth</div><div class="turtle-bottom-text">' + _gEsc(s.bottom) + '</div>';
            h += '<div class="turtle-bottom-hide" data-turtle-action="hide">收起汤底</div></div>';
        }

        /* 问答区 */
        h += '<div class="turtle-chat" id="turtleChatArea">';
        for (var i = 0; i < s.qas.length; i++) {
            var qa = s.qas[i];
            // 玩家问
            h += '<div class="turtle-msg player">';
            h += '<div class="turtle-msg-bubble player">Q' + (i + 1) + ': ' + _gEsc(qa.q) + '</div>';
            h += '</div>';
            // 出题人答
            var typeClass = qa.type || 'pending';
            h += '<div class="turtle-msg host">';
            h += '<div class="turtle-msg-av">';
            if (s.host.avatar) h += '<img src="' + _gEsc(s.host.avatar) + '">';
            else h += '🐢';
            h += '</div>';
            h += '<div class="turtle-msg-bubble host ' + typeClass + '">' + _gEsc(qa.a) + '</div>';
            h += '</div>';
        }
        if (s.qas.length === 0) {
            h += '<div class="turtle-hint">开始提问吧！只能问是/否的问题 🐢</div>';
        }
        h += '</div>';

        /* 输入 + 按钮 */
        h += '<div class="turtle-input-bar">';
        h += '<input type="text" class="turtle-input" id="turtleInput" placeholder="提一个是/否问题..." value="' + _gEsc(s.inputText) + '" ' + (s.generating ? 'disabled' : '') + ' onkeydown="if(event.key===\'Enter\'){_turtleAction(\'send\')}">';
        h += '<div class="turtle-send-btn" data-turtle-action="send">' + (s.generating ? '⏳' : '➤') + '</div>';
        h += '</div>';

        h += '<div class="turtle-actions">';
        if (!s.revealed) h += '<div class="turtle-action-btn" data-turtle-action="reveal">👁 查看汤底</div>';
        h += '<div class="turtle-action-btn" data-turtle-action="newgame">🔄 新题目</div>';
        h += '<div class="turtle-action-btn" data-turtle-action="back">🚪 返回大厅</div>';
        h += '</div>';
    }

    h += '</div>';
    el.innerHTML = h;

    // 自动聚焦
    var inp = document.getElementById('turtleInput');
    if (inp && !s.generating) setTimeout(function () { inp.focus(); }, 100);

    // 自动滚底
    var chatEl = document.getElementById('turtleChatArea');
    if (chatEl) setTimeout(function () { chatEl.scrollTop = chatEl.scrollHeight; }, 50);
}

/* ==========================================
   飞行棋 LUDO ENGINE
   ========================================== */
var LUDO_COLORS = ['red', 'yellow', 'blue', 'green'];
var LUDO_COLOR_CN = { red: '红', yellow: '黄', blue: '蓝', green: '绿' };
var LUDO_COLOR_HEX = { red: '#d4756a', yellow: '#d4b86a', blue: '#6a9fd4', green: '#6abd8a' };
var LUDO_TRACK_LEN = 52; // 主跑道总格
var LUDO_HOME_LEN = 6;   // 终点走廊长度（含终点）

/* 每个颜色的起飞点在主跑道上的位置 */
var LUDO_START = { red: 0, yellow: 13, blue: 26, green: 39 };

function ludoStart() {
    var persona = (typeof findPersona === 'function') ? findPersona(_gameSelectedPersona) : null;
    var numOpponents = _gameSelectedChars.length;
    if (numOpponents < 1) { if (typeof showToast === 'function') showToast('至少选择1个对手'); return; }

    var numPlayers = numOpponents + 1;
    var colorAssign = LUDO_COLORS.slice(0, numPlayers);

    var players = [];
    // 玩家
    players.push({
        id: 'user', name: (persona && persona.name) || '我', avatar: (persona && persona.avatar) || '',
        color: colorAssign[0], isUser: true,
        planes: [
            { pos: -1, home: false, homePos: -1, finished: false },
            { pos: -1, home: false, homePos: -1, finished: false },
            { pos: -1, home: false, homePos: -1, finished: false },
            { pos: -1, home: false, homePos: -1, finished: false }
        ]
    });
    // 对手
    for (var i = 0; i < numOpponents; i++) {
        var r = (typeof findRole === 'function') ? findRole(_gameSelectedChars[i]) : null;
        players.push({
            id: r ? r.id : ('ai' + i), name: r ? (r.name || '角色') : ('角色' + (i + 1)), avatar: r ? (r.avatar || '') : '',
            color: colorAssign[i + 1], isUser: false,
            planes: [
                { pos: -1, home: false, homePos: -1, finished: false },
                { pos: -1, home: false, homePos: -1, finished: false },
                { pos: -1, home: false, homePos: -1, finished: false },
                { pos: -1, home: false, homePos: -1, finished: false }
            ]
        });
    }

    _ludoState = {
        players: players,
        currentPlayer: 0,
        dice: 0,
        phase: 'roll',      // roll → pick → animating → done
        logs: [],
        consecutiveSixes: 0,
        winner: -1,
        needPick: false,
        movablePlanes: []
    };

    _ludoLog(players[0].name + '(' + LUDO_COLOR_CN[players[0].color] + ') 先手');
    _ludoRender();
}

/* 掷骰子 */
function _ludoRollDice(playerIdx) {
    var s = _ludoState; if (!s || s.phase !== 'roll') return;
    var dice = Math.floor(Math.random() * 6) + 1;
    s.dice = dice;
    var pl = s.players[playerIdx];
    _ludoLog(pl.name + ' 掷出了 ' + dice + ' 点');

    // 检查连续三次6
    if (dice === 6) {
        s.consecutiveSixes++;
        if (s.consecutiveSixes >= 3) {
            _ludoLog(pl.name + ' 连续3次6点！所有在跑道上的飞机返回基地 ✈️→🏠');
            for (var i = 0; i < 4; i++) {
                if (!pl.planes[i].finished && pl.planes[i].pos >= 0) {
                    pl.planes[i].pos = -1;
                    pl.planes[i].home = false;
                    pl.planes[i].homePos = -1;
                }
            }
            s.consecutiveSixes = 0;
            _ludoNextTurn();
            return;
        }
    } else {
        s.consecutiveSixes = 0;
    }

    // 找可移动的飞机
    var movable = _ludoGetMovable(playerIdx, dice);

    if (movable.length === 0) {
        _ludoLog(pl.name + ' 无法移动');
        if (dice === 6) {
            s.phase = 'roll'; _ludoRender();
            if (!pl.isUser) setTimeout(function () { if (_ludoState) _ludoAiTurn(); }, 1000);
        } else {
            _ludoNextTurn();
        }
        return;
    }

    s.movablePlanes = movable;
    if (movable.length === 1) {
        // 只有一架可动，自动选
        _ludoMovePlane(playerIdx, movable[0], dice);
    } else {
        // 需要玩家选择
        s.needPick = true;
        s.phase = 'pick';
        _ludoRender();
        if (!pl.isUser) {
            setTimeout(function () { if (_ludoState) _ludoAiPick(); }, 800);
        }
    }
}

function _ludoGetMovable(playerIdx, dice) {
    var s = _ludoState, pl = s.players[playerIdx];
    var start = LUDO_START[pl.color];
    var movable = [];

    for (var i = 0; i < 4; i++) {
        var p = pl.planes[i];
        if (p.finished) continue;

        if (p.pos === -1) {
            // 在基地，需要6点起飞
            if (dice === 6) movable.push(i);
        } else if (p.home) {
            // 在终点走廊
            var newHP = p.homePos + dice;
            if (newHP < LUDO_HOME_LEN) movable.push(i); // 可以前进
            else if (newHP === LUDO_HOME_LEN - 1) movable.push(i); // 精确到终点
            // 超过就不能走（反弹也可以）
            else movable.push(i); // 允许反弹
        } else {
            // 在主跑道
            var steps = _ludoStepsFromStart(pl.color, p.pos);
            if (steps + dice >= LUDO_TRACK_LEN) {
                // 要进终点走廊
                var homeSteps = steps + dice - LUDO_TRACK_LEN;
                movable.push(i); // 允许尝试
            } else {
                movable.push(i);
            }
        }
    }
    return movable;
}

function _ludoStepsFromStart(color, absPos) {
    var start = LUDO_START[color];
    return (absPos - start + LUDO_TRACK_LEN) % LUDO_TRACK_LEN;
}

function _ludoMovePlane(playerIdx, planeIdx, dice) {
    var s = _ludoState, pl = s.players[playerIdx];
    var p = pl.planes[planeIdx];
    var start = LUDO_START[pl.color];

    s.needPick = false;
    s.phase = 'animating';

    if (p.pos === -1) {
        // 起飞
        p.pos = start;
        _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机起飞 ✈️');
        _ludoCheckCapture(playerIdx, planeIdx);
        _ludoAfterMove(playerIdx, dice);
        return;
    }

    if (p.home) {
        // 终点走廊内移动
        var newHP = p.homePos + dice;
        if (newHP >= LUDO_HOME_LEN - 1) {
            if (newHP === LUDO_HOME_LEN - 1) {
                p.homePos = LUDO_HOME_LEN - 1;
                p.finished = true;
                _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机到达终点 🎉');
            } else {
                // 反弹
                var over = newHP - (LUDO_HOME_LEN - 1);
                p.homePos = (LUDO_HOME_LEN - 1) - over;
                _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机反弹了');
            }
        } else {
            p.homePos = newHP;
            _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机在走廊前进 ' + dice + ' 步');
        }
        _ludoAfterMove(playerIdx, dice);
        return;
    }

    // 主跑道移动
    var steps = _ludoStepsFromStart(pl.color, p.pos);
    var newSteps = steps + dice;

    if (newSteps >= LUDO_TRACK_LEN) {
        // 进入终点走廊
        var homeSteps = newSteps - LUDO_TRACK_LEN;
        if (homeSteps >= LUDO_HOME_LEN) {
            // 反弹
            var over2 = homeSteps - (LUDO_HOME_LEN - 1);
            p.home = true;
            p.homePos = (LUDO_HOME_LEN - 1) - over2;
            if (p.homePos < 0) p.homePos = 0;
            p.pos = -2; // 标记不在主跑道
            _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机进入走廊（反弹）');
        } else if (homeSteps === LUDO_HOME_LEN - 1) {
            p.home = true;
            p.homePos = LUDO_HOME_LEN - 1;
            p.pos = -2;
            p.finished = true;
            _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机直接飞入终点 🎉');
        } else {
            p.home = true;
            p.homePos = homeSteps;
            p.pos = -2;
            _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机进入终点走廊');
        }
    } else {
        var newPos = (start + newSteps) % LUDO_TRACK_LEN;
        p.pos = newPos;
        _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机前进 ' + dice + ' 步');

        // 同色跳格
        if (_ludoIsSameColor(pl.color, newPos)) {
            var jumpTo = _ludoNextSameColor(pl.color, newPos);
            if (jumpTo >= 0 && jumpTo !== newPos) {
                p.pos = jumpTo;
                _ludoLog(pl.name + ' 的' + (planeIdx + 1) + '号机跳到同色格 ⭐');
            }
        }

        _ludoCheckCapture(playerIdx, planeIdx);
    }

    _ludoAfterMove(playerIdx, dice);
}

/* 同色格检测 — 每色有固定的同色格 */
function _ludoIsSameColor(color, pos) {
    var offset = LUDO_START[color];
    var relPos = (pos - offset + LUDO_TRACK_LEN) % LUDO_TRACK_LEN;
    // 每隔4格设一个同色格（4, 8, 12, ...）
    return relPos > 0 && relPos < LUDO_TRACK_LEN && relPos % 4 === 0;
}

function _ludoNextSameColor(color, pos) {
    for (var step = 1; step <= 4; step++) {
        var next = (pos + step) % LUDO_TRACK_LEN;
        if (_ludoIsSameColor(color, next)) return next;
    }
    return -1;
}

/* 撞机检测 */
function _ludoCheckCapture(playerIdx, planeIdx) {
    var s = _ludoState, pl = s.players[playerIdx];
    var myPlane = pl.planes[planeIdx];
    if (myPlane.pos < 0 || myPlane.home || myPlane.finished) return;

    for (var pi = 0; pi < s.players.length; pi++) {
        if (pi === playerIdx) continue;
        var enemy = s.players[pi];
        for (var ei = 0; ei < 4; ei++) {
            var ep = enemy.planes[ei];
            if (ep.pos === myPlane.pos && !ep.home && !ep.finished && ep.pos >= 0) {
                // 检查对方是否有叠子
                var stackCount = 0;
                for (var si = 0; si < 4; si++) {
                    if (enemy.planes[si].pos === ep.pos && !enemy.planes[si].home && !enemy.planes[si].finished) stackCount++;
                }
                // 撞回基地
                for (var ri = 0; ri < 4; ri++) {
                    if (enemy.planes[ri].pos === myPlane.pos && !enemy.planes[ri].home && !enemy.planes[ri].finished) {
                        enemy.planes[ri].pos = -1;
                        enemy.planes[ri].home = false;
                        enemy.planes[ri].homePos = -1;
                    }
                }
                _ludoLog(pl.name + ' 撞了 ' + enemy.name + ' 的飞机！💥');
            }
        }
    }
}

function _ludoAfterMove(playerIdx, dice) {
    var s = _ludoState, pl = s.players[playerIdx];

    // 检查是否胜利
    var allDone = true;
    for (var i = 0; i < 4; i++) { if (!pl.planes[i].finished) { allDone = false; break; } }
    if (allDone) {
        s.winner = playerIdx;
        s.phase = 'done';
        _ludoLog('🏆 ' + pl.name + ' 获得胜利！');
        _ludoRender();
        return;
    }

    // 掷出6，再投一次
    if (dice === 6) {
        s.phase = 'roll';
        _ludoRender();
        if (!pl.isUser) setTimeout(function () { if (_ludoState) _ludoAiTurn(); }, 1200);
    } else {
        _ludoNextTurn();
    }
}

function _ludoNextTurn() {
    var s = _ludoState; if (!s) return;
    s.currentPlayer = (s.currentPlayer + 1) % s.players.length;
    s.consecutiveSixes = 0;
    s.dice = 0;
    s.phase = 'roll';
    _ludoRender();
    var pl = s.players[s.currentPlayer];
    if (!pl.isUser) setTimeout(function () { if (_ludoState) _ludoAiTurn(); }, 1000);
}

/* AI掷骰子和选飞机 */
function _ludoAiTurn() {
    var s = _ludoState; if (!s || s.phase !== 'roll') return;
    _ludoRollDice(s.currentPlayer);
}

function _ludoAiPick() {
    var s = _ludoState; if (!s || s.phase !== 'pick') return;
    var pl = s.players[s.currentPlayer];
    // AI策略：优先起飞，其次最靠近终点的
    var best = s.movablePlanes[0];
    var bestScore = -999;
    for (var i = 0; i < s.movablePlanes.length; i++) {
        var pi = s.movablePlanes[i];
        var p = pl.planes[pi];
        var score = 0;
        if (p.pos === -1) score = 50; // 起飞优先
        else if (p.home) score = 80 + p.homePos; // 终点走廊最优先
        else score = _ludoStepsFromStart(pl.color, p.pos); // 离终点越近越好
        if (score > bestScore) { bestScore = score; best = pi; }
    }
    _ludoMovePlane(s.currentPlayer, best, s.dice);
}

/* 玩家操作 */
function _ludoAction(act) {
    var s = _ludoState; if (!s) return;
    if (act === 'roll') {
        if (s.phase === 'roll' && s.players[s.currentPlayer].isUser) {
            _ludoRollDice(s.currentPlayer);
        }
    }
    if (act === 'again') { ludoStart(); }
    if (act === 'back') { gameBackToLobby(); }
}

function _ludoPickPlane(planeIdx) {
    var s = _ludoState; if (!s || s.phase !== 'pick') return;
    var pl = s.players[s.currentPlayer];
    if (!pl.isUser) return;
    if (s.movablePlanes.indexOf(planeIdx) === -1) {
        if (typeof showToast === 'function') showToast('这架飞机不能移动');
        return;
    }
    _ludoMovePlane(s.currentPlayer, planeIdx, s.dice);
}

function _ludoLog(msg) { if (_ludoState) { _ludoState.logs.push(msg); if (_ludoState.logs.length > 30) _ludoState.logs.shift(); } }

/* ===== 飞行棋渲染 ===== */
function _ludoRender() {
    var s = _ludoState; if (!s) return;
    var el = document.getElementById('gameOverlay'); if (!el) return;
    var h = '<div class="game-header"><div class="game-back" onclick="gameBackToLobby()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="game-header-title">LUDO 飞行棋</div><div class="game-header-spacer"></div></div>';

    h += '<div class="ludo-game">';

    /* 玩家状态栏 */
    h += '<div class="ludo-players">';
    for (var pi = 0; pi < s.players.length; pi++) {
        var pl = s.players[pi];
        var isCur = pi === s.currentPlayer;
        h += '<div class="ludo-player-card ' + pl.color + (isCur ? ' active' : '') + '">';
        h += '<div class="ludo-player-av">';
        if (pl.avatar) h += '<img src="' + _gEsc(pl.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="ludo-player-name">' + _gEsc(pl.name) + '</div>';
        /* 飞机状态点 */
        h += '<div class="ludo-plane-dots">';
        for (var fi = 0; fi < 4; fi++) {
            var pp = pl.planes[fi];
            var dotClass = 'dot-base';
            if (pp.finished) dotClass = 'dot-done';
            else if (pp.home) dotClass = 'dot-home';
            else if (pp.pos >= 0) dotClass = 'dot-track';
            h += '<div class="ludo-dot ' + dotClass + ' ' + pl.color + '"></div>';
        }
        h += '</div>';
        h += '</div>';
    }
    h += '</div>';

    /* 骰子区域 */
    h += '<div class="ludo-dice-area">';
    var curPl = s.players[s.currentPlayer];
    if (s.phase === 'done') {
        h += '<div class="ludo-result">';
        h += '<div class="ludo-result-icon">🏆</div>';
        h += '<div class="ludo-result-title">' + _gEsc(s.players[s.winner].name) + ' 获胜！</div>';
        h += '<div class="ludo-result-sub">' + LUDO_COLOR_CN[s.players[s.winner].color] + '色全部飞机到达终点</div>';
        h += '<div class="ludo-result-btns"><div class="ludo-btn" data-ludo-action="again">再来一局</div><div class="ludo-btn" data-ludo-action="back">返回大厅</div></div>';
        h += '</div>';
    } else {
        h += '<div class="ludo-turn-info">当前回合: <span style="color:' + LUDO_COLOR_HEX[curPl.color] + ';font-weight:700">' + _gEsc(curPl.name) + '</span></div>';

        /* 骰子 */
        h += '<div class="ludo-dice ' + (s.dice > 0 ? 'rolled' : '') + '">';
        if (s.dice > 0) {
            h += _ludoDiceFace(s.dice);
        } else {
            h += '<div class="ludo-dice-placeholder">?</div>';
        }
        h += '</div>';

        if (s.phase === 'roll' && curPl.isUser) {
            h += '<div class="ludo-btn primary" data-ludo-action="roll">🎲 掷骰子</div>';
        } else if (s.phase === 'roll' && !curPl.isUser) {
            h += '<div class="ludo-waiting">' + _gEsc(curPl.name) + ' 正在掷骰...</div>';
        }

        /* 选飞机 */
        if (s.phase === 'pick' && curPl.isUser) {
            h += '<div class="ludo-pick-hint">选择要移动的飞机 ✈️</div>';
            h += '<div class="ludo-pick-planes">';
            for (var mi = 0; mi < s.movablePlanes.length; mi++) {
                var mpi = s.movablePlanes[mi];
                var mp = curPl.planes[mpi];
                var label = '';
                if (mp.pos === -1) label = '起飞';
                else if (mp.home) label = '走廊' + (mp.homePos + 1);
                else label = '跑道' + _ludoStepsFromStart(curPl.color, mp.pos);
                h += '<div class="ludo-pick-btn ' + curPl.color + '" data-ludo-plane="' + mpi + '">' + (mpi + 1) + '号机<br><span style="font-size:8px;opacity:.6">' + label + '</span></div>';
            }
            h += '</div>';
        }
    }
    h += '</div>';

    /* 棋盘可视化 — 简化版跑道 */
    h += '<div class="ludo-board">';
    h += '<div class="ludo-board-title">✈️ 飞行状态</div>';
    for (var bi = 0; bi < s.players.length; bi++) {
        var bpl = s.players[bi];
        h += '<div class="ludo-board-row">';
        h += '<div class="ludo-board-label" style="color:' + LUDO_COLOR_HEX[bpl.color] + '">' + LUDO_COLOR_CN[bpl.color] + '</div>';
        h += '<div class="ludo-board-planes">';
        for (var bfi = 0; bfi < 4; bfi++) {
            var bp = bpl.planes[bfi];
            var statusText = '🏠';
            var statusClass = 'in-base';
            if (bp.finished) { statusText = '🏁'; statusClass = 'finished'; }
            else if (bp.home) { statusText = '▶' + (bp.homePos + 1); statusClass = 'in-home'; }
            else if (bp.pos >= 0) {
                var stps = _ludoStepsFromStart(bpl.color, bp.pos);
                statusText = stps + '';
                statusClass = 'on-track';
            }
            var clickable = (s.phase === 'pick' && bi === s.currentPlayer && bpl.isUser && s.movablePlanes.indexOf(bfi) !== -1);
            h += '<div class="ludo-board-plane ' + bpl.color + ' ' + statusClass + (clickable ? ' pickable' : '') + '"' + (clickable ? ' data-ludo-plane="' + bfi + '"' : '') + '>' + statusText + '</div>';
        }
        h += '</div></div>';
    }
    h += '</div>';

    /* 日志 */
    h += '<div class="ludo-log" id="ludoLogArea">';
    var logStart = Math.max(0, s.logs.length - 8);
    for (var li = logStart; li < s.logs.length; li++) {
        h += '<div class="ludo-log-item">' + _gEsc(s.logs[li]) + '</div>';
    }
    h += '</div>';

    h += '</div>';
    el.innerHTML = h;

    // 滚日志
    var logEl = document.getElementById('ludoLogArea');
    if (logEl) logEl.scrollTop = logEl.scrollHeight;
}

function _ludoDiceFace(n) {
    var dots = {
        1: [[1, 1]],
        2: [[0, 0], [2, 2]],
        3: [[0, 0], [1, 1], [2, 2]],
        4: [[0, 0], [0, 2], [2, 0], [2, 2]],
        5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
        6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
    };
    var h = '<div class="ludo-dice-face">';
    var grid = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    var d = dots[n] || [];
    for (var i = 0; i < d.length; i++) grid[d[i][0]][d[i][1]] = 1;
    for (var r = 0; r < 3; r++) {
        for (var c = 0; c < 3; c++) {
            h += '<div class="dice-cell' + (grid[r][c] ? ' dot' : '') + '"></div>';
        }
    }
    h += '</div>';
    return h;
}

// 事件委托已在上方统一处理，sheep使用onclick直接绑定
