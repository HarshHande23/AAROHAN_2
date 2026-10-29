import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "APAAR PS2 - Academic Verification Platform"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "apaar_super_secret_jwt_key_2026_ps2_aicte_gov")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 # 24 hours
    
    # Database URL: default to SQLite file in backend/ directory
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'apaar_registry.db'))}"
    )
    
    # Dataset and model paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
    DATASETS_DIR: str = os.path.join(BASE_DIR, "datasets")
    SAVED_MODELS_DIR: str = os.path.join(os.path.dirname(__file__), "ml", "saved_models")

    class Config:
        env_file = ".env"

settings = Settings()

