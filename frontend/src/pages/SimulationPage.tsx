import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge } from '../components';
import { getSession, runSimulation } from '../api/client';
import type { Session } from '../types';
import { PERSONAS } from '../types';

export function SimulationPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(['utilitarian']);
  const [maxTurns, setMaxTurns] = useState(5);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  async function loadSession() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await getSession(sessionId);
      setSession(data);
      if (data.status === 'completed' || data.status === 'failed') {
        navigate(`/session/${sessionId}/results`);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }

  const pollStatus = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await getSession(sessionId);
      setSession(data);
      setPollCount((c) => c + 1);
      if (data.status === 'completed') {
        navigate(`/session/${sessionId}/results`);
      } else if (data.status === 'failed') {
        setRunning(false);
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, [sessionId, navigate]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (running && session?.status === 'running') {
      interval = setInterval(pollStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [running, session?.status, pollStatus]);

  async function handleRunSimulation() {
    if (!sessionId) return;
    setRunning(true);
    setPollCount(0);
    try {
      await runSimulation(sessionId, {
        personas: selectedPersonas,
        max_turns: maxTurns,
      });
      // Start polling
      const data = await getSession(sessionId);
      setSession(data);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      console.error('Failed to start simulation:', detail, error);
      alert(`Failed to start simulation: ${detail}`);
      setRunning(false);
    }
  }

  function togglePersona(personaId: string) {
    if (selectedPersonas.includes(personaId)) {
      setSelectedPersonas(selectedPersonas.filter((p) => p !== personaId));
    } else {
      setSelectedPersonas([...selectedPersonas, personaId]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const isRunning = session?.status === 'running' || running;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Run Simulation</h1>
        <Button variant="secondary" onClick={() => navigate(`/session/${sessionId}/setup`)}>
          Back to Setup
        </Button>
      </div>

      <Card title="Select Attackers">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONAS.map((persona) => (
            <label
              key={persona.id}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedPersonas.includes(persona.id)
                  ? 'bg-blue-900/30 border-blue-700'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                checked={selectedPersonas.includes(persona.id)}
                onChange={() => togglePersona(persona.id)}
                disabled={isRunning}
                className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-100">{persona.name}</span>
                  {persona.id === 'benign_user' && (
                    <Badge variant="info">Usability Test</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">{persona.description}</p>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card title="Simulation Settings">
        <div className="flex items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Turns per Attacker
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxTurns}
              onChange={(e) => setMaxTurns(Number(e.target.value))}
              disabled={isRunning}
              className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-400">
            Each attacker will have {maxTurns} conversation turns to attempt extraction.
          </div>
        </div>
      </Card>

      {isRunning && (
        <Card>
          <div className="flex flex-col items-center py-8">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              Simulation Running...
            </h3>
            <p className="text-gray-400">
              Status: <Badge variant="warning">{session?.status || 'running'}</Badge>
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Polling every 3 seconds... (poll #{pollCount})
            </p>
          </div>
        </Card>
      )}

      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={handleRunSimulation}
          disabled={isRunning || selectedPersonas.length === 0}
        >
          {isRunning ? 'Running...' : 'Start Simulation'}
        </Button>
      </div>
    </div>
  );
}
