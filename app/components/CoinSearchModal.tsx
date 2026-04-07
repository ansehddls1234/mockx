'use client'

import { useEffect, useRef, useState } from 'react'

interface Coin {
  symbol: string
  name: string
  price: string
  change: string
  isUp: boolean
}

export default function CoinSearchModal({
  onSelect,
  onClose,
}: {
  onSelect: (symbol: string) => void
  onClose: () => void
}) {
  const [coins, setCoins] = useState<Coin[]>([])
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    fetch('https://api.binance.com/api/v3/ticker/24hr')
      .then(res => res.json())
      .then(data => {
        const usdt = data
          .filter((d: { symbol: string; quoteVolume: string }) => d.symbol.endsWith('USDT'))
          .sort((a: { quoteVolume: string }, b: { quoteVolume: string }) =>
            parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume)
          )
          .slice(0, 100)
          .map((d: { symbol: string; lastPrice: string; priceChangePercent: string }) => ({
            symbol: d.symbol,
            name:   d.symbol.replace('USDT', ''),
            price:  parseFloat(d.lastPrice).toLocaleString('en-US', { maximumFractionDigits: 4 }),
            change: `${parseFloat(d.priceChangePercent) >= 0 ? '+' : ''}${parseFloat(d.priceChangePercent).toFixed(2)}%`,
            isUp:   parseFloat(d.priceChangePercent) >= 0,
          }))
        setCoins(usdt)
      })
  }, [])

  const filtered = coins.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxHeight: '80vh',
          background: '#111318',
          borderRadius: '16px 16px 0 0',
          display: 'flex', flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
          <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '2px' }} />
        </div>

        {/* 검색 */}
        <div style={{ padding: '0 16px 12px' }}>
          <input
            ref={inputRef}
            type="text"
            placeholder="코인 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', background: '#1a1d25',
              border: '1px solid #2a2d35', borderRadius: '10px',
              padding: '10px 14px', fontSize: '14px',
              color: 'white', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 헤더 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '6px 16px', fontSize: '11px', color: '#4a4e63',
          borderBottom: '1px solid #222',
        }}>
          <span>코인</span>
          <span>가격 / 변동률</span>
        </div>

        {/* 목록 */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(coin => (
            <div
              key={coin.symbol}
              onClick={() => { onSelect(coin.symbol); onClose() }}
              style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '12px 16px',
                borderBottom: '1px solid #1a1a1a', cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: '#1a1d25',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '9px', fontWeight: 'bold', color: '#00d4aa',
                }}>
                  {coin.name.slice(0, 2)}
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>{coin.name}</div>
                  <div style={{ fontSize: '11px', color: '#4a4e63' }}>/ USDT</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', color: 'white', fontFamily: 'monospace' }}>{coin.price}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: coin.isUp ? '#00d4aa' : '#ff4d6a' }}>
                  {coin.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
