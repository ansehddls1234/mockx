import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId, symbol, type, leverage, margin, entryPrice, quantity, liquidationPrice } = await req.json()

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: '유저를 찾을 수 없어요' }, { status: 404 })
    if (user.balance < margin) return NextResponse.json({ error: '잔고가 부족해요' }, { status: 400 })

    // 같은 심볼 + 같은 방향 열린 포지션 확인
    const existing = await prisma.position.findFirst({
      where: { userId, symbol, type, status: 'open' }
    })

    let position
    if (existing) {
      // 평단가 계산
      const totalQty      = existing.quantity + quantity
      const totalCost     = existing.quantity * existing.entryPrice + quantity * entryPrice
      const avgEntryPrice = totalCost / totalQty
      const totalMargin   = existing.margin + margin

      // 새 청산가 계산
      const newLiqPrice = type === 'long'
        ? avgEntryPrice * (1 - 1 / leverage)
        : avgEntryPrice * (1 + 1 / leverage)

      // 기존 포지션 업데이트
      position = await prisma.position.update({
        where: { id: existing.id },
        data: {
          quantity:         totalQty,
          entryPrice:       avgEntryPrice,
          margin:           totalMargin,
          liquidationPrice: newLiqPrice,
        }
      })
    } else {
      // 새 포지션 생성
      position = await prisma.position.create({
        data: { userId, symbol, type, leverage, margin, entryPrice, quantity, liquidationPrice }
      })
    }

    // 잔고 차감
    await prisma.user.update({
      where: { id: userId },
      data: { balance: user.balance - margin }
    })

    return NextResponse.json({ position, balance: user.balance - margin })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { positionId, closePrice, userId } = await req.json()

    const position = await prisma.position.findUnique({ where: { id: positionId } })
    if (!position) return NextResponse.json({ error: '포지션을 찾을 수 없어요' }, { status: 404 })
    if (position.status === 'closed') return NextResponse.json({ error: '이미 종료된 포지션이에요' }, { status: 400 })

    // 손익 계산
    const priceDiff = position.type === 'long'
      ? closePrice - position.entryPrice
      : position.entryPrice - closePrice

    const pnl = (priceDiff / position.entryPrice) * position.leverage * position.margin
    const returnAmount = Math.max(position.margin + pnl, 0)

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: '유저를 찾을 수 없어요' }, { status: 404 })

    await prisma.$transaction([
      prisma.position.update({
        where: { id: positionId },
        data: { status: 'closed', closePrice, pnl, closedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: user.balance + returnAmount },
      }),
    ])

    return NextResponse.json({ pnl, returnAmount, balance: user.balance + returnAmount })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')
    const status = req.nextUrl.searchParams.get('status') ?? 'open'

    if (!userId) return NextResponse.json({ error: '유저 ID가 필요해요' }, { status: 400 })

    const positions = await prisma.position.findMany({
      where: { userId, status },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ positions })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}