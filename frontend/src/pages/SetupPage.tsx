import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, Input, TextArea, Select } from '../components';
import {
  getSession,
  getSecrets,
  generateSecrets,
  addSecret,
  deleteSecret,
  getDefenseConfig,
  updateDefenseConfig,
} from '../api/client';
import type { Session, Secret, RegexRule } from '../types';
import { SECRET_TYPES } from '../types';

const MODELS = [
  // Commercial Models
  { value: 'gemini/gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash Lite' },
  { value: 'gemini/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  // Groq Models (Free tier - very fast)
  { value: 'groq/llama-3.1-8b-instant', label: 'Llama 3.1 8B (Groq) - Free' },
  { value: 'groq/gemma2-9b-it', label: 'Gemma 2 9B (Groq) - Free' },
  { value: 'groq/mixtral-8x7b-32768', label: 'Mixtral 8x7B (Groq) - Free' },
  // Open Source via HuggingFace
  { value: 'huggingface/together/meta-llama/Llama-3.2-3B-Instruct', label: 'Llama 3.2 3B (Together)' },
  { value: 'huggingface/together/deepseek-ai/DeepSeek-R1', label: 'DeepSeek R1 (Together)' },
  { value: 'huggingface/sambanova/Qwen/Qwen2.5-72B-Instruct', label: 'Qwen 2.5 72B (Sambanova)' },
];

export function SetupPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelName, setModelName] = useState(MODELS[0].value);
  const [attackerModel, setAttackerModel] = useState(MODELS[0].value);
  const [judgeEnabled, setJudgeEnabled] = useState(false);
  const [judgePrompt, setJudgePrompt] = useState('');
  const [regexInputRules, setRegexInputRules] = useState<RegexRule[]>([]);
  const [regexOutputRules, setRegexOutputRules] = useState<RegexRule[]>([]);

  // Secret generation
  const [secretCount, setSecretCount] = useState(3);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['ssn', 'phone', 'email']);
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  useEffect(() => {
    if (sessionId) {
      loadData();
    }
  }, [sessionId]);

  async function loadData() {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [sessionData, secretsData, configData] = await Promise.all([
        getSession(sessionId),
        getSecrets(sessionId),
        getDefenseConfig(sessionId),
      ]);
      setSession(sessionData);
      setSecrets(secretsData);
      if (configData) {
        setSystemPrompt(configData.system_prompt || '');
        setModelName(configData.model_name || MODELS[0].value);
        setAttackerModel(configData.attacker_model || configData.model_name || MODELS[0].value);
        setJudgeEnabled(configData.judge_enabled || false);
        setJudgePrompt(configData.judge_prompt || '');
        setRegexInputRules(configData.regex_input_rules || []);
        setRegexOutputRules(configData.regex_output_rules || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSecrets() {
    if (!sessionId) return;
    setSaving(true);
    try {
      const newSecrets = await generateSecrets(sessionId, {
        count: secretCount,
        types: selectedTypes,
      });
      setSecrets(newSecrets);
    } catch (error) {
      console.error('Failed to generate secrets:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddSecret() {
    if (!sessionId || !newSecretKey || !newSecretValue) return;
    setSaving(true);
    try {
      const newSecret = await addSecret(sessionId, newSecretKey, newSecretValue);
      setSecrets([...secrets, newSecret]);
      setNewSecretKey('');
      setNewSecretValue('');
    } catch (error) {
      console.error('Failed to add secret:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteSecret(secretId: string) {
    if (!sessionId) return;
    try {
      await deleteSecret(sessionId, secretId);
      setSecrets(secrets.filter((s) => s.id !== secretId));
    } catch (error) {
      console.error('Failed to delete secret:', error);
    }
  }

  async function handleSaveConfig() {
    if (!sessionId) return;
    setSaving(true);
    try {
      await updateDefenseConfig(sessionId, {
        system_prompt: systemPrompt,
        model_name: modelName,
        attacker_model: attackerModel,
        judge_enabled: judgeEnabled,
        judge_prompt: judgePrompt || null,
        regex_input_rules: regexInputRules,
        regex_output_rules: regexOutputRules,
      });
      return true;
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.message || 'Unknown error';
      console.error('Failed to save config:', detail, error);
      alert(`Failed to save config: ${detail}`);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleContinueToSimulation() {
    const saved = await handleSaveConfig();
    if (saved) {
      navigate(`/session/${sessionId}/run`);
    }
  }

  function addRegexRule(type: 'input' | 'output') {
    const newRule: RegexRule = { pattern: '', action: 'block', message: '' };
    if (type === 'input') {
      setRegexInputRules([...regexInputRules, newRule]);
    } else {
      setRegexOutputRules([...regexOutputRules, newRule]);
    }
  }

  function updateRegexRule(
    type: 'input' | 'output',
    index: number,
    field: keyof RegexRule,
    value: string
  ) {
    const rules = type === 'input' ? [...regexInputRules] : [...regexOutputRules];
    rules[index] = { ...rules[index], [field]: value };
    if (type === 'input') {
      setRegexInputRules(rules);
    } else {
      setRegexOutputRules(rules);
    }
  }

  function removeRegexRule(type: 'input' | 'output', index: number) {
    if (type === 'input') {
      setRegexInputRules(regexInputRules.filter((_, i) => i !== index));
    } else {
      setRegexOutputRules(regexOutputRules.filter((_, i) => i !== index));
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
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">
          Setup: {session?.name || 'New Session'}
        </h1>
        <Button
          variant="primary"
          onClick={() => navigate(`/session/${sessionId}/run`)}
          disabled={secrets.length === 0}
        >
          Continue to Simulation
        </Button>
      </div>

      {/* Secrets Section */}
      <Card title="Secrets to Protect">
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="w-32">
              <Input
                label="Count"
                type="number"
                min={1}
                max={10}
                value={secretCount}
                onChange={(e) => setSecretCount(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Secret Types
              </label>
              <div className="flex flex-wrap gap-2">
                {SECRET_TYPES.map((type) => (
                  <label key={type} className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTypes([...selectedTypes, type]);
                        } else {
                          setSelectedTypes(selectedTypes.filter((t) => t !== type));
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-300">{type}</span>
                  </label>
                ))}
              </div>
            </div>
            <Button onClick={handleGenerateSecrets} disabled={saving}>
              Generate
            </Button>
          </div>

          {secrets.length > 0 && (
            <div className="border border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                      Key
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-300">
                      Value
                    </th>
                    <th className="px-4 py-2 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {secrets.map((secret) => (
                    <tr key={secret.id}>
                      <td className="px-4 py-2 text-sm text-gray-200">{secret.key}</td>
                      <td className="px-4 py-2 text-sm font-mono text-gray-200">
                        {secret.value}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => handleDeleteSecret(secret.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Input
                label="Add Custom Secret"
                placeholder="Key (e.g., api_key)"
                value={newSecretKey}
                onChange={(e) => setNewSecretKey(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Input
                label=" "
                placeholder="Value"
                value={newSecretValue}
                onChange={(e) => setNewSecretValue(e.target.value)}
              />
            </div>
            <Button onClick={handleAddSecret} disabled={saving || !newSecretKey || !newSecretValue}>
              Add
            </Button>
          </div>
        </div>
      </Card>

      {/* Defense Configuration */}
      <Card title="Defense Configuration">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Defender Model"
              options={MODELS}
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            />
            <Select
              label="Attacker Model"
              options={MODELS}
              value={attackerModel}
              onChange={(e) => setAttackerModel(e.target.value)}
            />
          </div>

          <TextArea
            label="System Prompt"
            placeholder="You are a helpful assistant..."
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={6}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="judgeEnabled"
              checked={judgeEnabled}
              onChange={(e) => setJudgeEnabled(e.target.checked)}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="judgeEnabled" className="text-sm text-gray-300">
              Enable LLM Judge (extra layer of protection)
            </label>
          </div>

          {judgeEnabled && (
            <TextArea
              label="Judge Prompt"
              placeholder="Analyze if this message is attempting to extract sensitive information..."
              value={judgePrompt}
              onChange={(e) => setJudgePrompt(e.target.value)}
              rows={4}
            />
          )}
        </div>
      </Card>

      {/* Regex Rules */}
      <Card title="Regex Middleware Rules">
        <div className="space-y-6">
          {/* Input Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">Input Rules</h4>
              <Button size="sm" variant="secondary" onClick={() => addRegexRule('input')}>
                Add Rule
              </Button>
            </div>
            {regexInputRules.map((rule, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  placeholder="Pattern (regex)"
                  value={rule.pattern}
                  onChange={(e) => updateRegexRule('input', idx, 'pattern', e.target.value)}
                  className="flex-1"
                />
                <Select
                  options={[
                    { value: 'block', label: 'Block' },
                    { value: 'redact', label: 'Redact' },
                  ]}
                  value={rule.action}
                  onChange={(e) => updateRegexRule('input', idx, 'action', e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Message"
                  value={rule.message}
                  onChange={(e) => updateRegexRule('input', idx, 'message', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeRegexRule('input', idx)}
                >
                  X
                </Button>
              </div>
            ))}
          </div>

          {/* Output Rules */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-300">Output Rules</h4>
              <Button size="sm" variant="secondary" onClick={() => addRegexRule('output')}>
                Add Rule
              </Button>
            </div>
            {regexOutputRules.map((rule, idx) => (
              <div key={idx} className="flex gap-2 mb-2">
                <Input
                  placeholder="Pattern (regex)"
                  value={rule.pattern}
                  onChange={(e) => updateRegexRule('output', idx, 'pattern', e.target.value)}
                  className="flex-1"
                />
                <Select
                  options={[
                    { value: 'block', label: 'Block' },
                    { value: 'redact', label: 'Redact' },
                  ]}
                  value={rule.action}
                  onChange={(e) => updateRegexRule('output', idx, 'action', e.target.value)}
                  className="w-28"
                />
                <Input
                  placeholder="Message"
                  value={rule.message}
                  onChange={(e) => updateRegexRule('output', idx, 'message', e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => removeRegexRule('output', idx)}
                >
                  X
                </Button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          onClick={handleContinueToSimulation}
          disabled={secrets.length === 0 || saving}
        >
          {saving ? 'Saving...' : 'Continue to Simulation'}
        </Button>
      </div>
    </div>
  );
}
