/* ============================================================
   پارسیس — فرم سند (بخش ۱: state + helpers + status bar)
   مسیر: js/modules/vouchers/form.js
   وابستگی: core/* + ui/* + accounts/*
   ============================================================ */
'use strict';

/* ============================================================
   بخش ۱ — state سند
   ============================================================ */
var voucherLines = [];
var currentVoucherStatus = 'draft';

window._voucherFormSavedAndClean = false;
window._voucherSaved_backup = null;

/* ============================================================
   بخش ۲ — توابع کمکی مرتب‌سازی معین‌ها
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
   بخش ۳ — نوار وضعیت سند
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
   بخش ۴ — شماره‌گذاری خودکار سند
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
   بخش ۵ — اعتبارسنجی تاریخ در دوره فعال
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
   بخش ۶ — مبلغ کل سند
   ============================================================ */
function getVoucherAmount(v) {
    var t = 0;
    (v.lines || []).forEach(function (l) { t += Number(l.debit) || 0; });
    return t;
}

function findVoucherById(id) {
    var l = DB.load('vouchers', []);
    for (var i = 0; i < l.length; i++) {
        if (l[i].id === id) return l[i];
    }
    return null;
}

/* ============================================================
   بخش ۷ — بررسی مشکلات سند
   ✅ اصلاح: اگر معین چند تفصیلی دارد، فقط یکی باید پر شود
   ============================================================ */
function getVoucherIssues(v) {
    var issues = [];
    if (!v) return ['سند نامعتبر'];

    var accounts = DB.load('accounts', []);
    var lines = v.lines || [];

    if (!v.number) issues.push('شماره سند خالی است');
    if (!v.date) issues.push('تاریخ سند خالی است');
    if (!v.desc || !String(v.desc).trim()) issues.push('شرح سند خالی است');

    var valid = lines.filter(function (l) {
        return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0;
    });
    if (valid.length < 2) issues.push('حداقل دو ردیف با مبلغ لازم است');

    var lineIssues = [];
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var d = Number(line.debit) || 0;
        var c = Number(line.credit) || 0;
        if (d === 0 && c === 0) continue;

        var ln = toFa(i + 1);

        if (!line.account) {
            lineIssues.push('ردیف ' + ln + ': حساب معین تعیین نشده');
            continue;
        }
        var acc = accounts.find(function (a) { return a.id === line.account; });
        if (!acc) {
            lineIssues.push('ردیف ' + ln + ': حساب معین نامعتبر');
            continue;
        }

        /* ✅ فقط یکی از تفصیلی‌های مرتبط باید انتخاب شود */
        if (acc.links && acc.links.length > 0) {
            var validLinks = acc.links.filter(function (lt) {
                return getLinkedItems(lt).length > 0;
            });
            if (validLinks.length > 0) {
                var hasAnyDetail = validLinks.some(function (lt) {
                    return line.details && line.details[lt];
                });
                if (!hasAnyDetail) {
                    var linkNames = validLinks.map(linkTypeName).join(' یا ');
                    lineIssues.push('ردیف ' + ln + ': یکی از تفصیلی‌های «' + linkNames + '» باید انتخاب شود');
                }
            }
        }

        if (!line.description || !String(line.description).trim()) {
            lineIssues.push('ردیف ' + ln + ': شرح قلم خالی است');
        }
    }

    var td = 0, tc = 0;
    lines.forEach(function (l) {
        td += Number(l.debit) || 0;
        tc += Number(l.credit) || 0;
    });
    if (td !== tc) {
        issues.push('سند متوازن نیست (اختلاف: ' + formatMoney(Math.abs(td - tc)) + ' ' + currencyLabel() + ')');
    }

    return issues.concat(lineIssues);
}

/* ============================================================
   صادرسازی
   ============================================================ */
window.voucherLines                     = voucherLines;
window.currentVoucherStatus             = currentVoucherStatus;
window.sortAccountsByCode               = sortAccountsByCode;
window.getLeafAccountsSortedByCode      = getLeafAccountsSortedByCode;
window.getOrCreateVoucherStatusBar      = getOrCreateVoucherStatusBar;
window.setVoucherStatusBar              = setVoucherStatusBar;
window.getNextVoucherNumberForPeriod    = getNextVoucherNumberForPeriod;
window.validateDateInActivePeriod       = validateDateInActivePeriod;
window.getVoucherAmount                 = getVoucherAmount;
window.findVoucherById                  = findVoucherById;
window.getVoucherIssues                 = getVoucherIssues;

console.log('✅ [modules/vouchers/form.js part 1] loaded');

/* ============================================================
   بخش ۸ — رندر اقلام سند (بزرگ‌ترین تابع)
   ============================================================ */
function renderVoucherLines() {
    var box = document.getElementById('voucher-lines');
    if (!box) return;
    box.innerHTML = '';

    if (voucherLines.length === 0) {
        voucherLines.push({
            id: uid(), account: '', details: {}, debit: 0, credit: 0, description: ''
        });
    }

    var leaves = getLeafAccountsSortedByCode();
    var accounts = DB.load('accounts', []);

    for (var i = 0; i < voucherLines.length; i++) (function (idx) {
        var line = voucherLines[idx];
        if (!line.details) line.details = {};

        var wrap = document.createElement('div');
        wrap.className = 'voucher-line' + (line.locked ? ' locked' : '');
        wrap.setAttribute('data-line-id', line.id);

        /* شماره ردیف */
        var numSpan = document.createElement('span');
        numSpan.className = 'ln-num' + (line.locked ? ' locked-tag' : '');
        numSpan.textContent = '#' + toFa(idx + 1) + (line.locked ? ' 🔒' : '');
        wrap.appendChild(numSpan);

        /* ردیف ۱: انتخاب معین */
        var mainGrid = document.createElement('div');
        mainGrid.className = 'ln-search-row';
        mainGrid.style.paddingTop = '14px';

        var sA = document.createElement('input');
        sA.type = 'text';
        sA.className = 'ln-search';
        sA.placeholder = '🔍 جستجوی معین...';

        var selA = document.createElement('select');

        var fillA = function (q) {
            var cur = line.account;
            var f = leaves.filter(function (l) {
                if (!q) return true;
                return getAccountSearchText(l.id, accounts).indexOf(q) !== -1;
            });
            selA.innerHTML = '';
            var ph = document.createElement('option');
            ph.value = '';
            ph.textContent = '— معین —';
            selA.appendChild(ph);
            for (var k = 0; k < f.length; k++) {
                var o = document.createElement('option');
                o.value = f[k].id;
                o.textContent = getAccountLabel(f[k].id, accounts);
                if (cur === f[k].id) o.selected = true;
                selA.appendChild(o);
            }
        };
        fillA('');

        if (line.locked) selA.disabled = true;

        sA.addEventListener('input', function () {
            fillA(normalizeDigits(this.value.trim().toLowerCase()));
        });
        selA.addEventListener('change', function () {
            line.account = this.value;
            line.details = {};
            renderVoucherLines();
        });

        mainGrid.appendChild(sA);
        mainGrid.appendChild(selA);
        wrap.appendChild(mainGrid);

        /* ردیف ۲: تفصیلی ترکیبی */
        var acc = accounts.find(function (a) { return a.id === line.account; });
        if (acc && acc.links && acc.links.length > 0) {
            var combined = [];
            acc.links.forEach(function (lt) {
                var items = getLinkedItems(lt);
                items.forEach(function (it) {
                    var lbl = getLinkedItemLabel(lt, it);
                    combined.push({
                        linkType: lt,
                        id: it.id,
                        label: linkTypeName(lt) + ': ' + lbl,
                        searchText: (lbl + ' ' + linkTypeName(lt)).toLowerCase()
                    });
                });
            });

            var currentLT = null, currentID = null;
            if (line.details) {
                acc.links.forEach(function (lt) {
                    if (line.details[lt]) {
                        currentLT = lt;
                        currentID = line.details[lt];
                    }
                });
            }

            var detGrid = document.createElement('div');
            detGrid.className = 'ln-search-row';
            detGrid.style.marginTop = '8px';

            var sD = document.createElement('input');
            sD.type = 'text';
            sD.className = 'ln-search';
            sD.placeholder = '🔍 جستجوی تفصیلی...';

            var selD = document.createElement('select');

            var fillD = function (q) {
                selD.innerHTML = '';
                var ph = document.createElement('option');
                ph.value = '';
                ph.textContent = '— تفصیلی —';
                selD.appendChild(ph);
                combined.forEach(function (c) {
                    if (q && c.searchText.indexOf(q) === -1) return;
                    var o = document.createElement('option');
                    o.value = c.linkType + '::' + c.id;
                    o.textContent = c.label;
                    if (c.linkType === currentLT && c.id === currentID) o.selected = true;
                    selD.appendChild(o);
                });
            };
            fillD('');

            if (line.locked) selD.disabled = true;

            sD.addEventListener('input', function () {
                var q = normalizeDigits(this.value.trim().toLowerCase());
                var curVal = selD.value;
                fillD(q);
                if (curVal) {
                    for (var k = 0; k < selD.options.length; k++) {
                        if (selD.options[k].value === curVal) {
                            selD.selectedIndex = k;
                            break;
                        }
                    }
                }
            });

            selD.addEventListener('change', function () {
                line.details = {};
                if (this.value) {
                    var parts = this.value.split('::');
                    line.details[parts[0]] = parts[1];
                    currentLT = parts[0];
                    currentID = parts[1];
                }
            });

            detGrid.appendChild(sD);
            detGrid.appendChild(selD);
            wrap.appendChild(detGrid);
        }

        /* ردیف ۳: مبالغ + شماره/تاریخ پیگیری */
        var r3 = document.createElement('div');
        r3.className = 'ln-row r4';
        r3.style.marginTop = '10px';

        var wD = document.createElement('div');
        wD.className = 'ln-amount-wrap';
        var iD = document.createElement('input');
        iD.type = 'text';
        iD.inputMode = 'numeric';
        iD.dir = 'ltr';
        iD.placeholder = 'بدهکار';
        iD.value = line.debit ? formatRaw(line.debit) : '';
        iD.addEventListener('input', function () {
            var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
            this.value = v;
            var x = Number(v) || 0;
            line.debit = x;
            if (x > 0 && line.credit !== 0) {
                line.credit = 0;
                iC.value = '';
            }
            updateVoucherTotals();
        });
        iD.addEventListener('blur', function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            line.debit = v;
            updateVoucherTotals();
        });
        var cD = document.createElement('button');
        cD.type = 'button';
        cD.className = 'calc-btn';
        cD.textContent = '🧮';
        cD.addEventListener('click', function () {
            calcOpen(
                function () { return line.debit || 0; },
                function (v) {
                    line.debit = v;
                    if (v > 0 && line.credit !== 0) line.credit = 0;
                    renderVoucherLines();
                    updateVoucherTotals();
                },
                'ماشین حساب بدهکار'
            );
        });
        wD.appendChild(iD);
        wD.appendChild(cD);

        var wC = document.createElement('div');
        wC.className = 'ln-amount-wrap';
        var iC = document.createElement('input');
        iC.type = 'text';
        iC.inputMode = 'numeric';
        iC.dir = 'ltr';
        iC.placeholder = 'بستانکار';
        iC.value = line.credit ? formatRaw(line.credit) : '';
        iC.addEventListener('input', function () {
            var v = normalizeDigits(this.value).replace(/[^\d]/g, '');
            this.value = v;
            var x = Number(v) || 0;
            line.credit = x;
            if (x > 0 && line.debit !== 0) {
                line.debit = 0;
                iD.value = '';
            }
            updateVoucherTotals();
        });
        iC.addEventListener('blur', function () {
            var v = Number(normalizeDigits(this.value).replace(/[^\d]/g, '')) || 0;
            this.value = v ? formatRaw(v) : '';
            line.credit = v;
            updateVoucherTotals();
        });
        var cC = document.createElement('button');
        cC.type = 'button';
        cC.className = 'calc-btn';
        cC.textContent = '🧮';
        cC.addEventListener('click', function () {
            calcOpen(
                function () { return line.credit || 0; },
                function (v) {
                    line.credit = v;
                    if (v > 0 && line.debit !== 0) line.debit = 0;
                    renderVoucherLines();
                    updateVoucherTotals();
                },
                'ماشین حساب بستانکار'
            );
        });
        wC.appendChild(iC);
        wC.appendChild(cC);

        r3.appendChild(wD);
        r3.appendChild(wC);

        var iT = document.createElement('input');
        iT.type = 'text';
        iT.dir = 'ltr';
        iT.placeholder = 'ش پیگیری';
        iT.value = line.trackingNumber || '';
        iT.addEventListener('input', function () { line.trackingNumber = this.value; });
        r3.appendChild(iT);

        var iTD = document.createElement('input');
        iTD.type = 'text';
        iTD.dir = 'ltr';
        iTD.placeholder = 'ت پیگیری';
        iTD.value = line.trackingDate || '';
        iTD.classList.add('date-picker');
        iTD.addEventListener('input', function () { line.trackingDate = this.value; });
        r3.appendChild(iTD);
        wrap.appendChild(r3);

        /* ردیف ۴: شرح + دکمه‌ها */
        var r4 = document.createElement('div');
        r4.className = 'desc-row';
        r4.style.marginTop = '8px';
        r4.style.gridTemplateColumns = '1fr auto auto';

        var iDsc = document.createElement('input');
        iDsc.type = 'text';
        iDsc.placeholder = 'شرح قلم *';
        iDsc.value = line.description || '';
        iDsc.setAttribute('list', 'std-desc-list');
        if (!line.description && (Number(line.debit) > 0 || Number(line.credit) > 0)) {
            iDsc.classList.add('desc-required');
        }
        iDsc.addEventListener('input', function () {
            line.description = this.value;
            this.classList.remove('desc-required');
        });

        var clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'desc-clear-btn';
        clearBtn.title = 'خالی کردن شرح این قلم';
        clearBtn.textContent = '🧹';
        clearBtn.style.cssText = 'background:#fee2e2;color:#dc2626;border:none;border-radius:10px;width:38px;height:38px;font-size:1.05rem;font-weight:800;cursor:pointer;flex-shrink:0';
        clearBtn.addEventListener('click', function (e) {
            e.preventDefault();
            iDsc.value = '';
            line.description = '';
            iDsc.classList.remove('desc-required');
            iDsc.focus();
        });

        var btnAddDesc = document.createElement('button');
        btnAddDesc.type = 'button';
        btnAddDesc.className = 'desc-add-btn';
        btnAddDesc.textContent = '＋';
        btnAddDesc.addEventListener('click', function () {
            addDescriptionToStandard(iDsc.value);
        });

        r4.appendChild(iDsc);
        r4.appendChild(clearBtn);
        r4.appendChild(btnAddDesc);
        wrap.appendChild(r4);

        /* ردیف ۵: دکمه‌های عملیات */
        var aW = document.createElement('div');
        aW.className = 'ln-actions';

        var bU = document.createElement('button');
        bU.className = 'ln-btn';
        bU.textContent = '↑';
        bU.title = 'انتقال به بالا';
        if (idx === 0) bU.disabled = true;
        bU.addEventListener('click', function () { moveLine(idx, -1); });

        var bD = document.createElement('button');
        bD.className = 'ln-btn';
        bD.textContent = '↓';
        bD.title = 'انتقال به پایین';
        if (idx === voucherLines.length - 1) bD.disabled = true;
        bD.addEventListener('click', function () { moveLine(idx, 1); });

        var bCp = document.createElement('button');
        bCp.className = 'ln-btn ln-copy';
        bCp.textContent = '📋 کپی';
        bCp.title = 'کپی ردیف';
        bCp.addEventListener('click', function () { copyVoucherLine(idx); });

        var bSwap = document.createElement('button');
        bSwap.className = 'ln-btn ln-swap';
        bSwap.textContent = '🔄 جابجایی';
        bSwap.title = 'جابجایی بدهکار/بستانکار';
        bSwap.addEventListener('click', function () {
            var tmp = line.debit;
            line.debit = line.credit;
            line.credit = tmp;
            renderVoucherLines();
            showToast('🔄 جابه‌جا شد.');
        });

        var bMoveTo = document.createElement('button');
        bMoveTo.className = 'ln-btn ln-moveto';
        bMoveTo.textContent = '📍 انتقال به ردیف';
        bMoveTo.title = 'انتقال به ردیف مشخص';
        bMoveTo.addEventListener('click', function () {
            var total = voucherLines.length;
            if (total < 2) {
                showToast('فقط یک ردیف موجود است.');
                return;
            }
            var ans = prompt(
                'این ردیف به کدام شماره ردیف منتقل شود؟ (۱ تا ' + toFa(total) + ')\nشماره فعلی: ' + toFa(idx + 1),
                String(idx + 1)
            );
            if (!ans) return;
            var target = Number(normalizeDigits(ans));
            if (isNaN(target) || target < 1 || target > total) {
                alert('شماره نامعتبر.');
                return;
            }
            target = target - 1;
            if (target === idx) return;
            var moved = voucherLines.splice(idx, 1)[0];
            voucherLines.splice(target, 0, moved);
            window._focusLineId = moved.id;
            renderVoucherLines();
            showToast('📍 ردیف به ' + toFa(target + 1) + ' منتقل شد.');
        });

        var bX = document.createElement('button');
        bX.className = 'ln-btn ln-del';
        bX.textContent = '× حذف';
        bX.addEventListener('click', function () {
            if (!confirm('این ردیف حذف شود؟')) return;
            voucherLines.splice(idx, 1);
            renderVoucherLines();
        });

        aW.appendChild(bU);
        aW.appendChild(bD);
        aW.appendChild(bCp);
        aW.appendChild(bSwap);
        aW.appendChild(bMoveTo);
        aW.appendChild(bX);
        wrap.appendChild(aW);

        box.appendChild(wrap);
    })(i);

    updateVoucherTotals();

    /* auto-scroll به ردیف تازه کپی/جابجا شده */
    if (window._focusLineId) {
        var tid = window._focusLineId;
        window._focusLineId = null;
        setTimeout(function () {
            var t = box.querySelector('[data-line-id="' + tid + '"]');
            if (t) {
                t.scrollIntoView({ behavior: 'smooth', block: 'center' });
                t.classList.add('focus-highlight');
                setTimeout(function () {
                    t.classList.remove('focus-highlight');
                }, 1200);
            }
        }, 60);
    }

    if (typeof attachDatePickers === 'function') attachDatePickers();
}

/* ============================================================
   بخش ۹ — کپی ردیف
   ============================================================ */
function copyVoucherLine(idx) {
    var src = voucherLines[idx];
    if (!src) return;
    var copyLine = JSON.parse(JSON.stringify(src));
    copyLine.id = uid();
    voucherLines.splice(idx + 1, 0, copyLine);
    window._focusLineId = copyLine.id;
    renderVoucherLines();
    showToast('📋 ردیف کپی شد در پایین');
}

/* ============================================================
   بخش ۱۰ — جابجایی ردیف
   ============================================================ */
function moveLine(idx, dir) {
    var ni = idx + dir;
    if (ni < 0 || ni >= voucherLines.length) return;
    var tmp = voucherLines[idx];
    voucherLines[idx] = voucherLines[ni];
    voucherLines[ni] = tmp;
    window._focusLineId = voucherLines[ni].id;
    renderVoucherLines();
}

/* ============================================================
   بخش ۱۱ — جمع‌های سند
   ============================================================ */
function updateVoucherTotals() {
    var td = 0, tc = 0;
    for (var i = 0; i < voucherLines.length; i++) {
        td += Number(voucherLines[i].debit) || 0;
        tc += Number(voucherLines[i].credit) || 0;
    }

    var tdEl = document.getElementById('v-total-debit');
    var tcEl = document.getElementById('v-total-credit');
    var st = document.getElementById('v-balance-status');

    if (tdEl) tdEl.textContent = formatMoney(td);
    if (tcEl) tcEl.textContent = formatMoney(tc);

    if (st) {
        if (td === tc && td > 0) {
            st.innerHTML = '<span class="ok">✓ متوازن</span>';
        } else if (td > 0 || tc > 0) {
            st.innerHTML = '<span class="err">اختلاف: ' + formatMoney(Math.abs(td - tc)) + '</span>';
        } else {
            st.textContent = '';
        }
    }
}

/* ============================================================
   بخش ۱۲ — فرم سند جدید
   ============================================================ */
function newVoucherForm() {
    document.getElementById('v-id').value = '';
    document.getElementById('v-number').value = getNextVoucherNumberForPeriod(state.activePeriodId || '');
    document.getElementById('v-date').value = todayJalaliStr();
    document.getElementById('v-type').value = 'general';
    document.getElementById('v-desc').value = '';

    currentVoucherStatus = 'draft';
    voucherLines = [{ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' }];
    renderVoucherLines();

    window._voucherFormSavedAndClean = false;
    setVoucherStatusBar(null);
}

/* ============================================================
   بخش ۱۳ — بارگذاری سند برای ویرایش
   ============================================================ */
function loadVoucherForEdit(v) {
    document.getElementById('v-id').value = v.id;
    document.getElementById('v-number').value = v.number;
    document.getElementById('v-date').value = v.date;
    document.getElementById('v-type').value = v.type || 'general';
    document.getElementById('v-desc').value = v.desc || '';

    currentVoucherStatus = v.status || 'draft';
    voucherLines = JSON.parse(JSON.stringify(v.lines));
    renderVoucherLines();

    window._voucherFormSavedAndClean = true;
    setVoucherStatusBar(v.status === 'approved' ? 'approved' : 'draft', v.id);
    goToPage('voucher-new');
}

/* ============================================================
   بخش ۱۴ — ذخیره سند (پیش‌نویس یا تأیید)
   ============================================================ */
function persistVoucher(approve) {
    if (currentVoucherStatus === 'approved' && !approve) {
        alert('سند تأیید شده قابل ذخیره به‌عنوان پیش‌نویس نیست.');
        return;
    }

    var num = normalizeDigits(document.getElementById('v-number').value.trim());
    var d = normalizeDigits(document.getElementById('v-date').value.trim());
    var ty = document.getElementById('v-type').value;
    var ds = document.getElementById('v-desc').value.trim();
    var pid = state.activePeriodId || '';

    if (!num || !d) {
        alert('شماره و تاریخ اجباری.');
        return;
    }

    var dv = validateDateInActivePeriod(d);
    if (!dv.ok) {
        alert('⚠️ ' + dv.msg);
        return;
    }

    if (!ds) {
        alert('⚠️ شرح سند اجباری.');
        return;
    }

    var valid = voucherLines.filter(function (l) {
        return (Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0;
    });
    if (valid.length < 2) {
        alert('حداقل دو ردیف با مبلغ.');
        return;
    }

    var id = document.getElementById('v-id').value;
    var status = approve ? 'approved' : 'draft';
    if (!id) num = getNextVoucherNumberForPeriod(pid);

    var vch = {
        id: id || uid(),
        number: num,
        date: d,
        type: ty,
        periodId: pid,
        desc: ds,
        lines: valid,
        status: status
    };

    if (approve) {
        var issues = getVoucherIssues(vch);
        if (issues.length > 0) {
            alert('⚠️ سند قابل تأیید نیست:\n\n• ' + issues.join('\n• '));
            return;
        }
    }

    var l = DB.load('vouchers', []);
    if (id) {
        for (var kk = 0; kk < l.length; kk++) {
            if (l[kk].id === id) l[kk] = vch;
        }
    } else {
        l.push(vch);
    }
    DB.save('vouchers', l);

    if (approve) {
        showToast('✅ سند تأیید شد.');
        window._voucherFormSavedAndClean = true;
        setVoucherStatusBar('approved', vch.id);
        goToPage('voucher-list');
    } else {
        showToast('✅ پیش‌نویس ذخیره شد.');
        document.getElementById('v-id').value = vch.id;
        document.getElementById('v-number').value = vch.number;
        document.getElementById('v-date').value = vch.date;
        document.getElementById('v-desc').value = vch.desc;
        currentVoucherStatus = 'draft';
        setVoucherStatusBar('draft', vch.id);
        window._voucherFormSavedAndClean = true;
    }

    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
}

/* ============================================================
   بخش ۱۵ — تشخیص تغییر پس از ذخیره
   ============================================================ */
(function attachVoucherDirtyListener() {
    function markDirty(e) {
        if (!window._voucherFormSavedAndClean) return;
        if (e.isTrusted === false) return;
        var page = document.getElementById('page-voucher-new');
        if (!page || !page.contains(e.target)) return;

        window._voucherFormSavedAndClean = false;

        var bar = document.getElementById('voucher-status-bar');
        if (bar) {
            bar.style.background = 'linear-gradient(135deg,#dbeafe,#bfdbfe)';
            bar.style.color = '#1e40af';
            bar.style.borderColor = '#3b82f6';
            var icon = bar.querySelector('.vsb-icon');
            var text = bar.querySelector('.vsb-text');
            if (icon) icon.textContent = '✏️';
            if (text) text.textContent = 'سند در حال ویرایش — ذخیره نشده';
        }
    }
    document.addEventListener('input', markDirty, true);
    document.addEventListener('change', markDirty, true);
})();

/* ============================================================
   بخش ۱۶ — اعمال الگو
   ============================================================ */
function applyTemplate(tplId) {
    var list = DB.load('voucherTemplates', []);
    var t = list.find(function (x) { return x.id === tplId; });
    if (!t) return;

    voucherLines = [];
    for (var i = 0; i < (t.lines || []).length; i++) {
        var tl = t.lines[i];
        var accId = tl.account || findAccountByNameHint(tl.nameHint) || '';
        var amt = Number(tl.fixedAmount) || 0;

        voucherLines.push({
            id: uid(),
            account: accId,
            details: tl.details ? JSON.parse(JSON.stringify(tl.details)) : {},
            debit: (tl.side === 'debit') ? amt : 0,
            credit: (tl.side === 'credit') ? amt : 0,
            description: tl.desc || ''
        });
    }

    if (voucherLines.length === 0) {
        voucherLines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
    }

    if (t.desc && !document.getElementById('v-desc').value.trim()) {
        document.getElementById('v-desc').value = t.desc;
    }

    renderVoucherLines();
    showToast('✅ الگو اعمال شد.');
}

/* ============================================================
   بخش ۱۷ — ذخیره سند به‌عنوان الگو
   ============================================================ */
function saveVoucherAsTemplate() {
    var valid = voucherLines.filter(function (l) { return l.account; });
    if (valid.length === 0) {
        alert('ابتدا حساب انتخاب کن.');
        return;
    }

    var name = prompt('نام الگو:');
    if (!name) return;
    name = name.trim();
    if (!name) return;

    var tplDesc = document.getElementById('v-desc').value.trim();

    var tpl = {
        id: uid(),
        name: name,
        desc: tplDesc,
        lines: valid.map(function (l) {
            var amt = Number(l.debit) > 0 ? Number(l.debit) : Number(l.credit);
            return {
                account: l.account,
                details: l.details || {},
                desc: l.description || '',
                side: (Number(l.debit) > 0 ? 'debit' : 'credit'),
                fixedAmount: amt || 0
            };
        })
    };

    var list = DB.load('voucherTemplates', []);
    list.push(tpl);
    DB.save('voucherTemplates', list);

    if (typeof refreshTemplateSelect === 'function') refreshTemplateSelect();
    if (typeof renderTemplateList === 'function') renderTemplateList();
    showToast('✅ الگو ذخیره شد.');
}

/* ============================================================
   بخش ۱۸ — اتصال دکمه‌های فرم سند
   ============================================================ */
function bindVoucherForm() {
    var addBtn = document.getElementById('add-line');
    if (addBtn) addBtn.addEventListener('click', function () {
        voucherLines.push({
            id: uid(), account: '', details: {}, debit: 0, credit: 0, description: ''
        });
        renderVoucherLines();
    });

    var saveBtn = document.getElementById('save-voucher');
    if (saveBtn) saveBtn.addEventListener('click', function () { persistVoucher(false); });

    var saveApproveBtn = document.getElementById('save-voucher-approve');
    if (saveApproveBtn) saveApproveBtn.addEventListener('click', function () { persistVoucher(true); });

    var newBtn = document.getElementById('new-voucher');
    if (newBtn) newBtn.addEventListener('click', newVoucherForm);

    var vDescClearBtn = document.getElementById('v-desc-clear');
    if (vDescClearBtn) vDescClearBtn.addEventListener('click', function () {
        document.getElementById('v-desc').value = '';
        document.getElementById('v-desc').focus();
        showToast('🧹 شرح سند خالی شد.');
    });

    var applyTplBtn = document.getElementById('apply-template');
    if (applyTplBtn) applyTplBtn.addEventListener('click', function () {
        var id = document.getElementById('v-template').value;
        if (!id) {
            alert('الگو انتخاب کن.');
            return;
        }
        applyTemplate(id);
    });

    var saveAsTplBtn = document.getElementById('save-as-template');
    if (saveAsTplBtn) saveAsTplBtn.addEventListener('click', saveVoucherAsTemplate);

    var gotoTplBtn = document.getElementById('goto-templates');
    if (gotoTplBtn) gotoTplBtn.addEventListener('click', function () {
        goToPage('templates');
    });
}

/* ============================================================
   بخش ۱۹ — بارگذاری نوار وضعیت در شروع
   ============================================================ */
(function initVoucherStatusBarOnLoad() {
    function check() {
        var vId = document.getElementById('v-id');
        if (vId && vId.value) {
            var v = findVoucherById(vId.value);
            if (v) {
                setVoucherStatusBar(v.status === 'approved' ? 'approved' : 'draft', v.id);
            }
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { setTimeout(check, 1000); });
    } else {
        setTimeout(check, 1000);
    }
})();

/* ============================================================
   صادرسازی
   ============================================================ */
window.renderVoucherLines         = renderVoucherLines;
window.copyVoucherLine            = copyVoucherLine;
window.moveLine                   = moveLine;
window.updateVoucherTotals        = updateVoucherTotals;
window.newVoucherForm             = newVoucherForm;
window.loadVoucherForEdit         = loadVoucherForEdit;
window.persistVoucher             = persistVoucher;
window.applyTemplate              = applyTemplate;
window.saveVoucherAsTemplate      = saveVoucherAsTemplate;
window.bindVoucherForm            = bindVoucherForm;

console.log('✅ [modules/vouchers/form.js] loaded — complete');
