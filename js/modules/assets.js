/* ============================================================
   پارسیس — ماژول اموال و دارایی ثابت   ✅ v2.4.0
   مسیر: js/modules/assets.js

   الگوبرداری از بخش اموال/دارایی ثابت ERP راهکاران:
     • ثبت دارایی‌ها: نام، گروه دارایی، تاریخ خرید، مبلغ خرید،
       محل استقرار، متولی، نرخ استهلاک سالانه
     • محاسبه خودکار استهلاک سالانه، استهلاک انباشته و ارزش دفتری
     • فروش/برچیدن دارایی با ثبت در تاریخچه
   ذخیره: مخزن «assets» (با ابر همگام می‌شود)
   ============================================================ */
'use strict';

var ASSETS_STORE = 'assets';

/* گروه‌های دارایی (الهام از طبقه‌بندی استاندارد دارایی ثابت) */
var ASSET_GROUPS = [
    'زمین و ساختمان',
    'وسایل نقلیه',
    'تجهیزات و ماشین‌آلات',
    'اثاثه و لوازم',
    'رایانه و تجهیزات IT',
    'دارایی نامشهود',
    'سایر'
];

function refreshAssetGroupSelect() {
    var sel = document.getElementById('as-group');
    if (!sel) return;
    var cur = sel.value;
    var html = '<option value="">— انتخاب گروه —</option>';
    ASSET_GROUPS.forEach(function (g) { html += '<option value="' + esc(g) + '">' + esc(g) + '</option>'; });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
}

function refreshAssetPersonSelect() {
    var sel = document.getElementById('as-person');
    if (!sel) return;
    var cur = sel.value;
    var persons = DB.load('persons', []);
    var html = '<option value="">— بدون متولی —</option>';
    (Array.isArray(persons) ? persons : []).forEach(function (p) {
        var nm = ((p.first || '') + ' ' + (p.last || '')).trim();
        if (nm) html += '<option value="' + esc(p.id) + '">' + esc(nm) + '</option>';
    });
    sel.innerHTML = html;
    if (cur) sel.value = cur;
}

/* تفاضل سال شمسی (برای استهلاک) — «1402/05/12» تا امروز */
function _asYearsElapsed(jDate) {
    try {
        var a = String(jDate || '').split('/');
        if (a.length !== 3) return 0;
        var y1 = Number(a[0]), m1 = Number(a[1]), d1 = Number(a[2]);
        var t = todayJalaliStr().split('/');
        var y2 = Number(t[0]), m2 = Number(t[1]), d2 = Number(t[2]);
        var years = (y2 - y1) + ((m2 - m1) * 30 + (d2 - d1)) / 365.0;
        return years > 0 ? years : 0;
    } catch (e) { return 0; }
}

/* محاسبات استهلاک یک دارایی */
function assetDepreciation(a) {
    var buy = Number(a.buyAmount) || 0;
    var rate = Number(a.rate) || 0;
    var annual = buy * rate / 100;
    var life = rate > 0 ? (100 / rate) : 0; /* عمر مفید به سال */
    var elapsed = _asYearsElapsed(a.buyDate);
    if (life > 0 && elapsed > life) elapsed = life;
    var accum = annual * elapsed;
    if (accum > buy) accum = buy;
    var book = buy - accum;
    return { annual: annual, accum: accum, book: book, elapsed: elapsed };
}

function _asStatusBadge(a) {
    if (a.status === 'sold') return '<span class="badge badge-draft"> فروش‌رفته</span>';
    return '<span class="badge badge-approved">✓ در اختیار</span>';
}

/* فهرست اموال */
function renderAssetsList() {
    var list = DB.load(ASSETS_STORE, []);
    if (!Array.isArray(list)) list = [];

    var tb = document.getElementById('as-list-body');
    if (!tb) return;

    var filterEl = document.getElementById('as-filter');
    var filter = (filterEl ? filterEl.value : '').toLowerCase();

    var totalBuy = 0, totalBook = 0, shown = 0;
    var rows = list.slice().sort(function (a, b) {
        return String(b.buyDate || '').localeCompare(String(a.buyDate || ''));
    });

    var html = '';
    rows.forEach(function (a) {
        var dep = assetDepreciation(a);
        totalBuy += Number(a.buyAmount) || 0;
        totalBook += dep.book;
        var personName = '—';
        if (a.personId) {
            var p = (DB.load('persons', []) || []).filter(function (x) { return x && x.id === a.personId; })[0];
            if (p) personName = ((p.first || '') + ' ' + (p.last || '')).trim() || '—';
        }
        var hay = ((a.name || '') + ' ' + (a.group || '') + ' ' + (a.loc || '') + ' ' + personName + ' ' + (a.desc || '')).toLowerCase();
        if (filter && hay.indexOf(filter) === -1) return;
        shown++;
        html += '<tr>'
            + '<td>' + esc(a.name || '—') + '</td>'
            + '<td>' + esc(a.group || '—') + '</td>'
            + '<td dir="ltr">' + toFa(esc(a.buyDate || '—')) + '</td>'
            + '<td>' + esc(formatMoney(a.buyAmount)) + '</td>'
            + '<td>' + toFa(a.rate ? String(a.rate) : '0') + '٪</td>'
            + '<td>' + esc(formatMoney(dep.accum)) + '</td>'
            + '<td style="font-weight:800;color:#1e40af">' + esc(formatMoney(dep.book)) + '</td>'
            + '<td>' + esc(a.loc || '—') + '</td>'
            + '<td>' + esc(personName) + '</td>'
            + '<td>' + _asStatusBadge(a) + '</td>'
            + '<td><div class="row-actions">'
            +   Hist.rowBtn(a.id, a.name || '')
            +   '<button class="row-btn edit" data-id="' + esc(a.id) + '">✎</button>'
            +   '<button class="row-btn del" data-id="' + esc(a.id) + '">×</button>'
            + '</div></td></tr>';
    });

    tb.innerHTML = shown ? html : '<tr><td colspan="11" class="empty-row">دارایی‌ای ثبت نشده است — از تب «ثبت دارایی» شروع کنید.</td></tr>';

    var countEl = document.getElementById('as-count');
    if (countEl) countEl.textContent = toFa(shown);
    var bEl = document.getElementById('as-sum-buy');
    var bkEl = document.getElementById('as-sum-book');
    if (bEl) bEl.textContent = formatMoney(totalBuy) + ' ' + currencyLabel();
    if (bkEl) bkEl.textContent = formatMoney(totalBook) + ' ' + currencyLabel();

    tb.querySelectorAll('.row-btn.edit').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var a = (DB.load(ASSETS_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!a) return;
            fillAssetForm(a);
            var addTab = document.querySelector('#page-assets .tab-btn[data-tab="as-add"]');
            if (addTab) addTab.click();
        };
    });

    tb.querySelectorAll('.row-btn.del').forEach(function (b) {
        b.onclick = function () {
            var id = b.getAttribute('data-id');
            var a = (DB.load(ASSETS_STORE, []) || []).filter(function (x) { return x && x.id === id; })[0];
            if (!a) return;
            if (!confirm('حذف دارایی «' + (a.name || '') + '»؟')) return;
            var rest = (DB.load(ASSETS_STORE, []) || []).filter(function (x) { return x && x.id !== id; });
            Hist.log(ASSETS_STORE, id, 'حذف', a, null, a.name || '');
            DB.save(ASSETS_STORE, rest);
            renderAssetsList();
            showToast('🗑 دارایی حذف شد');
        };
    });

    Hist.bindRowButtons(tb, ASSETS_STORE);
}

function fillAssetForm(a) {
    document.getElementById('as-id').value = a.id || '';
    document.getElementById('as-name').value = a.name || '';
    refreshAssetGroupSelect();
    document.getElementById('as-group').value = a.group || '';
    document.getElementById('as-buy-date').value = a.buyDate || todayJalaliStr();
    document.getElementById('as-buy-amount').value = a.buyAmount ? formatRaw(a.buyAmount) : '';
    document.getElementById('as-loc').value = a.loc || '';
    refreshAssetPersonSelect();
    document.getElementById('as-person').value = a.personId || '';
    document.getElementById('as-rate').value = (a.rate !== undefined && a.rate !== '') ? a.rate : '';
    document.getElementById('as-desc').value = a.desc || '';
    var btn = document.getElementById('save-asset');
    if (btn) btn.innerHTML = '💾 ذخیره تغییرات';
}

function clearAssetForm() {
    document.getElementById('as-id').value = '';
    document.getElementById('as-name').value = '';
    refreshAssetGroupSelect();
    document.getElementById('as-group').value = '';
    document.getElementById('as-buy-date').value = todayJalaliStr();
    document.getElementById('as-buy-amount').value = '';
    document.getElementById('as-loc').value = '';
    refreshAssetPersonSelect();
    document.getElementById('as-person').value = '';
    document.getElementById('as-rate').value = '';
    document.getElementById('as-desc').value = '';
    var btn = document.getElementById('save-asset');
    if (btn) btn.innerHTML = '💾 ذخیره';
}

function bindAssetsForm() {
    var saveBtn = document.getElementById('save-asset');
    if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = '1';
        saveBtn.onclick = function () {
            var id = document.getElementById('as-id').value;
            var name = document.getElementById('as-name').value.trim();
            var group = document.getElementById('as-group').value;
            var buyDate = normalizeDigits(document.getElementById('as-buy-date').value.trim());
            var buyAmount = parseMoney(document.getElementById('as-buy-amount').value);
            var loc = document.getElementById('as-loc').value.trim();
            var personId = document.getElementById('as-person').value;
            var rate = Number(normalizeDigits(document.getElementById('as-rate').value)) || 0;
            var desc = document.getElementById('as-desc').value.trim();

            if (!name) { alert('⚠️ نام دارایی اجباری است.'); return; }
            if (!buyAmount) { alert('⚠️ مبلغ خرید را وارد کنید.'); return; }

            var list = DB.load(ASSETS_STORE, []);
            if (!Array.isArray(list)) list = [];

            var before = null, rec = null;
            if (id) {
                list.forEach(function (x) { if (x.id === id) before = JSON.parse(JSON.stringify(x)); });
                if (!before) { alert('❌ دارایی یافت نشد.'); return; }
                rec = before;
                rec.name = name; rec.group = group; rec.buyDate = buyDate;
                rec.buyAmount = buyAmount; rec.loc = loc; rec.personId = personId;
                rec.rate = rate; rec.desc = desc;
                list = list.map(function (x) { return x.id === id ? rec : x; });
                Hist.log(ASSETS_STORE, id, 'ویرایش', before, rec);
                showToast('✅ تغییرات دارایی ذخیره شد.');
            } else {
                rec = { id: uid(), name: name, group: group, buyDate: buyDate, buyAmount: buyAmount,
                        loc: loc, personId: personId, rate: rate, desc: desc, status: 'active' };
                list.push(rec);
                Hist.log(ASSETS_STORE, rec.id, 'ایجاد', null, rec);
                showToast('✅ دارایی «' + name + '» ثبت شد.');
            }
            DB.save(ASSETS_STORE, list);
            clearAssetForm();
            renderAssetsList();
            var listTab = document.querySelector('#page-assets .tab-btn[data-tab="as-list"]');
            if (listTab) listTab.click();
        };
    }
    var newBtn = document.getElementById('new-asset');
    if (newBtn && !newBtn.dataset.bound) {
        newBtn.dataset.bound = '1';
        newBtn.onclick = clearAssetForm;
    }
    var f = document.getElementById('as-filter');
    if (f && !f.dataset.bound) {
        f.dataset.bound = '1';
        f.addEventListener('input', renderAssetsList);
    }
}

function initAssetsPage() {
    refreshAssetGroupSelect();
    refreshAssetPersonSelect();
    if (!document.getElementById('as-buy-date').value) document.getElementById('as-buy-date').value = todayJalaliStr();
    renderAssetsList();
    bindAssetsForm();
    if (typeof Hist !== 'undefined' && Hist.renderTab) Hist.renderTab(ASSETS_STORE, '#as-id', '#hist-assets');
}

window.renderAssetsList = renderAssetsList;
window.bindAssetsForm = bindAssetsForm;
window.initAssetsPage = initAssetsPage;
window.assetDepreciation = assetDepreciation;
window.fillAssetForm = fillAssetForm;
window.clearAssetForm = clearAssetForm;

console.log('✅ [modules/assets.js] loaded — v2.4.0 (اموال و دارایی ثابت)');
