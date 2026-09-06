from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from database import get_db
from models import Watchlist, WatchlistStock
from schemas import WatchlistCreate, StockCreate


router = APIRouter(
    prefix="/watchlist",
    tags=["Watchlist"]
)


# =====================================================
# COMPANY ALIASES
# =====================================================

SYMBOL_ALIASES = {

    "INFOSYS": "INFY",
    "INFY": "INFY",

    "TATA": "TCS",
    "TCS": "TCS",

    "RELIANCE": "RELIANCE",

    "HDFC": "HDFCBANK",
    "HDFCBANK": "HDFCBANK",

    "ICICI": "ICICIBANK",
    "ICICIBANK": "ICICIBANK",

    "SBI": "SBIN",
    "SBIN": "SBIN",

    "WIPRO": "WIPRO",

    "HCL": "HCLTECH",
    "HCLTECH": "HCLTECH",

    "AIRTEL": "BHARTIARTL",
    "BHARTIARTL": "BHARTIARTL",

    "TATAMOTORS": "TATAMOTORS",
    "TATASTEEL": "TATASTEEL",

    "AAPL": "AAPL",
    "APPLE": "AAPL",

    "MSFT": "MSFT",
    "MICROSOFT": "MSFT",

    "NVDA": "NVDA",
    "NVIDIA": "NVDA",

    "TSLA": "TSLA",
    "TESLA": "TSLA",
}


# =====================================================
# COMPANY NAMES
# =====================================================

COMPANY_NAMES = {

    "INFY": "Infosys",

    "TCS": "Tata Consultancy Services",

    "RELIANCE": "Reliance Industries",

    "HDFCBANK": "HDFC Bank",

    "ICICIBANK": "ICICI Bank",

    "SBIN": "State Bank of India",

    "WIPRO": "Wipro",

    "HCLTECH": "HCL Technologies",

    "BHARTIARTL": "Bharti Airtel",

    "TATAMOTORS": "Tata Motors",

    "TATASTEEL": "Tata Steel",

    "AAPL": "Apple",

    "MSFT": "Microsoft",

    "NVDA": "NVIDIA",

    "TSLA": "Tesla",
}


# =====================================================
# TOKEN VALIDATION
# =====================================================

def get_owned_watchlist(
    watchlist_id: int,
    token: str | None,
    db: Session
):

    watchlist = (
        db.query(Watchlist)
        .filter(
            Watchlist.id == watchlist_id
        )
        .first()
    )

    if not watchlist:

        raise HTTPException(
            status_code=404,
            detail="Watchlist not found"
        )

    return watchlist


# =====================================================
# CREATE WATCHLIST
# =====================================================

@router.post("/")
def create_watchlist(
    data: WatchlistCreate,
    db: Session = Depends(get_db)
):

    watchlist = Watchlist(
        name=data.name
    )

    # If user_id is supplied by schema,
    # use it.
    if hasattr(data, "user_id"):

        watchlist.user_id = data.user_id


    db.add(watchlist)

    db.commit()

    db.refresh(watchlist)


    return {

        "id":
            watchlist.id,

        "name":
            watchlist.name,

        "access_token":
            str(watchlist.id),

        "stocks":
            []

    }


# =====================================================
# GET WATCHLIST
# =====================================================

@router.get("/{watchlist_id}")
def get_watchlist(
    watchlist_id: int,
    x_watchlist_token: str | None = Header(
        default=None,
        alias="X-Watchlist-Token"
    ),
    db: Session = Depends(get_db)
):

    watchlist = get_owned_watchlist(
        watchlist_id,
        x_watchlist_token,
        db
    )


    stocks = (
        db.query(WatchlistStock)
        .filter(
            WatchlistStock.watchlist_id ==
            watchlist_id
        )
        .all()
    )


    return {

        "id":
            watchlist.id,

        "name":
            watchlist.name,

        "user_id":
            watchlist.user_id,

        "access_token":
            x_watchlist_token
            or str(watchlist.id),

        "stocks": [

            {

                "id":
                    stock.id,

                "symbol":
                    stock.symbol,

                "stock_name":
                    stock.stock_name

            }

            for stock in stocks

        ]

    }


# =====================================================
# RENAME WATCHLIST
# =====================================================

@router.patch("/{watchlist_id}")
def rename_watchlist(
    watchlist_id: int,
    data: WatchlistCreate,
    x_watchlist_token: str | None = Header(
        default=None,
        alias="X-Watchlist-Token"
    ),
    db: Session = Depends(get_db)
):

    watchlist = get_owned_watchlist(
        watchlist_id,
        x_watchlist_token,
        db
    )


    watchlist.name = data.name

    db.commit()

    db.refresh(watchlist)


    return {

        "message":
            "Watchlist renamed successfully",

        "id":
            watchlist.id,

        "name":
            watchlist.name

    }


# =====================================================
# ADD STOCK
# =====================================================

@router.post("/{watchlist_id}/stocks")
def add_stock(
    watchlist_id: int,
    data: StockCreate,
    x_watchlist_token: str | None = Header(
        default=None,
        alias="X-Watchlist-Token"
    ),
    db: Session = Depends(get_db)
):

    watchlist = get_owned_watchlist(
        watchlist_id,
        x_watchlist_token,
        db
    )


    typed_symbol = (
        data.symbol
        .strip()
        .upper()
    )


    symbol = (
        SYMBOL_ALIASES.get(
            typed_symbol,
            typed_symbol
        )
    )


    existing = (
        db.query(WatchlistStock)
        .filter(
            WatchlistStock.watchlist_id ==
            watchlist.id,

            WatchlistStock.symbol ==
            symbol
        )
        .first()
    )


    if existing:

        raise HTTPException(
            status_code=400,
            detail="Stock already exists in watchlist"
        )


    stock_name = (
        COMPANY_NAMES.get(
            symbol,
            data.stock_name or symbol
        )
    )


    stock = WatchlistStock(

        watchlist_id=
            watchlist.id,

        symbol=
            symbol,

        stock_name=
            stock_name

    )


    db.add(stock)

    db.commit()

    db.refresh(stock)


    return {

        "message":
            "Stock added successfully",

        "stock": {

            "id":
                stock.id,

            "symbol":
                stock.symbol,

            "stock_name":
                stock.stock_name

        }

    }


# =====================================================
# DELETE STOCK
# =====================================================

@router.delete(
    "/{watchlist_id}/stocks/{stock_id}"
)
def delete_stock(
    watchlist_id: int,
    stock_id: int,
    x_watchlist_token: str | None = Header(
        default=None,
        alias="X-Watchlist-Token"
    ),
    db: Session = Depends(get_db)
):

    watchlist = get_owned_watchlist(
        watchlist_id,
        x_watchlist_token,
        db
    )


    stock = (
        db.query(WatchlistStock)
        .filter(

            WatchlistStock.id ==
            stock_id,

            WatchlistStock.watchlist_id ==
            watchlist.id

        )
        .first()
    )


    if not stock:

        raise HTTPException(
            status_code=404,
            detail="Stock not found"
        )


    db.delete(stock)

    db.commit()


    return {

        "message":
            "Stock removed successfully"

    }