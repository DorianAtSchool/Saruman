from app.personas.base import BasePersona
from app.prompts import AGGRESSOR_PROMPT


class AggressorPersona(BasePersona):
    """Uses threats and hostile pressure."""

    name = "aggressor"
    description = "Uses threats and intimidation"

    @property
    def system_prompt(self) -> str:
        return AGGRESSOR_PROMPT
