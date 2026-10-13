// تبدیل اعداد به فارسی
function toPersianDigits(num) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(num).replace(/\d/g, (d) => persianDigits[d]);
}

// تبدیل اعداد فارسی به انگلیسی
function toEnglishDigits(str) {
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return String(str).replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
}

// فرمت اعداد با جداکننده هزارگان
function formatNumber(num) {
    return Number(num).toLocaleString('fa-IR');
}

// تاریخ شمسی
function getPersianDate(date = new Date()) {
    return new Intl.DateTimeFormat('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

// ذخیره تنظیمات
async function saveSetting(key, value) {
    await updateItem('settings', { key, value });
}

// بارگذاری تنظیمات
async function loadSetting(key, defaultValue = null) {
    const item = await getItem('settings', key);
    return item ? item.value : defaultValue;
}

// نمایش نوتیفیکیشن
function showNotification(title, body, icon = '/icons/icon-192x192.png') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon });
    }
}

// درخواست مجوز نوتیفیکیشن
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

// بررسی آنلاین/آفلاین
function updateOnlineStatus() {
    const status = navigator.onLine ? 'آنلاین' : 'آفلاین';
    console.log(`وضعیت: ${status}`);
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
