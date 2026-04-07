'use client'

import { useState, useEffect, useRef } from 'react'

interface User {
  id: string
  name: string
  balance: number
}

export default function OrderPanel({
  symbol = 'BTCUSDT',
  onOrderPlaced,
}: {
  symbol?: string
  onOrderPlaced?: () => void
}) {
  const [tab, setTab]           = useState<'long' | 'short'>('long')
  const [amount, setAmount]     = useState('')
  const [leverage, setLeverage] = useState(10)
  const [user, setUser]         = useState<User | null>(null)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const priceRef                = useRef<number>(0)
  const displayPriceRef         = useRef<HTMLSpanElement>(null)

  const isLong   = tab === 'long'
  const coinName = symbol.replace('USDT', '')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return
    setUser(JSON.parse(stored))
  }, [])

  useEffect(() => {
  const update = () => {
    fetch(`/api/ticker?symbol=${symbol}`)
      .then(res => res.json())
      .then(data => {
        if (!data.lastPrice) return
        const price = parseFloat(data.lastPrice)
        priceRef.current = price
        if (displayPriceRef.current) {
          displayPriceRef.current.textContent = price.toLocaleString('en-US', { maximumFractionDigits: 4 })
        }
      })
  }
  update()
  const interval = setInterval(update, 2000)
  return () => clearInterval(interval)
}, [symbol])

  useEffect(() => {
    setAmount('')
    setMsg('')
  }, [tab, symbol])

  const margin           = amount ? parseFloat(amount) : 0
  const positionSize     = margin * leverage
  const estimatedQty     = priceRef.current > 0
    ? (positionSize / priceRef.current).toFixed(6)
    : '0.000000'
  const liquidationPrice = priceRef.current > 0
    ? isLong
      ? (priceRef.current * (1 - 1 / leverage)).toFixed(4)
      : (priceRef.current * (1 + 1 / leverage)).toFixed(4)
    : '--'

  const handlePct = (pct: number) => {
    if (!user) return
    setAmount(String(Math.floor(user.balance * pct / 100)))
  }

  const handleOrder = async () => {
    if (!user) { setMsg('로그인이 필요해요!'); return }
    if (!amount || parseFloat(amount) <= 0) { setMsg('증거금을 입력해주세요'); return }
    if (parseFloat(amount) > user.balance) { setMsg('잔고가 부족해요'); return }

    setLoading(true)
    setMsg('')

    const res = await fetch('/api/position', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId:           user.id,
        symbol,
        type:             tab,
        leverage,
        margin:           parseFloat(amount),
        entryPrice:       priceRef.current,
        quantity:         parseFloat(estimatedQty),
        liquidationPrice: parseFloat(liquidationPrice),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setMsg(data.error); return }

    const updatedUser = { ...user, balance: data.balance }
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setMsg(`${isLong ? '롱' : '숏'} 포지션 오픈! 🚀`)
    setAmount('')
    onOrderPlaced?.()
  }

  return (
    <div style={{
      width: '280px',
      background: '#111318',
      borderLeft: '1px solid #222',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflowY: 'auto',
    }}>
      {/* 롱/숏 탭 */}
      <div style={{ display: 'flex', flexShrink: 0 }}>
        {(['long', 'short'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px',
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === t ? (t === 'long' ? '#00d4aa' : '#ff4d6a') : '#222'}`,
              color: tab === t ? (t === 'long' ? '#00d4aa' : '#ff4d6a') : '#4a4e63',
              fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
            }}
          >
            {t === 'long' ? '🟢 롱' : '🔴 숏'}
          </button>
        ))}
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>

        {/* 잔고 */}
        <div style={{
          background: '#1a1d25', borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '11px', color: '#4a4e63' }}>가용 잔고</span>
          <span style={{ fontSize: '12px', color: 'white', fontFamily: 'monospace' }}>
            {user ? user.balance.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'} USDT
          </span>
        </div>

        {/* 현재가 */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: '#4a4e63' }}>현재가</span>
          <span style={{ fontSize: '12px', color: '#00d4aa', fontFamily: 'monospace' }}>
            <span ref={displayPriceRef}>--</span> USDT
          </span>
        </div>

        {/* 레버리지 */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#4a4e63' }}>레버리지</span>
            <span style={{
              fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace',
              color: leverage >= 50 ? '#ff4d6a' : leverage >= 20 ? '#f0b90b' : '#00d4aa',
            }}>
              {leverage}x
            </span>
          </div>
          <input
            type="range" min={1} max={125} value={leverage}
            onChange={e => setLeverage(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#00d4aa' }}
          />
          <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
            {[1, 5, 10, 25, 50, 100].map(lv => (
              <button
                key={lv}
                onClick={() => setLeverage(lv)}
                style={{
                  flex: 1, padding: '3px',
                  background: leverage === lv ? '#1a1d25' : 'transparent',
                  border: `1px solid ${leverage === lv ? '#00d4aa' : '#2a2d35'}`,
                  borderRadius: '4px',
                  color: leverage === lv ? '#00d4aa' : '#4a4e63',
                  fontSize: '10px', cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                {lv}x
              </button>
            ))}
          </div>
        </div>

        {/* 증거금 입력 */}
        <div>
          <div style={{ fontSize: '11px', color: '#4a4e63', marginBottom: '6px' }}>증거금 (USDT)</div>
          <input
            type="number" value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0"
            style={{
              width: '100%', background: '#1a1d25',
              border: '1px solid #2a2d35', borderRadius: '8px',
              padding: '10px 12px', fontSize: '14px',
              color: 'white', outline: 'none',
              fontFamily: 'monospace', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* 퍼센트 */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[25, 50, 75, 100].map(pct => (
            <button key={pct} onClick={() => handlePct(pct)} style={{
              flex: 1, padding: '5px',
              background: '#1a1d25', border: '1px solid #2a2d35',
              borderRadius: '6px', color: '#8b8fa8',
              fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace',
            }}>
              {pct}%
            </button>
          ))}
        </div>

        {/* 포지션 정보 */}
        <div style={{
          background: '#1a1d25', borderRadius: '8px',
          padding: '10px 12px',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#4a4e63' }}>포지션 크기</span>
            <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
              {positionSize.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#4a4e63' }}>예상 수량</span>
            <span style={{ fontSize: '11px', color: 'white', fontFamily: 'monospace' }}>
              {estimatedQty} {coinName}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#4a4e63' }}>청산가격</span>
            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ff4d6a', fontWeight: 'bold' }}>
              {liquidationPrice} USDT
            </span>
          </div>
        </div>

        {/* 고레버리지 경고 */}
        {leverage >= 20 && (
          <div style={{
            background: 'rgba(255,77,106,0.08)',
            border: '1px solid rgba(255,77,106,0.3)',
            borderRadius: '8px', padding: '8px',
            fontSize: '11px', color: '#ff4d6a', textAlign: 'center',
          }}>
            ⚠️ 고레버리지는 빠른 청산 위험!
          </div>
        )}

        {/* 메시지 */}
        {msg && (
          <div style={{
            fontSize: '12px', textAlign: 'center',
            color: msg.includes('오픈') ? '#00d4aa' : '#ff4d6a',
            background: msg.includes('오픈') ? 'rgba(0,212,170,0.08)' : 'rgba(255,77,106,0.08)',
            border: `1px solid ${msg.includes('오픈') ? 'rgba(0,212,170,0.3)' : 'rgba(255,77,106,0.3)'}`,
            borderRadius: '8px', padding: '8px',
          }}>
            {msg}
          </div>
        )}

        {/* 주문 버튼 */}
        <button
          onClick={handleOrder} disabled={loading}
          style={{
            width: '100%', padding: '12px',
            background: loading ? '#333' : isLong ? '#00d4aa' : '#ff4d6a',
            border: 'none', borderRadius: '8px',
            color: isLong ? '#000' : '#fff',
            fontSize: '13px', fontWeight: 'bold',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '처리 중...' : isLong ? '롱 포지션 오픈' : '숏 포지션 오픈'}
        </button>

        <a href="/mypage" style={{
          display: 'block', textAlign: 'center',
          fontSize: '12px', color: '#4a4e63',
          textDecoration: 'none',
        }}>
          내 포지션 보기 →
        </a>
      </div>
    </div>
  )
}
