'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils'

type Order = {
  id: string
  order_number: number
  status: string
  total: number
  customer_name: string | null
  notes: string | null
  created_at: string
  table_id: string | null
  restaurant_tables: { table_number: number } | { table_number: number }[] | null
  order_items: { id: string; item_name: string; quantity: number; subtotal: number }[]
}

const FILTERS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Menunggu' },
  { key: 'preparing', label: 'Diproses' },
  { key: 'completed', label: 'Selesai' },
  { key: 'cancelled', label: 'Dibatalkan' },
]

export default function OrdersClient({
  orders,
  totalCount,
  activeCount,
  currentPage,
  totalPages,
  currentStatus,
  currentSearch,

}: {
  orders: Order[]
  totalCount: number
  activeCount: number
  currentPage: number
  totalPages: number
  currentStatus: string
  currentSearch: string

}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchInput, setSearchInput] = useState(currentSearch)
  const [, startTransition] = useTransition()

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    // Reset page kalau ganti filter/search
    if (key !== 'page') {
      params.delete('page')
    }
    startTransition(() => {
      router.push(`/dashboard/orders?${params.toString()}`)
    })
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateParam('q', searchInput.trim())
  }

  function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'baru'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m yl`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}j yl`
    return `${Math.floor(seconds / 86400)}h yl`
  }

  function timeOnly(date: string) {
    return new Date(date).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6"
      >
        <div className="flex items-center gap-2">
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
            Pesanan
          </h1>
          <span
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            {activeCount} Aktif
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#76777d',
              fontSize: '20px',
            }}
          >
            search
          </span>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Cari pesanan atau #TY-0001..."
            style={{
              height: '40px',
              paddingLeft: '40px',
              paddingRight: '16px',
              width: '280px',
              backgroundColor: '#ffffff',
              border: '1px solid #c6c6cd',
              borderRadius: '12px',
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 200ms',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#000000')}
            onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
          />
        </form>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          position: 'sticky',
          top: '64px',
          zIndex: 30,
          backgroundColor: 'rgba(255, 248, 242, 0.8)',
          backdropFilter: 'blur(8px)',
          padding: '8px 0',
          borderBottom: '1px solid #e8e1db',
          marginBottom: '16px',
          overflowX: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 'max-content' }}>
          {FILTERS.map((filter) => {
            const isActive = currentStatus === filter.key
            return (
              <button
                key={filter.key}
                onClick={() => updateParam('status', filter.key === 'all' ? null : filter.key)}
                style={{
                  padding: '8px 16px',
                  color: isActive ? '#000000' : '#45464d',
                  fontWeight: isActive ? 700 : 400,
                  borderBottom: isActive ? '2px solid #000000' : '2px solid transparent',
                  borderRadius: isActive ? '0' : '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  fontSize: '14px',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(232, 225, 219, 0.5)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {filter.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          overflow: 'hidden',
          overflowX: 'auto',
        }}
      >
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead
            style={{
              backgroundColor: '#eee7e0',
              color: '#45464d',
              borderBottom: '1px solid #c6c6cd',
            }}
          >
            <tr>
              <th style={thStyle}>Order #</th>
              <th style={thStyle}>Meja</th>
              <th style={thStyle}>Pelanggan</th>
              <th style={thStyle}>Items</th>
              <th style={thStyle}>Total (Rp)</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
              <th style={thStyle}>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#76777d' }}>
                  Tidak ada pesanan
                </td>
              </tr>
            ) : (
              orders.map((order, idx) => {
                const table = Array.isArray(order.restaurant_tables)
                  ? order.restaurant_tables[0]
                  : order.restaurant_tables
                const itemCount = order.order_items?.length || 0
                const bgColor = idx % 2 === 0 ? '#ffffff' : '#faf2eb'

                return (
                  <tr
                    key={order.id}
                    style={{
                      backgroundColor: bgColor,
                      borderBottom: '1px solid rgba(198, 198, 205, 0.3)',
                      transition: 'background-color 200ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4ede6')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bgColor)}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono), monospace', color: '#000000' }}>
                      #TY-{String(order.order_number).padStart(4, '0')}
                    </td>
                    <td style={tdStyle}>
                      {table ? (
                        <span
                          style={{
                            backgroundColor: '#e8e1db',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            border: '1px solid #c6c6cd',
                          }}
                        >
                          T-{String(table.table_number).padStart(2, '0')}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#76777d' }}>Takeaway</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: '#1e1b17' }}>
                      {order.customer_name || 'Anonim'}
                    </td>
                    <td style={{ ...tdStyle, color: '#45464d' }}>{itemCount} menu</td>
                    <td style={{ ...tdStyle, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                    
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <StatusBadge status={order.status} />
                    </td>
                    <td style={{ ...tdStyle, color: '#76777d', fontSize: '13px' }}>
                      {timeOnly(order.created_at)} · {timeAgo(order.created_at)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between flex-wrap gap-3">
          <span style={{ fontSize: '14px', color: '#45464d' }}>
            Menampilkan {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalCount)} dari{' '}
            {totalCount} pesanan
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <PaginationBtn
              disabled={currentPage <= 1}
              onClick={() => updateParam('page', String(currentPage - 1))}
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </PaginationBtn>

            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const page = i + 1
              const isActive = page === currentPage
              return (
                <button
                  key={page}
                  onClick={() => updateParam('page', String(page))}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '12px',
                    backgroundColor: isActive ? '#000000' : 'transparent',
                    color: isActive ? '#ffffff' : '#45464d',
                    border: isActive ? 'none' : '1px solid #c6c6cd',
                    fontSize: '12px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = '#f4ede6'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  {page}
                </button>
              )
            })}

            <PaginationBtn
              disabled={currentPage >= totalPages}
              onClick={() => updateParam('page', String(currentPage + 1))}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </PaginationBtn>
          </div>
        </div>
      )}
    </div>
  )
}

// === Components ===

const thStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: '12px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const tdStyle: React.CSSProperties = {
  padding: '16px',
  fontSize: '14px',
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; color: string; border: string; dot: string; label: string }> = {
    pending: {
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
      dot: '#f59e0b',
      label: 'MENUNGGU',
    },
    preparing: {
      bg: '#dbeafe',
      color: '#1e40af',
      border: '#bfdbfe',
      dot: '#2563eb',
      label: 'DIPROSES',
    },
    completed: {
      bg: '#f1f5f9',
      color: '#334155',
      border: '#e2e8f0',
      dot: '#94a3b8',
      label: 'SELESAI',
    },
    cancelled: {
      bg: '#fee2e2',
      color: '#991b1b',
      border: '#fecaca',
      dot: '#dc2626',
      label: 'DIBATALKAN',
    },
  }
  const c = config[status] || config.pending
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        fontFamily: 'var(--font-jetbrains-mono), monospace',
        backgroundColor: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '9999px',
          backgroundColor: c.dot,
        }}
      />
      {c.label}
    </span>
  )
}

function PaginationBtn({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '40px',
        height: '40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        backgroundColor: 'transparent',
        border: '1px solid #c6c6cd',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        color: '#45464d',
        transition: 'background-color 200ms',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = '#f4ede6'
      }}
      onMouseLeave={(e) => {
        if (!disabled) e.currentTarget.style.backgroundColor = 'transparent'
      }}
    >
      {children}
    </button>
  )
}