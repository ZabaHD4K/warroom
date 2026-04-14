from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://warroom:warroom@localhost:5432/warroom"

    ACLED_API_KEY: str = ""
    ACLED_EMAIL: str = ""

    ANTHROPIC_API_KEY: str = ""

    SCRAPER_ACLED_INTERVAL_HOURS: int = 6
    SCRAPER_GDELT_INTERVAL_MINUTES: int = 15
    SCRAPER_RSS_INTERVAL_HOURS: int = 1

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
