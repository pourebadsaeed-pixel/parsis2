// ═══════════════ تنظیمات (Fixed Backup/Restore) ═══════════════

const SettingsPage = {
    async render() {
        const [company, fiscalYear] = await Promise.all([
            DB.getSetting('company', { name: '', address: '', phone: '', economicCode: '', nationalId: '' }),
            DB.getSetting('fiscalYear', { start: Utils.todayPersian(), end: '' })
        ]);

        // آمار مخازن
        const stats = [];
        for (const s of ALL_STORES) {
            stats.push({ name: s, count: await DB.count(s) });
        }

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">تنظیمات</h1>
                    <p class="page-subtitle">تنظیمات سیستم، شرکت و پشتیبان‌گیری</p>
                </div>
            </div>

            <div class="card">
                <div class="card-title">🏢 اطلاعات شرکت</div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">نام شرکت</label>
                        <input type="text" class="form-control" id="c-name" value="${Utils.escapeHtml(company.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تلفن</label>
                        <input type="text" class="form-control" id="c-phone" value="${Utils.escapeHtml(company.phone)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">کد اقتصادی</label>
                        <input type="text" class="form-control" id="c-economic" value="${Utils.escapeHtml(company.economicCode)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">شناسه ملی</label>
                        <input type="text" class="form-control" id="c-national" value="${Utils.escapeHtml(company.nationalId)}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">آدرس</label>
                    <textarea class="form-control" id="c-address" rows="2">${Utils.escapeHtml(company.address)}</textarea>
                </div>
                <button class="btn btn-primary" onclick="SettingsPage.saveCompany()">💾 ذخیره اطلاعات شرکت</button>
            </div>

            <div class="card">
                <div class="card-title">📅 سال مالی</div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">تاریخ شروع</label>
                        <input type="text" class="form-control" id="fy-start" value="${Utils.escapeHtml(fiscalYear.start)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تاریخ پایان</label>
                        <input type="text" class="form-control" id="fy-end" value="${Utils.escapeHtml(fiscalYear.end)}">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="SettingsPage.saveFiscalYear()">💾 ذخیره</button>
            </div>

            <div class="card">
                <div class="card-title">💾 پشتیبان‌گیری و بازیابی</div>

                <div class="grid grid-4" style="margin-bottom: 20px;">
                    ${stats.map(s => `
                        <div style="text-align:center; padding: 12px; background: var(--bg); border-radius: var(--radius-sm);">
                            <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">${Utils.toPersianDigits(s.count)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">${this.storeLabel(s.name)}</div>
                        </div>
                    `).join('')}
                </div>

                <p style="color: var(--text-secondary); margin-bottom: 16px; line-height: 1.8;">
                    📌 فایل پشتیبان شامل تمام داده‌های سیستم به‌صورت JSON است.<br>
                    💡 توصیه می‌شود حداقل هفته‌ای یک بار پشتیبان تهیه کنید.
                </p>

                <div class="page-actions" style="flex-wrap: wrap; gap: 8px;">
                    <button class="btn btn-primary" onclick="SettingsPage.backup()">⬇️ دریافت پشتیبان (JSON)</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('restore-file').click()">⬆️ بازیابی از فایل</button>
                    <button class="btn btn-secondary" onclick="SettingsPage.exportCSV()">📊 خروجی اکسل (CSV)</button>
                    <button class="btn btn-danger" onclick="SettingsPage.resetAll()">🗑️ پاک کردن همه داده‌ها</button>
                </div>

                <input type="file" id="restore-file" accept=".json,application/json" style="display:none;"
                    onchange="SettingsPage.restore(event)">

                <div id="restore-progress" style="display:none; margin-top: 20px; padding: 16px; background: var(--bg); border-radius: var(--radius-sm);">
                    <div style="margin-bottom: 8px; font-weight: 600;">در حال بازیابی...</div>
                    <div id="restore-progress-text" style="color: var(--text-secondary); font-size: 0.9rem;"></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">ℹ️ درباره</div>
                <p>پارسیس ۲ - نسخه ۱.۰.۰</p>
                <p style="color: var(--text-secondary); margin-top: 8px; font-size: 0.85rem;">
                    یک سیستم حسابداری تحت وب به صورت Progressive Web App
                </p>
                <p style="margin-top: 12px; font-size: 0.85rem;">
                    <button class="btn btn-sm btn-secondary" onclick="SettingsPage.showDiagnostics()">🔧 تشخیص وضعیت سیستم</button>
                </p>
            </div>
        `;
    },

    storeLabel(name) {
        const labels = {
            persons: 'اشخاص', products: 'کالاها', accounts: 'حساب‌ها',
            vouchers: 'اسناد', invoices: 'فاکتورها', receipts: 'دریافت/پرداخت',
            settings: 'تنظیمات'
        };
        return labels[name] || name;
    },

    async bind() {},

    async saveCompany() {
        await DB.setSetting('company', {
            name: document.getElementById('c-name').value.trim(),
            phone: document.getElementById('c-phone').value.trim(),
            economicCode: document.getElementById('c-economic').value.trim(),
            nationalId: document.getElementById('c-national').value.trim(),
            address: document.getElementById('c-address').value.trim()
        });
        App.toast('اطلاعات شرکت ذخیره شد', 'success');
    },

    async saveFiscalYear() {
        await DB.setSetting('fiscalYear', {
            start: document.getElementById('fy-start').value.trim(),
            end: document.getElementById('fy-end').value.trim()
        });
        App.toast('سال مالی ذخیره شد', 'success');
    },

    // ═══════════ پشتیبان‌گیری اصلاح‌شده ═══════════

    async backup() {
        try {
            App.toast('در حال تهیه پشتیبان...', 'info');

            const data = await DB.exportAll();

            // ─── نام فایل با تاریخ و ساعت ───
            const now = new Date();
            const stamp = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + '_' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0');
            const filename = `parsis2-backup-${stamp}.json`;

            // ─── ذخیره بدون BOM ───
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json;charset=utf-8' });

            // ─── دانلود ───
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 1000);

            const total = Object.values(data.counts).reduce((s, n) => s + n, 0);
            App.toast(`پشتیبان تهیه شد (${Utils.toPersianDigits(total)} رکورد)`, 'success');
        } catch (e) {
            console.error(e);
            App.toast('خطا در تهیه پشتیبان: ' + e.message, 'error');
        }
    },

    // ═══════════ بازیابی اصلاح‌شده ═══════════

    async restore(event) {
        const input = event.target;
        const file = input.files && input.files[0];
        if (!file) return;

        // اجازه انتخاب مجدد همان فایل
        input.value = '';

        try {
            App.toast('در حال خواندن فایل...', 'info');

            // ─── ۱. خواندن فایل با UTF-8 ───
            let text = await file.text();

            // ─── ۲. حذف BOM ───
            if (text.charCodeAt(0) === 0xFEFF) {
                text = text.slice(1);
            }

            // ─── ۳. پارس JSON ───
            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                throw new Error('فایل JSON نامعتبر است: ' + parseErr.message);
            }

            // ─── ۴. اعتبارسنجی و پیش‌نمایش ───
            if (!data.data || typeof data.data !== 'object') {
                throw new Error('فایل پشتیبان ساختار صحیح ندارد (بخش data یافت نشد)');
            }

            const summary = ALL_STORES.map(s => {
                const items = Array.isArray(data.data[s]) ? data.data[s].length : 0;
                return { store: this.storeLabel(s), count: items };
            });
            const total = summary.reduce((s, x) => s + x.count, 0);

            const summaryHtml = summary
                .map(x => `<div style="display:flex; justify-content:space-between; padding:4px 0;">
                    <span>${x.store}</span>
                    <strong>${Utils.toPersianDigits(x.count)} رکورد</strong>
                </div>`).join('');

            // ─── ۵. تأیید کاربر ───
            const ok = await new Promise((resolve) => {
                App.modal({
                    title: '📦 پیش‌نمایش پشتیبان',
                    body: `
                        <p style="margin-bottom: 12px;">
                            <strong>تاریخ تهیه:</strong> ${Utils.escapeHtml(data.exportedAtPersian || data.exportedAt || 'نامشخص')}
                        </p>
                        <div style="background: var(--bg); padding: 12px; border-radius: var(--radius-sm); margin-bottom: 16px;">
                            ${summaryHtml}
                            <div style="border-top:1px solid var(--border); margin-top:8px; padding-top:8px; display:flex; justify-content:space-between;">
                                <strong>جمع کل</strong>
                                <strong>${Utils.toPersianDigits(total)} رکورد</strong>
                            </div>
                        </div>
                        <p style="color: var(--danger); font-size: 0.9rem;">
                            ⚠️ تمام داده‌های فعلی جایگزین می‌شوند. آیا مطمئن هستید؟
                        </p>
                    `,
                    okText: '✅ بله، بازیابی کن',
                    cancelText: '❌ انصراف',
                    onOk: async () => { resolve(true); return true; }
                });
                // در صورت لغو
                const origClose = App.closeModal.bind(App);
                App.closeModal = () => { origClose(); resolve(false); };
            });

            if (!ok) {
                App.toast('بازیابی لغو شد', 'info');
                return;
            }

            // ─── ۶. نمایش پیشرفت ───
            const progBox = document.getElementById('restore-progress');
            const progText = document.getElementById('restore-progress-text');
            if (progBox) progBox.style.display = 'block';

            const onProgress = (store, phase, count) => {
                if (!progText) return;
                if (phase === 'start') {
                    progText.textContent = `در حال بازیابی ${this.storeLabel(store)}...`;
                } else {
                    progText.textContent = `✅ ${this.storeLabel(store)} (${Utils.toPersianDigits(count || 0)} رکورد)`;
                }
            };

            // ─── ۷. انجام بازیابی ───
            const result = await DB.importAll(data, { merge: false, onProgress });

            // ─── ۸. نمایش نتیجه ───
            if (progBox) progBox.style.display = 'none';
            App.toast(`✅ بازیابی موفق - ${Utils.toPersianDigits(total)} رکورد`, 'success');

            if (result.errors && result.errors.length > 0) {
                console.warn('هشدارها:', result.errors);
                App.toast(`${Utils.toPersianDigits(result.errors.length)} هشدار در بازیابی`, 'warning', 5000);
            }

            // ─── ۹. بارگذاری مجدد ───
            setTimeout(() => location.reload(), 1200);

        } catch (e) {
            console.error('Restore error:', e);
            const progBox = document.getElementById('restore-progress');
            if (progBox) progBox.style.display = 'none';
            App.toast('❌ خطا در بازیابی: ' + e.message, 'error', 8000);
        }
    },

    // ═══════════ خروجی CSV ═══════════

    async exportCSV() {
        try {
            const persons = await DB.all('persons');
            const invoices = await DB.all('invoices');

            // CSV اشخاص
            let csv = '\uFEFF'; // BOM برای Excel فارسی
            csv += 'نام,کد,نوع,تلفن,موبایل,موجودی\n';
            persons.forEach(p => {
                csv += `"${(p.name||'').replace(/"/g,'""')}","${p.code||''}","${this.storeLabel(p.type)||p.type||''}","${p.phone||''}","${p.mobile||''}",${p.balance||0}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `parsis2-persons-${Date.now()}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            App.toast('خروجی CSV تهیه شد', 'success');
        } catch (e) {
            App.toast('خطا: ' + e.message, 'error');
        }
    },

    // ═══════════ تشخیص وضعیت ═══════════

    async showDiagnostics() {
        const lines = [];
        lines.push(`مرورگر: ${navigator.userAgent.split(') ')[0]})`);
        lines.push(`IndexedDB: ${'indexedDB' in window ? '✅ پشتیبانی' : '❌'}`);
        lines.push(`Service Worker: ${'serviceWorker' in navigator ? '✅' : '❌'}`);
        lines.push(`Notification: ${'Notification' in window ? Notification.permission : '❌'}`);
        lines.push(`Storage Quota: ${navigator.storage && navigator.storage.estimate ? '✅' : '❌'}`);

        if (navigator.storage && navigator.storage.estimate) {
            const est = await navigator.storage.estimate();
            const usedMB = (est.usage / 1024 / 1024).toFixed(2);
            const quotaMB = (est.quota / 1024 / 1024).toFixed(0);
            lines.push(`استفاده: ${usedMB} MB از ${quotaMB} MB`);
        }

        for (const s of ALL_STORES) {
            const c = await DB.count(s);
            lines.push(`${this.storeLabel(s)}: ${c} رکورد`);
        }

        App.modal({
            title: '🔧 تشخیص وضعیت سیستم',
            body: `<pre style="white-space: pre-wrap; font-family: inherit; line-height: 2;">${Utils.escapeHtml(lines.join('\n'))}</pre>`,
            okText: 'بستن',
            onOk: async () => true
        });
    },

    // ═══════════ پاک کردن همه ═══════════

    async resetAll() {
        if (!confirm('تمام داده‌های سیستم حذف خواهد شد. مطمئن هستید؟')) return;
        if (!confirm('این عمل قابل بازگشت نیست. ادامه؟')) return;
        if (!confirm('آخرین هشدار: هیچ پشتیبانی ندارید! ادامه دهید؟')) return;

        try {
            for (const s of ALL_STORES) await DB.clear(s);
            App.toast('همه داده‌ها پاک شد', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            App.toast('خطا: ' + e.message, 'error');
        }
    }
};
