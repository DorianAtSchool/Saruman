from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/saruman.db"
    default_model: str = "gemini/gemini-2.0-flash-lite"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    openai_api_key: str = ""
    hf_token: str = ""
    groq_api_key: str = ""

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
