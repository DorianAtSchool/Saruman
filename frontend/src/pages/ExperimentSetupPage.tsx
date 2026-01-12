import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Input } from '../components';
import {
  createExperiment,
  startExperiment,
  getRedPersonaOptions,
  getBluePersonaOptions,
} from '../api/client';
import type { PersonaOption, ExperimentConfig } from '../types';
import { SECRET_TYPES, AVAILABLE_MODELS } from '../types';

const DEFAULT_CONFIG: ExperimentConfig = {
  trials_per_combination: 3,
  turns_per_trial: 5,
  defender_model: 'groq/llama-3.1-8b-instant',
  attacker_model: 'groq/llama-3.1-8b-instant',
  secret_types: ['ssn', 'phone', 'email'],
  custom_secrets: [],
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

  function addCustomSecret() {
    setConfig((prev) => ({
      ...prev,
      custom_secrets: [...prev.custom_secrets, { key: '', value: '' }],
    }));
  }

  function updateCustomSecret(index: number, field: 'key' | 'value', value: string) {
    setConfig((prev) => ({
      ...prev,
      custom_secrets: prev.custom_secrets.map((secret, i) =>
        i === index ? { ...secret, [field]: value } : secret
      ),
    }));
  }

  function removeCustomSecret(index: number) {
    setConfig((prev) => ({
      ...prev,
      custom_secrets: prev.custom_secrets.filter((_, i) => i !== index),
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

    // Validate custom secrets - must have both key and value
    const validSecrets = config.custom_secrets.filter(s => s.key.trim() && s.value.trim());

    // Convert custom_secrets array to dict for API
    const customSecretsDict: Record<string, string> = {};
    for (const secret of validSecrets) {
      customSecretsDict[secret.key.trim()] = secret.value.trim();
    }

    setCreating(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const apiConfig: any = {
        ...config,
        custom_secrets: customSecretsDict,
      };
      const experiment = await createExperiment({
        name: name.trim(),
        config: apiConfig,
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
            <select
              value={config.defender_model}
              onChange={(e) =>
                setConfig((c) => ({ ...c, defender_model: e.target.value }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Attacker Model
            </label>
            <select
              value={config.attacker_model}
              onChange={(e) =>
                setConfig((c) => ({ ...c, attacker_model: e.target.value }))
              }
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {AVAILABLE_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
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
            Secret Types (auto-generated)
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

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Secrets
          </label>
          <p className="text-xs text-gray-500 mb-3">
            Add your own key-value pairs to test against
          </p>
          <div className="space-y-2">
            {config.custom_secrets.map((secret, index) => (
              <div key={index} className="flex gap-2 items-center">
                <Input
                  placeholder="Key (e.g., api_key)"
                  value={secret.key}
                  onChange={(e) => updateCustomSecret(index, 'key', e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Value (e.g., sk-abc123)"
                  value={secret.value}
                  onChange={(e) => updateCustomSecret(index, 'value', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => removeCustomSecret(index)}
                  className="text-red-400 hover:text-red-300"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={addCustomSecret}
            className="mt-3"
          >
            + Add Custom Secret
          </Button>
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
