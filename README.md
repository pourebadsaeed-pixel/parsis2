# پارسیس ۲ (Parsis 2)

سیستم جامع حسابداری و مدیریت مالی به‌صورت PWA

## ویژگی‌ها
- ✅ نصب روی موبایل و دسکتاپ
- ✅ کارکرد آفلاین با Service Worker
- ✅ پایگاه داده محلی با IndexedDB
- ✅ رابط کاربری راست‌چین و فارسی
- ✅ آماده برای تبدیل به اپلیکیشن اندروید (TWA)

## نصب و اجرا
1. مخزن را کلون کنید
2. با یک سرور محلی (مثل `npx serve`) اجرا کنید
3. یا مستقیماً در GitHub Pages دیپلوی کنید

## دیپلوی
این پروژه به‌صورت خودکار در GitHub Pages قابل دیپلوی است.

## ساخت اپلیکیشن اندروید
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest="https://your-domain.com/manifest.json"
bubblewrap build
