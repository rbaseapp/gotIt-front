# GotIt Frontend

## Notifications

The live settings page reads backend notification preferences and channel
availability. Email requires a verified Core address. Push opt-in registers
`/notification-sw.js` using the backend's public VAPID key; SMTP credentials and
the private VAPID key remain on the backend. Push requires HTTPS and browser
Service Worker/Push API support. Demo mode sends no notifications. Deploy the
backend migration and API before this frontend.

אתר React + TypeScript מלא ל־GotIt. החשבון האמיתי משתמש ב־rbase Core לאימות וב־GotIt Backend לכל נתוני המוצר. כל בדיקת תשובה, שליטה, תזמון ו־XP מתבצעת בשרת; הפרונט אינו משחזר את מנוע הלמידה.

## יכולות

- הרשמה וכניסה באימייל, כניסה/הרשמה עם Google Identity Services או Facebook Login, רענון ויציאה.
- פרופיל, שפות CEFR, אזור זמן, יעד יומי, תחומי עניין וכישורי למידה פעילים.
- ספריית מילים אמיתית עם עימוד, חיפוש מקור, סינון, מיון, פעולות קבוצתיות, סל ושחזור.
- capture בשני שלבים: preview, בחירת משמעות/מיזוג מפורש ושמירה idempotent.
- פרטי מילה: תרגומים ומקורם, כישורים, דוגמאות, הקשרים, עריכה סמנטית עם אזהרת reset ותגיות.
- סשנים ותרגילי שרת: חזרה חכמה, כרטיסיות, שליפה, התאמה, האזנה, הגייה ו־article quiz.
- Dashboard אמיתי, תור למידה, היסטוריית סשנים ונתוני פעילות/XP מהשרת.
- קריאה אישית עם preview שאינו נשמר, פתיחה מפורשת, הדגשת טווחי Unicode ותרגול המשך.
- ייבוא `capture_requests_v1` וייצוא paginated של `learning_library_v1`.
- סביבת דמו נפרדת, כבויה כברירת מחדל בפרודקשן.
- קורסים אישיים מקובצים לפי השפה הנלמדת. בכל קורס מוצגים שיעורים שבוצעו, השיעור הבא ושיעורים עתידיים לפי התוכנית הפעילה. היסטוריית השיעורים בכניסה מקורס מוגבלת לאותו קורס גם כשקיימים קורסים נוספים באותה שפה.

## פיתוח מקומי

דרישות: Node.js 24 ו־npm 11.

```powershell
npm ci
npm run dev
```

ברירות המחדל של Vite מעבירות `/core-api` אל Core בפרודקשן ו־`/gotit-api` אל `https://gotit-backend.onrender.com`. לעבודה מול שירותים מקומיים צרו `.env.local` (אינו נכנס ל־Git):

```dotenv
CORE_API_PROXY_TARGET=http://localhost:8080
GOTIT_API_PROXY_TARGET=http://localhost:3001
VITE_CORE_API_URL=/core-api
VITE_GOTIT_API_URL=/gotit-api
VITE_GOOGLE_CLIENT_ID=<public-web-client-id>
VITE_FACEBOOK_APP_ID=<public-meta-app-id>
VITE_DEMO_MODE=true
```

אין להכניס `Client Secret`, מפתח Translation, טוקנים או כתובת DB למשתני `VITE_*`; הם נכללים ב־JavaScript הפומבי.

## בדיקות

```powershell
npm run check
npm run test:responsive
npm audit --omit=dev --audit-level=high
```

`check` מריץ typecheck, ESLint, 94 בדיקות React/חוזים, build ועוד 13 בדיקות gateway. הבדיקות אינן יוצרות משתמש חיצוני ואינן כותבות למסד אמיתי.

`test:responsive` מריץ 276 בדיקות Playwright במטריצה של מסכי מובייל, טאבלט ודסקטופ מול נתיבי הדמו, כולל תפריט צד, מודאלים ובדיקות regression ייעודיות לשיעור הפרטי. הבדיקה משתמשת ב־Chrome המותקן ואינה פונה למסד אמיתי.

## Billing / Paddle

The authenticated `/billing` page shows Free only in the current-plan summary when Core assigns it, alongside selectable Pro and AI Tutor subscriptions and a separate 60-minute one-time pack. It loads Paddle-formatted localized totals with `PricePreview` using public price IDs from Core's active catalog, starts idempotent server-created transactions, and opens a one-page overlay checkout. It also displays the minute balance and opens Paddle's hosted customer portal for existing subscriptions, invoices, payment-method updates and cancellation. `/billing/checkout` is the public approved Paddle payment-link page used by transaction and payment-method-update links. In production set `PADDLE_CLIENT_TOKEN` and `PADDLE_ENVIRONMENT`; local Vite development may use their `VITE_` equivalents. Legacy `PADDLE_PRO_*_PRICE_ID` settings remain optional. Secret Paddle API and webhook keys belong only in Core.

Paddle chooses which enabled payment methods to show at runtime. Google Pay appears only on a supported Android/Chromebook device or in Google Chrome with an eligible Google Wallet. Apple Pay appears only on iPhone, iPad, or Safari on Mac over HTTPS with an eligible Apple Wallet. For direct Apple Pay checkout, the Paddle association file is published at `/.well-known/apple-developer-merchantid-domain-association`; after deployment, verify `gotit.rbaseapp.com` under **Paddle > Checkout > Website approval > Apple Pay verification**.

## Production / Render

קובצי הפריסה הם `Dockerfile`, `render.yaml` ו־`server/gateway.mjs`. ה־gateway מגיש SPA, מבודד את יעדי ה־API בצד השרת, מגביל נתיבים/שיטות/גדלים, מעביר רק headers מאושרים ומוסיף CSP, HSTS, COOP, Permissions Policy ו־cache policy. הקונטיינר הסופי רץ כמשתמש לא־root ואינו כולל source או dev dependencies.

1. צרו Web Service מה־Blueprint.
2. הגדירו `PUBLIC_APP_ORIGIN=https://<frontend-domain>` בלי `/` בסוף. Render מספק גם `RENDER_EXTERNAL_URL`, אך origin מפורש מקל על audit.
3. השאירו `CORE_API_PROXY_TARGET=https://rbase-core-api.onrender.com` ו־`GOTIT_API_PROXY_TARGET=https://gotit-backend.onrender.com`, או החליפו ב־HTTPS origins מאושרים.
4. הגדירו ב־GotIt Backend את אותו origin בתוך `CORS_ORIGINS` והפעילו את גרסת ה־V1 המעודכנת והמיגרציות המאושרות שלה.
5. ב־Google Cloud הוסיפו את origin המדויק ל־Authorized JavaScript origins והשלימו Branding, Homepage ו־Privacy Policy. לפיתוח הוסיפו `http://localhost:5173`.
6. ב־Meta for Developers הגדירו את דומיין האתר ואת Valid OAuth Redirect URI, בקשו `email`, והשלימו App Review/Business Verification לפי דרישות מצב Live.
7. ודאו שב־Core אפליקציית `gotit` מוגדרת עם Google OAuth Web Client ID ועם Facebook App ID, וש־App Secret קיים רק ב־`FACEBOOK_APP_SECRETS` של Core.
8. הריצו smoke: `/ready`, כניסת אימייל/סיסמה, `GET /capabilities`, הוספת מילה, תרגול אחד, logout, כניסת Google וכניסת Facebook אמיתיות.

ה־OAuth Client ID הוא מזהה פומבי ולכן קיים ב־build; מפתח Google Translation חייב להישאר רק בסביבת ה־backend. ספק קריאה/AI, Google Translate וספק דיבור נחשפים דרך capabilities או שגיאת unavailable, לעולם לא דרך תוצאה מדומה.

## מצב rollout נכון ל־2026-09-16

- `https://gotit-backend.onrender.com/ready` עבר בדיקת 200 עם DB ready.
- Core דחה `auth/me` ללא token ב־401, כמצופה.
- שרת GotIt הציבורי החזיר 404 עבור `/api/v1/learning-items` בזמן הבדיקה, והקטלוג הציבורי שלו לא הציג את רשימת נתיבי V1. יש לפרוס את ה־backend המעודכן לפני smoke מלא.
- דומיין האתר טרם נמסר ולכן אי אפשר להשלים Authorized JavaScript origins, CORS ו־Google login חי.
- בדיקת Browser חזותית לא רצה כי סביבת Browser לא הייתה זמינה. יש לבצע את checklist ב־[Frontend status](docs/FRONTEND_STATUS.md).

לא בוצעו מכאן deploy, שינוי Core, שינוי backend, migration, יצירת חשבון, commit או push.
# Email verification and recovery

Email registration requests a six-digit code and remains signed out until mailbox
proof succeeds. Verification and password reset require a matching new-password
confirmation and return to login. The form includes resend cooldown, provider/network
errors and existing-unverified-account verification in all eight UI languages.
`/?auth=register` and `/?auth=reset` open the matching signed-out flow for Chrome;
no credentials appear in those URLs. The gateway permits only the four named new Core
routes. Deploy with Core's email challenge migration and configured Resend sender.
Tests: `test/email-auth.test.tsx`, `test/e2e/email-auth.spec.ts`, and gateway allowlist
coverage. Production mailbox acceptance is tracked in the project specification.
