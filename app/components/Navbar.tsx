'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  name: string
  nickname?: string
  balance: number
}

export default function Navbar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser]         = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    setUser(stored ? JSON.parse(stored) : null)
  }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setMenuOpen(false)
    router.push('/')
  }

  return (
    <>
      <nav style={{
        height: '52px',
        background: '#111318',
        borderBottom: '1px solid #222',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 100,
        position: 'relative',
      }}>
        {/* 로고 */}
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{
            fontFamily: 'monospace', fontSize: '18px',
            fontWeight: 'bold', color: 'white',
          }}>
            MOCK<span style={{ color: '#00d4aa' }}>X</span>
          </span>
        </Link>

        {/* 데스크톱 메뉴 */}
        <div style={{ display: 'flex', gap: '4px' }} className="desktop-only">
          {[
            { label: '거래',       href: '/'        },
            { label: '포트폴리오', href: '/mypage'  },
            { label: '랭킹',       href: '/ranking' },
          ].map(menu => (
            <Link key={menu.href} href={menu.href} style={{
              padding: '6px 12px', borderRadius: '6px',
              fontSize: '13px', textDecoration: 'none',
              color: pathname === menu.href ? 'white' : '#8b8fa8',
              background: pathname === menu.href ? '#1a1d25' : 'transparent',
            }}>
              {menu.label}
            </Link>
          ))}
        </div>

        {/* 데스크톱 우측 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="desktop-only">
          {user ? (
            <>
              <Link href="/mypage" style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: '#1a1d25', border: '1px solid #2a2d35',
                borderRadius: '8px', padding: '6px 12px', textDecoration: 'none',
              }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: '#00d4aa22', border: '1px solid #00d4aa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 'bold', color: '#00d4aa',
                }}>
                  {(user.nickname ?? user.name)[0].toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', color: 'white' }}>
                  {user.nickname ?? user.name}
                </span>
                <span style={{ fontSize: '12px', color: '#00d4aa', fontFamily: 'monospace' }}>
                  ${user.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </Link>
              <button onClick={handleLogout} style={{
                background: 'transparent', border: '1px solid #333',
                color: '#8b8fa8', padding: '7px 14px',
                borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
              }}>
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link href="/login" style={{
                padding: '7px 14px', borderRadius: '8px',
                border: '1px solid #333', color: '#aaa',
                fontSize: '13px', textDecoration: 'none',
              }}>로그인</Link>
              <Link href="/signup" style={{
                padding: '7px 14px', borderRadius: '8px',
                background: '#00d4aa', color: '#000',
                fontSize: '13px', fontWeight: 'bold', textDecoration: 'none',
              }}>시작하기</Link>
            </>
          )}
        </div>

        {/* 모바일 우측 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} className="mobile-only">
          {user && (
            <span style={{ fontSize: '12px', color: '#00d4aa', fontFamily: 'monospace' }}>
              ${user.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
          )}
          {/* 햄버거 버튼 */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'transparent', border: 'none',
              cursor: 'pointer', padding: '4px',
              display: 'flex', flexDirection: 'column',
              gap: '5px',
            }}
          >
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '22px', height: '2px',
                background: 'white', borderRadius: '2px',
                transition: 'all 0.2s',
                transform: menuOpen
                  ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
                  : i === 1 ? 'opacity: 0'
                  : 'rotate(-45deg) translate(5px, -5px)'
                  : 'none',
                opacity: menuOpen && i === 1 ? 0 : 1,
              }} />
            ))}
          </button>
        </div>
      </nav>

      {/* 모바일 드롭다운 메뉴 */}
      {menuOpen && (
        <div style={{
          position: 'fixed', top: '52px', left: 0, right: 0,
          background: '#111318', borderBottom: '1px solid #222',
          zIndex: 99, padding: '12px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }} className="mobile-only">
          {[
            { label: '거래',       href: '/'        },
            { label: '포트폴리오', href: '/mypage'  },
            { label: '랭킹',       href: '/ranking' },
          ].map(menu => (
            <Link
              key={menu.href} href={menu.href}
              onClick={() => setMenuOpen(false)}
              style={{
                padding: '12px 16px', borderRadius: '8px',
                fontSize: '14px', textDecoration: 'none',
                color: 'white', background: pathname === menu.href ? '#1a1d25' : 'transparent',
              }}
            >
              {menu.label}
            </Link>
          ))}

          <div style={{ height: '1px', background: '#222', margin: '4px 0' }} />

          {user ? (
            <>
              <div style={{
                padding: '12px 16px', borderRadius: '8px',
                background: '#1a1d25',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: '#00d4aa22', border: '1px solid #00d4aa',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 'bold', color: '#00d4aa',
                }}>
                  {(user.nickname ?? user.name)[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>
                    {user.nickname ?? user.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#00d4aa', fontFamily: 'monospace' }}>
                    ${user.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <button onClick={handleLogout} style={{
                padding: '12px 16px', borderRadius: '8px',
                background: 'transparent', border: 'none',
                color: '#ff4d6a', fontSize: '14px',
                cursor: 'pointer', textAlign: 'left',
              }}>
                로그아웃
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', gap: '8px', padding: '4px 0' }}>
              <Link href="/login" onClick={() => setMenuOpen(false)} style={{
                flex: 1, padding: '12px', borderRadius: '8px',
                border: '1px solid #333', color: 'white',
                fontSize: '14px', textDecoration: 'none', textAlign: 'center',
              }}>로그인</Link>
              <Link href="/signup" onClick={() => setMenuOpen(false)} style={{
                flex: 1, padding: '12px', borderRadius: '8px',
                background: '#00d4aa', color: '#000',
                fontSize: '14px', fontWeight: 'bold',
                textDecoration: 'none', textAlign: 'center',
              }}>시작하기</Link>
            </div>
          )}
        </div>
      )}

      <style>{`
        .desktop-only { display: flex !important; }
        .mobile-only  { display: none !important; }

        @media (max-width: 768px) {
          .desktop-only { display: none !important; }
          .mobile-only  { display: flex !important; }
        }
      `}</style>
    </>
  )
}