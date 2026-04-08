'use client'

import { useEffect, useState } from 'react'

interface Coin {
  symbol: string
  name: string
  price: number
  change: number
}

interface SidebarProps {
  selectedSymbol: string
  onSelect: (symbol: string) => void
}

export default function Sidebar({ selectedSymbol, onSelect }: SidebarProps) {
  const [coins, setCoins] = useState<Coin[]>([])
  const [search, setSearch] = useState('')

  // 1. 초기 코인 목록
  useEffect(() => {
    fetch('/api/ticker')
      .then(res => res.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const usdt = data
          .filter((d: { symbol: string }) => d.symbol.endsWith('-USDT'))
          .sort((a: { volCcy24h: number }, b: { volCcy24h: number }) =>
            b.volCcy24h - a.volCcy24h
          )
          .slice(0, 100)
          .map((d: { symbol: string; lastPrice: number; change24h: number }) => ({
            symbol: d.symbol,
            name:   d.symbol.replace('-USDT', ''),
            price:  d.lastPrice,
            change: d.change24h,
          }))
        setCoins(usdt)
      })
  }, [])

  // 2. 실시간 업데이트
  useEffect(() => {
    if (!coins.length) return
    const interval = setInterval(() => {
      fetch('/api/ticker')
        .then(res => res.json())
        .then(data => {
          if (!Array.isArray(data)) return
          const map: Record<string, { lastPrice: number; change24h: number }> = {}
          data.forEach((d: { symbol: string; lastPrice: number; change24h: number }) => {
            map[d.symbol] = d
          })
          setCoins(prev => prev.map(coin => {
            const update = map[coin.symbol]
            if (!update) return coin
            return {
              ...coin,
              price:  update.lastPrice,
              change: update.change24h,
            }
          }))
        })
    }, 3000)
    return () => clearInterval(interval)
  }, [coins.length])

  const filtered = coins.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{
      width: '180px',
      background: '#111318',
      borderRight: '1px solid #222',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* 검색 */}
      <div style={{ padding: '8px', borderBottom: '1px solid #222' }}>
        <input
          type="text"
          placeholder="코인 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: '#1a1d25',
            border: '1px solid #2a2d35',
            borderRadius: '6px',
            padding: '6px 8px',
            fontSize: '11px',
            color: 'white',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 헤더 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '5px 10px',
        fontSize: '10px',
        color: '#4a4e63',
        borderBottom: '1px solid #222',
      }}>
        <span>코인</span>
        <span>변동률</span>
      </div>

      {/* 코인 목록 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map(coin => (
          <div
            key={coin.symbol}
            onClick={() => onSelect(coin.symbol)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 10px',
              cursor: 'pointer',
              borderBottom: '1px solid #1a1a1a',
              borderLeft: `2px solid ${selectedSymbol === coin.symbol ? '#00d4aa' : 'transparent'}`,
              background: selectedSymbol === coin.symbol ? '#1a1d25' : 'transparent',
            }}
          >
            <div style={{
              width: '24px', height: '24px',
              borderRadius: '50%',
              background: '#222',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', fontWeight: 'bold', color: '#00d4aa',
              flexShrink: 0,
            }}>
              {coin.name.slice(0, 2)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'white' }}>
                {coin.name}
              </div>
              <div style={{ fontSize: '10px', color: '#8b8fa8', fontFamily: 'monospace' }}>
                {coin.price.toLocaleString('en-US', { maximumFractionDigits: 6 })}
              </div>
            </div>

            <div style={{
              fontSize: '10px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: coin.change >= 0 ? '#00d4aa' : '#ff4d6a',
              flexShrink: 0,
            }}>
              {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}