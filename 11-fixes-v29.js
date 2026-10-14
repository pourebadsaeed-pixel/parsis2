/* پارسیس — پچ فیکس: تسهیلات، خوش‌آمدگویی، تقویم */
'use strict';

/* =====================================================================
   ★ بخش ۰: پایه — بارگذاری فونت Btitr
   ===================================================================== */
(function loadBtitrFont() {
    if (document.getElementById('btitr-font')) return;
    var link = document.createElement('link');
    link.id = 'btitr-font';
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css';
    document.head.appendChild(link);
    var style = document.createElement('style');
    style.textContent =
        '@font-face { font-family: "Btitr"; src: local("B Titr"), local("BTitrBold"), local("B Titr Bold"); font-weight: 900; }' +
        '.btitr, .btitr * { font-family: "Btitr", "B Titr", Tahoma, sans-serif !important; font-weight: 900 !important; }';
    document.head.appendChild(style);
})();

/* =====================================================================
   ★ بخش ۱: رفع ذخیره معین تسهیلات + حفظ اقساط
   ===================================================================== */

function loadFacilityIntoForm_Enhanced(f) {
    currentFacilityId = f.id;
    currentInstallments = JSON.parse(JSON.stringify(f.installments || []));

    document.getElementById('fc-id').value = f.id;
    document.getElementById('fc-name').value = f.name || '';
    document.getElementById('fc-category').value = f.category || 'facility';
    document.getElementById('fc-bank').value = f.bankId || '';
    document.getElementById('fc-date').value = f.date || '';
    document.getElementById('fc-initial').value = f.initial ? formatRaw(f.initial) : '';
    document.getElementById('fc-paid').value = f.paid ? formatRaw(f.paid) : '';
    document.getElementById('fac-installments-card').style.display = 'none';

    if (typeof window._refreshFacilityMoein === 'function') window._refreshFacilityMoein();
    var sel = document.getElementById('fc-moein');
    if (sel) sel.value = f.moeinId || '';
}

/* ★ Override کامل saveFacility — با حفظ moeinId و اقساط */
function saveFacilityEnhanced() {
    var id = document.getElementById('fc-id').value;
    var name = document.getElementById('fc-name').value.trim();
    if (!name) { alert('نام اجباری.'); return; }
    var init = parseMoney(normalizeDigits(document.getElementById('fc-initial').value));
    if (!init) { alert('مبلغ اولیه اجباری.'); return; }

    var ins = currentInstallments || [];
    var tp = ins.reduce(function(s, x) {
        return s + (x.status === 'paid' ? Number(x.amount || 0) : 0);
    }, 0);
    var ap = ins.length > 0 && ins.every(function(x) { return x.status === 'paid'; });

    var moeinSel = document.getElementById('fc-moein');
    var moeinId = moeinSel ? moeinSel.value : '';

    var o = {
        id: id || uid(),
        name: name,
        category: document.getElementById('fc-category').value,
        bankId: document.getElementById('fc-bank').value,
        date: normalizeDigits(document.getElementById('fc-date').value),
        initial: init,
        paid: tp,
        installments: JSON.parse(JSON.stringify(ins)),
        status: ap ? 'settled' : 'active',
        moeinId: moeinId
    };

    var l = DB.load('facilities', []);
    if (id) {
        var found = false;
        for (var i = 0; i < l.length; i++) {
            if (l[i].id === id) { l[i] = o; found = true; break; }
        }
        if (!found) l.push(o);
    } else {
        l.push(o);
    }
    DB.save('facilities', l);
    showToast('✅ تسهیلات ذخیره شد.');
    clearFacForm();
    renderFacilitiesList();
    document.querySelector('[data-tab="fac-list"]').click();
    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();
}
window.saveFacilityEnhanced = saveFacilityEnhanced;

/* جایگزینی دکمه‌های save-fac و load با نسخه تقویت‌شده */
(function patchFacilityButtons() {
    function rebind() {
        var btn = document.getElementById('save-fac');
        if (!btn || btn.dataset.patched === '1') return;
        btn.dataset.patched = '1';
        var newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', saveFacilityEnhanced);

        var newBtn2 = document.getElementById('new-fac');
        if (newBtn2) newBtn2.dataset.patched = '1';
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(rebind, 1500); });
    } else {
        setTimeout(rebind, 1500);
    }
})();

/* ★ Override loadFacilityIntoForm و loadFacilityForInstallments */
(function patchFacilityLoad() {
    function apply() {
        if (typeof window.loadFacilityIntoForm === 'function') {
            window.loadFacilityIntoForm = loadFacilityIntoForm_Enhanced;
        }
        var _origIns = window.loadFacilityForInstallments;
        if (typeof _origIns === 'function') {
            window.loadFacilityForInstallments = function(f) {
                _origIns.apply(this, arguments);
                if (typeof window._refreshFacilityMoein === 'function') window._refreshFacilityMoein();
                var sel = document.getElementById('fc-moein');
                if (sel) sel.value = f.moeinId || '';
            };
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 1800); });
    } else {
        setTimeout(apply, 1800);
    }
})();

/* =====================================================================
   ★ بخش ۲: پرداخت قسط با انتخاب دستی معین در صورت عدم وجود معین
   ===================================================================== */
async function payInstallmentV2(facilityId, installmentIdx) {
    var facilities = DB.load('facilities', []);
    var f = facilities.find(function(x) { return x.id === facilityId; });
    if (!f) { alert('تسهیلات یافت نشد.'); return; }
    var ins = (f.installments || [])[installmentIdx];
    if (!ins) { alert('قسط یافت نشد.'); return; }
    if (ins.status === 'paid') { alert('این قسط قبلاً پرداخت شده است.'); return; }
    if (!ins.amount || !ins.date) { alert('تاریخ و مبلغ قسط باید مشخص باشد.'); return; }
    if (!f.bankId) { alert('ابتدا بانک تسهیلات را در فرم تعریف تسهیلات انتخاب کنید.'); return; }

    var accounts = DB.load('accounts', []);
    var bankMoein = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
    if (!bankMoein) { alert('معین بانک در چارت تعریف نشده.'); return; }

    var facMoeinId = f.moeinId || '';
    var facDetailId = '';
    if (!facMoeinId) {
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        if (leaves.length === 0) { alert('چارت حساب خالی است.'); return; }
        var opts = leaves.map(function(a, i) { return (i + 1) + '. ' + a.code + ' — ' + a.name; }).join('\n');
        var ans = prompt(
            '⚠️ این تسهیلات معین ندارد.\n' +
            'معین بدهکار (سمت تسهیلات) را انتخاب کنید:\n\n' +
            opts + '\n\nشماره:', '1'
        );
        if (!ans) return;
        var idx = Number(normalizeDigits(ans)) - 1;
        if (isNaN(idx) || idx < 0 || idx >= leaves.length) { alert('نامعتبر.'); return; }
        facMoeinId = leaves[idx].id;

        facilities.forEach(function(ff) {
            if (ff.id === facilityId) ff.moeinId = facMoeinId;
        });
        DB.save('facilities', facilities);

        var facAcc = accounts.find(function(a) { return a.id === facMoeinId; });
        if (facAcc && facAcc.links && facAcc.links.length > 0) {
            if (facAcc.links.indexOf('facility') !== -1) {
                facDetailId = facilityId;
            } else if (facAcc.links.length === 1) {
                var lt = facAcc.links[0];
                var items = getLinkedItems(lt);
                if (items.length > 0) {
                    var itOpts = items.map(function(it, i) { return (i+1) + '. ' + getLinkedItemLabel(lt, it); }).join('\n');
                    var ans2 = prompt('تفصیلی ' + linkTypeName(lt) + ' برای این معین:\n\n' + itOpts + '\n\nشماره:');
                    if (ans2) {
                        var i2 = Number(normalizeDigits(ans2)) - 1;
                        if (i2 >= 0 && i2 < items.length) facDetailId = items[i2].id;
                    }
                }
            }
        }
    } else {
        var facAcc2 = accounts.find(function(a) { return a.id === facMoeinId; });
        if (facAcc2 && facAcc2.links && facAcc2.links.indexOf('facility') !== -1) {
            facDetailId = facilityId;
        } else if (facAcc2 && facAcc2.links && facAcc2.links.length > 0) {
            var lt2 = facAcc2.links[0];
            var items2 = getLinkedItems(lt2);
            if (items2.length > 0) {
                var itOpts2 = items2.map(function(it, i) { return (i+1) + '. ' + getLinkedItemLabel(lt2, it); }).join('\n');
                var ans3 = prompt('تفصیلی ' + linkTypeName(lt2) + ':\n\n' + itOpts2 + '\n\nشماره:');
                if (ans3) {
                    var i3 = Number(normalizeDigits(ans3)) - 1;
                    if (i3 >= 0 && i3 < items2.length) facDetailId = items2[i3].id;
                }
            }
        }
    }

    var bank = DB.load('bankAccounts', []).find(function(b) { return b.id === f.bankId; });
    var bankTitle = bank ? (bank.bank + ' — ' + (bank.account || '')) : '—';
    var facAcc3 = accounts.find(function(a) { return a.id === facMoeinId; });
    var msg = '📋 تأیید پرداخت قسط\n\n' +
        'تاریخ: ' + ins.date + '\n' +
        'مبلغ: ' + formatMoney(ins.amount) + ' ' + currencyLabel() + '\n' +
        'بانک: ' + bankTitle + '\n' +
        'معین بدهکار: ' + (facAcc3 ? facAcc3.code + ' — ' + facAcc3.name : '—') + '\n' +
        (facDetailId ? 'تفصیلی: ' + getDetailLabel('facility', facDetailId) + '\n' : '') +
        '\nسند خودکار ساخته شود؟';
    if (!confirm(msg)) return;

    var dv = validateDateInActivePeriod(ins.date);
    if (!dv.ok) { alert('⚠️ ' + dv.msg); return; }

    var description = 'پرداخت قسط ' + ins.date + ' — ' + f.name;
    var lines = [];

    var facDetails = {};
    if (facDetailId) facDetails.facility = facDetailId;
    lines.push({
        id: uid(),
        account: facMoeinId,
        details: facDetails,
        debit: Number(ins.amount) || 0,
        credit: 0,
        description: description
    });

    lines.push({
        id: uid(),
        account: bankMoein,
        details: { bank: f.bankId },
        debit: 0,
        credit: Number(ins.amount) || 0,
        description: description,
        locked: true
    });

    var vouchers = DB.load('vouchers', []);
    var v = {
        id: uid(),
        number: (typeof getNextVoucherNumberForPeriod === 'function')
                ? getNextVoucherNumberForPeriod(state.activePeriodId || '')
                : String(vouchers.length + 1),
        date: ins.date,
        type: 'general',
        periodId: state.activePeriodId || '',
        desc: description,
        lines: lines,
        status: 'draft'
    };

    facilities.forEach(function(ff) {
        if (ff.id === facilityId) {
            ff.installments[installmentIdx].status = 'paid';
            ff.installments[installmentIdx].systemPaid = true;
            ff.installments[installmentIdx].systemVoucherId = v.id;
            ff.installments[installmentIdx].paidAt = Date.now();
            var tp2 = ff.installments.reduce(function(s, x) {
                return s + (x.status === 'paid' ? Number(x.amount || 0) : 0);
            }, 0);
            ff.paid = tp2;
            var allPaid = ff.installments.every(function(x) { return x.status === 'paid'; });
            ff.status = allPaid ? 'settled' : 'active';
        }
    });
    DB.save('facilities', facilities);
    vouchers.push(v);
    DB.save('vouchers', vouchers);

    currentInstallments = JSON.parse(JSON.stringify(
        facilities.find(function(ff) { return ff.id === facilityId; }).installments
    ));
    if (typeof renderInstallments === 'function') renderInstallments();

    showToast('✅ قسط پرداخت شد — سند خودکار ساخته شد.');
    if (typeof renderFacilitiesList === 'function') renderFacilitiesList();
    if (typeof updateHomeWidgets === 'function') updateHomeWidgets();

    if (typeof loadVoucherForEdit === 'function') loadVoucherForEdit(v);
    if (typeof goToPage === 'function') goToPage('voucher-new');
}
window.payInstallment = payInstallmentV2;

/* ★ اصلاح دکمه‌های پرداخت قسط در renderInstallments */
(function patchInstallmentPayButton() {
    function apply() {
        var _orig = window.renderInstallments;
        if (typeof _orig !== 'function') return;
        window.renderInstallments = function() {
            _orig.apply(this, arguments);
            setTimeout(function() {
                var box = document.getElementById('fac-installments');
                if (!box) return;
                var rows = box.querySelectorAll('.installment-row');
                rows.forEach(function(row, idx) {
                    if (row.querySelector('.inst-pay-btn')) return;
                    var ins = currentInstallments[idx];
                    if (!ins) return;
                    if (ins.status === 'paid') {
                        var tag = document.createElement('div');
                        tag.style.cssText = 'font-size:0.72rem;color:#059669;font-weight:800;padding:4px 10px;background:#d1fae5;border-radius:9px';
                        tag.textContent = '✅ پرداخت‌شده' + (ins.systemPaid ? ' (سیستمی)' : '');
                        row.appendChild(tag);
                        return;
                    }
                    var payBtn = document.createElement('button');
                    payBtn.type = 'button';
                    payBtn.className = 'inst-pay-btn';
                    payBtn.textContent = '💳 پرداخت';
                    payBtn.style.cssText = 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;padding:7px 12px;font-family:inherit;font-size:0.78rem;font-weight:800;cursor:pointer';
                    payBtn.addEventListener('click', function() {
                        payInstallmentV2(currentFacilityId, idx);
                    });
                    row.appendChild(payBtn);
                });
            }, 80);
        };
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 2000); });
    } else {
        setTimeout(apply, 2000);
    }
})();

/* =====================================================================
   ★ بخش ۳: خوش‌آمدگویی — قبل از برنامه + فونت Btitr + تاریخ میلادی روز-ماه
   ===================================================================== */

/* حذف نسخه قبلی خوش‌آمد (اگر وجود دارد) */
(function removeOldWelcome() {
    var old = document.getElementById('welcome-overlay');
    if (old) old.parentNode.removeChild(old);
    try { sessionStorage.removeItem('parsis.welcomeShown'); } catch(e) {}
})();

/* ساخت خوش‌آمد جدید + هک نمایش زودهنگام */
(function buildWelcomeV2() {
    function hijackBody() {
        if (document.body) {
            document.body.style.visibility = 'hidden';
        }
    }
    hijackBody();

    function buildOverlay() {
        if (document.getElementById('welcome-overlay')) return;
        var el = document.createElement('div');
        el.id = 'welcome-overlay';
        el.className = 'welcome-overlay btitr';
        el.style.visibility = 'visible';
        el.innerHTML = ''
            + '<div class="welcome-top">'
            +   '<div class="welcome-date" id="welcome-date-jalali">—</div>'
            +   '<div class="welcome-date-greg" id="welcome-date-greg">—</div>'
            + '</div>'
            + '<div class="welcome-center">'
            +   '<div class="welcome-logo">📊</div>'
            +   '<h1 class="welcome-title">پارسیس</h1>'
            +   '<div class="welcome-subtitle">حسابداری هوشمند</div>'
            +   '<div class="welcome-version">نسخه ' + toFa(APP_VERSION) + '</div>'
            + '</div>'
            + '<div class="welcome-chart-wrap">'
            +   '<div class="welcome-chart-title">💹 خلاصهٔ دورهٔ مالی فعال</div>'
            +   '<div class="welcome-chart" id="welcome-chart"></div>'
            +   '<div class="welcome-legend" id="welcome-legend"></div>'
            + '</div>'
            + '<div class="welcome-hint">👆 برای ورود کلیک کنید</div>';
        document.body.appendChild(el);

        el.addEventListener('click', function() {
            el.classList.add('welcome-out');
            setTimeout(function() {
                document.body.style.visibility = 'visible';
                el.style.display = 'none';
            }, 500);
        });
    }

    function renderDate() {
        var d = new Date();
        var j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
        var jEl = document.getElementById('welcome-date-jalali');
        var gEl = document.getElementById('welcome-date-greg');
        if (jEl) {
            jEl.textContent = WEEKDAYS_FA[d.getDay()] + '، ' +
                toFa(j[2]) + ' ' + JALALI_MONTHS[j[1] - 1] + ' ' + toFa(j[0]);
        }
        if (gEl) {
            gEl.textContent = d.getDate() + ' ' + GREG_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
        }
    }

    function computePeriodStats() {
        var accounts = DB.load('accounts', []);
        var vouchers = DB.load('vouchers', []).filter(function(v) {
            if (v.status !== 'approved') return false;
            if (state.activePeriodId && v.periodId !== state.activePeriodId) return false;
            return true;
        });
        var income = 0, expense = 0;
        vouchers.forEach(function(v) {
            (v.lines || []).forEach(function(l) {
                if (!l.account) return;
                var rootId = getRootAccountId(l.account, accounts);
                var root = accounts.find(function(a) { return a.id === rootId; });
                if (!root) return;
                var code = String(root.code || '').charAt(0);
                var d = Number(l.debit) || 0;
                var c = Number(l.credit) || 0;
                if (code === '4') income += c;
                else if (code === '5') expense += d;
            });
        });
        return { income: income, expense: expense };
    }

    function renderChart() {
        var stats = computePeriodStats();
        var box = document.getElementById('welcome-chart');
        var legend = document.getElementById('welcome-legend');
        if (!box || !legend) return;
        var total = stats.income + stats.expense;
        if (total === 0) {
            box.innerHTML = '<div style="text-align:center;color:rgba(255,255,255,0.7);padding:20px;font-size:0.85rem">در دورهٔ فعال، درآمد/هزینه‌ای ثبت نشده است.</div>';
            legend.innerHTML = '';
            return;
        }
        var incomePct = stats.income / total * 100;
        var expensePct = stats.expense / total * 100;

        var size = 240, r = 90, cx = size / 2, cy = size / 2;
        var circ = 2 * Math.PI * r;
        var incLen = incomePct / 100 * circ;

        var svg = '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">';
        svg += '<defs>';
        svg += '<linearGradient id="wg-income" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#059669"/></linearGradient>';
        svg += '<linearGradient id="wg-expense" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
        svg += '</defs>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="32"/>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-expense)" stroke-width="32" stroke-dasharray="' + circ + ' ' + circ + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dashoffset:' + circ + '; animation: wgDraw 1s ease forwards; animation-delay: 0.3s; --dash-target: 0;"/>';
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="url(#wg-income)" stroke-width="32" stroke-dasharray="' + incLen + ' ' + (circ - incLen) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')" style="stroke-dashoffset:0; opacity:0; animation: wgFadeIn 0.5s ease forwards; animation-delay: 1.3s;"/>';
        svg += '<text x="' + cx + '" y="' + (cy - 6) + '" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.7)" font-family="Btitr, Tahoma">مجموع</text>';
        svg += '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="18" font-weight="bold" fill="#fff" font-family="Btitr, Tahoma" style="opacity:0; animation: wgFadeIn 0.5s ease forwards; animation-delay: 2.5s">' + toFa(total.toLocaleString('fa-IR')) + '</text>';
        svg += '</svg>';
        box.innerHTML = svg;

        legend.innerHTML = ''
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:1s">'
            +   '<span class="wl-color in"></span>'
            +   '<span class="wl-label">💰 درآمد</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.income) + '</span>'
            +   '<span class="wl-pct">' + toFa(incomePct.toFixed(1)) + '٪</span>'
            + '</div>'
            + '<div class="wl-item" style="opacity:0;animation:wgSlide 0.5s ease forwards;animation-delay:2s">'
            +   '<span class="wl-color out"></span>'
            +   '<span class="wl-label">💸 هزینه</span>'
            +   '<span class="wl-amount">' + formatMoney(stats.expense) + '</span>'
            +   '<span class="wl-pct">' + toFa(expensePct.toFixed(1)) + '٪</span>'
            + '</div>';
    }

    function injectStyle() {
        if (document.getElementById('welcome-v2-style')) return;
        var s = document.createElement('style');
        s.id = 'welcome-v2-style';
        s.textContent = ''
        + '.welcome-overlay { position:fixed !important; inset:0 !important; z-index:999999 !important; '
        +   'background:radial-gradient(circle at 25% 20%, #1e3a8a 0%, #0f172a 45%, #4c1d95 100%) !important; '
        +   'display:flex !important; flex-direction:column !important; align-items:center !important; justify-content:space-between !important; '
        +   'padding:32px 16px !important; cursor:pointer !important; direction:rtl !important; '
        +   'opacity:1 !important; transition:opacity 0.5s, transform 0.6s !important; '
        +   'font-family: "Btitr", "B Titr", Tahoma, sans-serif !important; font-weight: 900 !important; }'
        + '.welcome-overlay.welcome-out { opacity:0 !important; transform:scale(1.05) !important; pointer-events:none !important; }'
        + '.welcome-overlay::before { content:"" !important; position:absolute !important; inset:0 !important; '
        +   'background-image:radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0) !important; '
        +   'background-size:32px 32px !important; opacity:0.5 !important; pointer-events:none !important; }'
        + '.welcome-top { text-align:center !important; color:rgba(255,255,255,0.95) !important; z-index:1 !important; '
        +   'animation:wgSlideDown 0.7s ease both !important; }'
        + '.welcome-date { font-size:1.15rem !important; font-weight:900 !important; letter-spacing:0.3px !important; }'
        + '.welcome-date-greg { font-size:0.85rem !important; color:rgba(255,255,255,0.7) !important; margin-top:4px !important; }'
        + '.welcome-center { text-align:center !important; color:#fff !important; z-index:1 !important; }'
        + '.welcome-logo { font-size:5rem !important; line-height:1 !important; filter:drop-shadow(0 8px 30px rgba(129,140,248,0.6)) !important; '
        +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both !important; animation-delay:0.2s !important; }'
        + '.welcome-title { font-size:3.4rem !important; font-weight:900 !important; letter-spacing:-1px !important; margin-top:14px !important; '
        +   'background:linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #f0abfc 100%) !important; '
        +   '-webkit-background-clip:text !important; background-clip:text !important; -webkit-text-fill-color:transparent !important; '
        +   'animation:wgPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) both !important; animation-delay:0.5s !important; }'
        + '.welcome-subtitle { font-size:1.1rem !important; color:rgba(255,255,255,0.8) !important; margin-top:4px !important; '
        +   'animation:wgPop 0.7s ease both !important; animation-delay:0.8s !important; }'
        + '.welcome-version { font-size:0.8rem !important; color:rgba(255,255,255,0.5) !important; margin-top:6px !important; '
        +   'animation:wgPop 0.7s ease both !important; animation-delay:1s !important; }'
        + '.welcome-chart-wrap { width:min(420px, 92vw) !important; text-align:center !important; z-index:1 !important; '
        +   'animation:wgFadeIn 0.8s ease both !important; animation-delay:1.4s !important; }'
        + '.welcome-chart-title { color:rgba(255,255,255,0.9) !important; font-weight:900 !important; font-size:0.95rem !important; margin-bottom:10px !important; }'
        + '.welcome-chart { display:flex !important; justify-content:center !important; margin-bottom:14px !important; }'
        + '.welcome-legend { display:flex !important; flex-direction:column !important; gap:8px !important; }'
        + '.wl-item { display:grid !important; grid-template-columns:16px 1fr auto auto !important; gap:10px !important; '
        +   'align-items:center !important; padding:10px 14px !important; border-radius:14px !important; '
        +   'background:rgba(255,255,255,0.08) !important; backdrop-filter:blur(10px) !important; '
        +   'border:1px solid rgba(255,255,255,0.12) !important; color:#fff !important; font-size:0.9rem !important; '
        +   'font-weight: 900 !important; }'
        + '.wl-color { width:14px !important; height:14px !important; border-radius:4px !important; }'
        + '.wl-color.in { background:linear-gradient(135deg,#34d399,#059669) !important; }'
        + '.wl-color.out { background:linear-gradient(135deg,#f87171,#dc2626) !important; }'
        + '.wl-label { font-weight:900 !important; text-align:right !important; }'
        + '.wl-amount { font-weight:900 !important; font-variant-numeric:tabular-nums !important; direction:ltr !important; }'
        + '.wl-pct { background:rgba(255,255,255,0.15) !important; padding:3px 10px !important; border-radius:10px !important; font-weight:900 !important; font-size:0.78rem !important; }'
        + '.welcome-hint { color:rgba(255,255,255,0.75) !important; font-size:0.95rem !important; font-weight:900 !important; '
        +   'animation:wgPulse 2s ease-in-out infinite !important; z-index:1 !important; }'
        + '@keyframes wgSlideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:none; } }'
        + '@keyframes wgPop { from { opacity:0; transform:scale(0.6); } to { opacity:1; transform:scale(1); } }'
        + '@keyframes wgFadeIn { from { opacity:0; } to { opacity:1; } }'
        + '@keyframes wgSlide { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:none; } }'
        + '@keyframes wgPulse { 0%,100% { opacity:0.6; } 50% { opacity:1; } }'
        + '@keyframes wgDraw { to { stroke-dashoffset: var(--dash-target, 0); } }';
        document.head.appendChild(s);
    }

    function init() {
        injectStyle();
        buildOverlay();
        renderDate();
        setTimeout(renderChart, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();

/* =====================================================================
   ★ بخش ۶: ابطال کش رویدادهای تقویم هنگام تغییر داده‌ها
   ===================================================================== */
/* این بخش در فایل ۱۴ مدیریت می‌شود و نیازی به تغییر نیست */

/* =====================================================================
   ★ پایان پچ
   ===================================================================== */
(function finalBoot() {
    function boot() {
        console.log('🎉 پارسیس v29 — پچ رفع مشکلات اعمال شد (بدون dead code).');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(boot, 2000); });
    } else {
        setTimeout(boot, 2000);
    }
})();
