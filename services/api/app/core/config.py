import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./mindloop.db")
API_KEY = os.getenv("MINDLOOP_API_KEY", "demo-key-change-me")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
APP_VERSION = "0.1.0"
