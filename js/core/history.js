/* ============================================================
   پارسیس — موتور «تاریخچه تغییر وضعیت» (✅ v2.4.0)
   مسیر: js/core/history.js

   هر رکورد در هر فرم (شخص، شرکت، کاربر، سند حسابداری، خزانه، اموال،
   انبار، فروش و ...) هنگام ایجاد/ویرایش/حذف/تأیید یک ردیف تاریخچه می‌سازد:
     { id, st: نام مخزن, eid: شناسه رکورد, ttl: عنوان رکورد (لحظه ثبت),
       ts: زمان (epoch), u: نام کاربر انجام‌دهنده, act: نوع عملیات,
       ch: [ [نام فیلد, مقدار قبلی, مقدار جدید], ... ] }

   • تاریخچه در مخزن «history» ذخیره و مثل بقیه داده‌ها با ابر همگام می‌شود —
     پس همه دستگاه‌ها تاریخچه یکسانی می‌بینند.
   • سقف نگهداری: آخرین ۴۰۰۰ ردیف (قدیمی‌ترها خودکار حذف می‌شوند تا اپ سبک بماند).
   • نمایش: تب «🕘 تاریخچه تغییر وضعیت» داخل فرم‌ها + دکمه 🕘 کنار هر ردیف
     فهرست‌ها + پنجره اختصاصی (modal).
   • ترتیب نمایش: از جدید به قدیم، با نام کاربر و تاریخ و ساعت.
   ============================================================ */
'use strict';

var HIST_STORE_KEY = 'history';
var HIST_MAX = 4000;

/* برچسب فارسی هر مخزن داده */
var HIST_STORE_LABELS = {
    'persons':        'شخص',
    'companies':      'شرکت',
    'users':          'کاربر',
    'userGroups':     'گروه کاربران',
    'vouchers':       'سند حسابداری',
    'bankAccounts':   'حساب بانکی',
    'cashBoxes':      'صندوق',
    'projects':       'پروژه',
    'fiscalPeriods':  'دوره مالی',
    'facilities':     'تسهیلات',
    'voucherTemplates': 'الگوی سند',
    'stdDescs':       'شرح استاندارد',
    'notes':          'یادداشت',
    'phonebook':      'مخاطب دفترچه تلفن',
    'treasuryItems':  'دریافت/پرداخت خزانه',
    'assets':         'اموال و دارایی',
    'inventoryItems': 'کالای انبار',
    'inventoryMoves': 'حواله انبار',
    'salesInvoices':  'فاکتور فروش',
    'purchaseReqs':   'درخواست خرید',
    'purchaseOrders': 'سفارش خرید',
    'purchaseInvoices': 'فاکتور خرید',
    'purchaseReturns': 'برگشت از خرید',
    'stockRequests':  'درخواست کالا',
    'dailyEstimates': 'برآورد هزینه روزانه',
    'cashFlowSources': 'برآورد منابع دریافتنی'
};

/* برچسب فارسی فیلدهای هر مخزن (برای عبارت «نام فیلد: قبلی ← جدید») */
var HIST_FIELD_LABELS = {
    'persons': { first:'نام', last:'خانوادگی', father:'نام پدر', nationalId:'کد ملی', birth:'تاریخ تولد',
                 mobile:'موبایل', phone:'تلفن', email:'ایمیل', bankTitle:'عنوان حساب بانکی', acc:'شماره حساب',
                 iban:'شبا', card:'کارت', address:'آدرس', showInBirthdayWidget:'نمایش در ویجت تولدها' },
    'companies': { name:'نام', phone:'تلفن', email:'ایمیل', address:'آدرس' },
    'users': { username:'نام کاربری', personId:'شخص مرتبط', groupId:'گروه کاربری', isAdmin:'نقش سرپرست',
               active:'فعال', passHash:'کلمه عبور' },
    'userGroups': { name:'نام گروه', desc:'توضیح', active:'فعال' },
    'vouchers': { number:'شماره سند', date:'تاریخ', time:'ساعت', type:'نوع سند', desc:'شرح سند',
                  status:'وضعیت', periodId:'دوره مالی', lines:'ردیف‌های سند' },
    'bankAccounts': { bank:'نام بانک', type:'نوع حساب', branchCode:'کد شعبه', branchName:'نام شعبه',
                      account:'شماره حساب', iban:'شبا', card:'کارت', order:'ترتیب', minBalance:'حداقل موجودی',
                      showInWidget:'نمایش در ویجت' },
    'cashBoxes': { title:'عنوان', type:'نوع', balance:'موجودی' },
    'projects': { name:'نام', desc:'توضیح' },
    'fiscalPeriods': { title:'عنوان', from:'از تاریخ', to:'تا تاریخ', active:'فعال' },
    'facilities': { title:'عنوان', bankId:'بانک', amount:'مبلغ', date:'تاریخ', desc:'توضیح' },
    'voucherTemplates': { name:'نام الگو', desc:'شرح پیش‌فرض', lines:'ردیف‌های الگو' },
    'stdDescs': { text:'متن شرح' },
    'notes': { title:'عنوان', date:'تاریخ', content:'متن', category:'دسته', checklist:'چک‌لیست',
               imageRefs:'تصاویر', archived:'آرشیو شده', savedAt:'آخرین ذخیره' },
    'phonebook': { name:'نام', company:'شرکت', role:'سمت', mobile:'موبایل', phone:'تلفن', email:'ایمیل',
                   ext:'داخلی', orgUnit:'واحد سازمانی', note:'یادداشت' },
    'treasuryItems': { kind:'نوع (دریافت/پرداخت)', date:'تاریخ', accountId:'حساب', amount:'مبلغ',
                       personId:'شخص', desc:'شرح' },
    'assets': { name:'نام دارایی', group:'گروه', buyDate:'تاریخ خرید', buyAmount:'مبلغ خرید', loc:'محل استقرار',
                personId:'متولی', rate:'نرخ استهلاک سالانه (٪)', desc:'توضیح', status:'وضعیت',
                sellDate:'تاریخ فروش', sellAmount:'مبلغ فروش' },
    'inventoryItems': { code:'کد کالا', name:'نام کالا', unit:'واحد', group:'گروه کالا',
                        minQty:'حداقل موجودی', buyPrice:'فی خرید', sellPrice:'فی فروش', desc:'توضیح' },
    'inventoryMoves': { kind:'نوع حواله', date:'تاریخ', itemId:'کالا', qty:'تعداد', price:'فی',
                        refNo:'شماره مرجع', party:'طرف حساب', desc:'توضیح' },
    'salesInvoices': { no:'شماره فاکتور', date:'تاریخ', personId:'مشتری', lines:'اقلام فاکتور',
                       discount:'تخفیف', taxRate:'مالیات (٪)', paid:'مبلغ پرداخت‌شده', status:'وضعیت', desc:'توضیح' },
    'purchaseReqs': { no:'شماره درخواست', date:'تاریخ', requester:'درخواست‌کننده', personId:'شخص',
                      neededBy:'نیاز تا تاریخ', items:'اقلام', status:'وضعیت', desc:'توضیح' },
    'purchaseOrders': { no:'شماره سفارش', date:'تاریخ', supplier:'تامین‌کننده', deliveryDate:'تاریخ تحویل',
                        items:'اقلام', discount:'تخفیف', taxRate:'مالیات (٪)', status:'وضعیت', desc:'توضیح' },
    'purchaseInvoices': { no:'شماره فاکتور', date:'تاریخ', supplier:'تامین‌کننده', poId:'سفارش خرید',
                          items:'اقلام', discount:'تخفیف', taxRate:'مالیات (٪)', paid:'مبلغ پرداخت‌شده',
                          status:'وضعیت', desc:'توضیح' },
    'purchaseReturns': { no:'شماره برگشت', date:'تاریخ', supplier:'تامین‌کننده', pinvId:'فاکتور مرجع',
                         items:'اقلام', status:'وضعیت', desc:'توضیح' },
    'stockRequests': { no:'شماره درخواست', date:'تاریخ', requester:'درخواست‌کننده', personId:'شخص',
                       itemId:'کالا', qty:'تعداد', purpose:'هدف مصرف', status:'وضعیت', desc:'توضیح' },
    'dailyEstimates': { date:'تاریخ', items:'ردیف‌ها', desc:'توضیح' },
    'cashFlowSources': { date:'تاریخ', name:'عنوان', amount:'مبلغ', items:'ردیف‌ها', desc:'توضیح' }
};

/* ✅ v2.7.1 — کلیدهای سیستمی که در «تغییرات» گزارش نمی‌شوند */
var HIST_META_KEYS = {
    createdBy: 1, createdAt: 1, updatedBy: 1, updatedAt: 1,
    createdAtFa: 1, updatedAtFa: 1, savedAt: 1
};

var Hist = (function () {

    /* ---------- ابزار داخلی ---------- */

    function _now() { return Date.now(); }

    function _userName() {
        try {
            if (typeof state !== 'undefined' && state.currentUser && state.currentUser.username) {
                return state.currentUser.username;
            }
        } catch (e) {}
        return '—';
    }

    /* تاریخ + ساعت شمسی قابل نمایش از روی epoch */
    function _jalaliDateTime(ts) {
        try {
            var d = new Date(ts);
            var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
            function p2(x) { return (x < 10 ? '0' : '') + x; }
            return toFa(j[0] + '/' + p2(j[1]) + '/' + p2(j[2])) + ' — ' + toFa(p2(d.getHours()) + ':' + p2(d.getMinutes()));
        } catch (e) {
            return toFa(String(ts));
        }
    }

    /* نمایش مقدار فیلد در جمله تغییرات */
    function _showVal(v) {
        if (v === undefined || v === null || v === '') return '—';
        if (typeof v === 'boolean') return v ? '✓ بله' : '✗ خیر';
        if (Array.isArray(v)) return '(' + v.length + ' مورد)';
        var s = String(v);
        if (s.length > 60) s = s.slice(0, 58) + '…';
        return s;
    }

    /* آیا مقدار واقعاً عوض شده؟ */
    function _same(a, b) {
        if (a === b) return true;
        if (a === undefined && (b === '' || b === null)) return true;
        if (b === undefined && (a === '' || a === null)) return true;
        if (typeof a === 'number' && typeof b === 'string') return String(a) === b;
        if (typeof b === 'number' && typeof a === 'string') return String(b) === a;
        try { return JSON.stringify(a) === JSON.stringify(b); } catch (e) { return false; }
    }

    /* ---------- ساخت تغییرات ---------- */

    function diff(store, before, after) {
        var labels = HIST_FIELD_LABELS[store] || {};
        var keys = {};
        var out = [], i;
        if (before && typeof before === 'object') { for (i in before) keys[i] = 1; }
        if (after && typeof after === 'object') { for (i in after) keys[i] = 1; }
        /* salt/passHash جداگانه گزارش نمی‌شود (فقط «کلمه عبور» خلاصه)
           ✅ v2.7.1 — کلیدهای سیستمیِ ایجادکننده/تاریخ ایجاد هم از تغییرات حذف شدند */
        Object.keys(keys).forEach(function (k) {
            if (k === 'salt') return;
            if (k === 'id') return;
            if (HIST_META_KEYS[k]) return;
            var o = before ? before[k] : undefined;
            var n = after ? after[k] : undefined;
            if (_same(o, n)) return;
            if (k === 'passHash') { o = (o ? '***' : undefined); n = (n ? '***' : undefined); }
            var lbl = labels[k] || k;
            /* مقادیر شناسه‌ای که در فهرست‌ها برچسب دارند */
            if (k === 'personId' || k === 'party' || (store === 'salesInvoices' && k === 'personId')) n = _personName(n) || n, o = _personName(o) || o;
            if (k === 'itemId') { n = _itemName(n) || n; o = _itemName(o) || o; }
            if (k === 'accountId') { n = _accountName(n) || n; o = _accountName(o) || o; }
            if (k === 'bankId') { n = _bankName(n) || n; o = _bankName(o) || o; }
            out.push([lbl, _showVal(o), _showVal(n)]);
        });
        return out;
    }

    function _personName(id) {
        if (!id) return '';
        try {
            var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (p) return ((p.first || '') + ' ' + (p.last || '')).trim();
        } catch (e) {}
        return '';
    }
    function _itemName(id) {
        if (!id) return '';
        try {
            var it = (DB.load('inventoryItems', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (it) return it.name || it.code || '';
        } catch (e) {}
        return '';
    }
    function _accountName(accId) {
        if (!accId || typeof accId !== 'string') return '';
        var t = accId.charAt(0), id = accId.slice(2); /* ✅ پیشوند «b:» یا «c:» حذف می‌شود */
        try {
            if (t === 'b') {
                var b = (DB.load('bankAccounts', []) || []).filter(function (x) { return x && x.id === id; })[0];
                if (b) return '🏦 ' + (b.bank || '') + (b.branchName ? ' - ' + b.branchName : '');
            }
            if (t === 'c') {
                var c = (DB.load('cashBoxes', []) || []).filter(function (x) { return x && x.id === id; })[0];
                if (c) return '💰 ' + (c.title || '');
            }
        } catch (e) {}
        return '';
    }
    function _bankName(id) {
        if (!id) return '';
        try {
            var b = (DB.load('bankAccounts', []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (b) return (b.bank || '') + (b.branchName ? ' - ' + b.branchName : '');
        } catch (e) {}
        return '';
    }

    /* عنوان پیش‌فرض رکورد — برای نمایش در پنجره تاریخچه */
    function _entityTitle(store, rec) {
        if (!rec) return '';
        if (store === 'persons') return ((rec.first || '') + ' ' + (rec.last || '')).trim();
        if (store === 'vouchers') return 'سند شماره ' + (rec.number || '—');
        if (store === 'salesInvoices') return 'فاکتور ' + (rec.no || '—');
        if (store === 'users') return rec.username || '';
        return rec.name || rec.title || rec.code || rec.bank || '';
    }

    /* ---------- ثبت ---------- */

    /* act: 'ایجاد' | 'ویرایش' | 'حذف' | 'تأیید' | 'تغییر وضعیت' | رشته دلخواه */
    function log(store, id, act, before, after, titleOverride) {
        try {
            if (!store || !id) return;
            var ch = (act === 'حذف') ? [] : diff(store, before, after);
            if (act === 'ویرایش' && ch.length === 0) return; /* هیچ چیزی عوض نشده — ردیف بی‌مورد */
            var rec = before || after || {};
            var hist = DB.load(HIST_STORE_KEY, []);
            if (!Array.isArray(hist)) hist = [];

            /* ✅ v2.7.1 — درخواست کاربر: هنگام ثبت، نام ایجادکننده و تاریخ ایجاد روی
               خود رکورد هم ثبت می‌شود (در فرم/تاریخچه نمایش داده می‌شود)؛
               با هر تغییر داده/وضعیت هم آخرین ویرایش‌کننده و تاریخ بروز می‌شود.
               اکثر ماژول‌ها «همان آبجکت واقعی» را قبل از DB.save می‌فرستند؛
               پس تغییر روی after مستقیماً در رکورد ذخیره‌شده هم می‌ماند. */
            try {
                if (after && typeof after === 'object') {
                    var _isCreate = (String(act || '').indexOf('ایجاد') !== -1);
                    if (_isCreate) {
                        if (!after.createdBy) after.createdBy = _userName();
                        if (!after.createdAt) after.createdAt = _now();
                        delete after.updatedBy;
                        delete after.updatedAt;
                    } else if (act !== 'حذف') {
                        after.updatedBy = _userName();
                        after.updatedAt = _now();
                    }
                }
            } catch (eSt) {}

            hist.push({
                id: uid(),
                st: store,
                eid: id,
                ttl: String(titleOverride || _entityTitle(store, rec) || '—'),
                ts: _now(),
                u: _userName(),
                act: act,
                ch: ch
            });
            while (hist.length > HIST_MAX) hist.shift();
            DB.save(HIST_STORE_KEY, hist);
        } catch (e) {
            try { console.warn('[history] log failed', e); } catch (e2) {}
        }
    }

    /* نسخه سبک برای ثبت بدون diff (مثلاً حذف از فهرست) */
    function logSimple(store, id, act, title, extraNote) {
        try {
            if (!store || !id) return;
            var hist = DB.load(HIST_STORE_KEY, []);
            if (!Array.isArray(hist)) hist = [];
            var entry = {
                id: uid(), st: store, eid: id,
                ttl: String(title || '—'), ts: _now(), u: _userName(), act: act, ch: []
            };
            if (extraNote) entry.ch = [[extraNote, '', '']];
            hist.push(entry);
            while (hist.length > HIST_MAX) hist.shift();
            DB.save(HIST_STORE_KEY, hist);
        } catch (e) {}
    }

    /* ---------- خواندن ---------- */

    function forEntity(store, entityId) {
        var hist = DB.load(HIST_STORE_KEY, []);
        if (!Array.isArray(hist)) return [];
        var rows = hist.filter(function (h) { return h && h.st === store && h.eid === entityId; });
        /* ✅ جدید → قدیم؛ ردیف‌های هم‌زمان به ترتیب ثبت (آخرین آرایه = جدیدتر) */
        rows = rows.map(function (h, i) { return { h: h, i: i }; })
            .sort(function (a, b) { return (b.h.ts || 0) - (a.h.ts || 0) || b.i - a.i; })
            .map(function (x) { return x.h; });
        return rows;
    }

    function forStore(store) {
        var hist = DB.load(HIST_STORE_KEY, []);
        if (!Array.isArray(hist)) return [];
        var rows = hist.filter(function (h) { return h && h.st === store; });
        rows = rows.map(function (h, i) { return { h: h, i: i }; })
            .sort(function (a, b) { return (b.h.ts || 0) - (a.h.ts || 0) || b.i - a.i; })
            .map(function (x) { return x.h; });
        return rows;
    }

    /* ---------- رندر ---------- */

    function _actBadge(act) {
        var c = '#64748b', bg = '#f1f5f9';
        var s = String(act || '');
        if (s.indexOf('ایجاد') !== -1) { c = '#065f46'; bg = '#ecfdf5'; }
        else if (s.indexOf('ویرایش') !== -1 || s.indexOf('قیمت‌گذاری') !== -1) { c = '#92400e'; bg = '#fef3c7'; }
        else if (s.indexOf('حذف') !== -1 || s.indexOf('رد') !== -1) { c = '#991b1b'; bg = '#fef2f2'; }
        else if (s.indexOf('تأیید') !== -1 || s.indexOf('رسید') !== -1 || s.indexOf('صدور') !== -1) { c = '#1e40af'; bg = '#dbeafe'; }
        else if (s.indexOf('وضعیت') !== -1 || s.indexOf('تبدیل') !== -1) { c = '#5b21b6'; bg = '#f3e8ff'; }
        return '<span style="display:inline-block;background:' + bg + ';color:' + c
            + ';border-radius:99px;padding:2px 10px;font-size:.68rem;font-weight:800">' + esc(act || '—') + '</span>';
    }

    /* ✅ v2.7.1 — نوار متای رکورد: نام ایجادکننده + تاریخ ایجاد (از خود رکورد،
       با fallback به اولین ردیف «ایجاد» در تاریخچه) + آخرین ویرایش */
    function _metaHtml(store, entityId, rows) {
        var rec = null;
        try {
            rec = (DB.load(store, []) || []).filter(function (x) { return x && x.id === entityId; })[0] || null;
        } catch (e0) {}
        var creator = '', created = 0, updBy = '', updAt = 0;
        if (rec) {
            creator = rec.createdBy || '';
            created = rec.createdAt || 0;
            updBy = rec.updatedBy || '';
            updAt = rec.updatedAt || 0;
        }
        if (!creator && rows && rows.length) {
            for (var i = rows.length - 1; i >= 0; i--) {
                if (rows[i] && String(rows[i].act || '').indexOf('ایجاد') !== -1) {
                    creator = rows[i].u || '';
                    created = rows[i].ts || 0;
                    break;
                }
            }
        }
        if (!creator && !created) return '';
        var html = '<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:7px 10px;margin-bottom:8px;font-size:.7rem;color:#14532d">'
            + '<b>📌 ایجاد:</b> 👤 ' + esc(creator || '—') + ' — 🕘 ' + (created ? _jalaliDateTime(created) : '—');
        if (updBy && updAt) {
            html += '<span style="color:#166534">| آخرین تغییر: 👤 ' + esc(updBy) + ' — 🕘 ' + _jalaliDateTime(updAt) + '</span>';
        }
        html += '</div>';
        return html;
    }

    function rowsHtml(store, entityId, opts) {
        opts = opts || {};
        var rows = entityId ? forEntity(store, entityId) : forStore(store);
        var out = '';
        if (!rows.length) {
            return '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:.78rem">هنوز تاریخچه‌ای برای این مورد ثبت نشده است — به‌محض ایجاد یا ویرایش، اینجا ثبت می‌شود.</div>';
        }
        /* ✅ v2.7.1 — نام ایجادکننده و تاریخ ایجاد همیشه بالای تاریخچه نمایش داده می‌شود */
        if (entityId) out += _metaHtml(store, entityId, rows);
        rows.forEach(function (h, i) {
            var chHtml = '';
            if (h.ch && h.ch.length) {
                chHtml = '<div style="margin-top:5px;display:flex;flex-direction:column;gap:3px">';
                h.ch.forEach(function (c) {
                    chHtml += '<div style="font-size:.7rem;color:#475569;background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:4px 8px;line-height:1.9">'
                        + '• <b>' + esc(c[0]) + ':</b> ' + esc(c[1]) + ' <span style="color:#94a3b8">←</span> '
                        + '<b style="color:#0f172a">' + esc(c[2]) + '</b></div>';
                });
                chHtml += '</div>';
            }
            out += '<div style="display:flex;gap:8px;align-items:flex-start;border:1px solid #e2e8f0;border-radius:12px;padding:9px 11px;background:#fff'
                + (i > 0 ? ';margin-top:7px' : '') + '">'
                + '<div style="width:26px;height:26px;border-radius:50%;background:#eff6ff;color:#1e40af;font-size:.62rem;font-weight:900;display:flex;align-items:center;justify-content:center;flex-shrink:0">'
                + toFa(rows.length - i) + '</div>'
                + '<div style="flex:1;min-width:0">'
                + '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px">'
                + _actBadge(h.act)
                + '<span style="font-size:.72rem;font-weight:800;color:#0f172a">' + esc(h.ttl || '') + '</span>'
                + '<span style="font-size:.68rem;color:#64748b">👤 ' + esc(h.u || '—') + '</span>'
                + '<span style="font-size:.68rem;color:#64748b">🕘 ' + _jalaliDateTime(h.ts) + '</span>'
                + '</div>'
                + chHtml
                + '</div></div>';
        });
        return out;
    }

    /* ---------- دکمه 🕘 فهرست‌ها + پنجره ---------- */

    function rowBtn(id, title) {
        return '<button class="row-btn hist" data-id="' + esc(id) + '" data-title="' + esc(title || '') + '" title="تاریخچه تغییر وضعیت">🕘</button>';
    }

    function bindRowButtons(tbodyEl, store) {
        if (!tbodyEl) return;
        tbodyEl.querySelectorAll('.row-btn.hist').forEach(function (b) {
            b.onclick = function (e) {
                e.preventDefault(); e.stopPropagation();
                openModal(store, b.getAttribute('data-id'), b.getAttribute('data-title') || '');
            };
        });
    }

    function openModal(store, entityId, title) {
        var ov = document.getElementById('hist-modal-overlay');
        var m = document.getElementById('hist-modal');
        var t = document.getElementById('hist-modal-title');
        var body = document.getElementById('hist-modal-body');
        if (!m || !body) { alert('تاریخچه بارگذاری نشده است'); return; }
        var lbl = HIST_STORE_LABELS[store] || 'رکورد';
        if (t) t.textContent = '🕘 تاریخچه تغییر وضعیت — ' + lbl + (title ? ': ' + title : '');
        body.innerHTML = rowsHtml(store, entityId);
        if (ov) ov.classList.add('show');
        m.classList.add('show');
        window._histOpenStore = store;
        window._histOpenId = entityId;
    }

    function closeModal() {
        var ov = document.getElementById('hist-modal-overlay');
        var m = document.getElementById('hist-modal');
        if (m) m.classList.remove('show');
        if (ov) ov.classList.remove('show');
    }

    function bindModalStatic() {
        var x = document.getElementById('hist-modal-close');
        var ov = document.getElementById('hist-modal-overlay');
        if (x) x.onclick = closeModal;
        if (ov) ov.onclick = closeModal;
    }

    /* ---------- تب «تاریخچه تغییر وضعیت» داخل فرم‌ها ----------
       وقتی صفحه‌ای باز می‌شود، id داخل فیلد مخفی فرم خوانده و تاریخچه همان
       رکورد در تب رندر می‌شود. */
    function renderTab(store, idInputSel, containerSel) {
        var inp = document.querySelector(idInputSel);
        var box = document.querySelector(containerSel);
        if (!box) return;
        var id = inp ? (inp.value || '') : '';
        if (!id) {
            box.innerHTML = '<div style="padding:18px;text-align:center;color:#94a3b8;font-size:.78rem">'
                + '💡 برای دیدن تاریخچه، ابتدا از تب «فهرست» یک مورد را با دکمه ✎ باز کنید (یا ذخیره کنید) تا تاریخچه‌اش اینجا نمایش داده شود.</div>';
            return;
        }
        var rows = forEntity(store, id);
        var ttl = '';
        try {
            var rec = (DB.load(store, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (rec) ttl = _entityTitle(store, rec);
        } catch (e) {}
        box.innerHTML = '<div style="font-size:.74rem;font-weight:800;color:var(--primary-dark);margin-bottom:8px">'
            + esc(ttl || 'رکورد انتخاب‌شده') + ' — ' + toFa(rows.length) + ' ردیف تاریخچه (جدید به قدیم)</div>'
            + '<div style="max-height:52vh;overflow:auto">' + rowsHtml(store, id) + '</div>';
    }

    return {
        log: log,
        logSimple: logSimple,
        diff: diff,
        forEntity: forEntity,
        forStore: forStore,
        rowsHtml: rowsHtml,
        rowBtn: rowBtn,
        bindRowButtons: bindRowButtons,
        openModal: openModal,
        closeModal: closeModal,
        bindModalStatic: bindModalStatic,
        renderTab: renderTab,
        labels: HIST_STORE_LABELS
    };
})();

window.Hist = Hist;
window.HIST_STORE_LABELS = HIST_STORE_LABELS;

console.log('✅ [core/history.js] loaded — v2.4.0 (تاریخچه تغییر وضعیت)');
