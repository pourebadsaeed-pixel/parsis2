/* پارسیس — فیکس‌های نهایی: تنظیمات، فهرست اسناد، اشتراک‌گذاری تصویری */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   بخش ۱ — تنظیمات آکاردئونی + چک‌باکس ویجت‌ها
   ═══════════════════════════════════════════════════════════════ */
(function disableOldReminder() {
    window.showReminderModal = function() { /* no-op */ };
    function cleanup() {
        var m = document.getElementById('reminder-modal');
        var o = document.getElementById('reminder-overlay');
        if (m) m.remove();
        if (o) o.remove();
    }
    setTimeout(cleanup, 1000);
    setInterval(cleanup, 5000);
    console.log('✅ [v42] reminder قدیمی غیرفعال شد — فقط notifStack41 فعال است');
})();

(function collapseSettings() {
    function convert() {
        var modal = document.getElementById('settings-modal');
        if (!modal || modal.dataset.collapseV41 === '1') return;
        modal.dataset.collapseV41 = '1';
        var body = modal.querySelector('.modal-body');
        if (!body) return;

        var sections = Array.from(body.querySelectorAll('.modal-section'));
        sections.forEach(function(sec) {
            var h3 = sec.querySelector('h3');
            if (!h3) return;
            var title = h3.textContent.trim();

            if (/ویجت.*فعال|فعال.*ویجت/.test(title) && /checkbox-grid/.test(sec.innerHTML)) {
                sec.remove();
                return;
            }

            var det = document.createElement('details');
            det.className = 'settings-details';
            var sum = document.createElement('summary');
            sum.className = 'settings-summary';
            sum.textContent = title;
            det.appendChild(sum);

            var wrap = document.createElement('div');
            wrap.style.padding = '0 8px 12px 8px';
            Array.from(sec.childNodes).forEach(function(n) {
                if (n !== h3) wrap.appendChild(n);
            });
            det.appendChild(wrap);
            sec.parentNode.replaceChild(det, sec);
        });

        var btns = document.createElement('div');
        btns.className = 'settings-expand-btns';
        btns.innerHTML =
            '<button class="mini-btn" id="set-expand-all-v41">باز کردن همه</button>' +
            '<button class="mini-btn" id="set-collapse-all-v41">بستن همه</button>';
        body.insertBefore(btns, body.firstChild);

        document.getElementById('set-expand-all-v41').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = true; });
        });
        document.getElementById('set-collapse-all-v41').addEventListener('click', function() {
            body.querySelectorAll('details.settings-details').forEach(function(d) { d.open = false; });
        });

        console.log('✅ [v42] تنظیمات کولاپس شد');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(convert, 1200); });
    } else {
        setTimeout(convert, 1200);
    }
})();

/* ★ اطمینان از وجود چک‌باکس برای ۳ ویجت جدید تقویم */
(function ensureWidgetCheckboxes() {
    function patch() {
        if (typeof window.renderWidgetOrderUI !== 'function') {
            setTimeout(patch, 600);
            return;
        }
        if (window._widgetCheckPatchedV42) return;
        window._widgetCheckPatchedV42 = true;

        window.renderWidgetOrderUI = function() {
            var box = document.getElementById('widget-order-list');
            if (!box) return;
            var names = {
                calendar:'📅 تقویم هفتگی',
                calendarNext3:'📅 ۳ روز آتی',
                calendarDay:'📆 روز جاری',
                calendarAgenda:'📋 دستورکار',
                todayChecklistPersonal:'⭐ چک‌لیست شخصی',
                todayChecklistFamily:'🏠 چک‌لیست خانواده',
                todayChecklistWork:'💼 چک‌لیست شغلی',
                bankTotal:'🏦 مانده کل بانک',
                bankBalances:'🏦 مانده حساب‌ها',
                cashBalances:'💰 صندوق‌ها',
                upcomingInstallments:'⏰ اقساط ۳ روز آینده',
                birthdays:'🎂 تولدها',
                liveRates:'💱 نرخ لحظه‌ای ارز و طلا'
            };
            var order = state.widgetOrder || [];
            var MAX_PAGES = 4;
            box.innerHTML = '';
            order.forEach(function(key, idx) {
                var row = document.createElement('div');
                row.className = 'widget-order-row';
                var curPage = state.widgetPages[key] || 1;
                var sel = '<select class="wo-page" data-widget-page="' + key + '">';
                for (var p = 1; p <= MAX_PAGES; p++)
                    sel += '<option value="' + p + '"' + (curPage === p ? ' selected' : '') + '>صفحه ' + toFa(p) + '</option>';
                sel += '</select>';
                var checked = state.widgets[key] ? 'checked' : '';
                row.innerHTML =
                    '<label class="wo-name" style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0">' +
                        '<input type="checkbox" data-widget-check="' + key + '" ' + checked + ' style="width:17px;height:17px;accent-color:var(--primary);flex-shrink:0">' +
                        '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + (names[key] || key) + '</span>' +
                    '</label>' + sel +
                    '<div class="wo-btns">' +
                        '<button class="wo-btn" data-key="' + key + '" data-dir="-1"' + (idx === 0 ? ' disabled' : '') + '>↑</button>' +
                        '<button class="wo-btn" data-key="' + key + '" data-dir="1"' + (idx === order.length - 1 ? ' disabled' : '') + '>↓</button>' +
                    '</div>';
                box.appendChild(row);
            });
            box.querySelectorAll('.wo-btn').forEach(function(b) {
                b.addEventListener('click', function() {
                    var key = this.getAttribute('data-key');
                    var dir = Number(this.getAttribute('data-dir'));
                    var arr = state.widgetOrder.slice();
                    var i = arr.indexOf(key), j = i + dir;
                    if (j < 0 || j >= arr.length) return;
                    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                    state.widgetOrder = arr;
                    DB.save('widgetOrder', arr);
                    updateHomeWidgets();
                    renderWidgetOrderUI();
                });
            });
            box.querySelectorAll('[data-widget-page]').forEach(function(s) {
                s.addEventListener('change', function() {
                    var key = this.getAttribute('data-widget-page');
                    state.widgetPages[key] = Number(this.value);
                    DB.save('widgetPages', state.widgetPages);
                    updateHomeWidgets();
                });
            });
            box.querySelectorAll('[data-widget-check]').forEach(function(cb) {
                cb.addEventListener('change', function() {
                    var key = this.getAttribute('data-widget-check');
                    state.widgets[key] = this.checked;
                    DB.save('widgets', state.widgets);
                    updateHomeWidgets();
                    if (typeof applyWidgetVisibility === 'function') applyWidgetVisibility();
                });
            });
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patch, 1500); });
    } else {
        setTimeout(patch, 1500);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۲ — فهرست اسناد: نمایش + صفحه‌بندی + فیلتر + تأیید + حذف
   ═══════════════════════════════════════════════════════════════ */
(function fixVoucherListDisplay() {
    console.log('🔧 [v42] نصب پچ فهرست اسناد...');

    var PAGE_SIZE = 50;

    function ensurePaginationBox() {
        var box = document.getElementById('vlist-pagination');
        if (box) return box;
        box = document.createElement('div');
        box.id = 'vlist-pagination';
        box.style.cssText = 'display:flex;justify-content:center;align-items:center;gap:6px;' +
                            'margin-top:14px;padding:6px 0;flex-wrap:wrap;direction:rtl';
        var tableWrap = document.querySelector('#page-voucher-list .table-wrap');
        if (tableWrap && tableWrap.parentNode) {
            tableWrap.parentNode.insertBefore(box, tableWrap.nextSibling);
        } else {
            var page = document.getElementById('page-voucher-list');
            if (page) page.appendChild(box);
        }
        return box;
    }

    function renderPager(total, curPage) {
        var box = ensurePaginationBox();
        if (!box) return;
        box.innerHTML = '';
        var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
        if (totalPages <= 1) {
            box.style.display = 'none';
            return;
        }
        box.style.display = 'flex';

        function mkBtn(label, page, disabled, title) {
            var b = document.createElement('button');
            b.type = 'button';
            b.textContent = label;
            b.title = title || '';
            b.disabled = !!disabled;
            b.style.cssText = 'min-width:42px;height:38px;padding:0 12px;border-radius:10px;' +
                              'border:1.5px solid var(--border);background:var(--card-solid);' +
                              'color:var(--primary-dark);font-weight:800;font-family:inherit;' +
                              'font-size:1rem;cursor:pointer;transition:all .2s;' +
                              'display:inline-flex;align-items:center;justify-content:center';
            if (disabled) {
                b.style.opacity = '0.35';
                b.style.cursor = 'not-allowed';
            } else {
                b.addEventListener('mouseenter', function() { b.style.background = 'var(--primary-light)'; });
                b.addEventListener('mouseleave', function() { b.style.background = 'var(--card-solid)'; });
                b.addEventListener('click', function() {
                    window._vlistPg = window._vlistPg || { page: 1 };
                    window._vlistPg.page = page;
                    renderVoucherListV42();
                });
            }
            box.appendChild(b);
        }

        mkBtn('⏮', 1, curPage === 1, 'اولین صفحه');
        mkBtn('▶', curPage - 1, curPage === 1, 'صفحه قبل');
        mkBtn('◀', curPage + 1, curPage === totalPages, 'صفحه بعد');

        var info = document.createElement('span');
        info.textContent = 'صفحه ' + toFa(curPage) + ' از ' + toFa(totalPages);
        info.style.cssText = 'padding:0 14px;font-weight:800;color:var(--primary-dark);font-size:0.85rem';
        box.appendChild(info);

        mkBtn('⏭', totalPages, curPage === totalPages, 'آخرین صفحه');
    }

    function renderVoucherListV42() {
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;

        try {
            var allVouchers = DB.load('vouchers', []);

            if (!Array.isArray(allVouchers) || allVouchers.length === 0) {
                tb.innerHTML = '<tr><td colspan="8" class="empty-row">هیچ سندی ثبت نشده است. برای ثبت، از «✏️ صدور سند» استفاده کنید.</td></tr>';
                var cEl = document.getElementById('vlist-count');
                if (cEl) cEl.textContent = '۰';
                var box = document.getElementById('vlist-pagination');
                if (box) box.style.display = 'none';
                return;
            }

            var periodFilter = (document.getElementById('vl-period-filter') || {}).value || '';
            var searchVal = ((document.getElementById('vlist-search') || {}).value || '').toLowerCase();
            var statusFilter = (document.getElementById('vlist-status-filter') || {}).value || '';

            var vouchers = allVouchers.slice();
            if (periodFilter) vouchers = vouchers.filter(function(v) { return v.periodId === periodFilter; });
            if (statusFilter) vouchers = vouchers.filter(function(v) { return (v.status || 'draft') === statusFilter; });

            var periods = DB.load('fiscalPeriods', []);
            var pMap = {};
            periods.forEach(function(p) { pMap[p.id] = p.title; });

            if (searchVal) {
                vouchers = vouchers.filter(function(v) {
                    var pN = pMap[v.periodId] || '';
                    var txt = String(v.number || '') + ' ' + String(v.date || '') + ' ' + String(v.desc || '') + ' ' + voucherTypeName(v.type) + ' ' + pN;
                    return txt.toLowerCase().indexOf(searchVal) !== -1;
                });
            }

            var st = (typeof sortState !== 'undefined' && sortState.vouchers) ? sortState.vouchers : { col: 'number', dir: 'desc' };
            try {
                vouchers.sort(function(a, b) {
                    var va, vb;
                    if (st.col === 'periodName') { va = pMap[a.periodId] || ''; vb = pMap[b.periodId] || ''; }
                    else if (st.col === 'status') { va = a.status === 'approved' ? 'ت' : 'پ'; vb = b.status === 'approved' ? 'ت' : 'پ'; }
                    else if (st.col === 'type') { va = voucherTypeName(a.type); vb = voucherTypeName(b.type); }
                    else if (st.col === 'amount') { va = getVoucherAmount(a); vb = getVoucherAmount(b); }
                    else { va = a[st.col] || ''; vb = b[st.col] || ''; }
                    var c = compareVals(va, vb);
                    return st.dir === 'asc' ? c : -c;
                });
            } catch (e) { console.warn('⚠️ [v42] خطای مرتب‌سازی:', e); }

            var total = vouchers.length;
            var totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
            window._vlistPg = window._vlistPg || { page: 1 };
            if (window._vlistPg.page > totalPages) window._vlistPg.page = totalPages;
            if (window._vlistPg.page < 1) window._vlistPg.page = 1;
            var startIdx = (window._vlistPg.page - 1) * PAGE_SIZE;
            var pageVouchers = vouchers.slice(startIdx, startIdx + PAGE_SIZE);

            tb.innerHTML = '';
            var hide = getHideState('voucher-list');
            var shown = 0;

            for (var i = 0; i < pageVouchers.length; i++) {
                var v = pageVouchers[i];
                var status = v.status || 'draft';
                var issues = [];
                try { issues = getVoucherIssues(v) || []; } catch (e) { issues = []; }

                var badge;
                if (status === 'approved') {
                    badge = '<span class="badge badge-approved">✓ تأیید</span>';
                } else if (issues.length > 0) {
                    badge = '<span class="badge badge-draft" title="ناقص">پیش‌نویس ⚠️</span>';
                } else {
                    badge = '<span class="badge badge-draft">پیش‌نویس</span>';
                }

                var tB = '<span class="badge badge-type">' + voucherTypeName(v.type) + '</span>';
                var pN = pMap[v.periodId] || '—';
                var amt = getVoucherAmount(v);
                var descTxt = v.desc ? esc(v.desc) : '<span style="color:#cbd5e1">—</span>';

                var tr = document.createElement('tr');
                if (status === 'approved') tr.classList.add('approved-row');

                var aH = '<div class="row-actions"><button class="row-btn open" data-id="' + v.id + '" data-action="preview">👁</button>';
                if (status === 'draft') {
                    aH += '<button class="row-btn edit" data-id="' + v.id + '" data-action="edit">✎</button>';
                    aH += '<button class="row-btn approve" data-id="' + v.id + '" data-action="approve">✓</button>';
                    aH += '<button class="row-btn del" data-id="' + v.id + '" data-action="delete">×</button>';
                } else {
                    aH += '<button class="row-btn unapprove" data-id="' + v.id + '" data-action="unapprove">↩</button>';
                }
                aH += '</div>';

                tr.innerHTML = '<td dir="ltr">' + toFa(esc(v.number)) + '</td>'
                    + '<td dir="ltr">' + toFa(esc(v.date)) + '</td>'
                    + '<td>' + tB + '</td>'
                    + '<td>' + esc(pN) + '</td>'
                    + '<td>' + descTxt + '</td>'
                    + '<td class="num" style="font-weight:bold">' + (hide ? '—' : formatMoney(amt)) + '</td>'
                    + '<td>' + badge + '</td>'
                    + '<td>' + aH + '</td>';

                tb.appendChild(tr);
                shown++;
            }

            if (shown === 0) {
                tb.innerHTML = '<tr><td colspan="8" class="empty-row">سندی مطابق فیلترها یافت نشد.</td></tr>';
            }

            var cntEl = document.getElementById('vlist-count');
            if (cntEl) cntEl.textContent = toFa(total);

            renderPager(total, window._vlistPg.page);

            var btns = tb.querySelectorAll('.row-btn');
            for (var b = 0; b < btns.length; b++) {
                btns[b].addEventListener('click', handleRowBtnClick);
            }

            if (typeof applyColVisibility === 'function') {
                try { applyColVisibility('voucher-table-list'); } catch (e) {}
            }

        } catch (err) {
            console.error('❌ [v42] خطای کلی:', err);
            tb.innerHTML = '<tr><td colspan="8" class="empty-row" style="color:#dc2626">خطا: ' + esc(err.message || err) + '</td></tr>';
        }
    }

    function handleRowBtnClick() {
        var id = this.getAttribute('data-id');
        var action = this.getAttribute('data-action');
        var v = findVoucherById(id);
        if (!v) return;

        if (action === 'preview') { openVoucherPreview(v); return; }
        if (action === 'edit') { loadVoucherForEdit(v); return; }

        if (action === 'approve') {
            var issues = getVoucherIssues(v);
            if (issues.length > 0) { alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• ')); return; }
            var list = DB.load('vouchers', []);
            for (var x = 0; x < list.length; x++) if (list[x].id === id) list[x].status = 'approved';
            DB.save('vouchers', list);
            renderVoucherListV42();
            showToast('✅ سند تأیید شد.');
            return;
        }

        if (action === 'unapprove') {
            if (!confirm('به پیش‌نویس برگردد؟')) return;
            var list2 = DB.load('vouchers', []);
            for (var y = 0; y < list2.length; y++) if (list2[y].id === id) list2[y].status = 'draft';
            DB.save('vouchers', list2);
            renderVoucherListV42();
            return;
        }

        if (action === 'delete') {
            if (!confirm('حذف شود؟')) return;
            var list3 = DB.load('vouchers', []).filter(function(x) { return x.id !== id; });
            DB.save('vouchers', list3);
            renderVoucherListV42();
            if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
            return;
        }
    }

    window.renderVoucherList = renderVoucherListV42;
    window._renderVoucherListV42 = renderVoucherListV42;

    function patchGoToPage() {
        if (!window.goToPage) { setTimeout(patchGoToPage, 500); return; }
        if (window._gtpV42Patched) return;
        window._gtpV42Patched = true;
        var _orig = window.goToPage;
        window.goToPage = function (name) {
            var r = _orig.apply(this, arguments);
            if (name === 'voucher-list') {
                setTimeout(function () {
                    try { renderVoucherListV42(); } catch (e) { console.error('v42:', e); }
                }, 120);
            }
            return r;
        };
    }

    setInterval(function () {
        var page = document.getElementById('page-voucher-list');
        if (!page || !page.classList.contains('active')) return;
        var tb = document.getElementById('voucher-list-body');
        if (!tb) return;
        var rows = tb.querySelectorAll('tr').length;
        var isEmpty = rows === 0 || (rows === 1 && tb.querySelector('.empty-row'));
        var dbCount = DB.load('vouchers', []).length;
        if (isEmpty && dbCount > 0) {
            console.log('🔄 [v42] جدول خالی ولی ' + dbCount + ' سند در DB هست — رندر مجدد');
            renderVoucherListV42();
        }
    }, 3000);

    function init() {
        patchGoToPage();
        var page = document.getElementById('page-voucher-list');
        if (page && page.classList.contains('active')) {
            setTimeout(renderVoucherListV42, 500);
        }
        console.log('✅ [v42.1] پچ فهرست اسناد + صفحه‌بندی نصب شد');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 3000); });
    } else {
        setTimeout(init, 3000);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   بخش ۳ — اشتراک‌گذاری تصویری گزارش‌ها (رفع بریدگی عرض)
   ═══════════════════════════════════════════════════════════════ */
(function shareImageFinalV44() {
    if (window._shareFinalV44) return;
    window._shareFinalV44 = true;

    console.log('🚀 [v44] نصب اشتراک‌گذاری تصویر نهایی...');

    function unlockElement(el) {
        if (!el || !el.style) return null;
        var cs = window.getComputedStyle(el);
        var saved = { el: el };
        var changed = false;

        if (cs.maxHeight && cs.maxHeight !== 'none') {
            saved.maxHeight = el.style.maxHeight;
            el.style.maxHeight = 'none';
            changed = true;
        }
        if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') {
            saved.maxWidth = el.style.maxWidth;
            el.style.maxWidth = 'none';
            changed = true;
        }
        if (cs.overflow && cs.overflow !== 'visible') {
            saved.overflow = el.style.overflow;
            el.style.overflow = 'visible';
            changed = true;
        }
        if (cs.overflowX && cs.overflowX !== 'visible') {
            saved.overflowX = el.style.overflowX;
            el.style.overflowX = 'visible';
            changed = true;
        }
        if (cs.overflowY && cs.overflowY !== 'visible') {
            saved.overflowY = el.style.overflowY;
            el.style.overflowY = 'visible';
            changed = true;
        }
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
        var w = Math.max(
            el.scrollWidth || 0,
            el.offsetWidth || 0,
            el.clientWidth || 0
        );
        var h = Math.max(
            el.scrollHeight || 0,
            el.offsetHeight || 0,
            el.clientHeight || 0
        );

        el.querySelectorAll('*').forEach(function (c) {
            var cw = Math.max(c.scrollWidth || 0, c.offsetWidth || 0);
            var ch = c.scrollHeight || 0;
            var co = c.offsetTop || 0;
            if (cw > w) w = cw;
            if (ch + co > h) h = ch + co;
        });

        return { width: Math.ceil(w), height: Math.ceil(h) };
    }

    window.shareAsImage = async function (el, title, filename) {
        if (!el) { showToast('محتوایی برای اشتراک نیست.'); return; }
        if (typeof loadHtml2Canvas !== 'function') {
            showToast('⚠️ کتابخانه یافت نشد'); return;
        }

        showToast('📸 آماده‌سازی تصویر با کیفیت بالا...');

        var h2c;
        try { h2c = await loadHtml2Canvas(); }
        catch (e) {
            showToast('⚠️ خطا در بارگذاری کتابخانه');
            if (typeof shareAsText === 'function' && typeof reportToText === 'function') {
                shareAsText(title || 'گزارش پارسیس', reportToText(el));
            }
            return;
        }

        var collapsedCards = [];
        el.querySelectorAll('.card.collapsed').forEach(function (card) {
            collapsedCards.push(card);
            card.classList.remove('collapsed');
            var btn = card.querySelector('.card-collapse-btn');
            if (btn) btn.classList.remove('collapsed');
        });

        var savedStyles = [];
        el.querySelectorAll('*').forEach(function (node) {
            var cs = window.getComputedStyle(node);
            var needsUnlock =
                (cs.maxHeight && cs.maxHeight !== 'none') ||
                (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') ||
                (cs.overflow && cs.overflow !== 'visible') ||
                (cs.overflowX && cs.overflowX !== 'visible') ||
                (cs.overflowY && cs.overflowY !== 'visible');
            if (needsUnlock) {
                var sn = unlockElement(node);
                if (sn) savedStyles.push(sn);
            }
        });

        var rootSaved = {
            width: el.style.width,
            minWidth: el.style.minWidth,
            maxWidth: el.style.maxWidth,
            overflow: el.style.overflow,
            overflowX: el.style.overflowX
        };
        el.style.width = 'max-content';
        el.style.minWidth = 'max-content';
        el.style.maxWidth = 'none';
        el.style.overflow = 'visible';
        el.style.overflowX = 'visible';

        var hiddenNodes = [];
        var hideSel = '.share-btn,.widget-share-btn,.col-resizer,.col-reset-btn,.col-toggle-btn,.eye-toggle-btn,.filters-toggle-btn,.card-collapse-btn,.column-filter-row,.col-filter-menu,#col-filter-menu,.row-actions';
        el.querySelectorAll(hideSel).forEach(function (n) {
            if (n.style.display !== 'none') {
                hiddenNodes.push({ el: n, old: n.style.display });
                n.style.display = 'none';
            }
        });

        await new Promise(function (r) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    setTimeout(r, 150);
                });
            });
        });

        var size = getFullSize(el);
        console.log('📸 [v44] ابعاد کامل:', size.width, '×', size.height);

        var dpr = window.devicePixelRatio || 1;
        var scale = Math.max(3, Math.ceil(dpr * 1.5));
        var maxPixels = 60 * 1000 * 1000;
        if (size.width * size.height * scale * scale > maxPixels) {
            scale = Math.max(2, Math.sqrt(maxPixels / (size.width * size.height)));
        }
        console.log('📸 [v44] scale:', scale.toFixed(2));

        var MAX_CHUNK_H = 3500;
        var chunkCount = Math.ceil(size.height / MAX_CHUNK_H);
        if (chunkCount < 1) chunkCount = 1;

        var oncloneFn = function (clonedDoc, clonedEl) {
            clonedEl.style.overflow = 'visible';
            clonedEl.style.maxHeight = 'none';
            clonedEl.style.maxWidth = 'none';
            clonedEl.style.height = 'auto';
            clonedEl.style.width = 'max-content';
            clonedEl.style.minWidth = 'max-content';
            clonedEl.querySelectorAll('*').forEach(function (node) {
                var cs = window.getComputedStyle(node);
                if (cs.overflow && cs.overflow !== 'visible') node.style.overflow = 'visible';
                if (cs.overflowX && cs.overflowX !== 'visible') node.style.overflowX = 'visible';
                if (cs.overflowY && cs.overflowY !== 'visible') node.style.overflowY = 'visible';
                if (cs.maxHeight && cs.maxHeight !== 'none') {
                    node.style.maxHeight = 'none';
                    node.style.height = 'auto';
                }
                if (cs.maxWidth && cs.maxWidth !== 'none' && cs.maxWidth !== 'auto') {
                    node.style.maxWidth = 'none';
                }
            });
            clonedEl.querySelectorAll(hideSel).forEach(function (n) { n.style.display = 'none'; });
        };

        var blobs = [];
        var safeName = (filename || 'parsis-report') + '-' + todayJalaliStr().replace(/\//g, '-');

        try {
            for (var i = 0; i < chunkCount; i++) {
                var y = i * MAX_CHUNK_H;
                var h = Math.min(MAX_CHUNK_H, size.height - y);

                if (chunkCount > 1) {
                    showToast('📸 آماده‌سازی تکه ' + toFa(i + 1) + ' از ' + toFa(chunkCount) + '...');
                }

                var canvas = await h2c(el, {
                    backgroundColor: '#ffffff',
                    scale: scale,
                    useCORS: true,
                    allowTaint: false,
                    logging: false,
                    scrollX: 0,
                    scrollY: 0,
                    x: 0,
                    y: y,
                    width: size.width,
                    height: h,
                    windowWidth: size.width,
                    windowHeight: size.height,
                    onclone: oncloneFn
                });

                var blob = await new Promise(function (resolve, reject) {
                    canvas.toBlob(function (b) {
                        if (b) resolve(b); else reject(new Error('toBlob failed'));
                    }, 'image/png');
                });

                blobs.push(blob);
                console.log('📸 [v44] تکه ' + (i + 1) + ':', (blob.size / 1024).toFixed(0), 'KB');
            }
        } catch (e) {
            console.error('❌ [v44] خطا:', e);
            restore();
            showToast('⚠️ خطا در ساخت تصویر');
            return;
        }

        function restore() {
            savedStyles.forEach(restoreElement);
            el.style.width = rootSaved.width || '';
            el.style.minWidth = rootSaved.minWidth || '';
            el.style.maxWidth = rootSaved.maxWidth || '';
            el.style.overflow = rootSaved.overflow || '';
            el.style.overflowX = rootSaved.overflowX || '';
            collapsedCards.forEach(function (c) {
                c.classList.add('collapsed');
                var btn = c.querySelector('.card-collapse-btn');
                if (btn) btn.classList.add('collapsed');
            });
            hiddenNodes.forEach(function (x) { x.el.style.display = x.old; });
        }
        restore();

        var files = blobs.map(function (blob, i) {
            var name = blobs.length > 1
                ? safeName + '-part' + (i + 1) + '.png'
                : safeName + '.png';
            return new File([blob], name, { type: 'image/png' });
        });

        var shareTitle = title || 'گزارش پارسیس';

        if (navigator.canShare && navigator.canShare({ files: files })) {
            try {
                await navigator.share({
                    files: files,
                    title: shareTitle,
                    text: shareTitle
                });
                showToast('✅ ' + toFa(files.length) + ' تصویر اشتراک شد.');
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return;
                console.warn('⚠️ [v44] Web Share failed:', e);
            }
        }

        files.forEach(function (file, i) {
            var url = URL.createObjectURL(file);
            setTimeout(function () {
                var a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
            }, i * 400);
        });
        showToast('💾 ' + toFa(files.length) + ' تصویر دانلود شد.');
    };

    console.log('✅ [v44] اشتراک‌گذاری با عرض کامل نصب شد');
})();
