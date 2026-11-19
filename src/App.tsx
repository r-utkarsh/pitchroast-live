import { BrowserRouter, Route, Routes } from 'react-router-dom';
import DemoPage from './pages/DemoPage';
import LandingPage from './pages/LandingPage';
import NotFoundPage from './pages/NotFoundPage';
import RoomPage from './pages/RoomPage';
import SmokePage from './pages/SmokePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/r/:roomId" element={<RoomPage />} />
        <Route path="/demo" element={<DemoPage />} />
        {import.meta.env.DEV ? (
          <Route path="/__smoke" element={<SmokePage />} />
        ) : null}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
