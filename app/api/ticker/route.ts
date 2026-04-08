import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const rawSymbol = req.nextUrl.searchParams.get('symbol')

  try {
    // 단건 조회
    if (rawSymbol) {
      const symbol = rawSymbol.includes('-')
        ? rawSymbol
        : rawSymbol.replace('USDT', '-USDT')

      const res = await fetch(
        `https://www.okx.com/api/v5/market/ticker?instId=${symbol}`,
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

      const item = json?.data?.[0]

      if (!item) {
        return NextResponse.json(
          { error: '티커 데이터가 없습니다' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        symbol,
        lastPrice: Number(item.last),
        open24h: Number(item.open24h),
        high24h: Number(item.high24h),
        low24h: Number(item.low24h),
        vol24h: Number(item.vol24h),
        volCcy24h: Number(item.volCcy24h),
        change24h:
          Number(item.open24h) > 0
            ? ((Number(item.last) - Number(item.open24h)) / Number(item.open24h)) * 100
            : 0,
      })
    }

    // 전체 조회
    const res = await fetch(
      'https://www.okx.com/api/v5/market/tickers?instType=SPOT',
      { cache: 'no-store' }
    )

    const json = await res.json()

    if (!res.ok || json?.code !== '0' || !Array.isArray(json?.data)) {
      return NextResponse.json(
        {
          error: 'OKX 전체 티커 요청 실패',
          details: json,
        },
        { status: 500 }
      )
    }

    const tickers = json.data.map((item: any) => ({
      symbol: item.instId,
      lastPrice: Number(item.last),
      open24h: Number(item.open24h),
      high24h: Number(item.high24h),
      low24h: Number(item.low24h),
      vol24h: Number(item.vol24h),
      volCcy24h: Number(item.volCcy24h),
      change24h:
        Number(item.open24h) > 0
          ? ((Number(item.last) - Number(item.open24h)) / Number(item.open24h)) * 100
          : 0,
    }))

    return NextResponse.json(tickers)
  } catch (error) {
    return NextResponse.json(
      {
        error: '오류',
        details: error instanceof Error ? error.message : 'unknown error',
      },
      { status: 500 }
    )
  }
}