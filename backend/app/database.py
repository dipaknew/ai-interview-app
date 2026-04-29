import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL", "")

if DATABASE_URL:
    # PostgreSQL (Neon) — Neon sometimes uses "postgres://" which SQLAlchemy needs
    # to be "postgresql://" for psycopg2
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # Local SQLite fallback — zero config needed for development
    _BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    _DB_PATH = os.path.join(_BASE_DIR, "..", "interview.db")
    SQLITE_URL = f"sqlite:///{os.path.abspath(_DB_PATH)}"
    engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

