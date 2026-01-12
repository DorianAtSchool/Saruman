export interface Session {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'completed' | 'failed';
  security_score: number | null;
  usability_score: number | null;
  created_at: string;
  selected_personas: string[];
  max_turns: number | null;
}

export interface Secret {
  id: string;
  key: string;
  value: string;
  data_type: string;
  is_leaked: boolean;
}

export interface RegexRule {
  pattern: string;
  action: 'block' | 'redact';
  message: string;
}

export interface DefenseConfig {
  id: string;
  system_prompt: string;
  model_name: string;
  attacker_model: string | null;
  regex_input_rules: RegexRule[];
  regex_output_rules: RegexRule[];
  judge_enabled: boolean;
  judge_prompt: string | null;
  judge_model: string | null;
}

export interface Message {
  id: string;
  role: 'red_team' | 'blue_team';
  content: string;
  blocked: boolean;
  block_reason: string | null;
  leaked_secrets: string[];
  turn_number: number;
}

export interface ExtractionResult {
  key: string;
  extracted_value: string;
  value_correct: boolean;
  key_correct: boolean;
  attacker_point: boolean;
  defender_leak: boolean;
}

export interface Conversation {
  id: string;
  persona: string;
  outcome: 'pending' | 'win' | 'loss' | 'draw' | 'error' | 'completed';
  secrets_leaked: string[];
  extraction_results: ExtractionResult[];
  messages: Message[];
}

export interface SimulationResults {
  session: Session;
  secrets: Secret[];
  conversations: Conversation[];
}

export interface CreateSessionRequest {
  name: string;
}

export interface GenerateSecretsRequest {
  count: number;
  types: string[];
}

export interface DefenseConfigUpdate {
  system_prompt?: string;
  model_name?: string;
  attacker_model?: string | null;
  regex_input_rules?: RegexRule[];
  regex_output_rules?: RegexRule[];
  judge_enabled?: boolean;
  judge_prompt?: string | null;
  judge_model?: string | null;
}

export interface RunSimulationRequest {
  personas?: string[];
  max_turns?: number;
}

export const PERSONAS = [
  { id: 'direct', name: 'Direct', description: 'Simply asks what information is available and requests it' },
  { id: 'utilitarian', name: 'Utilitarian', description: 'Appeals to greater good to justify data access' },
  { id: 'close_friend', name: 'Close Friend', description: 'Pretends to be a trusted confidant' },
  { id: 'admin', name: 'Admin', description: 'Claims system admin privileges' },
  { id: 'context_poisoner', name: 'Context Poisoner', description: 'Injects false context to confuse defenses' },
  { id: 'gaslighter', name: 'Gaslighter', description: 'Questions reality and previous statements' },
  { id: 'aggressor', name: 'Aggressor', description: 'Uses threats and intimidation' },
  { id: 'benign_user', name: 'Benign User', description: 'Asks normal questions (usability test)' },
] as const;

export const SECRET_TYPES = [
  'ssn',
  'phone',
  'email',
  'address',
  'dob',
  'credit_card',
  'age',
  'salary',
  'medical',
] as const;

// Experiment types
export interface ExperimentConfig {
  trials_per_combination: number;
  turns_per_trial: number;
  defender_model: string;
  attacker_model: string;
  secret_types: string[];
  custom_secrets: Record<string, string>;
  delay_between_trials: number;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
  config: ExperimentConfig & {
    red_personas?: string[];
    blue_personas?: string[];
  };
  total_trials: number;
  completed_trials: number;
  current_red_persona: string | null;
  current_blue_persona: string | null;
}

export interface ExperimentCreate {
  name: string;
  config?: Partial<ExperimentConfig>;
  red_personas?: string[];
  blue_personas?: string[];
}

export interface ExperimentStatus {
  status: string;
  total_trials: number;
  completed_trials: number;
  current_red_persona: string | null;
  current_blue_persona: string | null;
  progress_percent: number;
}

export interface TrialMetrics {
  secrets_leaked_count: number;
  secrets_total_count: number;
  leak_rate: number;
  turns_to_first_leak: number | null;
  total_turns: number;
  attack_success: boolean;
  full_breach: boolean;
}

export interface ExperimentTrial {
  id: string;
  red_persona: string;
  blue_persona: string;
  trial_number: number;
  created_at: string;
  metrics: TrialMetrics | null;
}

export interface MatchupStats {
  avg_leak_rate: number;
  attack_success_rate: number;
  full_breach_rate: number;
  avg_turns_to_first_leak: number | null;
  trial_count: number;
}

export interface PersonaOverallStats {
  overall_success_rate?: number;
  avg_leak_rate?: number;
  overall_defense_rate?: number;
  avg_secrets_protected?: number;
}

export interface ExperimentResults {
  red_team_performance: Record<string, Record<string, MatchupStats>>;
  blue_team_performance: Record<string, Record<string, MatchupStats>>;
  aggregated: {
    red_overall: Record<string, PersonaOverallStats>;
    blue_overall: Record<string, PersonaOverallStats>;
  };
}

export interface PersonaOption {
  id: string;
  name: string;
  description?: string;
}

export const RED_PERSONA_COLORS: Record<string, string> = {
  direct: '#FF6B6B',
  admin: '#FF8E53',
  aggressor: '#FF5252',
  close_friend: '#FFA07A',
  context_poisoner: '#FF7043',
  gaslighter: '#FF4444',
  utilitarian: '#E57373',
};

export const BLUE_PERSONA_COLORS: Record<string, string> = {
  strict_bureaucrat: '#4FC3F7',
  helpful_assistant: '#64B5F6',
  paranoid_guardian: '#42A5F5',
  confused_intern: '#29B6F6',
};
