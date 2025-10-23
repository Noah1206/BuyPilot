"""
Database connection and session management
SQLAlchemy setup for Supabase PostgreSQL
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from contextlib import contextmanager

# Get database URL from environment
DATABASE_URL = os.getenv('SUPABASE_DB_URL', 'postgresql://localhost/buypilot')

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=os.getenv('SQL_ECHO', 'False').lower() == 'true'  # Log SQL queries in debug mode
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Create scoped session for thread-safety
Session = scoped_session(SessionLocal)

# Base class for all models
Base = declarative_base()


@contextmanager
def get_db():
    """
    Database session context manager
    Usage:
        with get_db() as db:
            db.query(Order).all()
    """
    db = Session()
    try:
        yield db
        db.commit()
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()


def init_db():
    """Initialize database - create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized successfully")


def close_db():
    """Close all database connections"""
    Session.remove()
    engine.dispose()
    print("✅ Database connections closed")
