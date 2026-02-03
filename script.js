const STORE_KEY = 'mini_phone_data_v3'; 

// 默认数据
let appData = {
    banner: 'https://s3.bmp.ovh/2026/02/01/TiEzLWqk.jpg',
    musicCover: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
    insText: '♡ ⑅ +.小猫的属性要以xx命名.+ ⑅ ♡',
    cd: {
        mode: 'up', title: '恋爱纪念日', date: '2026-02-03', color: '#ffffff',
        bg: '', bgPosX: 50, bgPosY: 50
    },
    apis: [],
    currentApiIndex: -1
};

window.onload = function() {
    loadData();
    refreshUI();
};

// --- 图片压缩与保存 (关键修复) ---
// 将图片绘制到 Canvas 压缩尺寸，防止 LocalStorage 溢出
function compressAndSaveImage(file, targetKey) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 限制最大宽高为 800px (足够小手机显示，体积大幅减小)
            const MAX_SIZE = 800;
            let width = img.width;
            let height = img.height;
            
            if (width > height) {
                if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
            } else {
                if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);
            
            // 压缩为 JPEG, 质量 0.7
            const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
            
            if (targetKey === 'banner') appData.banner = dataUrl;
            if (targetKey === 'music') appData.musicCover = dataUrl;
            if (targetKey === 'cdTemp') {
                // 仅预览，不存入 appData 直到点保存
                document.getElementById('cdPreview').src = dataUrl;
            } else {
                saveData(); // 立即保存 banner 和 music
                refreshUI();
            }
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
}

// --- 数据持久化 ---
function saveData() {
    try {
        appData.insText = document.getElementById('insText').innerText;
        localStorage.setItem(STORE_KEY, JSON.stringify(appData));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            alert("存储空间已满！请尝试使用更小的图片，或删除部分API设置。");
        } else {
            console.error("Save failed", e);
        }
    }
}

function loadData() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
            const saved = JSON.parse(raw);
            appData = { ...appData, ...saved };
            // 合并时确保深层对象存在
            if (!appData.cd.bgPosX) appData.cd.bgPosX = 50;
            if (!appData.cd.bgPosY) appData.cd.bgPosY = 50;
        }
    } catch (e) { console.error("Load failed", e); }
}

function refreshUI() {
    document.getElementById('banner-img').src = appData.banner;
    document.getElementById('music-cover').src = appData.musicCover;
    document.getElementById('insText').innerText = appData.insText;
    updateCountdownWidget();
    renderApiList();
}

// --- 倒数日逻辑 ---
function updateCountdownWidget() {
    const w = document.getElementById('countdownWidget');
    const dTitle = document.getElementById('displayTitle');
    const dDate = document.getElementById('displayDate');
    const dDays = document.getElementById('displayDays');

    dTitle.innerText = appData.cd.title;
    dDate.innerText = appData.cd.date;
    w.style.color = appData.cd.color;
    
    if (appData.cd.bg) {
        w.style.backgroundImage = `url(${appData.cd.bg})`;
        w.style.backgroundPosition = `${appData.cd.bgPosX}% ${appData.cd.bgPosY}%`;
    } else {
        w.style.backgroundImage = 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%)';
    }

    // 计算日期
    const target = new Date(appData.cd.date + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffTime = target - today;
    const diffDays = Math.ceil(Math.abs(diffTime) / (1000 * 60 * 60 * 24));

    if (appData.cd.mode === 'down') {
        if (diffTime > 0) dDays.innerHTML = `${diffDays}<span>天</span>`;
        else if (diffTime === 0) dDays.innerHTML = `今天`;
        else dDays.innerHTML = `已过`;
    } else {
        if (diffTime <= 0) dDays.innerHTML = `${diffDays}<span>天</span>`;
        else dDays.innerHTML = `未开始`;
    }
}

// APP 打开与关闭
function openApiApp() {
    document.getElementById('appApi').classList.add('active');
    renderApiList();
}
function openCountdownApp() {
    const cd = appData.cd;
    document.getElementById('cdTitleIn').value = cd.title;
    document.getElementById('cdDateIn').value = cd.date;
    document.getElementById('cdColorIn').value = cd.color;
    document.getElementById('cdHexIn').value = cd.color;
    
    // 预览位置初始化
    document.getElementById('cdPosX').value = cd.bgPosX || 50;
    document.getElementById('cdPosY').value = cd.bgPosY || 50;
    
    const preview = document.getElementById('cdPreview');
    if(cd.bg) {
        preview.src = cd.bg;
        preview.style.objectPosition = `${cd.bgPosX}% ${cd.bgPosY}%`;
    }
    
    document.getElementById('appCountdown').classList.add('active');
}
function closeApp(id) { document.getElementById(id).classList.remove('active'); }

// 预览位置实时更新
function updatePreviewPos() {
    const x = document.getElementById('cdPosX').value;
    const y = document.getElementById('cdPosY').value;
    document.getElementById('cdPreview').style.objectPosition = `${x}% ${y}%`;
}

// 保存倒数日设置
function setCdMode(m) { appData.cd.mode = m; }
function saveCountdown() {
    appData.cd.title = document.getElementById('cdTitleIn').value || '纪念日';
    appData.cd.date = document.getElementById('cdDateIn').value || new Date().toISOString().split('T')[0];
    appData.cd.color = document.getElementById('cdColorIn').value;
    
    // 保存位置
    appData.cd.bgPosX = document.getElementById('cdPosX').value;
    appData.cd.bgPosY = document.getElementById('cdPosY').value;

    const urlIn = document.getElementById('cdUrlIn').value;
    const previewSrc = document.getElementById('cdPreview').src;
    
    // 如果输入了URL，优先用URL，否则用预览图（可能是本地上传压缩后的Base64）
    if (urlIn) appData.cd.bg = urlIn;
    else if (previewSrc && previewSrc !== window.location.href) appData.cd.bg = previewSrc;

    saveData();
    refreshUI();
    closeApp('appCountdown');
}

// --- API 逻辑 ---
function addApi() {
    const name = document.getElementById('apiName').value.trim();
    const url = document.getElementById('apiUrl').value.trim();
    const key = document.getElementById('apiKey').value.trim();

    if (!name) { alert("API 名称必填"); return; }
    appData.apis.push({ name, url, key });
    appData.currentApiIndex = appData.apis.length - 1;
    saveData();
    renderApiList();
    
    document.getElementById('apiName').value = '';
    document.getElementById('apiUrl').value = '';
    document.getElementById('apiKey').value = '';
}
function renderApiList() {
    const container = document.getElementById('apiListContainer');
    container.innerHTML = '';
    if (appData.apis.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#999; padding:10px; font-size:12px;">暂无保存的配置</div>';
        return;
    }
    appData.apis.forEach((api, index) => {
        const div = document.createElement('div');
        div.className = `api-item ${index === appData.currentApiIndex ? 'active' : ''}`;
        div.onclick = () => { appData.currentApiIndex = index; saveData(); renderApiList(); };
        div.innerHTML = `
            <div>
                <div class="api-name">${api.name}</div>
                <div class="api-url">${api.url || 'No URL'}</div>
            </div>
            ${index === appData.currentApiIndex ? '<div style="font-size:12px; color:#ffb7c5;">● 使用中</div>' : ''}
            <div style="padding:5px; color:#ff3b30;" onclick="event.stopPropagation(); deleteApi(${index})">×</div>
        `;
        container.appendChild(div);
    });
}
function deleteApi(index) {
    if(!confirm('删除此配置?')) return;
    appData.apis.splice(index, 1);
    if(appData.currentApiIndex >= index) appData.currentApiIndex = -1;
    saveData();
    renderApiList();
}

// --- 文件选择 ---
let uploadType = '';
function triggerFile(type) {
    uploadType = type;
    document.getElementById('fileInput').click();
}
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (uploadType === 'cd') {
        compressAndSaveImage(file, 'cdTemp'); // 只预览，不存库
    } else {
        compressAndSaveImage(file, uploadType); // 直接存库
    }
    this.value = '';
});

// 音乐播放
let isPlaying = true;
function toggleMusic() {
    isPlaying = !isPlaying;
    const disc = document.getElementById('musicDisc');
    const icon = document.getElementById('play-icon');
    if (isPlaying) {
        disc.classList.remove('paused');
        icon.innerHTML = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
    } else {
        disc.classList.add('paused');
        icon.innerHTML = '<polygon points="5 4 15 12 5 20 5 4"/>';
    }
}
