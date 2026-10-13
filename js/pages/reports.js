// ═══════════════ گزارشات ═══════════════

const ReportsPage = {
    currentTab: 'ledger',

    async render() {
        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">گزارشات</h1>
                    <p class="page-subtitle">گزارشات مالی و حسابداری</p>
                </div>
            </div>

            <div class="tabs">
                <button class="tab ${this.currentTab==='ledger'?'active':''}" onclick="ReportsPage.setTab('ledger')">دفتر روزنامه</button>
                <button class="tab ${this.currentTab==='accounts'?'active':''}" onclick="ReportsPage.setTab('accounts')">دفتر کل</button>
                <button class="tab ${this.currentTab==='trial'?'active':''}" onclick="ReportsPage.setTab('trial')">تراز آزمایشی</button>
                <button class="tab ${this.currentTab==='pl'?'active':''}" onclick="ReportsPage.setTab('pl')">سود و زیان</button>
                <button class="tab ${this.currentTab==='bs'?'active':''}" onclick="ReportsPage.setTab('bs')">ترازنامه</button>
            </div>

            <div class="card" id="report-content">
                ${await this.renderTab()}
            </div>
        `;
    },

    async bind() {},

    async setTab(tab) {
        this.currentTab = tab;
        App.reload();
    },

    async renderTab() {
        switch (this.currentTab) {
            case 'ledger': return this.renderLedger();
            case 'accounts': return this.renderAccountLedger();
            case 'trial': return this.renderTrialBalance();
            case 'pl': return this.renderPL();
            case 'bs': return this.renderBS();
        }
        return '';
    },

    async renderLedger() {
        const [vouchers, accounts] = await Promise.all([DB.all('vouchers'), DB.all('accounts')]);
        const accMap = Object.fromEntries(accounts.map(a => [a.id, a]));
        vouchers.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        const rows = [];
        vouchers.forEach(v => {
            (v.lines || []).forEach(l => {
                const a = accMap[l.accountId];
                rows.push({
                    date: v.date, number: v.number,
                    account: a ? `${Utils.toPersianDigits(a.code)} - ${a.name}` : '-',
                    description: l.description || v.description,
                    debit: l.debit || 0, credit: l.credit || 0
                });
            });
        });

        if (rows.length === 0) return '<div class="empty-state"><div class="icon">📖</div><h3>سندی ثبت نشده</h3></div>';

        return `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>تاریخ</th><th>شماره</th><th>حساب</th>
                            <th>شرح</th><th>بدهکار</th><th>بستانکار</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>${Utils.toPersianDigits(r.date)}</td>
                                <td>${Utils.toPersianDigits(r.number)}</td>
                                <td>${Utils.escapeHtml(r.account)}</td>
                                <td>${Utils.escapeHtml(r.description)}</td>
                                <td>${r.debit ? Utils.formatNumber(r.debit) : '-'}</td>
                                <td>${r.credit ? Utils.formatNumber(r.credit) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderAccountLedger() {
        const [accounts, vouchers] = await Promise.all([DB.all('accounts'), DB.all('vouchers')]);
        const balances = {};
        vouchers.forEach(v => (v.lines || []).forEach(l => {
            if (!balances[l.accountId]) balances[l.accountId] = { debit: 0, credit: 0 };
            balances[l.accountId].debit += Number(l.debit) || 0;
            balances[l.accountId].credit += Number(l.credit) || 0;
        }));

        accounts.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

        return `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr>
                            <th>کد</th><th>نام</th><th>نوع</th>
                            <th>گردش بدهکار</th><th>گردش بستانکار</th><th>مانده</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accounts.map(a => {
                            const b = balances[a.id] || { debit: 0, credit: 0 };
                            const diff = b.debit - b.credit;
                            return `<tr>
                                <td>${Utils.toPersianDigits(a.code)}</td>
                                <td>${Utils.escapeHtml(a.name)}</td>
                                <td>${AccountsPage.typeLabel(a.type)}</td>
                                <td>${Utils.formatNumber(b.debit)}</td>
                                <td>${Utils.formatNumber(b.credit)}</td>
                                <td style="font-weight:600; color: ${diff >= 0 ? 'var(--success)' : 'var(--danger)'}">
                                    ${Utils.formatNumber(Math.abs(diff))} ${diff >= 0 ? 'بد' : 'بس'}
                                </td>
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderTrialBalance() {
        const [accounts, vouchers] = await Promise.all([DB.all('accounts'), DB.all('vouchers')]);
        const balances = {};
        vouchers.forEach(v => (v.lines || []).forEach(l => {
            if (!balances[l.accountId]) balances[l.accountId] = { debit: 0, credit: 0 };
            balances[l.accountId].debit += Number(l.debit) || 0;
            balances[l.accountId].credit += Number(l.credit) || 0;
        }));

        let totalD = 0, totalC = 0;
        const rows = accounts.filter(a => balances[a.id]).map(a => {
            const b = balances[a.id];
            const diff = b.debit - b.credit;
            const finalD = diff > 0 ? diff : 0;
            const finalC = diff < 0 ? -diff : 0;
            totalD += finalD; totalC += finalC;
            return { a, finalD, finalC };
        });

        return `
            <div class="table-wrapper">
                <table class="table">
                    <thead>
                        <tr><th>کد</th><th>نام حساب</th><th>بدهکار</th><th>بستانکار</th></tr>
                    </thead>
                    <tbody>
                        ${rows.map(r => `
                            <tr>
                                <td>${Utils.toPersianDigits(r.a.code)}</td>
                                <td>${Utils.escapeHtml(r.a.name)}</td>
                                <td>${r.finalD ? Utils.formatNumber(r.finalD) : '-'}</td>
                                <td>${r.finalC ? Utils.formatNumber(r.finalC) : '-'}</td>
                            </tr>
                        `).join('')}
                        <tr style="background: var(--bg); font-weight: 700;">
                            <td colspan="2">جمع کل</td>
                            <td>${Utils.formatNumber(totalD)}</td>
                            <td>${Utils.formatNumber(totalC)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    },

    async renderPL() {
        const [accounts, vouchers] = await Promise.all([DB.all('accounts'), DB.all('vouchers')]);
        const balances = {};
        vouchers.forEach(v => (v.lines || []).forEach(l => {
            if (!balances[l.accountId]) balances[l.accountId] = { debit: 0, credit: 0 };
            balances[l.accountId].debit += Number(l.debit) || 0;
            balances[l.accountId].credit += Number(l.credit) || 0;
        }));

        const revenues = accounts.filter(a => a.type === 'revenue').map(a => {
            const b = balances[a.id] || { debit: 0, credit: 0 };
            return { name: a.name, amount: b.credit - b.debit };
        });
        const expenses = accounts.filter(a => a.type === 'expense').map(a => {
            const b = balances[a.id] || { debit: 0, credit: 0 };
            return { name: a.name, amount: b.debit - b.credit };
        });

        const totalRev = revenues.reduce((s, r) => s + r.amount, 0);
        const totalExp = expenses.reduce((s, e) => s + e.amount, 0);
        const profit = totalRev - totalExp;

        return `
            <h3 style="color: var(--success); margin-bottom: 12px;">درآمدها</h3>
            <table class="table" style="margin-bottom: 20px;">
                ${revenues.map(r => `<tr><td>${Utils.escapeHtml(r.name)}</td><td style="text-align:left;">${Utils.formatMoney(r.amount)}</td></tr>`).join('')}
                <tr style="font-weight:700; background: var(--bg);">
                    <td>جمع درآمدها</td><td style="text-align:left;">${Utils.formatMoney(totalRev)}</td>
                </tr>
            </table>

            <h3 style="color: var(--danger); margin-bottom: 12px;">هزینه‌ها</h3>
            <table class="table" style="margin-bottom: 20px;">
                ${expenses.map(e => `<tr><td>${Utils.escapeHtml(e.name)}</td><td style="text-align:left;">${Utils.formatMoney(e.amount)}</td></tr>`).join('')}
                <tr style="font-weight:700; background: var(--bg);">
                    <td>جمع هزینه‌ها</td><td style="text-align:left;">${Utils.formatMoney(totalExp)}</td>
                </tr>
            </table>

            <div class="card" style="background: ${profit >= 0 ? '#e6f4ea' : '#fce8e6'};">
                <div style="font-size: 1.2rem; font-weight: 700; text-align: center; color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${profit >= 0 ? 'سود' : 'زیان'} دوره: ${Utils.formatMoney(Math.abs(profit))}
                </div>
            </div>
        `;
    },

    async renderBS() {
        const [accounts, vouchers] = await Promise.all([DB.all('accounts'), DB.all('vouchers')]);
        const balances = {};
        vouchers.forEach(v => (v.lines || []).forEach(l => {
            if (!balances[l.accountId]) balances[l.accountId] = { debit: 0, credit: 0 };
            balances[l.accountId].debit += Number(l.debit) || 0;
            balances[l.accountId].credit += Number(l.credit) || 0;
        }));

        const assets = accounts.filter(a => a.type === 'asset').map(a => {
            const b = balances[a.id] || { debit: 0, credit: 0 };
            return { name: a.name, amount: b.debit - b.credit };
        });
        const liabilities = accounts.filter(a => a.type === 'liability').map(a => {
            const b = balances[a.id] || { debit: 0, credit: 0 };
            return { name: a.name, amount: b.credit - b.debit };
        });
        const equity = accounts.filter(a => a.type === 'equity').map(a => {
            const b = balances[a.id] || { debit: 0, credit: 0 };
            return { name: a.name, amount: b.credit - b.debit };
        });

        const totalAssets = assets.reduce((s, a) => s + a.amount, 0);
        const totalLiab = liabilities.reduce((s, l) => s + l.amount, 0);
        const totalEq = equity.reduce((s, e) => s + e.amount, 0);

        return `
            <div class="grid grid-2">
                <div>
                    <h3 style="color: var(--primary); margin-bottom: 12px;">دارایی‌ها</h3>
                    <table class="table">
                        ${assets.map(a => `<tr><td>${Utils.escapeHtml(a.name)}</td><td style="text-align:left;">${Utils.formatMoney(a.amount)}</td></tr>`).join('')}
                        <tr style="font-weight:700; background: var(--bg);">
                            <td>جمع دارایی‌ها</td><td style="text-align:left;">${Utils.formatMoney(totalAssets)}</td>
                        </tr>
                    </table>
                </div>
                <div>
                    <h3 style="color: var(--warning); margin-bottom: 12px;">بدهی‌ها</h3>
                    <table class="table" style="margin-bottom: 20px;">
                        ${liabilities.map(l => `<tr><td>${Utils.escapeHtml(l.name)}</td><td style="text-align:left;">${Utils.formatMoney(l.amount)}</td></tr>`).join('')}
                        <tr style="font-weight:700; background: var(--bg);">
                            <td>جمع بدهی‌ها</td><td style="text-align:left;">${Utils.formatMoney(totalLiab)}</td>
                        </tr>
                    </table>

                    <h3 style="color: var(--success); margin-bottom: 12px;">سرمایه</h3>
                    <table class="table">
                        ${equity.map(e => `<tr><td>${Utils.escapeHtml(e.name)}</td><td style="text-align:left;">${Utils.formatMoney(e.amount)}</td></tr>`).join('')}
                        <tr style="font-weight:700; background: var(--bg);">
                            <td>جمع سرمایه</td><td style="text-align:left;">${Utils.formatMoney(totalEq)}</td>
                        </tr>
                    </table>
                </div>
            </div>
            <div class="card" style="margin-top: 20px; background: var(--primary-light);">
                <div style="text-align: center; font-size: 1.1rem;">
                    جمع بدهی‌ها و سرمایه: <strong>${Utils.formatMoney(totalLiab + totalEq)}</strong>
                </div>
            </div>
        `;
    }
};
