import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, SetupPage, SimulationPage, ResultsPage } from './pages';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/session/:sessionId/setup" element={<SetupPage />} />
          <Route path="/session/:sessionId/run" element={<SimulationPage />} />
          <Route path="/session/:sessionId/results" element={<ResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
