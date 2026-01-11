import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, SetupPage, AttackConfigPage, RunningPage, ResultsPage } from './pages';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId/setup" element={<SetupPage />} />
          <Route path="/session/:sessionId/run" element={<AttackConfigPage />} />
          <Route path="/session/:sessionId/running" element={<RunningPage />} />
          <Route path="/session/:sessionId/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
