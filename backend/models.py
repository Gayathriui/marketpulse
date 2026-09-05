from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String, nullable=False)
    access_token = Column(String, unique=True, index=True, nullable=True)


class WatchlistStock(Base):
    __tablename__ = "watchlist_stocks"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"))
    symbol = Column(String, nullable=False)
    stock_name = Column(String, nullable=False)


class MarketSnapshot(Base):
    __tablename__ = "market_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    volume = Column(Float, nullable=True)
    timestamp = Column(DateTime, server_default=func.now())


class UserStockState(Base):
    __tablename__ = "user_stock_states"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    symbol = Column(
        String,
        nullable=False
    )

    last_price = Column(
        Float,
        nullable=False
    )

    last_volume = Column(
        Float,
        nullable=True
    )

    last_checked_at = Column(
        DateTime,
        server_default=func.now()
    )


class WatchlistStockState(Base):
    __tablename__ = "watchlist_stock_states"

    id = Column(Integer, primary_key=True, index=True)
    watchlist_id = Column(Integer, ForeignKey("watchlists.id"), nullable=False)
    symbol = Column(String, nullable=False)
    last_price = Column(Float, nullable=False)
    last_volume = Column(Float, nullable=True)
    last_checked_at = Column(DateTime, server_default=func.now())