import { useEffect, useEffectEvent, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'
const STORAGE_KEY = 'marketpulse-watchlist'
const REFRESH_INTERVAL_MS = 60_000
const DEFAULT_SYMBOLS = [
  { symbol: 'AAPL', stock_name: 'Apple' },
  { symbol: 'MSFT', stock_name: 'Microsoft' },
  { symbol: 'NVDA', stock_name: 'NVIDIA' },
  { symbol: 'TSLA', stock_name: 'Tesla' },
]

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
  const [shareMessage, setShareMessage] = useState('Share radar')

  const tokenHeaders = (token) => ({
    'X-Watchlist-Token': token || watchlist?.access_token,
  })

  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(body.detail || 'Something went wrong')
    }
    return response.json()
  }

  function saveWatchlist(nextWatchlist) {
    setWatchlist(nextWatchlist)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      id: nextWatchlist.id,
      access_token: nextWatchlist.access_token,
    }))
  }

  async function loadPublicWatchlist() {
    setStatus('loading')
    setError('')
    try {
      const query = new URLSearchParams(window.location.search)
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      const id = query.get('watchlist') || saved?.id
      const accessToken = query.get('token') || saved?.access_token

      if (id && accessToken) {
        const loaded = await request(`/watchlist/${id}`)
        saveWatchlist({ ...loaded, access_token: accessToken })
        setStatus('ready')
        return
      }

      const created = await request('/watchlist/', {
        method: 'POST',
        body: JSON.stringify({ name: 'Daily focus' }),
      })
      saveWatchlist(created)
      for (const item of DEFAULT_SYMBOLS) {
        await request(`/watchlist/${created.id}/stocks`, {
          method: 'POST',
          headers: tokenHeaders(created.access_token),
          body: JSON.stringify(item),
        })
      }
      const loaded = await request(`/watchlist/${created.id}`)
      saveWatchlist({ ...loaded, access_token: created.access_token })
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    }
  }

  async function checkWatchlist() {
    if (!watchlist) return
    setIsChecking(true)
    setError('')
    try {
      const result = await request(`/market/watchlist/${watchlist.id}/changes`, {
        headers: tokenHeaders(),
      })
      setRows(result.stocks)
      const selected = result.stocks.find((item) => item.symbol === selectedSymbol) || result.stocks[0]
      if (selected?.current_price) {
        setSelectedSymbol(selected.symbol)
        setQuote(selected)
      }
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsChecking(false)
    }
  }

  async function addSymbol(event) {
    event.preventDefault()
    const cleanSymbol = newSymbol.trim().toUpperCase()
    if (!cleanSymbol || !watchlist) return
    setIsAdding(true)
    setError('')
    try {
      await request(`/watchlist/${watchlist.id}/stocks`, {
        method: 'POST',
        headers: tokenHeaders(),
        body: JSON.stringify({ symbol: cleanSymbol, stock_name: cleanSymbol }),
      })
      const loaded = await request(`/watchlist/${watchlist.id}`)
      saveWatchlist({ ...loaded, access_token: watchlist.access_token })
      setSelectedSymbol(cleanSymbol)
      setNewSymbol('')
      await checkWatchlist()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setIsAdding(false)
    }
  }

  async function removeSymbol(stockId) {
    try {
      await request(`/watchlist/${watchlist.id}/stocks/${stockId}`, {
        method: 'DELETE',
        headers: tokenHeaders(),
      })
      const loaded = await request(`/watchlist/${watchlist.id}`)
      saveWatchlist({ ...loaded, access_token: watchlist.access_token })
      setRows((currentRows) => currentRows.filter((row) => row.id !== stockId))
      const removedSymbol = watchlist.stocks.find((item) => item.id === stockId)?.symbol
      if (removedSymbol === selectedSymbol) {
        const nextSymbol = loaded.stocks[0]?.symbol || ''
        setSelectedSymbol(nextSymbol)
        setQuote(null)
        setSearchSymbol('')
      }
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function selectSymbol(item) {
    setSelectedSymbol(item.symbol)
    const existingRow = rows.find((row) => row.symbol === item.symbol)
    if (existingRow?.current_price) {
      setQuote(existingRow)
      return
    }
    try {
      setStatus('loading')
      const result = await request(`/market/quote/${item.symbol}`)
      setQuote(result)
      setStatus('ready')
    } catch (requestError) {
      setError(requestError.message)
      setStatus('error')
    }
  }

  async function shareWatchlist() {
    const url = `${window.location.origin}?watchlist=${watchlist.id}&token=${watchlist.access_token}`
    await navigator.clipboard.writeText(url)
    setShareMessage('Link copied')
    window.setTimeout(() => setShareMessage('Share radar'), 1800)
  }

  const initializeWatchlist = useEffectEvent(loadPublicWatchlist)
  const refreshWatchlist = useEffectEvent(checkWatchlist)

  useEffect(() => {
    const timer = window.setTimeout(initializeWatchlist, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!watchlist?.stocks?.length) return undefined
    const timer = window.setTimeout(refreshWatchlist, 0)
    return () => window.clearTimeout(timer)
  }, [watchlist?.id, watchlist?.stocks?.length])

  useEffect(() => {
    if (!watchlist?.stocks?.length) return undefined
    const timer = window.setInterval(refreshWatchlist, REFRESH_INTERVAL_MS)
    return () => window.clearInterval(timer)
  }, [watchlist?.id, watchlist?.stocks?.length])

  const selectedRow = rows.find((row) => row.symbol === selectedSymbol) || quote
  const attentionCount = rows.filter((row) => row.meaningful_change).length

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="MarketPulse home">
          <span className="brand-mark">M</span>
          <span>MarketPulse</span>
        </a>
        <div className="topbar-actions">
          <span className="market-status"><span className="status-dot" />Auto-refresh 60s</span>
          {watchlist && <button className="text-button" type="button" onClick={shareWatchlist}>{shareMessage}</button>}
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">PUBLIC MARKET RADAR</p>
        <h1>Know what moved.</h1>
        <p className="intro-copy">A shared watchlist that turns the latest market data into a clear signal about what deserves your attention.</p>
      </section>

      {status === 'error' && <div className="page-error">{error}. Start the backend and refresh the page.</div>}
      <section className="workspace" aria-label="Market quote dashboard">
        <aside className="watchlist-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">{watchlist?.name || 'WATCHLIST'}</p>
              <h2>Daily focus</h2>
            </div>
            <span className="count">{attentionCount || watchlist?.stocks?.length || 0}</span>
          </div>
          <div className="symbol-list">
            {watchlist?.stocks?.map((item) => {
              const row = rows.find((entry) => entry.symbol === item.symbol)
              return (
                <div className={`symbol-row ${selectedSymbol === item.symbol ? 'selected' : ''}`} key={item.id}>
                  <button className="symbol-select" type="button" onClick={() => selectSymbol(item)}>
                    <span className="symbol-icon">{item.symbol.slice(0, 1)}</span>
                    <span className="symbol-name"><strong>{item.symbol}</strong><small>{row?.attention ? `${row.attention} attention` : 'Not checked yet'}</small></span>
                  </button>
                  <button className="remove-button" type="button" onClick={() => removeSymbol(item.id)} aria-label={`Remove ${item.symbol}`}>x</button>
                </div>
              )
            })}
          </div>
          <form className="add-form" onSubmit={addSymbol}>
            <input value={newSymbol} onChange={(event) => setNewSymbol(event.target.value)} placeholder="Add symbol" aria-label="Add symbol" />
            <button type="submit" disabled={isAdding}>{isAdding ? '...' : '+'}</button>
          </form>
        </aside>

        <div className="quote-panel">
          <div className="quote-toolbar">
            <div><p className="eyebrow">CHANGE ENGINE</p><h2>{isChecking ? 'Checking your radar...' : `${attentionCount} need attention`}</h2></div>
            <button className="check-button" type="button" onClick={checkWatchlist} disabled={isChecking}>{isChecking ? 'Checking' : 'Check all'}</button>
          </div>
          <form className="search-bar" onSubmit={(event) => { event.preventDefault(); selectSymbol({ symbol: searchSymbol.trim().toUpperCase() }) }}>
            <label htmlFor="symbol-search">Inspect a symbol</label>
            <div className="search-controls">
              <input id="symbol-search" value={searchSymbol} onChange={(event) => setSearchSymbol(event.target.value)} placeholder="e.g. RELIANCE.NS" />
              <button type="submit">Inspect</button>
            </div>
          </form>

          <div className="quote-card">
            <div className="quote-card-header">
              <div><p className="eyebrow">CURRENT SIGNAL</p><h2>{selectedSymbol || '--'}</h2></div>
              {selectedRow && <div className="quote-status"><span className={`market-badge ${selectedRow.market_status === 'OPEN' ? 'open' : 'closed'}`}>{selectedRow.market_status === 'OPEN' ? 'MARKET OPEN' : 'MARKET CLOSED'}</span><span className={selectedRow.is_stale ? 'freshness stale' : 'freshness'}>{selectedRow.is_stale ? 'STALE' : selectedRow.freshness}</span></div>}
            </div>
            {!selectedRow && <div className="empty-state"><span className="pulse-mark">+</span><p>Select a symbol or check your radar.</p></div>}
            {selectedRow && (
              <div className="quote-content">
                <div className="price-block"><span className="price-label">Last price</span><strong>${selectedRow.current_price ?? selectedRow.price}</strong><span className={selectedRow.is_stale ? 'delayed' : 'positive'}>{selectedRow.is_stale ? 'Market data delayed' : 'Market open'}</span></div>
                <div className="metrics"><div><span>Change</span><strong>{selectedRow.change_percent == null ? 'First check' : `${selectedRow.change_percent}%`}</strong></div><div><span>Volume</span><strong>{selectedRow.volume ?? '--'}</strong></div><div><span>Signal</span><strong>{selectedRow.attention || 'LOW'}</strong></div></div>
                <p className="signal-message">{selectedRow.message || 'Latest quote loaded.'}</p>
              </div>
            )}
          </div>
        </div>
      </section>
      <footer><span>MARKETPULSE / PUBLIC RADAR</span><span>One link. A clearer market check.</span></footer>
    </main>
  )
}

export default App
