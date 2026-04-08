import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get('symbol') ?? 'BTCUSDT'

  const symbol = rawSymbol.includes('-')
    ? rawSymbol
    : rawSymbol.replace('USDT', '-USDT')

  try {
    const res = await fetch(
      `https://www.okx.com/api/v5/market/ticker?instId=${symbol}`,
      { cache: 'no-store' }
    )

    const json = await res.json()

    if (!res.ok || json?.code !== '0') {
      return NextResponse.json(
        {
          error: 'OKX ticker 요청 실패',
          details: json,
        },
        { status: 500 }
      )
    }

    const ticker = json?.data?.[0]

    if (!ticker) {
      return NextResponse.json(
        { error: '티커 데이터를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      symbol,
      lastPrice: Number(ticker.last),
      open24h: Number(ticker.open24h),
      high24h: Number(ticker.high24h),
      low24h: Number(ticker.low24h),
      vol24h: Number(ticker.vol24h),
      volCcy24h: Number(ticker.volCcy24h),
      change24h:
        Number(ticker.open24h) > 0
          ? ((Number(ticker.last) - Number(ticker.open24h)) / Number(ticker.open24h)) * 100
          : 0,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: '가격을 불러올 수 없습니다',
        details: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 500 }
    )
  }
}