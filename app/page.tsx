'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Chart from './components/Chart'
import OrderBook from './components/OrderBook'
import OrderPanel from './components/OrderPanel'
import BottomPanel from './components/BottomPanel'
import CoinSearchModal from './components/CoinSearchModal'

interface Position {
  id: string
  symbol: string
  type: string
  entryPrice: number
  margin: number
  leverage: number
  quantity: number
  liquidationPrice: number
  status: string
}

type MobileTab = 'chart' | 'orderbook' | 'order' | 'positions'

function HomeContent() {
  const searchParams  = useSearchParams()
  const initialSymbol = searchParams.get('symbol') ?? 'BTCUSDT'

  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol)
  const [currentPrice, setCurrentPrice]     = useState(0)
  const [positions, setPositions]           = useState<Position[]>([])
  const [bottomKey, setBottomKey]           = useState(0)
  const [isMobile, setIsMobile]             = useState(false)
  const [mobileTab, setMobileTab]           = useState<MobileTab>('chart')
  const [showCoinModal, setShowCoinModal]   = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadPositions = useCallback(async () => {
    const stored = localStorage.getItem('user')
    if (!stored) return
    const user = JSON.parse(stored)
    const res = await fetch(`/api/position?userId=${user.id}&status=open`)
    const data = await res.json()
    setPositions(data.positions ?? [])
  }, [])

  useEffect(() => { loadPositions() }, [loadPositions])

  useEffect(() => {
  const update = () => {
    fetch(`/api/ticker?symbol=${selectedSymbol}`)
      .then(res => res.json())
      .then(data => {
        if (data.lastPrice) setCurrentPrice(parseFloat(data.lastPrice))
      })
  }
  update()
  const interval = setInterval(update, 2000)
  return () => clearInterval(interval)
}, [selectedSymbol])

  const handleOrderOrClose = () => {
    setBottomKey(k => k + 1)
    loadPositions()
  }

  // ── 모바일 레이아웃 ──
  if (isMobile) {
    return (
      <div style={{
        background: '#0a0b0e',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Navbar */}
        <Navbar />

        {/* 코인 선택 바 */}
        <div style={{
          background: '#111318',
          borderBottom: '1px solid #222',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setShowCoinModal(true)}
            style={{
              background: 'transparent', border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              cursor: 'pointer', padding: 0,
            }}
          >
            <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
              {selectedSymbol.replace('USDT', '')}
            </span>
            <span style={{ fontSize: '12px', color: '#4a4e63' }}>/USDT</span>
            <span style={{ fontSize: '12px', color: '#8b8fa8' }}>▼</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontSize: '15px', fontWeight: 'bold',
              fontFamily: 'monospace', color: '#00d4aa',
            }}>
              {currentPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}
            </span>
            <span style={{
              fontSize: '10px', background: 'rgba(0,212,170,0.1)',
              color: '#00d4aa', padding: '2px 6px', borderRadius: '4px',
            }}>
              실시간
            </span>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {mobileTab === 'chart' && (
            <Chart key={selectedSymbol} symbol={selectedSymbol} positions={positions} />
          )}
          {mobileTab === 'orderbook' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <OrderBook symbol={selectedSymbol} />
            </div>
          )}
          {mobileTab === 'order' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <OrderPanel symbol={selectedSymbol} onOrderPlaced={handleOrderOrClose} />
            </div>
          )}
          {mobileTab === 'positions' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <BottomPanel
                key={bottomKey}
                symbol={selectedSymbol}
                currentPrice={currentPrice}
                onClose={handleOrderOrClose}
              />
            </div>
          )}
        </div>

        {/* 하단 탭 */}
        <div style={{
          background: '#111318',
          borderTop: '1px solid #222',
          display: 'flex',
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {([
            { key: 'chart',     label: '차트',   icon: '📈' },
            { key: 'orderbook', label: '호가',   icon: '📋' },
            { key: 'order',     label: '주문',   icon: '💱' },
            { key: 'positions', label: '포지션', icon: '📊' },
          ] as { key: MobileTab; label: string; icon: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setMobileTab(tab.key)}
              style={{
                flex: 1, padding: '10px 4px',
                background: 'transparent', border: 'none',
                borderTop: `2px solid ${mobileTab === tab.key ? '#00d4aa' : 'transparent'}`,
                color: mobileTab === tab.key ? '#00d4aa' : '#4a4e63',
                fontSize: '10px', cursor: 'pointer',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: '2px',
              }}
            >
              <span style={{ fontSize: '18px' }}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {showCoinModal && (
          <CoinSearchModal
            onSelect={setSelectedSymbol}
            onClose={() => setShowCoinModal(false)}
          />
        )}
      </div>
    )
  }

  // ── 데스크톱 레이아웃 ──
  return (
    <div style={{
      background: '#0a0b0e',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <Navbar />

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{
            padding: '8px 16px', borderBottom: '1px solid #222',
            display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'monospace', fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
              {selectedSymbol.replace('USDT', '')}
            </span>
            <span style={{ fontSize: '13px', color: '#4a4e63' }}>/ USDT</span>
            <span style={{
              fontSize: '11px', background: 'rgba(0,212,170,0.1)',
              color: '#00d4aa', padding: '2px 8px', borderRadius: '4px',
            }}>
              실시간
            </span>
          </div>

          <div style={{ flex: 7, minHeight: 0, display: 'flex' }}>
            <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
              <Chart key={selectedSymbol} symbol={selectedSymbol} positions={positions} />
            </div>
            <OrderBook symbol={selectedSymbol} />
          </div>

          <div style={{ flex: 3, minHeight: 0, borderTop: '1px solid #222' }}>
            <BottomPanel
              key={bottomKey}
              symbol={selectedSymbol}
              currentPrice={currentPrice}
              onClose={handleOrderOrClose}
            />
          </div>
        </div>

        <OrderPanel symbol={selectedSymbol} onOrderPlaced={handleOrderOrClose} />
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  )
}
