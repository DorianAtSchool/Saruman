import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  HomePage,
  SetupPage,
  AttackConfigPage,
  RunningPage,
  ResultsPage,
  ExperimentsListPage,
  ExperimentSetupPage,
  ExperimentProgressPage,
  ExperimentResultsPage,
} from './pages';

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
          <Route path="/experiments" element={<ExperimentsListPage />} />
          <Route path="/experiments/new" element={<ExperimentSetupPage />} />
          <Route path="/experiments/:experimentId/progress" element={<ExperimentProgressPage />} />
          <Route path="/experiments/:experimentId/results" element={<ExperimentResultsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
