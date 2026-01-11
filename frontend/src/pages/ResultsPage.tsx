import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge, ScoreGauge, ChatLog } from '../components';
import { getResults } from '../api/client';
import type { SimulationResults, Conversation } from '../types';

export function ResultsPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [results, setResults] = useState<SimulationResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadResults();
    }
  }, [sessionId]);

  async function loadResults() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await getResults(sessionId);
      setResults(data);
      if (data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0]);
      }
    } catch (error) {
      console.error('Failed to load results:', error);
    } finally {
      setLoading(false);
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
          <ScoreGauge
            score={session.usability_score ?? 1}
            label="Usability Score"
            color="blue"
          />
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-100">
              {secrets.filter((s) => s.is_leaked).length}/{secrets.length}
            </div>
            <div className="text-sm text-gray-400 mt-1">Secrets Leaked</div>
          </div>
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
                    ? 'Attacker Won'
                    : conv.outcome === 'loss'
                    ? 'Defended'
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
            <div className="flex gap-4 text-sm">
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
                  {selectedConversation.outcome}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400">Secrets Leaked: </span>
                <span className="text-gray-200">{selectedConversation.secrets_leaked.length}</span>
              </div>
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
                              <Badge variant="success">Failed</Badge>
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
    </div>
  );
}
