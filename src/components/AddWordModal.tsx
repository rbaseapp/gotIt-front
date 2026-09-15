import { useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Languages, Link2, Plus, Save } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { canonicalLanguage } from '../lib/contracts';
import { normalizeAnswer } from '../lib/practice';
import type { LearningItem } from '../types';
import { Modal } from './Modal';

export function AddWordModal({ open, onClose, item }: { open: boolean; onClose: () => void; item?: LearningItem }) {
  const { addItem, updateItem, items, profile, mode } = useApp();
  const [source, setSource] = useState(''); const [translation, setTranslation] = useState('');
  const [context, setContext] = useState(''); const [tags, setTags] = useState('');
  const [sourceLanguage, setSourceLanguage] = useState('en'); const [translationLanguage, setTranslationLanguage] = useState('he');
  const [examples, setExamples] = useState(''); const [translations, setTranslations] = useState('');
  const [mergeId, setMergeId] = useState('new'); const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    setSource(item?.source || ''); setTranslation(item?.translation || ''); setContext(item?.context || '');
    setTags(item?.tags.join(', ') || ''); setSourceLanguage(item?.sourceLanguage || profile.languages[0]?.languageCode || 'en');
    setTranslationLanguage(item?.translationLanguage || profile.defaultTranslationLanguage || 'he');
    setExamples(item?.examples?.join('\n') || ''); setTranslations(item?.translations?.join('\n') || '');
    setMergeId('new'); setError('');
  }, [open, item, profile]);
  const candidates = !item ? items.filter(value => !value.deletedAt && normalizeAnswer(value.source) === normalizeAnswer(source) && value.sourceLanguage.toLowerCase() === sourceLanguage.toLowerCase() && value.translationLanguage.toLowerCase() === translationLanguage.toLowerCase()) : [];
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!source.trim() || !translation.trim()) { setError('יש להזין מילה ומשמעות'); return; }
    try {
      const input = { source: source.trim(), translation: translation.trim(), context: context.trim(), sourceLanguage: canonicalLanguage(sourceLanguage), translationLanguage: canonicalLanguage(translationLanguage), tags: [...new Set(tags.split(',').map(tag => tag.trim()).filter(Boolean))] };
      if (!input.sourceLanguage || !input.translationLanguage) throw new Error();
      if (item) updateItem(item.id, { ...input, examples: examples.split('\n').map(value => value.trim()).filter(Boolean), translations: translations.split('\n').map(value => value.trim()).filter(Boolean) });
      else addItem(input, candidates.some(candidate => candidate.id === mergeId) ? mergeId : undefined);
      onClose();
    } catch { setError('יש להזין קודי שפה תקינים, למשל en, he, fr או pt-BR'); }
  };
  return <Modal open={open} onClose={onClose} title={item ? 'עריכת מילה ומשמעות' : 'הוספת מילה חדשה'}>
    {mode !== 'demo' ? <div className="modal-body"><p>שמירת אוצר מילים בחשבון דורשת את ממשק B2 שעדיין לא ממומש.</p></div> : <form className="modal-body form-stack" onSubmit={submit}>
      <div className="form-two-columns"><label className="field"><span>שפת מקור <Languages size={13} /></span><input aria-label="קוד שפת מקור" value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} dir="ltr" required maxLength={64} placeholder="en" /></label><label className="field"><span>שפת תרגום</span><input aria-label="קוד שפת תרגום" value={translationLanguage} onChange={event => setTranslationLanguage(event.target.value)} dir="ltr" required maxLength={64} placeholder="he" /></label></div>
      <small className="muted-note">ניתן להשתמש בכל קוד BCP-47. שינוי ברירת המחדל לא משנה מילים קיימות.</small>
      <label className="field"><span>מילה או ביטוי</span><div className="input-with-icon"><BookOpen size={18} /><input value={source} onChange={event => setSource(event.target.value)} placeholder="למשל: make a difference" dir="auto" required maxLength={500} /></div></label>
      <label className="field"><span>המשמעות המדויקת</span><input value={translation} onChange={event => setTranslation(event.target.value)} placeholder="התרגום המדויק בהקשר" dir="auto" required maxLength={1000} /></label>
      <label className="field"><span>משפט מקור <small>מומלץ</small></span><textarea value={context} onChange={event => setContext(event.target.value)} placeholder="המשפט שבו פגשת את המילה" dir="auto" rows={3} maxLength={3000} /></label>
      {candidates.length > 0 && <fieldset className="sense-picker"><legend>אותו כתיב כבר קיים. בחרו במפורש את המשמעות:</legend><label><input type="radio" checked={mergeId === 'new'} onChange={() => setMergeId('new')} />יצירת משמעות חדשה</label>{candidates.map(candidate => <label key={candidate.id}><input type="radio" checked={mergeId === candidate.id} onChange={() => setMergeId(candidate.id)} />הוספת ההקשר ל־“{candidate.translation}”</label>)}<small>מיזוג לא משנה את התרגום המאושר או את ההתקדמות.</small></fieldset>}
      <label className="field"><span>תגיות <small>מופרדות בפסיק</small></span><div className="input-with-icon"><Link2 size={17} /><input value={tags} onChange={event => setTags(event.target.value)} placeholder="Work, Travel" dir="auto" /></div></label>
      {item && <details className="advanced-fields"><summary>דוגמאות ותרגומים חלופיים</summary><label className="field"><span>משפטי דוגמה — שורה לכל דוגמה</span><textarea value={examples} onChange={event => setExamples(event.target.value)} dir="auto" rows={3} /></label><label className="field"><span>ניסוחים חלופיים לאותה משמעות</span><textarea value={translations} onChange={event => setTranslations(event.target.value)} dir="auto" rows={2} /></label></details>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="button ghost" onClick={onClose}>ביטול</button><button className="button primary" type="submit">{item ? <Save size={18} /> : <Plus size={18} />}{item ? 'שמירת עריכה' : mergeId !== 'new' && candidates.length ? 'הוספת ההקשר' : 'הוספה לאוצר המילים'}</button></div>
    </form>}
  </Modal>;
}
