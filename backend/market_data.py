import yfinance as yf
from datetime import datetime, time, timezone
from zoneinfo import ZoneInfo


def get_market_status(symbol: str):
    exchange_timezone = ZoneInfo("Asia/Kolkata") if ".NS" in symbol else ZoneInfo("America/New_York")
    current_time = datetime.now(exchange_timezone)
    is_weekday = current_time.weekday() < 5
    session_start = time(9, 15) if ".NS" in symbol else time(9, 30)
    session_end = time(15, 30) if ".NS" in symbol else time(16, 0)
    is_open = is_weekday and session_start <= current_time.time() <= session_end
    return {
        "market_status": "OPEN" if is_open else "CLOSED",
        "market_timezone": str(exchange_timezone),
    }


def get_stock_data(symbol: str):
    """
    Get the latest available market information
    for a stock symbol.
    """

    symbol = symbol.upper().strip()

    # Keep exchange-qualified symbols intact. The dashboard also uses
    # common US symbols, while unqualified Indian symbols use NSE.
    us_symbols = {"AAPL", "MSFT", "NVDA", "TSLA", "AMZN", "GOOGL", "META"}
    yahoo_symbol = symbol if "." in symbol or symbol in us_symbols else symbol + ".NS"

    ticker = yf.Ticker(yahoo_symbol)

    try:
        data = ticker.history(
            period="1d",
            interval="1m"
        )

        if data.empty:
            return None

        latest = data.iloc[-1]

        price = float(latest["Close"])
        volume = float(latest["Volume"])

        market_timestamp = data.index[-1]

        # Convert timestamp to ISO format
        timestamp = str(market_timestamp)

        # -------------------------------------------------
        # FRESHNESS CHECK
        # -------------------------------------------------

        now = datetime.now(timezone.utc)

        try:
            market_time = market_timestamp.to_pydatetime()

            # If timestamp has timezone information
            if market_time.tzinfo is None:
                market_time = market_time.replace(
                    tzinfo=timezone.utc
                )

            age_seconds = (
                now - market_time.astimezone(timezone.utc)
            ).total_seconds()

            age_minutes = round(
                age_seconds / 60,
                2
            )

        except Exception:
            age_minutes = None

        # -------------------------------------------------
        # DETERMINE FRESHNESS
        # -------------------------------------------------

        if age_minutes is None:

            freshness = "UNKNOWN"
            is_stale = True

        elif age_minutes <= 15:

            freshness = "FRESH"
            is_stale = False

        elif age_minutes <= 60:

            freshness = "DELAYED"
            is_stale = False

        else:

            freshness = "STALE"
            is_stale = True

        return {
            "symbol": symbol,
            "price": round(price, 2),
            "volume": volume,
            "timestamp": timestamp,
            "age_minutes": age_minutes,
            "freshness": freshness,
            "is_stale": is_stale,
            **get_market_status(yahoo_symbol)
        }

    except Exception as e:

        print("Market data error:", e)

        return None