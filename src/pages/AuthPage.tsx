import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Brain,
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  Sparkles,
} from "lucide-react";
import { Logo } from "../components/Logo";
import { useApp } from "../context/AppContext";
import { GoogleSignIn } from "../components/GoogleSignIn";

export function AuthPage() {
  const { authenticate, authenticateGoogle, startDemo, notice } = useApp();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authenticate(mode, email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "לא הצלחנו להתחבר");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <Logo />
        <div className="showcase-copy">
          <span className="pill light">
            <Sparkles size={14} />
            ללמוד מילים. באמת לזכור.
          </span>
          <h1>
            כל מילה חדשה
            <br />
            יכולה להפוך
            <br />
            <em>לחלק ממך.</em>
          </h1>
          <p>
            GotIt הופכת מילים שפגשת בדרך לתרגול אישי, חכם וקצר — בדיוק בזמן
            הנכון.
          </p>
          <ul>
            <li>
              <Check size={17} />
              תרגול בקצב שלך
            </li>
            <li>
              <Check size={17} />
              חמישה כישורי שפה, תמונה אחת ברורה
            </li>
            <li>
              <Check size={17} />
              מילים מתוך הקשר אמיתי
            </li>
          </ul>
        </div>
        <div className="floating-word-card">
          <span>
            <Brain size={18} />
          </span>
          <div>
            <b dir="ltr">serendipity</b>
            <small>תגלית מקרית משמחת</small>
          </div>
          <em>מילת דוגמה</em>
        </div>
        <p className="showcase-footer">© 2026 GotIt · נבנה כדי שתזכרו</p>
      </section>
      <main className="auth-main">
        <div className="auth-mobile-logo">
          <Logo />
        </div>
        <div className="auth-card">
          <p className="eyebrow">טוב לראות אותך</p>
          <h2>{mode === "login" ? "כניסה ל־GotIt" : "יצירת חשבון חדש"}</h2>
          <p>
            {mode === "login"
              ? "החשבון שלך מאובטח באמצעות rbase Core."
              : "כמה פרטים קטנים ואפשר להתחיל."}
          </p>
          {notice && (
            <p className="form-error" role="status">
              {notice}
            </p>
          )}
          <form onSubmit={submit} className="form-stack">
            <label className="field">
              <span>כתובת אימייל</span>
              <div className="input-with-icon">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  maxLength={320}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  dir="ltr"
                  disabled={loading}
                />
              </div>
            </label>
            <label className="field">
              <span>סיסמה</span>
              <div className="input-with-icon">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  minLength={12}
                  maxLength={128}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="12–128 תווים"
                  dir="ltr"
                  disabled={loading}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "הסתרת סיסמה" : "הצגת סיסמה"}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary auth-submit" disabled={loading}>
              {loading && <LoaderCircle size={18} className="spin" />}
              {mode === "login" ? "כניסה לחשבון" : "יצירת חשבון"}
              <ArrowLeft size={18} />
            </button>
          </form>
          <div className="or-divider">
            <span>או</span>
          </div>
          <GoogleSignIn
            disabled={loading}
            onCredential={(token) => {
              setLoading(true);
              setError("");
              void authenticateGoogle(token)
                .catch((reason) =>
                  setError(
                    reason instanceof Error
                      ? reason.message
                      : "כניסת Google נכשלה",
                  ),
                )
                .finally(() => setLoading(false));
            }}
          />
          {import.meta.env.VITE_DEMO_MODE === "true" && (
            <>
              <button
                className="button demo-button"
                disabled={loading}
                onClick={startDemo}
              >
                <BookOpenCheck size={19} />
                כניסה לסביבת ההדגמה<span>ללא הרשמה</span>
              </button>
              <p className="auth-footnote">
                הדמו נפרד מחשבון אמיתי. נתוניו נשמרים בדפדפן בלבד.
              </p>
            </>
          )}
          <p className="auth-switch">
            {mode === "login" ? "עדיין אין לך חשבון?" : "כבר יש לך חשבון?"}{" "}
            <button
              disabled={loading}
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
              }}
            >
              {mode === "login" ? "הרשמה" : "כניסה"}
            </button>
          </p>
          <p className="auth-footnote">
            Google מאפשר כניסה והרשמה באותו כפתור. איפוס סיסמה ואימות אימייל
            אינם זמינים ב־Core הנוכחי.
          </p>
        </div>
      </main>
    </div>
  );
}
