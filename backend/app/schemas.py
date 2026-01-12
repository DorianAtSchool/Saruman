from datetime import datetime
from pydantic import BaseModel


# Session schemas
class SessionCreate(BaseModel):
    name: str = "Untitled Session"


class SessionResponse(BaseModel):
    id: str
    name: str
    status: str
    created_at: datetime
    security_score: float | None
    usability_score: float | None
    selected_personas: list[str] = []
    max_turns: int | None = None

    class Config:
        from_attributes = True


# Secret schemas
class SecretCreate(BaseModel):
    key: str
    value: str
    data_type: str = "string"


class SecretResponse(BaseModel):
    id: str
    key: str
    data_type: str
    is_leaked: bool

    class Config:
        from_attributes = True


class SecretWithValueResponse(SecretResponse):
    value: str


class GenerateSecretsRequest(BaseModel):
    count: int = 3
    types: list[str] | None = None  # e.g., ["ssn", "age", "phone"]


# Defense config schemas
class RegexRule(BaseModel):
    pattern: str
    action: str = "block"  # block, redact
    message: str = "Content blocked"


class DefenseConfigCreate(BaseModel):
    model_config = {"protected_namespaces": ()}

    system_prompt: str
    model_name: str = "gpt-4o-mini"
    attacker_model: str | None = None
    regex_input_rules: list[RegexRule] = []
    regex_output_rules: list[RegexRule] = []
    judge_enabled: bool = False
    judge_prompt: str | None = None
    judge_model: str | None = None


class DefenseConfigResponse(BaseModel):
    model_config = {"protected_namespaces": (), "from_attributes": True}

    id: str
    system_prompt: str
    model_name: str
    attacker_model: str | None
    regex_input_rules: list[dict]
    regex_output_rules: list[dict]
    judge_enabled: bool
    judge_prompt: str | None
    judge_model: str | None


# Conversation schemas
class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    blocked: bool
    block_reason: str | None
    leaked_secrets: list[str]
    turn_number: int

    class Config:
        from_attributes = True


# Extraction schemas - attacker's attempt to recall secrets
class ExtractedSecret(BaseModel):
    key: str          # What key the attacker thinks this is
    value: str        # The value they extracted
    confidence: str   # "certain", "likely", "guess"


class ExtractionAttempt(BaseModel):
    """Attacker's summary of extracted secrets after conversation."""
    extracted: list[ExtractedSecret]
    reasoning: str    # Brief explanation of how they extracted each


class ExtractionResult(BaseModel):
    """Scored extraction results."""
    key: str                    # The key attacker claimed
    extracted_value: str        # Value attacker provided
    actual_key: str | None      # Matched actual key (if value correct)
    actual_value: str | None    # The real value (if matched)
    value_correct: bool         # Did they get a real secret value?
    key_correct: bool           # Did they match key correctly?
    attacker_point: bool        # Attacker wins (key+value correct)
    defender_leak: bool         # Defender loses (value exposed)


class ConversationResponse(BaseModel):
    id: str
    persona: str
    outcome: str
    secrets_leaked: list[str]           # Keys of leaked secrets (defender perspective)
    extraction_attempts: list[dict] = []  # Raw attacker guesses
    extraction_results: list[dict] = []   # Detailed extraction scoring
    attacker_score: int = 0              # Correct key-value pairs
    defender_leaks: int = 0              # Values exposed (regardless of key)
    messages: list[MessageResponse] = []

    class Config:
        from_attributes = True


# Simulation schemas
class SimulationRequest(BaseModel):
    personas: list[str] | None = None  # None = all personas
    max_turns: int = 5


class SimulationStatusResponse(BaseModel):
    status: str
    progress: int
    total: int
    current_persona: str | None


class SecretResultResponse(BaseModel):
    id: str
    key: str
    value: str
    data_type: str
    is_leaked: bool

    class Config:
        from_attributes = True


class ResultsResponse(BaseModel):
    session: SessionResponse
    secrets: list[SecretResultResponse]
    conversations: list[ConversationResponse]


# Template schemas
class PromptTemplate(BaseModel):
    id: str
    name: str
    prompt: str


class TemplateListResponse(BaseModel):
    templates: list[PromptTemplate]


# Attacker persona schemas
class PersonaInfo(BaseModel):
    id: str
    name: str
    description: str
    default_prompt: str


class CustomAttackerPromptCreate(BaseModel):
    persona: str
    system_prompt: str


class CustomAttackerPromptResponse(BaseModel):
    id: str
    session_id: str
    persona: str
    system_prompt: str

    class Config:
        from_attributes = True


class PersonaPromptsResponse(BaseModel):
    personas: list[PersonaInfo]
    custom_prompts: dict[str, str]  # persona -> custom_prompt


# ============ Experiment Schemas ============

class ExperimentConfig(BaseModel):
    """Configuration for an experiment run."""
    trials_per_combination: int = 3
    turns_per_trial: int = 5
    defender_model: str = "groq/llama-3.1-8b-instant"
    attacker_model: str = "groq/llama-3.1-8b-instant"
    secret_types: list[str] = ["ssn", "phone", "email"]
    custom_secrets: dict[str, str] = {}
    delay_between_trials: float = 2.0


class ExperimentCreate(BaseModel):
    """Request to create a new experiment."""
    name: str
    config: ExperimentConfig = ExperimentConfig()
    red_personas: list[str] | None = None  # None = all
    blue_personas: list[str] | None = None  # None = all templates


class ExperimentResponse(BaseModel):
    """Basic experiment info."""
    id: str
    name: str
    status: str
    created_at: datetime
    config: dict
    total_trials: int
    completed_trials: int
    current_red_persona: str | None
    current_blue_persona: str | None

    class Config:
        from_attributes = True


class TrialMetricsResponse(BaseModel):
    """Metrics from a single trial."""
    secrets_leaked_count: int
    secrets_total_count: int
    leak_rate: float
    turns_to_first_leak: int | None
    total_turns: int
    attack_success: bool
    full_breach: bool

    class Config:
        from_attributes = True


class ExperimentTrialResponse(BaseModel):
    """A single trial in an experiment."""
    id: str
    red_persona: str
    blue_persona: str
    trial_number: int
    created_at: datetime
    metrics: TrialMetricsResponse | None = None

    class Config:
        from_attributes = True


class MatchupStats(BaseModel):
    """Statistics for a specific red vs blue matchup."""
    avg_leak_rate: float
    attack_success_rate: float
    full_breach_rate: float
    avg_turns_to_first_leak: float | None
    trial_count: int


class PersonaOverallStats(BaseModel):
    """Overall stats for a persona across all matchups."""
    overall_success_rate: float
    avg_leak_rate: float


class ExperimentResultsResponse(BaseModel):
    """Full experiment results for visualization."""
    red_team_performance: dict[str, dict[str, MatchupStats]]  # red -> blue -> stats
    blue_team_performance: dict[str, dict[str, MatchupStats]]  # blue -> red -> stats
    aggregated: dict[str, dict[str, PersonaOverallStats]]  # "red_overall"/"blue_overall" -> persona -> stats


class ExperimentStatusResponse(BaseModel):
    """Current experiment status with progress."""
    status: str
    total_trials: int
    completed_trials: int
    current_red_persona: str | None
    current_blue_persona: str | None
    progress_percent: float
