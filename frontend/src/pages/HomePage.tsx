import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Badge } from '../components';
import { createSession, listSessions } from '../api/client';
import type { Session } from '../types';
import { PERSONAS } from '../types';

export function HomePage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [sessionName, setSessionName] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    setLoading(true);
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSession() {
    if (!sessionName.trim()) return;
    setCreating(true);
    try {
      const session = await createSession({ name: sessionName.trim() });
      navigate(`/session/${session.id}/setup`);
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setCreating(false);
    }
  }

  const statusVariant = (status: Session['status']) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'running':
        return 'warning';
      case 'failed':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-100 mb-4">Saruman</h1>
        <p className="text-xl text-gray-400">
          Gamified LLM Security Testing
        </p>
        <p className="text-gray-500 mt-2">
          Configure your AI defense and test it against Red Team attackers
        </p>
        <div className="mt-6">
          <Button variant="secondary" onClick={() => navigate('/experiments')}>
            Run Experiments
          </Button>
        </div>
      </div>

      <Card title="Create New Session">
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Session name (e.g., My Defense v1)"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            onClick={handleCreateSession}
            disabled={creating || !sessionName.trim()}
          >
            {creating ? 'Creating...' : 'Create Session'}
          </Button>
        </div>
      </Card>

      {sessions.length > 0 && (
        <Card title="Previous Sessions">
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-medium text-gray-100">{session.name}</h3>
                        <p className="text-sm text-gray-400">
                          {new Date(session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={statusVariant(session.status)}>
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      {session.security_score !== null && (
                        <div className="text-sm">
                          <span className="text-gray-400">Security: </span>
                          <span
                            className={
                              session.security_score >= 0.7
                                ? 'text-green-400'
                                : session.security_score >= 0.4
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }
                          >
                            {Math.round(session.security_score * 100)}%
                          </span>
                        </div>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            session.status === 'completed'
                              ? `/session/${session.id}/results`
                              : `/session/${session.id}/setup`
                          )
                        }
                      >
                        {session.status === 'completed' ? 'View Results' : 'Continue'}
                      </Button>
                    </div>
                  </div>
                  {/* Show simulation config for completed sessions */}
                  {session.status === 'completed' && session.selected_personas && session.selected_personas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600 text-sm text-gray-400">
                      <span>Attackers: </span>
                      <span className="text-gray-300">
                        {session.selected_personas.map(id =>
                          PERSONAS.find(p => p.id === id)?.name || id
                        ).join(', ')}
                      </span>
                      {session.max_turns && (
                        <>
                          <span className="mx-2">|</span>
                          <span>Turns: </span>
                          <span className="text-gray-300">{session.max_turns}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
