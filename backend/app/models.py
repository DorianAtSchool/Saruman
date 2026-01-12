import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.prompts import DEFAULT_DEFENSE_PROMPT


def generate_uuid() -> str:
    return str(uuid.uuid4())


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100), default="Untitled Session")
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft, running, completed
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    security_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    usability_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Simulation configuration (stored when simulation is run)
    selected_personas: Mapped[list] = mapped_column(JSON, default=list)
    max_turns: Mapped[int | None] = mapped_column(nullable=True)

    secrets: Mapped[list["Secret"]] = relationship(back_populates="session", cascade="all, delete-orphan")
    defense_config: Mapped["DefenseConfig | None"] = relationship(back_populates="session", cascade="all, delete-orphan", uselist=False)
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="session", cascade="all, delete-orphan")


class Secret(Base):
    __tablename__ = "secrets"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    key: Mapped[str] = mapped_column(String(50))  # "ssn", "age", etc.
    value: Mapped[str] = mapped_column(String(500))  # actual secret value
    data_type: Mapped[str] = mapped_column(String(50))  # "string", "number", etc.
    is_leaked: Mapped[bool] = mapped_column(Boolean, default=False)

    session: Mapped["Session"] = relationship(back_populates="secrets")


class DefenseConfig(Base):
    __tablename__ = "defense_configs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    system_prompt: Mapped[str] = mapped_column(Text, default=DEFAULT_DEFENSE_PROMPT)
    model_name: Mapped[str] = mapped_column(String(100), default="gpt-4o-mini")
    attacker_model: Mapped[str | None] = mapped_column(String(100), nullable=True)  # If None, uses model_name
    regex_input_rules: Mapped[dict] = mapped_column(JSON, default=list)  # rules for input filtering
    regex_output_rules: Mapped[dict] = mapped_column(JSON, default=list)  # rules for output filtering
    judge_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    judge_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    judge_model: Mapped[str | None] = mapped_column(String(50), nullable=True)

    session: Mapped["Session"] = relationship(back_populates="defense_config")


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    persona: Mapped[str] = mapped_column(String(50))  # attacker persona name
    outcome: Mapped[str] = mapped_column(String(20), default="pending")  # pending, win, loss, draw
    secrets_leaked: Mapped[list] = mapped_column(JSON, default=list)  # list of leaked secret keys (defender perspective)

    # Extraction phase results
    extraction_attempts: Mapped[list] = mapped_column(JSON, default=list)  # Raw attacker guesses
    extraction_results: Mapped[list] = mapped_column(JSON, default=list)   # Scored results
    attacker_score: Mapped[int] = mapped_column(default=0)   # Correct key-value pairs
    defender_leaks: Mapped[int] = mapped_column(default=0)   # Values exposed (regardless of key)

    session: Mapped["Session"] = relationship(back_populates="conversations")
    messages: Mapped[list["Message"]] = relationship(back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    conversation_id: Mapped[str] = mapped_column(ForeignKey("conversations.id", ondelete="CASCADE"))
    role: Mapped[str] = mapped_column(String(20))  # red_team, blue_team
    content: Mapped[str] = mapped_column(Text)
    blocked: Mapped[bool] = mapped_column(Boolean, default=False)
    block_reason: Mapped[str | None] = mapped_column(String(100), nullable=True)
    leaked_secrets: Mapped[list] = mapped_column(JSON, default=list)
    turn_number: Mapped[int] = mapped_column(default=0)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")


class CustomAttackerPrompt(Base):
    """Custom attacker prompts per session, overriding default persona prompts."""
    __tablename__ = "custom_attacker_prompts"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"))
    persona: Mapped[str] = mapped_column(String(50))  # attacker persona name
    system_prompt: Mapped[str] = mapped_column(Text)  # custom prompt for this persona


# ============ Experiment Models ============

class ExperimentRun(Base):
    """An experiment run that tests all red vs blue persona combinations."""
    __tablename__ = "experiment_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending, running, completed, failed, cancelled
    config: Mapped[dict] = mapped_column(JSON, default=dict)  # model settings, turn counts, etc.

    # Progress tracking
    total_trials: Mapped[int] = mapped_column(default=0)
    completed_trials: Mapped[int] = mapped_column(default=0)
    current_red_persona: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_blue_persona: Mapped[str | None] = mapped_column(String(50), nullable=True)

    trials: Mapped[list["ExperimentTrial"]] = relationship(back_populates="experiment", cascade="all, delete-orphan")


class ExperimentTrial(Base):
    """A single trial within an experiment: one red persona vs one blue persona."""
    __tablename__ = "experiment_trials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    experiment_id: Mapped[str] = mapped_column(ForeignKey("experiment_runs.id", ondelete="CASCADE"))
    red_persona: Mapped[str] = mapped_column(String(50))  # attacker personality name
    blue_persona: Mapped[str] = mapped_column(String(50))  # defender template name
    session_id: Mapped[str | None] = mapped_column(ForeignKey("sessions.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    trial_number: Mapped[int] = mapped_column(default=1)  # For multiple trials per combination

    experiment: Mapped["ExperimentRun"] = relationship(back_populates="trials")
    session: Mapped["Session | None"] = relationship()
    metrics: Mapped["TrialMetrics | None"] = relationship(back_populates="trial", cascade="all, delete-orphan", uselist=False)


class TrialMetrics(Base):
    """Metrics collected from a single trial."""
    __tablename__ = "trial_metrics"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    trial_id: Mapped[str] = mapped_column(ForeignKey("experiment_trials.id", ondelete="CASCADE"), unique=True)

    secrets_leaked_count: Mapped[int] = mapped_column(default=0)
    secrets_total_count: Mapped[int] = mapped_column(default=0)
    leak_rate: Mapped[float] = mapped_column(Float, default=0.0)  # 0.0 - 1.0
    turns_to_first_leak: Mapped[int | None] = mapped_column(nullable=True)  # null if no leak
    total_turns: Mapped[int] = mapped_column(default=0)
    attack_success: Mapped[bool] = mapped_column(Boolean, default=False)  # any secret leaked
    full_breach: Mapped[bool] = mapped_column(Boolean, default=False)  # all secrets leaked

    trial: Mapped["ExperimentTrial"] = relationship(back_populates="metrics")
