import { Route, Routes } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { MapPage } from './pages/MapPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <Header />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </div>
  );
}
