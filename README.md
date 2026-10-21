# پیشنهاد طراحی پلتفرم دیجیتال کافه‌رستوران

صفحه ارائه کانسپت برای کافه‌رستوران؛ چهار نمونه صفحه در قالب گالری تب‌دار با نمایشگر تمام‌صفحه.
این پروژه فقط یک صفحه استاتیک است و بک‌اند، ثبت‌نام، پیامک، رزرو واقعی، سفارش‌گیری یا پرداخت ندارد.

## اجرای محلی

```bash
npm install
npm run dev      # سرور توسعه
npm run build    # خروجی production در پوشه dist
npm run preview  # بررسی خروجی build
```

## ساختار

```
public/
  designs/
    menu-dark.png        # منوی دیجیتال (فاز اول)        – 941×1672
    admin-dark.png       # مدیریت منو (فاز اول)           – 1536×1024
    reservation-dark.png # رزرو میز (فاز دوم)             – 941×1672
    kitchen-dark.png     # پنل آشپزخانه (فاز سوم)         – 1536×1024
  fonts/
    Vazirmatn.woff2      # فونت وزیرمتن (متغیر، ۱۰۰ تا ۹۰۰)
  favicon.svg
src/
  main.js       # تب‌ها، تب‌پنل‌ها و اتصال به نمایشگر
  lightbox.js   # نمایشگر تمام‌صفحه: بزرگ‌نمایی، جابه‌جایی، پینچ، فوکوس
  styles.css    # تم زغالی/نارنجی، چیدمان ریسپانسیو
index.html
netlify.toml
```

مسیر تصاویر در صفحه از `/designs/...` شروع می‌شود؛ Vite هنگام build محتوای `public/` را در ریشه `dist/` قرار می‌دهد.

## انتشار روی Netlify

**روش دستی (بدون اتصال به Git):** پس از اجرای `npm run build`، پوشه `dist` را در بخش Deploys
پنل Netlify (کادر «drag and drop») رها کنید. می‌توانید فایل آماده `netlify-dist.zip` (خروجی همان
`dist`) را هم مستقیماً در همان کادر رها کنید. مجوز ورود یا متغیر محیطی لازم نیست.

**روش اتصال به Git:** فایل `netlify.toml` تنظیمات را تعیین می‌کند:

- Build command: `npm run build`
- Publish directory: `dist`

## نکات

- متاتگ `noindex, nofollow` روی صفحه تنظیم شده است.
- تصاویر با ابعاد اصلی و بدون برش (`object-fit` پیش‌فرض) نمایش داده می‌شوند.
- تصویر تب فعال با `preload` و `fetchpriority="high"` و بقیه با `loading="lazy"` بارگذاری می‌شوند.
- انیمیشن محو شدن کوتاه است و در حالت `prefers-reduced-motion: reduce` غیرفعال می‌شود.
