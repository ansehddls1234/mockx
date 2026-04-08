import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get('symbol') ?? 'BTCUSDT'

  const symbol = rawSymbol.includes('-')
    ? rawSymbol
    : rawSymbol.replace('USDT', '-USDT')

  try {
    const res = await fetch(
      `https://www.okx.com/api/v5/market/books?instId=${symbol}&sz=20`,
      { cache: 'no-store' }
    )

    const json = await res.json()

    if (!res.ok || json?.code !== '0') {
      return NextResponse.json(
        {
          error: 'OKX 요청 실패',
          details: json,
        },
        { status: 500 }
      )
    }

    const book = json.data?.[0]

    if (!book) {
      return NextResponse.json({ bids: [], asks: [] })
    }

    // OKX → Binance 스타일로 변환
    const bids = book.bids.map((b: string[]) => [
      Number(b[0]), // price
      Number(b[1]), // size
    ])

    const asks = book.asks.map((a: string[]) => [
      Number(a[0]),
      Number(a[1]),
    ])

    return NextResponse.json({ bids, asks })
  } catch (error) {
    console.error('ORDERBOOK ERROR:', error)
    return NextResponse.json({ bids: [], asks: [] })
  }
}