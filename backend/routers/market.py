from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import (
    MarketSnapshot,
    Watchlist,
    WatchlistStock,
    WatchlistStockState
)
from market_data import get_stock_data
from routers.watchlist import get_owned_watchlist


router = APIRouter(prefix="/market", tags=["Market Data"])


def compare_stock(symbol, stock_name, current_data, previous_state):
    current_price = current_data["price"]
    current_volume = current_data["volume"]
    result = {
        "symbol": symbol,
        "stock_name": stock_name,
        "current_price": current_price,
        "volume": current_volume,
        "freshness": current_data["freshness"],
        "age_minutes": current_data["age_minutes"],
        "is_stale": current_data["is_stale"],
        "market_status": current_data["market_status"],
        "market_timezone": current_data["market_timezone"]
    }

    if previous_state is None:
        result.update({
            "previous_price": None,
            "change": None,
            "change_percent": None,
            "volume_change_percent": None,
            "meaningful_change": False,
            "attention": "LOW",
            "status": "FIRST_CHECK",
            "message": "First check. MarketPulse will track changes from now."
        })
        return result

    previous_price = previous_state.last_price
    previous_volume = previous_state.last_volume or 0
    change = round(current_price - previous_price, 2)
    change_percent = round((change / previous_price) * 100, 2) if previous_price else 0
    volume_change_percent = round(
        ((current_volume - previous_volume) / previous_volume) * 100,
        2
    ) if previous_volume else 0

    absolute_price_change = abs(change_percent)
    absolute_volume_change = abs(volume_change_percent)
    if absolute_price_change >= 3 or absolute_volume_change >= 50:
        attention = "HIGH"
    elif absolute_price_change >= 1 or absolute_volume_change >= 20:
        attention = "MEDIUM"
    else:
        attention = "LOW"

    meaningful_change = attention != "LOW"
    result.update({
        "previous_price": previous_price,
        "change": change,
        "change_percent": change_percent,
        "volume_change_percent": volume_change_percent,
        "meaningful_change": meaningful_change,
        "attention": attention,
        "status": "CHECKED",
        "message": (
            "Significant market movement detected."
            if meaningful_change else "No significant movement since your last check."
        )
    })
    return result


@router.get("/quote/{symbol}")
def get_quote(symbol: str):
    data = get_stock_data(symbol)
    if data is None:
        raise HTTPException(status_code=404, detail="Market data not available")
    return data


@router.post("/snapshot/{symbol}")
def save_snapshot(symbol: str, db: Session = Depends(get_db)):
    data = get_stock_data(symbol)
    if data is None:
        raise HTTPException(status_code=404, detail="Market data not available")

    snapshot = MarketSnapshot(
        symbol=data["symbol"],
        price=data["price"],
        volume=data["volume"]
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)
    return {
        "message": "Market snapshot saved",
        "snapshot": {
            "id": snapshot.id,
            "symbol": snapshot.symbol,
            "price": snapshot.price,
            "volume": snapshot.volume,
            "timestamp": snapshot.timestamp
        }
    }


@router.get("/watchlist/{watchlist_id}/changes")
def get_watchlist_changes(
    watchlist_id: int,
    x_watchlist_token: str | None = Header(default=None),
    db: Session = Depends(get_db)
):
    watchlist = get_owned_watchlist(watchlist_id, x_watchlist_token, db)
    stocks = db.query(WatchlistStock).filter(
        WatchlistStock.watchlist_id == watchlist_id
    ).all()
    results = []

    for stock in stocks:
        symbol = stock.symbol.upper().strip()
        current_data = get_stock_data(symbol)
        if current_data is None:
            results.append({
                "symbol": symbol,
                "stock_name": stock.stock_name,
                "status": "DATA_UNAVAILABLE",
                "attention": "LOW",
                "meaningful_change": False,
                "message": "Market data is currently unavailable."
            })
            continue

        previous_state = db.query(WatchlistStockState).filter(
            WatchlistStockState.watchlist_id == watchlist_id,
            WatchlistStockState.symbol == symbol
        ).first()
        result = compare_stock(symbol, stock.stock_name, current_data, previous_state)
        results.append(result)

        if previous_state is None:
            previous_state = WatchlistStockState(
                watchlist_id=watchlist_id,
                symbol=symbol,
                last_price=current_data["price"],
                last_volume=current_data["volume"]
            )
            db.add(previous_state)
        else:
            previous_state.last_price = current_data["price"]
            previous_state.last_volume = current_data["volume"]

    db.commit()
    priority = {"HIGH": 1, "MEDIUM": 2, "LOW": 3}
    results.sort(key=lambda item: priority.get(item.get("attention", "LOW"), 4))
    return {
        "watchlist_id": watchlist_id,
        "watchlist_name": watchlist.name,
        "total_stocks": len(stocks),
        "stocks_requiring_attention": sum(
            item.get("meaningful_change") is True for item in results
        ),
        "stocks": results
    }
