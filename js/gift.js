/* ============================================
   蛋薯机 DanShu Pro v2 — gift.js
   礼物商城 · 订单 · 钱包扣款 · 聊天消息集成
   ============================================ */

let giftCategories = ['全部'];
const GIFT_COUNT = 12;
let giftItems = [];
let giftWallItems = [];
let giftOrders = [];
let giftCurrentCat = '全部';
let giftDetailIdx = -1;
let giftOrderCount = 0;

/* ===== 钱包系统 — 桥接到 chat.js 的 _chatWallet ===== */
function _ensureChatWallet() {
    if (typeof _chatWallet === 'undefined' || !_chatWallet) {
        try {
            window._chatWallet = JSON.parse(localStorage.getItem('ds_chat_wallet') || '{"balance":10000,"transactions":[]}');
        } catch (e) {
            window._chatWallet = { balance: 10000, transactions: [] };
        }
    }
    if (typeof _chatWallet.balance !== 'number') _chatWallet.balance = 10000;
    if (!Array.isArray(_chatWallet.transactions)) _chatWallet.transactions = [];
}
function _saveChatWalletBridge() {
    try { localStorage.setItem('ds_chat_wallet', JSON.stringify(_chatWallet)); } catch (e) { }
}
function getWalletBalance() {
    _ensureChatWallet();
    return _chatWallet.balance;
}
function setWalletBalance(val) {
    _ensureChatWallet();
    _chatWallet.balance = val;
    _saveChatWalletBridge();
}
function getWalletBills() {
    _ensureChatWallet();
    return _chatWallet.transactions || [];
}
function saveWalletBills(bills) {
    // transactions 是 _chatWallet 的一部分，不需要单独保存
}
function addWalletBill(type, desc, amount, orderNo) {
    _ensureChatWallet();
    var txId = 'gift' + Date.now() + Math.random().toString(36).substr(2, 4);
    var isOut = amount < 0;
    _chatWallet.transactions.unshift({
        id: txId,
        type: isOut ? 'transfer_out' : (type === '充值' ? 'recharge' : 'transfer_in'),
        amount: Math.abs(amount),
        remark: desc,
        target: '礼物商城',
        time: new Date().toLocaleString(),
        status: 'accepted',
        orderNo: orderNo || ''
    });
    _saveChatWalletBridge();
}

/* ===== 数据初始化 ===== */
function initGiftData() {
    const saved = localStorage.getItem('ds_gift_items');
    if (saved) {
        try {
            giftItems = JSON.parse(saved);
            while (giftItems.length < GIFT_COUNT) giftItems.push(createDefaultGift(giftItems.length));
        } catch (e) { giftItems = []; }
    }
    if (!giftItems.length) {
        for (let i = 0; i < GIFT_COUNT; i++) giftItems.push(createDefaultGift(i));
    }
    const savedWall = localStorage.getItem('ds_gift_wall');
    if (savedWall) { try { giftWallItems = JSON.parse(savedWall); } catch (e) { giftWallItems = []; } }
    const savedCats = localStorage.getItem('ds_gift_cats');
    if (savedCats) { try { const c = JSON.parse(savedCats); if (c.length) giftCategories = c; } catch (e) { } }
    if (giftCategories[0] !== '全部') giftCategories.unshift('全部');
    const savedOrders = localStorage.getItem('ds_gift_orders');
    if (savedOrders) { try { giftOrders = JSON.parse(savedOrders); } catch (e) { giftOrders = []; } }
    const savedOC = localStorage.getItem('ds_gift_order_count');
    if (savedOC) { try { giftOrderCount = parseInt(savedOC) || 0; } catch (e) { giftOrderCount = 0; } }
}

function createDefaultGift(idx) {
    return { id: idx, name: '未设置', price: '0.00', desc: '未设置', img: '', category: '全部' };
}

function saveGifts() { localStorage.setItem('ds_gift_items', JSON.stringify(giftItems)); }
function saveWall() { localStorage.setItem('ds_gift_wall', JSON.stringify(giftWallItems)); }
function saveCats() { localStorage.setItem('ds_gift_cats', JSON.stringify(giftCategories)); }
function saveOrders() {
    localStorage.setItem('ds_gift_orders', JSON.stringify(giftOrders));
    updateP2OrderCount();
}
function saveOrderCount() { localStorage.setItem('ds_gift_order_count', String(giftOrderCount)); }

function giftPlaceholderHTML(size) {
    const fs = size === 'big' ? '16px' : '12px';
    return `<span class="gift-placeholder" style="font-size:${fs};color:rgba(180,180,180,0.6);font-weight:500;user-select:none;">未设置</span>`;
}

/* ===== 渲染详情面板图片区 ===== */
function renderDetailImgArea(g) {
    if (g.img) {
        return `<img src="${g.img}" alt="">
                <div class="gift-detail-upload-btn">
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    更换图片
                </div>`;
    } else {
        return `<span class="gift-placeholder" style="font-size:16px;color:rgba(180,180,180,0.6);font-weight:500;user-select:none;">未设置</span>
                <div class="gift-detail-upload-btn">
                    <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    上传图片
                </div>`;
    }
}

/* ===== 打开/关闭商城 ===== */
function openGiftShop() {
    initGiftData();
    document.getElementById('giftShopOverlay').classList.add('show');
    renderGiftShop();
}
function closeGiftShop() {
    document.getElementById('giftShopOverlay').classList.remove('show');
}

/* ===== 渲染商城主体 ===== */
function renderGiftShop() {
    const body = document.getElementById('giftShopBody');
    if (!body) return;

    const recommend = giftItems.slice(0, 4);
    let recHTML = `
    <div class="gift-recommend-section">
        <div class="gift-recommend-header">
            <div class="gift-recommend-title">推荐</div>
            <div class="gift-recommend-more">查看全部
                <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
        </div>
        <div class="gift-recommend-scroll">`;
    recommend.forEach((g) => {
        recHTML += `
        <div class="gift-recommend-card" onclick="openGiftDetail(${g.id})">
            <div class="gift-recommend-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('small')}
            </div>
            <div class="gift-recommend-name">${escGift(g.name)}</div>
            <div class="gift-recommend-price">${g.price}</div>
        </div>`;
    });
    recHTML += `</div></div>`;

    let catHTML = `<div class="gift-category-bar">`;
    giftCategories.forEach((c, i) => {
        const isActive = giftCurrentCat === c ? ' active' : '';
        if (i === 0) {
            catHTML += `<div class="gift-category-chip${isActive}" onclick="switchGiftCat('${escAttr(c)}')">${escGift(c)}</div>`;
        } else {
            catHTML += `<div class="gift-category-chip${isActive}"
                onclick="switchGiftCat('${escAttr(c)}')"
                oncontextmenu="event.preventDefault();confirmDeleteCat(${i},'${escAttr(c)}')"
                ontouchstart="giftCatTouchStart(${i},'${escAttr(c)}')"
                ontouchend="giftCatTouchEnd()"
                ontouchmove="giftCatTouchEnd()">
                ${escGift(c)}
                <span class="gift-cat-del-x" onclick="event.stopPropagation();confirmDeleteCat(${i},'${escAttr(c)}')">x</span>
            </div>`;
        }
    });
    catHTML += `<div class="gift-category-add" onclick="addGiftCategory()">
        <svg viewBox="0 0 24 24" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </div></div>`;

    const filtered = giftCurrentCat === '全部' ? giftItems : giftItems.filter(g => g.category === giftCurrentCat);
    let gridHTML = `<div class="gift-grid">`;
    if (!filtered.length) {
        gridHTML += `<div style="grid-column:1/-1;text-align:center;padding:40px 0;font-size:13px;color:rgba(50,40,55,0.3);">该分类下暂无礼物</div>`;
    }
    filtered.forEach(g => {
        gridHTML += `
        <div class="gift-card" onclick="openGiftDetail(${g.id})">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
                <div class="gift-card-desc">${escGift(g.desc)}</div>
            </div>
        </div>`;
    });
    gridHTML += `</div>`;
    body.innerHTML = recHTML + catHTML + gridHTML;
}

function switchGiftCat(cat) { giftCurrentCat = cat; renderGiftShop(); }

/* ===== 分类管理 ===== */
let _catTouchTimer = null;
function giftCatTouchStart(idx, name) { _catTouchTimer = setTimeout(() => { confirmDeleteCat(idx, name); }, 600); }
function giftCatTouchEnd() { if (_catTouchTimer) { clearTimeout(_catTouchTimer); _catTouchTimer = null; } }
function addGiftCategory() {
    const name = prompt('输入新分组名称:');
    if (!name || !name.trim()) return;
    const n = name.trim();
    if (giftCategories.includes(n)) { alert('该分组已存在'); return; }
    giftCategories.push(n); saveCats(); renderGiftShop();
}
function confirmDeleteCat(idx, name) {
    giftCatTouchEnd(); if (idx <= 0) return;
    if (confirm('确定删除分组「' + name + '」吗？')) {
        giftItems.forEach(g => { if (g.category === name) g.category = '全部'; });
        saveGifts(); giftCategories.splice(idx, 1); saveCats();
        if (giftCurrentCat === name) giftCurrentCat = '全部'; renderGiftShop();
    }
}

/* ===== 礼物详情弹窗 ===== */
function openGiftDetail(id) {
    giftDetailIdx = id;
    const g = giftItems.find(x => x.id === id);
    if (!g) return;

    let catOptions = '';
    giftCategories.forEach(c => {
        catOptions += `<option value="${escAttr(c)}"${g.category === c ? ' selected' : ''}>${escGift(c)}</option>`;
    });

    const ov = document.getElementById('giftDetailOverlay');
    ov.innerHTML = `
    <div class="gift-detail-panel" onclick="event.stopPropagation()">
        <div class="gift-detail-close" onclick="closeGiftDetail()">
            <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </div>
        <div class="gift-detail-img-wrap" id="giftDetailImgWrap" onclick="uploadGiftImg(${id})">
            ${renderDetailImgArea(g)}
        </div>
        <div class="gift-detail-body">
            <div class="gift-detail-field">
                <label class="gift-detail-label">名称</label>
                <input class="gift-detail-name-input" id="giftDetailNameInput" type="text"
                    value="${escAttr(g.name)}" placeholder="输入礼物名称"
                    oninput="liveUpdateName(${id}, this.value)"
                    onclick="event.stopPropagation(); this.select()"
                    onfocus="event.stopPropagation()">
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">价格</label>
                <input class="gift-detail-price-input" id="giftDetailPriceInput" type="text"
                    value="${escAttr(g.price)}" placeholder="0.00"
                    oninput="liveUpdatePrice(${id}, this.value)"
                    onclick="event.stopPropagation(); this.select()"
                    onfocus="event.stopPropagation()">
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">分类</label>
                <select class="gift-detail-cat-select" onchange="liveUpdateCategory(${id}, this.value)" onclick="event.stopPropagation()">
                    ${catOptions}
                </select>
            </div>
            <div class="gift-detail-field">
                <label class="gift-detail-label">描述</label>
                <textarea class="gift-detail-desc-input" id="giftDetailDescInput"
                    placeholder="输入礼物描述" rows="2"
                    oninput="liveUpdateDesc(${id}, this.value)"
                    onclick="event.stopPropagation()"
                    onfocus="event.stopPropagation()">${escGift(g.desc)}</textarea>
            </div>
            <div class="gift-detail-btns">
                <div class="gift-detail-save-btn" onclick="saveAndClose(${id})">保存设置</div>
                <div class="gift-detail-buy-btn" onclick="openOrderConfirm(${id})">送出</div>
            </div>
            <div class="gift-detail-balance">余额: ${getWalletBalance().toFixed(2)}</div>
        </div>
    </div>`;

    ov.onclick = function (e) { if (e.target === ov) closeGiftDetail(); };
    requestAnimationFrame(() => { ov.classList.add('show'); });
}

function closeGiftDetail() {
    const ov = document.getElementById('giftDetailOverlay');
    ov.classList.remove('show');
    setTimeout(() => { if (!ov.classList.contains('show')) { ov.innerHTML = ''; ov.onclick = null; } }, 350);
    giftDetailIdx = -1;
    renderGiftShop();
}

/* ===== 实时编辑 ===== */
function liveUpdateName(id, val) { const g = giftItems.find(x => x.id === id); if (g) { g.name = val || '未设置'; saveGifts(); } }
function liveUpdatePrice(id, val) { const g = giftItems.find(x => x.id === id); if (g) { g.price = val || '0.00'; saveGifts(); } }
function liveUpdateDesc(id, val) { const g = giftItems.find(x => x.id === id); if (g) { g.desc = val || '未设置'; saveGifts(); } }
function liveUpdateCategory(id, val) { const g = giftItems.find(x => x.id === id); if (g) { g.category = val || '全部'; saveGifts(); } }

function saveAndClose(id) {
    const g = giftItems.find(x => x.id === id);
    if (g) {
        const n = parseFloat(g.price);
        g.price = isNaN(n) ? '0.00' : n.toFixed(2);
        if (!g.name || !g.name.trim()) g.name = '未设置';
        if (!g.desc || !g.desc.trim()) g.desc = '未设置';
        saveGifts();
    }
    closeGiftDetail();
    if (typeof showToast === 'function') showToast('已保存');
}

/* ===== 上传图片 ===== */
function uploadGiftImg(id) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = 'image/*';
    inp.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
    document.body.appendChild(inp);
    inp.addEventListener('change', function () {
        const file = this.files && this.files[0];
        try { document.body.removeChild(inp); } catch (e) { }
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function (ev) {
            const g = giftItems.find(x => x.id === id);
            if (!g) return;
            g.img = ev.target.result;
            saveGifts();
            const wrap = document.getElementById('giftDetailImgWrap');
            if (wrap) wrap.innerHTML = renderDetailImgArea(g);
        };
        reader.readAsDataURL(file);
    });
    requestAnimationFrame(() => { inp.click(); });
}

/* ==========================================================
   订单号 & 日期
   ========================================================== */
function generateOrderNo() {
    const now = new Date();
    const ymd = String(now.getFullYear()).slice(-2) +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');
    const hm = String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
    giftOrderCount++;
    saveOrderCount();
    return ymd + hm + String(giftOrderCount).padStart(4, '0');
}

function formatOrderDate(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

/* ==========================================================
   订单确认悬浮窗
   ========================================================== */
function openOrderConfirm(id) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    const now = Date.now();
    const orderNo = generateOrderNo();
    const orderDate = formatOrderDate(now);
    const bal = getWalletBalance();

    let ov = document.getElementById('giftOrderOverlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'giftOrderOverlay';
        ov.className = 'gift-order-overlay';
        const parent = document.getElementById('giftShopOverlay');
        if (parent && parent.parentElement) parent.parentElement.appendChild(ov);
        else document.body.appendChild(ov);
    }

    ov.innerHTML = `
    <div class="gift-order-panel" onclick="event.stopPropagation()">
        <div class="gift-order-header">
            <div class="gift-order-title">确认订单</div>
            <div class="gift-order-close" onclick="closeOrderConfirm()">
                <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </div>
        </div>
        <div class="gift-order-body">
            <div class="gift-order-product">
                <div class="gift-order-product-img">
                    ${g.img ? `<img src="${g.img}" alt="">` : `<span style="font-size:11px;color:rgba(180,180,180,0.6);">无图</span>`}
                </div>
                <div class="gift-order-product-info">
                    <div class="gift-order-product-name">${escGift(g.name)}</div>
                    <div class="gift-order-product-desc">${escGift(g.desc)}</div>
                </div>
                <div class="gift-order-product-price">${g.price}</div>
            </div>
            <div class="gift-order-info-block">
                <div class="gift-order-row">
                    <span class="gift-order-row-label">创建时间</span>
                    <span class="gift-order-row-val">${orderDate}</span>
                </div>
                <div class="gift-order-row">
                    <span class="gift-order-row-label">订单号</span>
                    <span class="gift-order-row-val gift-order-no">${orderNo}</span>
                </div>
                <div class="gift-order-row">
                    <span class="gift-order-row-label">钱包余额</span>
                    <span class="gift-order-row-val">${bal.toFixed(2)}</span>
                </div>
            </div>
            <div class="gift-order-info-block">
                <div class="gift-order-row">
                    <span class="gift-order-row-label">收货位置</span>
                </div>
                <textarea class="gift-order-addr-input" id="giftOrderAddr"
                    placeholder="输入收货地址..."
                    onclick="event.stopPropagation()"
                    onfocus="event.stopPropagation()"
                    rows="2"></textarea>
            </div>
            <div class="gift-order-total">
                <span>合计</span>
                <span class="gift-order-total-price">${g.price}</span>
            </div>
        </div>
        <div class="gift-order-actions">
            <div class="gift-order-btn-secondary" onclick="askOtherPay(${id},'${escAttr(orderNo)}',${now})">请TA代付</div>
            <div class="gift-order-btn-primary" onclick="placeOrder(${id},'${escAttr(orderNo)}',${now})">下单</div>
        </div>
    </div>`;

    ov.onclick = function (e) { if (e.target === ov) closeOrderConfirm(); };
    requestAnimationFrame(() => { ov.classList.add('show'); });
}

function closeOrderConfirm() {
    const ov = document.getElementById('giftOrderOverlay');
    if (!ov) return;
    ov.classList.remove('show');
    setTimeout(() => { if (!ov.classList.contains('show')) ov.innerHTML = ''; }, 300);
}

/* ==========================================================
   ★ 下单（自付）— 扣钱包 + 记账单 + 存消息 + 跳回聊天
   ========================================================== */
function placeOrder(id, orderNo, ts) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    const price = parseFloat(g.price) || 0;
    const bal = getWalletBalance();

    if (price > bal) {
        if (typeof showToast === 'function') showToast('余额不足');
        else alert('余额不足');
        return;
    }

    const addr = (document.getElementById('giftOrderAddr') || {}).value || '未填写';

    // 记住当前对话角色ID（关闭overlay前取）
    var targetRid = _chatCurrentConv;

    // 扣款
    setWalletBalance(bal - price);
    addWalletBill('支出', '购买礼物: ' + g.name, -price, orderNo);

    const order = {
        orderNo, giftId: id, giftName: g.name, giftImg: g.img,
        giftDesc: g.desc, price: g.price, address: addr,
        createdAt: ts, status: '已发货', payType: '自付',
        targetRoleId: targetRid
    };
    giftOrders.unshift(order);
    saveOrders();

    giftWallItems.push({ ...g, sentAt: ts });
    saveWall();

    // 关闭所有礼物弹窗
    closeOrderConfirm();
    closeGiftDetail();
    closeGiftShop();

    // 存消息到角色 + 跳转回聊天
    _pushGiftMsg(targetRid, true, 'delivery', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });

    if (typeof showToast === 'function') showToast('下单成功，已从钱包扣款 ' + price.toFixed(2));
}

/* ==========================================================
   ★ 请TA代付 — 存消息 + 跳回聊天
   ========================================================== */
function askOtherPay(id, orderNo, ts) {
    const g = giftItems.find(x => x.id === id);
    if (!g) return;
    const addr = (document.getElementById('giftOrderAddr') || {}).value || '未填写';

    // 记住当前对话角色ID
    var targetRid = _chatCurrentConv;

    const order = {
        orderNo, giftId: id, giftName: g.name, giftImg: g.img,
        giftDesc: g.desc, price: g.price, address: addr,
        createdAt: ts, status: '待代付', payType: '请TA代付',
        targetRoleId: targetRid
    };
    giftOrders.unshift(order);
    saveOrders();

    // 关闭所有礼物弹窗
    closeOrderConfirm();
    closeGiftDetail();
    closeGiftShop();

    // 存消息到角色 + 跳转回聊天
    _pushGiftMsg(targetRid, true, 'request', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });

    if (typeof showToast === 'function') showToast('已发送代付请求');
}

/* ==========================================================
   工具：获取时间字符串
   ========================================================== */
function _giftTimeStr() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/* ==========================================================
   ★★★ 核心修复：把礼物卡片消息存入 role.msgs 并重新打开对话
   之前的 bug：往 chatConversation 追加 HTML，但消息气泡实际
   渲染在 chatConvBody 里，所以看不到。
   修复方案：存完消息后直接调用 openConversation(rid) 重新渲染。
   ========================================================== */
function _pushGiftMsg(targetRid, fromSelf, giftCardType, giftData) {
    var rid = targetRid || _chatCurrentConv;
    if (!rid && typeof _chatRoles !== 'undefined' && _chatRoles.length) rid = _chatRoles[0].id;
    if (!rid) return;
    var role = (typeof findRole === 'function') ? findRole(rid) : null;
    if (!role) return;
    if (!role.msgs) role.msgs = [];

    var msgObj = {
        from: fromSelf ? 'self' : 'other',
        text: '',
        time: _giftTimeStr(),
        ts: Date.now(),
        giftCard: true,
        giftCardType: giftCardType,
        giftData: giftData
    };
    role.msgs.push(msgObj);

    // 更新消息列表预览
    var previewMap = {
        'delivery': '送出了一份礼物',
        'request': '请求代付一份礼物',
        'charGift': '送了你一份礼物'
    };
    role.lastMsg = previewMap[giftCardType] || '礼物消息';
    role.lastTime = Date.now();
    role.lastTimeStr = _giftTimeStr();
    if (typeof saveChatRoles === 'function') saveChatRoles();

    // ★ 直接调用 openConversation 重新渲染整个对话页（最可靠）
    if (typeof openConversation === 'function') {
        openConversation(rid);
    }
}

/* ==========================================================
   发送拆礼物卡片（下单成功后）
   ========================================================== */
function sendGiftDeliveryCard(g, orderNo, sender, targetRid) {
    _pushGiftMsg(targetRid, true, 'delivery', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });
}

/* ==========================================================
   发送代付请求卡片
   ========================================================== */
function sendPayRequestCard(g, orderNo, targetRid) {
    _pushGiftMsg(targetRid, true, 'request', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });
}

/* ==========================================================
   Char代付确认
   ========================================================== */
function charConfirmPay(orderNo) {
    initGiftData();
    var order = null;
    for (var i = 0; i < giftOrders.length; i++) {
        if (giftOrders[i].orderNo === orderNo) { order = giftOrders[i]; break; }
    }
    if (!order) return;
    if (order.status !== '待代付') {
        if (typeof showToast === 'function') showToast('该订单已处理');
        return;
    }

    order.status = '已发货';
    order.payType = 'TA已代付';
    saveOrders();

    giftWallItems.push({ name: order.giftName, img: order.giftImg, desc: order.giftDesc, price: order.price, sentAt: Date.now() });
    saveWall();

    var g = { name: order.giftName, img: order.giftImg, desc: order.giftDesc, price: order.price };
    _pushGiftMsg(order.targetRoleId, true, 'delivery', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });

    if (typeof showToast === 'function') showToast('TA已帮你付款，礼物已发出');
}

/* ==========================================================
   Char主动送礼
   ========================================================== */
function charSendGift(giftId) {
    initGiftData();
    var g = giftItems.find(function (x) { return x.id === giftId; });
    if (!g) return;
    var orderNo = generateOrderNo();
    var ts = Date.now();
    var targetRid = _chatCurrentConv;

    var order = {
        orderNo: orderNo, giftId: giftId, giftName: g.name, giftImg: g.img,
        giftDesc: g.desc, price: g.price, address: '',
        createdAt: ts, status: '已发货', payType: 'TA送出', fromChar: true,
        targetRoleId: targetRid
    };
    giftOrders.unshift(order);
    saveOrders();
    giftWallItems.push({ name: g.name, img: g.img, desc: g.desc, price: g.price, sentAt: ts });
    saveWall();

    _pushGiftMsg(targetRid, false, 'charGift', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });
}

// char请user代付
function charAskUserPay(giftId) {
    initGiftData();
    var g = giftItems.find(function (x) { return x.id === giftId; });
    if (!g) return;
    var orderNo = generateOrderNo();
    var ts = Date.now();
    var targetRid = _chatCurrentConv;

    var order = {
        orderNo: orderNo, giftId: giftId, giftName: g.name, giftImg: g.img,
        giftDesc: g.desc, price: g.price, address: '',
        createdAt: ts, status: '待User代付', payType: 'TA请你代付', fromChar: true,
        targetRoleId: targetRid
    };
    giftOrders.unshift(order);
    saveOrders();

    _pushGiftMsg(targetRid, false, 'charGift', {
        name: g.name, img: g.img || '', desc: g.desc || '',
        price: g.price, orderNo: orderNo
    });
}

// user收下char的礼物
function acceptCharGift(orderNo) {
    initGiftData();
    var order = null;
    for (var i = 0; i < giftOrders.length; i++) {
        if (giftOrders[i].orderNo === orderNo) { order = giftOrders[i]; break; }
    }
    if (!order) return;
    if (order.status === '已发货' || order.status === '已收货') {
        if (typeof showToast === 'function') showToast('已收下');
        return;
    }
    order.status = '已发货';
    saveOrders();
    giftWallItems.push({ name: order.giftName, img: order.giftImg, desc: order.giftDesc, price: order.price, sentAt: Date.now() });
    saveWall();
    if (typeof showToast === 'function') showToast('已收下礼物');
}

// user为char的礼物付款
function userPayForCharGift(orderNo) {
    initGiftData();
    var order = null;
    for (var i = 0; i < giftOrders.length; i++) {
        if (giftOrders[i].orderNo === orderNo) { order = giftOrders[i]; break; }
    }
    if (!order) return;
    var price = parseFloat(order.price) || 0;
    var bal = getWalletBalance();
    if (price > bal) {
        if (typeof showToast === 'function') showToast('余额不足');
        return;
    }
    setWalletBalance(bal - price);
    addWalletBill('支出', '代付礼物: ' + order.giftName, -price, orderNo);
    order.status = '已发货';
    order.payType = '你已代付';
    saveOrders();
    giftWallItems.push({ name: order.giftName, img: order.giftImg, desc: order.giftDesc, price: order.price, sentAt: Date.now() });
    saveWall();

    _pushGiftMsg(order.targetRoleId, true, 'delivery', {
        name: order.giftName, img: order.giftImg || '', desc: order.giftDesc || '',
        price: order.price, orderNo: orderNo
    });

    if (typeof showToast === 'function') showToast('已付款 ' + price.toFixed(2));
}

/* ==========================================================
   我的订单页面
   ========================================================== */
function openMyOrders() {
    initGiftData();
    let ov = document.getElementById('giftMyOrdersOverlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'giftMyOrdersOverlay';
        ov.className = 'gift-orders-overlay';
        document.querySelector('.phone-frame').appendChild(ov);
    }
    renderMyOrders(ov);
    requestAnimationFrame(() => { ov.classList.add('show'); });
}

function renderMyOrders(ov) {
    if (!ov) ov = document.getElementById('giftMyOrdersOverlay');
    if (!ov) return;

    const bal = getWalletBalance();
    let html = `
    <div class="gift-orders-header">
        <div class="gift-orders-back" onclick="closeMyOrders()">
            <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
        <div class="gift-orders-title">我的订单</div>
        <div class="gift-orders-wallet" onclick="openWalletDetail()">
            <svg viewBox="0 0 24 24" width="15" height="15" style="stroke:rgba(50,40,55,0.5);stroke-width:2;fill:none;">
                <rect x="2" y="4" width="20" height="16" rx="3"/>
                <path d="M2 10h20"/>
                <circle cx="17" cy="14" r="1.5"/>
            </svg>
        </div>
    </div>
    <div class="gift-orders-balance-bar">
        <span>钱包余额</span>
        <span class="gift-orders-bal-num">${bal.toFixed(2)}</span>
    </div>
    <div class="gift-orders-body">`;

    if (!giftOrders.length) {
        html += `<div style="text-align:center;padding:60px 20px;font-size:13px;color:rgba(50,40,55,0.3);line-height:2;">暂无订单</div>`;
    } else {
        giftOrders.forEach((o, i) => {
            const isShipped = o.status === '已发货';
            const isPending = o.status === '待代付' || o.status === '待User代付';
            const statusClass = isShipped ? 'done' : (isPending ? 'pending' : 'normal');

            let actionBtns = '';
            if (isShipped) {
                actionBtns = `<span class="gift-order-card-action" onclick="refundOrder(${i})">退货退款</span>`;
            } else if (isPending) {
                actionBtns = `<span class="gift-order-card-action" onclick="cancelOrder(${i})">取消</span>`;
            }

            html += `
            <div class="gift-order-card">
                <div class="gift-order-card-top">
                    <span class="gift-order-card-no">No.${escGift(o.orderNo)}</span>
                    <span class="gift-order-card-status gift-order-status-${statusClass}">${escGift(o.status)}</span>
                </div>
                <div class="gift-order-card-content">
                    <div class="gift-order-card-img">
                        ${o.giftImg ? `<img src="${o.giftImg}" alt="">` : `<span style="font-size:10px;color:rgba(180,180,180,0.5);">无图</span>`}
                    </div>
                    <div class="gift-order-card-info">
                        <div class="gift-order-card-name">${escGift(o.giftName)}</div>
                        <div class="gift-order-card-addr">${o.address ? '收货: ' + escGift(o.address) : ''}</div>
                        <div class="gift-order-card-time">${formatOrderDate(o.createdAt)}</div>
                    </div>
                    <div class="gift-order-card-price">${o.price}</div>
                </div>
                <div class="gift-order-card-bottom">
                    <span class="gift-order-card-paytype">${escGift(o.payType)}</span>
                    <div style="display:flex;gap:8px;">
                        ${actionBtns}
                        <span class="gift-order-card-del" onclick="deleteOrder(${i})">删除</span>
                    </div>
                </div>
            </div>`;
        });
    }
    html += `</div>`;
    ov.innerHTML = html;
}

function closeMyOrders() {
    const ov = document.getElementById('giftMyOrdersOverlay');
    if (ov) { ov.classList.remove('show'); setTimeout(() => { ov.innerHTML = ''; }, 300); }
}

function deleteOrder(idx) {
    if (!confirm('确定删除该订单记录？')) return;
    giftOrders.splice(idx, 1);
    saveOrders();
    renderMyOrders();
}

function cancelOrder(idx) {
    if (!confirm('确定取消该订单？')) return;
    giftOrders.splice(idx, 1);
    saveOrders();
    renderMyOrders();
    if (typeof showToast === 'function') showToast('订单已取消');
}

/* ==========================================================
   退货退款
   ========================================================== */
function refundOrder(idx) {
    const o = giftOrders[idx];
    if (!o) return;
    const reason = prompt('请填写退货理由:');
    if (!reason || !reason.trim()) return;

    const price = parseFloat(o.price) || 0;

    if (o.payType === '自付' || o.payType === '你已代付') {
        const bal = getWalletBalance();
        setWalletBalance(bal + price);
        addWalletBill('退款', '退货: ' + o.giftName + ' (理由: ' + reason.trim() + ')', price, o.orderNo);
    }

    o.status = '已退货';
    o.refundReason = reason.trim();
    saveOrders();
    renderMyOrders();
    if (typeof showToast === 'function') showToast('退货成功，已退款 ' + price.toFixed(2));
}

/* ==========================================================
   钱包账单详情 — 直接打开 chat.js 的钱包页面
   ========================================================== */
function openWalletDetail() {
    // 桥接到 chat.js 的钱包页面
    if (typeof openWalletPage === 'function') {
        openWalletPage();
    } else {
        if (typeof showToast === 'function') showToast('请先打开聊天应用');
    }
}

function closeWalletDetail() {
    // 兼容旧调用
    if (typeof closeWalletPage === 'function') closeWalletPage();
}

function rechargeWallet() {
    // 桥接到 chat.js 的充值
    if (typeof walletRecharge === 'function') {
        walletRecharge();
    } else {
        var amount = prompt('输入充值金额:');
        if (!amount) return;
        var num = parseFloat(amount);
        if (isNaN(num) || num <= 0) { alert('请输入有效金额'); return; }
        _ensureChatWallet();
        _chatWallet.balance += num;
        _chatWallet.transactions.unshift({
            id: 'rc' + Date.now(), type: 'recharge', amount: num,
            remark: '账户充值', target: '系统',
            time: new Date().toLocaleString(), status: 'accepted'
        });
        _saveChatWalletBridge();
        if (typeof showToast === 'function') showToast('充值成功 +' + num.toFixed(2));
    }
}

/* ===== 搜索 ===== */
function openGiftSearch() {
    const ov = document.getElementById('giftSearchOverlay');
    ov.innerHTML = `
    <div class="gift-search-header">
        <input class="gift-search-input" id="giftSearchInput" type="text"
            placeholder="搜索礼物名称..." oninput="doGiftSearch(this.value)" autofocus>
        <div class="gift-search-cancel" onclick="closeGiftSearch()">取消</div>
    </div>
    <div class="gift-search-body" id="giftSearchBody">
        <div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">输入关键词搜索</div>
    </div>`;
    ov.classList.add('show');
    setTimeout(() => { const i = document.getElementById('giftSearchInput'); if (i) i.focus(); }, 300);
}
function closeGiftSearch() {
    const ov = document.getElementById('giftSearchOverlay');
    ov.classList.remove('show');
    setTimeout(() => { ov.innerHTML = ''; }, 250);
}
function doGiftSearch(kw) {
    const body = document.getElementById('giftSearchBody');
    if (!body) return;
    if (!kw.trim()) { body.innerHTML = `<div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">输入关键词搜索</div>`; return; }
    const results = giftItems.filter(g => g.name.includes(kw) || g.desc.includes(kw));
    if (!results.length) { body.innerHTML = `<div style="text-align:center;padding:40px 0;font-size:12px;color:rgba(50,40,55,0.3);">未找到相关礼物</div>`; return; }
    let html = `<div class="gift-grid">`;
    results.forEach(g => {
        html += `
        <div class="gift-card" onclick="closeGiftSearch();openGiftDetail(${g.id})">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    body.innerHTML = html;
}

/* ===== 礼物墙 ===== */
function openGiftWall() {
    const ov = document.getElementById('giftWallOverlay'); if (!ov) return;
    ov.classList.add('show'); renderGiftWall();
}
function closeGiftWall() {
    const ov = document.getElementById('giftWallOverlay'); if (ov) ov.classList.remove('show');
}
function renderGiftWall() {
    const body = document.getElementById('giftWallBody'); if (!body) return;
    if (!giftWallItems.length) {
        body.innerHTML = `<div style="text-align:center;padding:60px 20px;font-size:13px;color:rgba(50,40,55,0.3);line-height:2;">还没有收到礼物</div>`; return;
    }
    let html = `<div class="gift-grid" style="padding:14px;">`;
    giftWallItems.forEach((g) => {
        html += `
        <div class="gift-card">
            <div class="gift-card-img" style="background:#fff;">
                ${g.img ? `<img src="${g.img}" alt="">` : giftPlaceholderHTML('big')}
            </div>
            <div class="gift-card-info">
                <div class="gift-card-name">${escGift(g.name)}</div>
                <div class="gift-card-price">${g.price}</div>
                <div class="gift-card-desc">${new Date(g.sentAt).toLocaleDateString()}</div>
            </div>
        </div>`;
    });
    html += `</div>`;
    body.innerHTML = html;
}

/* ===== 礼物卡片详情弹窗（点击聊天中的礼物盒卡片时弹出） ===== */
function showGiftCardDetail(orderNo) {
    initGiftData();
    var order = null;
    for (var i = 0; i < giftOrders.length; i++) {
        if (giftOrders[i].orderNo === orderNo) { order = giftOrders[i]; break; }
    }
    if (!order) { if (typeof showToast === 'function') showToast('订单未找到'); return; }

    var ov = document.getElementById('giftCardDetailPopup');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'giftCardDetailPopup';
        var pf = document.querySelector('.phone-frame');
        if (pf) pf.appendChild(ov);
        else document.body.appendChild(ov);
    }

    var imgPart = order.giftImg
        ? '<img src="' + order.giftImg + '" style="width:100%;height:100%;object-fit:cover;display:block;">'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(150,140,155,0.5);">无图</div>';

    var statusColor = order.status === '已发货' ? 'rgba(80,160,100,0.85)' : (order.status === '待代付' || order.status === '待User代付' ? 'rgba(255,160,80,0.85)' : 'rgba(50,40,55,0.5)');

    ov.style.cssText = 'position:absolute;inset:0;z-index:999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;border-radius:44px;';
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

/* ==========================================================
   ★ "我"页面渲染订单入口（供 chat.js 的 renderMe 调用）
   订单入口同时显示在 p2 页面
   ========================================================== */
function renderMeOrdersSection() {
    return '';
}

/* ===== 更新 p2 订单计数 ===== */
function updateP2OrderCount() {
    initGiftData();
    var el = document.getElementById('p2OrderCount');
    if (el) {
        var cnt = giftOrders.length;
        var shipped = 0;
        for (var i = 0; i < giftOrders.length; i++) {
            if (giftOrders[i].status === '已发货') shipped++;
        }
        el.textContent = cnt + '单' + (shipped > 0 ? ' · ' + shipped + '已发货' : '');
    }
}

/* ===== 工具 ===== */
function escGift(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function escAttr(str) { if (!str) return ''; return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

document.addEventListener('DOMContentLoaded', function () { initGiftData(); });
