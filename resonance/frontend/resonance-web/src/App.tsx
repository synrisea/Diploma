import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { MapPage } from './pages/MapPage';
import { LoginPage } from './pages/LoginPage';
import { HeatmapProvider } from './heatmap/HeatmapContext';

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-ground text-stone-900">
      <div className="app-grain" aria-hidden="true" />
      <HeatmapProvider>
        <Header />
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </HeatmapProvider>
    </div>
  );
}
