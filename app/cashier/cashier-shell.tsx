'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import SessionExpiredModal from '../components/SessionExpiredModal'

const navItems = [
  { href: '/cashier', icon: 'receipt_long', label: 'Pesanan' },
  { href: '/cashier/dapur', icon: 'soup_kitchen', label: 'Pesanan Dapur' },
  { href: '/cashier/stok', icon: 'inventory_2', label: 'Manajemen Stok' },
]

export default function CashierShell({
  children,
  userName,
  userEmail,
  restaurantName,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
  restaurantName: string
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/cashier') return pathname === '/cashier'
    return pathname.startsWith(href)
  }

  return (
    <>
      <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2' }}>
        {/* Top Bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: 'rgba(255, 248, 242, 0.95)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid #e8e1db',
            padding: '12px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '1280px',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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
                  TymiY Kasir
                </h1>
                <p style={{ fontSize: '12px', color: '#45464d', margin: 0 }}>
                  {restaurantName}
                </p>
              </div>

              {/* Nav (Desktop) */}
              <nav className="hidden md:flex" style={{ gap: '4px', alignItems: 'center' }}>
                {navItems.map((item) => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        backgroundColor: active ? '#000000' : 'transparent',
                        color: active ? '#ffffff' : '#45464d',
                        fontWeight: active ? 700 : 500,
                        textDecoration: 'none',
                        fontSize: '13px',
                        transition: 'all 200ms',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px' }}
                      >
                        {item.icon}
                      </span>
                      {item.label}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* User + Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ textAlign: 'right' }} className="hidden sm:block">
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#000000', margin: 0 }}>
                  {userName}
                </p>
                <p style={{ fontSize: '11px', color: '#45464d', margin: 0 }}>
                  {userEmail}
                </p>
              </div>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  style={{
                    backgroundColor: '#ffdad6',
                    color: '#ba1a1a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    logout
                  </span>
                  Logout
                </button>
              </form>
            </div>
          </div>

          {/* Mobile Nav */}
          <nav
            className="md:hidden"
            style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              marginTop: '12px',
              overflowX: 'auto',
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
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    backgroundColor: active ? '#000000' : '#f4ede6',
                    color: active ? '#ffffff' : '#45464d',
                    fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </header>

        <main>{children}</main>
      </div>

      <SessionExpiredModal />
    </>
  )
}