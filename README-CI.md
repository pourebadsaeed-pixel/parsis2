# راهنمای آپدیت خودکار با گیت‌هاب (CI/CD)

هدف: هر وقت سورس را در گیت‌هاب عوض کنی، **نسخه وب و APK اندروید خودکار ساخته و منتشر شوند** — بدون نیاز به کامپیوتر.

---

## ۱. ساختار دو ریپازیتوری (یا دو پوشه در یک ریپو)

| پوشه | محتوا | خروجی خودکار |
|---|---|---|
| `parsis-web/` | سورس وب (index.html، js، css، …) + `.github/workflows/deploy-web.yml` | **GitHub Pages** — لینک PWA با هر push آپدیت می‌شود |
| `parsis-android/` | سورس اندروید (package.json، www/، android/، capacitor.config.json) + `.github/workflows/build-android.yml` | **فایل APK** — با هر push در Actions ساخته می‌شود |

## ۲. راه‌اندازی گام‌به‌گام

### الف) نسخه وب (Pages — ساده‌ترین بخش)
1. محتوای پوشه وب را در یک ریپو push کن.
2. در GitHub: Settings ← Pages ← Source را روی **GitHub Actions** بگذار.
3. تمام! هر push بعدی، لینک `https://<username>.github.io/<repo>/` را آپدیت می‌کند.

### ب) نسخه اندروید (APK)
1. محتوای سورس اندروید را push کن (فایل `build-android.yml` باید در `.github/workflows/` باشد).
2. در GitHub ریپو: Settings ← Secrets and variables ← Actions ← **New repository secret** — این ۴ secret را بساز:

| نام secret | مقدار | چطور بسازم؟ |
|---|---|---|
| `ANDROID_KEYSTORE_B64` | فایل keystore به base64 | لینوکس/مک: `base64 -w0 parsis-release.keystore` — ویندوز: `certutil -encode parsis-release.keystore out.txt` و محتوای داخل out.txt |
| `ANDROID_STORE_PASSWORD` | رمز store | `P@rsis-2026-Android!` |
| `ANDROID_KEY_ALIAS` | نام کلید | `parsis` |
| `ANDROID_KEY_PASSWORD` | رمز key | `P@rsis-2026-Android!` |

3. تمام! از این به بعد:
   - هر **push** ← یک APK جدید در تب **Actions ← Parsis-APK (artifact)** ساخته می‌شود.
   - هر **tag** (مثلاً `git tag v2.1.0 && git push --tags`) ← APK به بخش **Releases** چسبانده می‌شود و لینک دانلود دائمی می‌گیرد.

> ⚠️ اگر secrets را نسازی، Actions نسخه debug (امضاشده با کلید موقت) می‌سازد — برای نصب دائمی روی گوشی مناسب نیست.

## ۳. چرخه کار روزانه (تکنولوژی سریع آپدیت)

```bash
# ۱) تغییرات را در سورس وب انجام بده
# ۲) همان فایل‌های js/css/html را داخل www/ هم کپی کن (یا www را symlink کن)
# ۳)
git add . && git commit -m "fix ..." && git push
# تمام — وب روی Pages آپدیت می‌شود و APK جدید در Actions می‌آید
```

نکته: در سورس اندروید، پوشه `www/` منبع وب اپ است. اگر می‌خواهی فقط یک جا کد بزنی، بعد از هر تغییر در سورس وب، فایل‌های تغییر یافته را داخل `www/` هم کپی کن (یا این کار را به یک اسکریپت بسپار).

## ۴. نسخه‌گذاری

هر انتشار: `android/app/build.gradle` (versionCode +1 و versionName) و `www/js/core/constants.js` (APP_VERSION) و `www/sw.js` (CACHE_VERSION) را با هم بالا ببر.

## ۵. محدودیت‌های رایگان GitHub Actions

- ریپو private: ماهی ۲۰۰۰ دقیقه رایگان (هر build ≈ ۵-۸ دقیقه).
- ریپو public: نامحدود رایگان.
