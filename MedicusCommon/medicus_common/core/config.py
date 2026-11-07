# =============================================================================
# src/core/config.py
"""Production-grade configuration for MedicusCommon."""


from functools import lru_cache

from medicus_common.core.logging_config import logger

from typing import Annotated, Literal, Optional
from pydantic import field_validator, Field, ConfigDict, model_validator
from pydantic_settings import BaseSettings, NoDecode


class Settings(BaseSettings):
    """Production-grade application settings with comprehensive validation."""
    model_config = ConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Allow service-specific env vars
        validate_assignment=True,  # Validate on assignment
    )

    # Database settings
    postgres_user: str = Field(..., description="PostgreSQL username")
    postgres_password: str = Field(..., description="PostgreSQL password", min_length=8)
    postgres_host: str = Field(..., description="PostgreSQL host")
    postgres_port: int = Field(default=5432, ge=1, le=65535, description="PostgreSQL port")
    postgres_db: str = Field(default="medicus", description="PostgreSQL database name")
    postgres_ssl_mode: Literal["disable", "allow", "prefer", "require", "verify-ca", "verify-full"] = Field(
        default="prefer", description="libpq sslmode; use verify-full for managed databases"
    )

    # JWT settings
    jwt_secret_key: str = Field(..., min_length=32, description="JWT signing secret")
    jwt_algorithm: Literal["HS256", "HS384", "HS512", "RS256", "RS384", "RS512"] = Field(
        default="HS256", description="JWT signing algorithm"
    )
    jwt_access_token_expire_minutes: int = Field(
        default=30, ge=5, le=1440, description="Access token expiration in minutes"
    )
    jwt_refresh_token_expire_days: int = Field(
        default=7, ge=1, le=90, description="Refresh token expiration in days"
    )
    jwt_issuer: Optional[str] = Field(default=None, description="JWT issuer")
    jwt_audience: Optional[str] = Field(default=None, description="JWT audience")

    # MedicusAI Configuration
    medicusai_url: str = Field(
        default="http://localhost:8000",
        description="MedicusAI API base URL"
    )

    # Application settings
    debug: bool = Field(default=False, description="Enable debug mode")
    app_name: str = Field(default="MedicusCommon", description="Application name")
    environment: Literal["development", "staging", "production"] = Field(
        default="development", description="Environment"
    )
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = Field(
        default="INFO", description="Logging level"
    )

    # Security settings
    bcrypt_rounds: int = Field(default=12, ge=4, le=16, description="Bcrypt rounds")
    max_login_attempts: int = Field(default=5, ge=1, le=10, description="Max login attempts")
    lockout_duration_minutes: int = Field(
        default=15, ge=1, le=1440, description="Account lockout duration"
    )
    password_min_length: int = Field(default=8, ge=6, le=128, description="Minimum password length")
    dev_bypass_password_verification: bool = Field(
        default=False, description="Bypass password verification for development (ExpoGo only)"
    )
    
    # Rate limiting
    rate_limit_requests: int = Field(default=100, ge=1, description="Rate limit requests per window")
    rate_limit_window_seconds: int = Field(default=60, ge=1, description="Rate limit window in seconds")
    
    # CORS and security settings
    # Comma-separated ("https://a.example,https://b.example") or a JSON list.
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default=["http://localhost:3000", "http://localhost:8081", "http://localhost:5173",
                 "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
        description="Allowed CORS origins"
    )
    allowed_hosts: Annotated[list[str], NoDecode] = Field(
        default=["localhost", "127.0.0.1", "*"],
        description="Allowed trusted hosts"
    )

    @field_validator("cors_origins", "allowed_hosts", mode="before")
    @classmethod
    def _split_list(cls, v):
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("["):
                import json
                return json.loads(v)
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    # Connection pool settings
    db_pool_min_size: int = Field(default=2, ge=1, le=50, description="Minimum pool size")
    db_pool_max_size: int = Field(default=20, ge=2, le=100, description="Maximum pool size")
    db_connection_timeout: int = Field(default=30, ge=5, le=300, description="Connection timeout")
    db_command_timeout: int = Field(default=60, ge=5, le=600, description="Command timeout")

    # Redis settings (optional)
    redis_url: Optional[str] = Field(default=None, description="Redis connection URL")
    redis_max_connections: int = Field(default=10, ge=1, le=100, description="Redis max connections")

    # Monitoring and observability
    sentry_dsn: Optional[str] = Field(default=None, description="Sentry DSN for error tracking")
    enable_metrics: bool = Field(default=True, description="Enable metrics collection")
    enable_tracing: bool = Field(default=False, description="Enable distributed tracing")

    # Model providers, object storage and email are configured in
    # medicus_common.llm, medicus_common.storage and medicus_common.email.

    # AI Service settings
    ai_api_url: str = Field(
        default="http://localhost:8000", description="MedicusAI service API base URL"
    )

    # Base API URL
    api_base_url: str = Field(
        default="http://localhost:8000", description="Medicus API base URL"
    )
    
    @field_validator('postgres_password')
    @classmethod
    def validate_postgres_password(cls, v: str) -> str:
        """Validate PostgreSQL password strength."""
        if not v:
            raise ValueError("PostgreSQL password is required")
        if len(v) < 8:
            raise ValueError("PostgreSQL password must be at least 8 characters")
        return v

    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret_key(cls, v: str) -> str:
        """Validate JWT secret key."""
        if not v:
            raise ValueError("JWT secret key is required")
        if len(v) < 32:
            raise ValueError("JWT secret key must be at least 32 characters")
        if v in ["your-secret-key", "change-me", "secret", "default"] or v.upper().startswith("CHANGE_ME"):
            raise ValueError(
                "JWT_SECRET_KEY is a placeholder. Generate one with: openssl rand -hex 32"
            )
        return v

    @field_validator('postgres_host')
    @classmethod
    def validate_postgres_host(cls, v: str) -> str:
        """Validate PostgreSQL host."""
        if not v or v.strip() == "":
            raise ValueError("PostgreSQL host cannot be empty")
        return v.strip()

    @field_validator('environment')
    @classmethod
    def validate_environment(cls, v: str) -> str:
        """Validate environment setting."""
        if v == "production":
            # Additional production checks could go here
            logger.warning("Running in PRODUCTION mode")
        return v

    @field_validator('cors_origins')
    @classmethod
    def validate_cors_origins(cls, v: list[str]) -> list[str]:
        """Validate CORS origins."""
        if not v:
            raise ValueError("CORS origins list cannot be empty")
        
        # Check for wildcard in production (security concern)
        if "*" in v:
            logger.warning("Wildcard (*) CORS origin detected - not recommended for production")
        
        return v

    @field_validator('allowed_hosts')
    @classmethod
    def validate_allowed_hosts(cls, v: list[str]) -> list[str]:
        """Validate allowed hosts."""
        if not v:
            raise ValueError("Allowed hosts list cannot be empty")
        
        # Check for wildcard in production (security concern)
        if "*" in v:
            logger.warning("Wildcard (*) in allowed hosts - not recommended for production")
        
        return v

    @model_validator(mode='after')
    def validate_model(self) -> 'Settings':
        """Cross-field validation."""
        # Ensure pool min size <= max size
        if self.db_pool_min_size > self.db_pool_max_size:
            raise ValueError("db_pool_min_size cannot be greater than db_pool_max_size")
        
        # Production environment checks
        if self.environment == "production":
            if self.debug:
                raise ValueError("Debug mode should not be enabled in production")
            if self.log_level == "DEBUG":
                logger.warning("DEBUG logging in production may impact performance")
            
            # Additional production security checks
            if "*" in self.cors_origins:
                logger.warning("Wildcard CORS origins in production - security risk")
            if "*" in self.allowed_hosts:
                logger.warning("Wildcard allowed hosts in production - security risk")
            if self.postgres_ssl_mode in ("disable", "allow"):
                logger.warning("POSTGRES_SSL_MODE does not require TLS in production")

        return self

    @property
    def database_url(self) -> str:
        """Construct database URL with SSL settings."""
        ssl_param = f"&sslmode={self.postgres_ssl_mode}" if self.postgres_ssl_mode else ""
        return (
            f"postgresql://{self.postgres_user}:{self.postgres_password}"
            f"@{self.postgres_host}:{self.postgres_port}/{self.postgres_db}"
            f"?application_name={self.app_name}{ssl_param}"
        )

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == "development"

    def get_log_config(self) -> dict:
        """Get logging configuration."""
        return {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
                "json": {
                    "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
                    "class": "pythonjsonlogger.jsonlogger.JsonFormatter",
                },
            },
            "handlers": {
                "default": {
                    "formatter": "json" if self.is_production else "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stdout",
                },
            },
            "root": {
                "level": self.log_level,
                "handlers": ["default"],
            },
        }


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance.
    
    Returns:
        Settings: Application settings
        
    Raises:
        ValidationError: If settings validation fails
    """
    try:
        settings = Settings()
        
        # Log configuration info (without secrets)
        logger.info(
            f"Loaded settings for environment: {settings.environment}, "
            f"app: {settings.app_name}, debug: {settings.debug}"
        )
        
        return settings
    except Exception as e:
        logger.error(f"Failed to load settings: {e}")
        raise