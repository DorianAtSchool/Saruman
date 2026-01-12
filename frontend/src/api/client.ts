// Cancel session
export async function cancelSession(sessionId: string): Promise<{ message: string; session_id: string }> {
  const response = await api.post<{ message: string; session_id: string }>(`/sessions/${sessionId}/cancel`);
  return response.data;
}

// Cancel experiment
export async function cancelExperiment(experimentId: string): Promise<{ message: string; experiment_id: string }> {
  const response = await api.post<{ message: string; experiment_id: string }>(`/experiments/${experimentId}/cancel`);
  return response.data;
}
import axios from 'axios';
import type {
  Session,
  Secret,
  DefenseConfig,
  SimulationResults,
  CreateSessionRequest,
  GenerateSecretsRequest,
  DefenseConfigUpdate,
  RunSimulationRequest,
  Experiment,
  ExperimentCreate,
  ExperimentStatus,
  ExperimentTrial,
  ExperimentResults,
  PersonaOption,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sessions
export async function createSession(data: CreateSessionRequest): Promise<Session> {
  const response = await api.post<Session>('/sessions', data);
  return response.data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const response = await api.get<Session>(`/sessions/${sessionId}`);
  return response.data;
}

export async function listSessions(): Promise<Session[]> {
  const response = await api.get<Session[]>('/sessions');
  return response.data;
}

// Secrets
export async function generateSecrets(
  sessionId: string,
  data: GenerateSecretsRequest
): Promise<Secret[]> {
  const response = await api.post<Secret[]>(
    `/sessions/${sessionId}/secrets/generate`,
    data
  );
  return response.data;
}

export async function getSecrets(sessionId: string): Promise<Secret[]> {
  const response = await api.get<Secret[]>(`/sessions/${sessionId}/secrets`);
  return response.data;
}

export async function addSecret(
  sessionId: string,
  key: string,
  value: string
): Promise<Secret> {
  const response = await api.post<Secret>(`/sessions/${sessionId}/secrets`, {
    key,
    value,
  });
  return response.data;
}

export async function deleteSecret(sessionId: string, secretId: string): Promise<void> {
  await api.delete(`/sessions/${sessionId}/secrets/${secretId}`);
}

// Defense Config
export async function getDefenseConfig(sessionId: string): Promise<DefenseConfig | null> {
  const response = await api.get<DefenseConfig | null>(`/sessions/${sessionId}/defense`);
  return response.data;
}

export async function updateDefenseConfig(
  sessionId: string,
  data: DefenseConfigUpdate
): Promise<DefenseConfig> {
  const response = await api.put<DefenseConfig>(
    `/sessions/${sessionId}/defense`,
    data
  );
  return response.data;
}

// Simulation
export async function runSimulation(
  sessionId: string,
  data: RunSimulationRequest
): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(
    `/sessions/${sessionId}/run`,
    data
  );
  return response.data;
}

export async function getResults(sessionId: string): Promise<SimulationResults> {
  const response = await api.get<SimulationResults>(
    `/sessions/${sessionId}/results`
  );
  return response.data;
}

export async function getConversations(sessionId: string): Promise<SimulationResults['conversations']> {
  const response = await api.get<SimulationResults>(
    `/sessions/${sessionId}/results`
  );
  return response.data.conversations;
}

// Persona prompts
export interface PersonaInfo {
  id: string;
  name: string;
  description: string;
  default_prompt: string;
}

export interface PersonaPromptsResponse {
  personas: PersonaInfo[];
  custom_prompts: Record<string, string>;
}

export async function getPersonaPrompts(sessionId: string): Promise<PersonaPromptsResponse> {
  const response = await api.get<PersonaPromptsResponse>(
    `/sessions/${sessionId}/persona-prompts`
  );
  return response.data;
}

export async function updatePersonaPrompt(
  sessionId: string,
  persona: string,
  systemPrompt: string
): Promise<void> {
  await api.put(`/sessions/${sessionId}/persona-prompts/${persona}`, {
    persona,
    system_prompt: systemPrompt,
  });
}

export async function resetPersonaPrompt(
  sessionId: string,
  persona: string
): Promise<void> {
  await api.delete(`/sessions/${sessionId}/persona-prompts/${persona}`);
}

// Defender templates
export interface DefenderTemplate {
  id: string;
  name: string;
  prompt: string;
}

export async function getDefenderTemplates(): Promise<DefenderTemplate[]> {
  const response = await api.get<{ templates: DefenderTemplate[] }>('/defense/templates');
  return response.data.templates;
}

// Experiments
export async function createExperiment(data: ExperimentCreate): Promise<Experiment> {
  const response = await api.post<Experiment>('/experiments', data);
  return response.data;
}

export async function listExperiments(): Promise<Experiment[]> {
  const response = await api.get<Experiment[]>('/experiments');
  return response.data;
}

export async function getExperiment(experimentId: string): Promise<Experiment> {
  const response = await api.get<Experiment>(`/experiments/${experimentId}`);
  return response.data;
}

export async function startExperiment(experimentId: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>(`/experiments/${experimentId}/run`);
  return response.data;
}

export async function getExperimentStatus(experimentId: string): Promise<ExperimentStatus> {
  const response = await api.get<ExperimentStatus>(`/experiments/${experimentId}/status`);
  return response.data;
}

export async function getExperimentResults(experimentId: string): Promise<ExperimentResults> {
  const response = await api.get<ExperimentResults>(`/experiments/${experimentId}/results`);
  return response.data;
}

export async function getExperimentTrials(experimentId: string): Promise<ExperimentTrial[]> {
  const response = await api.get<ExperimentTrial[]>(`/experiments/${experimentId}/trials`);
  return response.data;
}

export async function deleteExperiment(experimentId: string): Promise<void> {
  await api.delete(`/experiments/${experimentId}`);
}

export function getExperimentExportUrl(experimentId: string): string {
  return `/api/experiments/${experimentId}/export?format=csv`;
}

// Experiment options
export async function getRedPersonaOptions(): Promise<PersonaOption[]> {
  const response = await api.get<PersonaOption[]>('/experiment-options/red-personas');
  return response.data;
}

export async function getBluePersonaOptions(): Promise<PersonaOption[]> {
  const response = await api.get<PersonaOption[]>('/experiment-options/blue-personas');
  return response.data;
}
