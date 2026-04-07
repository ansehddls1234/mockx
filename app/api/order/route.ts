import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const { userId, symbol, type, amount, price, quantity } = await req.json()

    // 유저 찾기
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      return NextResponse.json({ error: '유저를 찾을 수 없어요' }, { status: 404 })
    }

    // 매수 — 잔고 체크
    if (type === 'buy' && user.balance < amount) {
      return NextResponse.json({ error: '잔고가 부족해요' }, { status: 400 })
    }

    // 잔고 계산
    const newBalance = type === 'buy'
      ? user.balance - amount
      : user.balance + amount

    // 주문 저장 + 잔고 업데이트 (동시에)
    await prisma.$transaction([
      prisma.order.create({
        data: { userId, symbol, type, amount, price, quantity },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      }),
    ])

    return NextResponse.json({ balance: newBalance })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}