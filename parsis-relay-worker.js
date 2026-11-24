/* ============================================================
   پارسیس — رله همگام‌سازی ابری دوطرفه (v2.3.1)
   فایل: parsis-relay-worker.js

   ✅ v2.3.1 — تغییرات نسبت به قبل:
     • /api/ping حالا نسخه اپ منتشرشده روی رله را هم می‌دهد (appVer)
     • /api/publish نسخه اپ را از constants.js استخراج و ذخیره می‌کند
     • نتیجه: اپ می‌فهمد اپِ روی رله قدیمی است و خودش دوباره منتشر می‌کند؛
       دیگر مرورگرِ دیگران روی نسخه قدیمی (مثل 2.1.1) گیر نمی‌کند.
   اجرا روی: Cloudflare Workers (پلن رایگان) + پایگاه داده D1 (رایگان)

   ┌────────────────────────── راهنمای نصب (۵ دقیقه) ──────────────────────────┐
   │                                                                            │
   │  ۱) در dash.cloudflare.com یک حساب رایگان بسازید (فقط ایمیل لازم است).      │
   │  ۲) منوی «Storage & Databases» ← «D1 SQL Database» ← دکمه Create            │
   │     نام: parsis-db   — بسازید.                                             │
   │  ۳) منوی «Compute (Workers)» ← «Workers» ← دکمه Create                      │
   │     نام دلخواه مثلا parsis-relay ← Deploy                                  │
   │  ۴) روی «Edit code» بزنید، همه کد پیش‌فرض را پاک کنید و «همین فایل» را       │
   │     کامل Paste کنید ← دکمه Deploy.                                          │
   │  ۵) تنظیمات همان Worker ← «Settings» ← «Bindings / Variables» ← Add:        │
   │        نوع: D1 Database                                                    │
   │        Variable name : DB          ( دقیقاً همین نام — بزرگ )               │
   │        D1 database   : parsis-db                                           │
   │     ← Deploy دوباره.                                                        │
   │  ۶) آدرس ورکر شما:  https://parsis-relay.<نام-حساب>.workers.dev             │
   │     همین آدرس را در اپ پارسیس (تنظیمات ← ☁️ همگام‌سازی ابری) وارد کنید.      │
   │                                                                            │
   │  امنیت: هیچ داده‌ای رمزنگاری‌نشده به این سرور نمی‌رسد؛ این Worker فقط        │
   │  «متن رمز» (AES-GCM سمت اپ) را نگه می‌دارد و کلید را هیچ‌وقت نمی‌بیند.        │
   └───────────────────────────────────────────────────────────────────────────┘

   API:
     GET  /api/ping                                → سلام + وضعیت + appVer (نسخه اپ منتشرشده)
     GET  /api/rev?space=&key=                     → شماره نسخه داده
     GET  /api/snapshot?space=&key=                → کل داده (رمز)
     POST /api/sync?space=&key=      {stores:{}}   → نوشتن تغییرات (رمز)
     POST /api/publish?space=&key=   {files:{}}    → انتشار اپ وب روی رله
     GET  /<هر مسیر>                               → سرو اپ وب (از KV داخلی D1)
   ============================================================ */

export default {

    async fetch(request, env, ctx) {
        try {
            const url = new URL(request.url);
            const path = url.pathname || '/';

            /* ---------- CORS ---------- */
            const cors = {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-parsis-key',
                'Cache-Control': 'no-store'
            };
            if (request.method === 'OPTIONS') {
                return new Response(null, { status: 204, headers: cors });
            }

            /* ---------- API ---------- */
            if (path.startsWith('/api/')) {
                return await this.serveApi(request, env, url, cors);
            }

            /* ---------- سرو اپ وب ---------- */
            if (request.method === 'GET' || request.method === 'HEAD') {
                return await this.serveApp(request, env, path);
            }

            return this.jr(405, { error: 'method-not-allowed' }, cors);

        } catch (e) {
            return this.jr(500, { error: 'internal: ' + (e && e.message || '') }, {});
        }
    },

    /* ============================================================
       ابزار
       ============================================================ */
    jr(status, obj, cors) {
        const h = Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors || {});
        return new Response(JSON.stringify(obj), { status: status, headers: h });
    },

    async sha256hex(text) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async ensureSchema(env) {
        /* در هر ایزولیت فقط یک بار */
        if (this.__schemaReady) return;
        await env.DB.batch([
            env.DB.prepare("CREATE TABLE IF NOT EXISTS meta (space TEXT NOT NULL, k TEXT NOT NULL, val TEXT, PRIMARY KEY(space,k))"),
            env.DB.prepare("CREATE TABLE IF NOT EXISTS stores (space TEXT NOT NULL, name TEXT NOT NULL, val TEXT, PRIMARY KEY(space,name))"),
            env.DB.prepare("CREATE TABLE IF NOT EXISTS app (path TEXT PRIMARY KEY, mime TEXT NOT NULL, val TEXT NOT NULL)")
        ]);
        this.__schemaReady = true;
    },

    async checkAuth(env, space, key) {
        const row = await env.DB.prepare("SELECT val FROM meta WHERE space=? AND k='auth'").bind(space).first();
        if (!row) return { initialized: false, ok: false };
        const hex = await this.sha256hex(key);
        return { initialized: true, ok: (hex === row.val) };
    },

    /* ============================================================
       API
       ============================================================ */
    async serveApi(request, env, url, cors) {
        const path = url.pathname;
        const space = url.searchParams.get('space') || '';
        const key = url.searchParams.get('key') || '';

        /* ---------- ping ---------- */
        if (path === '/api/ping') {
            let dbOk = true, dbMsg = '';
            try {
                await this.ensureSchema(env);
                await env.DB.prepare("SELECT k FROM meta LIMIT 1").first();
            } catch (e) {
                dbOk = false;
                dbMsg = 'اتصال به پایگاه داده D1 برقرار نیست — binding با نام DB تعریف شده است؟';
            }
            let hasApp = false;
            try {
                const row = await env.DB.prepare("SELECT val FROM meta WHERE space='__app__' AND k='list'").first();
                hasApp = !!(row && row.val);
            } catch (e) {}
            /* ✅ v2.3.1 — نسخه اپ منتشرشده روی رله هم برگردانده می‌شود (appVer)
               تا اپ بفهمد اپِ روی رله قدیمی است و دوباره منتشر کند؛
               وگرنه مرورگرِ دیگران روی نسخه قدیمی می‌ماند و داده تازه نمی‌بیند. */
            let appVer = null;
            try {
                const verRow = await env.DB.prepare("SELECT val FROM meta WHERE space='__app__' AND k='ver'").first();
                appVer = (verRow && verRow.val) || null;
            } catch (e) {}
            return this.jr(200, { ok: true, v: 1, db: dbOk, dbMsg: dbMsg, app: hasApp, appVer: appVer }, cors);
        }

        await this.ensureSchema(env);

        if (!space) return this.jr(400, { error: 'space-missing' }, cors);
        if (!key) return this.jr(401, { error: 'key-missing' }, cors);

        /* ---------- rev ---------- */
        if (path === '/api/rev') {
            const auth = await this.checkAuth(env, space, key);
            if (auth.initialized && !auth.ok) return this.jr(401, { error: 'bad-key' }, cors);
            const row = await env.DB.prepare("SELECT val FROM meta WHERE space=? AND k='rev'").bind(space).first();
            return this.jr(200, { rev: parseInt(row && row.val || '0', 10) || 0 }, cors);
        }

        /* ---------- snapshot ---------- */
        if (path === '/api/snapshot') {
            const auth = await this.checkAuth(env, space, key);
            if (auth.initialized && !auth.ok) return this.jr(401, { error: 'bad-key' }, cors);
            const revRow = await env.DB.prepare("SELECT val FROM meta WHERE space=? AND k='rev'").bind(space).first();
            const rev = parseInt(revRow && revRow.val || '0', 10) || 0;
            const rows = await env.DB.prepare("SELECT name, val FROM stores WHERE space=?").bind(space).all();
            const stores = {};
            (rows.results || []).forEach(r => { stores[r.name] = r.val; });
            return this.jr(200, { rev: rev, stores: stores }, cors);
        }

        /* ---------- sync (نوشتن) ---------- */
        if (path === '/api/sync' && request.method === 'POST') {
            let body;
            try { body = await request.json(); } catch (e) { return this.jr(400, { error: 'bad-json' }, cors); }
            const stores = (body && body.stores) || {};
            const names = Object.keys(stores);
            if (!names.length) return this.jr(400, { error: 'empty-stores' }, cors);
            /* محدود حجم هر مقدار (۱۵ مگابایت) */
            for (const n of names) {
                if (typeof stores[n] !== 'string' || stores[n].length > 15 * 1024 * 1024) {
                    return this.jr(413, { error: 'store-too-large: ' + n }, cors);
                }
            }

            const auth = await this.checkAuth(env, space, key);
            if (auth.initialized && !auth.ok) return this.jr(401, { error: 'bad-key' }, cors);

            const stmts = [];
            if (!auth.initialized) {
                const hex = await this.sha256hex(key);
                stmts.push(env.DB.prepare(
                    "INSERT INTO meta (space,k,val) VALUES(?,'auth',?) ON CONFLICT(space,k) DO UPDATE SET val=excluded.val"
                ).bind(space, hex));
            }
            const revRow = await env.DB.prepare("SELECT val FROM meta WHERE space=? AND k='rev'").bind(space).first();
            const prev = parseInt(revRow && revRow.val || '0', 10) || 0;
            const newRev = Math.max(prev + 1, Date.now()); /* یکتا و صعودی حتی در نوشتن همزمان */

            for (const n of names) {
                stmts.push(env.DB.prepare(
                    "INSERT INTO stores (space,name,val) VALUES(?,?,?) ON CONFLICT(space,name) DO UPDATE SET val=excluded.val"
                ).bind(space, n, stores[n]));
            }
            stmts.push(env.DB.prepare(
                "INSERT INTO meta (space,k,val) VALUES(?,'rev',?) ON CONFLICT(space,k) DO UPDATE SET val=excluded.val"
            ).bind(space, String(newRev)));

            await env.DB.batch(stmts);
            return this.jr(200, { ok: true, rev: newRev, count: names.length }, cors);
        }

        /* ---------- publish (انتشار اپ وب) ---------- */
        if (path === '/api/publish' && request.method === 'POST') {
            let body;
            try { body = await request.json(); } catch (e) { return this.jr(400, { error: 'bad-json' }, cors); }
            const files = (body && body.files) || {};
            const paths = Object.keys(files);
            if (!paths.length) return this.jr(400, { error: 'empty-files' }, cors);

            const auth = await this.checkAuth(env, space, key);
            if (auth.initialized && !auth.ok) return this.jr(401, { error: 'bad-key' }, cors);

            const stmts = [];
            if (!auth.initialized) {
                const hex = await this.sha256hex(key);
                stmts.push(env.DB.prepare(
                    "INSERT INTO meta (space,k,val) VALUES(?,'auth',?) ON CONFLICT(space,k) DO UPDATE SET val=excluded.val"
                ).bind(space, hex));
            }
            const list = {};
            for (const p of paths) {
                const f = files[p] || {};
                if (typeof f.b64 !== 'string' || f.b64.length > 25 * 1024 * 1024) continue;
                const clean = p.replace(/^\.\//, '').replace(/^\/+/, '');
                if (!clean) continue;
                stmts.push(env.DB.prepare(
                    "INSERT INTO app (path,mime,val) VALUES(?,?,?) ON CONFLICT(path) DO UPDATE SET mime=excluded.mime, val=excluded.val"
                ).bind(clean, f.mime || 'application/octet-stream', f.b64));
                list[clean] = { mime: f.mime || 'application/octet-stream' };
            }
            /* ✅ v2.3.1 — اگر constants.js داخل فایل‌های منتشرشده بود، نسخه اپ استخراج و
               ذخیره می‌شود تا ping آن را به شکل appVer برگرداند (فقط وقتی واقعاً پیدا شد). */
            for (const p of paths) {
                const f = files[p] || {};
                if (typeof f.b64 !== 'string') continue;
                const cleanP = p.replace(/^\.\//, '').replace(/^\/+/, '');
                if (cleanP === 'js/core/constants.js') {
                    try {
                        const txt = atob(f.b64);
                        const m = txt.match(/APP_VERSION\s*=\s*'([0-9][0-9A-Za-z.]*)'/);
                        if (m && m[1]) {
                            stmts.push(env.DB.prepare(
                                "INSERT INTO meta (space,k,val) VALUES('__app__','ver',?) ON CONFLICT(space,k) DO UPDATE SET val=excluded.val"
                            ).bind(m[1]));
                        }
                    } catch (e) {}
                    break;
                }
            }
            stmts.push(env.DB.prepare(
                "INSERT INTO meta (space,k,val) VALUES('__app__','list',?) ON CONFLICT(space,k) DO UPDATE SET val=excluded.val"
            ).bind(JSON.stringify(list)));

            await env.DB.batch(stmts);
            return this.jr(200, { ok: true, count: paths.length }, cors);
        }

        return this.jr(404, { error: 'not-found' }, cors);
    },

    /* ============================================================
       سرو اپ وب از پایگاه داده
       ============================================================ */
    async serveApp(request, env, rawPath) {
        try {
            let path = rawPath;
            if (path === '/' || !path) path = 'index.html';
            path = path.replace(/^\//, '').split('?')[0];
            if (path.endsWith('/')) path = path.slice(0, -1);

            let row = await env.DB.prepare("SELECT mime, val FROM app WHERE path=?").bind(path).first();

            /* ✅ v2.2.0 — فایل‌های استاتیک (js/css/png/...) که منتشر نشده‌اند،
               هرگز با index.html جایگزین نمی‌شوند؛ خطای ۴۰۴ شفاف می‌دهند
               تا دیگر «HTML به‌جای JS» اجرا نشود و علت دقیق معلوم باشد. */
            const ASSET_RE = /\.(js|mjs|css|json|webmanifest|png|jpe?g|gif|svg|ico|woff2?|ttf|otf|map|txt|html?)$/i;
            if (!row && path !== 'index.html' && ASSET_RE.test(path)) {
                return this.jr(404, {
                    error: 'asset-not-published',
                    path: path,
                    hint: 'این فایل روی رله منتشر نشده است — در اپ پارسیس: تنظیمات ← ☁️ همگام‌سازی ابری ← ⚡ راه‌اندازی خودکار (یا دکمه انتشار) را دوباره اجرا کنید'
                }, {});
            }

            /* SPA fallback — مسیرهای ناشناخته به صفحه اصلی */
            if (!row && path !== 'index.html') {
                row = await env.DB.prepare("SELECT mime, val FROM app WHERE path='index.html'").first();
                path = 'index.html';
            }
            if (!row) {
                return this.jr(404, {
                    error: 'app-not-published',
                    hint: 'اپ هنوز روی رله منتشر نشده است. در اپ پارسیس: تنظیمات ← ☁️ همگام‌سازی ابری ← «انتشار اپ روی رله»'
                }, {});
            }

            const bin = this.b64ToBytes(row.val);
            return new Response(bin, {
                status: 200,
                headers: {
                    'Content-Type': row.mime || 'application/octet-stream',
                    'Cache-Control': 'no-cache',
                    'X-Parsis-Relay': 'v1'
                }
            });
        } catch (e) {
            return this.jr(500, { error: 'serve: ' + (e && e.message || '') }, {});
        }
    },

    b64ToBytes(b64) {
        const bin = atob(b64);
        const out = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
        return out;
    }
};
