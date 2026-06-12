'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { formatIDR } from '@/lib/utils'

type Order = {
  id: string
  total: number
  created_at: string
  completed_at: string | null
  status: string
  order_items: {
    menu_item_id: string | null
    item_name: string
    quantity: number
    subtotal: number
  }[]
}

type Category = {
  id: string
  name: string
  display_order: number
}

type MenuItem = {
  id: string
  name: string
  price: number
  category_id: string | null
}

type Metric = 'revenue' | 'avg_order' | 'total_order'

const UNCATEGORIZED_ID = '__uncategorized__'

export default function AnalyticsClient({
  period,
  orders,
  categories,
  items,
  startDate,
  endDate,
}: {
  period: number
  orders: Order[]
  categories: Category[]
  items: MenuItem[]
  startDate: string
  endDate: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeMetric, setActiveMetric] = useState<Metric>('revenue')

  function setPeriod(days: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('days', String(days))
    router.push(`/dashboard/analytics?${params.toString()}`)
  }

  // ===== KPIs =====
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const totalOrders = orders.length
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  // ===== Daily aggregation =====
  const dailyData = useMemo(() => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const days: { date: string; label: string; revenue: number; orderCount: number }[] = []

    const cursor = new Date(start)
    while (cursor <= end) {
      const dateKey = cursor.toISOString().slice(0, 10)
      days.push({
        date: dateKey,
        label: cursor.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
        revenue: 0,
        orderCount: 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }

    orders.forEach((o) => {
      const ts = o.completed_at || o.created_at
      const dateKey = new Date(ts).toISOString().slice(0, 10)
      const bucket = days.find((d) => d.date === dateKey)
      if (bucket) {
        bucket.revenue += Number(o.total)
        bucket.orderCount += 1
      }
    })

    return days.map((d) => ({
      ...d,
      avgOrder: d.orderCount > 0 ? d.revenue / d.orderCount : 0,
    }))
  }, [orders, startDate, endDate])

  // ===== Quantity per menu_item dalam period =====
  const quantityByItemId = useMemo(() => {
    const map: Record<string, { quantity: number; revenue: number }> = {}
    orders.forEach((o) => {
      o.order_items?.forEach((it) => {
        const key = it.menu_item_id || `name:${it.item_name}`
        if (!map[key]) map[key] = { quantity: 0, revenue: 0 }
        map[key].quantity += it.quantity
        map[key].revenue += Number(it.subtotal)
      })
    })
    return map
  }, [orders])

  // ===== Build kategori list dengan menu items + quantity =====
  type CategoryGroup = {
    id: string
    name: string
    items: { id: string; name: string; price: number; quantity: number; revenue: number }[]
    totalQuantity: number
  }

  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const groups: CategoryGroup[] = categories.map((cat) => {
      const catItems = items
        .filter((i) => i.category_id === cat.id)
        .map((i) => {
          const stats = quantityByItemId[i.id] || { quantity: 0, revenue: 0 }
          return {
            id: i.id,
            name: i.name,
            price: Number(i.price),
            quantity: stats.quantity,
            revenue: stats.revenue,
          }
        })
        .sort((a, b) => b.quantity - a.quantity)

      return {
        id: cat.id,
        name: cat.name,
        items: catItems,
        totalQuantity: catItems.reduce((sum, i) => sum + i.quantity, 0),
      }
    })

    // Add Uncategorized group
    const uncategorizedItems = items
      .filter((i) => !i.category_id)
      .map((i) => {
        const stats = quantityByItemId[i.id] || { quantity: 0, revenue: 0 }
        return {
          id: i.id,
          name: i.name,
          price: Number(i.price),
          quantity: stats.quantity,
          revenue: stats.revenue,
        }
      })
      .sort((a, b) => b.quantity - a.quantity)

    if (uncategorizedItems.length > 0) {
      groups.push({
        id: UNCATEGORIZED_ID,
        name: 'Lainnya',
        items: uncategorizedItems,
        totalQuantity: uncategorizedItems.reduce((sum, i) => sum + i.quantity, 0),
      })
    }

    return groups.filter((g) => g.items.length > 0)
  }, [categories, items, quantityByItemId])

  // Default: kategori pertama expanded
  const [expandedIds, setExpandedIds] = useState<string[]>(() =>
    categoryGroups.length > 0 ? [categoryGroups[0].id] : []
  )

  function toggleCategory(id: string) {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function expandAll() {
    setExpandedIds(categoryGroups.map((g) => g.id))
  }

  function collapseAll() {
    setExpandedIds([])
  }

  // ===== Chart config =====
  const metricConfig: Record<Metric, {
    label: string
    color: string
    gradientId: string
    values: number[]
    formatter: (v: number) => string
  }> = {
    revenue: {
      label: 'Revenue',
      color: '#16a34a',
      gradientId: 'gradRevenue',
      values: dailyData.map((d) => d.revenue),
      formatter: formatIDR,
    },
    avg_order: {
      label: 'Rata-rata Order',
      color: '#2563eb',
      gradientId: 'gradAvg',
      values: dailyData.map((d) => d.avgOrder),
      formatter: formatIDR,
    },
    total_order: {
      label: 'Total Order',
      color: '#ae3115',
      gradientId: 'gradOrders',
      values: dailyData.map((d) => d.orderCount),
      formatter: (v) => `${v}`,
    },
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <h1
            style={{
              fontSize: '32px',
              lineHeight: '40px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#000000',
              margin: 0,
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: '14px', color: '#45464d', margin: '4px 0 0 0' }}>
            Performa restoran {period} hari terakhir · {orders.length} order selesai
          </p>
        </div>

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
          {[7, 15, 30].map((d) => (
            <button
              key={d}
              onClick={() => setPeriod(d)}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: period === d ? '#000000' : 'transparent',
                color: period === d ? '#ffffff' : '#45464d',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
            >
              {d} Hari
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <KpiCard
          icon="payments"
          label="Revenue"
          value={formatIDR(totalRevenue)}
          color="#16a34a"
          active={activeMetric === 'revenue'}
          onClick={() => setActiveMetric('revenue')}
        />
        <KpiCard
          icon="trending_up"
          label="Rata-rata Order"
          value={formatIDR(avgOrder)}
          color="#2563eb"
          active={activeMetric === 'avg_order'}
          onClick={() => setActiveMetric('avg_order')}
        />
        <KpiCard
          icon="receipt_long"
          label="Total Order"
          value={String(totalOrders)}
          color="#ae3115"
          active={activeMetric === 'total_order'}
          onClick={() => setActiveMetric('total_order')}
        />
      </div>

      {/* Chart */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
            Tren {metricConfig[activeMetric].label}
          </p>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: '2px 0 0 0' }}>
            {period} Hari Terakhir
          </h3>
        </div>

        <AreaChart
          data={dailyData}
          metric={activeMetric}
          color={metricConfig[activeMetric].color}
          gradientId={metricConfig[activeMetric].gradientId}
          values={metricConfig[activeMetric].values}
          formatter={metricConfig[activeMetric].formatter}
        />
      </div>

      {/* Menu per Kategori (Accordion) */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
              Menu per Kategori
            </h3>
            <p style={{ fontSize: '11px', color: '#76777d', margin: '2px 0 0 0' }}>
              Jumlah terjual dalam {period} hari terakhir
            </p>
          </div>
          {categoryGroups.length > 0 && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={expandAll}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#f4ede6',
                  color: '#45464d',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Buka Semua
              </button>
              <button
                onClick={collapseAll}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#f4ede6',
                  color: '#45464d',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                Tutup Semua
              </button>
            </div>
          )}
        </div>

        {categoryGroups.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#76777d' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px', color: '#c6c6cd' }}>
              category
            </span>
            <p style={{ margin: 0, fontSize: '13px' }}>Belum ada menu</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {categoryGroups.map((group) => {
              const isExpanded = expandedIds.includes(group.id)
              return (
                <CategoryAccordion
                  key={group.id}
                  group={group}
                  isExpanded={isExpanded}
                  onToggle={() => toggleCategory(group.id)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// =================== Components ===================

function CategoryAccordion({
  group,
  isExpanded,
  onToggle,
}: {
  group: {
    id: string
    name: string
    items: { id: string; name: string; price: number; quantity: number; revenue: number }[]
    totalQuantity: number
  }
  isExpanded: boolean
  onToggle: () => void
}) {
  const maxQty = group.items[0]?.quantity || 0

  return (
    <div
      style={{
        border: '1px solid #e8e1db',
        borderRadius: '10px',
        overflow: 'hidden',
        backgroundColor: isExpanded ? '#faf2eb' : '#ffffff',
        transition: 'background-color 200ms',
      }}
    >
      {/* Header (clickable) */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: '14px 16px',
          backgroundColor: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: '22px',
            color: '#45464d',
            transition: 'transform 200ms',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            flexShrink: 0,
          }}
        >
          chevron_right
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#000000', margin: 0 }}>
            {group.name}
          </p>
          <p style={{ fontSize: '11px', color: '#76777d', margin: '2px 0 0 0' }}>
            {group.items.length} menu · {group.totalQuantity}x terjual
          </p>
        </div>

        <span
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#000000',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            padding: '4px 12px',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            border: '1px solid #e8e1db',
            flexShrink: 0,
          }}
        >
          {group.totalQuantity}x
        </span>
      </button>

      {/* Body (items list) */}
      {isExpanded && (
        <div style={{ padding: '0 16px 14px 50px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {group.items.length === 0 ? (
            <p style={{ fontSize: '12px', color: '#76777d', fontStyle: 'italic', margin: '8px 0 0 0' }}>
              Tidak ada menu di kategori ini
            </p>
          ) : (
            group.items.map((item, idx) => {
              const pct = maxQty > 0 ? (item.quantity / maxQty) * 100 : 0
              const isTop = idx === 0 && item.quantity > 0
              const isZero = item.quantity === 0

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e8e1db',
                    borderRadius: '8px',
                    opacity: isZero ? 0.55 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '6px',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                      {isTop && (
                        <span
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '5px',
                            backgroundColor: '#fbbf24',
                            color: '#78350f',
                            fontSize: '10px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          ★
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: '#000000',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexShrink: 0 }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: isZero ? '#76777d' : '#000000',
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                        }}
                      >
                        {item.quantity}x
                      </span>
                      <span style={{ fontSize: '10px', color: '#76777d', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                        {item.quantity > 0 ? formatIDR(item.revenue) : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: '4px', backgroundColor: '#f4ede6', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: isTop ? '#fbbf24' : '#ae3115',
                        borderRadius: '9999px',
                        transition: 'width 400ms',
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  color,
  active,
  onClick,
}: {
  icon: string
  label: string
  value: string
  color: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        border: active ? `2px solid ${color}` : '1px solid #c6c6cd',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 200ms',
        boxShadow: active ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>
            {icon}
          </span>
        </div>
        {active && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '9999px',
              backgroundColor: color,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Aktif
          </span>
        )}
      </div>
      <p
        style={{
          fontSize: '11px',
          color: '#45464d',
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
          fontSize: '24px',
          fontWeight: 700,
          color: '#000000',
          margin: '4px 0 0 0',
          letterSpacing: '-0.01em',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
        }}
      >
        {value}
      </p>
    </button>
  )
}

function AreaChart({
  data,
  metric,
  color,
  gradientId,
  values,
  formatter,
}: {
  data: { label: string; date: string }[]
  metric: Metric
  color: string
  gradientId: string
  values: number[]
  formatter: (v: number) => string
}) {
  const width = 720
  const height = 240
  const paddingLeft = 50
  const paddingRight = 16
  const paddingTop = 16
  const paddingBottom = 40

  const innerWidth = width - paddingLeft - paddingRight
  const innerHeight = height - paddingTop - paddingBottom

  const maxValue = Math.max(...values, 1)
  const niceMax = niceMaxValue(maxValue)

  const points = values.map((v, i) => {
    const x = paddingLeft + (i / Math.max(values.length - 1, 1)) * innerWidth
    const y = paddingTop + innerHeight - (v / niceMax) * innerHeight
    return { x, y, value: v }
  })

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

  const xLabelStep = Math.max(1, Math.ceil(data.length / 8))

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
              x={paddingLeft - 8}
              y={tick.y}
              fontSize="10"
              fill="#76777d"
              textAnchor="end"
              dominantBaseline="middle"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {formatYTick(tick.value, metric)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />

        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="#ffffff"
            stroke={color}
            strokeWidth={2}
          >
            <title>{`${data[i].label}: ${formatter(p.value)}`}</title>
          </circle>
        ))}

        {data.map((d, i) => {
          if (i % xLabelStep !== 0 && i !== data.length - 1) return null
          return (
            <text
              key={i}
              x={points[i].x}
              y={height - paddingBottom + 18}
              fontSize="10"
              fill="#76777d"
              textAnchor="middle"
              fontFamily="var(--font-jetbrains-mono), monospace"
            >
              {d.label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

// =================== Helpers ===================

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

function formatYTick(value: number, metric: Metric): string {
  if (metric === 'total_order') {
    return value === 0 ? '0' : Math.round(value).toString()
  }
  if (value === 0) return '0'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`
  return Math.round(value).toString()
}