from app.personas.base import BasePersona
from app.personas.utilitarian import UtilitarianPersona
from app.personas.close_friend import CloseFriendPersona
from app.personas.admin import AdminPersona
from app.personas.context_poisoner import ContextPoisonerPersona
from app.personas.gaslighter import GaslighterPersona
from app.personas.aggressor import AggressorPersona
from app.personas.benign_user import BenignUserPersona


PERSONAS: dict[str, BasePersona] = {
    "utilitarian": UtilitarianPersona(),
    "close_friend": CloseFriendPersona(),
    "admin": AdminPersona(),
    "context_poisoner": ContextPoisonerPersona(),
    "gaslighter": GaslighterPersona(),
    "aggressor": AggressorPersona(),
    "benign_user": BenignUserPersona(),
}


def get_persona(name: str) -> BasePersona | None:
    return PERSONAS.get(name)


def list_personas() -> list[str]:
    return list(PERSONAS.keys())
