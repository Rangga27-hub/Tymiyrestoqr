'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/utils'

type Invoice = {
  amount: number
  status: string
  issued_at: string | null
  paid_at: string | null
  period_start: string | null
  billing_model_applied: string | null
}

type RevenueMode = 'paid' | 'issued'

export default function OverviewClient({
  restaurantCount,
  ownerCount,
  cashierCount,
  activeSubsCount,
  totalRevenuePaid,
  totalRevenuePending,
  invoices,
}: {
  restaurantCount: number
  ownerCount: number
  cashierCount: number
  activeSubsCount: number
  totalRevenuePaid: number
  totalRevenuePending: number
  invoices: Invoice[]
}) {
  const [period, setPeriod] = useState<6 | 12>(6)
  const [mode, setMode] = useState<RevenueMode>('paid')

  // ===== Aggregate per bulan =====
  const monthlyData = useMemo(() => {
    const now = new Date()
    const months: {
      key: string
      label: string
      year: number
      month: number
      revenue: number
      invoiceCount: number
    }[] = []

    // Build month buckets
    for (let i = period - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(),
        month: d.getMonth(),
        revenue: 0,
        invoiceCount: 0,
      })
    }

    // Aggregate invoices
    invoices.forEach((inv) => {
      let bucketDate: Date | null = null

      if (mode === 'paid') {
        if (inv.status !== 'paid' || !inv.paid_at) return
        bucketDate = new Date(inv.paid_at)
      } else {
        // issued mode: hitung yang udah issued (issued + paid + overdue, semua yang bukan draft/void)
        if (!['issued', 'paid', 'overdue'].includes(inv.status)) return
        if (!inv.issued_at) return
        bucketDate = new Date(inv.issued_at)
      }

      const key = `${bucketDate.getFullYear()}-${String(bucketDate.getMonth() + 1).padStart(2, '0')}`
      const bucket = months.find((m) => m.key === key)
      if (bucket) {
        bucket.revenue += Number(inv.amount)
        bucket.invoiceCount += 1
      }
    })

    return months
  }, [invoices, period, mode])

  // Current vs previous month comparison
  const currentMonthRevenue = monthlyData[monthlyData.length - 1]?.revenue || 0
  const previousMonthRevenue = monthlyData[monthlyData.length - 2]?.revenue || 0
  const growthPct =
    previousMonthRevenue === 0
      ? currentMonthRevenue > 0
        ? 100
        : 0
      : ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100

  // Total period revenue
  const totalPeriodRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0)

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
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
        Overview
      </h1>
      <p style={{ fontSize: '14px', color: '#45464d', marginBottom: '32px' }}>
        Ringkasan seluruh platform TymiY
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="storefront" label="Total Restoran" value={String(restaurantCount)} color="#000000" />
        <StatCard icon="group" label="Owner" value={String(ownerCount)} color="#3b82f6" />
        <StatCard icon="badge" label="Kasir" value={String(cashierCount)} color="#8b5cf6" />
        <StatCard icon="verified" label="Langganan Aktif" value={String(activeSubsCount)} color="#16a34a" />
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#16a34a' }}>payments</span>
            <span style={{ fontSize: '13px', color: '#45464d', fontWeight: 500 }}>
              Pendapatan Terbayar (All-Time)
            </span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#000000', margin: 0, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {formatIDR(totalRevenuePaid)}
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span className="material-symbols-outlined" style={{ color: '#f59e0b' }}>hourglass_top</span>
            <span style={{ fontSize: '13px', color: '#45464d', fontWeight: 500 }}>
              Tagihan Belum Dibayar
            </span>
          </div>
          <p style={{ fontSize: '28px', fontWeight: 700, color: '#000000', margin: 0, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
            {formatIDR(totalRevenuePending)}
          </p>
        </div>
      </div>

      {/* ===== REVENUE CHART SECTION ===== */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Chart header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '20px',
          }}
        >
          <div>
            <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Tren Revenue Platform
            </p>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: '4px 0 0 0' }}>
              {period} Bulan Terakhir
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Mode toggle */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: '#faf2eb',
                border: '1px solid #e8e1db',
                borderRadius: '10px',
                padding: '4px',
              }}
            >
              <ToggleBtn active={mode === 'paid'} onClick={() => setMode('paid')}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px', verticalAlign: '-2px' }}>
                  check_circle
                </span>
                Sudah Dibayar
              </ToggleBtn>
              <ToggleBtn active={mode === 'issued'} onClick={() => setMode('issued')}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px', marginRight: '4px', verticalAlign: '-2px' }}>
                  receipt
                </span>
                Yang Ditagih
              </ToggleBtn>
            </div>

            {/* Period toggle */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '10px',
                padding: '4px',
              }}
            >
              <PeriodBtn active={period === 6} onClick={() => setPeriod(6)}>
                6 Bulan
              </PeriodBtn>
              <PeriodBtn active={period === 12} onClick={() => setPeriod(12)}>
                12 Bulan
              </PeriodBtn>
            </div>
          </div>
        </div>

        {/* Summary stats above chart */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            marginBottom: '24px',
          }}
        >
          <MetricBox
            label={mode === 'paid' ? 'Total Diterima' : 'Total Ditagih'}
            value={formatIDR(totalPeriodRevenue)}
            sub={`${period} bulan`}
            color="#16a34a"
          />
          <MetricBox
            label="Bulan Ini"
            value={formatIDR(currentMonthRevenue)}
            sub={monthlyData[monthlyData.length - 1]?.label || ''}
            color="#2563eb"
          />
          <MetricBox
            label="Pertumbuhan"
            value={`${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%`}
            sub="vs bulan lalu"
            color={growthPct >= 0 ? '#16a34a' : '#dc2626'}
            arrow={growthPct >= 0 ? 'up' : 'down'}
          />
        </div>

        {/* Chart */}
        <RevenueChart data={monthlyData} mode={mode} />

        {/* Info note */}
        <div
          style={{
            marginTop: '16px',
            padding: '10px 14px',
            backgroundColor: '#e0f2fe',
            border: '1px solid #7dd3fc',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#0c4a6e',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }}>
            info
          </span>
          <span>
            {mode === 'paid'
              ? 'Mode "Sudah Dibayar": revenue dihitung dari invoice yang sudah ditandai paid. Ini revenue real yang masuk.'
              : 'Mode "Yang Ditagih": revenue dihitung dari semua invoice yang sudah diissue (termasuk yang belum dibayar). Untuk lihat potensi pendapatan.'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', marginBottom: '16px' }}>
        Aksi Cepat
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction href="/admin/users" icon="person_add" title="Tambah Pengguna" description="Buat akun owner atau kasir baru" />
        <QuickAction href="/admin/restaurants" icon="add_business" title="Kelola Restoran" description="Lihat & atur semua restoran" />
        <QuickAction href="/admin/billing" icon="request_quote" title="Generate Invoice" description="Buat tagihan periode berjalan" />
      </div>
    </div>
  )
}

// ============ Components ============

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: string
  color: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        borderRadius: '12px',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          marginBottom: '12px',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
          {icon}
        </span>
      </div>
      <p style={{ fontSize: '11px', color: '#45464d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
        {label}
      </p>
      <p style={{ fontSize: '28px', fontWeight: 700, color: '#000000', margin: '4px 0 0 0', letterSpacing: '-0.02em' }}>
        {value}
      </p>
    </div>
  )
}

function MetricBox({
  label,
  value,
  sub,
  color,
  arrow,
}: {
  label: string
  value: string
  sub: string
  color: string
  arrow?: 'up' | 'down'
}) {
  return (
    <div
      style={{
        padding: '14px 16px',
        backgroundColor: '#faf2eb',
        border: '1px solid #e8e1db',
        borderRadius: '10px',
      }}
    >
      <p
        style={{
          fontSize: '10px',
          color: '#76777d',
          margin: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 500,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '18px',
          fontWeight: 700,
          color,
          margin: '4px 0 0 0',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {arrow && (
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            {arrow === 'up' ? 'arrow_upward' : 'arrow_downward'}
          </span>
        )}
        {value}
      </p>
      <p style={{ fontSize: '11px', color: '#45464d', margin: '2px 0 0 0' }}>
        {sub}
      </p>
    </div>
  )
}

function ToggleBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: active ? '#000000' : 'transparent',
        color: active ? '#ffffff' : '#45464d',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 200ms',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function PeriodBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 12px',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 600,
        backgroundColor: active ? '#000000' : 'transparent',
        color: active ? '#ffffff' : '#45464d',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 200ms',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '20px',
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        borderRadius: '12px',
        textDecoration: 'none',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '24px', color: '#000000' }}>
        {icon}
      </span>
      <span style={{ fontSize: '15px', fontWeight: 600, color: '#000000' }}>{title}</span>
      <span style={{ fontSize: '12px', color: '#45464d' }}>{description}</span>
    </Link>
  )
}

// ============ Chart Component ============

function RevenueChart({
  data,
  mode,
}: {
  data: { label: string; revenue: number; invoiceCount: number }[]
  mode: RevenueMode
}) {
  const width = 720
  const height = 280
  const paddingLeft = 60
  const paddingRight = 20
  const paddingTop = 20
  const paddingBottom = 50

  const innerWidth = width - paddingLeft - paddingRight
  const innerHeight = height - paddingTop - paddingBottom

  const values = data.map((d) => d.revenue)
  const maxValue = Math.max(...values, 1)
  const niceMax = niceMaxValue(maxValue)

  const points = values.map((v, i) => {
    const x = paddingLeft + (i / Math.max(values.length - 1, 1)) * innerWidth
    const y = paddingTop + innerHeight - (v / niceMax) * innerHeight
    return { x, y, value: v }
  })

  const color = mode === 'paid' ? '#16a34a' : '#2563eb'
  const gradientId = mode === 'paid' ? 'gradPaid' : 'gradIssued'

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ')

  const areaPath =
    points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
      .join(' ') +
    ` L ${points[points.length - 1].x.toFixed(2)} ${paddingTop + innerHeight} L ${points[0].x.toFixed(2)} ${paddingTop + innerHeight} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    value: niceMax * p,
    y: paddingTop + innerHeight - p * innerHeight,
  }))

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', minWidth: '500px', display: 'block' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid lines + labels */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              stroke="#e8e1db"
              strokeWidth={1}
              strokeDasharray={idx === 0 ? '0' : '3 3'}
            />
            <text
              x={paddingLeft - 10}
              y={tick.y}
              fontSize="10"
              fill="#76777d"
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {formatYTick(tick.value)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill="#ffffff"
            stroke={color}
            strokeWidth={2.5}
          >
            <title>{`${data[i].label}: ${formatIDR(p.value)} (${data[i].invoiceCount} invoice)`}</title>
          </circle>
        ))}

        {/* X-axis labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={points[i].x}
            y={height - paddingBottom + 20}
            fontSize="10"
            fill="#76777d"
            textAnchor="middle"
            fontFamily="var(--font-jetbrains-mono), monospace"
          >
            {d.label}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ============ Helpers ============

function niceMaxValue(max: number): number {
  if (max <= 0) return 10
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  const normalized = max / magnitude
  let niceFactor: number
  if (normalized <= 1) niceFactor = 1
  else if (normalized <= 2) niceFactor = 2
  else if (normalized <= 5) niceFactor = 5
  else niceFactor = 10
  return niceFactor * magnitude
}

function formatYTick(value: number): string {
  if (value === 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return Math.round(value).toString()
}