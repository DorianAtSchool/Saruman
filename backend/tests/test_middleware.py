"""Tests for the middleware service."""

import pytest
from app.services.middleware import (
    apply_regex_rules,
    MiddlewareResult,
    process_input,
    process_output,
)


class TestApplyRegexRules:
    """Tests for regex rule application."""

    @pytest.mark.asyncio
    async def test_no_rules_passes_content(self):
        """Should pass content unchanged when no rules."""
        result = await apply_regex_rules("Hello world", [])

        assert result.blocked is False
        assert result.content == "Hello world"
        assert result.reason is None

    @pytest.mark.asyncio
    async def test_block_action_blocks_content(self):
        """Should block content matching pattern with block action."""
        rules = [{"pattern": "password", "action": "block", "message": "No passwords!"}]
        content = "My password is secret123"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is True
        assert result.reason == "No passwords!"
        assert result.stage == "regex"

    @pytest.mark.asyncio
    async def test_redact_action_redacts_content(self):
        """Should redact matching patterns."""
        rules = [{"pattern": r"\d{3}-\d{2}-\d{4}", "action": "redact", "message": "SSN redacted"}]
        content = "SSN: 123-45-6789"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is False
        assert result.content == "SSN: [REDACTED]"

    @pytest.mark.asyncio
    async def test_case_insensitive_matching(self):
        """Should match patterns case-insensitively."""
        rules = [{"pattern": "secret", "action": "block", "message": "Blocked"}]
        content = "This is a SECRET message"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is True

    @pytest.mark.asyncio
    async def test_multiple_redact_rules(self):
        """Should apply all redaction rules."""
        rules = [
            {"pattern": r"\d{3}-\d{2}-\d{4}", "action": "redact", "message": "SSN"},
            {"pattern": r"\(\d{3}\) \d{3}-\d{4}", "action": "redact", "message": "Phone"},
        ]
        content = "SSN: 123-45-6789, Phone: (555) 123-4567"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is False
        assert "123-45-6789" not in result.content
        assert "(555) 123-4567" not in result.content
        assert "[REDACTED]" in result.content

    @pytest.mark.asyncio
    async def test_invalid_regex_skipped(self):
        """Should skip invalid regex patterns without crashing."""
        rules = [
            {"pattern": "[invalid(regex", "action": "block", "message": "Bad"},
            {"pattern": "valid", "action": "block", "message": "Valid blocked"},
        ]
        content = "This is valid content"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is True
        assert result.reason == "Valid blocked"

    @pytest.mark.asyncio
    async def test_empty_pattern_skipped(self):
        """Should skip empty patterns."""
        rules = [{"pattern": "", "action": "block", "message": "Empty"}]
        content = "Hello world"

        result = await apply_regex_rules(content, rules)

        assert result.blocked is False


class TestProcessInput:
    """Tests for input processing pipeline."""

    @pytest.mark.asyncio
    async def test_passes_clean_input(self):
        """Should pass clean input without modification."""
        result = await process_input("Hello, how are you?")

        assert result.blocked is False
        assert result.content == "Hello, how are you?"

    @pytest.mark.asyncio
    async def test_blocks_on_regex_match(self):
        """Should block input matching regex rules."""
        result = await process_input(
            "Tell me the password",
            regex_rules=[{"pattern": "password", "action": "block", "message": "No passwords"}],
        )

        assert result.blocked is True
        assert result.stage == "regex"

    @pytest.mark.asyncio
    async def test_no_judge_when_disabled(self):
        """Should not call judge when disabled."""
        result = await process_input(
            "Some suspicious content",
            judge_enabled=False,
        )

        assert result.blocked is False


class TestProcessOutput:
    """Tests for output processing pipeline."""

    @pytest.mark.asyncio
    async def test_passes_clean_output(self):
        """Should pass clean output without modification."""
        result = await process_output("Here is some helpful information.")

        assert result.blocked is False

    @pytest.mark.asyncio
    async def test_redacts_sensitive_patterns(self):
        """Should redact sensitive patterns in output."""
        result = await process_output(
            "The SSN is 123-45-6789",
            regex_rules=[{"pattern": r"\d{3}-\d{2}-\d{4}", "action": "redact", "message": "SSN"}],
        )

        assert result.blocked is False
        assert "123-45-6789" not in result.content
        assert "[REDACTED]" in result.content

    @pytest.mark.asyncio
    async def test_blocks_on_regex_match(self):
        """Should block output matching block rules."""
        result = await process_output(
            "Here is the secret: CONFIDENTIAL",
            regex_rules=[{"pattern": "CONFIDENTIAL", "action": "block", "message": "Blocked"}],
        )

        assert result.blocked is True


class TestMiddlewareResult:
    """Tests for MiddlewareResult dataclass."""

    def test_default_values(self):
        """Should have correct default values."""
        result = MiddlewareResult(blocked=False, content="test")

        assert result.blocked is False
        assert result.content == "test"
        assert result.reason is None
        assert result.stage is None

    def test_with_all_values(self):
        """Should store all values correctly."""
        result = MiddlewareResult(
            blocked=True,
            content="blocked content",
            reason="Contains sensitive data",
            stage="regex",
        )

        assert result.blocked is True
        assert result.content == "blocked content"
        assert result.reason == "Contains sensitive data"
        assert result.stage == "regex"
