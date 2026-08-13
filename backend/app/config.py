from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    aws_access_key_id: str
    aws_secret_access_key: str
    aws_region: str
    s3_bucket: str
    frontend_url: str = "http://localhost:3000"
    presigned_upload_expires: int = 900
    presigned_view_expires: int = 300
    max_file_size_mb: int = 20
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
