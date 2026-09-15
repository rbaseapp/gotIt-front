import { useEffect, useState, type FormEvent } from 'react';
import { Check, Globe2, LoaderCircle, Plus, RotateCcw, Save, SlidersHorizontal, Trash2, UserRound, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { validateProfile } from '../lib/contracts';
import { Modal } from '../components/Modal';
import type { UserProfile } from '../types';
import { labels } from '../lib/product';

export function SettingsPage() {
  const { profile, updateProfile, resetDemo, mode, profileError, retryProfile } = useApp();
  const [form, setForm] = useState(profile); const [saved, setSaved] = useState(false); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(''); const [newInterest, setNewInterest] = useState(''); const [resetOpen, setResetOpen] = useState(false);
  useEffect(() => { setForm(structuredClone(profile)); }, [profile]);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); const problem = validateProfile(form); if (problem) { setError(problem); return; }
    setSaving(true);
    try { await updateProfile(form); setSaved(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'לא ניתן לשמור'); }
    finally { setSaving(false); }
  };
  const patch = (value: Partial<UserProfile>) => { setSaved(false); setForm(current => ({ ...current, ...value })); };
  const addInterest = () => {
    const value = newInterest.normalize('NFKC').replace(/\s+/gu, ' ').trim();
    if (value && !form.interests.some(interest => interest.toLowerCase() === value.toLowerCase())) patch({ interests: [...form.interests, value] });
    setNewInterest('');
  };
  return <div className="settings-page page-enter">
    <section className="page-heading-row"><div><p className="eyebrow">בדיוק בקצב שלך</p><h1>הגדרות</h1><p>{mode === 'live' ? 'העדפות המוצר נשמרות באמצעות GotIt Profile API.' : 'העדפות הדמו נשמרות בדפדפן בלבד.'}</p></div></section>
    {profileError && <div className="form-error" role="alert">{profileError}<button type="button" className="button ghost" onClick={() => void retryProfile()}>ניסיון טעינה מחדש</button></div>}
    <form onSubmit={event => void submit(event)} className="settings-layout">
      <nav className="settings-nav"><a href="#profile"><UserRound size={18} />פרופיל</a><a href="#languages"><Globe2 size={18} />שפות</a><a href="#learning"><SlidersHorizontal size={18} />למידה</a></nav>
      <div className="settings-content">
        <fieldset className="settings-form-body" disabled={saving || !!profileError}>
          <section className="settings-card" id="profile"><div className="settings-card-heading"><span className="settings-icon green"><UserRound size={21} /></span><div><h2>פרטים אישיים</h2><p>זהות החשבון מגיעה מ־Core בלבד</p></div></div><div className="settings-fields">
            <label className="field"><span>שם לתצוגה <small>{mode === 'live' ? 'מקומי לטאב · אינו שדה API' : 'דמו'}</small></span><input required maxLength={80} value={form.name} onChange={event => patch({ name: event.target.value })} /></label>
            <label className="field"><span>כתובת אימייל</span><input type="email" value={form.email} disabled dir="ltr" /></label>
            <label className="field full"><span>אזור זמן IANA</span><input list="timezones" value={form.timezone} onChange={event => patch({ timezone: event.target.value })} dir="ltr" required maxLength={100} /><datalist id="timezones"><option>Asia/Jerusalem</option><option>Europe/London</option><option>America/New_York</option><option>UTC</option></datalist></label>
          </div></section>
          <section className="settings-card" id="languages"><div className="settings-card-heading"><span className="settings-icon purple"><Globe2 size={21} /></span><div><h2>השפות שלי</h2><p>כל שפה תומכת בשש רמות CEFR, מ־A1 עד C2</p></div></div>
            <label className="field"><span>שפת תרגום מועדפת — קוד BCP-47</span><input value={form.defaultTranslationLanguage || ''} onChange={event => patch({ defaultTranslationLanguage: event.target.value || null })} dir="ltr" placeholder="he · en · fr · pt-BR" maxLength={64} /><small className="muted-note">אפשר להשאיר ריק. שינוי ברירת המחדל לא משנה מילים קיימות.</small></label>
            <div className="language-editor">{form.languages.map((language, index) => <div className="language-editor-row" key={index}>
              <label className="field"><span>קוד שפה</span><input aria-label={'שפה ' + (index + 1)} value={language.languageCode} dir="ltr" required maxLength={64} onChange={event => patch({ languages: form.languages.map((value, i) => i === index ? { ...value, languageCode: event.target.value } : value) })} /></label>
              <label className="field"><span>רמה בהערכה עצמית</span><select value={language.selfAssessedLevel || ''} onChange={event => patch({ languages: form.languages.map((value, i) => i === index ? { ...value, selfAssessedLevel: (event.target.value || null) as typeof language.selfAssessedLevel } : value) })}><option value="">לא הוגדרה</option>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(level => <option key={level}>{level}</option>)}</select></label>
              <button type="button" className="icon-button" aria-label="הסרת שפה" onClick={() => patch({ languages: form.languages.filter((_, i) => i !== index) })}><Trash2 size={17} /></button>
            </div>)}</div>
            <button type="button" className="button secondary" disabled={form.languages.length >= 100} onClick={() => patch({ languages: [...form.languages, { languageCode: '', selfAssessedLevel: null }] })}><Plus size={16} />הוספת שפת לימוד</button>
            <p className="muted-note">רמה עצמית אינה ציון שליטה. רמה אפקטיבית לקריאה נקבעת בשרת, אם נצברה ראיה מתאימה.</p>
          </section>
          <section className="settings-card" id="learning"><div className="settings-card-heading"><span className="settings-icon orange"><SlidersHorizontal size={21} /></span><div><h2>העדפות למידה</h2><p>הגדרות אישיות ליעד ולתרגום</p></div></div><div className="settings-fields">
            <label className="field"><span>סוג היעד היומי</span><select value={form.dailyGoal.type} onChange={event => patch({ dailyGoal: { ...form.dailyGoal, type: event.target.value as UserProfile['dailyGoal']['type'] } })}><option value="items">מילים ייחודיות</option><option value="minutes">דקות</option><option value="attempts">ניסיונות</option></select></label>
            <label className="field"><span>ערך היעד</span><input type="number" min="1" max="100000" step="1" required value={form.dailyGoal.value} onChange={event => patch({ dailyGoal: { ...form.dailyGoal, value: Number(event.target.value) } })} /></label>
            <label className="field"><span>מילים חדשות ביום</span><input type="number" min="0" max="10000" step="1" required value={form.defaultNewItemsPerDay} onChange={event => patch({ defaultNewItemsPerDay: Number(event.target.value) })} /></label>
            <label className="field"><span>שיטת תרגום מועדפת</span><select value={form.translationMethodPreference || ''} onChange={event => patch({ translationMethodPreference: (event.target.value || null) as UserProfile['translationMethodPreference'] })}><option value="">ללא העדפה</option><option value="auto">אוטומטי</option><option value="dictionary">מילון / תרגום</option><option value="ai">AI</option></select></label>
          </div>
          {mode === 'live' && <div className="field"><span>כישורים פעילים ללמידה</span><div className="live-options">{(['recognition', 'recall', 'listening', 'spelling', 'pronunciation'] as const).map(skill => { const enabled = form.learningPreferences?.enabledSkills || ['recognition', 'recall', 'spelling']; return <label key={skill} className="live-checkbox"><input type="checkbox" checked={enabled.includes(skill)} onChange={event => patch({ learningPreferences: { enabledSkills: event.target.checked ? [...enabled, skill] : enabled.filter(s => s !== skill) } })} />{labels[skill]}</label>; })}</div><small className="muted-note">נדרש לפחות כישור אחד. האזנה והגייה עדיין תלויות בספק ובתמיכת השפה בשרת.</small></div>}
          <div className="field interest-setting"><span>תחומי עניין לתוכן</span><div className="interest-editor">{form.interests.map(interest => <span key={interest}>{interest}<button type="button" aria-label={'הסרת ' + interest} onClick={() => patch({ interests: form.interests.filter(value => value !== interest) })}><X size={12} /></button></span>)}</div></div>
          <div className="add-interest-row"><input aria-label="תחום עניין חדש" value={newInterest} maxLength={100} onChange={event => setNewInterest(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addInterest(); } }} placeholder="למשל: חלל" /><button type="button" className="button secondary" disabled={!newInterest.trim() || form.interests.length >= 100} onClick={addInterest}>הוספה</button></div>
          </section>
        </fieldset>
        <div className="settings-card"><h2>תזכורות</h2><p className="muted-note">שליחת תזכורות וסיכום שבועי מחכה לשירות הדוא״ל המתוכנן. לא מופעל כאן מנגנון הודעות מדומה.</p></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="settings-actions">{mode === 'demo' && <button type="button" className="button ghost danger-text" onClick={() => setResetOpen(true)}><RotateCcw size={17} />איפוס נתוני הדמו</button>}<button className="button primary" disabled={saving || !!profileError} type="submit">{saving ? <LoaderCircle className="spin" size={18} /> : saved ? <Check size={18} /> : <Save size={18} />}{saving ? 'שומר…' : saved ? 'נשמר בהצלחה' : 'שמירת שינויים'}</button></div>
        {saved && <p className="sr-only" role="status">השינויים נשמרו בהצלחה</p>}
      </div>
    </form>
    <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="איפוס סביבת הדמו"><div className="modal-body"><p>פעולה זו מחליפה את נתוני הדמו המקומיים במילות הדוגמה ומוחקת את היסטוריית התרגול המקומית בלבד. אין שינוי בחשבון אמיתי.</p><div className="modal-actions"><button className="button secondary" onClick={() => setResetOpen(false)}>ביטול</button><button className="button primary" onClick={() => { resetDemo(); setResetOpen(false); setSaved(false); }}>איפוס דמו</button></div></div></Modal>
  </div>;
}
