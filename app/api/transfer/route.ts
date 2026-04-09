import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
  try {
    const { fromUserId, toNickname, amount } = await req.json()

    if (!fromUserId || !toNickname || !amount || amount <= 0) {
      return NextResponse.json({ error: '올바른 정보를 입력해주세요' }, { status: 400 })
    }

    const fromUser = await prisma.user.findUnique({ where: { id: fromUserId } })
    if (!fromUser) return NextResponse.json({ error: '유저를 찾을 수 없어요' }, { status: 404 })
    if (fromUser.balance < amount) return NextResponse.json({ error: '잔고가 부족해요' }, { status: 400 })

    const toUser = await prisma.user.findFirst({ where: { nickname: toNickname } })
    if (!toUser) return NextResponse.json({ error: '해당 닉네임의 유저가 없어요' }, { status: 404 })
    if (toUser.id === fromUserId) return NextResponse.json({ error: '자신에게 송금할 수 없어요' }, { status: 400 })

    await prisma.$transaction([
      prisma.user.update({
        where: { id: fromUserId },
        data: { balance: { decrement: amount } },
      }),
      prisma.user.update({
        where: { id: toUser.id },
        data: { balance: { increment: amount } },
      }),
    ])

    const updated = await prisma.user.findUnique({ where: { id: fromUserId } })

    return NextResponse.json({
      success: true,
      balance: updated?.balance,
      toNickname: toUser.nickname,
      amount,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}