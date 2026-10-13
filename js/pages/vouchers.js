// ═══════════════ اسناد حسابداری ═══════════════

const VouchersPage = {
    async render() {
        const vouchers = await DB.all('vouchers');
        vouchers.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">اسناد حسابداری</h1>
                    <p class="page-subtitle">ثبت اسناد دستی و اتوماتیک</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-primary" onclick="VouchersPage.openForm()">➕ سند جدید</button>
                </div>
            </div>

            <div class="card">
                ${vouchers.length === 0
                    ? `<div class="empty-state">
                        <div class="icon">📝</div>
                        <h3>هیچ سندی ثبت نشده</h3>
                        <button class="btn btn-primary" onclick="VouchersPage.openForm()">➕ ثبت سند</button>
                    </div>`
                    : `<div class="table-wrapper">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>شماره</th>
                                    <th>تاریخ</th>
                                    <th>شرح</th>
                                    <th>بدهکار</th>
                                    <th>بستانکار</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vouchers.map(v => {
                                    const debit = (v.lines||[]).reduce((s,l)=>s+(Number(l.debit)||0),0);
                                    const credit = (v.lines||[]).reduce((s,l)=>s+(Number(l.credit)||0),0);
                                    return `
                                        <tr>
                                            <td>${Utils.toPersianDigits(v.number || '-')}</td>
                                            <td>${Utils.toPersianDigits(v.date || '')}</td>
                                            <td>${Utils.escapeHtml(v.description || '-')}</td>
                                            <td>${Utils.formatMoney(debit)}</td>
                                            <td>${Utils.formatMoney(credit)}</td>
                                            <td>
                                                <div class="actions">
                                                    <button class="btn-icon" onclick="VouchersPage.view('${v.id}')">👁️</button>
                                                    <button class="btn-icon" onclick="VouchersPage.openForm('${v.id}')">✏️</button>
                                                    <button class="btn-icon" onclick="VouchersPage.deleteItem('${v.id}')">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>`
                }
            </div>
        `;
    },

    async bind() {},

    async openForm(id = null) {
        const [accounts, allVouchers] = await Promise.all([
            DB.all('accounts'),
            DB.all('vouchers')
        ]);
        accounts.sort((a,b)=>(a.code||'').localeCompare(b.code||''));

        const v = id ? await DB.get('vouchers', id) : {
            number: (allVouchers.length + 1).toString().padStart(4, '0'),
            date: Utils.todayPersian(),
            description: '',
            lines: [{ accountId: '', description: '', debit: 0, credit: 0 }]
        };

        const accountOptions = accounts.map(a =>
            `<option value="${a.id}">${Utils.toPersianDigits(a.code)} - ${Utils.escapeHtml(a.name)}</option>`
        ).join('');

        const linesHtml = (v.lines || []).map((l, i) => this.lineTemplate(l, i, accounts)).join('');

        App.modal({
            title: id ? 'ویرایش سند' : 'سند حسابداری جدید',
            body: `
                <div class="grid grid-2">
                    <div class="form-group">
                        <label class="form-label">شماره سند</label>
                        <input type="text" class="form-control" id="v-number" value="${Utils.escapeHtml(v.number)}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">تاریخ</label>
                        <input type="text" class="form-control" id="v-date" value="${Utils.escapeHtml(v.date)}" placeholder="1403/05/20">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">شرح سند</label>
                    <input type="text" class="form-control" id="v-description" value="${Utils.escapeHtml(v.description)}">
                </div>

                <div class="card-title" style="margin-top: 16px;">
                    آرتیکل‌های سند
                    <button class="btn btn-sm btn-secondary" type="button" onclick="VouchersPage.addLine()">➕ آرتیکل</button>
                </div>
                <div id="voucher-lines" class="voucher-lines">
                    ${linesHtml}
                </div>
                <div class="voucher-total">
                    <span>جمع بدهکار: <span id="total-debit" style="color: var(--success);">۰</span></span>
                    <span>جمع بستانکار: <span id="total-credit" style="color: var(--danger);">۰</span></span>
                </div>
            `,
            okText: id ? 'به‌روزرسانی' : 'ذخیره',
            onOk: async () => {
                const lines = [];
                document.querySelectorAll('.voucher-line').forEach(el => {
                    const accountId = el.querySelector('.v-account').value;
                    const description = el.querySelector('.v-description').value;
                    const debit = Number(el.querySelector('.v-debit').value) || 0;
                    const credit = Number(el.querySelector('.v-credit').value) || 0;
                    if (accountId && (debit || credit)) {
                        lines.push({ accountId, description, debit, credit });
                    }
                });

                if (lines.length < 2) { App.toast('حداقل دو آرتیکل لازم است', 'error'); return false; }
                const totalD = lines.reduce((s,l)=>s+l.debit,0);
                const totalC = lines.reduce((s,l)=>s+l.credit,0);
                if (Math.abs(totalD - totalC) > 0.01) {
                    App.toast('سند تراز نیست!', 'error'); return false;
                }

                await DB.put('vouchers', {
                    id: id || undefined,
                    number: document.getElementById('v-number').value.trim(),
                    date: document.getElementById('v-date').value.trim(),
                    description: document.getElementById('v-description').value.trim(),
                    lines,
                    createdAt: v.createdAt || Date.now(),
                    updatedAt: Date.now()
                });
                App.toast('سند ذخیره شد', 'success');
                App.reload();
                return true;
            }
        });

        // محاسبه مجموع به صورت لحظه‌ای
        setTimeout(() => {
            document.querySelectorAll('.v-debit, .v-credit').forEach(inp => {
                inp.addEventListener('input', () => this.updateTotals());
            });
            this.updateTotals();
        }, 50);
    },

    lineTemplate(line, index, accounts) {
        const opts = accounts.map(a =>
            `<option value="${a.id}" ${a.id === line.accountId ? 'selected' : ''}>
                ${Utils.toPersianDigits(a.code)} - ${Utils.escapeHtml(a.name)}
            </option>`
        ).join('');

        return `
            <div class="voucher-line" data-index="${index}">
                <select class="v-account">
                    <option value="">-- انتخاب حساب --</option>
                    ${opts}
                </select>
                <input type="text" class="v-description" placeholder="شرح" value="${Utils.escapeHtml(line.description)}">
                <input type="number" class="v-debit" placeholder="بدهکار" value="${line.debit || ''}">
                <input type="number" class="v-credit" placeholder="بستانکار" value="${line.credit || ''}">
                <button type="button" class="btn-icon" onclick="this.parentElement.remove(); VouchersPage.updateTotals();">✖</button>
            </div>
        `;
    },

    async addLine() {
        const accounts = await DB.all('accounts');
        accounts.sort((a,b)=>(a.code||'').localeCompare(b.code||''));
        const wrapper = document.getElementById('voucher-lines');
        const div = document.createElement('div');
        div.innerHTML = this.lineTemplate({}, wrapper.children.length, accounts);
        wrapper.appendChild(div.firstElementChild);

        wrapper.querySelectorAll('.voucher-line:last-child .v-debit, .voucher-line:last-child .v-credit').forEach(inp => {
            inp.addEventListener('input', () => this.updateTotals());
        });
    },

    updateTotals() {
        let d = 0, c = 0;
        document.querySelectorAll('.v-debit').forEach(i => d += Number(i.value) || 0);
        document.querySelectorAll('.v-credit').forEach(i => c += Number(i.value) || 0);
        const dEl = document.getElementById('total-debit');
        const cEl = document.getElementById('total-credit');
        if (dEl) dEl.textContent = Utils.formatNumber(d);
        if (cEl) cEl.textContent = Utils.formatNumber(c);
    },

    async view(id) {
        const v = await DB.get('vouchers', id);
        if (!v) return;
        const accounts = await DB.all('accounts');
        const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));

        const totalD = (v.lines||[]).reduce((s,l)=>s+(l.debit||0),0);
        const totalC = (v.lines||[]).reduce((s,l)=>s+(l.credit||0),0);

        App.modal({
            title: `سند شماره ${Utils.toPersianDigits(v.number)} - ${v.date}`,
            body: `
                <p style="margin-bottom: 12px;"><strong>شرح:</strong> ${Utils.escapeHtml(v.description || '-')}</p>
                <div class="table-wrapper">
                    <table class="table">
                        <thead>
                            <tr><th>حساب</th><th>شرح</th><th>بدهکار</th><th>بستانکار</th></tr>
                        </thead>
                        <tbody>
                            ${v.lines.map(l => {
                                const a = accMap[l.accountId];
                                return `<tr>
                                    <td>${a ? Utils.toPersianDigits(a.code) + ' - ' + Utils.escapeHtml(a.name) : '-'}</td>
                                    <td>${Utils.escapeHtml(l.description || '-')}</td>
                                    <td>${l.debit ? Utils.formatNumber(l.debit) : '-'}</td>
                                    <td>${l.credit ? Utils.formatNumber(l.credit) : '-'}</td>
                                </tr>`;
                            }).join('')}
                            <tr style="background: var(--bg); font-weight: 700;">
                                <td colspan="2">جمع</td>
                                <td>${Utils.formatNumber(totalD)}</td>
                                <td>${Utils.formatNumber(totalC)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `,
            okText: 'بستن',
            onOk: async () => true
        });
    },

    async deleteItem(id) {
        if (!confirm('این سند حذف شود؟')) return;
        await DB.delete('vouchers', id);
        App.toast('حذف شد', 'success');
        App.reload();
    }
};
