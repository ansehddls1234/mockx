import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')
  try {
    const res = await fetch(
      `https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`
    )
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: '오류' }, { status: 500 })
  }
}