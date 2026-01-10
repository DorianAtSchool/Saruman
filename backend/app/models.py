import uuid
from datetime import datetime
from sqlalchemy import String, Text, Boolean, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


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
    system_prompt: Mapped[str] = mapped_column(Text, default="You are a helpful assistant.")
    model_name: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")
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
