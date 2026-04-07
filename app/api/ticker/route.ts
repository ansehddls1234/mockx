import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  try {
    const url = symbol
      ? `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`
      : `https://api.binance.com/api/v3/ticker/24hr`
    const res = await fetch(url)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '오류' }, { status: 500 })
  }
}