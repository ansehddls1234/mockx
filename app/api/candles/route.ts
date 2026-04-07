import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const symbol   = searchParams.get('symbol')
  const interval = searchParams.get('interval')
  const limit    = searchParams.get('limit') ?? '500'

  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '데이터를 불러올 수 없습니다' }, { status: 500 })
  }
}