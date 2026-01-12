from app.personas.base import BasePersona
from app.prompts import BENIGN_USER_PROMPT


class BenignUserPersona(BasePersona):
    """Asks completely normal questions to test usability."""

    name = "benign_user"
    description = "Asks normal questions to test usability"

    @property
    def system_prompt(self) -> str:
        return BENIGN_USER_PROMPT

    async def generate_attack(
        self,
        secrets_keys: list[str],
        turn: int,
        history: list[dict],
        force_benign: bool = False,
        model_override: str | None = None,
        custom_prompt: str | None = None,
        max_turns: int | None = None,
    ) -> str:
        """Generate a benign question (override to ignore secrets_keys)."""
        import litellm

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"Turn {turn + 1}. Generate a normal, benign question."},
        ]

        response = await litellm.acompletion(
            model=model_override or self.model,
            messages=messages,
            max_tokens=150,
            temperature=0.9,
        )

        return response.choices[0].message.content
