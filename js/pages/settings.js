// ═══════════════ تنظیمات ═══════════════

const SettingsPage = {
    async render() {
        const [company, fiscalYear] = await Promise.all([
            DB.getSetting('company', { name: '', address: '', phone: '', economicCode: '', nationalId: '' }),
            DB.getSetting('fiscalYear', { start: Utils.todayPersian(), end: '' })
        ]);

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
                <p style="color: var(--text-secondary); margin-bottom: 16px;">
                    از تمام داده‌های سیستم به صورت JSON پشتیبان تهیه کنید. این فایل را در جای امنی نگه دارید.
                </p>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="SettingsPage.backup()">⬇️ دریافت پشتیبان</button>
                    <button class="btn btn-secondary" onclick="document.getElementById('restore-file').click()">⬆️ بازیابی از فایل</button>
                    <input type="file" id="restore-file" accept=".json" style="display:none;" onchange="SettingsPage.restore(event)">
                    <button class="btn btn-danger" onclick="SettingsPage.resetAll()">🗑️ پاک کردن همه داده‌ها</button>
                </div>
            </div>

            <div class="card">
                <div class="card-title">ℹ️ درباره</div>
                <p>پارسیس ۲ - نسخه ۱.۰.۰</p>
                <p style="color: var(--text-secondary); margin-top: 8px; font-size: 0.85rem;">
                    یک سیستم حسابداری تحت وب به صورت Progressive Web App
                </p>
            </div>
        `;
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

    async backup() {
        const data = await DB.exportAll();
        const filename = `parsis2-backup-${Date.now()}.json`;
        Utils.download(filename, JSON.stringify(data, null, 2));
        App.toast('پشتیبان دانلود شد', 'success');
    },

    async restore(event) {
        const file = event.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            if (!confirm('تمام داده‌های فعلی با فایل پشتیبان جایگزین می‌شود. ادامه؟')) return;
            await DB.importAll(data);
            App.toast('بازیابی انجام شد', 'success');
            setTimeout(() => location.reload(), 800);
        } catch (e) {
            console.error(e);
            App.toast('خطا در بازیابی: ' + e.message, 'error');
        }
    },

    async resetAll() {
        if (!confirm('تمام داده‌های سیستم حذف خواهد شد. مطمئن هستید؟')) return;
        if (!confirm('این عمل قابل بازگشت نیست. ادامه؟')) return;
        for (const s of ['persons','products','accounts','vouchers','invoices','receipts','settings']) {
            await DB.clear(s);
        }
        App.toast('همه داده‌ها پاک شد', 'success');
        setTimeout(() => location.reload(), 800);
    }
};
