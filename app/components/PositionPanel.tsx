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
}

interface SlTpSetting {
  slPct: string  // 손절 %
  tpPct: string  // 익절 %
}

export default function PositionPanel({
  symbol,
  currentPrice,
  onClose,
}: {
  symbol: string
  currentPrice: number
  onClose?: () => void
}) {
  const [positions, setPositions] = useState<Position[]>([])
  const [slTp, setSlTp] = useState<Record<string, SlTpSetting>>({})
  const [msg, setMsg] = useState('')
  const [user, setUser] = useState<{ id: string; balance: number } | null>(null)
  const currentPriceRef = useRef(currentPrice)

  useEffect(() => {
    currentPriceRef.current = currentPrice
  }, [currentPrice])

  // 유저 & 포지션 불러오기
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) return
    const u = JSON.parse(stored)
    setUser(u)
    loadPositions(u.id)
  }, [])

  const loadPositions = async (userId: string) => {
    const res = await fetch(`/api/position?userId=${userId}&status=open`)
    const data = await res.json()
    setPositions(data.positions ?? [])
  }

  // 자동 손절/익절 체크 (1초마다)
  useEffect(() => {
    if (!user || positions.length === 0) return

    const interval = setInterval(() => {
      positions.forEach(pos => {
        const setting = slTp[pos.id]
        if (!setting) return

        const price = currentPriceRef.current
        if (price === 0) return

        const priceDiff = pos.type === 'long'
          ? price - pos.entryPrice
          : pos.entryPrice - price
        const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100

        const sl = parseFloat(setting.slPct)
        const tp = parseFloat(setting.tpPct)

        if (!isNaN(sl) && sl > 0 && pnlPct <= -sl) {
          handleClose(pos.id, `손절 실행 (-${sl}%)`)
        } else if (!isNaN(tp) && tp > 0 && pnlPct >= tp) {
          handleClose(pos.id, `익절 실행 (+${tp}%)`)
        }
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [positions, slTp, user])

  const handleClose = async (positionId: string, reason?: string) => {
    if (!user) return

    const res = await fetch('/api/position', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        positionId,
        closePrice: currentPriceRef.current,
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
    onClose?.()
  }

  const calcPnl = (pos: Position) => {
    if (currentPrice === 0) return { pnl: 0, pnlPct: 0 }
    const priceDiff = pos.type === 'long'
      ? currentPrice - pos.entryPrice
      : pos.entryPrice - currentPrice
    const pnl    = (priceDiff / pos.entryPrice) * pos.leverage * pos.margin
    const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
    return { pnl, pnlPct }
  }

  const currentPositions = positions.filter(p => p.symbol === symbol)
  const otherPositions   = positions.filter(p => p.symbol !== symbol)

  return (
    <div style={{
      background: '#111318',
      borderTop: '1px solid #222',
      height: '100%',
      overflowY: 'auto',
      padding: '12px',
    }}>
      {/* 헤더 */}
      <div style={{
        fontSize: '12px', fontWeight: 'bold', color: '#8b8fa8',
        marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        📊 내 포지션
        <span style={{
          background: '#1a1d25', borderRadius: '10px',
          padding: '1px 8px', fontSize: '10px', color: '#00d4aa',
        }}>
          {positions.length}개
        </span>
      </div>

      {/* 메시지 */}
      {msg && (
        <div style={{
          fontSize: '11px', textAlign: 'center',
          color: msg.includes('손절') || msg.includes('손실') || msg.includes('오류') ? '#ff4d6a' : '#00d4aa',
          background: msg.includes('손절') || msg.includes('손실') || msg.includes('오류')
            ? 'rgba(255,77,106,0.08)' : 'rgba(0,212,170,0.08)',
          border: `1px solid ${msg.includes('손절') || msg.includes('손실') || msg.includes('오류')
            ? 'rgba(255,77,106,0.3)' : 'rgba(0,212,170,0.3)'}`,
          borderRadius: '6px', padding: '6px', marginBottom: '10px',
        }}>
          {msg}
        </div>
      )}

      {positions.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#4a4e63', fontSize: '12px', paddingTop: '20px' }}>
          열린 포지션이 없어요
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* 현재 심볼 포지션 */}
          {currentPositions.map(pos => {
            const { pnl, pnlPct } = calcPnl(pos)
            const isProfit = pnl >= 0
            const setting = slTp[pos.id] ?? { slPct: '', tpPct: '' }

            return (
              <div key={pos.id} style={{
                background: '#1a1d25',
                borderRadius: '8px',
                border: `1px solid ${isProfit ? 'rgba(0,212,170,0.2)' : 'rgba(255,77,106,0.2)'}`,
                padding: '10px',
              }}>
                {/* 포지션 헤더 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: 'bold',
                      color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a',
                    }}>
                      {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                    </span>
                    <span style={{
                      fontSize: '10px', color: '#8b8fa8',
                      background: '#111318', borderRadius: '4px', padding: '1px 6px',
                    }}>
                      {pos.symbol.replace('USDT', '')} {pos.leverage}x
                    </span>
                  </div>
                  <span style={{
                    fontSize: '14px', fontWeight: 'bold', fontFamily: 'monospace',
                    color: isProfit ? '#00d4aa' : '#ff4d6a',
                  }}>
                    {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                  </span>
                </div>

                {/* 포지션 상세 */}
                <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  {[
                    { label: '진입가', value: pos.entryPrice.toLocaleString('en-US', { maximumFractionDigits: 4 }) },
                    { label: '증거금', value: `${pos.margin.toFixed(2)} USDT` },
                    { label: '청산가', value: pos.liquidationPrice.toLocaleString('en-US', { maximumFractionDigits: 4 }), red: true },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: '9px', color: '#4a4e63' }}>{item.label}</div>
                      <div style={{ fontSize: '10px', fontFamily: 'monospace', color: item.red ? '#ff4d6a' : 'white' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                  <div>
                    <div style={{ fontSize: '9px', color: '#4a4e63' }}>미실현 손익</div>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                      {isProfit ? '+' : ''}{pnl.toFixed(2)} USDT
                    </div>
                  </div>
                </div>

                {/* 손절 / 익절 설정 */}
                <div style={{
                  background: '#111318', borderRadius: '6px',
                  padding: '8px', marginBottom: '8px',
                  display: 'flex', gap: '8px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', color: '#ff4d6a', marginBottom: '4px' }}>
                      🔴 손절 (손실 %)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        placeholder="예: 10"
                        value={setting.slPct}
                        onChange={e => setSlTp(prev => ({
                          ...prev,
                          [pos.id]: { ...setting, slPct: e.target.value }
                        }))}
                        style={{
                          flex: 1, background: '#1a1d25',
                          border: `1px solid ${setting.slPct ? 'rgba(255,77,106,0.5)' : '#2a2d35'}`,
                          borderRadius: '4px', padding: '4px 6px',
                          fontSize: '11px', color: 'white',
                          outline: 'none', fontFamily: 'monospace',
                          width: '100%', boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '10px', color: '#4a4e63' }}>%</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '9px', color: '#00d4aa', marginBottom: '4px' }}>
                      🟢 익절 (수익 %)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        placeholder="예: 20"
                        value={setting.tpPct}
                        onChange={e => setSlTp(prev => ({
                          ...prev,
                          [pos.id]: { ...setting, tpPct: e.target.value }
                        }))}
                        style={{
                          flex: 1, background: '#1a1d25',
                          border: `1px solid ${setting.tpPct ? 'rgba(0,212,170,0.5)' : '#2a2d35'}`,
                          borderRadius: '4px', padding: '4px 6px',
                          fontSize: '11px', color: 'white',
                          outline: 'none', fontFamily: 'monospace',
                          width: '100%', boxSizing: 'border-box',
                        }}
                      />
                      <span style={{ fontSize: '10px', color: '#4a4e63' }}>%</span>
                    </div>
                  </div>
                </div>

                {/* 활성 SL/TP 표시 */}
                {(setting.slPct || setting.tpPct) && (
                  <div style={{
                    display: 'flex', gap: '6px', marginBottom: '6px', flexWrap: 'wrap',
                  }}>
                    {setting.slPct && (
                      <span style={{
                        fontSize: '10px', color: '#ff4d6a',
                        background: 'rgba(255,77,106,0.1)',
                        border: '1px solid rgba(255,77,106,0.3)',
                        borderRadius: '4px', padding: '2px 6px',
                      }}>
                        손절 -{setting.slPct}% 설정됨
                      </span>
                    )}
                    {setting.tpPct && (
                      <span style={{
                        fontSize: '10px', color: '#00d4aa',
                        background: 'rgba(0,212,170,0.1)',
                        border: '1px solid rgba(0,212,170,0.3)',
                        borderRadius: '4px', padding: '2px 6px',
                      }}>
                        익절 +{setting.tpPct}% 설정됨
                      </span>
                    )}
                  </div>
                )}

                {/* 종료 버튼 */}
                <button
                  onClick={() => handleClose(pos.id)}
                  style={{
                    width: '100%', padding: '7px',
                    background: isProfit ? 'rgba(0,212,170,0.15)' : 'rgba(255,77,106,0.15)',
                    border: `1px solid ${isProfit ? 'rgba(0,212,170,0.4)' : 'rgba(255,77,106,0.4)'}`,
                    borderRadius: '6px',
                    color: isProfit ? '#00d4aa' : '#ff4d6a',
                    fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                  }}
                >
                  포지션 종료 ({isProfit ? '+' : ''}{pnl.toFixed(2)} USDT)
                </button>
              </div>
            )
          })}

          {/* 다른 심볼 포지션 */}
          {otherPositions.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: '#4a4e63', marginBottom: '6px' }}>
                다른 코인 포지션
              </div>
              {otherPositions.map(pos => (
                <div key={pos.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 8px', background: '#1a1d25',
                  borderRadius: '6px', marginBottom: '4px',
                }}>
                  <span style={{ fontSize: '11px', color: 'white' }}>
                    {pos.symbol.replace('USDT', '')} {pos.type === 'long' ? '🟢' : '🔴'} {pos.leverage}x
                  </span>
                  <button
                    onClick={() => handleClose(pos.id)}
                    style={{
                      padding: '3px 8px', fontSize: '10px',
                      background: 'transparent', border: '1px solid #ff4d6a',
                      borderRadius: '4px', color: '#ff4d6a', cursor: 'pointer',
                    }}
                  >
                    종료
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
