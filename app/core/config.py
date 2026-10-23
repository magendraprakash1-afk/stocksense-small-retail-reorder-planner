from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "StockSense Management API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    # Default to sqlite+aiosqlite for zero-config local run, or PostgreSQL via env
    DATABASE_URL: str = "sqlite+aiosqlite:///./stocksense.db"
    DATABASE_URL_SYNC: str = "sqlite:///./stocksense.db"
    DB_ECHO: bool = False

    # Security & JWT
    JWT_SECRET: str = "stocksense-super-secret-key-change-in-production-2026"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for retail kiosk ease
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost",
        "http://localhost:8080",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:5500",
        "*"
    ]

    # Inventory & Forecasting Defaults
    DEFAULT_SERVICE_LEVEL_Z: float = 1.65  # 95% service level
    DEFAULT_SAFETY_STOCK_DAYS: int = 3
    DEFAULT_SHELF_LIFE_BUFFER_RATIO: float = 0.5  # Do not order more than shelf_life * 0.5 daily demand

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
