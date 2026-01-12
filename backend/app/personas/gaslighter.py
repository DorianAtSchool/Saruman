from app.personas.base import BasePersona
from app.prompts import GASLIGHTER_PROMPT


class GaslighterPersona(BasePersona):
    """Attempts to confuse the model and negate previous rules."""

    name = "gaslighter"
    description = "Confuses and contradicts the AI's rules"

    @property
    def system_prompt(self) -> str:
        return GASLIGHTER_PROMPT
