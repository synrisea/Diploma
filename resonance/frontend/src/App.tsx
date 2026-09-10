import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { MapPage } from './pages/MapPage';
import { LoginPage } from './pages/LoginPage';
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
          </Routes>
        </RouteProvider>
      </HeatmapProvider>
    </div>
  );
}
