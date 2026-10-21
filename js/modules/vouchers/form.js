/* ============================================================
   پارسیس — فرم سند (بخش ۱: state + helpers + status bar)
   مسیر: js/modules/vouchers/form.js
   ============================================================ */
'use strict';

var voucherLines = [];
var currentVoucherStatus = 'draft';

window._voucherFormSavedAndClean = false;
window._voucherSaved_backup = null;

/* ============================================================
   بخش ۲ — استایل و کامپوننت لیست کشویی جستجوپذیر
   ============================================================ */
(function injectVoucherSearchableCss() {
    if (document.getElementById('cs-voucher-style')) return;
    var s = document.createElement('style');
    s.id = 'cs-voucher-style';
    s.textContent = `
        .cs-wrapper { position: relative; width: 100%; margin-top: 8px; }
        .cs-trigger { padding:10px; font-size:0.82rem; border:1.5px solid var(--border); border-radius:10px; background:var(--card-solid); cursor:pointer; display:flex; justify-content:space-between; align-items:center; user-select:none; min-height:40px; }
        .cs-trigger:hover { border-color:var(--primary); }
        .cs-trigger::after { content:'▼'; font-size:0.7rem; color:var(--text-muted); }
        .cs-trigger.disabled { pointer-events: none; opacity: 0.6; background: var(--primary-soft); }
        .cs-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:var(--card-solid); border:1.5px solid var(--primary); border-radius:10px; z-index:100; display:none; box-shadow:var(--shadow-md); overflow:hidden; }
        .cs-wrapper.open .cs-dropdown { display:block; }
        
        .cs-search-box { padding:8px; border-bottom:1px solid var(--border); background:var(--card-alt); }
        .cs-search-input { width:100%; padding:8px 10px; border:1.5px solid var(--border); border-radius:8px; font-family:inherit; font-size:0.8rem; outline:none; }
        .cs-search-input:focus { border-color:var(--primary); }
        
        .cs-options { list-style:none; margin:0; padding:0; max-height:200px; overflow-y:auto; }
        .cs-options li { padding:10px 12px; font-size:0.82rem; cursor:pointer; border-bottom:1px solid var(--border); transition:background 0.15s; }
        .cs-options li:last-child { border-bottom:none; }
        .cs-options li:hover { background:var(--primary-soft); color:var(--primary-dark); }
        .cs-options li.selected { background:var(--primary-light); font-weight:800; color:var(--primary-dark); }
        .cs-options li.empty { text-align:center; color:var(--text-muted); font-size:0.75rem; cursor:default; }
    `;
    document.head.appendChild(s);
})();

if (!window._csGlobalListenerAdded) {
    window._csGlobalListenerAdded = true;
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.cs-wrapper')) {
            document.querySelectorAll('.cs-wrapper.open').forEach(function(el) {
                el.classList.remove('open');
            });
        }
    });
}

function createSearchableSelect(items, selectedValue, placeholder, onChange, disabled) {
    var wrap = document.createElement('div');
    wrap.className = 'cs-wrapper';

    var trigger = document.createElement('div');
    trigger.className = 'cs-trigger' + (disabled ? ' disabled' : '');
    var selItem = items.find(function(i) { return i.value === selectedValue; });
    trigger.textContent = selItem ? selItem.text : placeholder;
    wrap.appendChild(trigger);

    var dropdown = document.createElement('div');
    dropdown.className = 'cs-dropdown';

    var searchBox = document.createElement('div');
    searchBox.className = 'cs-search-box';
    var searchInp = document.createElement('input');
    searchInp.type = 'text';
    searchInp.className = 'cs-search-input';
    searchInp.placeholder = 'جستجو...';
    searchBox.appendChild(searchInp);
    dropdown.appendChild(searchBox);

    var list = document.createElement('ul');
    list.className = 'cs-options';
    dropdown.appendChild(list);
    wrap.appendChild(dropdown);

    function renderOptions(q) {
        list.innerHTML = '';
        q = (q || '').toLowerCase();
        var filtered = items.filter(function(i) { return !q || i.text.toLowerCase().indexOf(q) !== -1; });
        
        if (filtered.length === 0) {
            list.innerHTML = '<li class="empty">یافت نشد</li>';
            return;
        }
        
        filtered.forEach(function(i) {
            var li = document.createElement('li');
            li.textContent = i.text;
            if (i.value === selectedValue) li.className = 'selected';
            
            li.onclick = function(e) {
                e.stopPropagation();
                selectedValue = i.value;
                trigger.textContent = i.text;
                wrap.classList.remove('open');
                searchInp.value = '';
                renderOptions('');
                if (onChange) onChange(i.value);
            };
            list.appendChild(li);
        });
    }
    renderOptions('');

    if (!disabled) {
        trigger.addEventListener('click', function(e) {
            e.stopPropagation();
            var isOpen = wrap.classList.contains('open');
            document.querySelectorAll('.cs-wrapper.open').forEach(function(el) {
                if (el !== wrap) el.classList.remove('open');
            });
            if (!isOpen) {
                wrap.classList.add('open');
                setTimeout(function() { searchInp.focus(); }, 50);
            } else {
                wrap.classList.remove('open');
            }
        });
        
        searchInp.addEventListener('input', function() { renderOptions(this.value); });
    }

    return wrap;
}

/* ============================================================
   بخش ۳ — توابع کمکی مرتب‌سازی معین‌ها
   ============================================================ */
function sortAccountsByCode(arr) {
    return arr.slice().sort(function (a, b) {
        var ca = String(a.code || '');
        var cb = String(b.code || '');
        var pa = ca.split('-').map(function (x) { return parseInt(x, 10) || 0; });
        var pb = cb.split('-').map(function (x) { return parseInt(x, 10) || 0; });
        var n = Math.max(pa.length, pb.length);
        for (var i = 0; i < n; i++) {
            var va = pa[i] || 0;
            var vb = pb[i] || 0;
            if (va !== vb) return va - vb;
        }
        return ca.localeCompare(cb, 'fa');
    });
}

function getLeafAccountsSortedByCode() {
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    return sortAccountsByCode(leaves);
}

/* ============================================================
   بخش ۴ — نوار وضعیت سند
   ============================================================ */
function getOrCreateVoucherStatusBar() {
    var bar = document.getElementById('voucher-status-bar');
    if (bar) return bar;

    var card = document.getElementById('voucher-head-card');
    if (!card) return null;

    bar = document.createElement('div');
    bar.id = 'voucher-status-bar';
    bar.className = 'voucher-status-bar';
    bar.style.cssText =
        'display:none;margin-bottom:12px;padding:10px 14px;border-radius:12px;' +
        'font-weight:800;align-items:center;gap:10px;border:1px solid var(--border)';
    bar.innerHTML =
        '<span class="vsb-icon" style="font-size:1.1rem"></span>' +
        '<span class="vsb-text"></span>' +
        '<span class="vsb-id" style="font-size:.72rem;opacity:.7;margin-right:auto"></span>';
    card.insertBefore(bar, card.firstChild);
    return bar;
}

function setVoucherStatusBar(status, vId) {
    var bar = getOrCreateVoucherStatusBar();
    if (!bar) return;

    if (!status) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'flex';

    var icon = bar.querySelector('.vsb-icon');
    var text = bar.querySelector('.vsb-text');
    var idEl = bar.querySelector('.vsb-id');

    if (status === 'approved') {
        bar.style.background = 'linear-gradient(135deg,#d1fae5,#a7f3d0)';
        bar.style.color = '#065f46';
        bar.style.borderColor = '#059669';
        icon.textContent = '✅';
        text.textContent = 'سند تأیید شده';
    } else if (status === 'draft') {
        bar.style.background = 'linear-gradient(135deg,#fef3c7,#fde68a)';
        bar.style.color = '#92400e';
        bar.style.borderColor = '#f59e0b';
        icon.textContent = '📝';
        text.textContent = 'سند به‌عنوان پیش‌نویس ذخیره شد';
    } else if (status === 'dirty') {
        bar.style.background = 'linear-gradient(135deg,#dbeafe,#bfdbfe)';
        bar.style.color = '#1e40af';
        bar.style.borderColor = '#3b82f6';
        icon.textContent = '✏️';
        text.textContent = 'سند در حال ویرایش — ذخیره نشده';
    }

    idEl.textContent = vId ? ('شناسه: ' + String(vId).substring(0, 8)) : '';
}

/* ============================================================
   بخش ۵ — شماره‌گذاری خودکار سند
   ============================================================ */
function getNextVoucherNumberForPeriod(periodId) {
    var vouchers = DB.load('vouchers', []);
    var pid = periodId || '';
    var filtered = vouchers.filter(function (v) { return (v.periodId || '') === pid; });
    var maxN = 0;
    filtered.forEach(function (v) {
        var n = parseInt(normalizeDigits(String(v.number || '0')).replace(/\D/g, '')) || 0;
        if (n > maxN) maxN = n;
    });
    return String(maxN + 1);
}

/* ============================================================
   بخش ۶ — اعتبارسنجی تاریخ
   ============================================================ */
function validateDateInActivePeriod(dateStr) {
    if (!dateStr) return { ok: false, msg: 'تاریخ خالی است' };
    var periods = DB.load('fiscalPeriods', []);
    if (!state.activePeriodId) return { ok: true };

    var ap = periods.find(function (p) { return p.id === state.activePeriodId; });
    if (!ap) return { ok: true };

    if (dateStr < ap.from || dateStr > ap.to) {
        return {
            ok: false,
            msg: 'تاریخ باید در بازه دوره فعال («' + ap.from + ' تا ' + ap.to + '») باشد'
        };
    }
    return { ok: true };
}

/* ============================================================
   بخش ۷ — مبلغ کل سند و بررسی مشکلات
   ============================================================ */
function getVoucherAmount(v) {
    var t = 0;
    (v.lines || []).forEach(function (l) { t += Number(l.debit) || 0; });
   
