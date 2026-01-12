import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input, Select } from '../components';
import {
  createExperiment,
  startExperiment,
  getRedPersonaOptions,
  getBluePersonaOptions,
} from '../api/client';
import type { PersonaOption, ExperimentConfig } from '../types';
import { SECRET_TYPES } from '../types';
import { MODELS } from '../models';

const DEFAULT_CONFIG: ExperimentConfig = {
  trials_per_combination: 3,
  turns_per_trial: 5,
  defender_model: 'groq/llama-3.1-8b-instant',
  attacker_model: 'groq/llama-3.1-8b-instant',
  secret_types: ['ssn', 'phone', 'email'],
  custom_secrets: {},
  delay_between_trials: 2.0,
};

export function ExperimentSetupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [config, setConfig] = useState<ExperimentConfig>(DEFAULT_CONFIG);
  const [redPersonas, setRedPersonas] = useState<PersonaOption[]>([]);
  const [bluePersonas, setBluePersonas] = useState<PersonaOption[]>([]);
  const [selectedRed, setSelectedRed] = useState<string[]>([]);
  const [selectedBlue, setSelectedBlue] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Custom secrets state
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    setLoading(true);
    try {
      const [reds, blues] = await Promise.all([
        getRedPersonaOptions(),
        getBluePersonaOptions(),
      ]);
      setRedPersonas(reds);
      setBluePersonas(blues);
      // Select all by default
      setSelectedRed(reds.map((p) => p.id));
      setSelectedBlue(blues.map((p) => p.id));
    } catch (error) {
      console.error('Failed to load options:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleRed(id: string) {
    setSelectedRed((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleBlue(id: string) {
    setSelectedBlue((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function toggleSecretType(type: string) {
    setConfig((prev) => ({
      ...prev,
      secret_types: prev.secret_types.includes(type)
        ? prev.secret_types.filter((t) => t !== type)
        : [...prev.secret_types, type],
    }));
  }

  const totalTrials =
    selectedRed.length * selectedBlue.length * config.trials_per_combination;

  async function handleCreate() {
    if (!name.trim()) {
      alert('Please enter an experiment name');
      return;
    }
    if (selectedRed.length === 0 || selectedBlue.length === 0) {
      alert('Please select at least one red and one blue persona');
      return;
    }

    setCreating(true);
    try {
      const experiment = await createExperiment({
        name: name.trim(),
        config,
        red_personas: selectedRed,
        blue_personas: selectedBlue,
      });

      // Start the experiment immediately
      await startExperiment(experiment.id);

      navigate(`/experiments/${experiment.id}/progress`);
    } catch (error) {
      console.error('Failed to create experiment:', error);
      alert('Failed to create experiment');
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">New Experiment</h1>
          <p className="text-gray-400 mt-1">
            Configure and run a Red vs Blue personality analysis
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/experiments')}>
          Cancel
        </Button>
      </div>

      <Card title="Basic Info">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Experiment Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Experiment 2026-01-11"
            />
          </div>
        </div>
      </Card>

      <Card title="Red Team Personas (Attackers)">
        <div className="grid grid-cols-2 gap-3">
          {redPersonas.map((persona) => (
            <label
              key={persona.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedRed.includes(persona.id)
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedRed.includes(persona.id)}
                onChange={() => toggleRed(persona.id)}
                className="mt-1"
              />
              <div>
                <span className="font-medium text-gray-100">{persona.name}</span>
                {persona.description && (
                  <p className="text-sm text-gray-400">{persona.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedRed(redPersonas.map((p) => p.id))}
          >
            Select All
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedRed([])}>
            Clear All
          </Button>
        </div>
      </Card>

      <Card title="Blue Team Personas (Defenders)">
        <div className="grid grid-cols-2 gap-3">
          {bluePersonas.map((persona) => (
            <label
              key={persona.id}
              className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedBlue.includes(persona.id)
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-600 hover:border-gray-500'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedBlue.includes(persona.id)}
                onChange={() => toggleBlue(persona.id)}
                className="mt-1"
              />
              <span className="font-medium text-gray-100">{persona.name}</span>
            </label>
          ))}
        </div>
        <div className="mt-3 flex gap-3">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSelectedBlue(bluePersonas.map((p) => p.id))}
          >
            Select All
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelectedBlue([])}>
            Clear All
          </Button>
        </div>
      </Card>

      <Card title="Configuration">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Trials per Combination
            </label>
            <Input
              type="number"
              min={1}
              max={10}
              value={config.trials_per_combination}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  trials_per_combination: parseInt(e.target.value) || 1,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Run each matchup multiple times for statistical validity
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Turns per Trial
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={config.turns_per_trial}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  turns_per_trial: parseInt(e.target.value) || 5,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Conversation turns before extraction phase
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Defender Model
            </label>
            <Select
              options={MODELS}
              value={config.defender_model}
              onChange={(e) =>
                setConfig((c) => ({ ...c, defender_model: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Attacker Model
            </label>
            <Select
              options={MODELS}
              value={config.attacker_model}
              onChange={(e) =>
                setConfig((c) => ({ ...c, attacker_model: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Delay Between Trials (seconds)
            </label>
            <Input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={config.delay_between_trials}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  delay_between_trials: parseFloat(e.target.value) || 2.0,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">Rate limiting delay</p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Secret Types
          </label>
          <div className="flex flex-wrap gap-2">
            {SECRET_TYPES.map((type) => (
              <label
                key={type}
                className={`px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                  config.secret_types.includes(type)
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-gray-600 text-gray-400 hover:border-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.secret_types.includes(type)}
                  onChange={() => toggleSecretType(type)}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
        </div>

        {/* Custom Secrets */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Secrets
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Add custom key-value pairs that will be included in every trial
          </p>
          
          {/* Existing custom secrets */}
          {Object.keys(config.custom_secrets).length > 0 && (
            <div className="space-y-2 mb-3">
              {Object.entries(config.custom_secrets).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                  <span className="text-gray-300 font-medium">{key}:</span>
                  <span className="text-gray-400 font-mono text-sm flex-1">{value}</span>
                  <button
                    onClick={() => {
                      const newSecrets = { ...config.custom_secrets };
                      delete newSecrets[key];
                      setConfig((c) => ({ ...c, custom_secrets: newSecrets }));
                    }}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new secret */}
          <div className="flex gap-2">
            <Input
              placeholder="Key (e.g., api_key)"
              value={newSecretKey}
              onChange={(e) => setNewSecretKey(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Value"
              value={newSecretValue}
              onChange={(e) => setNewSecretValue(e.target.value)}
              className="flex-1"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (newSecretKey.trim() && newSecretValue.trim()) {
                  setConfig((c) => ({
                    ...c,
                    custom_secrets: {
                      ...c.custom_secrets,
                      [newSecretKey.trim()]: newSecretValue.trim(),
                    },
                  }));
                  setNewSecretKey('');
                  setNewSecretValue('');
                }
              }}
              disabled={!newSecretKey.trim() || !newSecretValue.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300">
              <span className="font-bold text-2xl text-gray-100">{totalTrials}</span>{' '}
              total trials
            </p>
            <p className="text-sm text-gray-400">
              {selectedRed.length} red x {selectedBlue.length} blue x{' '}
              {config.trials_per_combination} trials
            </p>
          </div>
          <Button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            size="lg"
          >
            {creating ? 'Creating...' : 'Start Experiment'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
