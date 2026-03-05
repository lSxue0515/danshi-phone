/* ============================================
   蛋薯机 DanShu Pro v2 — location.js
   定位共享 · INS 风 · 真实地图距离
   ============================================ */

var LOC_KEY = 'ds_loc_data';
var _locActivePlan = 0;

/* =============================================
   真实坐标数据库（经纬度）
   Haversine 直线距离 × 路程系数 = 近似真实路程
   ============================================= */
var LOC_COORDS = {
    // ── 中国 China ──
    '北京': [39.9042, 116.4074], '上海': [31.2304, 121.4737], '广州': [23.1291, 113.2644],
    '深圳': [22.5431, 114.0579], '杭州': [30.2741, 120.1551], '成都': [30.5728, 104.0668],
    '重庆': [29.5630, 106.5516], '南京': [32.0603, 118.7969], '武汉': [30.5928, 114.3055],
    '西安': [34.3416, 108.9398], '天津': [39.3434, 117.3616], '苏州': [31.2990, 120.5853],
    '长沙': [28.2282, 112.9388], '沈阳': [41.8057, 123.4315], '大连': [38.9140, 121.6147],
    '青岛': [36.0671, 120.3826], '厦门': [24.4798, 118.0894], '昆明': [25.0389, 102.7183],
    '哈尔滨': [45.8038, 126.5350], '郑州': [34.7466, 113.6254], '福州': [26.0745, 119.2965],
    '济南': [36.6512, 117.1201], '合肥': [31.8206, 117.2272], '长春': [43.8171, 125.3235],
    '贵阳': [26.6470, 106.6302], '南宁': [22.8170, 108.3665], '石家庄': [38.0428, 114.5149],
    '太原': [37.8706, 112.5489], '乌鲁木齐': [43.8256, 87.6168], '拉萨': [29.6500, 91.1000],
    '海口': [20.0440, 110.1999], '三亚': [18.2528, 109.5120], '香港': [22.3193, 114.1694],
    '澳门': [22.1987, 113.5439], '台北': [25.0330, 121.5654], '台中': [24.1477, 120.6736],
    '高雄': [22.6273, 120.3014], '珠海': [22.2710, 113.5767], '无锡': [31.4912, 120.3119],
    '宁波': [29.8683, 121.5440], '温州': [28.0015, 120.6721], '佛山': [23.0218, 113.1219],
    '东莞': [23.0430, 113.7633], '中山': [22.5166, 113.3929],
    // 地标 Landmarks
    '三里屯': [39.9334, 116.4534], '王府井': [39.9145, 116.4100], '国贸': [39.9087, 116.4606],
    '外滩': [31.2400, 121.4900], '陆家嘴': [31.2362, 121.4996], '南京路': [31.2350, 121.4767],
    '天河城': [23.1380, 113.3250], '珠江新城': [23.1193, 113.3218], '华强北': [22.5475, 114.0878],
    '西湖': [30.2590, 120.1388], '春熙路': [30.6586, 104.0821], '解放碑': [29.5583, 106.5776],
    '故宫': [39.9163, 116.3972], '天安门': [39.9087, 116.3975], '长城': [40.4319, 116.5704],
    '东方明珠': [31.2397, 121.4998], '迪士尼': [31.1434, 121.6580],
    // ── 日本 Japan ──
    '东京': [35.6762, 139.6503], '大阪': [34.6937, 135.5023], '京都': [35.0116, 135.7681],
    '名古屋': [35.1815, 136.9066], '札幌': [43.0618, 141.3545], '福冈': [33.5904, 130.4017],
    '横滨': [35.4437, 139.6380], '神户': [34.6901, 135.1956], '奈良': [34.6851, 135.8050],
    '冲绳': [26.3344, 127.8056], '广岛': [34.3853, 132.4553],
    '涩谷': [35.6580, 139.7016], '新宿': [35.6938, 139.7034], '银座': [35.6717, 139.7650],
    '秋叶原': [35.7023, 139.7745], '池袋': [35.7295, 139.7109], '原宿': [35.6702, 139.7026],
    '浅草': [35.7148, 139.7967], '台场': [35.6267, 139.7752],
    '难波': [34.6627, 135.5013], '梅田': [34.7024, 135.4959], '心斋桥': [34.6723, 135.5010],
    '清水寺': [34.9949, 135.7850], '岚山': [35.0094, 135.6672],
    // ── 韩国 Korea ──
    '首尔': [37.5665, 126.9780], '釜山': [35.1796, 129.0756], '仁川': [37.4563, 126.7052],
    '济州岛': [33.4996, 126.5312], '大邱': [35.8714, 128.6014],
    '江南': [37.4979, 127.0276], '明洞': [37.5636, 126.9869], '弘大': [37.5563, 126.9237],
    '梨泰院': [37.5345, 126.9946], '东大门': [37.5712, 127.0090],
    // ── 美国 USA ──
    '纽约': [40.7128, -74.0060], '洛杉矶': [34.0522, -118.2437], '旧金山': [37.7749, -122.4194],
    '芝加哥': [41.8781, -87.6298], '波士顿': [42.3601, -71.0589], '西雅图': [47.6062, -122.3321],
    '拉斯维加斯': [36.1699, -115.1398], '迈阿密': [25.7617, -80.1918],
    '华盛顿': [38.9072, -77.0369], '休斯顿': [29.7604, -95.3698], '达拉斯': [32.7767, -96.7970],
    '费城': [39.9526, -75.1652], '亚特兰大': [33.7490, -84.3880],
    '时代广场': [40.7580, -73.9855], '中央公园': [40.7829, -73.9654], '曼哈顿': [40.7831, -73.9712],
    '好莱坞': [34.0928, -118.3287], '圣莫尼卡': [34.0195, -118.4912],
    '硅谷': [37.3875, -122.0575], '夏威夷': [21.3069, -157.8583],
    // ── 英国 UK ──
    '伦敦': [51.5074, -0.1278], '曼彻斯特': [53.4808, -2.2426], '爱丁堡': [55.9533, -3.1883],
    '伯明翰': [52.4862, -1.8904], '利物浦': [53.4084, -2.9916], '牛津': [51.7520, -1.2577],
    '剑桥': [52.2053, 0.1218],
    // ── 法国 France ──
    '巴黎': [48.8566, 2.3522], '里昂': [45.7640, 4.8357], '马赛': [43.2965, 5.3698],
    '尼斯': [43.7102, 7.2620], '波尔多': [44.8378, -0.5792], '戛纳': [43.5528, 7.0174],
    // ── 德国 Germany ──
    '柏林': [52.5200, 13.4050], '慕尼黑': [48.1351, 11.5820], '法兰克福': [50.1109, 8.6821],
    '汉堡': [53.5511, 9.9937], '科隆': [50.9375, 6.9603],
    // ── 意大利 Italy ──
    '罗马': [41.9028, 12.4964], '米兰': [45.4642, 9.1900], '威尼斯': [45.4408, 12.3155],
    '佛罗伦萨': [43.7696, 11.2558], '那不勒斯': [40.8518, 14.2681],
    // ── 西班牙 Spain ──
    '马德里': [40.4168, -3.7038], '巴塞罗那': [41.3874, 2.1686], '瓦伦西亚': [39.4699, -0.3763],
    // ── 东南亚 SEA ──
    '新加坡': [1.3521, 103.8198], '曼谷': [13.7563, 100.5018], '吉隆坡': [3.1390, 101.6869],
    '马来西亚': [3.1390, 101.6869], '槟城': [5.4164, 100.3327], '兰卡威': [6.3500, 99.8000],
    '马六甲': [2.1896, 102.2501], '沙巴': [5.9788, 116.0753], '新山': [1.4927, 103.7414],
    '雅加达': [-6.2088, 106.8456], '巴厘岛': [-8.3405, 115.0920],
    '胡志明市': [10.8231, 106.6297], '河内': [21.0285, 105.8542], '岘港': [16.0544, 108.2022],
    '马尼拉': [14.5995, 120.9842], '宿务': [10.3157, 123.8854],
    '清迈': [18.7883, 98.9853], '普吉岛': [7.8804, 98.3923],
    '金边': [11.5564, 104.9282], '暹粒': [13.3671, 103.8448],
    // ── 澳洲 Australia ──
    '悉尼': [-33.8688, 151.2093], '墨尔本': [-37.8136, 144.9631], '布里斯班': [-27.4698, 153.0251],
    '珀斯': [-31.9505, 115.8605], '奥克兰': [-36.8485, 174.7633],
    // ── 中东 Middle East ──
    '迪拜': [25.2048, 55.2708], '阿布扎比': [24.4539, 54.3773], '多哈': [25.2854, 51.5310],
    '伊斯坦布尔': [41.0082, 28.9784],
    // ── 其他 Others ──
    '圣保罗': [-23.5505, -46.6333], '布宜诺斯艾利斯': [-34.6037, -58.3816],
    '墨西哥城': [19.4326, -99.1332], '利马': [-12.0464, -77.0428],
    '开罗': [30.0444, 31.2357], '开普敦': [-33.9249, 18.4241], '内罗毕': [-1.2921, 36.8219],
    '多伦多': [43.6532, -79.3832], '温哥华': [49.2827, -123.1207], '蒙特利尔': [45.5017, -73.5673],
    '莫斯科': [55.7558, 37.6173], '圣彼得堡': [59.9343, 30.3351],
    '孟买': [19.0760, 72.8777], '新德里': [28.6139, 77.2090], '班加罗尔': [12.9716, 77.5946],
    '赫尔辛基': [60.1699, 24.9384], '斯德哥尔摩': [59.3293, 18.0686],
    '阿姆斯特丹': [52.3676, 4.9041], '布鲁塞尔': [50.8503, 4.3517],
    '维也纳': [48.2082, 16.3738], '布拉格': [50.0755, 14.4378],
    '华沙': [52.2297, 21.0122], '布达佩斯': [47.4979, 19.0402],
    '雅典': [37.9838, 23.7275], '里斯本': [38.7223, -9.1393]
};

/* 快速选择 Quick select */
var LOC_QUICK = {
    'CN': ['Beijing 北京', 'Shanghai 上海', 'Guangzhou 广州', 'Shenzhen 深圳', 'Hangzhou 杭州', 'Chengdu 成都'],
    'JP': ['Tokyo 东京', 'Osaka 大阪', 'Kyoto 京都', 'Yokohama 横滨'],
    'KR': ['Seoul 首尔', 'Busan 釜山'],
    'US': ['New York 纽约', 'Los Angeles 洛杉矶', 'San Francisco 旧金山'],
    'EU': ['London 伦敦', 'Paris 巴黎', 'Berlin 柏林', 'Rome 罗马'],
    'SEA': ['Singapore 新加坡', 'Bangkok 曼谷', 'KL 吉隆坡', 'Bali 巴厘岛'],
    'Other': ['Sydney 悉尼', 'Dubai 迪拜', 'Toronto 多伦多']
};

/* 快速标签 → 地名提取（取中文部分） */
function locQuickToName(label) {
    var m = label.match(/[\u4e00-\u9fff]+/);
    return m ? m[0] : label;
}

/* ===== 存取 ===== */
function locLoad() { try { return JSON.parse(localStorage.getItem(LOC_KEY) || '{}'); } catch (e) { return {}; } }
function locSave(d) { try { localStorage.setItem(LOC_KEY, JSON.stringify(d)); } catch (e) { } }
function locGetCharName() {
    if (typeof _chatCurrentConv !== 'undefined' && _chatCurrentConv) { var r = typeof findRole === 'function' ? findRole(_chatCurrentConv) : null; if (r) return r.name || 'Ta'; } return 'Ta';
}
function locGetUserName() {
    if (typeof getActivePersona === 'function') { var p = getActivePersona(); if (p && p.name) return p.name; } return 'Me';
}
function locRoleId() { return (typeof _chatCurrentConv !== 'undefined' && _chatCurrentConv) ? _chatCurrentConv : '_default'; }

/* ===== Open / Close 打开/关闭 ===== */
function openLocationPanel() {
    var el = document.getElementById('locationOverlay'); if (!el) return;
    _locActivePlan = 0;
    var s = (locLoad()[locRoleId()] || {});
    el.innerHTML = locBuildHTML(s); el.classList.add('show');
    setTimeout(function () { locRefresh(); }, 100);
}
function closeLocationPanel() {
    var el = document.getElementById('locationOverlay'); if (el) el.classList.remove('show');
}

/* ===== Build HTML 构建界面 ===== */
function locBuildHTML(saved) {
    var uN = locGetUserName(), cN = locGetCharName(), h = '';
    h += '<div class="loc-header"><div class="loc-back" onclick="closeLocationPanel()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div><div class="loc-header-title">Location / \u5b9a\u4f4d</div><div class="loc-header-spacer"></div></div>';
    h += '<div class="loc-scroll">';
    // Map 地图
    h += '<div class="loc-map-wrap" id="locMapWrap"><div class="loc-map-grid"></div><div class="loc-map-roads" id="locRoads"></div><div class="loc-map-route" id="locRoute"></div><div class="loc-map-stations" id="locStDots"></div>';
    h += '<div class="loc-pin user" id="locPinU" style="left:30%;top:65%"><div class="loc-pin-icon"><svg viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="11" r="3.5" fill="rgba(255,255,255,.9)"/></svg></div><div class="loc-pin-tag" id="locPinUTag">' + locE(uN) + '</div></div>';
    h += '<div class="loc-pin char" id="locPinC" style="left:70%;top:30%"><div class="loc-pin-icon"><svg viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="11" r="3.5" fill="rgba(255,255,255,.9)"/></svg></div><div class="loc-pin-tag" id="locPinCTag">' + locE(cN) + '</div></div>';
    h += '<div class="loc-dist-badge" id="locDist">&mdash;</div></div>';
    h += '<div class="loc-content">';
    // Location input 位置输入
    h += '<div class="loc-sec"><div class="loc-sec-title"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>LOCATION <span>\u4f4d\u7f6e</span></div>';
    h += '<div class="loc-input-row"><div class="loc-input-dot user"></div><div class="loc-input-who">' + locE(uN) + '</div><input class="loc-input-field" id="locInputU" placeholder="Any city or place... \u8f93\u5165\u4efb\u610f\u5730\u540d" value="' + locE(saved.uText || '') + '" oninput="locRefresh()"></div>';
    h += '<div class="loc-input-row"><div class="loc-input-dot char"></div><div class="loc-input-who">' + locE(cN) + '</div><input class="loc-input-field" id="locInputC" placeholder="Any city or place... \u8f93\u5165\u4efb\u610f\u5730\u540d" value="' + locE(saved.cText || '') + '" oninput="locRefresh()"></div>';
    // Quick tags
    h += '<div class="loc-quick-wrap"><div class="loc-quick-label">Quick select / \u5feb\u901f\u9009\u62e9</div><div class="loc-quick-tags" id="locQuickTags">';
    var allTags = []; for (var k in LOC_QUICK) allTags = allTags.concat(LOC_QUICK[k]);
    for (var i = 0; i < Math.min(allTags.length, 22); i++) {
        var qn = locQuickToName(allTags[i]);
        h += '<div class="loc-quick-tag" onclick="locQuickSelect(this,\'' + locE(qn) + '\')">' + locE(allTags[i]) + '</div>';
    }
    h += '</div></div></div>';
    // Route info 路线信息
    h += '<div class="loc-sec" id="locInfoSec"><div class="loc-sec-title"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>ROUTE INFO <span>\u8def\u7ebf\u4fe1\u606f</span></div>';
    h += '<div class="loc-chips" id="locChips"><div class="loc-chip">Set both locations / \u8bf7\u5148\u8bbe\u7f6e\u53cc\u65b9\u4f4d\u7f6e</div></div>';
    h += '<div class="loc-commute" id="locCommute" style="display:none"><div class="loc-commute-text">Convenience / \u4fbf\u5229\u5ea6</div><div class="loc-commute-bar"><div class="loc-commute-fill" id="locComFill"></div></div><div class="loc-commute-val" id="locComVal">&mdash;</div></div></div>';
    // Stations 附近站点
    h += '<div class="loc-sec" id="locStSec" style="display:none"><div class="loc-sec-title"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="4" y1="11" x2="20" y2="11"/><line x1="12" y1="3" x2="12" y2="11"/></svg>NEARBY STATIONS <span>\u9644\u8fd1\u7ad9\u70b9</span></div><div class="loc-st-list" id="locStList"></div></div>';
    // Routes 推荐路线
    h += '<div class="loc-sec" id="locPlanSec" style="display:none"><div class="loc-sec-title"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>ROUTES <span>\u63a8\u8350\u8def\u7ebf</span></div><div class="loc-plan-list" id="locPlans"></div></div>';
    h += '</div></div>'; // /content /scroll
    h += '<button class="loc-send" onclick="locSendToChat()">Send to Chat / \u53d1\u9001\u5230\u804a\u5929</button>';
    return h;
}

/* ===== Quick select 快速选择 ===== */
var _locQuickTarget = 'U';
function locTrackFocus() {
    var u = document.getElementById('locInputU'), c = document.getElementById('locInputC');
    if (u) u.onfocus = function () { _locQuickTarget = 'U'; };
    if (c) c.onfocus = function () { _locQuickTarget = 'C'; };
}
function locQuickSelect(el, name) {
    var input = document.getElementById('locInput' + _locQuickTarget);
    if (input) input.value = name;
    var tags = document.querySelectorAll('.loc-quick-tag');
    for (var i = 0; i < tags.length; i++) tags[i].classList.remove('active');
    el.classList.add('active');
    locRefresh();
}

/* ===== Haversine 球面距离 ===== */
function locHaversine(lat1, lon1, lat2, lon2) {
    var R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ===== 真实路程距离（直线 × 路程系数）===== */
function locRoadDist(straightKm) {
    if (straightKm < 5) return straightKm * 1.3;
    if (straightKm < 50) return straightKm * 1.25;
    if (straightKm < 300) return straightKm * 1.2;
    return straightKm;
}

/* ===== 地名 → 坐标 ===== */
function locResolveCoords(text) {
    if (!text) return null; text = text.trim();
    if (LOC_COORDS[text]) return LOC_COORDS[text];
    var bestK = '', bestLen = 0;
    for (var k in LOC_COORDS) {
        if ((text.indexOf(k) !== -1 || k.indexOf(text) !== -1) && k.length > bestLen) {
            bestK = k; bestLen = k.length;
        }
    }
    if (bestK) return LOC_COORDS[bestK];
    var h = locHash(text);
    return [((h % 12000) / 100) - 60, ((h * 7 % 36000) / 100) - 180];
}

/* ===== Refresh 刷新 ===== */
function locRefresh() {
    var uText = (document.getElementById('locInputU') || {}).value || '';
    var cText = (document.getElementById('locInputC') || {}).value || '';
    var rid = locRoleId(), data = locLoad();
    data[rid] = { uText: uText, cText: cText }; locSave(data);
    locTrackFocus();

    var ok = !!(uText.trim() && cText.trim());
    var straightDist = 0, roadDist = 0, uCoord = null, cCoord = null;
    if (ok) {
        uCoord = locResolveCoords(uText); cCoord = locResolveCoords(cText);
        straightDist = locHaversine(uCoord[0], uCoord[1], cCoord[0], cCoord[1]);
        roadDist = locRoadDist(straightDist);
    }

    var walk = 0, bike = 0, car = 0, sub = 0, flight = 0, hsr = 0;
    var isCross = roadDist > 300, isLong = roadDist > 1000;
    if (ok) {
        walk = Math.round(roadDist / 5 * 60);
        bike = Math.round(roadDist / 15 * 60);
        car = Math.round(roadDist / (isCross ? 90 : 35) * 60); if (car < 1) car = 1;
        sub = roadDist < 80 ? Math.round(roadDist / 35 * 60 + (locHash(uText) % 8 + 3)) : 0;
        hsr = roadDist > 100 && roadDist < 2500 ? Math.round(roadDist / 250 * 60 + 30) : 0;
        flight = isLong ? Math.round(straightDist / 850 * 60 + 90) : (straightDist > 300 ? Math.round(straightDist / 700 * 60 + 60) : 0);
    }

    var dEl = document.getElementById('locDist');
    if (dEl) {
        if (!ok) dEl.textContent = '\u2014';
        else if (roadDist < 1) dEl.textContent = Math.round(roadDist * 1000) + ' m';
        else if (roadDist < 100) dEl.textContent = roadDist.toFixed(1) + ' km';
        else dEl.textContent = Math.round(roadDist) + ' km';
    }

    var chips = document.getElementById('locChips');
    if (chips) {
        if (!ok) { chips.innerHTML = '<div class="loc-chip">Set both locations / \u8bf7\u5148\u8bbe\u7f6e\u53cc\u65b9\u4f4d\u7f6e</div>'; }
        else {
            var ch = '';
            ch += '<div class="loc-chip"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Distance / \u8ddd\u79bb <b>' + locFmtDist(roadDist) + '</b></div>';
            if (!isLong) ch += '<div class="loc-chip"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="14" height="12" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg>Drive / \u9a7e\u8f66 <b>' + locFmtTime(car) + '</b></div>';
            if (flight) ch += '<div class="loc-chip"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>Flight / \u822a\u73ed <b>' + locFmtTime(flight) + '</b></div>';
            chips.innerHTML = ch;
        }
    }

    var com = document.getElementById('locCommute'), fill = document.getElementById('locComFill'), val = document.getElementById('locComVal');
    if (com) {
        if (!ok) { com.style.display = 'none'; }
        else {
            com.style.display = '';
            var sc = locScore(roadDist), col, txt;
            if (sc >= 80) { col = '#4caf80'; txt = 'Very Easy / \u975e\u5e38\u4fbf\u5229'; }
            else if (sc >= 60) { col = '#7bc47f'; txt = 'Easy / \u8f83\u4fbf\u5229'; }
            else if (sc >= 40) { col = '#f5a623'; txt = 'Moderate / \u4e00\u822c'; }
            else if (sc >= 20) { col = '#ef7547'; txt = 'Hard / \u4e0d\u592a\u65b9\u4fbf'; }
            else { col = '#e85d5d'; txt = 'Very Hard / \u8f83\u56f0\u96be'; }
            if (fill) { fill.style.width = sc + '%'; fill.style.background = col; }
            if (val) { val.textContent = txt; val.style.color = col; }
        }
    }
    locBuildStations(ok, uText, cText);
    locBuildPlans(ok, roadDist, walk, bike, car, sub, hsr, flight);
    locUpdateMap(ok, uCoord, cCoord, straightDist);
}

/* ===== Stations 站点 ===== */
function locBuildStations(ok, uT, cT) {
    var sec = document.getElementById('locStSec'), list = document.getElementById('locStList');
    if (!sec || !list) return; if (!ok) { sec.style.display = 'none'; return; } sec.style.display = '';
    var seed = locHash(uT + cT);
    var icons = { subway: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="14" rx="3"/><line x1="4" y1="11" x2="20" y2="11"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/><line x1="8" y1="17" x2="6" y2="20"/><line x1="16" y1="17" x2="18" y2="20"/></svg>', bus: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="15" rx="3"/><line x1="3" y1="9" x2="21" y2="9"/><circle cx="7" cy="15" r="1.5"/><circle cx="17" cy="15" r="1.5"/></svg>', train: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="16" rx="3"/><line x1="4" y1="10" x2="20" y2="10"/><circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/><line x1="8" y1="22" x2="16" y2="22"/></svg>' };
    var sts = [['subway', locStName(seed, 0)], ['bus', locStName(seed + 37, 1)], ['subway', locStName(seed + 71, 2)], ['bus', locStName(seed + 113, 3)], ['train', locStName(seed + 157, 4)]];
    var sh = '';
    for (var i = 0; i < sts.length; i++) { var dm = (seed * (i + 3) * 17) % 1800 + 150; var ds = dm >= 1000 ? (dm / 1000).toFixed(1) + 'km' : dm + 'm'; sh += '<div class="loc-st-item"><div class="loc-st-icon ' + sts[i][0] + '">' + icons[sts[i][0]] + '</div><div class="loc-st-name">' + locE(sts[i][1]) + '</div><div class="loc-st-dist">' + ds + '</div></div>'; }
    list.innerHTML = sh;
    var dots = document.getElementById('locStDots'); if (dots) { var dh = ''; for (var j = 0; j < 4; j++) dh += '<div class="loc-st-dot" style="left:' + (15 + (seed * (j + 2) * 31) % 70) + '%;top:' + (15 + (seed * (j + 3) * 43) % 70) + '%"></div>'; dots.innerHTML = dh; }
}

/* ===== Plans 路线方案 ===== */
function locBuildPlans(ok, dist, walk, bike, car, sub, hsr, flight) {
    var sec = document.getElementById('locPlanSec'), list = document.getElementById('locPlans');
    if (!sec || !list) return; if (!ok) { sec.style.display = 'none'; return; } sec.style.display = '';
    var plans = [];
    if (sub > 0) plans.push({ type: 'subway', bg: 'rgba(61,124,245,.08)', col: '#3d7cf5', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="14" rx="3"/><line x1="4" y1="11" x2="20" y2="11"/><circle cx="8" cy="14" r="1"/><circle cx="16" cy="14" r="1"/></svg>', name: 'Metro / \u5730\u94c1', desc: 'Transfer / \u6362\u4e58 ' + (Math.round(dist / 8) || 1) + 'x  ' + Math.max(2, Math.round(dist / 3)) + ' stops / \u7ad9', time: sub, unit: 'min' });
    plans.push({ type: 'car', bg: 'rgba(245,166,35,.08)', col: '#f5a623', icon: '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="14" height="12" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg>', name: 'Drive / \u9a7e\u8f66', desc: dist > 100 ? Math.round(dist) + 'km highway / \u9ad8\u901f' : (Math.round(dist / 5) + 2) + ' intersections / \u8def\u53e3', time: car, unit: 'min' });
    if (hsr > 0) plans.push({ type: 'hsr', bg: 'rgba(61,124,245,.08)', col: '#3d7cf5', icon: '<svg viewBox="0 0 24 24"><rect x="4" y="2" width="16" height="16" rx="3"/><line x1="4" y1="10" x2="20" y2="10"/><circle cx="8" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/></svg>', name: 'High-speed Rail / \u9ad8\u94c1', desc: Math.round(dist) + 'km  ' + Math.round(dist / 250 * 60) + 'min on train / \u8f66\u4e0a', time: hsr, unit: 'min' });
    if (flight) plans.push({ type: 'flight', bg: 'rgba(142,100,230,.08)', col: '#8c64e6', icon: '<svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg>', name: 'Flight / \u822a\u73ed', desc: dist > 3000 ? 'International / \u56fd\u9645' : 'Domestic / \u56fd\u5185', time: flight, unit: 'min' });
    if (dist <= 80) plans.push({ type: 'bike', bg: 'rgba(76,175,128,.08)', col: '#4caf80', icon: '<svg viewBox="0 0 24 24"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="18" r="3"/><path d="M6 15V6h9l3 3v6"/></svg>', name: 'Bike / \u9a91\u884c', desc: Math.round(dist * 30) + ' kcal', time: bike, unit: 'min' });
    if (dist <= 12) plans.push({ type: 'walk', bg: 'rgba(142,142,147,.08)', col: '#8e8e93', icon: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M10 22l2-7 3 3v6M14 13l-2-2-3 4"/></svg>', name: 'Walk / \u6b65\u884c', desc: Math.round(dist * 1300) + ' steps / \u6b65', time: walk, unit: 'min' });
    if (_locActivePlan >= plans.length) _locActivePlan = 0;
    var ph = '';
    for (var i = 0; i < plans.length; i++) { var p = plans[i]; ph += '<div class="loc-plan' + (i === _locActivePlan ? ' active' : '') + '" data-idx="' + i + '" data-type="' + p.type + '" onclick="locPickPlan(this,' + i + ')"><div class="loc-plan-icon" style="background:' + p.bg + '"><div style="color:' + p.col + '">' + p.icon + '</div></div><div class="loc-plan-body"><div class="loc-plan-name">' + p.name + '</div><div class="loc-plan-desc">' + p.desc + '</div></div><div class="loc-plan-time"><strong>' + locFmtTime(p.time) + '</strong><small>' + p.unit + '</small></div></div>'; }
    list.innerHTML = ph;
}
function locPickPlan(el, idx) {
    _locActivePlan = idx;
    var items = el.parentNode.querySelectorAll('.loc-plan');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('active', i === idx);
    var uT = (document.getElementById('locInputU') || {}).value || '', cT = (document.getElementById('locInputC') || {}).value || '';
    if (uT.trim() && cT.trim()) { var uC = locResolveCoords(uT), cC = locResolveCoords(cT); locUpdateMap(true, uC, cC, locHaversine(uC[0], uC[1], cC[0], cC[1])); }
}

/* ===== Map render 地图渲染 ===== */
function locUpdateMap(ok, uCoord, cCoord, dist) {
    var roads = document.getElementById('locRoads');
    if (roads) roads.innerHTML = '<svg viewBox="0 0 400 230" preserveAspectRatio="none"><path d="M0 115Q100 95 200 115Q300 135 400 115" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="3.5"/><path d="M0 60Q150 80 200 55Q250 30 400 65" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="2.5"/><path d="M0 175Q100 165 200 180Q300 195 400 170" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="2.5"/><path d="M90 0Q80 60 95 115Q110 175 85 230" fill="none" stroke="rgba(0,0,0,.04)" stroke-width="2"/><path d="M310 0Q320 70 300 115Q280 175 310 230" fill="none" stroke="rgba(0,0,0,.04)" stroke-width="2"/></svg>';
    if (!ok || !uCoord || !cCoord) return;
    var pos = locCoordsToMapPos(uCoord, cCoord); var ux = pos.ux, uy = pos.uy, cx = pos.cx, cy = pos.cy;
    var pu = document.getElementById('locPinU'), pc = document.getElementById('locPinC');
    if (pu) { pu.style.left = ux + '%'; pu.style.top = uy + '%'; }
    if (pc) { pc.style.left = cx + '%'; pc.style.top = cy + '%'; }
    var colorMap = { subway: '#3d7cf5', car: '#f5a623', flight: '#8c64e6', bike: '#4caf80', walk: '#8e8e93', hsr: '#3d7cf5' };
    var activeType = 'car'; var aPlan = document.querySelector('.loc-plan.active');
    if (aPlan) activeType = aPlan.getAttribute('data-type') || 'car';
    var col = colorMap[activeType] || '#3d7cf5';
    var rEl = document.getElementById('locRoute');
    if (rEl) {
        var mx = (parseFloat(ux) + parseFloat(cx)) / 2, my = (parseFloat(uy) + parseFloat(cy)) / 2;
        var pathD = '';
        if (activeType === 'flight') pathD = 'M' + ux + ' ' + uy + ' Q' + mx + ' ' + (my - Math.min(30, dist / 100 * 10 + 8)) + ' ' + cx + ' ' + cy;
        else if (activeType === 'subway' || activeType === 'hsr') { var m1x = parseFloat(ux) + (parseFloat(cx) - parseFloat(ux)) * .3, m1y = uy, m2x = parseFloat(ux) + (parseFloat(cx) - parseFloat(ux)) * .7, m2y = cy; pathD = 'M' + ux + ' ' + uy + ' L' + m1x + ' ' + m1y + ' L' + m2x + ' ' + m2y + ' L' + cx + ' ' + cy; }
        else if (activeType === 'bike' || activeType === 'walk') pathD = 'M' + ux + ' ' + uy + ' C' + (parseFloat(ux) + (parseFloat(cx) - parseFloat(ux)) * .33) + ' ' + (my - 5) + ' ' + (parseFloat(ux) + (parseFloat(cx) - parseFloat(ux)) * .66) + ' ' + (my + 5) + ' ' + cx + ' ' + cy;
        else pathD = 'M' + ux + ' ' + uy + ' Q' + mx + ' ' + (my - 10) + ' ' + cx + ' ' + cy;
        var dash = activeType === 'flight' ? 'none' : '4,3', sw = activeType === 'flight' ? '2.5' : '2';
        rEl.innerHTML = '<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="' + pathD + '" fill="none" stroke="' + col + '" stroke-width="' + sw + '" ' + (dash !== 'none' ? 'stroke-dasharray="' + dash + '" ' : '') + 'stroke-linecap="round" opacity=".7"><animate attributeName="stroke-dashoffset" from="14" to="0" dur="1.5s" repeatCount="indefinite"/></path></svg>';
    }
}
function locCoordsToMapPos(uC, cC) {
    var lat1 = uC[0], lon1 = uC[1], lat2 = cC[0], lon2 = cC[1];
    var cLat = (lat1 + lat2) / 2, cLon = (lon1 + lon2) / 2;
    var dLat = Math.abs(lat1 - lat2), dLon = Math.abs(lon1 - lon2);
    var span = Math.max(dLat, dLon * .7, .5) * 1.6;
    var ux = 10 + ((lon1 - cLon) / span + .5) * 80, uy = 10 + ((cLat - lat1) / span + .5) * 80;
    var cx = 10 + ((lon2 - cLon) / span + .5) * 80, cy = 10 + ((cLat - lat2) / span + .5) * 80;
    ux = Math.max(8, Math.min(92, ux)); uy = Math.max(12, Math.min(88, uy));
    cx = Math.max(8, Math.min(92, cx)); cy = Math.max(12, Math.min(88, cy));
    return { ux: ux.toFixed(1), uy: uy.toFixed(1), cx: cx.toFixed(1), cy: cy.toFixed(1) };
}

/* ===== 用户发送位置到聊天 ===== */
function locSendToChat() {
    var uText = (document.getElementById('locInputU') || {}).value || '';
    var cText = (document.getElementById('locInputC') || {}).value || '';
    if (!uText.trim() || !cText.trim()) { if (typeof showToast === 'function') showToast('Set both locations / \u8bf7\u5148\u8bbe\u7f6e\u53cc\u65b9\u4f4d\u7f6e'); return; }
    var uC = locResolveCoords(uText), cC = locResolveCoords(cText);
    var sDist = locHaversine(uC[0], uC[1], cC[0], cC[1]), rDist = locRoadDist(sDist);
    var pos = locCoordsToMapPos(uC, cC);
    var car = Math.round(rDist / (rDist > 300 ? 90 : 35) * 60); if (car < 1) car = 1;
    var flight = sDist > 1000 ? Math.round(sDist / 850 * 60 + 90) : (sDist > 300 ? Math.round(sDist / 700 * 60 + 60) : 0);
    var role = typeof findRole === 'function' ? findRole(_chatCurrentConv) : null;
    if (!role) { if (typeof showToast === 'function') showToast('No active chat'); return; }
    // ★★★ 关键修复：用 role.msgs 而不是 role.history ★★★
    if (!role.msgs) role.msgs = [];
    role.msgs.push({
        from: 'self', text: '', time: new Date().toLocaleTimeString().slice(0, 5),
        location: true, locUserPlace: uText.trim(), locCharPlace: cText.trim(),
        locDist: rDist, locStraight: sDist, locCar: car, locFlight: flight,
        locUx: parseFloat(pos.ux), locUy: parseFloat(pos.uy),
        locCx: parseFloat(pos.cx), locCy: parseFloat(pos.cy),
        locMx: (parseFloat(pos.ux) + parseFloat(pos.cx)) / 2,
        locMy: (parseFloat(pos.uy) + parseFloat(pos.cy)) / 2 - 10
    });
    role.lastMsg = '[Location / \u5b9a\u4f4d] ' + uText.trim();
    role.lastTime = new Date().toLocaleTimeString().slice(0, 5);
    if (typeof saveChatRoles === 'function') saveChatRoles();
    if (typeof _chatCurrentTab !== 'undefined') {
        var body = document.getElementById('chatConvBody');
        if (body) {
            var myAv = ''; var p = typeof getActivePersona === 'function' ? getActivePersona() : null;
            if (p && p.avatar) myAv = p.avatar;
            // ★★★ 关键修复：用 role.msgs ★★★
            var idx = role.msgs.length - 1;
            body.insertAdjacentHTML('beforeend', renderLocationBubbleRow(role.msgs[idx], idx, myAv, role.avatar || ''));
            body.scrollTop = body.scrollHeight;
        }
    }
    closeLocationPanel();
    if (typeof showToast === 'function') showToast('Location sent / \u4f4d\u7f6e\u5df2\u53d1\u9001');
}

/* ===== 聊天气泡渲染 ===== */
function renderLocationBubbleRow(m, idx, myAv, roleAv) {
    var isSelf = m.from === 'self';
    var av = isSelf ? myAv : roleAv;
    var avHTML = av ? '<img src="' + av + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : '<svg viewBox="0 0 24 24" style="width:16px;height:16px;stroke:rgba(50,40,55,.4);stroke-width:1.8;fill:none"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
    var ux = m.locUx || 30, uy = m.locUy || 65, cx = m.locCx || 70, cy = m.locCy || 30;
    var mx = m.locMx || (ux + cx) / 2, my = m.locMy || ((uy + cy) / 2 - 10);
    var dist = m.locDist || 0;
    var car = m.locCar || 0, flight = m.locFlight || 0;

    var h = '<div class="chat-bubble-row ' + (isSelf ? 'self' : '') + '" data-msg-idx="' + idx + '" onclick="showBubbleMenu(event,' + idx + ')">';
    h += '<div class="chat-bubble-avatar">' + avHTML + '</div>';
    h += '<div class="chat-bubble-content-wrap">';
    h += '<div class="chat-bubble" style="padding:0;background:transparent;border:none;box-shadow:none">';

    h += '<div class="loc-bubble-card" onclick="event.stopPropagation();openLocationPanel()">';
    // Mini map
    h += '<div class="loc-bubble-map"><div class="loc-map-grid"></div>';
    h += '<div class="loc-bubble-roads"><svg viewBox="0 0 280 120" preserveAspectRatio="none"><path d="M0 60Q70 45 140 60Q210 75 280 60" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="2.5"/><path d="M0 30Q100 35 140 25Q180 15 280 35" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="1.5"/><path d="M0 90Q70 85 140 92Q210 100 280 88" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="1.5"/></svg></div>';
    h += '<div class="loc-bubble-route"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M' + ux + ' ' + uy + ' Q' + mx + ' ' + my + ' ' + cx + ' ' + cy + '" fill="none" stroke="#3d7cf5" stroke-width="1.8" stroke-dasharray="3,2.5" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="11" to="0" dur="2s" repeatCount="indefinite"/></path></svg></div>';
    h += '<div class="loc-bubble-pin-u" style="left:' + ux + '%;top:' + uy + '%;transform:translate(-50%,-100%)"><svg viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="11" r="3" fill="rgba(255,255,255,.9)"/></svg></div>';
    h += '<div class="loc-bubble-pin-c" style="left:' + cx + '%;top:' + cy + '%;transform:translate(-50%,-100%)"><svg viewBox="0 0 24 32"><path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z"/><circle cx="12" cy="11" r="3" fill="rgba(255,255,255,.9)"/></svg></div>';
    h += '<div class="loc-bubble-dist">' + locFmtDist(dist) + '</div>';
    h += '</div>';

    // Info
    h += '<div class="loc-bubble-info">';
    h += '<div class="loc-bubble-title">' + locE(m.locUserPlace || '') + ' \u2192 ' + locE(m.locCharPlace || '') + '</div>';
    h += '<div class="loc-bubble-meta">';
    h += '<div class="loc-bubble-tag"><svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><b>' + locFmtDist(dist) + '</b></div>';
    if (car && dist < 2000) h += '<div class="loc-bubble-tag"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="14" height="12" rx="2"/><circle cx="6" cy="18" r="2"/><circle cx="15" cy="18" r="2"/></svg><b>' + locFmtTime(car) + '</b></div>';
    if (flight) h += '<div class="loc-bubble-tag"><svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/></svg><b>' + locFmtTime(flight) + '</b></div>';
    h += '</div>';
    h += '<div class="loc-bubble-hint"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Tap to view details / \u70b9\u51fb\u67e5\u770b\u8be6\u60c5</div>';
    h += '</div>';

    h += '</div>'; // /loc-bubble-card
    h += '</div></div></div>';
    return h;
}

/* ===== 角色主动发送位置（AI触发）===== */
function locCharSendLocation(charPlace, userPlace) {
    var role = typeof findRole === 'function' ? findRole(_chatCurrentConv) : null;
    if (!role) return;
    // ★★★ 关键修复：用 role.msgs 而不是 role.history ★★★
    if (!role.msgs) role.msgs = [];
    if (!userPlace) {
        var saved = (locLoad()[locRoleId()] || {});
        userPlace = saved.uText || locGetUserName();
    }

    var cC = locResolveCoords(charPlace);
    var uC = locResolveCoords(userPlace);
    var sDist = locHaversine(cC[0], cC[1], uC[0], uC[1]);
    var rDist = locRoadDist(sDist);
    var pos = locCoordsToMapPos(cC, uC);
    var car = Math.round(rDist / (rDist > 300 ? 90 : 35) * 60); if (car < 1) car = 1;
    var flight = sDist > 1000 ? Math.round(sDist / 850 * 60 + 90) : (sDist > 300 ? Math.round(sDist / 700 * 60 + 60) : 0);

    // ★★★ 关键修复：用 role.msgs ★★★
    role.msgs.push({
        from: 'other',
        text: '',
        time: new Date().toLocaleTimeString().slice(0, 5),
        location: true,
        locUserPlace: charPlace,
        locCharPlace: userPlace,
        locDist: rDist,
        locStraight: sDist,
        locCar: car,
        locFlight: flight,
        locUx: parseFloat(pos.ux), locUy: parseFloat(pos.uy),
        locCx: parseFloat(pos.cx), locCy: parseFloat(pos.cy),
        locMx: (parseFloat(pos.ux) + parseFloat(pos.cx)) / 2,
        locMy: (parseFloat(pos.uy) + parseFloat(pos.cy)) / 2 - 10
    });

    role.lastMsg = '[Location / \u5b9a\u4f4d] ' + charPlace;
    role.lastTime = new Date().toLocaleTimeString().slice(0, 5);
    if (typeof saveChatRoles === 'function') saveChatRoles();

    var body = document.getElementById('chatConvBody');
    if (body) {
        // ★★★ 关键修复：用 role.msgs ★★★
        var idx = role.msgs.length - 1;
        var myAv = '';
        var p = typeof getActivePersona === 'function' ? getActivePersona() : null;
        if (p && p.avatar) myAv = p.avatar;
        body.insertAdjacentHTML('beforeend', renderLocationBubbleRow(role.msgs[idx], idx, myAv, role.avatar || ''));
        body.scrollTop = body.scrollHeight;
    }
}

/* ===== 工具函数 ===== */
function locHash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }
function locScore(d) { if (d <= 3) return 92; if (d <= 8) return 80; if (d <= 20) return 65; if (d <= 50) return 50; if (d <= 150) return 35; if (d <= 500) return 20; if (d <= 2000) return 10; return 5; }
function locStName(seed, idx) { var pre = ['Central', 'East Lake', 'New Town', 'Sunshine', 'Riverside', 'Park', 'North', 'South Gate', 'West', 'Harbor', 'Green', 'Olympic', 'Tech', 'Culture', 'Station']; var suf = [' Rd', ' Square', ' Center', ' Park', ' Ave', ' Bridge', ' Bay', ' St']; return pre[(seed + idx * 7) % pre.length] + suf[(seed + idx * 3) % suf.length]; }
function locFmtTime(m) { if (m < 60) return m + 'min'; var h = Math.floor(m / 60), r = m % 60; if (h >= 24) { var d = Math.floor(h / 24); h = h % 24; return d + 'd' + (h > 0 ? ' ' + h + 'h' : ''); } return h + 'h' + (r > 0 ? ' ' + r + 'm' : ''); }
function locFmtDist(d) { if (d < 1) return Math.round(d * 1000) + 'm'; if (d < 100) return d.toFixed(1) + 'km'; return Math.round(d) + 'km'; }
function locE(s) { if (!s) return ''; return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
