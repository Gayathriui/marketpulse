from pydantic import BaseModel, EmailStr


# =====================================================
# USER
# =====================================================

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


# =====================================================
# WATCHLIST
# =====================================================

class WatchlistCreate(BaseModel):
    user_id: int | None = None
    name: str


# =====================================================
# STOCK
# =====================================================

class StockCreate(BaseModel):
    symbol: str
    stock_name: str