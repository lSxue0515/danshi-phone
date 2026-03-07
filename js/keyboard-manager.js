(function () {
    'use strict';

    if (window.KeyboardManager) return;

    var contexts = {};
    var activeId = null;
    var listenersBound = false;
    var syncFrame = 0;
    var blurTimer = 0;
    var pendingSyncReason = '';
    var viewportMetaState = {
        count: 0,
        originalContent: null
    };

    var syncReasonPriority = {
        '': 0,
        'activate': 1,
        'manual-refresh': 1,
        'window-resize': 1,
        'orientationchange': 2,
        'bottom-bar-resize': 3,
        'viewport-resize': 4,
        'focus': 5,
        'blur': 5
    };

    function isTextInputElement(el) {
        if (!el || el.disabled || el.readOnly) return false;
        var tag = (el.tagName || '').toUpperCase();
        return tag === 'INPUT' || tag === 'TEXTAREA' || !!el.isContentEditable;
    }

    function resolveValue(ctx, key) {
        if (!ctx) return null;
        var value = ctx[key];
        return typeof value === 'function' ? value() : value;
    }

    function getContext(id) {
        return id ? contexts[id] || null : null;
    }

    function getActiveContext() {
        return activeId ? getContext(activeId) : null;
    }

    function getViewportHeight() {
        if (window.visualViewport && window.visualViewport.height) {
            return Math.round(window.visualViewport.height);
        }
        return Math.round(window.innerHeight || document.documentElement.clientHeight || 0);
    }

    function getViewportOffsetTop() {
        if (window.visualViewport && typeof window.visualViewport.offsetTop === 'number') {
            return Math.max(0, Math.round(window.visualViewport.offsetTop || 0));
        }
        return 0;
    }

    function measureBaseHeight(ctx) {
        var root = resolveValue(ctx, 'getRoot');
        var rootHeight = root ? Math.round(root.offsetHeight || root.clientHeight || 0) : 0;
        var innerHeight = Math.round(window.innerHeight || 0);
        var clientHeight = Math.round(document.documentElement.clientHeight || 0);
        var nextBase = Math.max(ctx.baseHeight || 0, rootHeight, innerHeight, clientHeight);
        if (nextBase > 0) ctx.baseHeight = nextBase;
        return ctx.baseHeight || 0;
    }

    function isVisibleContext(ctx) {
        if (!ctx) return false;
        if (typeof ctx.isVisible === 'function' && !ctx.isVisible()) return false;
        return !!resolveValue(ctx, 'getRoot');
    }

    function contextContainsNode(ctx, node) {
        var root = resolveValue(ctx, 'getRoot');
        return !!(root && node && root.contains(node));
    }

    function getManagedInputs(ctx) {
        var inputs = resolveValue(ctx, 'getInputs');
        if (inputs && typeof inputs.length === 'number') return inputs;
        var root = resolveValue(ctx, 'getRoot');
        return root ? root.querySelectorAll('input, textarea, [contenteditable="true"]') : [];
    }

    function getNearestPageElement(ctx) {
        var explicitTarget = resolveValue(ctx, 'getLockTarget');
        if (explicitTarget) return explicitTarget;
        var root = resolveValue(ctx, 'getRoot');
        return root && root.closest ? root.closest('.page') : null;
    }

    function isManagedInputTarget(ctx, target) {
        if (!isTextInputElement(target)) return false;
        var inputs = getManagedInputs(ctx);
        for (var i = 0; i < inputs.length; i++) {
            if (inputs[i] === target) return true;
        }
        return false;
    }

    function lockPages(ctx) {
        if (!ctx || ctx.pageLockState) return;
        var page = getNearestPageElement(ctx);
        if (!page) return;
        var state = [];
        state.push({
            el: page,
            overflowY: page.style.overflowY || '',
            overscrollBehavior: page.style.overscrollBehavior || ''
        });
        page.style.overflowY = 'hidden';
        page.style.overscrollBehavior = 'none';
        page.classList.add('keyboard-viewport-locked');
        ctx.pageLockState = state;
    }

    function unlockPages(ctx) {
        if (!ctx || !ctx.pageLockState) return;
        for (var i = 0; i < ctx.pageLockState.length; i++) {
            var item = ctx.pageLockState[i];
            item.el.style.overflowY = item.overflowY;
            item.el.style.overscrollBehavior = item.overscrollBehavior;
            item.el.classList.remove('keyboard-viewport-locked');
        }
        ctx.pageLockState = null;
    }

    function clearKeyboardState(ctx) {
        var root = resolveValue(ctx, 'getRoot');
        if (!root) return;
        root.classList.remove('keyboard-managed');
        root.classList.remove('keyboard-active');
        root.style.removeProperty('--keyboard-offset');
        root.style.removeProperty('--keyboard-bottom-space');
        root.style.removeProperty('--keyboard-bottom-bar-height');
        root.style.removeProperty('--keyboard-viewport-height');
        root.style.removeProperty('--keyboard-viewport-offset-top');
        root.style.height = '';
        root.style.maxHeight = '';
        if (typeof ctx.onStateChange === 'function') ctx.onStateChange(false, 0);
    }

    function updateInteractiveWidgetMode(enable) {
        var vpMeta = document.querySelector('meta[name="viewport"]');
        if (!vpMeta) return;

        if (enable) {
            if (!viewportMetaState.count) viewportMetaState.originalContent = vpMeta.content || '';
            viewportMetaState.count += 1;
            if ((vpMeta.content || '').indexOf('interactive-widget=resizes-content') === -1) {
                vpMeta.content = (vpMeta.content || '') + ', interactive-widget=resizes-content';
            }
            return;
        }

        if (viewportMetaState.count > 0) viewportMetaState.count -= 1;
        if (!viewportMetaState.count && viewportMetaState.originalContent !== null) {
            vpMeta.content = viewportMetaState.originalContent;
            viewportMetaState.originalContent = null;
        }
    }

    function getMessageScroller(ctx, fallback) {
        return resolveValue(ctx, 'getMessageScroller') || fallback || null;
    }

    function getBottomGap(scrollEl) {
        if (!scrollEl) return 0;
        return Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight - scrollEl.scrollTop);
    }

    function getBottomStickThreshold(ctx) {
        var threshold = resolveValue(ctx, 'bottomStickThreshold');
        threshold = typeof threshold === 'number' ? threshold : 72;
        return Math.max(0, threshold);
    }

    function isNearBottom(scrollEl, threshold) {
        if (!scrollEl) return false;
        return getBottomGap(scrollEl) <= threshold;
    }

    function captureScrollSnapshot(scrollEl) {
        if (!scrollEl) return null;
        return {
            scrollTop: scrollEl.scrollTop,
            scrollHeight: scrollEl.scrollHeight,
            clientHeight: scrollEl.clientHeight,
            bottomGap: getBottomGap(scrollEl)
        };
    }

    function shouldStickToBottom(ctx, scrollEl, snapshot, metrics) {
        if (!scrollEl) return false;
        if (typeof ctx.shouldStickToBottom === 'function') {
            return !!ctx.shouldStickToBottom({
                scrollEl: scrollEl,
                snapshot: snapshot,
                threshold: getBottomStickThreshold(ctx),
                keyboardActive: !!metrics.keyboardActive,
                keyboardOffset: metrics.keyboardOffset,
                viewportHeight: metrics.viewportHeight
            });
        }
        return !!resolveValue(ctx, 'preserveBottomAnchor') && isNearBottom(scrollEl, getBottomStickThreshold(ctx));
    }

    function syncMessageFlowLayout(ctx, scrollEl, snapshot, metrics) {
        if (!scrollEl || !snapshot) return;

        if (shouldStickToBottom(ctx, scrollEl, snapshot, metrics)) {
            scrollEl.scrollTop = scrollEl.scrollHeight;
            return;
        }

        var nextTop = scrollEl.scrollHeight - scrollEl.clientHeight - snapshot.bottomGap;
        if (nextTop < 0) nextTop = 0;
        scrollEl.scrollTop = nextTop;
    }

    function shouldRunMessageFlowSync(ctx, reason, metrics) {
        if (!ctx || resolveValue(ctx, 'scrollStrategy') !== 'message-flow') return false;
        if (reason === 'focus' || reason === 'blur') return true;
        if (reason === 'viewport-resize') return !!(metrics.keyboardActive || ctx.keyboardTransitionActive);
        if (reason === 'bottom-bar-resize') return !!(metrics.keyboardActive || ctx.keyboardTransitionActive);
        return false;
    }

    function ensureInputVisible(ctx, root, scrollEl, inputEl, viewportHeight, bottomEl) {
        if (!root || !scrollEl || !inputEl) return;
        var rootRect = root.getBoundingClientRect();
        var inputRect = inputEl.getBoundingClientRect();
        var bottomReserve = bottomEl ? Math.round(bottomEl.offsetHeight || 0) + 12 : 0;
        var visibleTop = rootRect.top + 12;
        var visibleBottom = rootRect.top + viewportHeight - bottomReserve - 12;
        if (inputRect.bottom > visibleBottom || inputRect.top < visibleTop) {
            inputEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
    }

    function syncActiveContext() {
        syncFrame = 0;
        var ctx = getActiveContext();
        if (!ctx || !isVisibleContext(ctx)) return;
        var syncReason = pendingSyncReason || 'manual-refresh';
        pendingSyncReason = '';

        var root = resolveValue(ctx, 'getRoot');
        var scrollEl = resolveValue(ctx, 'getScrollContainer');
        var messageScroller = getMessageScroller(ctx, scrollEl);
        var bottomEl = resolveValue(ctx, 'getBottomBar');
        var inputEl = ctx.focusedInput && contextContainsNode(ctx, ctx.focusedInput) ? ctx.focusedInput : null;
        var scrollSnapshot = captureScrollSnapshot(messageScroller || scrollEl);
        var baseHeight = measureBaseHeight(ctx);
        var viewportHeight = getViewportHeight();
        var viewportOffsetTop = getViewportOffsetTop();
        var innerHeight = Math.round(window.innerHeight || 0);
        var clientHeight = Math.round(document.documentElement.clientHeight || 0);
        var keyboardOffset = Math.max(0, baseHeight - viewportHeight, baseHeight - innerHeight, baseHeight - clientHeight);
        var keyboardActive = !!(inputEl && keyboardOffset > 80);
        var appliedHeight = keyboardActive ? viewportHeight : baseHeight;
        var bottomHeight = bottomEl ? Math.round(bottomEl.offsetHeight || 0) : 0;

        if (!root || !appliedHeight) return;

        if (syncReason === 'focus' || syncReason === 'blur') {
            ctx.keyboardTransitionActive = true;
        } else if (!keyboardActive && syncReason !== 'viewport-resize' && syncReason !== 'bottom-bar-resize') {
            ctx.keyboardTransitionActive = false;
        }

        if (typeof ctx.onBeforeSync === 'function') {
            ctx.onBeforeSync({
                root: root,
                scrollEl: scrollEl,
                messageScroller: messageScroller,
                bottomEl: bottomEl,
                focusedInput: inputEl,
                keyboardActive: keyboardActive,
                keyboardOffset: keyboardOffset,
                viewportHeight: appliedHeight,
                bottomHeight: bottomHeight,
                scrollSnapshot: scrollSnapshot,
                syncReason: syncReason
            });
        }

        root.classList.add('keyboard-managed');
        root.classList.toggle('keyboard-active', keyboardActive);
        root.style.setProperty('--keyboard-offset', (keyboardActive ? keyboardOffset : 0) + 'px');
        root.style.setProperty('--keyboard-bottom-space', (keyboardActive ? keyboardOffset + bottomHeight : bottomHeight) + 'px');
        root.style.setProperty('--keyboard-bottom-bar-height', bottomHeight + 'px');
        root.style.setProperty('--keyboard-viewport-height', appliedHeight + 'px');
        root.style.setProperty('--keyboard-viewport-offset-top', (keyboardActive ? viewportOffsetTop : 0) + 'px');
        root.style.height = appliedHeight + 'px';
        root.style.maxHeight = appliedHeight + 'px';

        if (typeof ctx.onStateChange === 'function') ctx.onStateChange(keyboardActive, keyboardOffset);

        if (shouldRunMessageFlowSync(ctx, syncReason, {
            keyboardActive: keyboardActive,
            keyboardOffset: keyboardOffset,
            viewportHeight: appliedHeight
        })) {
            syncMessageFlowLayout(ctx, messageScroller || scrollEl, scrollSnapshot, {
                keyboardActive: keyboardActive,
                keyboardOffset: keyboardOffset,
                viewportHeight: appliedHeight
            });
        } else if (keyboardActive && inputEl) {
            ensureInputVisible(ctx, root, scrollEl, inputEl, appliedHeight, bottomEl);
        }

        if (typeof ctx.onAfterSync === 'function') {
            ctx.onAfterSync({
                root: root,
                scrollEl: scrollEl,
                messageScroller: messageScroller,
                bottomEl: bottomEl,
                focusedInput: inputEl,
                keyboardActive: keyboardActive,
                keyboardOffset: keyboardOffset,
                viewportHeight: appliedHeight,
                bottomHeight: bottomHeight,
                scrollSnapshot: scrollSnapshot,
                syncReason: syncReason
            });
        }

        ctx.lastKeyboardActive = keyboardActive;
        if (!keyboardActive && syncReason === 'blur') ctx.keyboardTransitionActive = false;
    }

    function mergeSyncReason(nextReason) {
        var currentPriority = syncReasonPriority[pendingSyncReason || ''] || 0;
        var nextPriority = syncReasonPriority[nextReason || ''] || 0;
        if (nextPriority >= currentPriority) pendingSyncReason = nextReason || '';
    }

    function scheduleSync(delays, reason) {
        var ctx = getActiveContext();
        if (!ctx) return;
        mergeSyncReason(reason || 'manual-refresh');
        if (syncFrame) cancelAnimationFrame(syncFrame);
        syncFrame = requestAnimationFrame(syncActiveContext);

        if (!delays || !delays.length) return;
        for (var i = 0; i < delays.length; i++) {
            (function (delay, nextReason) {
                setTimeout(function () {
                    if (activeId === ctx.id) scheduleSync(null, nextReason);
                }, delay);
            })(delays[i], reason || 'manual-refresh');
        }
    }

    function bindListeners() {
        if (listenersBound) return;
        listenersBound = true;

        document.addEventListener('focusin', function (ev) {
            var ctx = getActiveContext();
            if (!ctx || !contextContainsNode(ctx, ev.target) || !isManagedInputTarget(ctx, ev.target)) return;
            ctx.focusedInput = ev.target;
            measureBaseHeight(ctx);
            scheduleSync([80, 220], 'focus');
        }, true);

        document.addEventListener('focusout', function () {
            if (blurTimer) clearTimeout(blurTimer);
            blurTimer = setTimeout(function () {
                var ctx = getActiveContext();
                if (!ctx) return;
                if (!contextContainsNode(ctx, document.activeElement) || !isManagedInputTarget(ctx, document.activeElement)) {
                    ctx.focusedInput = null;
                    scheduleSync([120], 'blur');
                }
            }, 120);
        }, true);

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', function () { scheduleSync(null, 'viewport-resize'); });
            window.visualViewport.addEventListener('scroll', function () { scheduleSync(null, 'viewport-resize'); });
        }

        window.addEventListener('resize', function () { scheduleSync(null, 'window-resize'); });
        window.addEventListener('orientationchange', function () {
            scheduleSync([120, 320], 'orientationchange');
        });
    }

    function registerKeyboardContext(config) {
        if (!config || !config.id) return null;
        contexts[config.id] = {
            id: config.id,
            getRoot: config.getRoot,
            getScrollContainer: config.getScrollContainer,
            getMessageScroller: config.getMessageScroller,
            getBottomBar: config.getBottomBar,
            getInputs: config.getInputs,
            getLockTarget: config.getLockTarget,
            isVisible: config.isVisible,
            ensureResizesContent: !!config.ensureResizesContent,
            scrollStrategy: config.scrollStrategy || 'default',
            preserveBottomAnchor: !!config.preserveBottomAnchor,
            bottomStickThreshold: config.bottomStickThreshold,
            shouldStickToBottom: config.shouldStickToBottom || null,
            onBeforeSync: config.onBeforeSync || null,
            onAfterSync: config.onAfterSync || null,
            onStateChange: config.onStateChange || null,
            onActivate: config.onActivate || null,
            onDeactivate: config.onDeactivate || null,
            focusedInput: null,
            baseHeight: 0,
            pageLockState: null,
            keyboardTransitionActive: false,
            lastKeyboardActive: false
        };
        bindListeners();
        return config.id;
    }

    function activateKeyboardContext(id) {
        var ctx = getContext(id);
        if (!ctx) return;

        if (activeId && activeId !== id) deactivateKeyboardContext(activeId);
        activeId = id;
        window.__keyboardManagerActiveContext = id;
        window.__disableLegacyChatKeyboard = true;
        if (ctx.ensureResizesContent) updateInteractiveWidgetMode(true);
        lockPages(ctx);
        measureBaseHeight(ctx);
        if (typeof ctx.onActivate === 'function') ctx.onActivate();
        scheduleSync([0], 'activate');
    }

    function refreshKeyboardContext(id, reason) {
        if (!id || activeId !== id) return;
        scheduleSync([0], reason || 'manual-refresh');
    }

    function deactivateKeyboardContext(id) {
        var ctx = getContext(id);
        if (!ctx) return;

        if (activeId === id) {
            activeId = null;
            window.__keyboardManagerActiveContext = '';
            window.__disableLegacyChatKeyboard = false;
        }

        ctx.focusedInput = null;
        ctx.baseHeight = 0;
        ctx.keyboardTransitionActive = false;
        ctx.lastKeyboardActive = false;
        if (ctx.ensureResizesContent) updateInteractiveWidgetMode(false);
        unlockPages(ctx);
        clearKeyboardState(ctx);
        if (typeof ctx.onDeactivate === 'function') ctx.onDeactivate();
    }

    function teardownKeyboardContext(id) {
        deactivateKeyboardContext(id);
        delete contexts[id];
    }

    window.KeyboardManager = {
        registerKeyboardContext: registerKeyboardContext,
        activateKeyboardContext: activateKeyboardContext,
        deactivateKeyboardContext: deactivateKeyboardContext,
        teardownKeyboardContext: teardownKeyboardContext,
        refreshKeyboardContext: refreshKeyboardContext,
        getActiveContextId: function () { return activeId; },
        isAnyContextActive: function () { return !!activeId; }
    };
})();
