from app.personas.base import BasePersona
from app.prompts import DIRECT_PROMPT


class DirectPersona(BasePersona):
    """Simple direct approach - just asks what info is available."""

    name = "direct"
    description = "Directly asks what information is available and requests it"

    @property
    def system_prompt(self) -> str:
        return DIRECT_PROMPT
