import { useEffect, useState } from 'react'
import './App.css'

const API_BASE =
  import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

const STORAGE_KEY = 'marketpulse-watchlist'
const REFRESH_INTERVAL_MS = 60000


// =====================================================
// DEFAULT COMPANIES
// =====================================================

const DEFAULT_SYMBOLS = [
  {
    symbol: 'AAPL',
    stock_name: 'Apple',
  },
  {
    symbol: 'MSFT',
    stock_name: 'Microsoft',
  },
  {
    symbol: 'NVDA',
    stock_name: 'NVIDIA',
  },
  {
    symbol: 'TSLA',
    stock_name: 'Tesla',
  },
]


// =====================================================
// COMPANY NAMES
// =====================================================

const COMPANY_MAP = {
  INFY: 'Infosys',
  TCS: 'Tata Consultancy Services',
  RELIANCE: 'Reliance Industries',
  HDFCBANK: 'HDFC Bank',
  ICICIBANK: 'ICICI Bank',
  SBIN: 'State Bank of India',
  WIPRO: 'Wipro',
  HCLTECH: 'HCL Technologies',
  ITC: 'ITC',
  BHARTIARTL: 'Bharti Airtel',
  LT: 'Larsen & Toubro',
  AXISBANK: 'Axis Bank',
  KOTAKBANK: 'Kotak Mahindra Bank',
  MARUTI: 'Maruti Suzuki',
  SUNPHARMA: 'Sun Pharmaceutical',
  TITAN: 'Titan Company',
  ADANIENT: 'Adani Enterprises',
  ADANIPORTS: 'Adani Ports',
  TATAMOTORS: 'Tata Motors',
  TATASTEEL: 'Tata Steel',

  AAPL: 'Apple',
  MSFT: 'Microsoft',
  NVDA: 'NVIDIA',
  TSLA: 'Tesla',
  AMZN: 'Amazon',
  GOOGL: 'Alphabet',
  META: 'Meta Platforms',
}


// =====================================================
// COMPANY ALIASES
// =====================================================

const SYMBOL_ALIASES = {
  INFOSYS: 'INFY',
  INFY: 'INFY',

  TCS: 'TCS',
  TATA: 'TCS',
  TCSL: 'TCS',
  TATACONSULTANCYSERVICES: 'TCS',

  RELIANCE: 'RELIANCE',
  RELIANCEINDUSTRIES: 'RELIANCE',

  HDFC: 'HDFCBANK',
  HDFCBANK: 'HDFCBANK',
  HDFCBANKLIMITED: 'HDFCBANK',

  ICICI: 'ICICIBANK',
  ICICIBANK: 'ICICIBANK',

  SBI: 'SBIN',
  SBIN: 'SBIN',
  STATEBANKOFINDIA: 'SBIN',

  WIPRO: 'WIPRO',
  WIPROTECHNOLOGIES: 'WIPRO',

  HCL: 'HCLTECH',
  HCLTECH: 'HCLTECH',
  HCLTECHNOLOGIES: 'HCLTECH',

  AIRTEL: 'BHARTIARTL',
  BHARTIARTL: 'BHARTIARTL',

  LT: 'LT',
  LARSEN: 'LT',
  LARSENANDTOUBRO: 'LT',

  TATAMOTORS: 'TATAMOTORS',
  TATASTEEL: 'TATASTEEL',

  APPLE: 'AAPL',
  AAPL: 'AAPL',

  MICROSOFT: 'MSFT',
  MSFT: 'MSFT',

  NVIDIA: 'NVDA',
  NVDA: 'NVDA',

  TESLA: 'TSLA',
  TSLA: 'TSLA',

  AMAZON: 'AMZN',
  AMZN: 'AMZN',

  ALPHABET: 'GOOGL',
  GOOGL: 'GOOGL',

  META: 'META',
}


// =====================================================
// APP
// =====================================================

function App() {
  const [watchlist, setWatchlist] = useState(null)
  const [rows, setRows] = useState([])

  const [newSymbol, setNewSymbol] = useState('')
  const [searchSymbol, setSearchSymbol] = useState('')

  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [quote, setQuote] = useState(null)

  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  const [isChecking, setIsChecking] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  const [shareMessage, setShareMessage] = useState('Share radar')


  // ===================================================
  // TOKEN HEADERS
  // ===================================================

  function tokenHeaders(token = null) {
    const accessToken =
      token || watchlist?.access_token

    if (!accessToken) {
      return {}
    }

    return {
      'X-Watchlist-Token': accessToken,
    }
  }


  // ===================================================
  // API REQUEST
  // ===================================================

  async function request(path, options = {}) {
    const response = await fetch(
      `${API_BASE}${path}`,
      {
        ...options,

        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      }
    )

    if (!response.ok) {
      let body = {}

      try {
        body = await response.json()
      } catch {
        body = {}
      }

      throw new Error(
        body.detail ||
        `Request failed with status ${response.status}`
      )
    }

    return response.json()
  }


  // ===================================================
  // SAVE WATCHLIST
  // ===================================================

  function saveWatchlist(nextWatchlist) {
    setWatchlist(nextWatchlist)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        id: nextWatchlist.id,
        access_token: nextWatchlist.access_token,
      })
    )
  }


  // ===================================================
  // LOAD WATCHLIST
  // ===================================================

  async function loadPublicWatchlist() {
    setStatus('loading')
    setError('')

    try {
      const query = new URLSearchParams(
        window.location.search
      )

      let saved = null

      try {
        saved = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || 'null'
        )
      } catch {
        saved = null
      }

      const id =
        query.get('watchlist') ||
        saved?.id

      const accessToken =
        query.get('token') ||
        saved?.access_token


      // -------------------------------------------------
      // EXISTING WATCHLIST
      // -------------------------------------------------

      if (id && accessToken) {
        try {
          const loaded = await request(
            `/watchlist/${id}`,
            {
              headers: tokenHeaders(accessToken),
            }
          )

          saveWatchlist({
            ...loaded,
            access_token: accessToken,
          })

          setStatus('ready')
          return
        } catch (loadError) {
          console.warn(
            'Saved watchlist could not be loaded:',
            loadError.message
          )

          // Clear stale watchlist
          localStorage.removeItem(STORAGE_KEY)
        }
      }


      // -------------------------------------------------
      // CREATE NEW WATCHLIST
      // -------------------------------------------------

      const created = await request(
        '/watchlist/',
        {
          method: 'POST',

          body: JSON.stringify({
            name: 'Daily focus',
          }),
        }
      )

      saveWatchlist(created)


      // -------------------------------------------------
      // ADD DEFAULT COMPANIES
      // -------------------------------------------------

      for (const company of DEFAULT_SYMBOLS) {
        try {
          await request(
            `/watchlist/${created.id}/stocks`,
            {
              method: 'POST',

              headers: tokenHeaders(
                created.access_token
              ),

              body: JSON.stringify(company),
            }
          )
        } catch (error) {
          console.log(
            `Could not add ${company.symbol}:`,
            error.message
          )
        }
      }


      // -------------------------------------------------
      // RELOAD WATCHLIST
      // -------------------------------------------------

      const loaded = await request(
        `/watchlist/${created.id}`,
        {
          headers: tokenHeaders(
            created.access_token
          ),
        }
      )

      saveWatchlist({
        ...loaded,
        access_token: created.access_token,
      })

      setStatus('ready')

    } catch (requestError) {
      console.error(
        'Watchlist error:',
        requestError
      )

      setError(requestError.message)
      setStatus('error')
    }
  }


  // ===================================================
  // CHECK WATCHLIST
  // ===================================================

  async function checkWatchlist() {
    if (!watchlist) {
      return
    }

    setIsChecking(true)
    setError('')

    try {
      const result = await request(
        `/market/watchlist/${watchlist.id}/changes`,
        {
          headers: tokenHeaders(),
        }
      )

      const stockRows =
        result.stocks || []

      setRows(stockRows)


      // -------------------------------------------------
      // SELECT CURRENT SYMBOL
      // -------------------------------------------------

      const selected =
        stockRows.find(
          item =>
            item.symbol === selectedSymbol
        ) ||
        stockRows[0]

      if (selected) {
        setSelectedSymbol(
          selected.symbol
        )

        setQuote(selected)
      }

    } catch (requestError) {
      console.error(
        'Check error:',
        requestError
      )

      setError(requestError.message)

    } finally {
      setIsChecking(false)
    }
  }


  // ===================================================
  // ADD COMPANY
  // ===================================================

  async function addSymbol(event) {
    event.preventDefault()

    if (!watchlist) {
      return
    }

    const typedValue =
      newSymbol
        .trim()
        .toUpperCase()

    if (!typedValue) {
      return
    }

    const finalSymbol =
      SYMBOL_ALIASES[typedValue] ||
      typedValue


    // -------------------------------------------------
    // DUPLICATE CHECK
    // -------------------------------------------------

    const alreadyExists =
      watchlist.stocks?.some(
        stock =>
          stock.symbol === finalSymbol
      )

    if (alreadyExists) {
      setError(
        `${finalSymbol} is already in your watchlist`
      )

      return
    }


    setIsAdding(true)
    setError('')

    try {
      const companyName =
        COMPANY_MAP[finalSymbol] ||
        finalSymbol


      // -------------------------------------------------
      // ADD TO BACKEND
      // -------------------------------------------------

      await request(
        `/watchlist/${watchlist.id}/stocks`,
        {
          method: 'POST',

          headers: tokenHeaders(),

          body: JSON.stringify({
            symbol: finalSymbol,
            stock_name: companyName,
          }),
        }
      )


      // -------------------------------------------------
      // RELOAD WATCHLIST
      // -------------------------------------------------

      const loaded = await request(
        `/watchlist/${watchlist.id}`,
        {
          headers: tokenHeaders(),
        }
      )

      saveWatchlist({
        ...loaded,
        access_token:
          watchlist.access_token,
      })


      setSelectedSymbol(finalSymbol)
      setNewSymbol('')

      await checkWatchlist()

    } catch (requestError) {
      console.error(
        'Add company error:',
        requestError
      )

      setError(requestError.message)

    } finally {
      setIsAdding(false)
    }
  }


  // ===================================================
  // REMOVE COMPANY
  // ===================================================

  async function removeSymbol(stockId) {
    if (!watchlist || !stockId) {
      return
    }

    setIsRemoving(true)
    setError('')

    try {
      console.log(
        'Removing stock:',
        stockId
      )

      // -------------------------------------------------
      // DELETE FROM BACKEND
      // -------------------------------------------------

      await request(
        `/watchlist/${watchlist.id}/stocks/${stockId}`,
        {
          method: 'DELETE',
          headers: tokenHeaders(),
        }
      )


      // -------------------------------------------------
      // RELOAD WATCHLIST
      // -------------------------------------------------

      const loaded = await request(
        `/watchlist/${watchlist.id}`,
        {
          headers: tokenHeaders(),
        }
      )


      saveWatchlist({
        ...loaded,
        access_token:
          watchlist.access_token,
      })


      // -------------------------------------------------
      // UPDATE MARKET ROWS
      // -------------------------------------------------

      setRows(currentRows =>
        currentRows.filter(
          row => row.id !== stockId
        )
      )


      // -------------------------------------------------
      // HANDLE SELECTED STOCK
      // -------------------------------------------------

      const removedStock =
        watchlist.stocks?.find(
          stock =>
            stock.id === stockId
        )

      if (
        removedStock?.symbol ===
        selectedSymbol
      ) {
        const nextStock =
          loaded.stocks?.[0]

        if (nextStock) {
          setSelectedSymbol(
            nextStock.symbol
          )

          setQuote(null)
        } else {
          setSelectedSymbol('')
          setQuote(null)
        }
      }

    } catch (requestError) {
      console.error(
        'Remove company error:',
        requestError
      )

      setError(requestError.message)

    } finally {
      setIsRemoving(false)
    }
  }


  // ===================================================
  // SELECT COMPANY
  // ===================================================

  async function selectSymbol(item) {
    if (!item?.symbol) {
      return
    }

    const symbol =
      item.symbol
        .trim()
        .toUpperCase()

    const finalSymbol =
      SYMBOL_ALIASES[symbol] ||
      symbol

    setSelectedSymbol(finalSymbol)


    // -------------------------------------------------
    // USE EXISTING MARKET DATA
    // -------------------------------------------------

    const existingRow =
      rows.find(
        row =>
          row.symbol === finalSymbol
      )

    if (existingRow?.current_price) {
      setQuote(existingRow)
      return
    }


    // -------------------------------------------------
    // FETCH QUOTE
    // -------------------------------------------------

    try {
      setStatus('loading')
      setError('')

      const result = await request(
        `/market/quote/${finalSymbol}`
      )

      setQuote(result)

      setStatus('ready')

    } catch (requestError) {
      console.error(
        'Quote error:',
        requestError
      )

      setError(requestError.message)
      setStatus('error')
    }
  }


  // ===================================================
  // SHARE WATCHLIST
  // ===================================================

  async function shareWatchlist() {
    if (!watchlist) {
      return
    }

    const url =
      `${window.location.origin}` +
      `?watchlist=${watchlist.id}` +
      `&token=${watchlist.access_token}`

    try {
      await navigator.clipboard.writeText(url)

      setShareMessage('Link copied')

      setTimeout(() => {
        setShareMessage('Share radar')
      }, 1800)

    } catch {
      setError(
        'Could not copy the share link'
      )
    }
  }


  // ===================================================
  // INITIAL LOAD
  // ===================================================

  useEffect(() => {
    loadPublicWatchlist()
  }, [])


  // ===================================================
  // CHECK AFTER WATCHLIST LOAD
  // ===================================================

  useEffect(() => {
    if (!watchlist?.stocks?.length) {
      return
    }

    checkWatchlist()
  }, [
    watchlist?.id,
    watchlist?.stocks?.length
  ])


  // ===================================================
  // AUTO REFRESH
  // ===================================================

  useEffect(() => {
    if (!watchlist?.stocks?.length) {
      return
    }

    const timer = setInterval(
      () => {
        checkWatchlist()
      },
      REFRESH_INTERVAL_MS
    )

    return () => clearInterval(timer)
  }, [
    watchlist?.id,
    watchlist?.stocks?.length
  ])


  // ===================================================
  // CURRENT ROW
  // ===================================================

  const selectedRow =
    rows.find(
      row =>
        row.symbol === selectedSymbol
    ) ||
    quote


  // ===================================================
  // ATTENTION COUNT
  // ===================================================

  const attentionCount =
    rows.filter(
      row =>
        row.meaningful_change
    ).length


  // ===================================================
  // RENDER
  // ===================================================

  return (
    <main className="app-shell">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="topbar">

        <a
          className="brand"
          href="/"
          aria-label="MarketPulse home"
        >
          <span className="brand-mark">
            M
          </span>

          <span>
            MarketPulse
          </span>
        </a>


        <div className="topbar-actions">

          <span className="market-status">
            <span className="status-dot" />
            Auto-refresh 60s
          </span>


          {watchlist && (
            <button
              className="text-button"
              type="button"
              onClick={shareWatchlist}
            >
              {shareMessage}
            </button>
          )}

        </div>

      </header>


      {/* =================================================
          INTRO
      ================================================= */}

      <section className="intro">

        <p className="eyebrow">
          PUBLIC MARKET RADAR
        </p>

        <h1>
          Know what moved.
        </h1>

        <p className="intro-copy">
          A shared watchlist that turns
          the latest market data into a
          clear signal about what deserves
          your attention.
        </p>

      </section>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}


      {/* =================================================
          WORKSPACE
      ================================================= */}

      <section
        className="workspace"
        aria-label="Market quote dashboard"
      >

        {/* ===============================================
            WATCHLIST
        =============================================== */}

        <aside className="watchlist-panel">

          <div className="panel-heading">

            <div>
              <p className="eyebrow">
                WATCHLIST
              </p>

              <h2>
                Daily focus
              </h2>
            </div>

            <span className="count">
              {watchlist?.stocks?.length || 0}
            </span>

          </div>


          {/* =============================================
              COMPANY LIST
          ============================================= */}

          <div className="symbol-list">

            {watchlist?.stocks?.map(item => (

              <div
                className={`symbol-row ${
                  selectedSymbol === item.symbol
                    ? 'selected'
                    : ''
                }`}
                key={item.id}
              >

                {/* ---------------------------------------
                    COMPANY BUTTON
                --------------------------------------- */}

                <button
                  className="symbol-select"
                  type="button"
                  onClick={() =>
                    selectSymbol(item)
                  }
                >

                  <span className="symbol-icon">
                    {item.symbol?.slice(0, 1)}
                  </span>

                  <span className="symbol-name">

                    <strong>
                      {item.symbol}
                    </strong>

                    <small>
                      {
                        item.stock_name ||
                        COMPANY_MAP[item.symbol] ||
                        item.symbol
                      }
                    </small>

                  </span>

                </button>


                {/* ---------------------------------------
                    REMOVE BUTTON
                --------------------------------------- */}

                <button
                  className="remove-button"
                  type="button"
                  disabled={isRemoving}
                  onClick={(event) => {
                    event.stopPropagation()
                    removeSymbol(item.id)
                  }}
                  aria-label={`Remove ${item.symbol}`}
                  title={`Remove ${item.symbol}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    minWidth: '40px',
                    border: 'none',
                    cursor: isRemoving
                      ? 'wait'
                      : 'pointer',
                    fontSize: '26px',
                    lineHeight: '1',
                    background: 'transparent',
                    color: '#ef5b45',
                    padding: '0',
                    flexShrink: 0,
                  }}
                >
                  ×
                </button>

              </div>

            ))}

          </div>


          {/* =============================================
              ADD COMPANY
          ============================================= */}

          <form
            className="add-form"
            onSubmit={addSymbol}
          >

            <input
              list="company-suggestions"
              value={newSymbol}
              onChange={event =>
                setNewSymbol(
                  event.target.value
                )
              }
              placeholder="Add company or symbol"
              aria-label="Add company or symbol"
            />


            <datalist id="company-suggestions">

              <option value="INFOSYS">
                Infosys
              </option>

              <option value="INFY">
                Infosys
              </option>

              <option value="TCS">
                Tata Consultancy Services
              </option>

              <option value="RELIANCE">
                Reliance Industries
              </option>

              <option value="HDFCBANK">
                HDFC Bank
              </option>

              <option value="ICICIBANK">
                ICICI Bank
              </option>

              <option value="SBIN">
                State Bank of India
              </option>

              <option value="WIPRO">
                Wipro
              </option>

              <option value="HCLTECH">
                HCL Technologies
              </option>

              <option value="ITC">
                ITC
              </option>

              <option value="BHARTIARTL">
                Bharti Airtel
              </option>

              <option value="LT">
                Larsen & Toubro
              </option>

              <option value="AXISBANK">
                Axis Bank
              </option>

              <option value="KOTAKBANK">
                Kotak Mahindra Bank
              </option>

              <option value="MARUTI">
                Maruti Suzuki
              </option>

              <option value="SUNPHARMA">
                Sun Pharmaceutical
              </option>

              <option value="TITAN">
                Titan Company
              </option>

              <option value="TATAMOTORS">
                Tata Motors
              </option>

              <option value="TATASTEEL">
                Tata Steel
              </option>

              <option value="AAPL">
                Apple
              </option>

              <option value="MSFT">
                Microsoft
              </option>

              <option value="NVDA">
                NVIDIA
              </option>

              <option value="TSLA">
                Tesla
              </option>

            </datalist>


            <button
              type="submit"
              disabled={isAdding}
            >
              {isAdding ? '...' : '+'}
            </button>

          </form>

        </aside>


        {/* =================================================
            QUOTE PANEL
        ================================================= */}

        <div className="quote-panel">

          <div className="quote-toolbar">

            <div>

              <p className="eyebrow">
                CHANGE ENGINE
              </p>

              <h2>
                {
                  isChecking
                    ? 'Checking your radar...'
                    : `${attentionCount} need attention`
                }
              </h2>

            </div>


            <button
              className="check-button"
              type="button"
              onClick={checkWatchlist}
              disabled={isChecking}
            >
              {
                isChecking
                  ? 'Checking'
                  : 'Check all'
              }
            </button>

          </div>


          {/* =============================================
              INSPECT
          ============================================= */}

          <form
            className="search-bar"
            onSubmit={event => {

              event.preventDefault()

              const typedSymbol =
                searchSymbol
                  .trim()
                  .toUpperCase()

              if (!typedSymbol) {
                return
              }

              const finalSymbol =
                SYMBOL_ALIASES[typedSymbol] ||
                typedSymbol

              selectSymbol({
                symbol: finalSymbol,
              })

            }}
          >

            <label htmlFor="symbol-search">
              Inspect a symbol
            </label>

            <div className="search-controls">

              <input
                id="symbol-search"
                value={searchSymbol}
                onChange={event =>
                  setSearchSymbol(
                    event.target.value
                  )
                }
                placeholder="e.g. INFOSYS or TCS"
              />

              <button type="submit">
                Inspect
              </button>

            </div>

          </form>


          {/* =============================================
              QUOTE CARD
          ============================================= */}

          <div className="quote-card">

            <div className="quote-card-header">

              <div>

                <p className="eyebrow">
                  CURRENT SIGNAL
                </p>

                <h2>
                  {selectedSymbol || '--'}
                </h2>

              </div>


              {selectedRow && (

                <div className="quote-status">

                  <span
                    className={`market-badge ${
                      selectedRow.market_status ===
                      'OPEN'
                        ? 'open'
                        : 'closed'
                    }`}
                  >
                    {
                      selectedRow.market_status ===
                      'OPEN'
                        ? 'MARKET OPEN'
                        : 'MARKET CLOSED'
                    }
                  </span>


                  <span
                    className={
                      selectedRow.is_stale
                        ? 'freshness stale'
                        : 'freshness'
                    }
                  >
                    {
                      selectedRow.is_stale
                        ? 'STALE'
                        : selectedRow.freshness ||
                          'FRESH'
                    }
                  </span>

                </div>

              )}

            </div>


            {/* ===========================================
                EMPTY STATE
            =========================================== */}

            {!selectedRow && (

              <div className="empty-state">

                <span className="pulse-mark">
                  +
                </span>

                <p>
                  Select a company
                  or check your radar.
                </p>

              </div>

            )}


            {/* ===========================================
                QUOTE DATA
            =========================================== */}

            {selectedRow && (

              <div className="quote-content">

                <div className="price-block">

                  <span className="price-label">
                    Last price
                  </span>

                  <strong>

                    {
                      selectedRow.currency ===
                      'INR'
                        ? '₹'
                        : '$'
                    }

                    {
                      selectedRow.current_price ??
                      selectedRow.price ??
                      '--'
                    }

                  </strong>


                  <span
                    className={
                      selectedRow.is_stale
                        ? 'delayed'
                        : 'positive'
                    }
                  >
                    {
                      selectedRow.is_stale
                        ? 'Market data delayed'
                        : 'Latest market data'
                    }
                  </span>

                </div>


                <div className="metrics">

                  <div>

                    <span>
                      Change
                    </span>

                    <strong>
                      {
                        selectedRow.change_percent ==
                        null
                          ? 'First check'
                          : `${selectedRow.change_percent}%`
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Volume
                    </span>

                    <strong>
                      {
                        selectedRow.volume ??
                        '--'
                      }
                    </strong>

                  </div>


                  <div>

                    <span>
                      Signal
                    </span>

                    <strong>
                      {
                        selectedRow.attention ||
                        'LOW'
                      }
                    </strong>

                  </div>

                </div>


                <p className="signal-message">
                  {
                    selectedRow.message ||
                    'Latest quote loaded.'
                  }
                </p>

              </div>

            )}

          </div>

        </div>

      </section>


      {/* =================================================
          FOOTER
      ================================================= */}

      <footer>

        <span>
          MARKETPULSE / PUBLIC RADAR
        </span>

        <span>
          One link. A clearer market check.
        </span>

      </footer>

    </main>
  )
}


export default App