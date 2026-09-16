# Frontend production status

עודכן: 2026-09-16. מקור האמת: כל המסמכים ב־`rbaseapp_project_docs_updated`, ובפרט חוזה ההשלמה V1, מול קוד Core ו־GotIt הנוכחי. השינויים מוגבלים ל־`gotIt-front`.

## כיסוי חוזים

| תחום | מקור אמת בפרונט | התנהגות כשל |
| --- | --- | --- |
| Auth | Core `/auth/register`, `/login`, `/google`, `/me`, `/refresh`, `/logout` | 401 מנקה session ומחזיר לכניסה; אין חשיפת הודעת שרת פנימית |
| Capture | `/captures/preview`, `/captures` | שמירה ננעלת לתוכן ו־UUID; אין retry אוטומטי של mutation |
| Library | `/learning-items`, detail, edit, bulk, occurrences, examples, tags | עימוד bounded; אין טעינת ספרייה מלאה או fallback ל־seed |
| Practice | sessions, exercises, attempts, pronunciation assessments | התשובה בלבד נשלחת; score/result/skills מתקבלים רק מהשרת |
| Dashboard | `/dashboard`, `/learning/queue`, session history | אין חישוב mastery/level curve בצד לקוח |
| Reading | preview, open, history/detail/delete, article quiz | body אינו מוצג או נשמר עד פתיחה; ranges הם Unicode code points |
| Transfer | `/export`, `/import` | formats נבדקים; retry לנכשלים שומר event IDs; אין ייבוא ציונים |

Access token נשמר בזיכרון; refresh token ב־`sessionStorage` של הטאב. כרטיס publication ו־provider selection token נשמרים רק במצב רכיב זמני. טוקנים, סיסמאות, תוכן תשובות ומפתחות אינם נכתבים ללוג.

## בדיקות אוטומטיות

- 42 בדיקות Vitest/Testing Library: lifecycle של token, Google credential, response validation, הפרדת live/demo, תרגיל ו־retry idempotent, קריאה מפורשת, import, Unicode, WAV ועוד.
- 6 בדיקות `node:test` ל־production gateway: static/SPA, headers, route allowlist, origin, header forwarding, גודל/סוג body, redirect rejection ותצורת HTTPS.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm run test:gateway`.
- CI מבצע אותם ובנוסף `npm audit --omit=dev --audit-level=high`; Actions נעולים ל־commit SHA.

## בדיקות ידניות לפני השקה

1. Desktop ו־375px: RTL, תפריט, modals, טפסים, כרטיסי Dashboard ומשחק ללא overflow.
2. מקלדת בלבד: Tab/Shift+Tab/Escape, החזרת focus, labels ו־status/error announcements.
3. הרשמה/כניסה/רענון/logout אמיתיים; Google popup, חשבון חדש וחשבון קיים.
4. Preview ידני ועם ספק, יצירת משמעות, merge, replay של אותה שמירה לאחר כשל רשת.
5. עימוד וסינון ספרייה, edit semantic reset, bulk, סל/restore, examples/tags/occurrences.
6. כל סוגי התרגול; network loss אחרי submit; XP/progress תואמים לשרת; יציאה מסשן פעיל.
7. שמע בשפה נתמכת; microphone allow/deny/cancel; ודאו שהחיווי וה־track נסגרים ביציאה.
8. Reading preview/open/history/delete/article quiz וטקסט ישן ללא ranges.
9. Export גדול מרובה עמודים; import חלקי; retry failed only; קובץ לא תקין/מעל 256KB.
10. deep links אחרי deploy, CSP console, origin שגוי, 401/403/429/503 ותהליך graceful shutdown.

## חסמי rollout חיצוניים

- נדרש דומיין HTTPS סופי ל־Google Authorized JavaScript origins, ל־`PUBLIC_APP_ORIGIN` ול־GotIt `CORS_ORIGINS`.
- גרסת GotIt V1 שנמצאת בקוד אינה חשופה עדיין בכתובת ה־production שנמסרה: נתיב הספרייה החזיר 404.
- יש לבצע את migration/pre-deploy/roles/provider rollout מתוך runbook ה־backend; לא בוצע בפרונט.
- Google Translation key שנמסר בשיחה לא הועתק לפרונט או לתיעוד. מומלץ לסובב אותו ולהגביל ל־API/שרת הנדרשים.
- קריאה והגייה נשארות unavailable עד להגדרת ספקים בפועל. ה־UI משקף זאת ולא מייצר נתונים חלופיים.
- Core הנוכחי אינו מציע password reset או email verification flows; ה־UI אינו מבטיח אותם.
- בדיקת Browser חזותית/מכשיר לא התאפשרה בכלי הנוכחי; jsdom אינו תחליף להרשאות, codec, popup ופריסה חזותית.
