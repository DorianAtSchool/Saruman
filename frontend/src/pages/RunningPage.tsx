import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Badge } from '../components';
import { getSession, getConversations, runSimulation } from '../api/client';
import { PERSONAS } from '../types';
import type { SimulationResults } from '../types';

type Conversation = SimulationResults['conversations'][0];
type Message = Conversation['messages'][0];

interface PersonaStatus {
  status: 'pending' | 'running' | 'completed';
  outcome?: string;
  leaked_keys?: string[];
  messages: Message[];
}

export function RunningPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [simulationStarted, setSimulationStarted] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentPersona, setCurrentPersona] = useState<string | null>(null);
  const [personaStatuses, setPersonaStatuses] = useState<Record<string, PersonaStatus>>({});
  const [selectedTab, setSelectedTab] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initStartedRef = useRef(false);  // Prevent double initialization in StrictMode
  const userSelectedTabRef = useRef(false);  // Track if user has manually selected a tab

  // Get selected personas from localStorage
  const selectedPersonas: string[] = sessionId
    ? JSON.parse(localStorage.getItem(`simulation-personas-${sessionId}`) || '["direct"]')
    : ['direct'];

  // Initialize persona statuses
  useEffect(() => {
    const initial: Record<string, PersonaStatus> = {};
    selectedPersonas.forEach((p) => {
      initial[p] = { status: 'pending', messages: [] };
    });
    setPersonaStatuses(initial);
  }, []);

  // Load session and start simulation
  useEffect(() => {
    if (sessionId) {
      initializeSimulation();
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [sessionId]);

  async function initializeSimulation() {
    if (!sessionId) return;
    
    // Prevent double initialization (React StrictMode calls useEffect twice)
    if (initStartedRef.current) return;
    initStartedRef.current = true;
    
    setLoading(true);
    
    try {
      const data = await getSession(sessionId);
      
      // Always start a new simulation - the backend will reset if needed
      // Don't check for 'completed' here because we might be doing Edit & Retry
      if (data.status !== 'running') {
        await startSimulation();
      } else {
        setSimulationStarted(true);
      }
      
      // Start polling for updates after simulation has started
      startPolling();
      
    } catch (error) {
      console.error('Failed to initialize:', error);
      initStartedRef.current = false;  // Allow retry on error
    } finally {
      setLoading(false);
    }
  }

  async function startSimulation() {
    if (!sessionId || simulationStarted) return;
    
    const maxTurns = parseInt(localStorage.getItem(`simulation-maxTurns-${sessionId}`) || '5', 10);
    
    try {
      setSimulationStarted(true);
      // Await the initial POST to ensure backend has reset the session
      // The actual simulation runs in background on the server
      await runSimulation(sessionId, {
        personas: selectedPersonas,
        max_turns: maxTurns,
      });
    } catch (error) {
      console.error('Simulation failed:', error);
      navigate(`/session/${sessionId}/run`);
    }
  }

  function startPolling() {
    if (pollingRef.current) return;
    
    // Poll immediately, then every 1.5 seconds
    pollForUpdates();
    pollingRef.current = setInterval(pollForUpdates, 1500);
  }

  const pollForUpdates = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      // Check session status
      const session = await getSession(sessionId);
      
      if (session.status === 'completed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        // Small delay before navigating to let user see final state
        setTimeout(() => {
          navigate(`/session/${sessionId}/results`);
        }, 1000);
        return;
      }
      
      if (session.status === 'failed') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
        return;
      }
      
      // Get conversations to update UI
      const conversations = await getConversations(sessionId);
      updatePersonaStatuses(conversations);
      
    } catch (error) {
      console.error('Poll error:', error);
    }
  }, [sessionId, navigate]);

  function updatePersonaStatuses(conversations: Conversation[]) {
    const newStatuses: Record<string, PersonaStatus> = {};

    // Initialize all selected personas
    selectedPersonas.forEach((p) => {
      newStatuses[p] = { status: 'pending', messages: [] };
    });

    // Find which persona is currently running (has messages but not complete)
    let foundRunning = false;
    let runningPersona: string | null = null;

    // Sort conversations by number of messages (most recent/active first)
    // This handles the case where there might be duplicate persona conversations
    const sortedConvs = [...conversations].sort((a, b) =>
      (b.messages?.length || 0) - (a.messages?.length || 0)
    );

    // Track which personas we've already processed
    const processedPersonas = new Set<string>();

    sortedConvs.forEach((conv) => {
      const persona = conv.persona;

      // Skip if not in selected personas or already processed
      if (!selectedPersonas.includes(persona) || processedPersonas.has(persona)) return;

      processedPersonas.add(persona);

      const isComplete = conv.outcome !== 'pending';

      newStatuses[persona] = {
        status: isComplete ? 'completed' : 'running',
        outcome: conv.outcome,
        leaked_keys: conv.secrets_leaked || [],
        messages: conv.messages || [],
      };

      if (!isComplete && !foundRunning) {
        runningPersona = persona;
        foundRunning = true;
      }
    });

    if (!foundRunning) {
      // Find first pending persona
      const firstPending = selectedPersonas.find(p => newStatuses[p].status === 'pending');
      if (firstPending) {
        runningPersona = firstPending;
      }
    }

    setCurrentPersona(runningPersona);

    // Only auto-select tab if user hasn't manually selected one yet
    if (!userSelectedTabRef.current && selectedTab === null && selectedPersonas.length > 0) {
      setSelectedTab(selectedPersonas[0]);
    }

    setPersonaStatuses(newStatuses);
  }

  function handleTabSelect(personaId: string) {
    userSelectedTabRef.current = true;
    setSelectedTab(personaId);
  }

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

  function getPersonaName(id: string): string {
    return PERSONAS.find((p) => p.id === id)?.name || id;
  }

  function getStatusBadge(status: PersonaStatus) {
    if (status.status === 'completed') {
      if (status.outcome === 'win') {
        return <Badge variant="danger">Leaked {status.leaked_keys?.length || 0}</Badge>;
      } else if (status.outcome === 'loss') {
        return <Badge variant="success">Defended</Badge>;
      }
      return <Badge variant="info">Complete</Badge>;
    }
    if (status.status === 'running') {
      return <Badge variant="warning">Running</Badge>;
    }
    return <Badge variant="neutral">Pending</Badge>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Starting simulation...</p>
      </div>
    );
  }

  const selectedStatus = selectedTab ? personaStatuses[selectedTab] : null;

  return (
    <div className="h-screen flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Simulation Running</h1>
          <p className="text-gray-400 text-sm">Testing your defenses against selected attackers...</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono text-gray-100">{formatTime(elapsedTime)}</div>
          <p className="text-xs text-gray-500">Elapsed time</p>
        </div>
      </div>

      {/* Horizontal Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {selectedPersonas.map((personaId) => {
          const status = personaStatuses[personaId] || { status: 'pending', messages: [] };
          const isSelected = selectedTab === personaId;
          const isCurrent = currentPersona === personaId;

          return (
            <button
              key={personaId}
              onClick={() => handleTabSelect(personaId)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {/* Status indicator */}
              {isCurrent && status.status === 'running' && (
                <div className="w-2 h-2 rounded-full bg-blue-300 animate-pulse"></div>
              )}
              {status.status === 'completed' && (
                <div className={`w-2 h-2 rounded-full ${
                  status.outcome === 'win' ? 'bg-red-500' : 'bg-green-500'
                }`}></div>
              )}
              {status.status === 'pending' && (
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
              )}

              <span className="font-medium">{getPersonaName(personaId)}</span>
              <span className="text-xs opacity-75">({status.messages.length})</span>
              {status.status === 'completed' && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  status.outcome === 'win'
                    ? 'bg-red-900/50 text-red-300'
                    : status.outcome === 'loss'
                    ? 'bg-green-900/50 text-green-300'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {status.outcome === 'win' ? 'Leaked' : status.outcome === 'loss' ? 'Defended' : status.outcome}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Conversation Content */}
      <div className="flex-1 bg-gray-800 rounded-lg border border-gray-700 overflow-hidden flex flex-col">
        {selectedTab && selectedStatus ? (
          <>
            {/* Tab header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-100">{getPersonaName(selectedTab)}</span>
                {getStatusBadge(selectedStatus)}
              </div>
              <span className="text-sm text-gray-400">
                {selectedStatus.messages.length} messages
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {selectedStatus.messages.length > 0 ? (
                selectedStatus.messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg ${
                      msg.role === 'red_team'
                        ? 'bg-red-900/20 border border-red-800/50 mr-16'
                        : 'bg-blue-900/20 border border-blue-800/50 ml-16'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium ${
                        msg.role === 'red_team' ? 'text-red-400' : 'text-blue-400'
                      }`}>
                        {msg.role === 'red_team' ? 'Attacker' : 'Defender'}
                      </span>
                      <span className="text-xs text-gray-500">Turn {msg.turn_number + 1}</span>
                      {msg.blocked && (
                        <Badge variant="warning">Blocked</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                    {msg.block_reason && (
                      <p className="text-xs text-yellow-500 mt-1">Reason: {msg.block_reason}</p>
                    )}
                  </div>
                ))
              ) : selectedStatus.status === 'pending' ? (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Waiting to start...
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No messages yet
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select an attacker tab to view the conversation
          </div>
        )}
      </div>

      {/* Current Activity Indicator */}
      {currentPersona && personaStatuses[currentPersona]?.status === 'running' && (
        <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-600 border-t-blue-500"></div>
            <span className="text-sm text-gray-300">
              {getPersonaName(currentPersona)} is attacking...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
