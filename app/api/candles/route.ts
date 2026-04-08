import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const rawSymbol = searchParams.get('symbol') ?? 'BTCUSDT'
  const interval = searchParams.get('interval') ?? '1m'
  const limit = searchParams.get('limit') ?? '500'

  const symbol = rawSymbol.includes('-')
    ? rawSymbol
    : rawSymbol.replace('USDT', '-USDT')

  const intervalMap: Record<string, string> = {
    '1m': '1m',
    '3m': '3m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1H',
    '2h': '2H',
    '4h': '4H',
    '6h': '6H',
    '12h': '12H',
    '1d': '1D',
    '1w': '1W',
  }

  const bar = intervalMap[interval] ?? '1m'

  try {
    const res = await fetch(
      `https://www.okx.com/api/v5/market/candles?instId=${symbol}&bar=${bar}&limit=${limit}`,
      { cache: 'no-store' }
    )

    const json = await res.json()

    if (!res.ok || json?.code !== '0' || !Array.isArray(json?.data)) {
      return NextResponse.json([])
    }

    const candles = json.data
      .map((c: string[]) => {
        const time = Math.floor(Number(c?.[0]) / 100)
        const open = Number(c?.[1])
        const high = Number(c?.[2])
        const low = Number(c?.[3])
        const close = Number(c?.[4])

        return { time, open, high, low, close }
      })
      .filter(
        (c: any) =>
          Number.isFinite(c.time) &&
          Number.isFinite(c.open) &&
          Number.isFinite(c.high) &&
          Number.isFinite(c.low) &&
          Number.isFinite(c.close)
      )
      .sort((a: any, b: any) => a.time - b.time)
      .filter((c: any, i: number, arr: any[]) => i === 0 || c.time > arr[i - 1].time)

    return NextResponse.json(candles)
  } catch (error) {
    console.error('OKX CANDLES ERROR:', error)
    return NextResponse.json([])
  }
}