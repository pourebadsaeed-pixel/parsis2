// ═══════════════ App Core ═══════════════

const PAGES = {
    dashboard: DashboardPage,
    persons: PersonsPage,
    products: ProductsPage,
    accounts: AccountsPage,
    vouchers: VouchersPage,
    invoices: InvoicesPage,
    receipts: ReceiptsPage,
    reports: ReportsPage,
    settings: SettingsPage
};

const App = {
    currentPage: 'dashboard',

    async init() {
        // ثبت Service Worker
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./service-worker.js');
                console.log('✓ Service Worker registered');
            } catch (e) {
                console.warn('SW registration failed:', e);
            }
        }

        // راه‌اندازی DB
        await DB.open();

        // مسیریابی
        window.addEventListener('hashchange', () => this.route());
        this.bindGlobalEvents();
        this.bindInstallPrompt();

        // بارگذاری اولیه
        await this.route();

        // پنهان کردن لودر
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app').hidden = false;
    },

    bindGlobalEvents() {
        // دکمه منوی موبایل
        document.getElementById('hamburger')?.addEventListener('click', () => {
            document.getElementById('sidebar').classList.add('open');
            document.getElementById('overlay').classList.add('open');
        });

        const closeSidebar = () => {
            document.getElementById('sidebar').classList.remove('open');
            document.getElementById('overlay').classList.remove('open');
        };
        document.getElementById('close-sidebar')?.addEventListener('click', closeSidebar);
        document.getElementById('overlay')?.addEventListener('click', closeSidebar);

        // مودال
        document.getElementById('modal-close')?.addEventListener('click', () => this.closeModal());
        document.querySelector('.modal-backdrop')?.addEventListener('click', () => this.closeModal());

        // ناوبری
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', () => {
                if (window.innerWidth <= 900) closeSidebar();
            });
        });
    },

    bindInstallPrompt() {
        let deferredPrompt = null;
        const installBtn = document.getElementById('btn-install');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.hidden = false;
        });

        installBtn?.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                App.toast('اپلیکیشن نصب شد', 'success');
            }
            deferredPrompt = null;
            installBtn.hidden = true;
        });
    },

    async route() {
        const hash = location.hash.replace('#', '') || 'dashboard';
        const page = PAGES[hash] ? hash : 'dashboard';
        this.currentPage = page;

        // به‌روزرسانی منو
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });

        await this.render();
    },

    async render() {
        const container = document.getElementById('page-container');
        const page = PAGES[this.currentPage];

        try {
            container.innerHTML = `<div style="text-align:center;padding:40px;">در حال بارگذاری...</div>`;
            const html = await page.render();
            container.innerHTML = html;
            if (page.bind) await page.bind();
        } catch (e) {
            console.error(e);
            container.innerHTML = `<div class="empty-state">
                <div class="icon">⚠️</div>
                <h3>خطا در بارگذاری صفحه</h3>
                <p>${Utils.escapeHtml(e.message)}</p>
            </div>`;
        }
    },

    async reload() {
        await this.render();
    },

    // ─────── مودال ───────
    modal({ title, body, okText = 'تأیید', cancelText = 'لغو', onOk }) {
        const modal = document.getElementById('modal');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;
        document.getElementById('modal-footer').innerHTML = `
            <button class="btn btn-primary" id="modal-ok">${okText}</button>
            <button class="btn btn-secondary" id="modal-cancel">${cancelText}</button>
        `;
        modal.hidden = false;

        document.getElementById('modal-ok').onclick = async () => {
            if (onOk) {
                const result = await onOk();
                if (result !== false) this.closeModal();
            } else {
                this.closeModal();
            }
        };
        document.getElementById('modal-cancel').onclick = () => this.closeModal();
    },

    closeModal() {
        document.getElementById('modal').hidden = true;
    },

    // ─────── توست ───────
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        container.appendChild(el);
        setTimeout(() => {
            el.style.opacity = '0';
            el.style.transition = 'opacity 0.3s';
            setTimeout(() => el.remove(), 300);
        }, duration);
    }
};

// شروع اپلیکیشن
document.addEventListener('DOMContentLoaded', () => App.init());
