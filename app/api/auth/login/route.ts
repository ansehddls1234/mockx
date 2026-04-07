import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // 빈칸 체크
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 입력해주세요' },
        { status: 400 }
      )
    }

    // 유저 찾기
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return NextResponse.json(
        { error: '존재하지 않는 이메일입니다' },
        { status: 404 }
      )
    }

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json(
        { error: '비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    // 성공 — 유저 정보 반환
    return NextResponse.json({
      user: {
        id:      user.id,
        email:   user.email,
        name:    user.name,
        balance: user.balance,
      }
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}