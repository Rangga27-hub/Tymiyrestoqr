'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/admin', icon: 'dashboard', label: 'Overview' },
  { href: '/admin/restaurants', icon: 'storefront', label: 'Restoran' },
  { href: '/admin/users', icon: 'group', label: 'Pengguna' },
  { href: '/admin/billing', icon: 'receipt_long', label: 'Billing' },
]

export default function AdminShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode
  userName: string
  userEmail: string
}) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2', display: 'flex' }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex"
        style={{
          width: '240px',
          backgroundColor: '#f4ede6',
          borderRight: '1px solid #e8e1db',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #e8e1db' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: 0 }}>
            TymiY Admin
          </h1>
          <p style={{ fontSize: '11px', color: '#45464d', margin: '2px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Super Admin
          </p>
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: active ? '#000000' : 'transparent',
                  color: active ? '#ffffff' : '#45464d',
                  fontWeight: active ? 700 : 500,
                  textDecoration: 'none',
                  fontSize: '14px',
                  transition: 'all 200ms',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid #e8e1db' }}>
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: '#000000', margin: 0 }}>
              {userName}
            </p>
            <p style={{ fontSize: '11px', color: '#45464d', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {userEmail}
            </p>
          </div>
          <form action="/auth/signout" method="POST">
            <button
              type="submit"
              style={{
                width: '100%',
                backgroundColor: '#ffdad6',
                color: '#ba1a1a',
                border: 'none',
                padding: '10px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
      </aside>

      {/* Mobile top bar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header
          className="md:hidden"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 50,
            backgroundColor: '#f4ede6',
            borderBottom: '1px solid #e8e1db',
            padding: '12px 16px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: 0 }}>
              TymiY Admin
            </h1>
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                style={{
                  backgroundColor: '#ffdad6',
                  color: '#ba1a1a',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                Logout
              </button>
            </form>
          </div>
          <nav style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
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
                    backgroundColor: active ? '#000000' : '#ffffff',
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

        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  )
}