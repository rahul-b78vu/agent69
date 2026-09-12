"""
Central configuration for Agent 69.

Nothing sensitive is hard-coded here. All secrets / environment-specific
values come from environment variables (see .env.example at repo root).
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- App ---
    APP_NAME: str = "Agent 69 - Early Warning Agent"
    ENV: str = "development"
    DEBUG: bool = True

    # --- Database ---
    # Defaults to a local SQLite file so the prototype runs with zero setup.
    # In production point this at PostgreSQL, e.g.:
    # postgresql+psycopg2://user:password@localhost:5432/agent69
    DATABASE_URL: str = "sqlite:///./agent69.db"

    # --- Auth / JWT ---
    # MUST be overridden via env var in any non-local deployment.
    SECRET_KEY: str = "dev-only-insecure-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 8  # 8 hours

    # --- Baseline engine defaults (overridable per-signal in threshold_configs table) ---
    BASELINE_MIN_DATA_POINTS: int = 4          # minimum weeks of history required for a confident baseline
    BASELINE_ROLLING_WINDOW: int = 4           # rolling window size (weeks) for rolling mean/std
    BASELINE_METHOD: str = "rolling_mean"      # one of: mean, median, rolling_mean

    # --- Deviation detection defaults ---
    ATTENDANCE_SUSTAINED_WEEKS: int = 3        # consecutive weeks of decline required for "sustained" signal
    ATTENDANCE_DEVIATION_PCT_LOW: float = 5.0
    ATTENDANCE_DEVIATION_PCT_MEDIUM: float = 10.0
    ATTENDANCE_DEVIATION_PCT_HIGH: float = 15.0

    MARKS_DEVIATION_PCT_LOW: float = 5.0
    MARKS_DEVIATION_PCT_MEDIUM: float = 10.0
    MARKS_DEVIATION_PCT_HIGH: float = 15.0

    ASSIGNMENT_DEVIATION_PCT_LOW: float = 10.0
    ASSIGNMENT_DEVIATION_PCT_MEDIUM: float = 20.0
    ASSIGNMENT_DEVIATION_PCT_HIGH: float = 30.0

    # --- Signal weights (multi-signal correlation engine) ---
    WEIGHT_ATTENDANCE_DECLINE: int = 2
    WEIGHT_MARKS_DECLINE: int = 2
    WEIGHT_ASSIGNMENT_DECLINE: int = 2
    WEIGHT_ENGAGEMENT_DECLINE: int = 1
    WEIGHT_BACKLOG_INCREASE: int = 2
    WEIGHT_FEE_ISSUE: int = 2
    WEIGHT_BEHAVIOUR_CHANGE: int = 1
    WEIGHT_LIBRARY_DECLINE: int = 1

    # --- Severity bands (sum of weighted signal scores) ---
    SEVERITY_LOW_MAX: int = 2
    SEVERITY_MEDIUM_MAX: int = 5
    # anything above SEVERITY_MEDIUM_MAX => HIGH

    # --- Response windows (hours) ---
    RESPONSE_WINDOW_HIGH_HOURS: int = 24
    RESPONSE_WINDOW_MEDIUM_HOURS: int = 72
    RESPONSE_WINDOW_LOW_HOURS: int = 168

    # --- Data retention (days). 0 = keep indefinitely (not recommended). ---
    DATA_RETENTION_DAYS: int = 730


@lru_cache
def get_settings() -> Settings:
    return Settings()
