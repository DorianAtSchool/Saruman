from app.personas.base import BasePersona
from app.prompts import ADMIN_PROMPT


class AdminPersona(BasePersona):
    """Claims authority and demands compliance."""

    name = "admin"
    description = "Feigns authority and demands compliance"

    @property
    def system_prompt(self) -> str:
        return ADMIN_PROMPT
