from secrets import token_urlsafe

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Watchlist, WatchlistStock
from schemas import WatchlistCreate, StockCreate


router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


def get_owned_watchlist(
    watchlist_id: int,
    access_token: str | None,
    db: Session
):
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")
    if not access_token or access_token != watchlist.access_token:
        raise HTTPException(status_code=403, detail="A valid watchlist token is required")
    return watchlist


@router.post("/")
def create_watchlist(data: WatchlistCreate, db: Session = Depends(get_db)):
    watchlist = Watchlist(
        name=data.name.strip(),
        access_token=token_urlsafe(32)
    )
    db.add(watchlist)
    db.commit()
    db.refresh(watchlist)
    return {
        "id": watchlist.id,
        "name": watchlist.name,
        "access_token": watchlist.access_token,
        "stocks": []
    }


@router.get("/{watchlist_id}")
def get_watchlist(watchlist_id: int, db: Session = Depends(get_db)):
    watchlist = db.query(Watchlist).filter(Watchlist.id == watchlist_id).first()
    if not watchlist:
        raise HTTPException(status_code=404, detail="Watchlist not found")

    stocks = db.query(WatchlistStock).filter(
        WatchlistStock.watchlist_id == watchlist_id
    ).all()
    return {
        "id": watchlist.id,
        "name": watchlist.name,
        "stocks": [
            {"id": stock.id, "symbol": stock.symbol, "stock_name": stock.stock_name}
            for stock in stocks
        ]
    }


@router.patch("/{watchlist_id}")
def rename_watchlist(
    watchlist_id: int,
    data: WatchlistCreate,
    x_watchlist_token: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    watchlist = get_owned_watchlist(watchlist_id, x_watchlist_token, db)
    watchlist.name = data.name.strip()
    db.commit()
    return {"id": watchlist.id, "name": watchlist.name}


@router.post("/{watchlist_id}/stocks")
def add_stock(
    watchlist_id: int,
    data: StockCreate,
    x_watchlist_token: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    watchlist = get_owned_watchlist(watchlist_id, x_watchlist_token, db)
    symbol = data.symbol.upper().strip()
    existing_stock = db.query(WatchlistStock).filter(
        WatchlistStock.watchlist_id == watchlist.id,
        WatchlistStock.symbol == symbol
    ).first()
    if existing_stock:
        raise HTTPException(status_code=400, detail="Stock already exists in watchlist")

    stock = WatchlistStock(
        watchlist_id=watchlist.id,
        symbol=symbol,
        stock_name=data.stock_name.strip() or symbol
    )
    db.add(stock)
    db.commit()
    db.refresh(stock)
    return {
        "id": stock.id,
        "symbol": stock.symbol,
        "stock_name": stock.stock_name
    }


@router.delete("/{watchlist_id}/stocks/{stock_id}")
def delete_stock(
    watchlist_id: int,
    stock_id: int,
    x_watchlist_token: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    get_owned_watchlist(watchlist_id, x_watchlist_token, db)
    stock = db.query(WatchlistStock).filter(
        WatchlistStock.id == stock_id,
        WatchlistStock.watchlist_id == watchlist_id
    ).first()
    if not stock:
        raise HTTPException(status_code=404, detail="Stock not found")
    db.delete(stock)
    db.commit()
    return {"message": "Stock removed successfully"}
