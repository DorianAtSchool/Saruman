import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Badge } from '../components';
import { getSession } from '../api/client';
import type { Session } from '../types';
import { PERSONAS } from '../types';

export function RunningPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Get selected personas from localStorage
  const selectedPersonas = sessionId
    ? JSON.parse(localStorage.getItem(`simulation-personas-${sessionId}`) || '["direct"]')
    : ['direct'];

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
      // If not running, redirect appropriately
      if (data.status === 'completed') {
        navigate(`/session/${sessionId}/results`);
      } else if (data.status === 'failed') {
        navigate(`/session/${sessionId}/run`);
      } else if (data.status === 'draft') {
        navigate(`/session/${sessionId}/run`);
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
        // Stay on page but show error
      }
    } catch (error) {
      console.error('Failed to poll status:', error);
    }
  }, [sessionId, navigate]);

  // Poll for status updates
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (session?.status === 'running') {
      interval = setInterval(pollStatus, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [session?.status, pollStatus]);

  // Update elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  const isFailed = session?.status === 'failed';

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-100 mb-2">
          {isFailed ? 'Simulation Failed' : 'Simulation Running'}
        </h1>
        <p className="text-gray-400">
          {isFailed
            ? 'An error occurred during the simulation.'
            : 'Testing your defenses against selected attackers...'}
        </p>
      </div>

      <Card>
        <div className="flex flex-col items-center py-8">
          {!isFailed && (
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-700 border-t-blue-500 mb-6"></div>
          )}
          {isFailed && (
            <div className="text-red-500 text-6xl mb-6">✗</div>
          )}
          
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <span className="text-gray-400">Status:</span>
              <Badge variant={isFailed ? 'danger' : 'warning'}>
                {session?.status || 'running'}
              </Badge>
            </div>
            
            <div className="text-2xl font-mono text-gray-100">
              {formatTime(elapsedTime)}
            </div>
            
            <p className="text-sm text-gray-500">
              Poll #{pollCount} • Checking every 3 seconds
            </p>
          </div>
        </div>
      </Card>

      <Card title="Attackers in Progress">
        <div className="space-y-2">
          {selectedPersonas.map((personaId: string) => {
            const persona = PERSONAS.find((p) => p.id === personaId);
            return (
              <div
                key={personaId}
                className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span className="text-gray-100">{persona?.name || personaId}</span>
                </div>
                <Badge variant="warning">Running</Badge>
              </div>
            );
          })}
        </div>
      </Card>

      {isFailed && (
        <div className="flex justify-center">
          <button
            onClick={() => navigate(`/session/${sessionId}/run`)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Attack Configuration
          </button>
        </div>
      )}
    </div>
  );
}
