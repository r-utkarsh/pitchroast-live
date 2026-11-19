import { BrowserRouter, Route, Routes } from 'react-router-dom';
import SmokePage from './pages/SmokePage';

function HomePlaceholder() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="text-center">
        <p className="text-sm font-medium uppercase tracking-widest text-accent-400">PitchRoast</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink-100">PitchRoast Live</h1>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/__smoke" element={import.meta.env.DEV ? <SmokePage /> : <HomePlaceholder />} />
        <Route path="*" element={<HomePlaceholder />} />
      </Routes>
    </BrowserRouter>
  );
}
