from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models

from routers.auth import router as auth_router
from routers.market import router as market_router
from routers.watchlist import router as watchlist_router


# -----------------------------------
# Create database tables
# -----------------------------------

Base.metadata.create_all(
    bind=engine
)


# -----------------------------------
# FastAPI Application
# -----------------------------------

app = FastAPI(
    title="MarketPulse API",
    description="Smart Market Watchlist API",
    version="1.0.0"
)


# -----------------------------------
# CORS Configuration
# -----------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------
# Include Authentication
# -----------------------------------

app.include_router(
    auth_router
)


# -----------------------------------
# Include Watchlist
# -----------------------------------

app.include_router(
    watchlist_router
)


# -----------------------------------
# Include Market
# -----------------------------------

app.include_router(
    market_router
)


# -----------------------------------
# Root
# -----------------------------------

@app.get("/")
def root():
    return {
        "message": "MarketPulse API is running",
        "status": "running"
    }


# -----------------------------------
# Health Check
# -----------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }