/* ============================================================
   پارسیس — اشتراک‌گذاری (متن + تصویر با کیفیت فوق‌العاده)
   مسیر: js/ui/share.js
   ============================================================ */
'use strict';

function shareAsText(title, text) {
    var fullText = '📊 ' + title + '\n\n' + text;
    if (navigator.share) {
        navigator.share({ title: title, text: fullText }).catch(function () {});
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(fullText)
            .then(function () { showToast('📋 متن گزارش کپی شد.'); })
            .catch(function () { prompt('متن گزارش:', fullText); });
    } else {
        prompt('متن گزارش:', fullText);
    }
}

function reportToText(containerEl) {
    if (!containerEl) return '';
    var lines = [];
    var table = containerEl.querySelector('table');
    if (table) {
        var trs = table.querySelectorAll('tr');
        trs.forEach(function (tr) {
            var cells = tr.querySelectorAll('th, td');
            var row = [];
            cells.forEach(function (c) { row.push((c.textContent || '').trim()); });
            if (row.length) lines.push(row.join(' | '));
        });
    } else {
        lines.push((containerEl.textContent || '').trim());
    }
    return lines.join('\n');
}

var _html2canvasLoadPromise = null;

function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (_html2canvasLoadPromise) return _html2canvasLoadPromise;

    _html2canvasLoadPromise = new Promise(function (resolve, reject) {
        var urls = [
            'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'
        ];
        var idx = 0;
        function tryNext() {
            if (idx >= urls.length) { _html2canvasLoadPromise = null; reject(new Error('load failed')); return; }
            var s = document.createElement('script');
            s.src = urls[idx++]; s.async = true;
            s.onload = function () { if (window.html2canvas) resolve(window.html2canvas); else tryNext(); };
            s.onerror = function () { tryNext(); };
            document.head.appendChild(s);
        }
        tryNext();
    });
    return _html2canvasLoadPromise;
}

function unlockElement(el) {
    if (!el || !el.style) return null;
    var cs = window.getComputedStyle(el);
    var saved = { el: el };
    var changed = false;
    if (cs.maxHeight && cs.maxHeight !== 'none') { saved.maxHeight = el.style.maxHeight; el.style.maxHeight = 'none'; changed = true; }
    if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') { saved.maxWidth = el.style.maxWidth; el.style.maxWidth = 'none'; changed = true; }
    if (cs.overflow && cs.overflow !== 'visible') { saved.overflow = el.style.overflow; el.style.overflow = 'visible'; changed = true; }
    if (cs.overflowX && cs.overflowX !== 'visible') { saved.overflowX = el.style.overflowX; el.style.overflowX = 'visible'; changed = true; }
    if (cs.overflowY && cs.overflowY !== 'visible') { saved.overflowY = el.style.overflowY; el.style.overflowY = 'visible'; changed = true; }
    return changed ? saved : null;
}

function restoreElement(s) {
    if (!s || !s.el || !s.el.style) return;
    s.el.style.maxHeight = s.maxHeight || '';
    s.el.style.maxWidth = s.maxWidth || '';
    s.el.style.overflow = s.overflow || '';
    s.el.style.overflowX = s.overflowX || '';
    s.el.style.overflowY = s.overflowY || '';
}

function getFullSize(el) {
    var w = Math.max(el.scrollWidth || 0, el.offsetWidth || 0, el.clientWidth || 0);
    var h = Math.max(el.scrollHeight || 0, el.offsetHeight || 0, el.clientHeight || 0);
    el.querySelectorAll('*').forEach(function (c) {
        var cw = Math.max(c.scrollWidth || 0, c.offsetWidth || 0);
        var ch = c.scrollHeight || 0;
        var co = c.offsetTop || 0;
        if (cw > w) w = cw;
        if (ch + co > h) h = ch + co;
    });
    return { width: Math.ceil(w), height: Math.ceil(h) };
}

async function shareAsImage(el, title, filename) {
    if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    showToast('📸 آماده‌سازی تصویر HD...');

    var h2c;
    try { h2c = await loadHtml2Canvas(); } catch (e) {
        showToast('⚠️ خطا در بارگذاری کتابخانه تصویر. لطفا اینترنت را بررسی کنید.');
        return;
    }

    // 🌟 ۱. حفظ ابعاد و عرض اصلی (بدون تغییر سایز ستون‌ها)
    var size = getFullSize(el);
    var targetWidth = size.width;

    var collapsedCards = [];
    el.querySelectorAll('.card.collapsed').forEach(function (card) {
        collapsedCards.push(card); card.classList.remove('collapsed');
        var btn = card.querySelector('.card-collapse-btn'); if (btn) btn.classList.remove('collapsed');
    });

    var savedStyles = [];
    el.querySelectorAll('*').forEach(function (node) {
        var cs = window.getComputedStyle(node);
        var needsUnlock = (cs.maxHeight && cs.maxHeight !== 'none') || (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') || (cs.overflow && cs.overflow !== 'visible') || (cs.overflowX && cs.overflowX !== 'visible') || (cs.overflowY && cs.overflowY !== 'visible');
        if (needsUnlock) { var sn = unlockElement(node); if (sn) savedStyles.push(sn); }
    });

    var rootSaved = { width: el.style.width, minWidth: el.style.minWidth, maxWidth: el.style.maxWidth, overflow: el.style.overflow, overflowX: el.style.overflowX };
    // فقط عرض را به اندازه طبیعی خودش قفل می‌کنیم تا اسکرول‌ها باز شوند
    el.style.width = targetWidth + 'px';
    el.style.minWidth = targetWidth + 'px';
    el.style.maxWidth = 'none';
    el.style.overflow = 'visible';
    el.style.overflowX = 'visible';
    el.style.boxSizing = 'border-box';

    var gridOverrides = [];
    el.querySelectorAll('*').forEach(function (node) {
        var cs = window.getComputedStyle(node);
        if (cs.display === 'grid' && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
            if (cs.gridTemplateColumns.indexOf('repeat') !== -1 || cs.gridTemplateColumns.split(' ').length > 1) {
                gridOverrides.push({ node: node, oldTemplate: node.style.gridTemplateColumns });
                node.style.gridTemplateColumns = '1fr';
            }
        }
    });

    var hiddenNodes = [];
    var hideSel = '.share-btn,.widget-share-btn,.col-resizer,.col-reset-btn,.col-toggle-btn,.eye-toggle-btn,.filters-toggle-btn,.card-collapse-btn,.column-filter-row,.col-filter-menu,#col-filter-menu,.row-actions';
    el.querySelectorAll(hideSel).forEach(function (n) {
        if (n.style.display !== 'none') { hiddenNodes.push({ el: n, old: n.style.display }); n.style.display = 'none'; }
    });

    await new Promise(function (r) { requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(r, 200); }); }); });
    size = getFullSize(el);

    // 🌟 تنظیم Scale برای وضوح بالا
    var scale = 3;
    var MAX_CHUNK_H = 3000;
    var chunkCount = Math.ceil(size.height / MAX_CHUNK_H);

    var oncloneFn = function (clonedDoc, clonedEl) {
        clonedEl.style.overflow = 'visible';
        clonedEl.style.maxHeight = 'none';
        clonedEl.style.maxWidth = 'none';
        clonedEl.style.height = 'auto';
        clonedEl.style.width = size.width + 'px';
        clonedEl.style.minWidth = size.width + 'px';
        clonedEl.style.transform = 'none';
        clonedEl.style.zoom = '1';

        clonedEl.querySelectorAll('*').forEach(function (node) {
            var cs = window.getComputedStyle(node);
            if (cs.overflow && cs.overflow !== 'visible') node.style.overflow = 'visible';
            if (cs.overflowX && cs.overflowX !== 'visible') node.style.overflowX = 'visible';
            if (cs.overflowY && cs.overflowY !== 'visible') node.style.overflowY = 'visible';
            if (cs.maxHeight && cs.maxHeight !== 'none') { node.style.maxHeight = 'none'; node.style.height = 'auto'; }
            if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') node.style.maxWidth = 'none';
            if (cs.display === 'grid' && cs.gridTemplateColumns && cs.gridTemplateColumns !== 'none') {
                if (cs.gridTemplateColumns.indexOf('repeat') !== -1 || cs.gridTemplateColumns.split(' ').length > 1) node.style.gridTemplateColumns = '1fr';
            }
            if (cs.transform && cs.transform !== 'none') node.style.transform = 'none';
            if (cs.boxShadow && cs.boxShadow !== 'none') node.style.boxShadow = 'none';
            if (cs.textShadow && cs.textShadow !== 'none') node.style.textShadow = 'none';
            if (cs.filter && cs.filter !== 'none') node.style.filter = 'none';
            node.style.textRendering = 'optimizeLegibility';
            node.style.webkitFontSmoothing = 'antialiased';
        });
        clonedEl.querySelectorAll(hideSel).forEach(function (n) { n.style.display = 'none'; });
    };

    var blobs = [];
    var now = new Date();
    var timeStr = pad2(now.getHours()) + ':' + pad2(now.getMinutes());
    var dateStr = todayJalaliStr().replace(/\//g, '-');
    var safeName = (title || 'گزارش').replace(/[\\/:*?"<>|]/g, '').trim() + '-(' + timeStr + '-' + dateStr + ')';

    try {
        for (var i = 0; i < chunkCount; i++) {
            var y = i * MAX_CHUNK_H;
            var h = Math.min(MAX_CHUNK_H, size.height - y);
            if (chunkCount > 1) showToast('📸 تکه ' + toFa(i + 1) + ' از ' + toFa(chunkCount) + '...');

            var canvas = await h2c(el, {
                backgroundColor: '#ffffff', scale: scale, useCORS: true, allowTaint: false, logging: false,
                scrollX: 0, scrollY: 0, x: 0, y: y, width: size.width, height: h, windowWidth: size.width, windowHeight: size.height,
                letterRendering: true, onclone: oncloneFn // letterRendering true برای فارسی
            });

            var blob = await new Promise(function (resolve, reject) {
                canvas.toBlob(function (b) { if (b) resolve(b); else reject(new Error('toBlob failed')); }, 'image/png');
            });
            blobs.push(blob);
        }
    } catch (e) {
        console.error('❌ [share]', e);
        savedStyles.forEach(restoreElement);
        el.style.width = rootSaved.width || ''; el.style.minWidth = rootSaved.minWidth || '';
        el.style.maxWidth = rootSaved.maxWidth || ''; el.style.overflow = rootSaved.overflow || ''; el.style.overflowX = rootSaved.overflowX || '';
        collapsedCards.forEach(function (c) { c.classList.add('collapsed'); var btn = c.querySelector('.card-collapse-btn'); if (btn) btn.classList.add('collapsed'); });
        hiddenNodes.forEach(function (x) { x.el.style.display = x.old; });
        gridOverrides.forEach(function (o) { o.node.style.gridTemplateColumns = o.oldTemplate || ''; });
        showToast('⚠️ خطا در ساخت تصویر');
        return;
    }

    savedStyles.forEach(restoreElement);
    el.style.width = rootSaved.width || ''; el.style.minWidth = rootSaved.minWidth || '';
    el.style.maxWidth = rootSaved.maxWidth || ''; el.style.overflow = rootSaved.overflow || ''; el.style.overflowX = rootSaved.overflowX || ''; el.style.boxSizing = '';
    gridOverrides.forEach(function (o) { o.node.style.gridTemplateColumns = o.oldTemplate || ''; });
    collapsedCards.forEach(function (c) { c.classList.add('collapsed'); var btn = c.querySelector('.card-collapse-btn'); if (btn) btn.classList.add('collapsed'); });
    hiddenNodes.forEach(function (x) { x.el.style.display = x.old; });

    var files = blobs.map(function (blob, i) {
        var name = blobs.length > 1 ? safeName + '-بخش' + (i + 1) + '.png' : safeName + '.png';
        return new File([blob], name, { type: 'image/png' });
    });

    if (navigator.canShare && navigator.canShare({ files: files })) {
        try {
            await navigator.share({ files: files, title: title || 'گزارش', text: title || 'گزارش' });
            showToast('✅ ' + toFa(files.length) + ' تصویر HD اشتراک شد.');
            return;
        } catch (e) {
            if (e && e.name === 'AbortError') return;
        }
    }

    files.forEach(function (file, i) {
        var url = URL.createObjectURL(file);
        setTimeout(function () {
            var a = document.createElement('a');
            a.href = url; a.download = file.name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
        }, i * 400);
    });
    showToast('💾 ' + toFa(files.length) + ' تصویر HD دانلود شد.');
}

function buildShareButtons() {
    document.querySelectorAll('.list-header').forEach(function (h) {
        if (h.querySelector('.share-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'share-btn'; btn.title = 'اشتراک‌گذاری گزارش (تصویر)'; btn.innerHTML = '📤';
        h.appendChild(btn);
    });
    document.querySelectorAll('.widget-card').forEach(function (w) {
        if (w.querySelector('.widget-share-btn')) return;
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'widget-share-btn'; btn.title = 'اشتراک‌گذاری ویجت (تصویر)'; btn.innerHTML = '📤';
        if (getComputedStyle(w).position === 'static') w.style.position = 'relative';
        w.appendChild(btn);
    });
}

(function bindShareDelegation() {
    function handle(e) {
        var target = e.target;
        if (!target || !target.closest) return;
        var btn = target.closest('.share-btn');
        if (btn) {
            e.stopPropagation(); e.preventDefault();
            var card = btn.closest('.card');
            var targetEl = card || (btn.closest('.list-header') ? btn.closest('.list-header').parentElement : null);
            var titleEl = document.querySelector('.page.active > h2');
            var title = titleEl ? titleEl.textContent : 'گزارش پارسیس';
            if (typeof shareAsImage === 'function') shareAsImage(targetEl, title.trim(), 'parsis-report');
            return;
        }
        var wBtn = target.closest('.widget-share-btn');
        if (wBtn) {
            e.stopPropagation(); e.preventDefault();
            var w = wBtn.closest('.widget-card');
            if (w) {
                var wTitle = (w.querySelector('h3') || {}).textContent || 'ویجت پارسیس';
                if (typeof shareAsImage === 'function') shareAsImage(w, wTitle.trim(), 'parsis-widget');
            }
        }
    }
    document.addEventListener('click', handle, true);
})();

window.shareAsText = shareAsText;
window.reportToText = reportToText;
window.loadHtml2Canvas = loadHtml2Canvas;
window.shareAsImage = shareAsImage;
window.buildShareButtons = buildShareButtons;
window.unlockElement = unlockElement;
window.restoreElement = restoreElement;
window.getFullSize = getFullSize;

console.log('✅ [ui/share.js] loaded — Aspect Ratio Preserved');
