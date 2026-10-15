/* ============================================================
   پارسیس — الگوهای سند + شرح‌های استاندارد
   مسیر: js/modules/accounts/templates.js
   وابستگی: core/* + ui/* + accounts/chart.js
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — الگوهای پیش‌فرض
   ============================================================ */
function getDefaultTemplates() {
    return [
        {
            id: 'tpl-taxi',
            name: 'کرایه تاکسی روزانه',
            desc: 'کرایه تاکسی شغلی',
            lines: [
                { side: 'debit',  nameHint: 'ایاب و ذهاب', desc: 'کرایه تاکسی', fixedAmount: 300000 },
                { side: 'credit', nameHint: 'صندوق',       desc: 'پرداخت از صندوق', fixedAmount: 300000 }
            ]
        },
        {
            id: 'tpl-supplies',
            name: 'خرید ملزومات',
            desc: 'خرید ملزومات اداری',
            lines: [
                { side: 'debit',  nameHint: 'ملزومات', desc: 'خرید ملزومات' },
                { side: 'credit', nameHint: 'بانک',    desc: 'پرداخت از بانک' }
            ]
        },
        {
            id: 'tpl-fuel',
            name: 'هزینه سوخت',
            desc: 'هزینه سوخت',
            lines: [
                { side: 'debit',  nameHint: 'سوخت',  desc: 'هزینه سوخت' },
                { side: 'credit', nameHint: 'صندوق', desc: 'پرداخت' }
            ]
        },
        {
            id: 'tpl-receive',
            name: 'دریافت از مشتری',
            desc: 'دریافت',
            lines: [
                { side: 'debit',  nameHint: 'بانک',       desc: 'واریز' },
                { side: 'credit', nameHint: 'دریافتنی',   desc: 'دریافت از مشتری' }
            ]
        },
        {
            id: 'tpl-bill',
            name: 'پرداخت قبض',
            desc: 'پرداخت قبوض',
            lines: [
                { side: 'debit',  nameHint: 'قبوض', desc: 'هزینه قبوض' },
                { side: 'credit', nameHint: 'بانک', desc: 'پرداخت' }
            ]
        }
    ];
}

function getDefaultStdDescriptions() {
    return [
        'کرایه تاکسی',
        'خرید ملزومات',
        'هزینه سوخت',
        'هزینه پذیرایی',
        'پرداخت قبض',
        'دریافت از مشتری',
        'پرداخت به تأمین‌کننده',
        'حقوق و دستمزد',
        'اجاره',
        'تلفن و اینترنت',
        'تعمیر و نگهداری',
        'تبلیغات',
        'حمل و نقل',
        'کارمزد بانکی',
        'مالیات',
        'بیمه'
    ];
}

/* ============================================================
   بخش ۲ — پر کردن سلکت الگوها در فرم سند
   ============================================================ */
function refreshTemplateSelect() {
    var sel = document.getElementById('v-template');
    if (!sel) return;
    var list = DB.load('voucherTemplates', []);
    sel.innerHTML = '<option value="">— بدون الگو —</option>';
    for (var i = 0; i < list.length; i++) {
        var o = document.createElement('option');
        o.value = list[i].id;
        var hasAmount = (list[i].lines || []).some(function (l) { return l.fixedAmount; });
        o.textContent = list[i].name + (hasAmount ? ' (آماده)' : '');
        sel.appendChild(o);
    }
}

/* ============================================================
   بخش ۳ — جستجوی حساب با نام
   ============================================================ */
function findAccountByNameHint(hint) {
    if (!hint) return '';
    var accounts = DB.load('accounts', []);
    var leaves = accounts.filter(function (a) {
        return !accounts.some(function (x) { return x.parent === a.id; });
    });
    var q = hint.toLowerCase();
    var ex = leaves.find(function (a) { return (a.name || '').toLowerCase() === q; });
    if (ex) return ex.id;
    var pa = leaves.find(function (a) { return (a.name || '').toLowerCase().indexOf(q) !== -1; });
    if (pa) return pa.id;
    return '';
}

/* ============================================================
   بخش ۴ — رندر فهرست الگوها
   ============================================================ */
function renderTemplateList() {
    var list = DB.load('voucherTemplates', []);
    var box = document.getElementById('tpl-list-body');
    if (!box) return;
    box.innerHTML = '';

    if (list.length === 0) {
        box.innerHTML = '<p class="muted" style="text-align:center;padding:16px">الگویی نیست.</p>';
        var cEl = document.getElementById('tpl-count');
        if (cEl) cEl.textContent = '۰';
        return;
    }

    for (var i = 0; i < list.length; i++) {
        (function (t, idx) {
            var row = document.createElement('div');
            row.className = 'tpl-row';
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.gap = '8px';
            row.style.flexWrap = 'nowrap';

            var lc = (t.lines || []).length;
            var ha = (t.lines || []).some(function (l) { return l.fixedAmount; });
            var sub = toFa(lc) + ' قلم' + (ha ? ' — دارای مبلغ' : '');

            /* دکمه بالا */
            var upBtn = document.createElement('button');
            upBtn.type = 'button';
            upBtn.className = 'row-btn';
            upBtn.textContent = '↑';
            upBtn.title = 'انتقال به بالا';
            upBtn.style.cssText = 'background:#e0ecf8;color:#1e40af;border:none;border-radius:8px;width:32px;height:32px;font-size:0.95rem;font-weight:800;cursor:pointer;flex-shrink:0';
            if (idx === 0) upBtn.disabled = true;
            if (idx === 0) upBtn.style.opacity = '0.35';
            upBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (idx === 0) return;
                var arr = DB.load('voucherTemplates', []);
                var tmp = arr[idx];
                arr[idx] = arr[idx - 1];
                arr[idx - 1] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('↕ ترتیب الگوها بروزرسانی شد.');
            });

            /* دکمه پایین */
            var downBtn = document.createElement('button');
            downBtn.type = 'button';
            downBtn.className = 'row-btn';
            downBtn.textContent = '↓';
            downBtn.title = 'انتقال به پایین';
            downBtn.style.cssText = 'background:#e0ecf8;color:#1e40af;border:none;border-radius:8px;width:32px;height:32px;font-size:0.95rem;font-weight:800;cursor:pointer;flex-shrink:0';
            if (idx === list.length - 1) downBtn.disabled = true;
            if (idx === list.length - 1) downBtn.style.opacity = '0.35';
            downBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (idx === list.length - 1) return;
                var arr = DB.load('voucherTemplates', []);
                var tmp = arr[idx];
                arr[idx] = arr[idx + 1];
                arr[idx + 1] = tmp;
                DB.save('voucherTemplates', arr);
                renderTemplateList();
                refreshTemplateSelect();
                showToast('↕ ترتیب الگوها بروزرسانی شد.');
            });

            var orderWrap = document.createElement('div');
            orderWrap.style.cssText = 'display:flex;flex-direction:column;gap:2px;flex-shrink:0';
            orderWrap.appendChild(upBtn);
            orderWrap.appendChild(downBtn);

            var contentWrap = document.createElement('div');
            contentWrap.style.cssText = 'flex:1;min-width:0';
            contentWrap.innerHTML = '<div class="tpl-name">' + esc(t.name) + '</div>'
                + '<div class="tpl-desc">' + sub + '</div>';

            var actWrap = document.createElement('div');
            actWrap.className = 'row-actions';
            actWrap.innerHTML = '<button class="row-btn open tpl-use" data-id="' + t.id + '" title="اعمال الگو">⚡</button>'
                + '<button class="row-btn edit tpl-edit" data-id="' + t.id + '" title="ویرایش">✎</button>'
                + '<button class="row-btn del tpl-del" data-id="' + t.id + '" title="حذف">×</button>';

            row.appendChild(orderWrap);
            row.appendChild(contentWrap);
            row.appendChild(actWrap);
            box.appendChild(row);
        })(list[i], i);
    }

    var countEl = document.getElementById('tpl-count');
    if (countEl) countEl.textContent = toFa(list.length);

    var uses = box.querySelectorAll('.tpl-use');
    var edits = box.querySelectorAll('.tpl-edit');
    var dels = box.querySelectorAll('.tpl-del');

    for (var u = 0; u < uses.length; u++) {
        uses[u].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            goToPage('voucher-new');
            if (typeof voucherLines !== 'undefined' &&
                (voucherLines.length === 0 || currentVoucherStatus === 'approved')) {
                if (typeof newVoucherForm === 'function') newVoucherForm();
            }
            if (typeof applyTemplate === 'function') applyTemplate(id);
        });
    }

    for (var e = 0; e < edits.length; e++) {
        edits[e].addEventListener('click', function () {
            var id = this.getAttribute('data-id');
            var t = DB.load('voucherTemplates', []).find(function (x) { return x.id === id; });
            if (!t) return;
            document.getElementById('tpl-id').value = t.id;
            document.getElementById('tpl-name').value = t.name || '';
            document.getElementById('tpl-desc').value = t.desc || '';
            if (typeof templateLines !== 'undefined') {
                templateLines = JSON.parse(JSON.stringify(t.lines || []));
                if (typeof renderTemplateLines === 'function') renderTemplateLines();
            }
            var addTab = document.querySelector('[data-tab="tpl-add"]');
            if (addTab) addTab.click();
        });
    }

    for (var d = 0; d < dels.length; d++) {
        dels[d].addEventListener('click', function () {
            if (!confirm('حذف شود؟')) return;
            var id = this.getAttribute('data-id');
            var l2 = DB.load('voucherTemplates', []).filter(function (x) { return x.id !== id; });
            DB.save('voucherTemplates', l2);
            renderTemplateList();
            refreshTemplateSelect();
        });
    }
}
