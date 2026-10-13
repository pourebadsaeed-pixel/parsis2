// ═══════════════ اشخاص ═══════════════

const PersonsPage = {
    filter: '',
    typeFilter: 'all',

    async render() {
        const persons = await DB.all('persons');
        let filtered = persons;

        if (this.typeFilter !== 'all') {
            filtered = filtered.filter(p => p.type === this.typeFilter);
        }
        if (this.filter) {
            const f = this.filter.toLowerCase();
            filtered = filtered.filter(p =>
                (p.name || '').toLowerCase().includes(f) ||
                (p.code || '').toLowerCase().includes(f) ||
                (p.phone || '').includes(f)
            );
        }

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">اشخاص</h1>
                    <p class="page-subtitle">مدیریت اشخاص حقیقی و حقوقی</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="PersonsPage.openForm()">
                        ➕ شخص جدید
                    </button>
                </div>
            </div>

            <div class="card">
                <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
                    <div class="search-box" style="flex: 1; min-width: 200px;">
                        <input type="text" class="form-control" id="person-search"
                            placeholder="جستجو بر اساس نام، کد، تلفن..."
                            value="${Utils.escapeHtml(this.filter)}">
                    </div>
                    <select class="form-control" id="person-type-filter" style="max-width: 180px;">
                        <option value="all" ${this.typeFilter === 'all' ? 'selected' : ''}>همه</option>
                        <option value="real" ${this.typeFilter === 'real' ? 'selected' : ''}>حقیقی</option>
                        <option value="legal" ${this.typeFilter === 'legal' ? 'selected' : ''}>حقوقی</option>
                        <option value="customer" ${this.typeFilter === 'customer' ? 'selected' : ''}>مشتری</option>
                        <option value="supplier" ${this.typeFilter === 'supplier' ? 'selected' : ''}>تأمین‌کننده</option>
                    </select>
                </div>

                ${filtered.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">👥</div>
                        <h3>هیچ شخصی یافت نشد</h3>
                        <p>برای شروع یک شخص جدید اضافه کنید</p>
                        <button class="btn btn-primary" onclick="PersonsPage.openForm()">➕ افزودن شخص</button>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>کد</th>
                                    <th>نام</th>
                                    <th>نوع</th>
                                    <th>تلفن</th>
                                    <th>موجودی</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filtered.map(p => `
                                    <tr>
                                        <td>${Utils.escapeHtml(p.code || '-')}</td>
                                        <td>${Utils.escapeHtml(p.name || '-')}</td>
                                        <td><span class="badge badge-info">${this.typeLabel(p.type)}</span></td>
                                        <td>${Utils.toPersianDigits(p.phone || '-')}</td>
                                        <td>${Utils.formatMoney(p.balance || 0)}</td>
                                        <td>
                                            <div class="actions">
                                                <button class="btn-icon" onclick="PersonsPage.openForm('${p.id}')">✏️</button>
                                                <button class="btn-icon" onclick="PersonsPage.deleteItem('${p.id}')">🗑️</button>
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
        const labels = { real: 'حقیقی', legal: 'حقوقی', customer: 'مشتری', supplier: 'تأمین‌کننده' };
        return labels[type] || type;
    },

    async bind() {
        const search = document.getElementById('person-search');
        if (search) {
            search.addEventListener('input', Utils.debounce((e) => {
                PersonsPage.filter = e.target.value;
                App.reload();
            }, 300));
        }
        const typeFilter = document.getElementById('person-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                PersonsPage.typeFilter = e.target.value;
                App.reload();
            });
        }
    },

    async openForm(id = null) {
        const person = id ? await DB.get('persons', id) : {
            name: '', code: '', type: 'real', nationalId: '', economicCode: '',
            phone: '', mobile: '', address: '', email: '', balance: 0, notes: ''
        };

        const html = `
            <div class="grid grid-2">
                <div class="form-group">
                    <label class="form-label">نام <span class="required">*</span></label>
                    <input type="text" class="form-control" id="p-name" value="${Utils.escapeHtml(person.name)}">
                </div>
                <div class="form-group">
                    <label class="form-label">کد</label>
                    <input type="text" class="form-control" id="p-code" value="${Utils.escapeHtml(person.code)}">
                </div>
                <div class="form-group">
                    <label class="form-label">نوع</label>
                    <select class="form-control" id="p-type">
                        <option value="real" ${person.type==='real'?'selected':''}>حقیقی</option>
                        <option value="legal" ${person.type==='legal'?'selected':''}>حقوقی</option>
                        <option value="customer" ${person.type==='customer'?'selected':''}>مشتری</option>
                        <option value="supplier" ${person.type==='supplier'?'selected':''}>تأمین‌کننده</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">کد ملی / شناسه ملی</label>
                    <input type="text" class="form-control" id="p-national-id" value="${Utils.escapeHtml(person.nationalId)}">
                </div>
                <div class="form-group">
                    <label class="form-label">کد اقتصادی</label>
                    <input type="text" class="form-control" id="p-economic-code" value="${Utils.escapeHtml(person.economicCode)}">
                </div>
                <div class="form-group">
                    <label class="form-label">تلفن</label>
                    <input type="text" class="form-control" id="p-phone" value="${Utils.escapeHtml(person.phone)}">
                </div>
                <div class="form-group">
                    <label class="form-label">موبایل</label>
                    <input type="text" class="form-control" id="p-mobile" value="${Utils.escapeHtml(person.mobile)}">
                </div>
                <div class="form-group">
                    <label class="form-label">ایمیل</label>
                    <input type="email" class="form-control" id="p-email" value="${Utils.escapeHtml(person.email)}">
                </div>
            </div>
            <div class="form-group">
                <label class="form-label">آدرس</label>
                <textarea class="form-control" id="p-address" rows="2">${Utils.escapeHtml(person.address)}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">ملاحظات</label>
                <textarea class="form-control" id="p-notes" rows="2">${Utils.escapeHtml(person.notes)}</textarea>
            </div>
        `;

        App.modal({
            title: id ? 'ویرایش شخص' : 'شخص جدید',
            body: html,
            okText: id ? 'به‌روزرسانی' : 'ذخیره',
            onOk: async () => {
                const data = {
                    id: id || undefined,
                    name: document.getElementById('p-name').value.trim(),
                    code: document.getElementById('p-code').value.trim(),
                    type: document.getElementById('p-type').value,
                    nationalId: document.getElementById('p-nationalId')?.value.trim() ||
                        document.getElementById('p-national-id').value.trim(),
                    economicCode: document.getElementById('p-economic-code').value.trim(),
                    phone: document.getElementById('p-phone').value.trim(),
                    mobile: document.getElementById('p-mobile').value.trim(),
                    email: document.getElementById('p-email').value.trim(),
                    address: document.getElementById('p-address').value.trim(),
                    notes: document.getElementById('p-notes').value.trim(),
                    balance: person.balance || 0,
                    createdAt: person.createdAt || Date.now(),
                    updatedAt: Date.now()
                };

                if (!data.name) { App.toast('نام الزامی است', 'error'); return false; }

                await DB.put('persons', data);
                App.toast(id ? 'شخص به‌روزرسانی شد' : 'شخص ثبت شد', 'success');
                App.reload();
                return true;
            }
        });
    },

    async deleteItem(id) {
        if (!confirm('آیا از حذف این شخص مطمئن هستید؟')) return;
        await DB.delete('persons', id);
        App.toast('شخص حذف شد', 'success');
        App.reload();
    }
};
