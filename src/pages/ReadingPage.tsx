import { useState } from 'react';
import { BookOpen, ChevronLeft, Sparkles, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { readStorage, writeStorage } from '../lib/storage';
import { speak, statusLabels } from '../lib/utils';
import { CapabilityNotice } from '../components/CapabilityNotice';
import type { LearningItem } from '../types';

interface Reading { id: string; title: string; body: string[]; itemIds: string[]; createdAt: string; language: string; level: string; }
function HighlightedText({ text, items, onWord }: { text: string; items: LearningItem[]; onWord: (item: LearningItem) => void }) {
  const sorted = [...items].sort((a, b) => b.source.length - a.source.length);
  const escaped = sorted.map(item => item.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (!escaped.length) return <p dir="auto">{text}</p>;
  const expression = new RegExp('(' + escaped.join('|') + ')', 'gi');
  return <p dir="auto">{text.split(expression).map((part, index) => { const item = sorted.find(value => value.source.toLowerCase() === part.toLowerCase()); return item ? <button className="reading-word" key={index} onClick={() => onWord(item)}>{part}</button> : <span key={index}>{part}</span>; })}</p>;
}
export function ReadingPage() {
  const { items, profile, mode } = useApp(); const navigate = useNavigate();
  const [topic, setTopic] = useState(profile.interests[0] || ''); const [language, setLanguage] = useState(profile.languages[0]?.languageCode || 'en');
  const [level, setLevel] = useState('B1'); const [length, setLength] = useState('short'); const [type, setType] = useState('article');
  const [selected, setSelected] = useState<string[]>([]); const [word, setWord] = useState<LearningItem | null>(null);
  const [history, setHistory] = useState<Reading[]>(() => { const value = readStorage<unknown>('gotit.readings.v1', []); return Array.isArray(value) ? value.filter(reading => reading && typeof reading.title === 'string' && typeof reading.id === 'string' && Array.isArray(reading.body) && reading.body.every((text: unknown) => typeof text === 'string') && Array.isArray(reading.itemIds)) : []; });
  const [reading, setReading] = useState<Reading | null>(null);
  const eligible = items.filter(item => !item.deletedAt && item.userStatus === 'ACTIVE' && item.sourceLanguage === language);
  const languages = [...new Set(items.filter(item => !item.deletedAt).map(item => item.sourceLanguage))];
  const openDemo = () => {
    const targets = (selected.length ? eligible.filter(item => selected.includes(item.id)) : eligible).slice(0, length === 'short' ? 3 : length === 'medium' ? 5 : 8);
    const content: Reading = { id: crypto.randomUUID(), title: topic.trim() || 'מילים בהקשר', body: targets.map(item => item.context || item.examples?.[0] || item.source + ' — ' + item.translation), itemIds: targets.map(item => item.id), language, level, createdAt: new Date().toISOString() };
    const next = [content, ...history].slice(0, 20); setReading(content); setHistory(next); writeStorage('gotit.readings.v1', next); setWord(null);
  };
  if (mode !== 'demo') return <CapabilityNotice title="קריאה בהקשר" milestone="B9: תוכן AI ושאלונים" />;
  const targets = reading ? items.filter(item => reading.itemIds.includes(item.id) && !item.deletedAt) : [];
  return <div className="reading-page page-enter"><section className="page-heading-row"><div><p className="eyebrow">המילים שלך, בתוך סיפור</p><h1>קריאה בהקשר</h1><p>ממשק לקריאה מותאמת אישית. יצירת AI מחכה לספק ולממשק B9.</p></div></section>
    <div className="reading-layout"><section className="panel reading-controls"><h2>התאמת הקריאה</h2><form className="form-stack" onSubmit={event => { event.preventDefault(); openDemo(); }}><label className="field"><span>נושא / תחום עניין</span><input value={topic} onChange={event => setTopic(event.target.value)} placeholder="טכנולוגיה, נסיעות, עסקים..." maxLength={150} /></label><div className="form-two-columns"><label className="field"><span>שפת יעד</span><select value={language} onChange={event => { setLanguage(event.target.value); setSelected([]); }}>{languages.map(value => <option key={value}>{value}</option>)}</select></label><label className="field"><span>רמת CEFR</span><select value={level} onChange={event => setLevel(event.target.value)}>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(value => <option key={value}>{value}</option>)}</select></label></div><div className="form-two-columns"><label className="field"><span>סוג תוכן</span><select value={type} onChange={event => setType(event.target.value)}><option value="article">מאמר</option><option value="essay">חיבור</option><option value="news_style">כתבה</option></select></label><label className="field"><span>אורך</span><select value={length} onChange={event => setLength(event.target.value)}><option value="short">קצר</option><option value="medium">בינוני</option><option value="long">ארוך</option></select></label></div>
    <fieldset className="reading-item-picker"><legend>מילים לשילוב <small>ללא בחירה: עד 8 מילים פעילות</small></legend>{eligible.map(item => <label key={item.id}><input type="checkbox" checked={selected.includes(item.id)} onChange={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])} /><span dir="auto">{item.source}</span></label>)}</fieldset><button className="button primary" disabled={!eligible.length}><BookOpen size={18} />פתיחת דוגמת קריאה</button><p className="muted-note">הדוגמה מציגה משפטי מקור קיימים, אינה יצירת AI ואינה מותאמת אוטומטית לרמה או לנושא. הנתונים בבקרות מיועדים לממשק B9 בעתיד.</p></form>
    </section><div className="reading-view"><section className="panel reading-document">{reading ? <><span className="pill reading-demo-pill"><Sparkles size={14} />תוכן הדגמה מתוך ההקשרים שנשמרו</span><h2>{reading.title}</h2><p className="reading-meta">{reading.language} · רמה מבוקשת {reading.level} · {targets.length} מילים</p>{reading.body.map((text, index) => <HighlightedText text={text} items={targets} onWord={setWord} key={index} />)}{word && <div className="reading-word-panel"><div><b dir="auto">{word.source}</b><span dir="auto">{word.translation}</span><small>{statusLabels[word.status]}</small></div><button className="sound-orb-small" aria-label="השמעת מילה" onClick={() => speak(word.source, word.sourceLanguage)}><Volume2 size={19} /></button></div>}<div className="reading-footer"><p>עצם הקריאה אינה מעלה שליטה או XP.</p><button className="button primary" disabled={!targets.length} onClick={() => navigate('/learn/session/recall?items=' + encodeURIComponent(targets.map(item => item.id).join(',')))}>תרגול המילים מהקריאה <ChevronLeft size={17} /></button></div></> : <div className="empty-reading"><BookOpen size={42} /><h2>נותנים למילים הקשר</h2><p>בחרו מילים ופתחו דוגמת קריאה. לחיצה על מילה מודגשת מציגה את משמעותה.</p></div>}</section>{history.length > 0 && <section className="panel reading-history"><h3>קריאות שנפתחו</h3>{history.slice(0, 5).map(value => <button key={value.id} onClick={() => { setReading(value); setWord(null); }}><BookOpen size={16} /><span>{value.title}</span><small>{new Date(value.createdAt).toLocaleDateString('he-IL')}</small><ChevronLeft size={16} /></button>)}</section>}</div></div>
  </div>;
}
