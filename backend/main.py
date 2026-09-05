from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, ensure_public_watchlists
import models

from routers.watchlist import router as watchlist_router
from routers.market import router as market_router


# Create database tables
Base.metadata.create_all(bind=engine)
ensure_public_watchlists()


app = FastAPI(
    title="MarketPulse API",
    description="Smart Market Watchlist API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Watchlist
app.include_router(watchlist_router)

# Market data
app.include_router(market_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to MarketPulse API",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }