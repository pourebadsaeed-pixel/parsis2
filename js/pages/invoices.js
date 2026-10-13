// ═══════════════ فاکتورها ═══════════════

const InvoicesPage = {
    async render() {
        const invoices = await DB.all('invoices');
        invoices.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">فاکتورها</h1>
                    <p class="page-subtitle">فاکتور فروش و خرید</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-success" onclick="InvoicesPage.openForm(null, 'sale')">🧾 فروش جدید</button>
                    <button class="btn btn-secondary" onclick="InvoicesPage.openForm(null, 'purchase')">📥 خرید جدید</button>
                </div>
            </div>

            <div class="card">
                ${invoices.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">🧾</div>
                        <h3>هیچ فاکتوری ثبت نشده</h3>
                        <button class="btn btn-primary" onclick="InvoicesPage.openForm(null, 'sale')">➕ فاکتور جدید</button>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>شماره</th>
                                    <th>نوع</th>
                                    <th>تاریخ</th>
                                    <th>طرف حساب</th>
                                    <th>مبلغ کل</th>
                                    <th>وضعیت</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${invoices.map(inv => `
                                    <tr>
                                        <td>${Utils.toPersianDigits(inv.number || '-')}</td>
                                        <td>
                                            <span class="badge ${inv.type === 'sale' ? 'badge-success' : 'badge-info'}">
                                                ${inv.type === 'sale' ? 'فروش' : 'خرید'}
                                            </span>
                                        </td>
                                        <td>${Utils.toPersianDigits(inv.date || '')}</td>
                                        <td>${Utils.escapeHtml(inv.personName || '-')}</td>
                                        <td>${Utils.formatMoney(inv.total || 0)}</td>
                                        <td>${this.statusBadge(inv.status)}</td>
                                        <td>
                                            <div class="actions">
                                                <button class="btn-icon" onclick="InvoicesPage.view('${inv.id}')">👁️</button>
                                                <button class="btn-icon" onclick="InvoicesPage.openForm('${inv.id}')">✏️</button>
                                                <button class="btn-icon" onclick="InvoicesPage.deleteItem('${inv.id}')">🗑️</button>
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

    statusBadge(status) {
        const map = {
            draft: '<span class="badge badge-warning">پیش‌نویس</span>',
            confirmed: '<span class="badge badge-info">تأیید شده</span>',
            paid: '<span class="badge badge-success">پرداخت شده</span>',
            cancelled: '<span class="badge badge-danger">لغو شده</span>'
        };
        return map[status] || '<span class="badge">-</span>';
    },

    async bind() {},

    async openForm(id = null, type = 'sale') {
        const [persons, products, allInv] = await Promise.all([
            DB.all('persons'), DB.all('products'), DB.all('invoices')
        ]);

        const inv = id ? await DB.get('invoices', id) : {
            type,
            number: (allInv.filter(i => i.type === type).length + 1).toString().padStart(4, '0'),
            date: Utils.todayPersian(),
            personId: '', personName: '',
            items: [{ productId: '', name: '', quantity: 1, unitPrice: 0, total: 0 }],
            subtotal: 0, discount: 0, tax: 0, total: 0,
            status: 'draft', notes: ''
        };

        const personOpts = persons.map(p =>
            `<option value="${p.id}" ${p.id === inv.personId ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
        ).join('');

        App.modal({
            title: (id ? 'ویرایش' : 'فاکتور جدید') + ' - ' + (inv.type === 'sale' ? 'فروش' : 'خرید'),
            body: `
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">شماره فاکتور</label>
                        <input type="text" class="form-control" id="inv-number" value="${Utils.escapeHtml(inv.number)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تاریخ</label>
                        <input type="text" class="form-control" id="inv-date" value="${Utils.escapeHtml(inv.date)}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">طرف حساب</label>
                    <select class="form-control" id="inv-person">
                        <option value="">-- انتخاب --</option>
                        ${personOpts}
                    </select>
                </div>

                <div class="card-title" style="margin-top: 16px;">
                    اقلام فاکتور
                    <button type="button" class="btn btn-sm btn-secondary" onclick="InvoicesPage.addItem()">➕ قلم</button>
                </div>
                <div id="inv-items">
                    ${(inv.items || []).map((it, i) => this.itemTemplate(it, products)).join('')}
                </div>

                <div style="margin-top: 16px; border-top: 2px solid var(--border); padding-top: 12px;">
                    <div class="grid grid-3">
                        <div class="form-group">
                            <label class="form-label">جمع کل</label>
                            <input type="text" class="form-control" id="inv-subtotal" readonly value="${Utils.formatNumber(inv.subtotal || 0)}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">تخفیف (ریال)</label>
                            <input type="number" class="form-control" id="inv-discount" value="${inv.discount || 0}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">مالیات (٪)</label>
                            <input type="number" class="form-control" id="inv-tax-rate" value="${inv.taxRate || 9}">
                        </div>
                    </div>
                    <div style="text-align: left; font-size: 1.2rem; font-weight: 700; padding: 8px 0;">
                        مبلغ نهایی: <span id="inv-total" style="color: var(--primary);">${Utils.formatMoney(inv.total || 0)}</span>
                    </div>
                </div>

                <div class="form-group">
                    <label class="form-label">توضیحات</label>
                    <textarea class="form-control" id="inv-notes" rows="2">${Utils.escapeHtml(inv.notes)}</textarea>
                </div>
            `,
            okText: id ? 'به‌روزرسانی' : 'ذخیره',
            onOk: async () => {
                const items = [];
                document.querySelectorAll('.inv-item').forEach(el => {
                    const productId = el.querySelector('.it-product').value;
                    const name = el.querySelector('.it-name').value.trim();
                    const quantity = Number(el.querySelector('.it-qty').value) || 0;
                    const unitPrice = Number(el.querySelector('.it-price').value) || 0;
                    if (name && quantity) {
                        items.push({ productId, name, quantity, unitPrice, total: quantity * unitPrice });
                    }
                });

                if (items.length === 0) { App.toast('حداقل یک قلم لازم است', 'error'); return false; }

                const subtotal = items.reduce((s,i)=>s+i.total, 0);
                const discount = Number(document.getElementById('inv-discount').value) || 0;
                const taxRate = Number(document.getElementById('inv-tax-rate').value) || 0;
                const tax = (subtotal - discount) * taxRate / 100;
                const total = subtotal - discount + tax;

                const personSelect = document.getElementById('inv-person');
                const personId = personSelect.value;
                const personName = personSelect.options[personSelect.selectedIndex]?.text || '';

                await DB.put('invoices', {
                    id: id || undefined,
                    type: inv.type,
                    number: document.getElementById('inv-number').value.trim(),
                    date: document.getElementById('inv-date').value.trim(),
                    personId, personName,
                    items,
                    subtotal, discount, taxRate, tax, total,
                    status: inv.status || 'draft',
                    notes: document.getElementById('inv-notes').value.trim(),
                    createdAt: inv.createdAt || Date.now(),
                    updatedAt: Date.now()
                });

                App.toast('فاکتور ذخیره شد', 'success');
                App.reload();
                return true;
            }
        });

        setTimeout(() => {
            document.querySelectorAll('.it-qty, .it-price').forEach(i =>
                i.addEventListener('input', () => this.recalculate())
            );
            document.getElementById('inv-discount').addEventListener('input', () => this.recalculate());
            document.getElementById('inv-tax-rate').addEventListener('input', () => this.recalculate());
            // انتخاب کالا برای پرکردن خودکار
            document.querySelectorAll('.it-product').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const pid = e.target.value;
                    const product = products.find(p => p.id === pid);
                    if (product) {
                        const el = e.target.closest('.inv-item');
                        el.querySelector('.it-name').value = product.name;
                        el.querySelector('.it-price').value = inv.type === 'sale'
                            ? (product.salePrice || 0) : (product.purchasePrice || 0);
                        this.recalculate();
                    }
                });
            });
            this.recalculate();
        }, 50);
    },

    itemTemplate(item, products) {
        const opts = products.map(p =>
            `<option value="${p.id}" ${p.id === item.productId ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
        ).join('');
        return `
            <div class="voucher-line inv-item" style="grid-template-columns: 1.5fr 2fr 80px 120px 100px 40px;">
                <select class="it-product">
                    <option value="">-- کالا --</option>
                    ${opts}
                </select>
                <input type="text" class="it-name" placeholder="شرح" value="${Utils.escapeHtml(item.name)}">
                <input type="number" class="it-qty" placeholder="تعداد" value="${item.quantity || 1}">
                <input type="number" class="it-price" placeholder="قیمت" value="${item.unitPrice || 0}">
                <div style="text-align: left; font-size: 0.85rem; padding: 8px;">
                    <span class="it-total">${Utils.formatNumber(item.total || 0)}</span>
                </div>
                <button type="button" class="btn-icon" onclick="this.parentElement.remove(); InvoicesPage.recalculate();">✖</button>
            </div>
        `;
    },

    async addItem() {
        const products = await DB.all('products');
        const wrapper = document.getElementById('inv-items');
        const div = document.createElement('div');
        div.innerHTML = this.itemTemplate({}, products);
        wrapper.appendChild(div.firstElementChild);
        // اتصال رویدادها
        const last = wrapper.lastElementChild;
        last.querySelectorAll('.it-qty, .it-price').forEach(i =>
            i.addEventListener('input', () => this.recalculate())
        );
        last.querySelector('.it-product').addEventListener('change', (e) => {
            const product = products.find(p => p.id === e.target.value);
            if (product) {
                last.querySelector('.it-name').value = product.name;
                last.querySelector('.it-price').value = product.salePrice || 0;
                this.recalculate();
            }
        });
    },

    recalculate() {
        let subtotal = 0;
        document.querySelectorAll('.inv-item').forEach(el => {
            const q = Number(el.querySelector('.it-qty').value) || 0;
            const p = Number(el.querySelector('.it-price').value) || 0;
            const total = q * p;
            el.querySelector('.it-total').textContent = Utils.formatNumber(total);
            subtotal += total;
        });
        const discount = Number(document.getElementById('inv-discount')?.value) || 0;
        const taxRate = Number(document.getElementById('inv-tax-rate')?.value) || 0;
        const tax = (subtotal - discount) * taxRate / 100;
        const total = subtotal - discount + tax;

        const subEl = document.getElementById('inv-subtotal');
        const totEl = document.getElementById('inv-total');
        if (subEl) subEl.value = Utils.formatNumber(subtotal);
        if (totEl) totEl.textContent = Utils.formatMoney(total);
    },

    async view(id) {
        const inv = await DB.get('invoices', id);
        if (!inv) return;
        App.modal({
            title: `فاکتور ${inv.type === 'sale' ? 'فروش' : 'خرید'} شماره ${Utils.toPersianDigits(inv.number)}`,
            body: `
                <div style="margin-bottom: 12px;">
                    <strong>تاریخ:</strong> ${Utils.toPersianDigits(inv.date)} |
                    <strong>طرف حساب:</strong> ${Utils.escapeHtml(inv.personName || '-')}
                </div>
                <table class="table">
                    <thead><tr><th>شرح</th><th>تعداد</th><th>قیمت</th><th>جمع</th></tr></thead>
                    <tbody>
                        ${inv.items.map(it => `
                            <tr>
                                <td>${Utils.escapeHtml(it.name)}</td>
                                <td>${Utils.toPersianDigits(it.quantity)}</td>
                                <td>${Utils.formatNumber(it.unitPrice)}</td>
                                <td>${Utils.formatNumber(it.total)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top: 12px; text-align: left; line-height: 2;">
                    <div>جمع: ${Utils.formatMoney(inv.subtotal)}</div>
                    <div>تخفیف: ${Utils.formatMoney(inv.discount)}</div>
                    <div>مالیات: ${Utils.formatMoney(inv.tax)}</div>
                    <div style="font-weight: 700; font-size: 1.1rem;">مبلغ نهایی: ${Utils.formatMoney(inv.total)}</div>
                </div>
            `,
            okText: 'بستن',
            onOk: async () => true
        });
    },

    async deleteItem(id) {
        if (!confirm('حذف شود؟')) return;
        await DB.delete('invoices', id);
        App.toast('حذف شد', 'success');
        App.reload();
    }
};
