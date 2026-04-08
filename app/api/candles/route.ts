import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const symbol = searchParams.get('symbol') ?? 'BTCUSDT'
  const interval = searchParams.get('interval') ?? '1m'
  const limit = searchParams.get('limit') ?? '500'

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
      { cache: 'no-store' }
    )

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Binance API 요청 실패',
          details: data,
        },
        { status: res.status }
      )
    }

    if (!Array.isArray(data)) {
      return NextResponse.json(
        {
          error: '캔들 데이터 형식이 올바르지 않습니다',
          details: data,
        },
        { status: 500 }
      )
    }

    const candles = data.map((c: any[]) => ({
      time: Math.floor(Number(c[0]) / 1000),
      open: Number(c[1]),
      high: Number(c[2]),
      low: Number(c[3]),
      close: Number(c[4]),
    }))

    return NextResponse.json(candles)
  } catch (error) {
    return NextResponse.json(
      {
        error: '데이터를 불러올 수 없습니다',
        details: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 500 }
    )
  }
}