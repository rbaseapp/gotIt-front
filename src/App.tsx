import { LoaderCircle } from 'lucide-react';
import { useApp } from './context/AppContext';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { GameSessionPage } from './pages/GameSessionPage';
import { LearnPage } from './pages/LearnPage';
import { SettingsPage } from './pages/SettingsPage';
import { VocabularyPage } from './pages/VocabularyPage';
import { ReadingPage } from './pages/ReadingPage';
import { HelpPage } from './pages/HelpPage';

export default function App() {
  const { mode, logout } = useApp();
  if (mode === 'loading') return <div className="empty-session" role="status"><LoaderCircle className="spin" size={30} /><p>בודקים את הכניסה שלך…</p></div>;
  if (mode === 'signed-out') return <AuthPage />;
  return <Routes>
    <Route path="/learn/session/:type" element={<GameSessionPage />} />
    <Route path="*" element={<AppShell onLogout={() => void logout()}><Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/learn" element={<LearnPage />} />
      <Route path="/vocabulary" element={<VocabularyPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/reading" element={<ReadingPage />} />
      <Route path="/help" element={<HelpPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes></AppShell>} />
  </Routes>;
}
