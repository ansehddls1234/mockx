'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      return
    }

    // 로그인 성공 — 로컬스토리지에 저장
    localStorage.setItem('user', JSON.stringify(data.user))
    window.location.href = '/'
  }
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0b0e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
      }}>
        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'white',
          }}>
            MOCK<span style={{ color: '#00d4aa' }}>X</span>
          </span>
          <p style={{ color: '#4a4e63', fontSize: '13px', marginTop: '8px' }}>
            코인 모의투자 플랫폼
          </p>
        </div>

        {/* 카드 */}
        <div style={{
          background: '#111318',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '28px',
        }}>
          <h1 style={{
            fontSize: '16px',
            fontWeight: '500',
            color: 'white',
            marginBottom: '20px',
          }}>
            로그인
          </h1>

          {/* 에러 */}
          {error && (
            <div style={{
              background: 'rgba(255,77,106,0.08)',
              border: '1px solid rgba(255,77,106,0.3)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#ff4d6a',
              marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 이메일 */}
            <div>
              <label style={{ fontSize: '11px', color: '#8b8fa8', display: 'block', marginBottom: '6px' }}>
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                style={{
                  width: '100%',
                  background: '#0a0b0e',
                  border: '1px solid #2a2d35',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 비밀번호 */}
            <div>
              <label style={{ fontSize: '11px', color: '#8b8fa8', display: 'block', marginBottom: '6px' }}>
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  background: '#0a0b0e',
                  border: '1px solid #2a2d35',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '4px',
                width: '100%',
                padding: '12px',
                background: loading ? 'rgba(0,212,170,0.5)' : '#00d4aa',
                border: 'none',
                borderRadius: '8px',
                color: '#000',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </div>

        {/* 회원가입 링크 */}
        <p style={{
          textAlign: 'center',
          marginTop: '20px',
          fontSize: '13px',
          color: '#4a4e63',
        }}>
          계정이 없으신가요?{' '}
          <Link href="/signup" style={{ color: '#00d4aa', textDecoration: 'none' }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}

