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
