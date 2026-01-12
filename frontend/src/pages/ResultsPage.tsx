import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge, ScoreGauge, ChatLog } from '../components';
import { getResults, getDefenseConfig, getPersonaPrompts, cancelSession, type PersonaPromptsResponse } from '../api/client';
import type { SimulationResults, Conversation, DefenseConfig } from '../types';

export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<SimulationResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [defenseConfig, setDefenseConfig] = useState<DefenseConfig | null>(null);
  const [personaPrompts, setPersonaPrompts] = useState<PersonaPromptsResponse | null>(null);
  const [showDefenderPrompt, setShowDefenderPrompt] = useState(false);
  const [showAttackerPrompt, setShowAttackerPrompt] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  async function loadResults() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [data, config, prompts] = await Promise.all([
        getResults(sessionId),
        getDefenseConfig(sessionId),
        getPersonaPrompts(sessionId),
      ]);
      setResults(data);
      setDefenseConfig(config);
      setPersonaPrompts(prompts);
      if (data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0]);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
    }
  }

  // Helper to get the prompt used for an attacker
  function getAttackerPrompt(personaId: string): string {
    if (!personaPrompts) return '';
    // Check for custom prompt first
    if (personaPrompts.custom_prompts[personaId]) {
      return personaPrompts.custom_prompts[personaId];
    }
    // Fall back to default prompt
    const persona = personaPrompts.personas.find(p => p.id === personaId);
    return persona?.default_prompt || '';
  }

  // Check if benign user was run
  const benignUserRan = results?.conversations.some(c => c.persona === 'benign_user') ?? false;

  async function handleCancelSession() {
    if (!sessionId) return;
    if (!window.confirm('Cancel this session? This cannot be undone.')) return;
    setCancelling(true);
    try {
      await cancelSession(sessionId);
      navigate('/');
    } catch (error) {
      alert('Failed to cancel session');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading results...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">No results found.</p>
      </div>
    );
  }

  const { session, secrets, conversations } = results;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">{session.name}</h1>
          <p className="text-gray-400 mt-1">Simulation Results</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/')}> 
            New Session
          </Button>
          <Button onClick={() => navigate(`/session/${sessionId}/setup`)}>
            Edit & Retry
          </Button>
          <Button variant="danger" onClick={handleCancelSession} disabled={cancelling}>
            {cancelling ? 'Cancelling...' : 'Cancel Session'}
          </Button>
        </div>
      </div>

      {/* Score Overview */}
      <Card>
        <div className="flex justify-around items-center py-4">
          <ScoreGauge
            score={session.security_score ?? 0}
            label="Security Score"
            color={session.security_score! >= 0.7 ? 'green' : session.security_score! >= 0.4 ? 'yellow' : 'red'}
          />
          {benignUserRan && (
            <ScoreGauge
              score={session.usability_score ?? 1}
              label="Usability Score"
              color="blue"
            />
          )}
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-100">
              {secrets.filter((s) => s.is_leaked).length}/{secrets.length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Secrets Leaked</div>
          </div>
        </div>

        {/* View System Prompts */}
        <div className="flex justify-center gap-4 pt-4 border-t border-gray-700 mt-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDefenderPrompt(true)}
          >
            View Defender Prompt
          </Button>
        </div>
      </Card>

      {/* Secrets Table */}
      <Card title="Secrets Status">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Key</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Value</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {secrets.map((secret) => (
                <tr key={secret.id}>
                  <td className="px-4 py-3 text-sm text-gray-200">{secret.key}</td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-200">{secret.value}</td>
                  <td className="px-4 py-3">
                    {secret.is_leaked ? (
                      <Badge variant="danger">LEAKED</Badge>
                    ) : (
                      <Badge variant="success">Protected</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Conversations Heatmap */}
      <Card title="Attack Results">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`p-4 rounded-lg border transition-all ${
                selectedConversation?.id === conv.id
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-gray-700 hover:border-gray-600'
              } ${
                conv.outcome === 'win'
                  ? 'bg-red-900/30'
                  : conv.outcome === 'loss'
                  ? 'bg-green-900/30'
                  : conv.outcome === 'draw'
                  ? 'bg-yellow-900/30'
                  : conv.outcome === 'completed'
                  ? 'bg-blue-900/30'
                  : 'bg-gray-800'
              }`}
            >
              <div className="text-sm font-medium text-gray-200 capitalize">
                {conv.persona.replace('_', ' ')}
              </div>
              <div className="mt-2">
                <Badge
                  variant={
                    conv.outcome === 'win'
                      ? 'danger'
                      : conv.outcome === 'loss'
                      ? 'success'
                      : conv.outcome === 'draw'
                      ? 'warning'
                      : 'neutral'
                  }
                >
                  {conv.outcome === 'win'
                    ? 'Attacker Win'
                    : conv.outcome === 'loss'
                    ? 'Defender Win'
                    : conv.outcome === 'draw'
                    ? 'Draw'
                    : conv.outcome}
                </Badge>
              </div>
              {conv.secrets_leaked.length > 0 && (
                <div className="mt-2 text-xs text-red-400">
                  Leaked: {conv.secrets_leaked.join(', ')}
                </div>
              )}
            </button>
          ))}
        </div>
      </Card>

      {/* Selected Conversation Details */}
      {selectedConversation && (
        <Card title={`Conversation: ${selectedConversation.persona.replace('_', ' ')}`}>
          <div className="space-y-4">
            <div className="flex gap-4 text-sm items-center">
              <div>
                <span className="text-gray-400">Outcome: </span>
                <Badge
                  variant={
                    selectedConversation.outcome === 'win'
                      ? 'danger'
                      : selectedConversation.outcome === 'loss'
                      ? 'success'
                      : 'warning'
                  }
                >
                  {selectedConversation.outcome === 'win'
                    ? 'Attacker Win'
                    : selectedConversation.outcome === 'loss'
                    ? 'Defender Win'
                    : selectedConversation.outcome === 'draw'
                    ? 'Draw'
                    : selectedConversation.outcome}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400">Secrets Leaked: </span>
                <span className="text-gray-200">{selectedConversation.secrets_leaked.length}</span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowAttackerPrompt(true)}
              >
                View Attacker Prompt
              </Button>
            </div>

            {selectedConversation.extraction_results.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Extraction Attempts</h4>
                <div className="bg-gray-800 rounded-lg p-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-1 text-gray-400">Key</th>
                        <th className="text-left py-1 text-gray-400">Extracted Value</th>
                        <th className="text-left py-1 text-gray-400">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConversation.extraction_results.map((result, idx) => (
                        <tr key={idx}>
                          <td className="py-1 text-gray-200">{result.key}</td>
                          <td className="py-1 font-mono text-gray-200">{result.extracted_value}</td>
                          <td className="py-1">
                            {result.attacker_point ? (
                              <Badge variant="danger">Extracted</Badge>
                            ) : result.defender_leak ? (
                              <Badge variant="warning">Value Leaked</Badge>
                            ) : (
                              <Badge variant="success">Protected</Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-medium text-gray-400 mb-2">Conversation Log</h4>
              <ChatLog messages={selectedConversation.messages} />
            </div>
          </div>
        </Card>
      )}

      {/* Defender Prompt Modal */}
      {showDefenderPrompt && defenseConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100">Defender System Prompt</h3>
              <button
                onClick={() => setShowDefenderPrompt(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded-lg">
                {defenseConfig.system_prompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Attacker Prompt Modal */}
      {showAttackerPrompt && selectedConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100">
                Attacker Prompt: {selectedConversation.persona.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setShowAttackerPrompt(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono bg-gray-900 p-4 rounded-lg">
                {getAttackerPrompt(selectedConversation.persona) || 'Prompt not available'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
