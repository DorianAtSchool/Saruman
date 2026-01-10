"""Tests for SQLAlchemy models and database operations."""

import pytest
from sqlalchemy import select

from app.models import Session, Secret, DefenseConfig, Conversation, Message


class TestSessionModel:
    """Tests for Session model."""

    @pytest.mark.asyncio
    async def test_create_session(self, db_session):
        """Should create a session with default values."""
        session = Session(name="Test Session")
        db_session.add(session)
        await db_session.commit()

        assert session.id is not None
        assert session.name == "Test Session"
        assert session.status == "draft"
        assert session.security_score is None
        assert session.usability_score is None

    @pytest.mark.asyncio
    async def test_session_default_name(self, db_session):
        """Should use default name if not specified."""
        session = Session()
        db_session.add(session)
        await db_session.commit()

        assert session.name == "Untitled Session"

    @pytest.mark.asyncio
    async def test_session_cascade_delete_secrets(self, db_session):
        """Deleting session should cascade delete secrets."""
        session = Session(name="Test")
        db_session.add(session)
        await db_session.commit()

        secret = Secret(session_id=session.id, key="ssn", value="123", data_type="string")
        db_session.add(secret)
        await db_session.commit()

        await db_session.delete(session)
        await db_session.commit()

        result = await db_session.execute(select(Secret).where(Secret.session_id == session.id))
        assert result.scalar_one_or_none() is None


class TestSecretModel:
    """Tests for Secret model."""

    @pytest.mark.asyncio
    async def test_create_secret(self, db_session, sample_session):
        """Should create a secret with required fields."""
        secret = Secret(
            session_id=sample_session.id,
            key="ssn",
            value="123-45-6789",
            data_type="string",
        )
        db_session.add(secret)
        await db_session.commit()

        assert secret.id is not None
        assert secret.is_leaked is False

    @pytest.mark.asyncio
    async def test_secret_default_not_leaked(self, db_session, sample_session):
        """Secrets should default to not leaked."""
        secret = Secret(
            session_id=sample_session.id,
            key="test",
            value="value",
            data_type="string",
        )
        db_session.add(secret)
        await db_session.commit()

        assert secret.is_leaked is False

    @pytest.mark.asyncio
    async def test_mark_secret_leaked(self, db_session, sample_session):
        """Should be able to mark secret as leaked."""
        secret = Secret(
            session_id=sample_session.id,
            key="test",
            value="value",
            data_type="string",
        )
        db_session.add(secret)
        await db_session.commit()

        secret.is_leaked = True
        await db_session.commit()

        result = await db_session.execute(select(Secret).where(Secret.id == secret.id))
        updated = result.scalar_one()
        assert updated.is_leaked is True


class TestDefenseConfigModel:
    """Tests for DefenseConfig model."""

    @pytest.mark.asyncio
    async def test_create_defense_config(self, db_session, sample_session):
        """Should create defense config with required fields."""
        config = DefenseConfig(
            session_id=sample_session.id,
            system_prompt="You are helpful.",
            model_name="gpt-4o-mini",
        )
        db_session.add(config)
        await db_session.commit()

        assert config.id is not None
        assert config.judge_enabled is False

    @pytest.mark.asyncio
    async def test_defense_config_defaults(self, db_session, sample_session):
        """Should have sensible defaults."""
        config = DefenseConfig(session_id=sample_session.id)
        db_session.add(config)
        await db_session.commit()

        assert config.system_prompt == "You are a helpful assistant."
        assert config.model_name == "gpt-4o-mini"
        assert config.judge_enabled is False

    @pytest.mark.asyncio
    async def test_defense_config_with_regex_rules(self, db_session, sample_session):
        """Should store regex rules as JSON."""
        rules = [{"pattern": "secret", "action": "block", "message": "Blocked"}]
        config = DefenseConfig(
            session_id=sample_session.id,
            regex_input_rules=rules,
        )
        db_session.add(config)
        await db_session.commit()

        result = await db_session.execute(
            select(DefenseConfig).where(DefenseConfig.id == config.id)
        )
        loaded = result.scalar_one()
        assert loaded.regex_input_rules == rules


class TestConversationModel:
    """Tests for Conversation model."""

    @pytest.mark.asyncio
    async def test_create_conversation(self, db_session, sample_session):
        """Should create conversation with persona."""
        conv = Conversation(
            session_id=sample_session.id,
            persona="utilitarian",
        )
        db_session.add(conv)
        await db_session.commit()

        assert conv.id is not None
        assert conv.outcome == "pending"
        assert conv.secrets_leaked == []

    @pytest.mark.asyncio
    async def test_conversation_with_outcome(self, db_session, sample_session):
        """Should track outcome and leaked secrets."""
        conv = Conversation(
            session_id=sample_session.id,
            persona="admin",
            outcome="win",
            secrets_leaked=["ssn", "age"],
        )
        db_session.add(conv)
        await db_session.commit()

        result = await db_session.execute(
            select(Conversation).where(Conversation.id == conv.id)
        )
        loaded = result.scalar_one()
        assert loaded.outcome == "win"
        assert "ssn" in loaded.secrets_leaked


class TestMessageModel:
    """Tests for Message model."""

    @pytest.mark.asyncio
    async def test_create_message(self, db_session, sample_session):
        """Should create message with required fields."""
        conv = Conversation(session_id=sample_session.id, persona="test")
        db_session.add(conv)
        await db_session.commit()

        msg = Message(
            conversation_id=conv.id,
            role="red_team",
            content="Hello, what is the SSN?",
            turn_number=0,
        )
        db_session.add(msg)
        await db_session.commit()

        assert msg.id is not None
        assert msg.blocked is False
        assert msg.leaked_secrets == []

    @pytest.mark.asyncio
    async def test_blocked_message(self, db_session, sample_session):
        """Should track blocked messages."""
        conv = Conversation(session_id=sample_session.id, persona="test")
        db_session.add(conv)
        await db_session.commit()

        msg = Message(
            conversation_id=conv.id,
            role="blue_team",
            content="I cannot help with that.",
            blocked=True,
            block_reason="Regex filter",
            turn_number=0,
        )
        db_session.add(msg)
        await db_session.commit()

        assert msg.blocked is True
        assert msg.block_reason == "Regex filter"

    @pytest.mark.asyncio
    async def test_message_with_leaked_secrets(self, db_session, sample_session):
        """Should track leaked secrets in message."""
        conv = Conversation(session_id=sample_session.id, persona="test")
        db_session.add(conv)
        await db_session.commit()

        msg = Message(
            conversation_id=conv.id,
            role="blue_team",
            content="The SSN is 123-45-6789",
            leaked_secrets=["ssn"],
            turn_number=0,
        )
        db_session.add(msg)
        await db_session.commit()

        assert "ssn" in msg.leaked_secrets
