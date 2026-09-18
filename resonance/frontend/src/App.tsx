import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { MapPage } from './pages/MapPage';
import { LoginPage } from './pages/LoginPage';
import { SettingsPage } from './pages/SettingsPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { InboxPage } from './pages/InboxPage';
import { ConversationPage } from './pages/ConversationPage';
import { HeatmapProvider } from './heatmap/HeatmapContext';
import { RouteProvider } from './route/RouteContext';

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-ground text-stone-900">
      <div className="app-grain" aria-hidden="true" />
      <HeatmapProvider>
        <RouteProvider>
          <Header />
          <Routes>
            <Route path="/" element={<MapPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/users/:id" element={<UserProfilePage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/messages/new" element={<ConversationPage />} />
            <Route path="/messages/:conversationId" element={<ConversationPage />} />
            <Route path="/auth/callback" element={<GoogleCallbackPage />} />
          </Routes>
        </RouteProvider>
      </HeatmapProvider>
    </div>
  );
}
