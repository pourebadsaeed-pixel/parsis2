/* ============================================================
   پارسیس — گزارش مرور حساب‌ها
   مسیر: js/modules/reports/account.js
   وابستگی: core/* + ui/* + vouchers/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — state
   ============================================================ */
var _AR = {
    activeLevel: 1,
    path: [],
    selectedId: null
};

var _AR_LEVELS = { 1: 'گروه', 2: 'کل', 3: 'معین', 4: 'تفصیل' };

/* ============================================================
   بخش ۲ — CSS
   ============================================================ */
(function injectARStyle() {
    if (document.getElementById('ar-final-style')) return;
    var s = document.createElement('style');
    s.id = 'ar-final-style';
    s.textContent = ''
    + '.ar-wrap { background:var(--card-solid); border-radius:14px; border:1px solid var(--border); overflow:hidden; direction:rtl }'
    + '.ar-tb { display:flex; align-items:center; gap:10px; padding:10px 14px; '
    +   'background:linear-gradient(180deg,#e8f0fb,#f4f8fd); border-bottom:1px solid var(--border) }'
    + '.ar-tb-title { flex:1; text-align:center; font-weight:900; color:#1e40af; font-size:.88rem }'
    + '.ar-tb-bc { font-size:.8rem; color:#64748b }'
    + '.ar-tb-bc a { color:#1e40af; text-decoration:none; cursor:pointer; border-bottom:1px dashed #93c5fd; padding:0 2px }'
    + '.ar-tb-bc a:hover { background:#dbeafe }'
    + '.ar-tb-bc .sep { color:#cbd5e1; margin:0 4px }'
    + '.ar-main { display:flex; min-height:460px }'
    + '.ar-side { width:170px; flex-shrink:0; border-left:1px solid var(--border); background:#f7fafd; display:flex; flex-direction:column }'
    + '.ar-side-head { padding:11px 14px; font-weight:900; color:#1e40af; font-size:.8rem; '
    +   'background:linear-gradient(180deg,#dbe7f6,#c8dcef); border-bottom:1px solid var(--border); text-align:center }'
    + '.ar-levels { padding:10px; display:flex; flex-direction:column; gap:6px; overflow-y:auto }'
    + '.ar-lvl { position:relative; padding:12px 14px; border-radius:12px; text-align:center; '
    +   'font-size:.86rem; font-weight:800; color:#334155; background:#fff; '
    +   'border:1.5px solid #e0ecf8; cursor:pointer; user-select:none; transition:all .2s }'
    + '.ar-lvl.disabled { opacity:.35; cursor:not-allowed }'
    + '.ar-lvl.clickable { border-color:#3b82f6; color:#1e40af; background:linear-gradient(135deg,#dbeafe,#eff6ff) }'
    + '.ar-lvl.clickable.next { animation:arPulse 1.6s ease-in-out infinite }'
    + '.ar-lvl.clickable:hover { transform:scale(1.03) }'
    + '.ar-lvl.active { background:linear-gradient(135deg,#1e40af,#1e3a8a); color:#fff; '
    +   'border-color:#1e40af; box-shadow:0 4px 14px rgba(30,64,175,.35); transform:scale(1.05) }'
    + '@keyframes arPulse { 0%,100% { box-shadow:0 0 0 0 rgba(59,130,246,.5) } 50% { box-shadow:0 0 0 8px rgba(59,130,246,0) } }'
    + '.ar-body { flex:1; min-width:0; display:flex; flex-direction:column; background:var(--card-solid) }'
    + '.ar-toolbar { margin:0 !important; border-radius:0 !important; border-bottom:1px solid var(--border) !important; '
    +   'padding:8px 12px !important; box-shadow:none !important }'
    + '.ar-tw { overflow:auto; max-height:64vh; background:var(--card-solid); flex:1 }'
    + '.ar-tbl { width:100%; border-collapse:collapse; font-size:.85rem }'
    + '.ar-tbl thead th { background:linear-gradient(180deg,#dce8f5,#c8dcef); color:#1e40af; '
    +   'padding:11px 12px; text-align:center; font-weight:900; font-size:.8rem; '
    +   'border:1px solid #b9cfe5; white-space:nowrap; position:sticky; top:0; z-index:3 }'
    + '.ar-tbl thead th.ar-th-name { text-align:right; padding-right:16px }'
    + '.ar-tbl tbody td { padding:9px 12px; border:1px solid #dbe6f1; white-space:nowrap }'
    + '.ar-tbl tbody tr { cursor:pointer; transition:background .15s }'
    + '.ar-tbl tbody tr:hover { background:#f0f6ff !important }'
    + '.ar-tbl tbody tr.selected { background:#ffe9b3 !important; box-shadow:inset 0 0 0 2px #e8a33d }'
    + '.ar-tbl .ar-code { font-family:monospace; direction:ltr; font-weight:800; color:#1e40af; text-align:center; '
    +   'display:flex; align-items:center; justify-content:center; gap:6px }'
    + '.ar-tbl .ar-name { text-align:right; font-weight:700; padding-right:16px !important }'
    + '.ar-tbl .ar-num { text-align:center; direction:ltr; font-variant-numeric:tabular-nums; font-weight:800 }'
    + '.ar-tbl .ar-num.zero { color:#cbd5e1; font-weight:500 }'
    + '.ar-tbl .ar-num.md { color:#059669 }'
    + '.ar-tbl .ar-num.mc { color:#dc2626 }'
    + '.ar-tbl .ar-badge { display:inline-block; font-size:.62rem; padding:1px 8px; '
    +   'border-radius:8px; margin-right:8px; font-weight:800; vertical-align:middle }'
    + '.ar-badge.b1 { background:#c7d2fe; color:#3730a3 }'
    + '.ar-badge.b2 { background:#bbf7d0; color:#065f46 }'
    + '.ar-badge.b3 { background:#fde68a; color:#92400e }'
    + '.ar-badge.b4 { background:#e2e8f0; color:#475569 }'
    + '.ar-tbl tfoot td { background:linear-gradient(180deg,#dce8f5,#c8dcef); color:#1e40af; '
    +   'padding:12px; font-weight:900; text-align:center; border:1px solid #b9cfe5; '
    +   'position:sticky; bottom:0; z-index:3 }'
    + '.ar-empty { padding:40px 20px; text-align:center; color:#94a3b8; font-size:.9rem }'
    + '.ar-turnover-btn { display:inline-flex; align-items:center; justify-content:center; '
    +   'width:26px; height:26px; border-radius:6px; background:#dbeafe; color:#1e40af; '
    +   'border:1px solid #93c5fd; cursor:pointer; font-size:.85rem; padding:0; '
    +   'transition:all .15s; flex-shrink:0; font-family:inherit; line-height:1 }'
    + '.ar-turnover-btn:hover { background:#1e40af; color:#fff; transform:scale(1.15); '
    +   'box-shadow:0 2px 8px rgba(30,64,175,.4) }'
    + '@media (max-width:720px) {'
    +   '.ar-main { flex-direction:column }'
    +   '.ar-side { width:100%; border-left:none; border-bottom:1px solid var(--border) }'
    +   '.ar-levels { flex-direction:row; flex-wrap:wrap; padding:8px; gap:6px }'
    +   '.ar-lvl { flex:1; min-width:80px; padding:9px 8px; font-size:.78rem }'
    + '}'
    + '#ra-clean-panel { margin-bottom:12px; background:var(--card-solid); border:1px solid var(--border); border-radius:14px; overflow:hidden }'
    + '#ra-clean-head { display:flex; align-items:center; gap:10px; padding:12px 16px; '
    +   'background:linear-gradient(180deg,#e8f0fb,#f4f8fd); cursor:pointer; user-select:none }'
    + '#ra-clean-head .rch-icon { font-size:1rem }'
    + '#ra-clean-head .rch-title { flex:1; font-weight:900; color:#1e40af; font-size:.9rem }'
    + '#ra-clean-head .rch-arrow { font-size:.75rem; color:#1e40af; transition:transform .25s }'
    + '#ra-clean-head.open .rch-arrow { transform:rotate(180deg) }'
    + '#ra-clean-body { padding:14px 16px; border-top:1px solid var(--border) }'
    + '#ra-clean-body.hidden { display:none }'
    + '#ra-acc-table.w-col-resized thead th[data-orig-index] { overflow:hidden; text-overflow:ellipsis }'
    + '.ar-turnover-actions { display:flex; gap:4px; justify-content:center }'
    + '.ar-turnover-actions .row-btn { padding:5px 9px; border-radius:7px; font-size:.85rem }'
    + '.ar-link-badge { display:inline-block; padding:2px 8px; border-radius:8px; font-size:.62rem; '
    +   'font-weight:800; margin-right:6px; background:#dbeafe; color:#1e40af; vertical-align:middle }';
    document.head.appendChild(s);
})();

/* ============================================================
   بخش ۳ — بازسازی پنل فیلتر
   ============================================================ */
function rebuildAccountFilterPanel() {
    var page = document.getElementById('page-report-account');
    if (!page) return;
    if (document.getElementById('ra-clean-panel')) return;

    var firstCard = page.querySelector('.card');
    if (!firstCard) return;

    var oldV = {
        from:   (document.getElementById('ra-from') || {}).value || '',
        to:     (document.getElementById('ra-to') || {}).value || '',
        vtype:  (document.getElementById('ra-vtype') || {}).value || '',
        cat:    (document.getElementById('ra-cat') || {}).value || '',
        nature: (document.getElementById('ra-nature') || {}).value || '',
        onlyBal: (document.getElementById('ra-only-balance') || {}).checked || false
    };

    firstCard.innerHTML = '';

    if (!document.getElementById('ra-period')) {
        var hp = document.createElement('input');
        hp.type = 'hidden';
        hp.id = 'ra-period';
        hp.value = '';
        document.body.appendChild(hp);
    }
    if (!document.getElementById('ra-level')) {
        var hl = document.createElement('input');
        hl.type = 'hidden';
        hl.id = 'ra-level';
        hl.value = '3';
        document.body.appendChild(hl);
    }

    var panel = document.createElement('div');
    panel.id = 'ra-clean-panel';
    panel.innerHTML = ''
        + '<div id="ra-clean-head" class="open">'
        +   '<span class="rch-icon">🔍</span>'
        +   '<span class="rch-title">فیلترها</span>'
        +   '<span class="rch-arrow">▼</span>'
        + '</div>'
        + '<div id="ra-clean-body">'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>از تاریخ</label><input type="text" id="ra-from" class="date-picker" dir="ltr" value="' + esc(oldV.from) + '"></div>'
        +     '<div class="field"><label>تا تاریخ</label><input type="text" id="ra-to" class="date-picker" dir="ltr" value="' + esc(oldV.to) + '"></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع حساب</label><select id="ra-cat">'
        +       '<option value="">همه</option>'
        +       '<option value="permanent"' + (oldV.cat === 'permanent' ? ' selected' : '') + '>دائمی</option>'
        +       '<option value="temporary"' + (oldV.cat === 'temporary' ? ' selected' : '') + '>موقت</option>'
        +     '</select></div>'
        +     '<div class="field"><label>ماهیت</label><select id="ra-nature">'
        +       '<option value="">همه</option>'
        +       '<option value="debit"' + (oldV.nature === 'debit' ? ' selected' : '') + '>بدهکار</option>'
        +       '<option value="credit"' + (oldV.nature === 'credit' ? ' selected' : '') + '>بستانکار</option>'
        +     '</select></div>'
        +   '</div>'
        +   '<div class="grid-2">'
        +     '<div class="field"><label>نوع سند</label><select id="ra-vtype">'
        +       '<option value="">همه</option>'
        +       '<option value="general"' + (oldV.vtype === 'general' ? ' selected' : '') + '>عمومی</option>'
        +       '<option value="opening"' + (oldV.vtype === 'opening' ? ' selected' : '') + '>افتتاحیه</option>'
        +       '<option value="establishment"' + (oldV.vtype === 'establishment' ? ' selected' : '') + '>افتتاحیه استقرار</option>'
        +       '<option value="closing"' + (oldV.vtype === 'closing' ? ' selected' : '') + '>بستن حساب</option>'
        +       '<option value="final"' + (oldV.vtype === 'final' ? ' selected' : '') + '>اختتامیه</option>'
        +     '</select></div>'
        +     '<div class="field" style="display:flex; align-items:flex-end">'
        +       '<label class="checkbox-item" style="margin:0; padding:11px 14px; background:#eaf4fd; border:1.5px solid #93c5fd; border-radius:12px; width:100%">'
        +         '<input type="checkbox" id="ra-only-balance"' + (oldV.onlyBal ? ' checked' : '') + '> '
        +         '<span style="font-weight:800; color:#1e40af">✔ فقط حساب‌های دارای مانده</span>'
        +       '</label>'
        +     '</div>'
        +   '</div>'
        +   '<div class="form-buttons" style="margin-top:14px">'
        +     '<button id="ra-run" class="btn-primary">🔍 اجرا</button>'
        +     '<button id="ra-print" class="btn-secondary">🖨 چاپ</button>'
        +     '<button id="ra-export" class="btn-secondary">📊 اکسل</button>'
        +   '</div>'
        + '</div>';
    firstCard.appendChild(panel);

    document.getElementById('ra-clean-head').addEventListener('click', function () {
        var body = document.getElementById('ra-clean-body');
        var isHidden = body.classList.toggle('hidden');
        this.classList.toggle('open', !isHidden);
    });
    document.getElementById('ra-run').addEventListener('click', function () {
        _AR = { activeLevel: 1, path: [], selectedId: null };
        renderAccountReview();
    });
    document.getElementById('ra-print').addEventListener('click', function () {
        if (typeof printHtmlReport === 'function') printHtmlReport('#ra-result', 'مرور حساب‌ها');
    });
    document.getElementById('ra-export').addEventListener('click', function () {
        if (typeof exportReportTable === 'function') exportReportTable('#ra-result', 'account-report');
    });
    document.getElementById('ra-only-balance').addEventListener('change', function () {
        renderAccountReview();
    });

    if (typeof attachDatePickers === 'function') attachDatePickers();
}

/* ============================================================
   بخش ۴ — کمکی
   ============================================================ */
function _arLevel(acc, all) {
    var lvl = 1;
    var cur = acc;
    while (cur && cur.parent) {
        lvl++;
        cur = all.find(function (a) { return a.id === cur.parent; });
    }
    return lvl;
}

function _arBreadcrumb(path, all) {
    if (!path || path.length === 0) return '<a data-goto-lvl="1">گروه</a>';
    var html = '<a data-goto-lvl="1">گروه</a>';
    path.forEach(function (pid) {
        var acc = all.find(function (a) { return a.id === pid; });
        if (!acc) return;
        html += '<span class="sep">›</span><a data-goto="' + pid + '">' + esc(acc.name) + '</a>';
    });
    return html;
}

function _arLevelState(lvl) {
    if (lvl === _AR.activeLevel) return 'active';
    if (lvl === _AR.activeLevel + 1 && _AR.selectedId) return 'next';
    if (lvl < _AR.activeLevel) {
        if (lvl === 1) return 'clickable';
        if (lvl === 2) return 'clickable';
        if (lvl === 3) return _AR.path.length >= 1 ? 'clickable' : 'disabled';
        if (lvl === 4) return _AR.path.length >= 2 ? 'clickable' : 'disabled';
    }
    return 'disabled';
}

/* ============================================================
   بخش ۵ — توابع محاسبه
   ============================================================ */
function filterVouchers(opts) {
    var l = DB.load('vouchers', []);
    return l.filter(function (v) {
        if (v.status !== 'approved') return false;
        if (opts.from && v.date < opts.from) return false;
        if (opts.to && v.date > opts.to) return false;
        if (opts.vtype && v.type !== opts.vtype) return false;
        if (opts.periodId && v.periodId !== opts.periodId) return false;
        return true;
    });
}

function computeAccountBalances(opts) {
    var vouchers = filterVouchers(opts);
    var accounts = DB.load('accounts', []);
    var balances = {};
    accounts.forEach(function (a) { balances[a.id] = { debit: 0, credit: 0 }; });

    vouchers.forEach(function (v) {
        v.lines.forEach(function (line) {
            if (!line.account) return;
            var acc = accounts.find(function (a) { return a.id === line.account; });
            if (!acc) return;
            if (opts.cat && acc.cat !== opts.cat) return;
            if (opts.nature && acc.nature !== opts.nature) return;
            if (!balances[acc.id]) balances[acc.id] = { debit: 0, credit: 0 };
            balances[acc.id].debit += Number(line.debit) || 0;
            balances[acc.id].credit += Number(line.credit) || 0;
        });
    });

    var db = {};
    if (opts.level === 4) {
        vouchers.forEach(function (v) {
            v.lines.forEach(function (line) {
                if (!line.account || !line.details) return;
                var acc = accounts.find(function (a) { return a.id === line.account; });
                if (!acc) return;
                if (opts.cat && acc.cat !== opts.cat) return;
                if (opts.nature && acc.nature !== opts.nature) return;
                Object.keys(line.details).forEach(function (lt) {
                    var did = line.details[lt];
                    if (!did) return;
                    var key = acc.id + '::' + lt + '::' + did;
                    if (!db[key]) {
                        db[key] = {
                            id: did,
                            linkType: lt,
                            parent: acc.id,
                            debit: 0,
                            credit: 0
                        };
                    }
                    db[key].debit += Number(line.debit) || 0;
                    db[key].credit += Number(line.credit) || 0;
                });
            });
        });
    }
    return { balances: balances, detailBalances: db };
}

function rollupBalances(accounts, balances) {
    var rolled = {}, idMap = {};
    accounts.forEach(function (a) {
        idMap[a.id] = a;
        rolled[a.id] = {
            debit: balances[a.id] ? balances[a.id].debit : 0,
            credit: balances[a.id] ? balances[a.id].credit : 0
        };
    });

    function depth(acc) {
        var d = 0;
        var cur = acc;
        while (cur && cur.parent) {
            d++;
            cur = idMap[cur.parent];
        }
        return d;
    }

    var sorted = accounts.slice().sort(function (a, b) { return depth(b) - depth(a); });
    sorted.forEach(function (a) {
        if (a.parent && rolled[a.parent]) {
            rolled[a.parent].debit += rolled[a.id].debit;
            rolled[a.parent].credit += rolled[a.id].credit;
        }
    });
    return rolled;
}

function getRootAccountId(accId, accounts) {
    var acc = accounts.find(function (a) { return a.id === accId; });
    if (!acc) return '';
    while (acc.parent) {
        acc = accounts.find(function (a) { return a.id === acc.parent; });
        if (!acc) break;
    }
    return acc ? acc.id : '';
}

function getDescendantIds(accountId) {
    var accounts = DB.load('accounts', []);
    var result = [accountId];
    var queue = [accountId];
    while (queue.length > 0) {
        var cur = queue.shift();
        accounts.forEach(function (a) {
            if (a.parent === cur) {
                result.push(a.id);
                queue.push(a.id);
            }
        });
    }
    return result;
}

function getPeriodMonthRange() {
    var d = new Date();
    var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    var y = j[0], m = j[1];
    var from = y + '/' + pad2(m) + '/01';
    var to = y + '/' + pad2(m) + '/' + pad2(daysInJalaliMonth(y, m));
    return { from: from, to: to, year: y, month: m };
}

function refreshReportPeriodSelects() {
    var ps = DB.load('fiscalPeriods', []);
    ['ra-period', 'rt-period', 'ri-period'].forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        var v = sel.value;
        sel.innerHTML = '<option value="">همه</option>';
        for (var i = 0; i < ps.length; i++) {
            var o = document.createElement('option');
            o.value = ps[i].id;
            o.textContent = ps[i].title;
            sel.appendChild(o);
        }
        sel.value = v;
    });
}

/* ============================================================
   بخش ۶ — رندر گزارش مرور حساب‌ها
   ✅ حذف نوار بالای جدول (list-header ar-toolbar)
   ============================================================ */
function renderAccountReview() {
    var box = document.getElementById('ra-result');
    if (!box) return;

    var accounts = DB.load('accounts', []);
    var opts = {
        from:     (document.getElementById('ra-from') || {}).value || '',
        to:       (document.getElementById('ra-to') || {}).value || '',
        vtype:    (document.getElementById('ra-vtype') || {}).value || '',
        cat:      (document.getElementById('ra-cat') || {}).value || '',
        nature:   (document.getElementById('ra-nature') || {}).value || '',
        level:    4
    };

    var cb = document.getElementById('ra-only-balance');
    var filterBal = cb && cb.checked;
    var hide = getHideState('ra');

    var result = computeAccountBalances(opts);
    var rolled = rollupBalances(accounts, result.balances);
    var detailBals = result.detailBalances || {};

    var parentId = null;
    if (_AR.activeLevel === 2) parentId = _AR.path[0] || null;
    else if (_AR.activeLevel === 3) parentId = _AR.path[1] || null;
    else if (_AR.activeLevel === 4) parentId = _AR.path[2] || null;

    var list = [];
    if (_AR.activeLevel <= 3) {
        accounts.forEach(function (a) {
            if (_arLevel(a, accounts) !== _AR.activeLevel) return;
            if (_AR.activeLevel === 1) {
                if (a.parent) return;
            } else if (parentId) {
                if (a.parent !== parentId) return;
            }
            list.push(a);
        });
    } else {
        Object.keys(detailBals).forEach(function (key) {
            var d = detailBals[key];
            if (parentId && d.parent !== parentId) return;
            list.push({
                id: d.id,
                isDetail: true,
                linkType: d.linkType,
                parentId: d.parent,
                name: getDetailLabel(d.linkType, d.id),
                code: '',
                debit: d.debit,
                credit: d.credit
            });
        });

        list.sort(function (a, b) {
            if (a.linkType !== b.linkType) {
                return String(a.linkType).localeCompare(String(b.linkType));
            }
            return String(a.name || '').localeCompare(String(b.name || ''), 'fa');
        });
    }

    var tD = 0, tC = 0, tMD = 0, tMC = 0, shown = 0;

    var html = '<div class="ar-wrap">';
    html += '<div class="ar-tb">';
    html += '<div class="ar-tb-title">گزارش مرور حساب‌ها</div>';
    html += '<div class="ar-tb-bc">' + _arBreadcrumb(_AR.path, accounts) + '</div>';
    html += '</div>';

    html += '<div class="ar-main">';

    /* ساید سطح‌ها */
    html += '<div class="ar-side">';
    html += '<div class="ar-side-head">سطوح حساب</div>';
    html += '<div class="ar-levels">';
    [1, 2, 3, 4].forEach(function (lvl) {
        var cls = 'ar-lvl';
        var state = _arLevelState(lvl);
        if (state === 'active') cls += ' active';
        else if (state === 'next') cls += ' clickable next';
        else if (state === 'clickable') cls += ' clickable';
        else cls += ' disabled';
        html += '<div class="' + cls + '" data-lvl="' + lvl + '">' + _AR_LEVELS[lvl] + '</div>';
    });
    html += '</div></div>';

    /* بدنه — بدون list-header */
    html += '<div class="ar-body">';
    html += '<div class="ar-tw">';
    html += '<table class="ar-tbl" id="ra-acc-table" data-table-id="ra-acc-table">';
    html += '<thead><tr>';
    html += '<th style="width:150px" data-orig-index="0">کد و گردش</th>';
    html += '<th class="ar-th-name" data-orig-index="1">عنوان</th>';
    html += '<th style="width:170px" data-orig-index="2">گردش بدهکار</th>';
    html += '<th style="width:170px" data-orig-index="3">گردش بستانکار</th>';
    html += '<th style="width:170px" data-orig-index="4">مانده بدهکار</th>';
    html += '<th style="width:170px" data-orig-index="5">مانده بستانکار</th>';
    html += '</tr></thead><tbody>';

    list.forEach(function (a) {
        var b;
        if (a.isDetail) {
            b = { debit: Number(a.debit) || 0, credit: Number(a.credit) || 0 };
        } else {
            b = rolled[a.id] || { debit: 0, credit: 0 };
        }

        if (filterBal) {
            var netCheck = (Number(b.debit) || 0) - (Number(b.credit) || 0);
            if (Math.abs(netCheck) < 0.5) return;
        }

        var net = b.debit - b.credit;
        var md = net > 0 ? net : 0;
        var mc = net < 0 ? -net : 0;

        var rowCls = 'ar-row' + (a.id === _AR.selectedId ? ' selected' : '');
        var badgeCls = 'b' + Math.min(_AR.activeLevel, 4);
        var lvlName = _AR_LEVELS[_AR.activeLevel];

        var turnoverAcc = a.isDetail ? a.parentId : a.id;
        var turnoverDetailAttr = a.isDetail
            ? ' data-turnover-detail="' + a.id + '" data-turnover-link="' + a.linkType + '"'
            : '';

        html += '<tr class="' + rowCls + '" '
             +  'data-id="' + (a.isDetail ? '' : a.id) + '" '
             +  (a.isDetail ? 'data-detail-id="' + a.id + '" data-parent-id="' + a.parentId + '" data-link="' + a.linkType + '"' : '')
             +  '>';

        html += '<td class="ar-code" data-orig-index="0">';
        html += '<button type="button" class="ar-turnover-btn" '
             +  'data-turnover-acc="' + turnoverAcc + '"'
             +  turnoverDetailAttr
             +  ' onclick="event.stopPropagation(); window._AR_openTurnover(this); return false;" '
             +  'title="نمایش گردش حساب">📊</button>';
        html += '<span>' + esc(a.code || '—') + '</span>';
        html += '</td>';

        var nameExtra = '';
        if (a.isDetail && a.linkType) {
            nameExtra = ' <span class="ar-link-badge">' + linkTypeName(a.linkType) + '</span>';
        } else if (!a.isDetail) {
            nameExtra = ' <span class="ar-badge ' + badgeCls + '">' + lvlName + '</span>';
        }

        html += '<td class="ar-name" data-orig-index="1">' + esc(a.name || '')
             +  nameExtra
             +  '</td>';
        html += '<td class="ar-num' + (b.debit ? '' : ' zero') + '" data-orig-index="2">' + (hide ? '—' : moneyHtml(b.debit)) + '</td>';
        html += '<td class="ar-num' + (b.credit ? '' : ' zero') + '" data-orig-index="3">' + (hide ? '—' : moneyHtml(b.credit)) + '</td>';
        html += '<td class="ar-num md' + (md ? '' : ' zero') + '" data-orig-index="4">' + (hide ? '—' : moneyHtml(md)) + '</td>';
        html += '<td class="ar-num mc' + (mc ? '' : ' zero') + '" data-orig-index="5">' + (hide ? '—' : moneyHtml(mc)) + '</td>';
        html += '</tr>';
        tD += b.debit; tC += b.credit; tMD += md; tMC += mc; shown++;
    });

    if (shown === 0) {
        html += '<tr><td colspan="6" class="ar-empty">'
             +  (filterBal ? 'هیچ حسابی با مانده در این سطح نیست.' : 'حسابی در این سطح نیست.')
             +  '</td></tr>';
    }

    html += '</tbody><tfoot><tr>';
    html += '<td data-orig-index="0"></td>';
    html += '<td style="text-align:right; padding-right:20px" data-orig-index="1">جمع کل</td>';
    html += '<td data-orig-index="2">' + (hide ? '—' : moneyHtml(tD)) + '</td>';
    html += '<td data-orig-index="3">' + (hide ? '—' : moneyHtml(tC)) + '</td>';
    html += '<td data-orig-index="4">' + (hide ? '—' : moneyHtml(tMD)) + '</td>';
    html += '<td data-orig-index="5">' + (hide ? '—' : moneyHtml(tMC)) + '</td>';
    html += '</tr></tfoot>';
    html += '</table></div>';
    html += '</div></div></div>';

    box.innerHTML = html;

    bindAccountReviewEvents(accounts, box);

    setTimeout(function () {
        if (typeof makeTableResizable === 'function') makeTableResizable(document.getElementById('ra-acc-table'));
        if (typeof applyColVisibility === 'function') applyColVisibility('ra-acc-table');
        if (typeof applyColumnOrder === 'function') applyColumnOrder('ra-acc-table');
        if (typeof applyColWidths === 'function') applyColWidths('ra-acc-table');
    }, 50);
}

/* ============================================================
   بخش ۷ — اتصالات داخلی گزارش
   ============================================================ */
function bindAccountReviewEvents(accounts, box) {
    box.querySelectorAll('.ar-lvl').forEach(function (el) {
        el.addEventListener('click', function () {
            if (this.classList.contains('disabled')) return;
            var lvl = Number(this.getAttribute('data-lvl'));
            if (lvl === _AR.activeLevel) return;

            if (lvl < _AR.activeLevel) {
                _AR.path = _AR.path.slice(0, lvl - 1);
            } else if (lvl === _AR.activeLevel + 1 && _AR.selectedId) {
                _AR.path[_AR.activeLevel - 1] = _AR.selectedId;
                _AR.path = _AR.path.slice(0, _AR.activeLevel);
            } else {
                return;
            }
            _AR.activeLevel = lvl;
            _AR.selectedId = null;
            renderAccountReview();
        });
    });

    box.querySelectorAll('[data-goto]').forEach(function (a) {
        a.addEventListener('click', function () {
            var id = this.getAttribute('data-goto');
            var idx = _AR.path.indexOf(id);
            if (idx >= 0) {
                _AR.path = _AR.path.slice(0, idx + 1);
                _AR.activeLevel = idx + 1;
            } else {
                _AR.path = [];
                _AR.activeLevel = 1;
            }
            _AR.selectedId = null;
            renderAccountReview();
        });
    });

    box.querySelectorAll('[data-goto-lvl]').forEach(function (a) {
        a.addEventListener('click', function () {
            _AR.path = [];
            _AR.activeLevel = 1;
            _AR.selectedId = null;
            renderAccountReview();
        });
    });

    box.querySelectorAll('.ar-row').forEach(function (tr) {
        tr.addEventListener('click', function (e) {
            if (e.target.closest && e.target.closest('.ar-turnover-btn')) return;
            if (e.target.classList && e.target.classList.contains('ar-turnover-btn')) return;

            var id = tr.getAttribute('data-id') || tr.getAttribute('data-detail-id');
            var isDetail = tr.hasAttribute('data-detail-id');
            _AR.selectedId = id;
            if (isDetail) {
                _AR.path[3] = id;
                _AR.path = _AR.path.slice(0, 4);
            } else {
                _AR.path[_AR.activeLevel - 1] = id;
                _AR.path = _AR.path.slice(0, _AR.activeLevel);
            }
            renderAccountReview();
        });
    });
}

/* ============================================================
   بخش ۸ — باز کردن گردش حساب
   ============================================================ */
window._AR_openTurnover = function (btn) {
    try {
        if (!btn) return;
        var accId = btn.getAttribute('data-turnover-acc');
        var detId = btn.getAttribute('data-turnover-detail');
        var link = btn.getAttribute('data-turnover-link');
        if (!accId) { alert('⚠️ شناسه حساب یافت نشد.'); return; }

        if (detId && link) {
            openAccountTurnover(accId, { linkType: link, detailId: detId });
        } else {
            openAccountTurnover(accId, null);
        }
    } catch (err) {
        console.error(err);
        alert('خطا در باز کردن گردش:\n' + (err.message || err));
    }
};

function openAccountTurnover(accountId, detailInfo) {
    var accounts = DB.load('accounts', []);
    var acc = accounts.find(function (a) { return a.id === accountId; });
    if (!acc) return;

    var ids = getDescendantIds(accountId);
    var fromD = (document.getElementById('ra-from') || {}).value || '';
    var toD = (document.getElementById('ra-to') || {}).value || '';
    var vtype = (document.getElementById('ra-vtype') || {}).value || '';
    var periodId = (document.getElementById('ra-period') || {}).value || '';
    var hide = getHideState('ra');

    var vouchers = DB.load('vouchers', []).filter(function (v) {
        if (v.status !== 'approved') return false;
        if (!v.date) return false;
        if (fromD && v.date < fromD) return false;
        if (toD && v.date > toD) return false;
        if (vtype && v.type !== vtype) return false;
        if (periodId && v.periodId !== periodId) return false;
        return true;
    });

    var rows = [];
    vouchers.forEach(function (v) {
        (v.lines || []).forEach(function (l) {
            if (!l.account || ids.indexOf(l.account) === -1) return;
            if (detailInfo) {
                if (!l.details || l.details[detailInfo.linkType] !== detailInfo.detailId) return;
            }
            rows.push({ voucher: v, line: l });
        });
    });

    rows.sort(function (a, b) {
        var c = compareVals(a.voucher.date, b.voucher.date);
        if (c !== 0) return c;
        return compareVals(a.voucher.number, b.voucher.number);
    });

    var title = '📊 گردش: ' + acc.name;
    if (detailInfo) {
        title += ' → ' + getDetailLabel(detailInfo.linkType, detailInfo.detailId);
    }
    document.getElementById('turnover-title').textContent = title;

    var body = document.getElementById('turnover-body');
    if (rows.length === 0) {
        body.innerHTML = '<p class="muted" style="text-align:center;padding:20px">گردشی در این بازه یافت نشد.</p>';
    } else {
        var html = '<div class="table-wrap"><table class="report-table turnover-table" id="turnover-table"><thead><tr>'
                 +  '<th style="width:50px">#</th>'
                 +  '<th style="width:100px">تاریخ</th>'
                 +  '<th style="width:80px">شماره</th>'
                 +  '<th style="min-width:140px">شرح سند</th>'
                 +  '<th style="min-width:140px">حساب</th>'
                 +  '<th style="min-width:140px">تفصیلی</th>'
                 +  '<th style="min-width:140px">شرح قلم</th>'
                 +  '<th style="width:120px">بدهکار</th>'
                 +  '<th style="width:120px">بستانکار</th>'
                 +  '<th style="width:120px">مانده</th>'
                 +  '<th style="width:110px">عملیات</th>'
                 +  '</tr></thead><tbody>';

        var runBal = 0;
        for (var i = 0; i < rows.length; i++) {
            var r = rows[i];
            var v = r.voucher;
            var l = r.line;
            var d = Number(l.debit) || 0;
            var c = Number(l.credit) || 0;
            runBal += d - c;

            var detailsStr = '';
            if (l.details) {
                Object.keys(l.details).forEach(function (lt) {
                    var did = l.details[lt];
                    if (did) {
                        if (detailsStr) detailsStr += ' ، ';
                        detailsStr += linkTypeName(lt) + ': ' + getDetailLabel(lt, did);
                    }
                });
            }

            var accLabel = getAccountLabel(l.account, accounts);
            var balText = runBal < 0
                ? '<span class="neg-money">(' + formatMoney(Math.abs(runBal)) + ')</span>'
                : formatMoney(runBal);

            html += '<tr><td class="num">' + toFa(i + 1) + '</td>'
                 +  '<td dir="ltr">' + toFa(esc(v.date)) + '</td>'
                 +  '<td dir="ltr">' + toFa(esc(v.number)) + '</td>'
                 +  '<td>' + esc(v.desc || '') + '</td>'
                 +  '<td>' + esc(accLabel) + '</td>'
                 +  '<td>' + (detailsStr ? esc(detailsStr) : '—') + '</td>'
                 +  '<td>' + esc(l.description || '') + '</td>'
                 +  '<td class="num dr">' + (hide ? '—' : (d ? formatMoney(d) : '—')) + '</td>'
                 +  '<td class="num cr">' + (hide ? '—' : (c ? formatMoney(c) : '—')) + '</td>'
                 +  '<td class="num" style="font-weight:bold">' + (hide ? '—' : balText) + '</td>'
                 +  '<td>'
                 +    '<div class="ar-turnover-actions">'
                 +      '<button class="row-btn open" data-vid="' + v.id + '" data-act="preview" title="مشاهده سند">👁</button>'
                 +      '<button class="row-btn edit" data-vid="' + v.id + '" data-act="edit" title="ویرایش سند">✎</button>'
                 +    '</div>'
                 +  '</td>'
                 +  '</tr>';
        }
        html += '</tbody></table></div>';
        body.innerHTML = html;

        body.querySelectorAll('[data-act="preview"]').forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var vid = this.getAttribute('data-vid');
                var v = findVoucherById(vid);
                if (v && typeof openVoucherPreview === 'function') openVoucherPreview(v);
            });
        });
        body.querySelectorAll('[data-act="edit"]').forEach(function (b) {
            b.addEventListener('click', function (e) {
                e.stopPropagation();
                var vid = this.getAttribute('data-vid');
                if (typeof openVoucherForEditById === 'function') {
                    closeTurnover();
                    setTimeout(function () { openVoucherForEditById(vid); }, 200);
                }
            });
        });

        setTimeout(function () {
            var t = document.getElementById('turnover-table');
            if (t && typeof makeTableResizable === 'function') {
                makeTableResizable(t);
            }
        }, 100);
    }

    document.getElementById('turnover-modal').classList.add('show');
    document.getElementById('turnover-overlay').classList.add('show');
    setTimeout(function () {
        if (typeof autoAttachReportHelpers === 'function') autoAttachReportHelpers();
    }, 50);
}

function closeTurnover() {
    document.getElementById('turnover-modal').classList.remove('show');
    document.getElementById('turnover-overlay').classList.remove('show');
}

/* ============================================================
   بخش ۹ — پچ goToPage
   ============================================================ */
(function initAccountReviewFinal() {
    function apply() {
        rebuildAccountFilterPanel();

        window.runAccountReport = function () {
            _AR = { activeLevel: 1, path: [], selectedId: null };
            renderAccountReview();
        };
        window._renderAccountReportTree = renderAccountReview;

        var page = document.getElementById('page-report-account');
        if (page) {
            var observer = new MutationObserver(function () {
                if (page.classList.contains('active')) {
                    var box = document.getElementById('ra-result');
                    if (box && !box.querySelector('.ar-wrap')) renderAccountReview();
                }
            });
            observer.observe(page, { attributes: true, attributeFilter: ['class'] });
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(apply, 2500); });
    } else {
        setTimeout(apply, 2500);
    }
})();

/* ============================================================
   صادرسازی
   ============================================================ */
window._AR                            = _AR;
window._AR_LEVELS                     = _AR_LEVELS;
window.rebuildAccountFilterPanel      = rebuildAccountFilterPanel;
window.renderAccountReview            = renderAccountReview;
window.bindAccountReviewEvents        = bindAccountReviewEvents;
window.computeAccountBalances         = computeAccountBalances;
window.rollupBalances                 = rollupBalances;
window.filterVouchers                 = filterVouchers;
window.getRootAccountId               = getRootAccountId;
window.getDescendantIds               = getDescendantIds;
window.getPeriodMonthRange            = getPeriodMonthRange;
window.refreshReportPeriodSelects     = refreshReportPeriodSelects;
window.openAccountTurnover            = openAccountTurnover;
window.closeTurnover                  = closeTurnover;

console.log('✅ [modules/reports/account.js] loaded — complete');
