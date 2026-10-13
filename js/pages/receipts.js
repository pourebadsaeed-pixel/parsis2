// ═══════════════ دریافت / پرداخت ═══════════════

const ReceiptsPage = {
    async render() {
        const receipts = await DB.all('receipts');
        receipts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">دریافت / پرداخت</h1>
                    <p class="page-subtitle">ثبت دریافت‌ها و پرداخت‌های نقدی و بانکی</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-success" onclick="ReceiptsPage.openForm(null, 'receipt')">📥 دریافت</button>
                    <button class="btn btn-danger" onclick="ReceiptsPage.openForm(null, 'payment')">📤 پرداخت</button>
                </div>
            </div>

            <div class="card">
                ${receipts.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">💰</div>
                        <h3>هیچ دریافت/پرداختی ثبت نشده</h3>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>شماره</th>
                                    <th>نوع</th>
                                    <th>تاریخ</th>
                                    <th>طرف حساب</th>
                                    <th>مبلغ</th>
                                    <th>روش</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${receipts.map(r => `
                                    <tr>
                                        <td>${Utils.toPersianDigits(r.number || '-')}</td>
                                        <td>
                                            <span class="badge ${r.type === 'receipt' ? 'badge-success' : 'badge-danger'}">
                                                ${r.type === 'receipt' ? 'دریافت' : 'پرداخت'}
                                            </span>
                                        </td>
                                        <td>${Utils.toPersianDigits(r.date || '')}</td>
                                        <td>${Utils.escapeHtml(r.personName || '-')}</td>
                                        <td>${Utils.formatMoney(r.amount || 0)}</td>
                                        <td>${this.methodLabel(r.method)}</td>
                                        <td>
                                            <div class="actions">
                                                <button class="btn-icon" onclick="ReceiptsPage.openForm('${r.id}')">✏️</button>
                                                <button class="btn-icon" onclick="ReceiptsPage.deleteItem('${r.id}')">🗑️</button>
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

    methodLabel(m) {
        const map = { cash: 'نقد', bank: 'بانک', cheque: 'چک', card: 'کارت' };
        return map[m] || m || '-';
    },

    async bind() {},

    async openForm(id = null, type = 'receipt') {
        const [persons, allRec] = await Promise.all([
            DB.all('persons'), DB.all('receipts')
        ]);

        const r = id ? await DB.get('receipts', id) : {
            type,
            number: (allRec.filter(x => x.type === type).length + 1).toString().padStart(4, '0'),
            date: Utils.todayPersian(),
            personId: '', personName: '',
            amount: 0, method: 'cash', description: '', reference: ''
        };

        const personOpts = persons.map(p =>
            `<option value="${p.id}" ${p.id === r.personId ? 'selected' : ''}>${Utils.escapeHtml(p.name)}</option>`
        ).join('');

        App.modal({
            title: (id ? 'ویرایش' : 'ثبت') + ' - ' + (r.type === 'receipt' ? 'دریافت' : 'پرداخت'),
            body: `
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">شماره</label>
                        <input type="text" class="form-control" id="r-number" value="${Utils.escapeHtml(r.number)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تاریخ</label>
                        <input type="text" class="form-control" id="r-date" value="${Utils.escapeHtml(r.date)}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">طرف حساب</label>
                    <select class="form-control" id="r-person">
                        <option value="">-- انتخاب --</option>
                        ${personOpts}
                    </select>
                </div>
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">مبلغ (ریال)</label>
                        <input type="number" class="form-control" id="r-amount" value="${r.amount || 0}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">روش</label>
                        <select class="form-control" id="r-method">
                            <option value="cash" ${r.method==='cash'?'selected':''}>نقد</option>
                            <option value="bank" ${r.method==='bank'?'selected':''}>بانک</option>
                            <option value="cheque" ${r.method==='cheque'?'selected':''}>چک</option>
                            <option value="card" ${r.method==='card'?'selected':''}>کارت</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">شماره پیگیری / چک</label>
                    <input type="text" class="form-control" id="r-reference" value="${Utils.escapeHtml(r.reference)}">
                </div>
                <div class="form-group">
                    <label class="form-label">توضیحات</label>
                    <textarea class="form-control" id="r-description" rows="2">${Utils.escapeHtml(r.description)}</textarea>
                </div>
            `,
            okText: 'ذخیره',
            onOk: async () => {
                const personSelect = document.getElementById('r-person');
                const personId = personSelect.value;
                const personName = personSelect.options[personSelect.selectedIndex]?.text || '';

                const data = {
                    id: id || undefined,
                    type: r.type,
                    number: document.getElementById('r-number').value.trim(),
                    date: document.getElementById('r-date').value.trim(),
                    personId, personName,
                    amount: Number(document.getElementById('r-amount').value) || 0,
                    method: document.getElementById('r-method').value,
                    reference: document.getElementById('r-reference').value.trim(),
                    description: document.getElementById('r-description').value.trim(),
                    createdAt: r.createdAt || Date.now()
                };
                if (!data.amount) { App.toast('مبلغ الزامی است', 'error'); return false; }
                await DB.put('receipts', data);
                App.toast('ذخیره شد', 'success');
                App.reload();
                return true;
            }
        });
    },

    async deleteItem(id) {
        if (!confirm('حذف شود؟')) return;
        await DB.delete('receipts', id);
        App.toast('حذف شد', 'success');
        App.reload();
    }
};
