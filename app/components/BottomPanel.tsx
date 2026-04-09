'use client'

import { useState, useEffect, useRef } from 'react'

interface Position {
  id: string
  symbol: string
  type: string
  leverage: number
  margin: number
  entryPrice: number
  quantity: number
  liquidationPrice: number
  status: string
  createdAt: string
}

interface ClosedPosition {
  id: string
  symbol: string
  type: string
  leverage: number
  margin: number
  entryPrice: number
  closePrice: number
  quantity: number
  pnl: number
  closedAt: string
  createdAt: string
}

interface SlTpSetting {
  slPct: string
  tpPct: string
}

type Tab = 'positions' | 'openOrders' | 'orderHistory' | 'tradeHistory'

// 심볼 정규화: BTC-USDT → BTCUSDT, BTCUSDT → BTCUSDT
const normalize = (s: string) => s.replace('-', '')

export default function BottomPanel({
  symbol,
  currentPrice,
  onClose,
}: {
  symbol: string
  currentPrice: number
  onClose?: () => void
}) {
  const [tab, setTab] = useState<Tab>('positions')
  const [positions, setPositions] = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<ClosedPosition[]>([])
  const [slTp, setSlTp] = useState<Record<string, SlTpSetting>>({})
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<{ id: string; balance: number } | null>(null)
  const [prices, setPrices] = useState<Record<string, number>>({})
  const currentPriceRef = useRef(currentPrice)
  const pricesRef = useRef<Record<string, number>>({})

  useEffect(() => {
    currentPriceRef.current = currentPrice
    // 현재 선택된 심볼 가격도 업데이트
    pricesRef.current[normalize(symbol)] = currentPrice
    setPrices(prev => ({ ...prev, [normalize(symbol)]: currentPrice }))
  }, [currentPrice, symbol])

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return
    const u = JSON.parse(stored)
    setUser(u)
    loadPositions(u.id)
    loadClosedPositions(u.id)
  }, [])

  const loadPositions = async (userId: string) => {
    const res = await fetch(`/api/position?userId=${userId}&status=open`)
    const data = await res.json()
    setPositions(data.positions ?? [])
  }

  const loadClosedPositions = async (userId: string) => {
    const res = await fetch(`/api/position?userId=${userId}&status=closed`)
    const data = await res.json()
    setClosedPositions(data.positions ?? [])
  }

  // 포지션별 가격 폴링
  useEffect(() => {
    if (!positions.length) return

    const symbols = [...new Set(positions.map(p => p.symbol))]

    const fetchPrices = () => {
      symbols.forEach(sym => {
        const okxSym = sym.includes('-') ? sym : sym.replace('USDT', '-USDT')
        fetch(`/api/ticker?symbol=${okxSym}`)
          .then(r => r.json())
          .then(data => {
            if (data.lastPrice) {
              const key = normalize(sym)
              pricesRef.current[key] = data.lastPrice
              setPrices(prev => ({ ...prev, [key]: data.lastPrice }))
            }
          })
      })
    }

    fetchPrices()
    const interval = setInterval(fetchPrices, 2000)
    return () => clearInterval(interval)
  }, [positions])

  // 자동 손절/익절
  useEffect(() => {
    if (!user || positions.length === 0) return
    const interval = setInterval(() => {
      positions.forEach(pos => {
        const setting = slTp[pos.id]
        if (!setting) return
        const price = pricesRef.current[normalize(pos.symbol)] ?? 0
        if (price === 0) return
        const priceDiff = pos.type === 'long'
          ? price - pos.entryPrice
          : pos.entryPrice - price
        const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
        const sl = parseFloat(setting.slPct)
        const tp = parseFloat(setting.tpPct)
        if (!isNaN(sl) && sl > 0 && pnlPct <= -sl) {
          handleClose(pos.id, price, `손절 실행 (-${sl}%)`)
        } else if (!isNaN(tp) && tp > 0 && pnlPct >= tp) {
          handleClose(pos.id, price, `익절 실행 (+${tp}%)`)
        }
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [positions, slTp, user])

  const handleClose = async (positionId: string, closePrice?: number, reason?: string) => {
    if (!user) return
    const price = closePrice ?? pricesRef.current[normalize(symbol)] ?? currentPriceRef.current
    const res = await fetch('/api/position', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionId,
        closePrice: price,
        userId: user.id,
      }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg(data.error); return }
    const updatedUser = { ...user, balance: data.balance }
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    const pnl = data.pnl
    setMsg(reason
      ? `${reason} | ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
      : `포지션 종료! ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} USDT`
    )
    loadPositions(user.id)
    loadClosedPositions(user.id)
    onClose?.()
  }

  const calcPnl = (pos: Position) => {
    const price = pricesRef.current[normalize(pos.symbol)] ?? pos.entryPrice
    if (price === 0) return { pnl: 0, pnlPct: 0, price: pos.entryPrice }
    const priceDiff = pos.type === 'long'
      ? price - pos.entryPrice
      : pos.entryPrice - price
    const pnl = (priceDiff / pos.entryPrice) * pos.leverage * pos.margin
    const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
    return { pnl, pnlPct, price }
  }

  const fmt = (n: number, d = 2) =>
    n.toLocaleString('en-US', { maximumFractionDigits: d })

  const fmtDate = (s: string) => {
    const d = new Date(s)
    return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'positions',    label: `포지션 (${positions.length})` },
    { key: 'openOrders',   label: '미체결 주문' },
    { key: 'orderHistory', label: '주문 내역' },
    { key: 'tradeHistory', label: '거래 내역' },
  ]

  return (
    <div style={{
      background: '#111318',
      borderTop: '1px solid #222',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      fontSize: '12px',
    }}>
      <div style={{ display: 'flex', borderBottom: '1px solid #222', flexShrink: 0 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${tab === t.key ? '#00d4aa' : 'transparent'}`,
              color: tab === t.key ? '#00d4aa' : '#4a4e63',
              fontSize: '12px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {t.label}
          </button>
        ))}
        {msg && (
          <div style={{
            marginLeft: 'auto',
            padding: '6px 16px',
            fontSize: '11px',
            color: msg.includes('손절') || msg.includes('손실') ? '#ff4d6a' : '#00d4aa',
          }}>
            {msg}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>

        {/* 포지션 탭 */}
        {tab === 'positions' && (
          positions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4a4e63', padding: '24px' }}>
              열린 포지션이 없어요
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#4a4e63', fontSize: '11px', borderBottom: '1px solid #1a1d25' }}>
                  {['코인', '방향', '레버리지', '증거금', '진입가', '현재가', '청산가', '미실현 손익', '손절 %', '익절 %', ''].map(h => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map(pos => {
                  const { pnl, pnlPct, price } = calcPnl(pos)
                  const isProfit = pnl >= 0
                  const setting = slTp[pos.id] ?? { slPct: '', tpPct: '' }
                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #1a1d25' }}>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>
                        {normalize(pos.symbol).replace('USDT', '')}/USDT
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a', fontWeight: 'bold' }}>
                          {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: '#8b8fa8', fontFamily: 'monospace' }}>
                        {pos.leverage}x
                      </td>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>
                        {fmt(pos.margin)} USDT
                      </td>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>
                        {fmt(pos.entryPrice, 4)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#00d4aa', fontFamily: 'monospace' }}>
                        {fmt(price, 4)}
                      </td>
                      <td style={{ padding: '8px 12px', color: '#ff4d6a', fontFamily: 'monospace' }}>
                        {fmt(pos.liquidationPrice, 4)}
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        <span style={{ color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{pnl.toFixed(2)} USDT
                        </span>
                        <span style={{ color: isProfit ? '#00d4aa' : '#ff4d6a', fontSize: '10px', marginLeft: '4px' }}>
                          ({isProfit ? '+' : ''}{pnlPct.toFixed(2)}%)
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input
                            type="number"
                            placeholder="예: 10"
                            value={setting.slPct}
                            onChange={e => setSlTp(prev => ({
                              ...prev,
                              [pos.id]: { ...setting, slPct: e.target.value }
                            }))}
                            style={{
                              width: '60px', background: '#1a1d25',
                              border: `1px solid ${setting.slPct ? 'rgba(255,77,106,0.5)' : '#2a2d35'}`,
                              borderRadius: '4px', padding: '3px 6px',
                              fontSize: '11px', color: '#ff4d6a',
                              outline: 'none', fontFamily: 'monospace',
                            }}
                          />
                          <span style={{ color: '#4a4e63', fontSize: '10px' }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding: '4px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <input
                            type="number"
                            placeholder="예: 20"
                            value={setting.tpPct}
                            onChange={e => setSlTp(prev => ({
                              ...prev,
                              [pos.id]: { ...setting, tpPct: e.target.value }
                            }))}
                            style={{
                              width: '60px', background: '#1a1d25',
                              border: `1px solid ${setting.tpPct ? 'rgba(0,212,170,0.5)' : '#2a2d35'}`,
                              borderRadius: '4px', padding: '3px 6px',
                              fontSize: '11px', color: '#00d4aa',
                              outline: 'none', fontFamily: 'monospace',
                            }}
                          />
                          <span style={{ color: '#4a4e63', fontSize: '10px' }}>%</span>
                        </div>
                      </td>
                      <td style={{ padding: '4px 12px' }}>
                        <button
                          onClick={() => handleClose(pos.id)}
                          style={{
                            padding: '4px 10px', background: 'transparent',
                            border: `1px solid ${isProfit ? 'rgba(0,212,170,0.4)' : 'rgba(255,77,106,0.4)'}`,
                            borderRadius: '4px',
                            color: isProfit ? '#00d4aa' : '#ff4d6a',
                            fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                        >
                          종료
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}

        {tab === 'openOrders' && (
          <div style={{ textAlign: 'center', color: '#4a4e63', padding: '24px' }}>
            미체결 주문이 없어요 (지정가 주문 미지원)
          </div>
        )}

        {tab === 'orderHistory' && (
          closedPositions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4a4e63', padding: '24px' }}>주문 내역이 없어요</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#4a4e63', fontSize: '11px', borderBottom: '1px solid #1a1d25' }}>
                  {['시간', '코인', '방향', '레버리지', '증거금', '진입가', '수량'].map(h => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedPositions.map(pos => (
                  <tr key={pos.id} style={{ borderBottom: '1px solid #1a1d25' }}>
                    <td style={{ padding: '8px 12px', color: '#4a4e63', fontFamily: 'monospace', fontSize: '11px' }}>{fmtDate(pos.createdAt)}</td>
                    <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{normalize(pos.symbol).replace('USDT', '')}/USDT</td>
                    <td style={{ padding: '8px 12px' }}>
                      <span style={{ color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a', fontWeight: 'bold' }}>
                        {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', color: '#8b8fa8', fontFamily: 'monospace' }}>{pos.leverage}x</td>
                    <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{fmt(pos.margin)} USDT</td>
                    <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{fmt(pos.entryPrice, 4)}</td>
                    <td style={{ padding: '8px 12px', color: '#8b8fa8', fontFamily: 'monospace' }}>{pos.quantity.toFixed(6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === 'tradeHistory' && (
          closedPositions.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#4a4e63', padding: '24px' }}>거래 내역이 없어요</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ color: '#4a4e63', fontSize: '11px', borderBottom: '1px solid #1a1d25' }}>
                  {['종료 시간', '코인', '방향', '진입가', '종료가', '수익/손실', '수익률'].map(h => (
                    <th key={h} style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 'normal', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closedPositions.map(pos => {
                  const isProfit = pos.pnl >= 0
                  const priceDiff = pos.type === 'long'
                    ? pos.closePrice - pos.entryPrice
                    : pos.entryPrice - pos.closePrice
                  const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
                  return (
                    <tr key={pos.id} style={{ borderBottom: '1px solid #1a1d25' }}>
                      <td style={{ padding: '8px 12px', color: '#4a4e63', fontFamily: 'monospace', fontSize: '11px' }}>{fmtDate(pos.closedAt)}</td>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{normalize(pos.symbol).replace('USDT', '')}/USDT</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a', fontWeight: 'bold' }}>
                          {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{fmt(pos.entryPrice, 4)}</td>
                      <td style={{ padding: '8px 12px', color: 'white', fontFamily: 'monospace' }}>{fmt(pos.closePrice, 4)}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                        <span style={{ color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{pos.pnl.toFixed(2)} USDT
                        </span>
                      </td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>
                        <span style={{ color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  )
}