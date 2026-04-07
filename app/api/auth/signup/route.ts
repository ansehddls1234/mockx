import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { nickname, name, email, password, birthdate, country, marketing } = await req.json()

    // 빈칸 체크
    if (!nickname || !name || !email || !password || !birthdate || !country) {
      return NextResponse.json({ error: '모든 항목을 입력해주세요' }, { status: 400 })
    }

    // 비밀번호 길이 체크
    if (password.length < 8) {
      return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다' }, { status: 400 })
    }

    // 나이 체크
    const birth = new Date(birthdate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--

    const minAge = country === 'KR' ? 19 : 18
    if (age < minAge) {
      return NextResponse.json(
        { error: `${country === 'KR' ? '만 19세' : '만 18세'} 이상만 가입 가능해요` },
        { status: 400 }
      )
    }

    // 이메일 중복 체크
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: '이미 사용 중인 이메일입니다' }, { status: 409 })
    }

    // 비밀번호 암호화
    const hashed = await bcrypt.hash(password, 10)

    // 유저 생성 (기본 잔고 10,000 USDT)
    const user = await prisma.user.create({
      data: {
        nickname,
        name,
        email,
        password: hashed,
        birthdate,
        country,
        marketing: marketing ?? false,
        balance: 10000,
      },
      select: {
        id: true, email: true,
        nickname: true, name: true,
        balance: true, country: true,
      },
    })

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}