// ثبت Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('Service Worker ثبت شد:', registration.scope);
                // بررسی به‌روزرسانی
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            if (confirm('نسخه جدیدی موجود است. به‌روزرسانی شود؟')) {
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                                window.location.reload();
                            }
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('خطا در ثبت Service Worker:', error);
            });
    });
}

// راه‌اندازی اولیه
document.addEventListener('DOMContentLoaded', async () => {
    await openDB();
    await requestNotificationPermission();
    loadPage('dashboard');
    setupNavigation();
    registerInstallPrompt();
});

// ناوبری بین صفحات
function setupNavigation() {
    const navLinks = document.querySelectorAll('.app-nav a');
    navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('href').replace('#', '');
            loadPage(page);
        });
    });
}

function loadPage(pageName) {
    document.querySelectorAll('.page').forEach((page) => {
        page.classList.remove('active');
    });
    const targetPage = document.getElementById(pageName);
    if (targetPage) {
        targetPage.classList.add('active');
        loadPageContent(pageName);
    }
}

async function loadPageContent(pageName) {
    const contentDiv = document.getElementById(`${pageName}-content`);
    if (!contentDiv) return;

    switch (pageName) {
        case 'dashboard':
            const persons = await getAllItems('persons');
            const vouchers = await getAllItems('vouchers');
            contentDiv.innerHTML = `
                <div class="stat-card">
                    <span class="stat-number">${toPersianDigits(persons.length)}</span>
                    <span class="stat-label">اشخاص</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${toPersianDigits(vouchers.length)}</span>
                    <span class="stat-label">اسناد</span>
                </div>
            `;
            break;
        case 'persons':
            const allPersons = await getAllItems('persons');
            contentDiv.innerHTML = allPersons.length
                ? allPersons.map((p) => `<div class="list-item">${p.name}</div>`).join('')
                : '<p>هیچ شخصی ثبت نشده است.</p>';
            break;
        default:
            contentDiv.innerHTML = '<p>به‌زودی...</p>';
    }
}

// نصب PWA
let deferredPrompt = null;

function registerInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
        console.log('PWA نصب شد');
        deferredPrompt = null;
        hideInstallButton();
    });
}

function showInstallButton() {
    if (document.getElementById('install-btn')) return;
    const btn = document.createElement('button');
    btn.id = 'install-btn';
    btn.textContent = 'نصب اپلیکیشن';
    btn.className = 'install-btn';
    btn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('نتیجه نصب:', outcome);
            deferredPrompt = null;
            hideInstallButton();
        }
    });
    document.body.appendChild(btn);
}

function hideInstallButton() {
    const btn = document.getElementById('install-btn');
    if (btn) btn.remove();
}
