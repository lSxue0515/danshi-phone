/* ============================================
   Forum 论坛 — Full Feature v4
   ============================================ */
(function () {

    /* ===== 数据 ===== */
    var _fm = {
        tab: 'home',
        view: 'main',
        forums: [],
        posts: [],
        currentForum: null,
        currentPost: null,
        meTab: 'posts',
        profile: {
            avatar: '',
            nameEn: 'username',
            nameCn: '用户名',
            bio: 'No bio yet 暂无简介'
        }
    };

    try {
        var saved = localStorage.getItem('_fmData');
        if (saved) {
            var d = JSON.parse(saved);
            if (d.forums) _fm.forums = d.forums;
            if (d.posts) _fm.posts = d.posts;
            if (d.profile) {
                _fm.profile = d.profile;
                if (!_fm.profile.nameEn) _fm.profile.nameEn = 'username';
                if (!_fm.profile.nameCn) _fm.profile.nameCn = '用户名';
            }
        }
    } catch (e) { }

    function _fmSave() {
        try {
            localStorage.setItem('_fmData', JSON.stringify({
                forums: _fm.forums,
                posts: _fm.posts,
                profile: _fm.profile
            }));
        } catch (e) { }
    }

    function _fmE(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _fmId() {
        return 'fm_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    }

    function _fmTimeAgo(ts) {
        if (!ts) return '';
        var d = Date.now() - ts;
        if (d < 60000) return 'just now';
        if (d < 3600000) return Math.floor(d / 60000) + 'min';
        if (d < 86400000) return Math.floor(d / 3600000) + 'h';
        return Math.floor(d / 86400000) + 'd';
    }

    function _fmGetRoles() {
        if (typeof loadChatRoles === 'function') loadChatRoles();
        return (typeof _chatRoles !== 'undefined' && _chatRoles) ? _chatRoles : [];
    }

    function _fmGetApi() {
        if (typeof _thGetApi === 'function') return _thGetApi();
        var url = '', key = '', model = '';
        var urlKeys = ['apiUrl', 'api_url', 'apiBaseUrl', 'api_base_url'];
        var keyKeys = ['apiKey', 'api_key', 'apiSecretKey', 'api_secret_key'];
        var mdlKeys = ['selectedModel', 'apiModel', 'api_model', 'model'];
        for (var i = 0; i < urlKeys.length; i++) { if (!url) try { url = localStorage.getItem(urlKeys[i]) || ''; } catch (e) { } }
        for (var j = 0; j < keyKeys.length; j++) { if (!key) try { key = localStorage.getItem(keyKeys[j]) || ''; } catch (e) { } }
        for (var k = 0; k < mdlKeys.length; k++) { if (!model) try { model = localStorage.getItem(mdlKeys[k]) || ''; } catch (e) { } }
        if (!url) try { var el = document.getElementById('apiUrl'); if (el) url = el.value.trim(); } catch (e) { }
        if (!key) try { var el2 = document.getElementById('apiKey'); if (el2) key = el2.value.trim(); } catch (e) { }
        if (!model) try { var el3 = document.getElementById('apiModelSelect'); if (el3) model = el3.value.trim(); } catch (e) { }
        if (!url || !key) {
            try {
                for (var n = 0; n < localStorage.length; n++) {
                    var lk = localStorage.key(n); var lv = localStorage.getItem(lk) || '';
                    if (!url && lv.indexOf('http') === 0 && lv.indexOf('/') > 6) url = lv;
                    if (!key && (lv.indexOf('sk-') === 0 || (lv.length > 30 && lk.toLowerCase().indexOf('key') >= 0))) key = lv;
                }
            } catch (e) { }
        }
        if (!model) model = 'gpt-3.5-turbo';
        return { url: url.trim(), key: key.trim(), model: model.trim() };
    }

    function _fmBuildEndpoint(u) {
        u = u.replace(/\/+$/, '');
        if (u.indexOf('/chat/completions') >= 0) return u;
        if (u.indexOf('/v1') >= 0) return u + '/chat/completions';
        return u + '/v1/chat/completions';
    }

    /* ===== 昵称系统 ===== */
    function _fmCharNick(charName) {
        var prefixes = ['小小', '暗夜', '追风', '星辰', '月下', '浮云', '深海', '极光', '烟火', '薄荷',
            '晚风', '长安', '余晖', '南栀', '北辰', '清酒', '故里', '迷雾', '潮汐', '银河'];
        var suffixes = ['少年', '旅人', '过客', '漫步者', '观察者', '梦想家', '收藏家', '爱好者', '路人甲', '无名氏',
            '的猫', '很忙', '在线', '冒泡', '打卡', '摸鱼中', '今天也在', '不想说话', '喝奶茶', '吃瓜中'];
        var seed = 0;
        for (var i = 0; i < charName.length; i++) seed += charName.charCodeAt(i);
        return prefixes[seed % prefixes.length] + suffixes[(seed * 7) % suffixes.length] + '（' + charName + '）';
    }

    function _fmRandomNick() {
        var pool = ['吃瓜群众', '匿名网友', '路过的', '打酱油的', '潜水员', '小透明',
            '今天也在摸鱼', '不愿透露姓名的王先生', '隔壁老王', '一个路人',
            '刚注册的新人', '万年潜水', '偶尔冒泡', '纯路过', '看热闹的',
            '深夜失眠选手', '无聊刷帖中', '划水专业户', '吃瓜第一名', '沙发选手',
            '咸鱼翻身', '快乐肥宅', '凌晨还在线', '佛系青年', '退休老干部',
            '前排围观', '板凳选手', '职业观众', '专业点赞', '默默关注'];
        return pool[Math.floor(Math.random() * pool.length)] + Math.floor(Math.random() * 999);
    }

    function _fmUserNick() { return _fm.profile.nameEn || 'anonymous'; }

    function _fmGetForumChars(forum) {
        var roles = _fmGetRoles(); var chars = [];
        var cids = forum.charIds || [];
        for (var c = 0; c < cids.length; c++) {
            for (var r = 0; r < roles.length; r++) {
                if (roles[r].id === cids[c]) { chars.push(roles[r]); break; }
            }
        }
        return chars;
    }

    /* 提取角色完整人设文本 */
    function _fmCharFullProfile(role) {
        var parts = [];
        if (role.name) parts.push('【角色名】' + role.name);
        if (role.detail) parts.push('【完整人设】\n' + role.detail);
        if (role.personality) parts.push('【性格】' + role.personality);
        if (role.scenario) parts.push('【场景设定】' + role.scenario);
        if (role.mes_example) parts.push('【对话示例】' + role.mes_example);
        if (role.first_mes) parts.push('【开场白】' + role.first_mes);
        if (role.description) parts.push('【描述】' + role.description);
        if (role.system_prompt) parts.push('【系统提示】' + role.system_prompt);
        return parts.join('\n') || role.name || '未知角色';
    }

    /* ===== 通用API调用 ===== */
    function _fmCallApi(sysPrompt, userPrompt, maxTokens, cb) {
        var api = _fmGetApi();
        if (!api.url || !api.key) { if (typeof showToast === 'function') showToast('请先配置API'); return; }
        var endpoint = _fmBuildEndpoint(api.url);
        fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({
                model: api.model,
                messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: userPrompt }],
                temperature: 0.92,
                max_tokens: maxTokens || 4096
            })
        })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                var text = '';
                try { text = data.choices[0].message.content.trim(); } catch (e) { }
                if (cb) cb(text);
            })
            .catch(function (err) {
                console.error('Forum API error:', err);
                if (typeof showToast === 'function') showToast('Error: ' + (err.message || '').substring(0, 50));
            });
    }

    /* ===== 入口 ===== */
    window.openForumApp = function () {
        var el = document.getElementById('forumOverlay');
        if (!el) return;
        _fm.tab = 'home'; _fm.view = 'main';
        el.classList.add('show'); _fmRender();
    };

    function _fmClose() {
        var el = document.getElementById('forumOverlay');
        if (el) el.classList.remove('show');
    }

    /* ===== 渲染主框架 ===== */
    function _fmRender() {
        var el = document.getElementById('forumOverlay');
        if (!el) return;
        var h = '<div class="fm-app">';
        h += _fmRenderTopbar();
        h += '<div class="fm-body">';
        if (_fm.view === 'main') {
            if (_fm.tab === 'home') h += _fmRenderHome();
            else if (_fm.tab === 'follow') h += _fmRenderFollow();
            else h += _fmRenderMe();
        } else if (_fm.view === 'forumDetail') { h += _fmRenderForumDetail(); }
        else if (_fm.view === 'postDetail') { h += _fmRenderPostDetail(); }
        else if (_fm.view === 'myPosts') { h += _fmRenderMyPosts(); }
        else if (_fm.view === 'myLikes') { h += _fmRenderMyLikes(); }
        h += '</div>';
        if (_fm.view === 'postDetail') {
            h += '<div class="fm-comment-bar" style="bottom:16px">';
            h += '<input class="fm-comment-input" id="fmCommentInput" placeholder="Write a comment 写评论...">';
            h += '<div class="fm-comment-send" onclick="_fmSendComment()">SEND</div>';
            h += '</div>';
        }
        if (_fm.view === 'main') { h += _fmRenderDock(); }
        h += '</div>';
        el.innerHTML = h;
    }

    /* ===== 顶栏 ===== */
    function _fmRenderTopbar() {
        var h = '<div class="fm-topbar">';
        if (_fm.view !== 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmBack()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
        } else {
            h += '<div class="fm-topbar-btn" onclick="_fmClose()"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></div>';
        }
        var title = 'FORUM 论坛';
        if (_fm.view === 'forumDetail' && _fm.currentForum) title = _fmE(_fm.currentForum.name);
        if (_fm.view === 'postDetail') title = 'POST 帖子';
        if (_fm.view === 'myPosts') title = 'MY POSTS 我的帖子';
        if (_fm.view === 'myLikes') title = 'INTERACTIONS 互动';
        h += '<div class="fm-topbar-title">' + title + '</div>';
        h += '<div class="fm-topbar-btns">';
        if (_fm.tab === 'home' && _fm.view === 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmRefreshHome()" title="Refresh"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div>';
        }
        if (_fm.view === 'forumDetail') {
            h += '<div class="fm-topbar-btn" onclick="_fmRefreshForum()" title="Refresh"><svg viewBox="0 0 24 24"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg></div>';
            h += '<div class="fm-topbar-btn" onclick="_fmOpenCreatePost()" title="New Post"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
            h += '<div class="fm-topbar-btn" onclick="_fmDeleteForum()" title="Delete Forum"><svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></div>';
        }
        if (_fm.tab === 'follow' && _fm.view === 'main') {
            h += '<div class="fm-topbar-btn" onclick="_fmOpenCreateForum()" title="Create Forum"><svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>';
        }
        h += '</div></div>';
        return h;
    }

    /* ===== Dock ===== */
    function _fmRenderDock() {
        var tabs = [
            { id: 'home', label: 'HOME', icon: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' },
            { id: 'follow', label: 'FOLLOW', icon: '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' },
            { id: 'me', label: 'ME', icon: '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' }
        ];
        var h = '<div class="fm-dock">';
        for (var i = 0; i < tabs.length; i++) {
            var t = tabs[i];
            h += '<div class="fm-dock-item' + (_fm.tab === t.id ? ' active' : '') + '" onclick="_fmSwitchTab(\'' + t.id + '\')">';
            h += t.icon + '<span class="fm-dock-label">' + t.label + '</span></div>';
        }
        h += '</div>'; return h;
    }

    /* ===== HOME ===== */
    function _fmRenderHome() {
        var allPosts = _fm.posts.slice().sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (allPosts.length === 0) return _fmEmptyState('No posts yet 暂无帖子', 'Follow a forum and refresh 关注论坛后刷新');
        var h = '';
        for (var i = 0; i < allPosts.length; i++) h += _fmRenderPostCard(allPosts[i]);
        return h;
    }

    function _fmRenderPostCard(p) {
        var forum = null;
        for (var i = 0; i < _fm.forums.length; i++) { if (_fm.forums[i].id === p.forumId) { forum = _fm.forums[i]; break; } }
        var h = '<div class="fm-post-card" onclick="_fmOpenPost(\'' + _fmE(p.id) + '\')">';
        h += '<div class="fm-post-head">';
        h += '<span class="fm-post-nick">' + _fmE(p.nick || 'anonymous') + '</span>';
        if (forum) h += '<span class="fm-post-forum-tag">' + _fmE(forum.name) + '</span>';
        h += '<span class="fm-post-time">' + _fmTimeAgo(p.ts) + '</span></div>';
        h += '<div class="fm-post-title">' + _fmE(p.title) + '</div>';
        h += '<div class="fm-post-preview">' + _fmE((p.body || '').substring(0, 120)) + '</div>';
        h += '<div class="fm-post-stats">';
        h += '<span class="fm-post-stat"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' + (p.likes || 0) + '</span>';
        h += '<span class="fm-post-stat"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' + ((p.comments || []).length) + '</span>';
        h += '</div></div>';
        return h;
    }

    /* ===== FOLLOW ===== */
    function _fmRenderFollow() {
        var h = '<div class="fm-section-label">MY FORUMS 我的论坛</div>';
        if (_fm.forums.length === 0) {
            h += _fmEmptyState('No forums yet 暂无论坛', 'Tap + to create one 点击+创建');
        } else {
            for (var i = 0; i < _fm.forums.length; i++) {
                var f = _fm.forums[i];
                h += '<div class="fm-forum-card" onclick="_fmOpenForum(\'' + _fmE(f.id) + '\')">';
                h += '<div class="fm-forum-av">';
                if (f.avatar) h += '<img src="' + _fmE(f.avatar) + '">';
                else h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
                h += '</div><div class="fm-forum-info">';
                h += '<div class="fm-forum-name">' + _fmE(f.name) + '</div>';
                h += '<div class="fm-forum-motto">' + _fmE(f.motto || '') + '</div>';
                h += '</div><span class="fm-forum-arrow">›</span></div>';
            }
        }
        h += '<div class="fm-create-btn" onclick="_fmOpenCreateForum()">+ CREATE FORUM 创建论坛</div>';
        return h;
    }

    /* ===== ME ===== */
    function _fmRenderMe() {
        var p = _fm.profile; var myPostCount = 0, myInteractCount = 0;
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].isUser) myPostCount++;
            var cmts = _fm.posts[i].comments || [];
            for (var j = 0; j < cmts.length; j++) { if (cmts[j].isUser) myInteractCount++; }
            if (_fm.posts[i].likedByUser) myInteractCount++;
        }
        var h = '<div class="fm-profile">';
        h += '<div class="fm-profile-av" onclick="_fmEditProfileAvatar()">';
        if (p.avatar) h += '<img src="' + _fmE(p.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
        h += '</div>';
        h += '<div class="fm-profile-name-en" onclick="_fmEditName(\'en\')">' + _fmE(p.nameEn) + '</div>';
        h += '<div class="fm-profile-name-cn" onclick="_fmEditName(\'cn\')">' + _fmE(p.nameCn) + '</div>';
        h += '<div class="fm-profile-bio" onclick="_fmEditBio()">' + _fmE(p.bio) + '</div>';
        h += '<div class="fm-profile-stats">';
        h += '<div><div class="fm-profile-stat-num">' + myPostCount + '</div><div class="fm-profile-stat-label">posts</div></div>';
        h += '<div><div class="fm-profile-stat-num">' + _fm.forums.length + '</div><div class="fm-profile-stat-label">forums</div></div>';
        h += '<div><div class="fm-profile-stat-num">' + myInteractCount + '</div><div class="fm-profile-stat-label">interactions</div></div>';
        h += '</div></div>';
        h += '<div class="fm-me-tabs">';
        h += '<div class="fm-me-tab" onclick="_fmViewMyPosts()"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg><span>MY POSTS</span></div>';
        h += '<div class="fm-me-tab" onclick="_fmViewMyLikes()"><svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><span>INTERACTIONS</span></div>';
        h += '</div>'; return h;
    }

    /* ===== 论坛详情 ===== */
    function _fmRenderForumDetail() {
        var f = _fm.currentForum; if (!f) return '';
        var h = '<div class="fm-detail-header"><div class="fm-detail-av">';
        if (f.avatar) h += '<img src="' + _fmE(f.avatar) + '">';
        else h += '<svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>';
        h += '</div><div class="fm-detail-info">';
        h += '<div class="fm-detail-name">' + _fmE(f.name) + '</div>';
        h += '<div class="fm-detail-type">' + _fmE(f.type || '') + '</div>';
        h += '</div></div>';
        if (f.detail) h += '<div class="fm-detail-desc">' + _fmE(f.detail) + '</div>';
        h += '<div class="fm-section-label">POSTS 帖子</div>';
        var forumPosts = [];
        for (var i = 0; i < _fm.posts.length; i++) { if (_fm.posts[i].forumId === f.id) forumPosts.push(_fm.posts[i]); }
        forumPosts.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (forumPosts.length === 0) h += _fmEmptyState('No posts yet', '点击刷新生成帖子');
        else { for (var j = 0; j < forumPosts.length; j++) h += _fmRenderPostCard(forumPosts[j]); }
        return h;
    }

    /* ===== 帖子详情 ===== */
    function _fmRenderPostDetail() {
        var p = _fm.currentPost; if (!p) return '';
        var h = '<div class="fm-pdetail-title">' + _fmE(p.title) + '</div>';
        h += '<div class="fm-pdetail-meta">';
        h += '<span>' + _fmE(p.nick) + '</span>';
        h += '<span>' + _fmTimeAgo(p.ts) + '</span>';
        h += '<span class="fm-delete-post-btn" onclick="_fmDeletePost(\'' + _fmE(p.id) + '\')" style="margin-left:auto;color:#f44;font-size:10px;cursor:pointer;padding:2px 6px;border:1px solid #f44;border-radius:4px;">DELETE</span>';
        h += '</div>';
        h += '<div class="fm-pdetail-body" id="fmPostBody_' + _fmE(p.id) + '">' + _fmE(p.body) + '</div>';
        h += '<div class="fm-trans-btn" onclick="_fmTranslate(\'fmPostBody_' + _fmE(p.id) + '\')"><svg viewBox="0 0 24 24" style="width:12px;height:12px"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>TRANSLATE</div>';
        h += '<div class="fm-pdetail-actions">';
        h += '<div class="fm-pdetail-action' + (p.likedByUser ? ' liked' : '') + '" onclick="_fmToggleLike()">';
        h += '<svg viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' + (p.likes || 0) + '</div>';
        h += '<div class="fm-pdetail-action"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>' + (p.comments || []).length + '</div>';
        h += '</div>';
        h += '<div class="fm-comments-title">COMMENTS (' + (p.comments || []).length + ')</div>';
        var cmts = p.comments || [];
        for (var i = 0; i < cmts.length; i++) {
            var c = cmts[i];
            var cmtElemId = 'fmCmt_' + _fmE(c.id);
            h += '<div class="fm-comment"><div class="fm-comment-head">';
            h += '<span class="fm-comment-nick">' + _fmE(c.nick) + '</span>';
            h += '<span class="fm-comment-time">' + _fmTimeAgo(c.ts) + '</span></div>';
            h += '<div class="fm-comment-text" id="' + cmtElemId + '">' + _fmE(c.text) + '</div>';
            h += '<div class="fm-trans-btn fm-trans-btn-sm" onclick="_fmTranslate(\'' + cmtElemId + '\')"><svg viewBox="0 0 24 24" style="width:10px;height:10px"><path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>译</div>';
            h += '</div>';
        }
        if (cmts.length === 0) h += '<div class="fm-empty"><div class="fm-empty-text">No comments yet</div></div>';
        h += '<div style="height:50px"></div>';
        return h;
    }

    /* ===== 我的帖子 / 互动 ===== */
    function _fmRenderMyPosts() {
        var list = [];
        for (var i = 0; i < _fm.posts.length; i++) { if (_fm.posts[i].isUser) list.push(_fm.posts[i]); }
        list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (list.length === 0) return _fmEmptyState('No posts yet', '');
        var h = ''; for (var j = 0; j < list.length; j++) h += _fmRenderPostCard(list[j]); return h;
    }
    function _fmRenderMyLikes() {
        var list = [];
        for (var i = 0; i < _fm.posts.length; i++) {
            var p = _fm.posts[i];
            if (p.likedByUser) list.push(p);
            var cmts = p.comments || [];
            for (var j = 0; j < cmts.length; j++) { if (cmts[j].isUser && list.indexOf(p) < 0) list.push(p); }
        }
        list.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
        if (list.length === 0) return _fmEmptyState('No interactions yet', '');
        var h = ''; for (var k = 0; k < list.length; k++) h += _fmRenderPostCard(list[k]); return h;
    }

    function _fmEmptyState(t1, t2) {
        return '<div class="fm-empty"><div class="fm-empty-icon"><svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></div><div class="fm-empty-text">' + _fmE(t1) + '<br>' + _fmE(t2) + '</div></div>';
    }

    /* ===== 交互 ===== */
    window._fmSwitchTab = function (tab) { _fm.tab = tab; _fm.view = 'main'; _fmRender(); };
    window._fmBack = function () {
        if (_fm.view === 'postDetail') _fm.view = (_fm.currentPost && _fm.currentPost._fromForum) ? 'forumDetail' : 'main';
        else if (_fm.view === 'forumDetail') { _fm.view = 'main'; _fm.tab = 'follow'; }
        else if (_fm.view === 'myPosts' || _fm.view === 'myLikes') { _fm.view = 'main'; _fm.tab = 'me'; }
        else _fm.view = 'main';
        _fmRender();
    };
    window._fmClose = _fmClose;
    window._fmOpenForum = function (fid) {
        for (var i = 0; i < _fm.forums.length; i++) { if (_fm.forums[i].id === fid) { _fm.currentForum = _fm.forums[i]; _fm.view = 'forumDetail'; _fmRender(); return; } }
    };
    window._fmOpenPost = function (pid) {
        for (var i = 0; i < _fm.posts.length; i++) {
            if (_fm.posts[i].id === pid) {
                _fm.currentPost = _fm.posts[i]; _fm.currentPost._fromForum = (_fm.view === 'forumDetail');
                _fm.view = 'postDetail'; _fmRender(); _fmAutoComments(pid); return;
            }
        }
    };
    window._fmViewMyPosts = function () { _fm.view = 'myPosts'; _fmRender(); };
    window._fmViewMyLikes = function () { _fm.view = 'myLikes'; _fmRender(); };
    window._fmToggleLike = function () {
        var p = _fm.currentPost; if (!p) return;
        if (p.likedByUser) { p.likedByUser = false; p.likes = Math.max(0, (p.likes || 1) - 1); }
        else { p.likedByUser = true; p.likes = (p.likes || 0) + 1; }
        _fmSave(); _fmRender();
    };
    window._fmSendComment = function () {
        var inp = document.getElementById('fmCommentInput'); if (!inp) return;
        var txt = inp.value.trim(); if (!txt) return;
        var p = _fm.currentPost; if (!p) return;
        if (!p.comments) p.comments = [];
        p.comments.push({ id: _fmId(), nick: _fmUserNick(), text: txt, ts: Date.now(), isUser: true });
        inp.value = ''; _fmSave(); _fmRender();
        setTimeout(function () { _fmGenCharReplyToUserComment(p); }, 800);
    };

    /* ===== 删除论坛 ===== */
    window._fmDeleteForum = function () {
        if (!_fm.currentForum) return;
        if (!confirm('确定删除论坛「' + _fm.currentForum.name + '」及其所有帖子？')) return;
        var fid = _fm.currentForum.id;
        _fm.posts = _fm.posts.filter(function (p) { return p.forumId !== fid; });
        _fm.forums = _fm.forums.filter(function (f) { return f.id !== fid; });
        _fm.currentForum = null; _fm.view = 'main'; _fm.tab = 'follow';
        _fmSave(); _fmRender();
        if (typeof showToast === 'function') showToast('论坛已删除');
    };

    /* ===== 删除帖子 ===== */
    window._fmDeletePost = function (pid) {
        if (!confirm('确定删除此帖子？')) return;
        _fm.posts = _fm.posts.filter(function (p) { return p.id !== pid; });
        _fm.currentPost = null;
        _fm.view = _fm.currentForum ? 'forumDetail' : 'main';
        _fmSave(); _fmRender();
        if (typeof showToast === 'function') showToast('帖子已删除');
    };

    /* ===== 编辑个人资料 ===== */
    window._fmEditProfileAvatar = function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
            if (!inp.files || !inp.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) { _fm.profile.avatar = e.target.result; _fmSave(); _fmRender(); };
            reader.readAsDataURL(inp.files[0]);
        }; inp.click();
    };
    window._fmEditName = function (type) {
        var current = type === 'en' ? _fm.profile.nameEn : _fm.profile.nameCn;
        var val = prompt(type === 'en' ? 'English Name' : '中文名', current);
        if (val !== null && val.trim()) {
            if (type === 'en') _fm.profile.nameEn = val.trim(); else _fm.profile.nameCn = val.trim();
            _fmSave(); _fmRender();
        }
    };
    window._fmEditBio = function () {
        var val = prompt('Bio 简介', _fm.profile.bio);
        if (val !== null) { _fm.profile.bio = val.trim() || 'No bio yet'; _fmSave(); _fmRender(); }
    };

    /* ===== 创建论坛 ===== */
    window._fmOpenCreateForum = function () {
        var el = document.getElementById('forumOverlay');
        if (!el || document.getElementById('fmCreateModal')) return;
        var roles = _fmGetRoles();
        var h = '<div class="fm-modal-overlay" id="fmCreateModal"><div class="fm-modal">';
        h += '<div class="fm-modal-header"><div class="fm-modal-title">CREATE FORUM 创建论坛</div>';
        h += '<div class="fm-modal-close" onclick="document.getElementById(\'fmCreateModal\').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
        h += '<div class="fm-modal-body">';
        h += '<div class="fm-field"><div class="fm-field-label">AVATAR</div><div class="fm-publish-av" id="fmForumAvPreview" onclick="_fmPickForumAv()"><svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#ccc;stroke-width:1.5;fill:none"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div></div>';
        h += '<div class="fm-field"><div class="fm-field-label">NAME</div><input class="fm-field-input" id="fmForumName" placeholder="论坛名称"></div>';
        h += '<div class="fm-field"><div class="fm-field-label">TYPE</div><input class="fm-field-input" id="fmForumType" placeholder="如：虐文 / 甜文"></div>';
        h += '<div class="fm-field"><div class="fm-field-label">DETAIL</div><textarea class="fm-field-textarea" id="fmForumDetail" placeholder="论坛描述"></textarea></div>';
        h += '<div class="fm-field"><div class="fm-field-label">MOTTO</div><input class="fm-field-input" id="fmForumMotto" placeholder="一句话宗旨"></div>';
        h += '<div class="fm-field"><div class="fm-field-label">CHARACTERS 关联角色</div><div class="fm-char-picker" id="fmCharPicker">';
        if (roles.length === 0) h += '<span style="font-size:10px;color:#ccc">No characters</span>';
        for (var i = 0; i < roles.length; i++) {
            var r = roles[i];
            h += '<div class="fm-char-chip" data-rid="' + _fmE(r.id) + '" onclick="_fmToggleChar(this)">';
            if (r.avatar) h += '<img src="' + _fmE(r.avatar) + '">';
            h += _fmE(r.name || 'unnamed') + '</div>';
        }
        h += '</div></div>';
        h += '<div class="fm-modal-submit" onclick="_fmSubmitForum()">CREATE 创建</div>';
        h += '</div></div></div>';
        var panel = document.createElement('div'); panel.innerHTML = h; el.appendChild(panel.firstChild);
    };

    var _fmTempForumAv = '';
    window._fmPickForumAv = function () {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function () {
            if (!inp.files || !inp.files[0]) return;
            var reader = new FileReader();
            reader.onload = function (e) { _fmTempForumAv = e.target.result; var preview = document.getElementById('fmForumAvPreview'); if (preview) preview.innerHTML = '<img src="' + _fmTempForumAv + '">'; };
            reader.readAsDataURL(inp.files[0]);
        }; inp.click();
    };
    window._fmToggleChar = function (el) { el.classList.toggle('selected'); };
    window._fmSubmitForum = function () {
        var name = (document.getElementById('fmForumName') || {}).value || '';
        if (!name.trim()) { if (typeof showToast === 'function') showToast('请输入论坛名称'); return; }
        var charIds = [];
        var chips = document.querySelectorAll('#fmCharPicker .fm-char-chip.selected');
        for (var i = 0; i < chips.length; i++) { var rid = chips[i].getAttribute('data-rid'); if (rid) charIds.push(rid); }
        _fm.forums.push({
            id: _fmId(), name: name.trim(),
            type: ((document.getElementById('fmForumType') || {}).value || '').trim(),
            detail: ((document.getElementById('fmForumDetail') || {}).value || '').trim(),
            motto: ((document.getElementById('fmForumMotto') || {}).value || '').trim(),
            avatar: _fmTempForumAv || '', charIds: charIds, ts: Date.now()
        });
        _fmTempForumAv = ''; _fmSave();
        var modal = document.getElementById('fmCreateModal'); if (modal) modal.remove();
        _fm.tab = 'follow'; _fm.view = 'main'; _fmRender();
        if (typeof showToast === 'function') showToast('论坛已创建');
    };

    /* ===== 发帖 ===== */
    window._fmOpenCreatePost = function () {
        var el = document.getElementById('forumOverlay');
        if (!el || !_fm.currentForum || document.getElementById('fmPostModal')) return;
        var h = '<div class="fm-modal-overlay" id="fmPostModal"><div class="fm-modal">';
        h += '<div class="fm-modal-header"><div class="fm-modal-title">NEW POST 发帖</div>';
        h += '<div class="fm-modal-close" onclick="document.getElementById(\'fmPostModal\').remove()"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div></div>';
        h += '<div class="fm-modal-body">';
        h += '<div class="fm-field"><div class="fm-field-label">TITLE</div><input class="fm-field-input" id="fmPostTitle" placeholder="帖子标题"></div>';
        h += '<div class="fm-field"><div class="fm-field-label">CONTENT</div><textarea class="fm-field-textarea" id="fmPostBody" placeholder="帖子内容..." style="min-height:120px"></textarea></div>';
        h += '<div class="fm-modal-submit" onclick="_fmSubmitPost()">PUBLISH 发布</div>';
        h += '</div></div></div>';
        var panel = document.createElement('div'); panel.innerHTML = h; el.appendChild(panel.firstChild);
    };
    window._fmSubmitPost = function () {
        var title = ((document.getElementById('fmPostTitle') || {}).value || '').trim();
        var body = ((document.getElementById('fmPostBody') || {}).value || '').trim();
        if (!title) { if (typeof showToast === 'function') showToast('请输入标题'); return; }
        var post = { id: _fmId(), forumId: _fm.currentForum.id, title: title, body: body, nick: _fmUserNick(), ts: Date.now(), likes: 0, comments: [], isUser: true, likedByUser: false };
        _fm.posts.push(post); _fmSave();
        var modal = document.getElementById('fmPostModal'); if (modal) modal.remove();
        _fmRender();
        if (typeof showToast === 'function') showToast('已发布');
        setTimeout(function () { _fmGenCharReplies(post.id); }, 1200);
    };

    /* ==================================================================
       刷新 — 5条帖子（2条char贴人设 + 3条路人），每条帖子10条评论
       ================================================================== */
    window._fmRefreshHome = function () {
        if (_fm.forums.length === 0) { if (typeof showToast === 'function') showToast('请先创建论坛'); return; }
        var randomForum = _fm.forums[Math.floor(Math.random() * _fm.forums.length)];
        _fmBatchRefresh(randomForum);
    };
    window._fmRefreshForum = function () {
        if (!_fm.currentForum) return;
        _fmBatchRefresh(_fm.currentForum);
    };

    /* 核心刷新：先生成3条路人帖子(批量)，再给每个char单独生成1条贴人设的帖子 */
    function _fmBatchRefresh(forum) {
        var api = _fmGetApi();
        if (!api.url || !api.key) { if (typeof showToast === 'function') showToast('请先配置API'); return; }
        if (typeof showToast === 'function') showToast('正在生成帖子...');

        var forumChars = _fmGetForumChars(forum);
        var charCount = Math.min(forumChars.length, 2);
        var passerbyCount = 5 - charCount;
        var allNewIds = [];

        /* ---- 第一步：批量生成路人帖子 ---- */
        var passerSys = '你是一个论坛帖子批量生成器。\n';
        passerSys += '论坛名称：' + forum.name + '\n';
        passerSys += '论坛类型：' + (forum.type || '综合') + '\n';
        passerSys += '论坛描述：' + (forum.detail || '无') + '\n';
        passerSys += '论坛宗旨：' + (forum.motto || '无') + '\n\n';
        passerSys += '请一次性生成' + passerbyCount + '个路人网友的帖子。每个帖子之间用 ===SPLIT=== 分隔。\n';
        passerSys += '每个帖子格式（严格遵守）：\n';
        passerSys += 'POSTER:发帖人网名（随机网名如"吃瓜群众""深夜失眠选手"等，每个不同）\n';
        passerSys += 'TITLE:帖子标题\n';
        passerSys += 'BODY:帖子正文\n\n';
        passerSys += '要求：\n';
        passerSys += '- 正文200-500字，一定写完整不截断\n';
        passerSys += '- 口吻自然随性，像真实论坛帖子，可用网络用语emoji\n';
        passerSys += '- 主题风格各不同（讨论、吐槽、求助、分享、安利等）\n';

        _fmCallApi(passerSys, '请生成' + passerbyCount + '个路人帖子', 4096, function (text) {
            if (text) {
                var blocks = text.split(/===SPLIT===/);
                for (var b = 0; b < blocks.length; b++) {
                    var parsed = _fmParsePostBlock(blocks[b].trim());
                    if (!parsed) continue;
                    var post = {
                        id: _fmId(), forumId: forum.id, title: parsed.title, body: parsed.body,
                        nick: parsed.poster || _fmRandomNick(),
                        ts: Date.now() - Math.floor(Math.random() * 1800000),
                        likes: Math.floor(Math.random() * 80 + 1),
                        comments: [], isUser: false, likedByUser: false
                    };
                    _fm.posts.push(post);
                    allNewIds.push(post.id);
                }
                _fmSave(); _fmRender();
            }

            /* ---- 第二步：每个char单独调用API生成帖子（带完整人设） ---- */
            var shuffled = forumChars.sort(function () { return Math.random() - 0.5; });
            for (var ci = 0; ci < charCount; ci++) {
                (function (charRole, delay) {
                    setTimeout(function () {
                        _fmGenCharPost(forum, charRole, function (postId) {
                            if (postId) allNewIds.push(postId);
                            _fmSave(); _fmRender();
                        });
                    }, delay);
                })(shuffled[ci], (ci + 1) * 500);
            }

            /* ---- 第三步：等帖子生成后，为每条帖子各生成10条评论 ---- */
            setTimeout(function () {
                if (typeof showToast === 'function') showToast('正在生成评论...');
                /* 获取该论坛所有帖子（包含刚生成的） */
                var allForumPosts = [];
                for (var p = 0; p < _fm.posts.length; p++) {
                    if (_fm.posts[p].forumId === forum.id && allNewIds.indexOf(_fm.posts[p].id) >= 0) {
                        allForumPosts.push(_fm.posts[p]);
                    }
                }
                for (var pi = 0; pi < allForumPosts.length; pi++) {
                    (function (post, delay) {
                        setTimeout(function () {
                            _fmBatchGenCommentsForPost(forum, post.id, 10);
                        }, delay);
                    })(allForumPosts[pi], pi * 1000);
                }
            }, (charCount + 1) * 1500);
        });
    }

    /* 解析帖子块 */
    function _fmParsePostBlock(block) {
        if (!block) return null;
        var poster = '', title = '', bodyLines = [], inBody = false;
        var lines = block.split('\n');
        for (var ln = 0; ln < lines.length; ln++) {
            var line = lines[ln];
            if (line.match(/^POSTER[:：]\s*/i)) { poster = line.replace(/^POSTER[:：]\s*/i, '').trim(); }
            else if (line.match(/^TITLE[:：]\s*/i)) { title = line.replace(/^TITLE[:：]\s*/i, '').trim().replace(/^#+\s*/, ''); }
            else if (line.match(/^BODY[:：]\s*/i)) {
                inBody = true;
                var rest = line.replace(/^BODY[:：]\s*/i, '').trim();
                if (rest) bodyLines.push(rest);
            } else if (inBody) { bodyLines.push(line); }
            else if (!title) { title = line.replace(/^#+\s*/, '').trim(); }
            else { bodyLines.push(line); }
        }
        var body = bodyLines.join('\n').trim();
        if (!title && body) title = body.substring(0, 30);
        if (!title) return null;
        return { poster: poster, title: title, body: body };
    }

    /* ==================================================================
       char单独发帖 — 带完整人设的system prompt
       ================================================================== */
    function _fmGenCharPost(forum, charRole, cb) {
        var fullProfile = _fmCharFullProfile(charRole);

        var sys = '你现在是一个论坛用户。你的真实身份如下，请完全代入这个角色来发帖：\n\n';
        sys += fullProfile + '\n\n';
        sys += '==== 论坛信息 ====\n';
        sys += '论坛名称：' + forum.name + '\n';
        sys += '论坛类型：' + (forum.type || '综合') + '\n';
        sys += '论坛描述：' + (forum.detail || '无') + '\n\n';
        sys += '==== 发帖要求 ====\n';
        sys += '你在这个论坛发一个帖子。要求：\n';
        sys += '- 完全贴合你的角色性格、语气、经历来发帖\n';
        sys += '- 你用匿名网名发帖，不直接暴露真实身份，但字里行间流露出你的性格和经历\n';
        sys += '- 帖子内容可以是：分享心情/吐槽/求助/讨论/感悟/日常等，要符合你这个角色会关心的事\n';
        sys += '- 口吻自然随性，像真实论坛帖子，可用网络用语emoji\n';
        sys += '- 重要：你必须用你角色对应的母语来写帖子！中国人用中文，日本人用日语，韩国人用韩语，美国/英国人用英文，法国人用法语……以此类推。这是语言沉浸感的关键\n';
        sys += '- 正文200-500字，一定写完整不截断\n\n';
        sys += '输出格式（严格遵守）：\n';
        sys += 'TITLE:帖子标题\n';
        sys += 'BODY:帖子正文\n';

        _fmCallApi(sys, '请以你的角色身份发一个帖子', 2048, function (text) {
            if (!text) { if (cb) cb(null); return; }
            var parsed = _fmParsePostBlock(text);
            if (!parsed) { if (cb) cb(null); return; }

            var post = {
                id: _fmId(), forumId: forum.id,
                title: parsed.title, body: parsed.body,
                nick: _fmCharNick(charRole.name),
                ts: Date.now() - Math.floor(Math.random() * 1200000),
                likes: Math.floor(Math.random() * 120 + 5),
                comments: [], isUser: false, likedByUser: false,
                charId: charRole.id
            };
            _fm.posts.push(post);
            if (cb) cb(post.id);
        });
    }

    /* ==================================================================
       为单条帖子批量生成10条评论 — char评论带完整人设
       ================================================================== */
    function _fmBatchGenCommentsForPost(forum, postId, count) {
        var post = null;
        for (var i = 0; i < _fm.posts.length; i++) { if (_fm.posts[i].id === postId) { post = _fm.posts[i]; break; } }
        if (!post) return;

        var forumChars = _fmGetForumChars(forum);

        /* 构建char完整人设列表 */
        var charSection = '';
        if (forumChars.length > 0) {
            charSection = '==== 论坛角色成员（评论中可出现，最多3条来自他们，其余7条来自路人）====\n';
            for (var ci = 0; ci < forumChars.length; ci++) {
                charSection += '\n【角色' + (ci + 1) + '】' + forumChars[ci].name + '\n';
                charSection += _fmCharFullProfile(forumChars[ci]) + '\n';
                charSection += '（该角色评论时请完全贴合上述人设的性格和语气，用匿名网名但性格要对得上）\n';
            }
        }

        var sys = '你是一个论坛评论批量生成器。\n';
        sys += '论坛：' + forum.name + '（' + (forum.type || '综合') + '）\n\n';
        if (charSection) sys += charSection + '\n';
        sys += '==== 目标帖子 ====\n';
        sys += '标题：' + post.title + '\n';
        sys += '内容：' + (post.body || '') + '\n\n';
        sys += '请为这条帖子生成' + count + '条评论。每条之间用 ===SPLIT=== 分隔。\n';
        sys += '每条评论格式：\n';
        sys += 'COMMENTER:评论人名字（角色用真名，路人用随机网名）\n';
        sys += 'COMMENT:评论内容\n\n';
        sys += '关键要求：\n';
        sys += '- ' + count + '条中最多3条来自已知角色，其余来自随机路人网友\n';
        sys += '- 角色评论必须完全贴合其人设的性格语气，用匿名但"味道"对\n';
        sys += '- 路人评论随意自然\n';
        sys += '- 每条评论15-100字，一定写完整不截断\n';
        sys += '- 像真实网友评论，有互动抬杠玩梗，不要都是夸的\n';

        _fmCallApi(sys, '请为这条帖子生成' + count + '条评论', 4096, function (text) {
            if (!text) return;
            var blocks = text.split(/===SPLIT===/);
            var targetPost = null;
            for (var p = 0; p < _fm.posts.length; p++) { if (_fm.posts[p].id === postId) { targetPost = _fm.posts[p]; break; } }
            if (!targetPost) return;
            if (!targetPost.comments) targetPost.comments = [];

            for (var b = 0; b < blocks.length; b++) {
                var block = blocks[b].trim(); if (!block) continue;
                var commenter = '', commentLines = [], inComment = false;
                var lines = block.split('\n');
                for (var ln = 0; ln < lines.length; ln++) {
                    var line = lines[ln];
                    if (line.match(/^COMMENTER[:：]\s*/i)) { commenter = line.replace(/^COMMENTER[:：]\s*/i, '').trim(); }
                    else if (line.match(/^COMMENT[:：]\s*/i)) {
                        inComment = true;
                        var rest = line.replace(/^COMMENT[:：]\s*/i, '').trim();
                        if (rest) commentLines.push(rest);
                    } else if (inComment) { commentLines.push(line); }
                }
                var comment = commentLines.join('\n').trim().replace(/^["「]|["」]$/g, '');
                if (!comment) continue;

                var nick = '', charId = null;
                if (commenter && forumChars.length > 0) {
                    for (var fc = 0; fc < forumChars.length; fc++) {
                        if (commenter.indexOf(forumChars[fc].name) >= 0 || forumChars[fc].name.indexOf(commenter) >= 0) {
                            nick = _fmCharNick(forumChars[fc].name); charId = forumChars[fc].id; break;
                        }
                    }
                }
                if (!nick) nick = commenter || _fmRandomNick();

                targetPost.comments.push({
                    id: _fmId(), nick: nick, text: comment,
                    ts: Date.now() - Math.floor(Math.random() * 600000),
                    isUser: false, charId: charId
                });
            }
            _fmSave();
            if (_fm.view === 'postDetail' && _fm.currentPost && _fm.currentPost.id === postId) {
                _fm.currentPost = targetPost; _fmRender();
            } else { _fmRender(); }
        });
    }

    /* ===== 自动评论（打开帖子50%概率） ===== */
    function _fmAutoComments(postId) {
        if (Math.random() > 0.5) return;
        var post = null;
        for (var i = 0; i < _fm.posts.length; i++) { if (_fm.posts[i].id === postId) { post = _fm.posts[i]; break; } }
        if (!post) return;
        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) { if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; } }
        if (!forum) return;
        var forumChars = _fmGetForumChars(forum);
        if (forumChars.length === 0) return;
        var commenter = forumChars[Math.floor(Math.random() * forumChars.length)];
        _fmGenOneComment(post, commenter, forum);
    }

    /* char回复用户帖子 */
    function _fmGenCharReplies(postId) {
        var post = null;
        for (var i = 0; i < _fm.posts.length; i++) { if (_fm.posts[i].id === postId) { post = _fm.posts[i]; break; } }
        if (!post) return;
        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) { if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; } }
        if (!forum) return;
        var forumChars = _fmGetForumChars(forum);
        if (forumChars.length === 0) return;
        var count = Math.min(forumChars.length, Math.floor(Math.random() * 2) + 1);
        var shuffled = forumChars.sort(function () { return Math.random() - 0.5; });
        for (var n = 0; n < count; n++) {
            (function (idx) { setTimeout(function () { _fmGenOneComment(post, shuffled[idx], forum); }, (idx + 1) * 2000); })(n);
        }
    }

    /* char回复用户评论 */
    function _fmGenCharReplyToUserComment(post) {
        var forum = null;
        for (var k = 0; k < _fm.forums.length; k++) { if (_fm.forums[k].id === post.forumId) { forum = _fm.forums[k]; break; } }
        if (!forum) return;
        var forumChars = _fmGetForumChars(forum);
        if (forumChars.length === 0) return;
        _fmGenOneComment(post, forumChars[Math.floor(Math.random() * forumChars.length)], forum);
    }

    /* ==================================================================
       单条char评论 — 带完整人设
       ================================================================== */
    function _fmGenOneComment(post, charRole, forum) {
        var fullProfile = _fmCharFullProfile(charRole);

        var sys = '你现在是一个论坛用户。你的真实身份如下，请完全代入这个角色来评论：\n\n';
        sys += fullProfile + '\n\n';
        sys += '==== 论坛信息 ====\n';
        sys += '论坛：' + forum.name + '（' + (forum.type || '综合') + '）\n\n';
        sys += '==== 你在看的帖子 ====\n';
        sys += '标题：' + post.title + '\n';
        sys += '内容：' + (post.body || '') + '\n\n';

        var cmts = post.comments || [];
        if (cmts.length > 0) {
            sys += '==== 已有评论 ====\n';
            for (var i = Math.max(0, cmts.length - 6); i < cmts.length; i++) {
                sys += cmts[i].nick + '：' + cmts[i].text + '\n';
            }
            sys += '\n';
        }

        sys += '==== 评论要求 ====\n';
        sys += '- 完全贴合你的角色性格和语气来写评论\n';
        sys += '- 你用匿名网名，不直接暴露身份，但字里行间能感受到你的性格\n';
        sys += '- 像真实网友评论，口语化，可用emoji\n';
        sys += '- 重要：你必须用你角色对应的母语来评论！中国角色用中文，日本角色用日语，英语角色用英文，以此类推\n';
        sys += '- 15-100字，一定写完整不截断\n';
        sys += '- 只输出评论内容本身，不加任何前缀标记\n';
        sys += '- 角色用自己的母语评论（中国人中文、日本人日语、英语角色英文等），路人用中文\n';

        _fmCallApi(sys, '请以你的角色身份写一条评论', 512, function (text) {
            if (!text) return;
            text = text.replace(/^["「]|["」]$/g, '').replace(/^COMMENT[:：]\s*/i, '').trim();
            for (var p = 0; p < _fm.posts.length; p++) {
                if (_fm.posts[p].id === post.id) {
                    if (!_fm.posts[p].comments) _fm.posts[p].comments = [];
                    _fm.posts[p].comments.push({
                        id: _fmId(), nick: _fmCharNick(charRole.name),
                        text: text, ts: Date.now(), isUser: false, charId: charRole.id
                    });
                    _fmSave();
                    if (_fm.view === 'postDetail' && _fm.currentPost && _fm.currentPost.id === post.id) {
                        _fm.currentPost = _fm.posts[p]; _fmRender();
                    }
                    break;
                }
            }
        });
    }

})();

/* ===== 翻译功能 ===== */
window._fmTranslate = function (elemId) {
    var el = document.getElementById(elemId);
    if (!el) return;

    /* 如果已经有翻译，点击切换显示/隐藏 */
    var existing = document.getElementById(elemId + '_trans');
    if (existing) {
        existing.style.display = existing.style.display === 'none' ? 'block' : 'none';
        return;
    }

    var original = el.innerText || el.textContent || '';
    if (!original.trim()) return;

    /* 显示loading */
    var transDiv = document.createElement('div');
    transDiv.id = elemId + '_trans';
    transDiv.className = 'fm-trans-block';
    transDiv.innerHTML = '<span class="fm-trans-loading">translating...</span>';
    el.parentNode.insertBefore(transDiv, el.nextSibling);

    var sys = '你是一个翻译器。判断用户输入的语言：\n';
    sys += '- 如果是中文，翻译成英文\n';
    sys += '- 如果是英文，翻译成中文\n';
    sys += '- 如果是其他语言，同时翻译成中文和英文\n';
    sys += '只输出翻译结果，不加任何解释、前缀。保持原文的语气和风格。';

    _fmCallApi(sys, original, 1024, function (text) {
        var transEl = document.getElementById(elemId + '_trans');
        if (!transEl) return;
        if (text) {
            transEl.innerHTML = '<div class="fm-trans-label">TRANSLATE 翻译</div><div class="fm-trans-text">' + _fmE(text) + '</div>';
        } else {
            transEl.innerHTML = '<span class="fm-trans-text" style="color:#f44">翻译失败</span>';
        }
    });
};
