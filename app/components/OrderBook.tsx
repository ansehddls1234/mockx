'use client'

import { useEffect, useRef, useState } from 'react'

interface Level {
  price: number
  size: number
  total: number
}

export default function OrderBook({ symbol = 'BTCUSDT' }: { symbol?: string }) {
  const [asks, setAsks] = useState<Level[]>([])
  const [bids, setBids] = useState<Level[]>([])
  const [lastPrice, setLastPrice] = useState<number>(0)
  const [lastPriceUp, setLastPriceUp] = useState(true)
  const prevPriceRef = useRef(0)

  useEffect(() => {
    const fetchOrderBook = () => {
      fetch(`/api/orderbook?symbol=${symbol}`)
        .then(res => res.json())
        .then(data => {
          if (!data.asks || !data.bids) return
          const processLevels = (levels: [string, string][]): Level[] => {
            let cumTotal = 0
            return levels.slice(0, 14).map(([price, size]) => {
              const p = parseFloat(price)
              const s = parseFloat(size)
              cumTotal += s
              return { price: p, size: s, total: cumTotal }
            })
          }
          setAsks(processLevels([...data.asks].reverse()))
          setBids(processLevels(data.bids))
        })
    }

    const fetchTicker = () => {
      fetch(`/api/ticker?symbol=${symbol}`)
        .then(res => res.json())
        .then(data => {
          if (!data.lastPrice) return
          const price = parseFloat(data.lastPrice)
          setLastPriceUp(price >= prevPriceRef.current)
          prevPriceRef.current = price
          setLastPrice(price)
        })
    }

    fetchOrderBook()
    fetchTicker()
    const interval = setInterval(() => {
      fetchOrderBook()
      fetchTicker()
    }, 2000)
    return () => clearInterval(interval)
  }, [symbol])

  const maxTotal = Math.max(asks[0]?.total ?? 1, bids[0]?.total ?? 1)

  const formatPrice = (p: number) =>
    p >= 1000
      ? p.toLocaleString('en-US', { maximumFractionDigits: 1 })
      : p.toFixed(4)

  const formatSize = (s: number) =>
    s >= 1000
      ? s.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : s.toFixed(3)

  return (
    <div style={{
      width: '200px', flexShrink: 0, background: '#111318',
      borderLeft: '1px solid #222', display: 'flex',
      flexDirection: 'column', fontSize: '11px', fontFamily: 'monospace',
    }}>
      <div style={{ padding: '8px 10px', borderBottom: '1px solid #222', fontSize: '12px', fontWeight: 'bold', color: '#8b8fa8' }}>
        오더북
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 10px', color: '#4a4e63', fontSize: '10px', borderBottom: '1px solid #1a1d25' }}>
        <span>가격(USDT)</span><span>수량</span><span>누적</span>
      </div>
      <div style={{ flex: 1, overflowY: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {asks.map((level, i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(level.total / maxTotal) * 100}%`, background: 'rgba(255,77,106,0.08)' }} />
            <span style={{ color: '#ff4d6a', zIndex: 1 }}>{formatPrice(level.price)}</span>
            <span style={{ color: '#8b8fa8', zIndex: 1 }}>{formatSize(level.size)}</span>
            <span style={{ color: '#4a4e63', zIndex: 1 }}>{formatSize(level.total)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 10px', borderTop: '1px solid #1a1d25', borderBottom: '1px solid #1a1d25', display: 'flex', alignItems: 'center', gap: '6px', background: '#0a0b0e' }}>
        <span style={{ fontSize: '14px', fontWeight: 'bold', color: lastPriceUp ? '#00d4aa' : '#ff4d6a' }}>
          {formatPrice(lastPrice)}
        </span>
        <span style={{ fontSize: '10px', color: lastPriceUp ? '#00d4aa' : '#ff4d6a' }}>
          {lastPriceUp ? '▲' : '▼'}
        </span>
      </div>
      <div style={{ flex: 1, overflowY: 'hidden' }}>
        {bids.map((level, i) => (
          <div key={i} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '2px 10px' }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${(level.total / maxTotal) * 100}%`, background: 'rgba(0,212,170,0.08)' }} />
            <span style={{ color: '#00d4aa', zIndex: 1 }}>{formatPrice(level.price)}</span>
            <span style={{ color: '#8b8fa8', zIndex: 1 }}>{formatSize(level.size)}</span>
            <span style={{ color: '#4a4e63', zIndex: 1 }}>{formatSize(level.total)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: '6px 10px', borderTop: '1px solid #222' }}>
        {(() => {
          const totalBid = bids.reduce((a, b) => a + b.size, 0)
          const totalAsk = asks.reduce((a, b) => a + b.size, 0)
          const total = totalBid + totalAsk
          const longPct = total > 0 ? Math.round((totalBid / total) * 100) : 50
          const shortPct = 100 - longPct
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ color: '#00d4aa' }}>롱 {longPct}%</span>
                <span style={{ color: '#ff4d6a' }}>숏 {shortPct}%</span>
              </div>
              <div style={{ display: 'flex', height: '3px', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${longPct}%`, background: '#00d4aa' }} />
                <div style={{ width: `${shortPct}%`, background: '#ff4d6a' }} />
              </div>
            </>
          )
        })()}
      </div>
    </div>
  )
}