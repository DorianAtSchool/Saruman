from app.personas.base import BasePersona
from app.prompts import CONTEXT_POISONER_PROMPT


class ContextPoisonerPersona(BasePersona):
    """Uses roleplay, games, and fictional framing to bypass filters."""

    name = "context_poisoner"
    description = "Uses roleplay and games to bypass filters"

    @property
    def system_prompt(self) -> str:
        return CONTEXT_POISONER_PROMPT
