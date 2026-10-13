// ═══════════════ حساب‌ها (کدینگ) ═══════════════

const AccountsPage = {
    async render() {
        const accounts = await DB.all('accounts');
        accounts.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">حساب‌ها</h1>
                    <p class="page-subtitle">کدینگ حساب‌های حسابداری</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-secondary" onclick="AccountsPage.seedDefaults()">🌱 ایجاد کدینگ پیش‌فرض</button>
                    <button class="btn btn-primary" onclick="AccountsPage.openForm()">➕ حساب جدید</button>
                </div>
            </div>

            <div class="card">
                ${accounts.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">🏦</div>
                        <h3>هیچ حسابی تعریف نشده</h3>
                        <p>برای شروع می‌توانید از کدینگ پیش‌فرض استفاده کنید</p>
                        <button class="btn btn-primary" onclick="AccountsPage.seedDefaults()">🌱 ایجاد کدینگ پیش‌فرض</button>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>کد</th>
                                    <th>نام حساب</th>
                                    <th>نوع</th>
                                    <th>سطح</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accounts.map(a => `
                                    <tr>
                                        <td>${Utils.toPersianDigits(a.code)}</td>
                                        <td style="padding-right: ${(a.level || 1) * 20}px;">
                                            ${Utils.escapeHtml(a.name)}
                                        </td>
                                        <td>${this.typeLabel(a.type)}</td>
                                        <td>${Utils.toPersianDigits(a.level || 1)}</td>
                                        <td>
                                            <div class="actions">
                                                <button class="btn-icon" onclick="AccountsPage.openForm('${a.id}')">✏️</button>
                                                <button class="btn-icon" onclick="AccountsPage.deleteItem('${a.id}')">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            </div>
        `;
    },

    typeLabel(type) {
        const map = {
            asset: 'دارایی', liability: 'بدهی', equity: 'سرمایه',
            revenue: 'درآمد', expense: 'هزینه'
        };
        return map[type] || type || '-';
    },

    async bind() {},

    async openForm(id = null) {
        const a = id ? await DB.get('accounts', id) : {
            code: '', name: '', type: 'asset', parentId: null, level: 1, balance: 0
        };

        App.modal({
            title: id ? 'ویرایش حساب' : 'حساب جدید',
            body: `
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">کد <span class="required">*</span></label>
                        <input type="text" class="form-control" id="a-code" value="${Utils.escapeHtml(a.code)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">نام <span class="required">*</span></label>
                        <input type="text" class="form-control" id="a-name" value="${Utils.escapeHtml(a.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">نوع</label>
                        <select class="form-control" id="a-type">
                            <option value="asset" ${a.type==='asset'?'selected':''}>دارایی</option>
                            <option value="liability" ${a.type==='liability'?'selected':''}>بدهی</option>
                            <option value="equity" ${a.type==='equity'?'selected':''}>سرمایه</option>
                            <option value="revenue" ${a.type==='revenue'?'selected':''}>درآمد</option>
                            <option value="expense" ${a.type==='expense'?'selected':''}>هزینه</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">سطح</label>
                        <input type="number" class="form-control" id="a-level" value="${a.level || 1}" min="1" max="5">
                    </div>
                </div>
            `,
            okText: id ? 'به‌روزرسانی' : 'ذخیره',
            onOk: async () => {
                const data = {
                    id: id || undefined,
                    code: document.getElementById('a-code').value.trim(),
                    name: document.getElementById('a-name').value.trim(),
                    type: document.getElementById('a-type').value,
                    level: Number(document.getElementById('a-level').value) || 1,
                    balance: a.balance || 0,
                    createdAt: a.createdAt || Date.now()
                };
                if (!data.code || !data.name) {
                    App.toast('کد و نام الزامی است', 'error');
                    return false;
                }
                await DB.put('accounts', data);
                App.toast('ذخیره شد', 'success');
                App.reload();
                return true;
            }
        });
    },

    async deleteItem(id) {
        if (!confirm('حذف شود؟')) return;
        await DB.delete('accounts', id);
        App.reload();
        App.toast('حذف شد', 'success');
    },

    async seedDefaults() {
        if (!confirm('کدینگ پیش‌فرض ایجاد شود؟ (حساب‌های موجود باقی می‌مانند)')) return;
        const defaults = [
            { code: '1', name: 'دارایی‌های جاری', type: 'asset', level: 1 },
            { code: '11', name: 'موجودی نقد و بانک', type: 'asset', level: 2 },
            { code: '1101', name: 'صندوق', type: 'asset', level: 3 },
            { code: '1102', name: 'بانک ملت', type: 'asset', level: 3 },
            { code: '1103', name: 'بانک ملی', type: 'asset', level: 3 },
            { code: '12', name: 'حساب‌های دریافتنی', type: 'asset', level: 2 },
            { code: '1201', name: 'بدهکاران تجاری', type: 'asset', level: 3 },
            { code: '13', name: 'موجودی کالا', type: 'asset', level: 2 },
            { code: '1301', name: 'موجودی کالای بازرگانی', type: 'asset', level: 3 },
            { code: '2', name: 'بدهی‌های جاری', type: 'liability', level: 1 },
            { code: '21', name: 'حساب‌های پرداختنی', type: 'liability', level: 2 },
            { code: '2101', name: 'بستانکاران تجاری', type: 'liability', level: 3 },
            { code: '3', name: 'حقوق صاحبان سهام', type: 'equity', level: 1 },
            { code: '31', name: 'سرمایه', type: 'equity', level: 2 },
            { code: '3101', name: 'سرمایه اولیه', type: 'equity', level: 3 },
            { code: '4', name: 'درآمدها', type: 'revenue', level: 1 },
            { code: '41', name: 'فروش', type: 'revenue', level: 2 },
            { code: '4101', name: 'فروش کالا', type: 'revenue', level: 3 },
            { code: '4102', name: 'فروش خدمات', type: 'revenue', level: 3 },
            { code: '5', name: 'هزینه‌ها', type: 'expense', level: 1 },
            { code: '51', name: 'بهای تمام شده', type: 'expense', level: 2 },
            { code: '5101', name: 'بهای تمام شده کالای فروش رفته', type: 'expense', level: 3 },
            { code: '52', name: 'هزینه‌های عمومی', type: 'expense', level: 2 },
            { code: '5201', name: 'حقوق و دستمزد', type: 'expense', level: 3 },
            { code: '5202', name: 'اجاره', type: 'expense', level: 3 },
            { code: '5203', name: 'آب، برق، گاز و تلفن', type: 'expense', level: 3 }
        ];
        for (const d of defaults) {
            await DB.add('accounts', { ...d, balance: 0, createdAt: Date.now() });
        }
        App.toast('کدینگ پیش‌فرض ایجاد شد', 'success');
        App.reload();
    }
};
