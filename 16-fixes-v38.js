/* =====================================================================
   پارسیس v38 — 16-fixes-v38.js
   رفع دقیق و کامل ایرادهای گزارش‌شده
   
   ★ تمیز شده در v42.1:
     • حذف fixCalendarZIndexInsideModal تکراری (در 14-calendar.js موجود است)
   ===================================================================== */
'use strict';

/* ═══════════════════════════════════════════════════════════════
   ایراد ۳-الف: ردیف فیلتر فهرست اسناد → تقویم + وضعیت
   (سلول‌های «جستجو» — نه سلول‌های داده)
   ═══════════════════════════════════════════════════════════════ */
(function fixVoucherFilterRow() {
    function buildCustomFilterRow() {
        var table = document.getElementById('voucher-table-list');
        if (!table) return;
        var filterRow = table.querySelector('tr.column-filter-row');
        if (!filterRow) return;
        if (filterRow.dataset.vCustom === '1') return;
        filterRow.dataset.vCustom = '1';

        // ستون ۱ (تاریخ): تبدیل به تقویم‌خوان
        var dateCell = filterRow.children[1];
        if (dateCell) {
            dateCell.innerHTML = '';
            var dateInp = document.createElement('input');
            dateInp.type = 'text';
            dateInp.placeholder = '📅 تاریخ';
            dateInp.readOnly = true;
            dateInp.style.cssText = 'width:100%;padding:5px 8px;border:1px solid #c8dcef;border-radius:6px;'
                + 'font-family:inherit;font-size:0.75rem;background:#fff;cursor:pointer;text-align:center;direction:ltr;box-sizing:border-box';
            dateInp.addEventListener('click', function() {
                var tmp = document.createElement('input');
                tmp.type = 'text';
                tmp.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
                tmp.addEventListener('input', function() {
                    dateInp.value = tmp.value;
                    // فیلتر کردن جدول بر اساس تاریخ
                    applyVoucherColumnFilter(1, tmp.value);
                    tmp.remove();
                });
                document.body.appendChild(tmp);
                if (typeof openCalendar === 'function') openCalendar(tmp);
            });
            dateInp.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                dateInp.value = '';
                applyVoucherColumnFilter(1, '');
            });
            dateInp.title = 'کلیک: انتخاب تاریخ • راست‌کلیک: پاک کردن';
            dateCell.appendChild(dateInp);
        }

        // ستون ۶ (وضعیت): سلکتور
        var statusCell = filterRow.children[6];
        if (statusCell) {
            statusCell.innerHTML = '';
            var sel = document.createElement('select');
            sel.style.cssText = 'width:100%;padding:5px 6px;border:1px solid #c8dcef;border-radius:6px;'
                + 'font-family:inherit;font-size:0.75rem;background:#fff;cursor:pointer;box-sizing:border-box';
            sel.innerHTML = '<option value="">همه وضعیت‌ها</option>'
                + '<option value="تأیید">✓ تأییدشده</option>'
                + '<option value="پیش‌نویس">📝 پیش‌نویس</option>';
            sel.addEventListener('change', function() {
                applyVoucherColumnFilter(6, this.value);
            });
            statusCell.appendChild(sel);
        }
    }

    function applyVoucherColumnFilter(colIdx, query) {
        var table = document.getElementById('voucher-table-list');
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        var q = normalizeDigits(String(query || '').trim().toLowerCase());
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var tds = tr.children;
            if (tds.length === 1 && tds[0].hasAttribute('colspan')) return;
            if (!tds[colIdx]) return;
            var txt = normalizeDigits((tds[colIdx].textContent || '').trim().toLowerCase());
            tr.style.display = (!q || txt.indexOf(q) !== -1) ? '' : 'none';
        });
    }

    // اجرا در هر رندر مجدد
    setInterval(buildCustomFilterRow, 700);
})();

/* ═══════════════════════════════════════════════════════════════
   ایراد ۴: جمع پایانی تراز + گردش وجه نقد بر اساس ردیف‌های فیلترشده
   ═══════════════════════════════════════════════════════════════ */
(function fixFilteredTotals() {
    function parseNumTxt(txt) {
        var t = normalizeDigits(String(txt || ''));
        // اگر پرانتز دارد → منفی
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d\-]/g, '')) || 0;
        return neg ? -v : v;
    }

    /* ---------- تراز آزمایشی ---------- */
    function recalcTrial() {
        var box = document.getElementById('rt-result');
        if (!box) return;
        var tbody = box.querySelector('tbody');
        if (!tbody) return;
        var tfoot = box.querySelector('tfoot');
        if (!tfoot) return;
        var tD = 0, tC = 0, tMD = 0, tMC = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 6) return;
            tD  += parseNumTxt(c[2].textContent);
            tC  += parseNumTxt(c[3].textContent);
            tMD += parseNumTxt(c[4].textContent);
            tMC += parseNumTxt(c[5].textContent);
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 6) return;
        fc[2].innerHTML = moneyHtml(tD);
        fc[3].innerHTML = moneyHtml(tC);
        fc[4].innerHTML = moneyHtml(tMD);
        fc[5].innerHTML = moneyHtml(tMC);
    }

    /* ---------- گردش وجه نقد (جدول اصلی) ---------- */
    function recalcCfd() {
        var box = document.getElementById('cfd-result');
        if (!box) return;
        // جدول اصلی cfd
        var mainTable = box.querySelector('table#cfd-table');
        if (!mainTable) return;
        var tbody = mainTable.querySelector('tbody');
        var tfoot = mainTable.querySelector('tfoot');
        if (!tbody || !tfoot) return;
        var tIn = 0, tOut = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            if (tr.style.display === 'none') return;
            var c = tr.querySelectorAll('td');
            if (c.length < 7) return;
            tIn  += parseNumTxt(c[2].textContent);
            tOut += parseNumTxt(c[3].textContent);
        });
        var fc = tfoot.querySelectorAll('td');
        if (fc.length < 7) return;
        fc[2].innerHTML = moneyHtml(tIn);
        fc[3].innerHTML = moneyHtml(tOut);
        fc[4].innerHTML = moneyHtml(tIn - tOut);
        // درصد در ستون ۷ هم ۱۰۰٪ یا نسبت به جمع
        fc[6].innerHTML = toFa('100.00') + '٪';
    }

    /* ---------- پچ applyColumnFiltersToTable ---------- */
    function patchFilterFn() {
        if (typeof window.applyColumnFiltersToTable !== 'function') { setTimeout(patchFilterFn, 700); return; }
        if (window._acftPatched) return;
        window._acftPatched = true;
        var _orig = window.applyColumnFiltersToTable;
        window.applyColumnFiltersToTable = function(tid) {
            _orig.apply(this, arguments);
            setTimeout(function() {
                if (tid === 'rt-table') recalcTrial();
                else if (tid === 'cfd-table') recalcCfd();
            }, 30);
        };
    }

    /* ---------- MutationObserver روی tbody ---------- */
    function observeTable(tableId, cb) {
        var table = document.getElementById(tableId);
        if (!table) return;
        var tbody = table.querySelector('tbody');
        if (!tbody) return;
        if (tbody.dataset.totObs === '1') return;
        tbody.dataset.totObs = '1';
        var obs = new MutationObserver(function() { cb(); });
        obs.observe(tbody, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true });
    }

    setInterval(function() {
        observeTable('rt-table', recalcTrial);
        observeTable('cfd-table', recalcCfd);
    }, 1500);

    // گوش دادن به تغییر چک‌باکس و دکمه اجرا
    document.addEventListener('change', function(e) {
        if (e.target && e.target.id === 'rt-only-balance') setTimeout(recalcTrial, 200);
    }, true);
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'rt-run') setTimeout(recalcTrial, 400);
        if (e.target && e.target.id === 'cfd-run') setTimeout(recalcCfd, 400);
    }, true);

    window._recalcTrial = recalcTrial;
    window._recalcCfd = recalcCfd;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(patchFilterFn, 1200); });
    } else {
        setTimeout(patchFilterFn, 1200);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   ایراد ۶ (سابق): دو ستون جدید در خلاصه تسهیلات
   ═══════════════════════════════════════════════════════════════ */
(function augmentFacilitySummary() {
    function computeFacilityBalances() {
        var facilities = DB.load('facilities', []);
        var vouchers = DB.load('vouchers', []);
        var map = {};
        facilities.forEach(function(f) {
            var bal = 0;
            if (f.moeinId) {
                vouchers.forEach(function(v) {
                    if (v.status !== 'approved') return;
                    (v.lines || []).forEach(function(l) {
                        if (l.account !== f.moeinId) return;
                        if (l.details && l.details.facility === f.id) {
                            bal += (Number(l.credit) || 0) - (Number(l.debit) || 0);
                        }
                    });
                });
            }
            map[f.id] = bal;
        });
        return map;
    }

    function parseNumTxt(txt) {
        var t = normalizeDigits(String(txt || ''));
        var neg = /\(.*\)/.test(t);
        var v = Number(t.replace(/[^\d]/g, '')) || 0;
        return neg ? -v : v;
    }

    function augment() {
        var table = document.getElementById('rf-table');
        if (!table) return;
        if (table.dataset.augV38 === '1') return;
        table.dataset.augV38 = '1';

        var headerRow = table.querySelector('thead tr');
        if (!headerRow) return;
        var ths = Array.from(headerRow.querySelectorAll('th'));

        // پیدا کردن index ستون "مبلغ باقی"
        var remIdx = -1;
        ths.forEach(function(th, i) {
            if ((th.textContent || '').indexOf('مبلغ باقی') !== -1 && remIdx === -1) remIdx = i;
        });
        if (remIdx === -1) remIdx = 5;

        var balMap = computeFacilityBalances();
        var facilities = DB.load('facilities', []);
        var hide = getHideState('rf');

        // هدرها
        var thA = document.createElement('th');
        thA.textContent = 'مانده حسابداری';
        thA.style.background = 'linear-gradient(180deg,#dbeafe,#bfdbfe)';
        thA.style.color = '#1e40af';
        var thB = document.createElement('th');
        thB.textContent = 'مغایرت با حسابداری';
        thB.style.background = 'linear-gradient(180deg,#fef3c7,#fde68a)';
        thB.style.color = '#92400e';

        var refTh = ths[remIdx];
        if (refTh) {
            refTh.parentNode.insertBefore(thA, refTh.nextSibling);
            refTh.parentNode.insertBefore(thB, refTh.nextSibling);
        }

        // ردیف‌ها
        var tbody = table.querySelector('tbody');
        var totalBal = 0, totalVar = 0;
        tbody.querySelectorAll('tr').forEach(function(tr) {
            var cells = tr.querySelectorAll('td');
            if (cells.length < 6) return;
            var name = (cells[0].textContent || '').trim();
            var f = facilities.find(function(x) { return x.name === name; });
            if (!f) {
                // سلول‌های خالی
                var e1 = document.createElement('td'); e1.className = 'num'; e1.textContent = '—';
                var e2 = document.createElement('td'); e2.className = 'num'; e2.textContent = '—';
                var rc = cells[remIdx];
                rc.parentNode.insertBefore(e1, rc.nextSibling);
                rc.parentNode.insertBefore(e2, rc.nextSibling);
                return;
            }
            var remTxt = cells[remIdx] ? cells[remIdx].textContent : '';
            var rem = (remTxt && remTxt !== '—') ? parseNumTxt(remTxt) : 0;
            var bal = balMap[f.id] || 0;
            var variance = bal - rem;
            totalBal += bal; totalVar += variance;

            var tdA = document.createElement('td');
            tdA.className = 'num';
            tdA.style.color = '#1e40af';
            tdA.style.fontWeight = '800';
            tdA.innerHTML = hide ? '—' : (typeof moneyHtml === 'function' ? moneyHtml(bal) : formatMoney(bal));

            var tdB = document.createElement('td');
            tdB.className = 'num';
            tdB.style.fontWeight = '800';
            tdB.style.color = Math.abs(variance) > 1 ? '#dc2626' : '#059669';
            tdB.innerHTML = hide ? '—' : (typeof moneyHtml === 'function' ? moneyHtml(variance) : formatMoney(variance));

            var refCell = cells[remIdx];
            if (refCell) {
                refCell.parentNode.insertBefore(tdA, refCell.nextSibling);
                refCell.parentNode.insertBefore(tdB, refCell.nextSibling);
            }
        });

        // فوتر
        var tfoot = table.querySelector('tfoot tr');
        if (tfoot) {
            var fcs = tfoot.querySelectorAll('td');
            if (fcs.length > remIdx) {
                var fcA = document.createElement('td');
                fcA.className = 'num';
                fcA.style.color = '#1e40af';
                fcA.innerHTML = hide ? '—' : moneyHtml(totalBal);
                var fcB = document.createElement('td');
                fcB.className = 'num';
                fcB.style.color = Math.abs(totalVar) > 1 ? '#dc2626' : '#059669';
                fcB.innerHTML = hide ? '—' : moneyHtml(totalVar);
                var refFc = fcs[remIdx];
                refCell = refFc;
                if (refFc) {
                    refFc.parentNode.insertBefore(fcA, refFc.nextSibling);
                    refFc.parentNode.insertBefore(fcB, refFc.nextSibling);
                }
            }
        }
    }

    // trigger در هر بار رندر rf-result
    var lastHtml = '';
    setInterval(function() {
        var box = document.getElementById('rf-result');
        if (!box) return;
        var cur = box.innerHTML.length + '_' + box.innerHTML.substring(0, 100);
        if (cur !== lastHtml) {
            lastHtml = cur;
            setTimeout(augment, 100);
        }
    }, 800);
})();

/* ═══════════════════════════════════════════════════════════════
   درخواست: تاریخ پیش‌فرض همه گزارش‌ها = دوره مالی فعال
   ═══════════════════════════════════════════════════════════════ */
(function defaultAllReportDates() {
    function getActivePeriod() {
        var periods = DB.load('fiscalPeriods', []);
        return periods.find(function(p) { return p.id === state.activePeriodId; });
    }
    function apply() {
        var ap = getActivePeriod();
        if (!ap) return;
        var pairs = [
            ['cf-from', 'cf-to'],
            ['cfd-from', 'cfd-to'],
            ['ra-from', 'ra-to'],
            ['rt-from', 'rt-to'],
            ['rff-from', 'rff-to'],
            ['rc-from1', 'rc-to1'],
            ['rc-from2', 'rc-to2']
        ];
        pairs.forEach(function(pair) {
            var f = document.getElementById(pair[0]);
            var t = document.getElementById(pair[1]);
            if (f && !f.value) f.value = ap.from;
            if (t && !t.value) t.value = ap.to;
        });
    }
    // اجرا هنگام ورود به صفحات گزارش
    var lastPage = '';
    setInterval(function() {
        var active = document.querySelector('.page.active');
        if (!active) return;
        var id = active.id;
        if (id === lastPage) return;
        lastPage = id;
        if (id && id.indexOf('report-') === 0) {
            apply();
        }
    }, 400);
    // همچنین در init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { setTimeout(apply, 2000); });
    } else {
        setTimeout(apply, 2000);
    }
})();

/* ═══════════════════════════════════════════════════════════════
   درخواست ۹: درگ رویداد در نمای روز تقویم
   ═══════════════════════════════════════════════════════════════ */
(function dayViewDragDrop() {
    function setup() {
        var page = document.getElementById('page-jalali-calendar');
        if (!page) return;
        var dayGrid = page.querySelector('.calg-wgrid.day');
        if (!dayGrid) return;

        // سلول‌های drop
        dayGrid.querySelectorAll('.calg-wcell').forEach(function(cell) {
            if (cell.dataset.drReady === '1') return;
            cell.dataset.drReady = '1';
            cell.addEventListener('dragover', function(e) {
                e.preventDefault();
                cell.style.background = '#dbeafe';
                cell.style.outline = '2px dashed #3b82f6';
            });
            cell.addEventListener('dragleave', function() {
                cell.style.background = '';
                cell.style.outline = '';
            });
            cell.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                cell.style.background = '';
                cell.style.outline = '';
                var evId = e.dataTransfer.getData('text/plain');
                if (!evId) return;
                var newHour = Number(cell.getAttribute('data-hour'));
                var newDate = cell.getAttribute('data-date');
                if (!newHour || !newDate) return;

                var userEvs = DB.load('calendarUserEvents', []);
                var idx = -1;
                for (var i = 0; i < userEvs.length; i++) {
                    if (userEvs[i].id === evId) { idx = i; break; }
                }
                if (idx === -1) { showToast('⚠️ فقط رویدادهای شخصی قابل جابجایی هستند'); return; }

                // نگه‌داشتن دقیقه‌ی قبلی
                var oldTime = userEvs[idx].time || '00:00';
                var minutes = '00';
                var parts = oldTime.split(':');
                if (parts.length === 2) minutes = parts[1] || '00';
                userEvs[idx].time = pad2(newHour) + ':' + minutes;
                userEvs[idx].date = newDate;
                DB.save('calendarUserEvents', userEvs);
                showToast('🕒 رویداد به ساعت ' + toFa(newHour) + ':' + toFa(minutes) + ' منتقل شد');
                if (typeof calRender === 'function') calRender();
            });
        });

        // المان‌های رویداد → draggable
        dayGrid.querySelectorAll('.wev').forEach(function(ev) {
            if (ev.dataset.drSrc === '1') return;
            ev.dataset.drSrc = '1';
            ev.setAttribute('draggable', 'true');
            ev.style.cursor = 'grab';
            ev.addEventListener('dragstart', function(e) {
                var id = ev.getAttribute('data-ev');
                if (id) {
                    e.dataTransfer.setData('text/plain', id);
                    e.dataTransfer.effectAllowed = 'move';
                    ev.style.opacity = '0.5';
                }
            });
            ev.addEventListener('dragend', function() {
                ev.style.opacity = '';
            });
        });
    }
    setInterval(setup, 900);
})();

/* ═══════════════════════════════════════════════════════════════
   درخواست ۹-ب: فعال‌سازی خودکار دقیقه پس از ساعت
   ═══════════════════════════════════════════════════════════════ */
(function autoFocusMinute() {
    function enhance() {
        var timeInp = document.getElementById('calg-time');
        if (!timeInp || timeInp.dataset.minReady === '1') return;
        timeInp.dataset.minReady = '1';
        timeInp.setAttribute('placeholder', 'HH:MM');
        timeInp.setAttribute('maxlength', '5');

        timeInp.addEventListener('input', function() {
            var v = this.value.replace(/[^\d:]/g, '');
            // وقتی دو رقم ساعت تایپ شد، خودکار کولون اضافه کن
            if (/^\d{2}$/.test(v)) {
                this.value = v + ':';
                return;
            }
            // اگر کاربر دقیقه‌ها را با 2 رقم زد و کولون داشت
            if (/^\d{2}:\d{2}$/.test(v)) {
                this.value = v;
            } else {
                this.value = v;
            }
        });

        timeInp.addEventListener('keydown', function(e) {
            // اگر کاربر Enter زد و مقدار فقط HH بود، کولون اضافه کن
            if (e.key === 'Enter' && /^\d{2}$/.test(this.value)) {
                e.preventDefault();
                this.value = this.value + ':';
            }
        });

        // وقتی فوکوس گرفت و خالی بود، مقدار HH:MM اولیه بده
        timeInp.addEventListener('focus', function() {
            if (!this.value) this.value = '';
        });
    }
    setInterval(enhance, 800);
})();

/* ═══════════════════════════════════════════════════════════════
   درخواست: بهبود اسکن سند — تشخیص معین/تفصیلی + بستانکار پیش‌فرض
   ═══════════════════════════════════════════════════════════════ */
(function improveScan() {
    async function analyzeWithContext(dataUrl) {
        if (typeof AI === 'undefined' || !AI.apiKey) throw new Error('کلید API تنظیم نشده');

        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        var accountList = leaves.map(function(a) {
            var lk = (a.links && a.links.length) ? ' [لینک: ' + a.links.join(',') + ']' : '';
            return a.code + ' = ' + a.name + lk;
        }).join('\n');

        var persons = DB.load('persons', []).map(function(p) { return (p.first || '') + ' ' + (p.last || ''); }).filter(Boolean).slice(0, 60).join(' | ');
        var companies = DB.load('companies', []).map(function(c) { return c.name; }).filter(Boolean).slice(0, 40).join(' | ');
        var banks = DB.load('bankAccounts', []).map(function(b) { return (b.bank || '') + (b.account ? ' - ' + b.account : ''); }).join(' | ');
        var cashboxes = DB.load('cashBoxes', []).map(function(c) { return c.title; }).join(' | ');
        var projects = DB.load('projects', []).map(function(p) { return p.name; }).join(' | ');
        var facilities = DB.load('facilities', []).map(function(f) { return f.name; }).join(' | ');

        var prompt = 'این تصویر یک سند/فاکتور/رسید/پوز است. تمام اطلاعات را دقیق استخراج کن و فقط یک JSON خالص برگردان (بدون توضیح، بدون ```):\n\n'
            + '{\n'
            + '  "date": "<تاریخ شمسی YYYY/MM/DD یا خالی>",\n'
            + '  "description": "<شرح کلی سند>",\n'
            + '  "total_amount": <عدد صحیح کل به ریال>,\n'
            + '  "debit_lines": [\n'
            + '    {\n'
            + '      "account_code": "<کد معین از لیست زیر>",\n'
            + '      "amount": <عدد صحیح به ریال>,\n'
            + '      "description": "<شرح این قلم>",\n'
            + '      "details": {\n'
            + '        "person": "<نام شخص از لیست>",\n'
            + '        "company": "<نام شرکت از لیست>",\n'
            + '        "project": "<نام پروژه از لیست>",\n'
            + '        "facility": "<نام تسهیلات از لیست>"\n'
            + '      }\n'
            + '    }\n'
            + '  ]\n'
            + '}\n\n'
            + 'قوانین:\n'
            + '1. اگر مبلغ تومان است، × 10 کن تا ریال شود.\n'
            + '2. هر ردیف هزینه را جدا در debit_lines بگذار.\n'
            + '3. کد معین را از لیست زیر انتخاب کن.\n'
            + '4. اگر معین با تفصیلی مرتبط است، نام دقیق را در details بگذار.\n'
            + '5. اگر مطمئن نیستی، مقدار خالی یا صفر بگذار.\n'
            + '6. سمت بستانکار را نیاز نیست بنویسی.\n\n'
            + '═══ معین‌های معتبر ═══\n' + accountList + '\n\n'
            + '═══ اشخاص موجود ═══\n' + (persons || '(خالی)') + '\n\n'
            + '═══ شرکت‌ها ═══\n' + (companies || '(خالی)') + '\n\n'
            + '═══ بانک‌ها ═══\n' + (banks || '(خالی)') + '\n\n'
            + '═══ صندوق‌ها ═══\n' + (cashboxes || '(خالی)') + '\n\n'
            + '═══ پروژه‌ها ═══\n' + (projects || '(خالی)') + '\n\n'
            + '═══ تسهیلات ═══\n' + (facilities || '(خالی)');

        var result = await aiCallAPI(prompt, { dataUrl: dataUrl, name: 'scan.jpg' });
        var content = (result && result.content) || '';
        var m = content.match(/\{[\s\S]*\}/);
        if (!m) throw new Error('پاسخ AI قابل تجزیه نبود');
        return JSON.parse(m[0]);
    }

    function findMoeinByCode(code) {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        return leaves.find(function(a) { return String(a.code) === String(code); });
    }

    function fuzzyFindDetail(linkType, hint) {
        if (!hint) return '';
        var items = getLinkedItems(linkType);
        var norm = function(s) {
            return String(s || '').toLowerCase()
                .replace(/[يى]/g, 'ی').replace(/[ك]/g, 'ک')
                .replace(/\s+/g, ' ').trim();
        };
        var hintN = norm(hint);
        if (!hintN) return '';
        var exact = items.find(function(it) { return norm(getLinkedItemLabel(linkType, it)) === hintN; });
        if (exact) return exact.id;
        var partial = items.find(function(it) { return norm(getLinkedItemLabel(linkType, it)).indexOf(hintN) !== -1; });
        if (partial) return partial.id;
        var partial2 = items.find(function(it) { return hintN.indexOf(norm(getLinkedItemLabel(linkType, it))) !== -1; });
        if (partial2) return partial2.id;
        // کلمه‌ای
        var words = hintN.split(' ').filter(function(w) { return w.length > 2; });
        for (var i = 0; i < items.length; i++) {
            var lbl = norm(getLinkedItemLabel(linkType, items[i]));
            var hits = words.filter(function(w) { return lbl.indexOf(w) !== -1; }).length;
            if (hits >= Math.max(1, Math.floor(words.length / 2))) return items[i].id;
        }
        return '';
    }

    function findDefaultCreditMoein() {
        var accounts = DB.load('accounts', []);
        var leaves = accounts.filter(function(a) { return !accounts.some(function(x) { return x.parent === a.id; }); });
        // ۱. اول دنبال "کیف پول" در نام بگرد
        var walletAcc = leaves.find(function(a) { return /کیف|wallet/i.test(a.name || ''); });
        if (walletAcc) return { acc: walletAcc, type: 'wallet' };
        // ۲. اول صندوق با نام "کیف پول"
        var cashboxes = DB.load('cashBoxes', []);
        var walletCb = cashboxes.find(function(c) { return /کیف|wallet/i.test(c.title || ''); });
        if (walletCb) {
            var cbMoein = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
            if (cbMoein) return { acc: cbMoein, type: 'cashbox', detail: walletCb.id };
        }
        // ۳. هر معین با لینک cashbox
        var cbAcc = leaves.find(function(a) { return a.links && a.links.indexOf('cashbox') !== -1; });
        if (cbAcc && cashboxes.length > 0) {
            return { acc: cbAcc, type: 'cashbox', detail: cashboxes[0].id };
        }
        // ۴. معین بانک
        var bankMoeinId = (typeof getBankMoeinId === 'function') ? getBankMoeinId() : '';
        if (bankMoeinId) {
            var bankAcc = accounts.find(function(a) { return a.id === bankMoeinId; });
            var banks = DB.load('bankAccounts', []);
            return { acc: bankAcc, type: 'bank', detail: banks[0] ? banks[0].id : '' };
        }
        return null;
    }

    function applyScanData(data) {
        // تاریخ
        if (data.date && /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(data.date)) {
            var dt = document.getElementById('v-date');
            if (dt) dt.value = data.date;
        }
        // شرح سند
        if (data.description) {
            var d = document.getElementById('v-desc');
            if (d) d.value = String(data.description).trim();
        }

        var lines = [];
        var totalAmt = 0;
        var debitLines = Array.isArray(data.debit_lines) ? data.debit_lines : [];
        if (debitLines.length === 0 && (data.total_amount || data.amount)) {
            debitLines = [{ amount: data.total_amount || data.amount, description: data.description || 'اسکن شده' }];
        }

        debitLines.forEach(function(dl) {
            var amt = Number(dl.amount) || 0;
            if (amt <= 0) return;
            totalAmt += amt;

            var acc = dl.account_code ? findMoeinByCode(dl.account_code) : null;
            var accId = acc ? acc.id : '';

            var details = {};
            if (acc && acc.links) {
                acc.links.forEach(function(lt) {
                    var hint = dl.details && dl.details[lt];
                    if (!hint) return;
                    var foundId = fuzzyFindDetail(lt, hint);
                    if (foundId) details[lt] = foundId;
                });
            }

            lines.push({
                id: uid(),
                account: accId,
                details: details,
                debit: amt,
                credit: 0,
                description: dl.description || data.description || ''
            });
        });

        if (lines.length === 0) {
            lines.push({ id: uid(), account: '', details: {}, debit: 0, credit: 0, description: '' });
            voucherLines = lines;
            renderVoucherLines();
            return;
        }

        // ستون بستانکار پیش‌فرض
        var def = findDefaultCreditMoein();
        if (def && def.acc && totalAmt > 0) {
            var credDetails = {};
            if (def.type === 'cashbox' && def.detail) credDetails.cashbox = def.detail;
            else if (def.type === 'bank' && def.detail) credDetails.bank = def.detail;

            var credDesc = 'پرداخت از ' + (def.acc.name || 'کیف پول');
            lines.push({
                id: uid(),
                account: def.acc.id,
                details: credDetails,
                debit: 0,
                credit: totalAmt,
                description: credDesc
            });
        }

        voucherLines = lines;
        renderVoucherLines();
        goToPage('voucher-new');
        showToast('📷 اسکن انجام شد — ' + toFa(lines.length) + ' قلم تشخیص داده شد');
    }

    // جایگزینی دکمه تحلیل قبلی
    function patchAnalyzeButton() {
        var analyzeBtn = document.getElementById('vsc-analyze');
        if (!analyzeBtn || analyzeBtn.dataset.patched === 'v38') return;
        analyzeBtn.dataset.patched = 'v38';
        // پاک کردن listener قبلی با clone
        var newBtn = analyzeBtn.cloneNode(true);
        analyzeBtn.parentNode.replaceChild(newBtn, analyzeBtn);

        newBtn.addEventListener('click', async function() {
            // گرفتن داده از متغیر داخلی — نیاز به در دسترس بودن dataUrl
            var preview = document.querySelector('#vsc-preview img');
            if (!preview || !preview.src) { alert('ابتدا عکس بگیر'); return; }
            var status = document.getElementById('vsc-status');
            status.style.color = '#4f46e5';
            status.textContent = '🤖 در حال تحلیل با AI... (چند ثانیه صبر کن)';
            status.style.fontWeight = '800';
            try {
                var data = await analyzeWithContext(preview.src);
                applyScanData(data);
                var m = document.getElementById('voucher-scan-modal');
                var o = document.getElementById('voucher-scan-overlay');
                if (m) m.remove();
                if (o) o.remove();
            } catch(e) {
                status.style.color = '#dc2626';
                status.textContent = '⚠️ خطا: ' + (e.message || e);
                console.error('scan error:', e);
            }
        });
    }

    setInterval(patchAnalyzeButton, 800);
})();

console.log('🎉 پارسیس v38 — پچ نهایی اعمال شد (تمیز شده)');
