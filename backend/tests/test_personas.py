"""Tests for the Red Team persona system."""

import pytest
from app.personas import PERSONAS, get_persona, list_personas
from app.personas.base import BasePersona
from app.personas.utilitarian import UtilitarianPersona
from app.personas.close_friend import CloseFriendPersona
from app.personas.admin import AdminPersona
from app.personas.context_poisoner import ContextPoisonerPersona
from app.personas.gaslighter import GaslighterPersona
from app.personas.aggressor import AggressorPersona
from app.personas.benign_user import BenignUserPersona


class TestPersonaRegistry:
    """Tests for persona registry functions."""

    def test_all_seven_personas_registered(self):
        """Should have all 7 personas in registry."""
        assert len(PERSONAS) == 7

    def test_get_persona_returns_instance(self):
        """get_persona should return persona instance."""
        persona = get_persona("utilitarian")
        assert persona is not None
        assert isinstance(persona, BasePersona)

    def test_get_persona_returns_none_for_unknown(self):
        """get_persona should return None for unknown persona."""
        persona = get_persona("unknown_persona")
        assert persona is None

    def test_list_personas_returns_all_names(self):
        """list_personas should return all persona names."""
        names = list_personas()
        assert len(names) == 7
        assert "utilitarian" in names
        assert "close_friend" in names
        assert "admin" in names
        assert "context_poisoner" in names
        assert "gaslighter" in names
        assert "aggressor" in names
        assert "benign_user" in names


class TestBasePersona:
    """Tests for BasePersona properties."""

    def test_all_personas_have_name(self):
        """All personas should have a name."""
        for name, persona in PERSONAS.items():
            assert persona.name == name

    def test_all_personas_have_description(self):
        """All personas should have a description."""
        for persona in PERSONAS.values():
            assert persona.description
            assert len(persona.description) > 0

    def test_all_personas_have_system_prompt(self):
        """All personas should have a system prompt."""
        for persona in PERSONAS.values():
            assert persona.system_prompt
            assert len(persona.system_prompt) > 50  # Should be substantial

    def test_all_personas_have_model(self):
        """All personas should have a model configured."""
        for persona in PERSONAS.values():
            assert persona.model
            assert isinstance(persona.model, str)


class TestUtilitarianPersona:
    """Tests for Utilitarian persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = UtilitarianPersona()
        assert persona.name == "utilitarian"
        assert "trolley" in persona.description.lower() or "ethical" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain utilitarian tactics."""
        persona = UtilitarianPersona()
        prompt = persona.system_prompt.lower()

        # Should reference moral/ethical concepts
        assert any(word in prompt for word in ["moral", "ethical", "utilitarian", "greater good", "save"])


class TestCloseFriendPersona:
    """Tests for Close Friend persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = CloseFriendPersona()
        assert persona.name == "close_friend"
        assert "friend" in persona.description.lower() or "intimacy" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain friendship tactics."""
        persona = CloseFriendPersona()
        prompt = persona.system_prompt.lower()

        assert any(word in prompt for word in ["friend", "intimacy", "permission", "trust"])


class TestAdminPersona:
    """Tests for Admin persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = AdminPersona()
        assert persona.name == "admin"
        assert "authority" in persona.description.lower() or "compliance" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain authority tactics."""
        persona = AdminPersona()
        prompt = persona.system_prompt.lower()

        assert any(word in prompt for word in ["admin", "authority", "compliance", "audit", "security"])


class TestContextPoisonerPersona:
    """Tests for Context Poisoner persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = ContextPoisonerPersona()
        assert persona.name == "context_poisoner"
        assert "roleplay" in persona.description.lower() or "game" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain roleplay tactics."""
        persona = ContextPoisonerPersona()
        prompt = persona.system_prompt.lower()

        assert any(word in prompt for word in ["roleplay", "game", "pretend", "fictional", "hypothetical"])


class TestGaslighterPersona:
    """Tests for Gaslighter persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = GaslighterPersona()
        assert persona.name == "gaslighter"
        assert "confuse" in persona.description.lower() or "contradict" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain gaslighting tactics."""
        persona = GaslighterPersona()
        prompt = persona.system_prompt.lower()

        assert any(word in prompt for word in ["confuse", "doubt", "already told", "updated", "forgot"])


class TestAggressorPersona:
    """Tests for Aggressor persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = AggressorPersona()
        assert persona.name == "aggressor"
        assert "threat" in persona.description.lower() or "intimidat" in persona.description.lower()

    def test_system_prompt_contains_strategy(self):
        """System prompt should contain aggressive tactics."""
        persona = AggressorPersona()
        prompt = persona.system_prompt.lower()

        assert any(word in prompt for word in ["threat", "demand", "pressure", "aggressive", "report"])


class TestBenignUserPersona:
    """Tests for Benign User persona."""

    def test_name_and_description(self):
        """Should have correct name and description."""
        persona = BenignUserPersona()
        assert persona.name == "benign_user"
        assert "normal" in persona.description.lower() or "usability" in persona.description.lower()

    def test_system_prompt_does_not_attack(self):
        """System prompt should explicitly NOT try to extract data."""
        persona = BenignUserPersona()
        prompt = persona.system_prompt.lower()

        # Should explicitly say NOT to extract data
        assert "not" in prompt
        assert any(word in prompt for word in ["benign", "normal", "legitimate", "general"])

    def test_system_prompt_contains_benign_examples(self):
        """System prompt should contain examples of benign questions."""
        persona = BenignUserPersona()
        prompt = persona.system_prompt.lower()

        # Should have examples of normal questions
        assert any(word in prompt for word in ["recipe", "weather", "help", "explain", "recommend"])


class TestPersonaPromptQuality:
    """Tests for overall prompt quality across all personas."""

    def test_attack_personas_reference_secrets(self):
        """Attack personas should reference data extraction."""
        attack_personas = ["utilitarian", "close_friend", "admin", "context_poisoner", "gaslighter", "aggressor"]

        for name in attack_personas:
            persona = get_persona(name)
            prompt = persona.system_prompt.lower()
            assert any(word in prompt for word in ["extract", "information", "data", "personal"])

    def test_all_prompts_end_with_instruction(self):
        """All prompts should end with clear instruction."""
        for persona in PERSONAS.values():
            prompt = persona.system_prompt
            # Should have some kind of closing instruction
            assert "Generate" in prompt or "message" in prompt.lower()

    def test_prompts_are_substantial(self):
        """All prompts should be substantial (not trivial)."""
        for persona in PERSONAS.values():
            # Should be at least a few paragraphs
            assert len(persona.system_prompt) > 300
