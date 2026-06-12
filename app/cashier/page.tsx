import Link from 'next/link'

export default function CashierHomePage() {
  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '32px',
          lineHeight: '40px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: '#000000',
          margin: 0,
          marginBottom: '8px',
        }}
      >
        Dashboard Kasir
      </h1>
      <p style={{ fontSize: '14px', color: '#45464d', marginBottom: '32px' }}>
        Kelola pesanan masuk dan stok menu
      </p>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
        style={{ maxWidth: '720px' }}
      >
        <ActionCard
          href="/cashier/dapur"
          icon="soup_kitchen"
          title="Pesanan Dapur"
          description="Lihat & update status pesanan masuk secara realtime"
          color="#ae3115"
        />
        <ActionCard
          href="/cashier/stok"
          icon="inventory_2"
          title="Manajemen Stok"
          description="Atur stok menu, tandai habis/tersedia dengan cepat"
          color="#000000"
        />
      </div>
    </div>
  )
}

function ActionCard({
  href,
  icon,
  title,
  description,
  color,
}: {
  href: string
  icon: string
  title: string
  description: string
  color: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'transform 200ms, box-shadow 200ms',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: color,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
          {icon}
        </span>
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: 0 }}>
          {title}
        </h3>
        <p style={{ fontSize: '13px', color: '#45464d', margin: '4px 0 0 0' }}>
          {description}
        </p>
      </div>
    </Link>
  )
}