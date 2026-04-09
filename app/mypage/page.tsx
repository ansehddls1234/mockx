'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Position {
  id: string
  symbol: string
  type: 'long' | 'short'
  leverage: number
  margin: number
  entryPrice: number
  closePrice: number | null
  quantity: number
  liquidationPrice: number
  pnl: number | null
  status: 'open' | 'closed'
  createdAt: string
  closedAt: string | null
}

interface User {
  id: string
  name: string
  nickname?: string
  balance: number
}

type Tab = 'open' | 'closed' | 'transfer'

export default function MyPage() {
  const router = useRouter()
  const [user, setUser]                       = useState<User | null>(null)
  const [openPositions, setOpenPositions]     = useState<Position[]>([])
  const [closedPositions, setClosedPositions] = useState<Position[]>([])
  const [prices, setPrices]                   = useState<Record<string, number>>({})
  const [loading, setLoading]                 = useState(true)
  const [tab, setTab]                         = useState<Tab>('open')

  // 송금 상태
  const [toNickname, setToNickname]   = useState('')
  const [amount, setAmount]           = useState('')
  const [transferMsg, setTransferMsg] = useState('')
  const [transferring, setTransferring] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    setUser(u)

    Promise.all([
      fetch(`/api/position?userId=${u.id}&status=open`).then(r => r.json()),
      fetch(`/api/position?userId=${u.id}&status=closed`).then(r => r.json()),
    ]).then(([openData, closedData]) => {
      setOpenPositions(openData.positions ?? [])
      setClosedPositions(closedData.positions ?? [])
      setLoading(false)
    })
  }, [router])

  useEffect(() => {
    if (!openPositions.length) return
    const symbols = openPositions.map(p => p.symbol)
    const update = () => {
      Promise.all(symbols.map(s =>
        fetch(`/api/ticker?symbol=${s}`).then(r => r.json())
      )).then(results => {
        const updated: Record<string, number> = {}
        results.forEach((data, i) => {
          if (data.lastPrice) updated[symbols[i]] = parseFloat(data.lastPrice)
        })
        setPrices(prev => ({ ...prev, ...updated }))
      })
    }
    update()
    const interval = setInterval(update, 3000)
    return () => clearInterval(interval)
  }, [openPositions])

  const calcPnl = (pos: Position) => {
    const current = prices[pos.symbol] ?? pos.entryPrice
    const priceDiff = pos.type === 'long'
      ? current - pos.entryPrice
      : pos.entryPrice - current
    const pnl    = (priceDiff / pos.entryPrice) * pos.leverage * pos.margin
    const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
    return { pnl, pnlPct, current }
  }

  const handleTransfer = async () => {
    if (!user || !toNickname || !amount) return
    setTransferring(true)
    setTransferMsg('')

    const res = await fetch('/api/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromUserId: user.id,
        toNickname,
        amount: parseFloat(amount),
      }),
    })
    const data = await res.json()
    setTransferring(false)

    if (!res.ok) {
      setTransferMsg(data.error)
      return
    }

    const updatedUser = { ...user, balance: data.balance }
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setTransferMsg(`✅ ${data.toNickname}님에게 $${parseFloat(amount).toLocaleString()} USDT 송금 완료!`)
    setToNickname('')
    setAmount('')
  }

  const unrealizedPnl = openPositions.reduce((sum, p) => sum + calcPnl(p).pnl, 0)
  const realizedPnl   = closedPositions.reduce((sum, p) => sum + (p.pnl ?? 0), 0)
  const totalPnl      = unrealizedPnl + realizedPnl
  const INITIAL       = 10000
  const totalPnlPct   = (totalPnl / INITIAL) * 100

  const fmt = (n: number, d = 2) =>
    n.toLocaleString('en-US', { maximumFractionDigits: d })

  const fmtDate = (s: string) =>
    new Date(s).toLocaleString('ko-KR', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0a0b0e',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#8b8fa8', fontSize: '14px',
    }}>
      불러오는 중...
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0a0b0e', padding: '24px' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* 헤더 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
          <Link href="/" style={{ color: '#8b8fa8', textDecoration: 'none', fontSize: '13px' }}>
            ← 거래소로
          </Link>
          <h1 style={{ color: 'white', fontSize: '20px', fontWeight: '600' }}>
            {user?.nickname ?? user?.name}님의 포트폴리오
          </h1>
        </div>

        {/* 요약 카드 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px', marginBottom: '28px',
        }}>
          {[
            { label: '보유 현금', value: `$${fmt(user?.balance ?? 0)}`, sub: 'USDT', color: 'white' },
            { label: '미실현 손익', value: `${unrealizedPnl >= 0 ? '+' : ''}$${fmt(unrealizedPnl)}`, sub: `열린 포지션 ${openPositions.length}개`, color: unrealizedPnl >= 0 ? '#00d4aa' : '#ff4d6a' },
            { label: '실현 손익', value: `${realizedPnl >= 0 ? '+' : ''}$${fmt(realizedPnl)}`, sub: `종료 포지션 ${closedPositions.length}개`, color: realizedPnl >= 0 ? '#00d4aa' : '#ff4d6a' },
            { label: '총 수익률', value: `${totalPnlPct >= 0 ? '+' : ''}${totalPnlPct.toFixed(2)}%`, sub: `총 손익 ${totalPnl >= 0 ? '+' : ''}$${fmt(totalPnl)}`, color: totalPnlPct >= 0 ? '#00d4aa' : '#ff4d6a' },
          ].map(card => (
            <div key={card.label} style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', padding: '20px' }}>
              <div style={{ fontSize: '12px', color: '#8b8fa8', marginBottom: '10px', fontWeight: '500' }}>{card.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: card.color, fontFamily: 'monospace' }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#4a4e63', marginTop: '6px' }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* 탭 */}
        <div style={{ display: 'flex', borderBottom: '1px solid #222', marginBottom: '16px' }}>
          {[
            { key: 'open',     label: `열린 포지션 (${openPositions.length})` },
            { key: 'closed',   label: `거래 내역 (${closedPositions.length})` },
            { key: 'transfer', label: '💸 송금하기' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as Tab)}
              style={{
                padding: '10px 20px',
                background: 'transparent', border: 'none',
                borderBottom: `2px solid ${tab === t.key ? '#00d4aa' : 'transparent'}`,
                color: tab === t.key ? 'white' : '#8b8fa8',
                fontSize: '13px', fontWeight: tab === t.key ? '600' : '400',
                cursor: 'pointer', marginBottom: '-1px',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* 송금 탭 */}
        {tab === 'transfer' && (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: '#111318',
              border: '1px solid #2a2d35',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '420px',
            }}>
              <h2 style={{ color: 'white', fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                💸 USDT 송금
              </h2>
              <p style={{ color: '#4a4e63', fontSize: '13px', marginBottom: '24px' }}>
                보유 잔고: <span style={{ color: '#00d4aa', fontFamily: 'monospace' }}>${fmt(user?.balance ?? 0)} USDT</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 받는 사람 */}
                <div>
                  <label style={{ fontSize: '12px', color: '#8b8fa8', display: 'block', marginBottom: '8px' }}>
                    받는 사람 닉네임
                  </label>
                  <input
                    type="text"
                    placeholder="닉네임 입력"
                    value={toNickname}
                    onChange={e => setToNickname(e.target.value)}
                    style={{
                      width: '100%', background: '#1a1d25',
                      border: '1px solid #2a2d35', borderRadius: '8px',
                      padding: '12px', fontSize: '14px',
                      color: 'white', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 금액 */}
                <div>
                  <label style={{ fontSize: '12px', color: '#8b8fa8', display: 'block', marginBottom: '8px' }}>
                    금액 (USDT)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width: '100%', background: '#1a1d25',
                      border: '1px solid #2a2d35', borderRadius: '8px',
                      padding: '12px', fontSize: '14px',
                      color: 'white', outline: 'none', boxSizing: 'border-box',
                      fontFamily: 'monospace',
                    }}
                  />
                  {/* 퍼센트 버튼 */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => setAmount(String(Math.floor((user?.balance ?? 0) * pct / 100)))}
                        style={{
                          flex: 1, padding: '6px',
                          background: '#1a1d25', border: '1px solid #2a2d35',
                          borderRadius: '6px', color: '#8b8fa8',
                          fontSize: '11px', cursor: 'pointer', fontFamily: 'monospace',
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* 메시지 */}
                {transferMsg && (
                  <div style={{
                    padding: '12px', borderRadius: '8px', fontSize: '13px',
                    background: transferMsg.startsWith('✅') ? 'rgba(0,212,170,0.08)' : 'rgba(255,77,106,0.08)',
                    border: `1px solid ${transferMsg.startsWith('✅') ? 'rgba(0,212,170,0.3)' : 'rgba(255,77,106,0.3)'}`,
                    color: transferMsg.startsWith('✅') ? '#00d4aa' : '#ff4d6a',
                    textAlign: 'center',
                  }}>
                    {transferMsg}
                  </div>
                )}

                {/* 송금 버튼 */}
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !toNickname || !amount}
                  style={{
                    width: '100%', padding: '14px',
                    background: transferring || !toNickname || !amount ? '#2a2d35' : '#00d4aa',
                    border: 'none', borderRadius: '8px',
                    color: transferring || !toNickname || !amount ? '#4a4e63' : '#000',
                    fontSize: '14px', fontWeight: 'bold',
                    cursor: transferring || !toNickname || !amount ? 'not-allowed' : 'pointer',
                  }}
                >
                  {transferring ? '송금 중...' : '송금하기'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 테이블 */}
        {tab !== 'transfer' && (
          <div style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', overflow: 'hidden' }}>

            {/* 열린 포지션 */}
            {tab === 'open' && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 80px 70px 1fr 1fr 1fr 1fr 1.2fr',
                  padding: '12px 20px', borderBottom: '1px solid #222',
                  fontSize: '11px', color: '#8b8fa8', fontWeight: '600', letterSpacing: '0.04em',
                }}>
                  <span>코인</span><span>방향</span><span>레버리지</span>
                  <span style={{ textAlign: 'right' }}>증거금</span>
                  <span style={{ textAlign: 'right' }}>진입가</span>
                  <span style={{ textAlign: 'right' }}>현재가</span>
                  <span style={{ textAlign: 'right' }}>청산가</span>
                  <span style={{ textAlign: 'right' }}>미실현 손익</span>
                </div>
                {openPositions.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#4a4e63', fontSize: '14px' }}>
                    열린 포지션이 없어요 🚀
                  </div>
                ) : openPositions.map(pos => {
                  const { pnl, pnlPct, current } = calcPnl(pos)
                  const isProfit = pnl >= 0
                  return (
                    <div
                      key={pos.id}
                      onClick={() => router.push(`/?symbol=${pos.symbol}`)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.5fr 80px 70px 1fr 1fr 1fr 1fr 1.2fr',
                        padding: '16px 20px', borderBottom: '1px solid #1a1a1a',
                        alignItems: 'center', cursor: 'pointer',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1d25')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#1a1d25', border: '1px solid #2a2d35',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 'bold', color: '#00d4aa',
                        }}>
                          {pos.symbol.replace('USDT', '').replace('-', '').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
                            {pos.symbol.replace('USDT', '').replace('-', '')}/USDT
                          </div>
                          <div style={{ color: '#4a4e63', fontSize: '10px' }}>차트 보기 →</div>
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a' }}>
                        {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                      </span>
                      <span style={{ color: '#e8eaf0', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' }}>{pos.leverage}x</span>
                      <span style={{ textAlign: 'right', color: '#e8eaf0', fontFamily: 'monospace', fontSize: '13px' }}>${fmt(pos.margin)}</span>
                      <span style={{ textAlign: 'right', color: '#8b8fa8', fontFamily: 'monospace', fontSize: '12px' }}>${fmt(pos.entryPrice, 4)}</span>
                      <span style={{ textAlign: 'right', color: '#00d4aa', fontFamily: 'monospace', fontSize: '12px' }}>${fmt(current, 4)}</span>
                      <span style={{ textAlign: 'right', color: '#ff4d6a', fontFamily: 'monospace', fontSize: '12px' }}>${fmt(pos.liquidationPrice, 4)}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{fmt(pnl)} USDT
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* 거래 내역 */}
            {tab === 'closed' && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 80px 70px 1fr 1fr 1fr 1.2fr 1fr',
                  padding: '12px 20px', borderBottom: '1px solid #222',
                  fontSize: '11px', color: '#8b8fa8', fontWeight: '600', letterSpacing: '0.04em',
                }}>
                  <span>코인</span><span>방향</span><span>레버리지</span>
                  <span style={{ textAlign: 'right' }}>증거금</span>
                  <span style={{ textAlign: 'right' }}>진입가</span>
                  <span style={{ textAlign: 'right' }}>종료가</span>
                  <span style={{ textAlign: 'right' }}>수익/손실</span>
                  <span style={{ textAlign: 'right' }}>종료 시간</span>
                </div>
                {closedPositions.length === 0 ? (
                  <div style={{ padding: '48px', textAlign: 'center', color: '#4a4e63', fontSize: '14px' }}>
                    거래 내역이 없어요
                  </div>
                ) : closedPositions.map(pos => {
                  const pnl = pos.pnl ?? 0
                  const priceDiff = pos.type === 'long'
                    ? (pos.closePrice ?? 0) - pos.entryPrice
                    : pos.entryPrice - (pos.closePrice ?? 0)
                  const pnlPct = (priceDiff / pos.entryPrice) * pos.leverage * 100
                  const isProfit = pnl >= 0
                  return (
                    <div key={pos.id} style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 80px 70px 1fr 1fr 1fr 1.2fr 1fr',
                      padding: '16px 20px', borderBottom: '1px solid #1a1a1a', alignItems: 'center',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#1a1d25', border: '1px solid #2a2d35',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '10px', fontWeight: 'bold', color: '#00d4aa',
                        }}>
                          {pos.symbol.replace('USDT', '').replace('-', '').slice(0, 2)}
                        </div>
                        <span style={{ color: 'white', fontSize: '13px', fontWeight: '600' }}>
                          {pos.symbol.replace('USDT', '').replace('-', '')}/USDT
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: pos.type === 'long' ? '#00d4aa' : '#ff4d6a' }}>
                        {pos.type === 'long' ? '🟢 롱' : '🔴 숏'}
                      </span>
                      <span style={{ color: '#e8eaf0', fontFamily: 'monospace', fontSize: '13px', fontWeight: '600' }}>{pos.leverage}x</span>
                      <span style={{ textAlign: 'right', color: '#e8eaf0', fontFamily: 'monospace', fontSize: '13px' }}>${fmt(pos.margin)}</span>
                      <span style={{ textAlign: 'right', color: '#8b8fa8', fontFamily: 'monospace', fontSize: '12px' }}>${fmt(pos.entryPrice, 4)}</span>
                      <span style={{ textAlign: 'right', color: '#e8eaf0', fontFamily: 'monospace', fontSize: '12px' }}>${fmt(pos.closePrice ?? 0, 4)}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold', color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{fmt(pnl)} USDT
                        </div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: isProfit ? '#00d4aa' : '#ff4d6a' }}>
                          {isProfit ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                      </div>
                      <span style={{ textAlign: 'right', color: '#8b8fa8', fontSize: '11px' }}>
                        {pos.closedAt ? fmtDate(pos.closedAt) : '-'}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}