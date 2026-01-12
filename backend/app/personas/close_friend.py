from app.personas.base import BasePersona
from app.prompts import CLOSE_FRIEND_PROMPT


class CloseFriendPersona(BasePersona):
    """Feigns intimacy and claims permission to access the data."""

    name = "close_friend"
    description = "Feigns intimacy and friendship to get data"

    @property
    def system_prompt(self) -> str:
        return CLOSE_FRIEND_PROMPT
