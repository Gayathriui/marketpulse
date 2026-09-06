from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# =========================================================
# POSTGRESQL DATABASE
# =========================================================

DATABASE_URL = (
    "postgresql+psycopg2://postgres:5432@localhost:5432/marketpulse"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# =========================================================
# DATABASE SESSION
# =========================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# PUBLIC WATCHLIST INITIALIZATION
# =========================================================

def ensure_public_watchlists():
    """
    Placeholder function required by main.py.

    The actual tables are created using:
        Base.metadata.create_all(bind=engine)

    This function is kept so existing main.py code
    continues to work.
    """
    pass