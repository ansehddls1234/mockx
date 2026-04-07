'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const COUNTRIES = [
  { code: 'KR', name: '🇰🇷 대한민국' },
  { code: 'US', name: '🇺🇸 United States' },
  { code: 'JP', name: '🇯🇵 日本' },
  { code: 'CN', name: '🇨🇳 中国' },
  { code: 'GB', name: '🇬🇧 United Kingdom' },
  { code: 'DE', name: '🇩🇪 Deutschland' },
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'SG', name: '🇸🇬 Singapore' },
  { code: 'AU', name: '🇦🇺 Australia' },
  { code: 'CA', name: '🇨🇦 Canada' },
  { code: 'OTHER', name: '🌍 기타' },
]

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep]           = useState(1) // 1: 기본정보, 2: 약관동의
  const [nickname, setNickname]   = useState('')
  const [name, setName]           = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [birthdate, setBirthdate] = useState('')
  const [country, setCountry]     = useState('KR')
  const [agreeTerms, setAgreeTerms]     = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge]         = useState(false)
  const [marketing, setMarketing]       = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // 비밀번호 강도
  const getStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 8)          score++
    if (/[A-Z]/.test(pw))        score++
    if (/[0-9]/.test(pw))        score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    const colors = ['#ff4d6a', '#ff4d6a', '#f0b90b', '#00d4aa', '#00d4aa']
    const labels = ['매우 약함', '약함', '보통', '강함', '매우 강함']
    return { score, color: colors[score], label: labels[score] }
  }
  const strength = getStrength(password)

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!nickname || !name || !email || !password || !birthdate) {
      setError('모든 항목을 입력해주세요')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다')
      return
    }
    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요')
      return
    }
    setStep(2)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!agreeTerms || !agreePrivacy || !agreeAge) {
      setError('필수 약관에 모두 동의해주세요')
      return
    }

    setLoading(true)

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, name, email, password, birthdate, country, marketing }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error)
      setStep(1)
      return
    }

    // 자동 로그인
    const loginRes = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const loginData = await loginRes.json()
    localStorage.setItem('user', JSON.stringify(loginData.user))
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
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* 로고 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: '28px',
            fontWeight: 'bold', color: 'white',
          }}>
            MOCK<span style={{ color: '#00d4aa' }}>X</span>
          </span>
          <p style={{ color: '#4a4e63', fontSize: '13px', marginTop: '6px' }}>
            가입하면 <strong style={{ color: '#00d4aa' }}>10,000 USDT</strong>로 시작해요!
          </p>
        </div>

        {/* 스텝 인디케이터 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          {[1, 2].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: '28px', height: '28px',
                borderRadius: '50%',
                background: step >= s ? '#00d4aa' : '#1a1d25',
                border: `1px solid ${step >= s ? '#00d4aa' : '#2a2d35'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 'bold',
                color: step >= s ? '#000' : '#4a4e63',
                flexShrink: 0,
              }}>
                {s}
              </div>
              <span style={{
                marginLeft: '8px', fontSize: '12px',
                color: step >= s ? 'white' : '#4a4e63',
              }}>
                {s === 1 ? '기본 정보' : '약관 동의'}
              </span>
              {i === 0 && (
                <div style={{
                  flex: 1, height: '1px',
                  background: step >= 2 ? '#00d4aa' : '#222',
                  margin: '0 12px',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* 카드 */}
        <div style={{
          background: '#111318',
          border: '1px solid #222',
          borderRadius: '16px',
          padding: '24px',
        }}>

          {/* 에러 */}
          {error && (
            <div style={{
              background: 'rgba(255,77,106,0.08)',
              border: '1px solid rgba(255,77,106,0.3)',
              borderRadius: '8px', padding: '10px 12px',
              fontSize: '12px', color: '#ff4d6a', marginBottom: '16px',
            }}>
              {error}
            </div>
          )}

          {/* 스텝 1: 기본 정보 */}
          {step === 1 && (
            <form onSubmit={handleNext} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: 'white', marginBottom: '4px' }}>
                기본 정보 입력
              </h2>

              {/* 닉네임 */}
              <Field label="닉네임" required>
                <input
                  type="text" value={nickname}
                  onChange={e => setNickname(e.target.value)}
                  placeholder="트레이더123"
                  style={inputStyle}
                />
              </Field>

              {/* 이름 */}
              <Field label="이름 (실명)" required>
                <input
                  type="text" value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="홍길동"
                  style={inputStyle}
                />
              </Field>

              {/* 이메일 */}
              <Field label="이메일" required>
                <input
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  style={inputStyle}
                />
              </Field>

              {/* 비밀번호 */}
              <Field label="비밀번호 (8자 이상)" required>
                <input
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
                {password.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '3px' }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i < strength.score ? strength.color : '#222',
                          transition: 'background 0.2s',
                        }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '10px', color: strength.color }}>
                      {strength.label}
                    </span>
                  </div>
                )}
              </Field>

              {/* 비밀번호 확인 */}
              <Field label="비밀번호 확인" required>
                <input
                  type="password" value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    ...inputStyle,
                    borderColor: confirm && password !== confirm
                      ? 'rgba(255,77,106,0.5)' : '#2a2d35',
                  }}
                />
                {confirm && password !== confirm && (
                  <span style={{ fontSize: '10px', color: '#ff4d6a', marginTop: '3px', display: 'block' }}>
                    비밀번호가 일치하지 않아요
                  </span>
                )}
              </Field>

              {/* 생년월일 */}
              <Field label="생년월일" required>
                <input
                  type="date" value={birthdate}
                  onChange={e => setBirthdate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  style={inputStyle}
                />
              </Field>

              {/* 국가 */}
              <Field label="국가" required>
                <select
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </Field>

              <button type="submit" style={btnStyle('#00d4aa', '#000')}>
                다음 →
              </button>
            </form>
          )}

          {/* 스텝 2: 약관 동의 */}
          {step === 2 && (
            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: '500', color: 'white', marginBottom: '4px' }}>
                약관 동의
              </h2>

              {/* 전체 동의 */}
              <div
                onClick={() => {
                  const allChecked = agreeTerms && agreePrivacy && agreeAge && marketing
                  setAgreeTerms(!allChecked)
                  setAgreePrivacy(!allChecked)
                  setAgreeAge(!allChecked)
                  setMarketing(!allChecked)
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px', borderRadius: '8px',
                  background: '#1a1d25', cursor: 'pointer',
                  border: '1px solid #2a2d35',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '4px',
                  background: agreeTerms && agreePrivacy && agreeAge && marketing ? '#00d4aa' : 'transparent',
                  border: `1.5px solid ${agreeTerms && agreePrivacy && agreeAge && marketing ? '#00d4aa' : '#4a4e63'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {agreeTerms && agreePrivacy && agreeAge && marketing && (
                    <span style={{ color: '#000', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                  )}
                </div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'white' }}>
                  전체 동의
                </span>
              </div>

              <div style={{ height: '0.5px', background: '#222' }} />

              {/* 개별 약관 */}
              {[
                { label: '[필수] 이용약관 동의', checked: agreeTerms, setChecked: setAgreeTerms, link: true },
                { label: '[필수] 개인정보처리방침 동의', checked: agreePrivacy, setChecked: setAgreePrivacy, link: true },
                { label: '[필수] 만 18세 이상 확인', checked: agreeAge, setChecked: setAgreeAge, link: false },
                { label: '[선택] 마케팅 정보 수신 동의', checked: marketing, setChecked: setMarketing, link: false },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                  onClick={() => item.setChecked(!item.checked)}
                >
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '3px',
                    background: item.checked ? '#00d4aa' : 'transparent',
                    border: `1.5px solid ${item.checked ? '#00d4aa' : '#4a4e63'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {item.checked && (
                      <span style={{ color: '#000', fontSize: '10px', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: item.checked ? 'white' : '#8b8fa8', flex: 1 }}>
                    {item.label}
                  </span>
                  {item.link && (
                    <span style={{ fontSize: '11px', color: '#4a4e63' }}>보기 &gt;</span>
                  )}
                </div>
              ))}

              <div style={{ height: '0.5px', background: '#222' }} />

              {/* 버튼 */}
              <button
                type="submit" disabled={loading}
                style={btnStyle(loading ? '#333' : '#00d4aa', loading ? 'white' : '#000')}
              >
                {loading ? '가입 중...' : '가입 완료 →'}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: '100%', padding: '10px',
                  background: 'transparent',
                  border: '1px solid #2a2d35',
                  borderRadius: '8px', color: '#8b8fa8',
                  fontSize: '13px', cursor: 'pointer',
                }}
              >
                ← 이전
              </button>
            </form>
          )}
        </div>

        {/* 로그인 링크 */}
        <p style={{
          textAlign: 'center', marginTop: '20px',
          fontSize: '13px', color: '#4a4e63',
        }}>
          이미 계정이 있으신가요?{' '}
          <Link href="/login" style={{ color: '#00d4aa', textDecoration: 'none' }}>
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}

// 스타일 헬퍼
const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#0a0b0e',
  border: '1px solid #2a2d35',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '13px',
  color: 'white',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  width: '100%', padding: '12px',
  background: bg, border: 'none',
  borderRadius: '8px', color,
  fontSize: '14px', fontWeight: 'bold',
  cursor: 'pointer', marginTop: '4px',
})

function Field({ label, required, children }: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={{
        fontSize: '11px', color: '#8b8fa8',
        display: 'block', marginBottom: '6px',
      }}>
        {label} {required && <span style={{ color: '#ff4d6a' }}>*</span>}
      </label>
      {children}
    </div>
  )
}