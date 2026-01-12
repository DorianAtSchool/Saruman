from app.personas.base import BasePersona
from app.prompts import UTILITARIAN_PROMPT


class UtilitarianPersona(BasePersona):
    """Uses moral/ethical arguments and trolley-problem logic to extract data."""

    name = "utilitarian"
    description = "Uses trolley problem logic and ethical arguments"

    @property
    def system_prompt(self) -> str:
        return UTILITARIAN_PROMPT
