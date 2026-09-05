from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
from secrets import token_urlsafe

DATABASE_URL = "sqlite:///./marketpulse.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def ensure_public_watchlists():
    inspector = inspect(engine)
    if "watchlists" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("watchlists")}
    with engine.begin() as connection:
        if "access_token" not in columns:
            connection.execute(text("ALTER TABLE watchlists ADD COLUMN access_token VARCHAR"))

        rows = connection.execute(
            text("SELECT id FROM watchlists WHERE access_token IS NULL")
        ).fetchall()
        for row in rows:
            connection.execute(
                text("UPDATE watchlists SET access_token = :token WHERE id = :id"),
                {"token": token_urlsafe(32), "id": row.id}
            )


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()