import { useState, type ReactNode } from 'react';
import { BarChart3, BookOpen, BookOpenText, ChevronDown, Flame, Gamepad2, HelpCircle, LogOut, Menu, Plus, Settings, X, Zap } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { isDue, levelFromXp } from '../lib/utils';
import { AddWordModal } from './AddWordModal';
import { Logo } from './Logo';
import { LiveCaptureModal } from './LiveCaptureModal';

const navItems = [
  { to: '/dashboard', label: 'היום שלי', icon: BarChart3 },
  { to: '/learn', label: 'ללמוד', icon: Gamepad2 },
  { to: '/vocabulary', label: 'אוצר מילים', icon: BookOpen },
  { to: '/reading', label: 'קריאה בהקשר', icon: BookOpenText },
  { to: '/transfer', label: 'ייבוא וייצוא', icon: BookOpen },
  { to: '/settings', label: 'הגדרות', icon: Settings },
];

export function AppShell({ children, onLogout }: { children: ReactNode; onLogout: () => void }) {
  const { profile, stats, items, mode, notice, profileError, retryProfile } = useApp();
  const location = useLocation();
  const [addOpen, setAddOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const pageTitle = navItems.find(item => location.pathname.startsWith(item.to))?.label || 'GotIt';

  return (
    <div className="app-layout">
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top"><Logo /><button className="mobile-close icon-button" aria-label="סגירת תפריט" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
        <button className="button primary add-word-button" onClick={() => setAddOpen(true)}><Plus size={19} />מילה חדשה</button>
        <nav className="sidebar-nav" aria-label="ניווט ראשי">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Icon size={20} /><span>{label}</span>{to === '/learn' && mode === 'demo' && <span className="nav-count">{items.filter(isDue).length}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon"><Zap size={18} /></span>
          <div><strong>טיפ קטן</strong><p>10 דקות ביום יעילות יותר משעה אחת בשבוע.</p></div>
        </div>
        <NavLink to="/help" className="help-link" onClick={() => setMobileOpen(false)}><HelpCircle size={19} />מרכז העזרה</NavLink>
      </aside>

      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="סגירת תפריט" />}
      <main className="main-column">
        <header className="topbar">
          <div className="topbar-title"><button className="mobile-menu icon-button" aria-label="פתיחת תפריט" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={22} /></button><span>{pageTitle}</span></div>
          <div className="topbar-actions">
            {mode === 'demo' && <><div className="compact-stat streak"><Flame size={18} fill="currentColor" /><b>{stats.streak}</b><span>ימים</span></div><div className="compact-stat xp"><Zap size={17} fill="currentColor" /><b>{stats.xp.toLocaleString()}</b><span>XP לדמו</span></div></>}
            <div className="user-menu-wrap">
              <button className="user-button" aria-expanded={userOpen} aria-label="תפריט חשבון" onClick={() => setUserOpen(value => !value)}>
                <span className="avatar">{profile.name.charAt(0)}</span><span className="user-copy"><b>{profile.name}</b><small>{mode === 'demo' ? 'דמו · רמה ' + levelFromXp(stats.xp) : 'חשבון Core מחובר'}</small></span><ChevronDown size={16} />
              </button>
              {userOpen && <div className="user-popover"><button onClick={onLogout}><LogOut size={17} />יציאה</button></div>}
            </div>
          </div>
        </header>
        <div className="page-content"><div className={mode === 'demo' ? 'mode-banner demo' : 'mode-banner live'}>{mode === 'demo' ? 'סביבת הדגמה · מילים וציונים לדוגמה, היסטוריית תרגול מקומית בלבד' : 'חשבון אמיתי · מילים והתקדמות נשמרות בשרת GotIt'}</div>{notice && <p className="form-error" role="alert">{notice}</p>}{profileError && <div className="form-error" role="alert">{profileError}<button className="button ghost" onClick={() => void retryProfile()}>טעינה מחדש</button></div>}{children}</div>
      </main>
      {mode === 'live' ? <LiveCaptureModal open={addOpen} onClose={() => setAddOpen(false)} /> : <AddWordModal open={addOpen} onClose={() => setAddOpen(false)} />}
    </div>
  );
}
