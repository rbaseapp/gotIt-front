import { BookOpen, Gamepad2, LockKeyhole, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

export function HelpPage() {
  return (
    <div className="help-page page-enter">
      <section className="page-heading-row">
        <div>
          <p className="eyebrow">קצת סדר, הרבה יותר זיכרון</p>
          <h1>מרכז העזרה</h1>
          <p>מה אפשר לעשות עכשיו, ואיך הנתונים שלך נשמרים.</p>
        </div>
      </section>
      <div className="help-grid">
        <section className="panel">
          <BookOpen size={26} />
          <h2>שומרים משמעות, לא רק כתיב</h2>
          <p>
            הוסיפו מילה, זוג שפות ותרגום מדויק. משפט המקור עוזר לזכור. כשאותו
            כתיב כבר קיים, בחרו אם להוסיף הקשר למשמעות קיימת או ליצור משמעות
            חדשה.
          </p>
          <Link className="text-link" to="/vocabulary">
            לאוצר המילים
          </Link>
        </section>
        <section className="panel">
          <Gamepad2 size={26} />
          <h2>מתרגלים בכמה דרכים</h2>
          <p>
            השרת מנפיק כל שאלה ובודק אותה. כרטיסיות משתמשות בדירוג עצמי; שליפה,
            איות והתאמות מקבלות ציון שרת. שמע והגייה מופיעים רק כשספק תומך בשפה.
          </p>
          <Link className="text-link" to="/learn">
            לבחירת משחק
          </Link>
        </section>
        <section className="panel">
          <LockKeyhole size={26} />
          <h2>חשבון אמיתי מול הדגמה</h2>
          <p>
            חשבון אמיתי מאומת ב־rbase Core. מילים, סשנים, ראיות למידה, XP
            והעדפות נשמרים ב־GotIt Backend. הדמו זמין רק כשמפעיל האתר מדליק אותו
            במפורש.
          </p>
        </section>
        <section className="panel">
          <ShieldCheck size={26} />
          <h2>פרטיות ושליטה</h2>
          <p>
            מחיקה היא רכה וניתן לשחזר מילה. הקלטת הגייה נוצרת רק בלחיצה, מומרת
            זמנית ל־WAV ונשלחת לשרת לצורך הערכה; היא אינה נשמרת באחסון הדפדפן.
          </p>
          <p>
            Access token נשמר בזיכרון ו־refresh token באחסון הסשן של הטאב.
            תשובות נשלחות עם מזהה אירוע קבוע לניסיון חוזר בטוח.
          </p>
        </section>
      </div>
      <section className="panel help-status">
        <h2>זמינות נוכחית</h2>
        <dl>
          <div>
            <dt>כניסה והרשמה</dt>
            <dd>אימייל ו־Google מחוברים ל־Core</dd>
          </div>
          <div>
            <dt>ספרייה, תרגול והתקדמות</dt>
            <dd>מחוברים לממשקי GotIt V1</dd>
          </div>
          <div>
            <dt>קריאה, שמע והגייה</dt>
            <dd>הממשקים מחוברים; הזמינות בפועל נקבעת לפי ספקי השרת והשפה</dd>
          </div>
          <div>
            <dt>ייבוא וייצוא</dt>
            <dd>מחוברים לפורמטים הגרסאיים של השרת</dd>
          </div>
          <div>
            <dt>איפוס סיסמה ואימות אימייל</dt>
            <dd>אינם ממומשים ב־Core הנוכחי</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
