from pydantic import BaseModel, EmailStr, Field


# =========================
# USER SCHEMAS
# =========================

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True


# =========================
# WATCHLIST SCHEMAS
# =========================

class WatchlistCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class StockCreate(BaseModel):
    symbol: str = Field(min_length=1, max_length=12)
    stock_name: str = Field(default="", max_length=80)