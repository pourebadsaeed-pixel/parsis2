// ═══════════════ کالا و خدمات ═══════════════

const ProductsPage = {
    filter: '',

    async render() {
        let products = await DB.all('products');
        if (this.filter) {
            const f = this.filter.toLowerCase();
            products = products.filter(p =>
                (p.name || '').toLowerCase().includes(f) ||
                (p.code || '').toLowerCase().includes(f)
            );
        }

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">کالا و خدمات</h1>
                    <p class="page-subtitle">مدیریت کالاها و خدمات</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="ProductsPage.openForm()">➕ کالا/خدمت جدید</button>
                </div>
            </div>

            <div class="card">
                <div class="search-box" style="margin-bottom: 16px;">
                    <input type="text" class="form-control" id="product-search"
                        placeholder="جستجو..." value="${Utils.escapeHtml(this.filter)}">
                </div>

                ${products.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">📦</div>
                        <h3>هیچ کالایی ثبت نشده</h3>
                        <button class="btn btn-primary" onclick="ProductsPage.openForm()">➕ افزودن کالا</button>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>کد</th>
                                    <th>نام</th>
                                    <th>واحد</th>
                                    <th>قیمت خرید</th>
                                    <th>قیمت فروش</th>
                                    <th>موجودی</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${products.map(p => `
                                    <tr>
                                        <td>${Utils.escapeHtml(p.code || '-')}</td>
                                        <td>${Utils.escapeHtml(p.name)}</td>
                                        <td>${Utils.escapeHtml(p.unit || '-')}</td>
                                        <td>${Utils.formatMoney(p.purchasePrice || 0)}</td>
                                        <td>${Utils.formatMoney(p.salePrice || 0)}</td>
                                        <td>${Utils.toPersianDigits(p.stock || 0)}</td>
                                        <td>
                                            <div class="actions">
                                                <button class="btn-icon" onclick="ProductsPage.openForm('${p.id}')">✏️</button>
                                                <button class="btn-icon" onclick="ProductsPage.deleteItem('${p.id}')">🗑️</button>
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

    async bind() {
        const s = document.getElementById('product-search');
        if (s) s.addEventListener('input', Utils.debounce(e => {
            ProductsPage.filter = e.target.value;
            App.reload();
        }, 300));
    },

    async openForm(id = null) {
        const p = id ? await DB.get('products', id) : {
            name: '', code: '', unit: '', purchasePrice: 0, salePrice: 0, stock: 0, notes: ''
        };

        App.modal({
            title: id ? 'ویرایش کالا/خدمت' : 'کالا/خدمت جدید',
            body: `
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">نام <span class="required">*</span></label>
                        <input type="text" class="form-control" id="pr-name" value="${Utils.escapeHtml(p.name)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">کد</label>
                        <input type="text" class="form-control" id="pr-code" value="${Utils.escapeHtml(p.code)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">واحد</label>
                        <input type="text" class="form-control" id="pr-unit" value="${Utils.escapeHtml(p.unit)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">موجودی</label>
                        <input type="number" class="form-control" id="pr-stock" value="${p.stock || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">قیمت خرید (ریال)</label>
                        <input type="number" class="form-control" id="pr-purchase" value="${p.purchasePrice || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">قیمت فروش (ریال)</label>
                        <input type="number" class="form-control" id="pr-sale" value="${p.salePrice || 0}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">توضیحات</label>
                    <textarea class="form-control" id="pr-notes" rows="2">${Utils.escapeHtml(p.notes)}</textarea>
                </div>
            `,
            okText: id ? 'به‌روزرسانی' : 'ذخیره',
            onOk: async () => {
                const data = {
                    id: id || undefined,
                    name: document.getElementById('pr-name').value.trim(),
                    code: document.getElementById('pr-code').value.trim(),
                    unit: document.getElementById('pr-unit').value.trim(),
                    stock: Number(document.getElementById('pr-stock').value) || 0,
                    purchasePrice: Number(document.getElementById('pr-purchase').value) || 0,
                    salePrice: Number(document.getElementById('pr-sale').value) || 0,
                    notes: document.getElementById('pr-notes').value.trim(),
                    createdAt: p.createdAt || Date.now(),
                    updatedAt: Date.now()
                };
                if (!data.name) { App.toast('نام الزامی است', 'error'); return false; }
                await DB.put('products', data);
                App.toast('ذخیره شد', 'success');
                App.reload();
                return true;
            }
        });
    },

    async deleteItem(id) {
        if (!confirm('حذف شود؟')) return;
        await DB.delete('products', id);
        App.toast('حذف شد', 'success');
        App.reload();
    }
};
