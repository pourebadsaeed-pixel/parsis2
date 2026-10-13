// ═══════════════ داشبورد ═══════════════

const DashboardPage = {
    async render() {
        const [persons, products, invoices, vouchers, receipts] = await Promise.all([
            DB.all('persons'),
            DB.all('products'),
            DB.all('invoices'),
            DB.all('vouchers'),
            DB.all('receipts')
        ]);

        const salesTotal = invoices
            .filter(i => i.type === 'sale')
            .reduce((s, i) => s + (i.total || 0), 0);

        const purchaseTotal = invoices
            .filter(i => i.type === 'purchase')
            .reduce((s, i) => s + (i.total || 0), 0);

        const recentInvoices = [...invoices]
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
            .slice(0, 5);

        return `
            <div class="page-header">
                <div>
                    <h1 class="page-title">داشبورد</h1>
                    <p class="page-subtitle">خلاصه وضعیت سیستم - ${Utils.todayPersian()}</p>
                </div>
            </div>

            <div class="grid grid-4" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-icon">👥</div>
                    <div class="stat-info">
                        <div class="stat-value">${Utils.toPersianDigits(persons.length)}</div>
                        <div class="stat-label">اشخاص</div>
                    </div>
                </div>
                <div class="stat-card success">
                    <div class="stat-icon">📦</div>
                    <div class="stat-info">
                        <div class="stat-value">${Utils.toPersianDigits(products.length)}</div>
                        <div class="stat-label">کالا و خدمات</div>
                    </div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-icon">🧾</div>
                    <div class="stat-info">
                        <div class="stat-value">${Utils.toPersianDigits(invoices.length)}</div>
                        <div class="stat-label">فاکتورها</div>
                    </div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-icon">📝</div>
                    <div class="stat-info">
                        <div class="stat-value">${Utils.toPersianDigits(vouchers.length)}</div>
                        <div class="stat-label">اسناد حسابداری</div>
                    </div>
                </div>
            </div>

            <div class="grid grid-2">
                <div class="card">
                    <div class="card-title">💰 خلاصه مالی</div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <span>مجموع فروش</span>
                        <span style="color: var(--success); font-weight: 600;">${Utils.formatMoney(salesTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border);">
                        <span>مجموع خرید</span>
                        <span style="color: var(--danger); font-weight: 600;">${Utils.formatMoney(purchaseTotal)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; padding: 12px 0;">
                        <span>سود ناخالص</span>
                        <span style="color: var(--primary); font-weight: 700;">${Utils.formatMoney(salesTotal - purchaseTotal)}</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-title">📋 آخرین فاکتورها</div>
                    ${recentInvoices.length === 0
                        ? '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">فاکتوری ثبت نشده است</p>'
                        : recentInvoices.map(inv => `
                            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border);">
                                <div>
                                    <div style="font-weight: 500;">${Utils.escapeHtml(inv.personName || '-')}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-secondary);">${inv.date || ''}</div>
                                </div>
                                <span class="badge ${inv.type === 'sale' ? 'badge-success' : 'badge-info'}">
                                    ${inv.type === 'sale' ? 'فروش' : 'خرید'}
                                </span>
                            </div>
                        `).join('')
                    }
                </div>
            </div>
        `;
    }
};
