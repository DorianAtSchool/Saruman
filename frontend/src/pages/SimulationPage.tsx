import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Badge, Select } from '../components';
import {
  getSession,
  getDefenseConfig,
  updateDefenseConfig,
  getPersonaPrompts,
  updatePersonaPrompt,
  resetPersonaPrompt,
  cancelSession,
  type PersonaInfo,
} from '../api/client';
import type { DefenseConfig } from '../types';
import { PERSONAS } from '../types';
import { MODELS } from '../models';

export function AttackConfigPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [cancelling, setCancelling] = useState(false);
  const [defenseConfig, setDefenseConfig] = useState<DefenseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedPersonas, setSelectedPersonas] = useState<string[]>(() => {
    const saved = sessionId ? localStorage.getItem(`simulation-personas-${sessionId}`) : null;
    return saved ? JSON.parse(saved) : ['direct'];
  });
  const [maxTurns, setMaxTurns] = useState(() => {
    const saved = sessionId ? localStorage.getItem(`simulation-maxTurns-${sessionId}`) : null;
    return saved ? parseInt(saved, 10) : 5;
  });
  const [attackerModel, setAttackerModel] = useState(() => {
    const saved = sessionId ? localStorage.getItem(`simulation-attackerModel-${sessionId}`) : null;
    return saved || MODELS[0].value;
  });

  // Attacker prompt editing
  const [personaInfos, setPersonaInfos] = useState<PersonaInfo[]>([]);
  const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
  const [editingPersona, setEditingPersona] = useState<string | null>(null);
  const [editPromptValue, setEditPromptValue] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);

  // Save selections to localStorage when they change
  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`simulation-personas-${sessionId}`, JSON.stringify(selectedPersonas));
    }
  }, [sessionId, selectedPersonas]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`simulation-maxTurns-${sessionId}`, String(maxTurns));
    }
  }, [sessionId, maxTurns]);

  useEffect(() => {
    if (sessionId) {
      localStorage.setItem(`simulation-attackerModel-${sessionId}`, attackerModel);
    }
  }, [sessionId, attackerModel]);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  async function loadSession() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessionData, configData, promptsData] = await Promise.all([
        getSession(sessionId),
        getDefenseConfig(sessionId),
        getPersonaPrompts(sessionId),
      ]);
      setDefenseConfig(configData);
      setPersonaInfos(promptsData.personas);
      setCustomPrompts(promptsData.custom_prompts);
      if (configData?.attacker_model) {
        setAttackerModel(configData.attacker_model);
      }
      // Only redirect if currently running (user should wait for results)
      if (sessionData.status === 'running') {
        navigate(`/session/${sessionId}/running`);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  }

  function getPromptForPersona(personaId: string): string {
    if (customPrompts[personaId]) {
      return customPrompts[personaId];
    }
    const info = personaInfos.find(p => p.id === personaId);
    return info?.default_prompt || '';
  }

  function hasCustomPrompt(personaId: string): boolean {
    if (!customPrompts[personaId]) return false;
    const info = personaInfos.find(p => p.id === personaId);
    // Only show as custom if it differs from default
    return customPrompts[personaId].trim() !== (info?.default_prompt || '').trim();
  }

  function startEditing(personaId: string) {
    setEditingPersona(personaId);
    setEditPromptValue(getPromptForPersona(personaId));
  }

  async function savePrompt() {
    if (!sessionId || !editingPersona) return;
    setSavingPrompt(true);
    try {
      await updatePersonaPrompt(sessionId, editingPersona, editPromptValue);
      setCustomPrompts({ ...customPrompts, [editingPersona]: editPromptValue });
      setEditingPersona(null);
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setSavingPrompt(false);
    }
  }

  async function resetPrompt() {
    if (!sessionId || !editingPersona) return;
    setSavingPrompt(true);
    try {
      await resetPersonaPrompt(sessionId, editingPersona);
      const newCustomPrompts = { ...customPrompts };
      delete newCustomPrompts[editingPersona];
      setCustomPrompts(newCustomPrompts);
      setEditingPersona(null);
    } catch (error) {
      console.error('Failed to reset prompt:', error);
    } finally {
      setSavingPrompt(false);
    }
  }

  async function handleRunSimulation() {
    if (!sessionId || !defenseConfig) return;
    setStarting(true);
    try {
      // Save attacker model and attack config to localStorage for RunningPage
      localStorage.setItem(`simulation-personas-${sessionId}`, JSON.stringify(selectedPersonas));
      localStorage.setItem(`simulation-maxTurns-${sessionId}`, String(maxTurns));
      localStorage.setItem(`simulation-attackerModel-${sessionId}`, attackerModel);
      
      // Save attacker model to defense config
      await updateDefenseConfig(sessionId, {
        system_prompt: defenseConfig.system_prompt,
        model_name: defenseConfig.model_name,
        attacker_model: attackerModel,
        regex_input_rules: defenseConfig.regex_input_rules,
        regex_output_rules: defenseConfig.regex_output_rules,
        judge_enabled: defenseConfig.judge_enabled,
        judge_prompt: defenseConfig.judge_prompt,
      });
      
      // Navigate to running page - it will start the simulation after connecting to SSE
      navigate(`/session/${sessionId}/running`);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      console.error('Failed to save config:', detail, error);
      alert(`Failed to save config: ${detail}`);
      setStarting(false);
    }
  }

  function togglePersona(personaId: string) {
    if (selectedPersonas.includes(personaId)) {
      setSelectedPersonas(selectedPersonas.filter((p) => p !== personaId));
    } else {
      setSelectedPersonas([...selectedPersonas, personaId]);
    }
  }

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
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Attack Configuration</h1>
        <Button variant="secondary" onClick={() => navigate(`/session/${sessionId}/setup`)}>
          Back to Setup
        </Button>
      </div>

      <Card title="Select Attackers">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PERSONAS.map((persona) => (
            <div
              key={persona.id}
              className={`p-4 rounded-lg border transition-colors ${
                selectedPersonas.includes(persona.id)
                  ? 'bg-blue-900/30 border-blue-700'
                  : 'bg-gray-800 border-gray-700'
              } ${starting ? 'opacity-50' : ''}`}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPersonas.includes(persona.id)}
                  onChange={() => togglePersona(persona.id)}
                  disabled={starting}
                  className="mt-1 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-100">{persona.name}</span>
                    {persona.id === 'benign_user' && (
                      <Badge variant="info">Usability Test</Badge>
                    )}
                    {hasCustomPrompt(persona.id) && (
                      <Badge variant="warning">Custom</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{persona.description}</p>
                </div>
              </label>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startEditing(persona.id);
                }}
                disabled={starting}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
              >
                View/Edit Prompt
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Prompt Edit Modal */}
      {editingPersona && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-3xl w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-100">
                Edit {PERSONAS.find(p => p.id === editingPersona)?.name} Prompt
              </h3>
              <button
                onClick={() => setEditingPersona(null)}
                className="text-gray-400 hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="p-4 flex-1 overflow-hidden">
              <textarea
                value={editPromptValue}
                onChange={(e) => setEditPromptValue(e.target.value)}
                className="w-full h-full min-h-[300px] bg-gray-700 border border-gray-600 rounded-lg p-3 text-gray-100 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter custom system prompt for this attacker..."
              />
            </div>
            <div className="p-4 border-t border-gray-700 flex items-center justify-between">
              <button
                onClick={resetPrompt}
                disabled={savingPrompt || !hasCustomPrompt(editingPersona)}
                className="text-sm text-gray-400 hover:text-gray-200 disabled:opacity-50"
              >
                Reset to Default
              </button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setEditingPersona(null)}
                  disabled={savingPrompt}
                >
                  Cancel
                </Button>
                <Button
                  onClick={savePrompt}
                  disabled={savingPrompt}
                >
                  {savingPrompt ? 'Saving...' : 'Save Prompt'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card title="Simulation Settings">
        <div className="space-y-4">
          <Select
            label="Attacker Model"
            options={MODELS}
            value={attackerModel}
            onChange={(e) => setAttackerModel(e.target.value)}
            disabled={starting}
          />
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
                disabled={starting}
                className="w-24 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-sm text-gray-400">
              Each attacker will have {maxTurns} conversation turns to attempt extraction.
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-center gap-4">
        <Button
          size="lg"
          onClick={handleRunSimulation}
          disabled={starting || selectedPersonas.length === 0}
        >
          {starting ? 'Starting...' : 'Run Simulation →'}
        </Button>
        <Button
          size="lg"
          variant="danger"
          onClick={handleCancelSession}
          disabled={cancelling}
        >
          {cancelling ? 'Cancelling...' : 'Cancel Session'}
        </Button>
      </div>
    </div>
  );
}
