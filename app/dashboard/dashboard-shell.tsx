'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SessionExpiredModal from '../components/SessionExpiredModal'

const navItems = [
  { href: '/dashboard', icon: 'home', label: 'Overview' },
  { href: '/dashboard/orders', icon: 'receipt_long', label: 'Pesanan' },
  { href: '/dashboard/menu', icon: 'restaurant_menu', label: 'Menu' },
  { href: '/dashboard/tables', icon: 'qr_code_2', label: 'Meja & QR' },
  { href: '/dashboard/analytics', icon: 'analytics', label: 'Analytics' },
  { href: '/dashboard/langganan', icon: 'card_membership', label: 'Langganan' },
]

export default function DashboardShell({
  children,
  userName,
  userEmail,
  restaurantName,
  restaurantSlug,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  restaurantName: string
  restaurantSlug?: string
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <>
      <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2' }}>
        {/* === SIDEBAR DESKTOP - CREAM/BEIGE === */}
        <aside
          className="hidden md:flex flex-col fixed left-0 top-0 h-full w-60 z-40"
          style={{
            backgroundColor: '#f4ede6',
            borderRight: '1px solid #e8e1db',
          }}
        >
          {/* Brand */}
          <div className="px-4 py-6">
            <h1
              style={{
                fontSize: '20px',
                lineHeight: '28px',
                fontWeight: 700,
                color: '#000000',
                margin: 0,
              }}
            >
              TymiY Admin
            </h1>
            <p
              style={{
                fontSize: '12px',
                lineHeight: '16px',
                fontWeight: 500,
                color: '#45464d',
                marginTop: '4px',
                margin: 0,
              }}
            >
              Restaurant Portal
            </p>
          </div>

          {/* Restaurant info */}
          <div className="px-3 mb-2">
            <div
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
                border: '1px solid #e8e1db',
              }}
            >
              <p
                style={{
                  fontSize: '10px',
                  lineHeight: '14px',
                  fontWeight: 500,
                  color: '#76777d',
                  letterSpacing: '0.02em',
                  margin: 0,
                  marginBottom: '2px',
                }}
              >
                RESTORAN
              </p>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 700,
                  color: '#000000',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {restaurantName}
              </p>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-2 mt-2" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {navItems.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    backgroundColor: active ? 'rgba(232, 225, 219, 0.6)' : 'transparent',
                    color: active ? '#000000' : '#45464d',
                    fontWeight: active ? 700 : 400,
                    borderRight: active ? '2px solid #000000' : '2px solid transparent',
                    transition: 'background-color 200ms, color 200ms',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'rgba(232, 225, 219, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    if (!active) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      marginRight: '16px',
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {item.icon}
                  </span>
                  <span style={{ fontSize: '14px', lineHeight: '20px' }}>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* View Live Menu CTA */}
          {restaurantSlug && (
            <div style={{ padding: '16px', borderTop: '1px solid #e8e1db' }}>
              <Link
                href={`/r/${restaurantSlug}`}
                target="_blank"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '8px 16px',
                  textAlign: 'center',
                  borderRadius: '12px',
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 500,
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  textDecoration: 'none',
                  transition: 'opacity 200ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                View Live Menu
              </Link>
            </div>
          )}

          {/* User Info + Logout */}
          <div
            style={{
              padding: '8px',
              borderTop: restaurantSlug ? 'none' : '1px solid #e8e1db',
            }}
          >
            <div style={{ padding: '8px 16px', marginBottom: '4px' }}>
              <p
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontWeight: 500,
                  color: '#000000',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userName}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#45464d',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {userEmail}
              </p>
            </div>

            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: '#45464d',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 200ms, color 200ms',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 218, 214, 0.5)'
                  e.currentTarget.style.color = '#ba1a1a'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = '#45464d'
                }}
              >
                <span className="material-symbols-outlined" style={{ marginRight: '16px' }}>
                  logout
                </span>
                <span style={{ fontSize: '14px', lineHeight: '20px' }}>Logout</span>
              </button>
            </form>
          </div>
        </aside>

        {/* === MAIN CONTENT === */}
        <main className="md:ml-60" style={{ minHeight: '100vh', paddingBottom: '80px' }}>
          {/* Top Bar Mobile */}
          <header
            className="md:hidden flex justify-between items-center px-4 sticky top-0 z-30"
            style={{
              height: '64px',
              backgroundColor: 'rgba(255, 248, 242, 0.95)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid #e8e1db',
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: '20px',
                  lineHeight: '28px',
                  fontWeight: 700,
                  color: '#000000',
                  margin: 0,
                }}
              >
                TymiY
              </h1>
              <p
                style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#45464d',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {restaurantName}
              </p>
            </div>
          </header>

          {children}
        </main>

        {/* === BOTTOM NAV MOBILE === */}
        <nav
          className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center"
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(255, 248, 242, 0.95)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid #e8e1db',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '4px 12px',
                  borderRadius: '9999px',
                  color: active ? '#ae3115' : '#45464d',
                  backgroundColor: active ? 'rgba(255, 218, 210, 0.4)' : 'transparent',
                  fontWeight: active ? 700 : 400,
                  textDecoration: 'none',
                  transition: 'all 150ms',
                }}
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {item.icon}
                </span>
                <span style={{ fontSize: '12px', lineHeight: '16px', fontWeight: 500 }}>
                  {item.label.split(' ')[0]}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>

      <SessionExpiredModal />
    </>
  )
}