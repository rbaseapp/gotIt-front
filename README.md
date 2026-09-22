# GotIt Frontend

אתר React + TypeScript מלא ל־GotIt. החשבון האמיתי משתמש ב־rbase Core לאימות וב־GotIt Backend לכל נתוני המוצר. כל בדיקת תשובה, שליטה, תזמון ו־XP מתבצעת בשרת; הפרונט אינו משחזר את מנוע הלמידה.

## יכולות

- הרשמה וכניסה באימייל, כניסה/הרשמה עם Google Identity Services, רענון ויציאה.
- פרופיל, שפות CEFR, אזור זמן, יעד יומי, תחומי עניין וכישורי למידה פעילים.
- ספריית מילים אמיתית עם עימוד, חיפוש מקור, סינון, מיון, פעולות קבוצתיות, סל ושחזור.
- capture בשני שלבים: preview, בחירת משמעות/מיזוג מפורש ושמירה idempotent.
- פרטי מילה: תרגומים ומקורם, כישורים, דוגמאות, הקשרים, עריכה סמנטית עם אזהרת reset ותגיות.
- סשנים ותרגילי שרת: חזרה חכמה, כרטיסיות, שליפה, התאמה, האזנה, הגייה ו־article quiz.
- Dashboard אמיתי, תור למידה, היסטוריית סשנים ונתוני פעילות/XP מהשרת.
- קריאה אישית עם preview שאינו נשמר, פתיחה מפורשת, הדגשת טווחי Unicode ותרגול המשך.
- ייבוא `capture_requests_v1` וייצוא paginated של `learning_library_v1`.
- סביבת דמו נפרדת, כבויה כברירת מחדל בפרודקשן.

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
VITE_DEMO_MODE=true
```

אין להכניס `Client Secret`, מפתח Translation, טוקנים או כתובת DB למשתני `VITE_*`; הם נכללים ב־JavaScript הפומבי.

## בדיקות

```powershell
npm run check
npm audit --omit=dev --audit-level=high
```

`check` מריץ typecheck, ESLint, 42 בדיקות React/חוזים, build ועוד 6 בדיקות gateway. הבדיקות אינן יוצרות משתמש חיצוני ואינן כותבות למסד אמיתי.

## Billing / Paddle

The authenticated `/billing` page shows Free + Pro, loads Paddle-formatted localized totals with `PricePreview`, starts an idempotent server-created transaction, and opens a one-page overlay checkout. It also opens Paddle's hosted customer portal for invoices, payment-method updates and cancellation. `/billing/checkout` is the public approved Paddle payment-link page used by transaction and payment-method-update links. In production set `PADDLE_CLIENT_TOKEN`, `PADDLE_ENVIRONMENT`, and `PADDLE_PRO_MONTHLY_PRICE_ID`; add `PADDLE_PRO_YEARLY_PRICE_ID` only after the matching yearly plan exists in Core. Local Vite development may use their `VITE_` equivalents. Secret Paddle API and webhook keys belong only in Core.

## Production / Render

קובצי הפריסה הם `Dockerfile`, `render.yaml` ו־`server/gateway.mjs`. ה־gateway מגיש SPA, מבודד את יעדי ה־API בצד השרת, מגביל נתיבים/שיטות/גדלים, מעביר רק headers מאושרים ומוסיף CSP, HSTS, COOP, Permissions Policy ו־cache policy. הקונטיינר הסופי רץ כמשתמש לא־root ואינו כולל source או dev dependencies.

1. צרו Web Service מה־Blueprint.
2. הגדירו `PUBLIC_APP_ORIGIN=https://<frontend-domain>` בלי `/` בסוף. Render מספק גם `RENDER_EXTERNAL_URL`, אך origin מפורש מקל על audit.
3. השאירו `CORE_API_PROXY_TARGET=https://rbase-core-api.onrender.com` ו־`GOTIT_API_PROXY_TARGET=https://gotit-backend.onrender.com`, או החליפו ב־HTTPS origins מאושרים.
4. הגדירו ב־GotIt Backend את אותו origin בתוך `CORS_ORIGINS` והפעילו את גרסת ה־V1 המעודכנת והמיגרציות המאושרות שלה.
5. ב־Google Cloud הוסיפו את origin המדויק ל־Authorized JavaScript origins והשלימו Branding, Homepage ו־Privacy Policy. לפיתוח הוסיפו `http://localhost:5173`.
6. ודאו שב־Core אפליקציית `gotit` מוגדרת עם אותו OAuth Web Client ID. Basic login אינו דורש client secret.
7. הריצו smoke: `/ready`, כניסה, `GET /capabilities`, הוספת מילה, תרגול אחד, logout וכניסת Google אמיתית.

ה־OAuth Client ID הוא מזהה פומבי ולכן קיים ב־build; מפתח Google Translation חייב להישאר רק בסביבת ה־backend. ספק קריאה/AI, Google Translate וספק דיבור נחשפים דרך capabilities או שגיאת unavailable, לעולם לא דרך תוצאה מדומה.

## מצב rollout נכון ל־2026-09-16

- `https://gotit-backend.onrender.com/ready` עבר בדיקת 200 עם DB ready.
- Core דחה `auth/me` ללא token ב־401, כמצופה.
- שרת GotIt הציבורי החזיר 404 עבור `/api/v1/learning-items` בזמן הבדיקה, והקטלוג הציבורי שלו לא הציג את רשימת נתיבי V1. יש לפרוס את ה־backend המעודכן לפני smoke מלא.
- דומיין האתר טרם נמסר ולכן אי אפשר להשלים Authorized JavaScript origins, CORS ו־Google login חי.
- בדיקת Browser חזותית לא רצה כי סביבת Browser לא הייתה זמינה. יש לבצע את checklist ב־[Frontend status](docs/FRONTEND_STATUS.md).

לא בוצעו מכאן deploy, שינוי Core, שינוי backend, migration, יצירת חשבון, commit או push.
