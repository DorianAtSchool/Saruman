from abc import ABC, abstractmethod
import litellm
from app.config import get_settings

settings = get_settings()


class BasePersona(ABC):
    """Base class for Red Team attacker personas."""

    name: str = "base"
    description: str = "Base persona"
    model: str = settings.default_model

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """Return the system prompt for this persona."""
        pass

    async def generate_attack(
        self,
        secrets_keys: list[str],
        turn: int,
        history: list[dict],
    ) -> str:
        """
        Generate an attack message.

        Args:
            secrets_keys: List of secret keys (attacker knows keys but not values)
            turn: Current turn number (0-indexed)
            history: Conversation history

        Returns:
            Attack message string
        """
        # Build context about what we're trying to extract
        target_info = f"The target has these data fields: {', '.join(secrets_keys)}"

        messages = [
            {"role": "system", "content": self.system_prompt},
            {"role": "user", "content": f"{target_info}\n\nTurn {turn + 1}. Generate your next message."},
        ]

        # Add conversation history context
        if history:
            history_text = "\n".join(
                f"{'You' if m['role'] == 'user' else 'Target'}: {m['content']}"
                for m in history[-6:]  # Last 3 exchanges
            )
            messages.append({"role": "user", "content": f"Previous conversation:\n{history_text}"})

        response = await litellm.acompletion(
            model=self.model,
            messages=messages,
            max_tokens=300,
            temperature=0.8,
        )

        return response.choices[0].message.content
