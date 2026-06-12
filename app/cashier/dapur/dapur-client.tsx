'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils'

type OrderItem = {
  id: string
  item_name: string
  quantity: number
  subtotal: number
  price_at_order: number
}

type Order = {
  id: string
  order_number: number
  customer_name: string | null
  notes: string | null
  total: number
  status: string
  created_at: string
  completed_at: string | null
  restaurant_tables: { table_number: number } | { table_number: number }[] | null
  order_items: OrderItem[]
}

type Filter = 'active' | 'pending' | 'preparing' | 'completed'

export default function DapurClient({
  restaurantId,
  initialOrders,
}: {
  restaurantId: string
  initialOrders: Order[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [orders, setOrders] = useState<Order[]>(initialOrders)
  const [filter, setFilter] = useState<Filter>('active')
  const [searchTerm, setSearchTerm] = useState('')
  const [, startTransition] = useTransition()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const newOrderIdsRef = useRef<Set<string>>(new Set())
  const initialOrderIdsRef = useRef<Set<string>>(new Set(initialOrders.map((o) => o.id)))

  // Update current time every second for "X menit lalu" labels
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Initialize audio (beep sound via data URI - simple sine wave)
  useEffect(() => {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRpYGAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YXIGAACBAIQAhwCJAIsAjQCOAI8AjwCPAI4AjQCMAIoAhwCFAIIAfgB7AHcAcwBuAGoAZQBgAFsAVgBQAEsARQBAADsANgAxACwAJwAjAB8AHAAYABYAFAATABIAEgATABQAFgAYABwAHwAjACcALAAxADYAOwBAAEUASwBQAFYAWwBgAGUAagBuAHMAdwB7AH4AggCFAIcAigCMAI0AjgCPAI8AjwCOAI0AiwCJAIcAhACBAH4AewB3AHMAbgBpAGUAYABbAFYAUABLAEUAQAA7ADYAMQAsACcAIwAfABwAGAAWABQAEwASABIAEwAUABYAGAAcAB8AIwAnACwAMQA2ADsAQABFAEsAUABWAFsAYABlAGoAbgBzAHcAewB+AIIAhQCHAIoAjACNAI4AjwCPAI8AjgCNAIsAiQCHAIQAgQB+AHsAdwBzAG4AaQBlAGAAWwBWAFAASwBFAEAAOwA2ADEALAAnACMAHwAcABgAFgAUABMAEgASABMAFAAWABgAHAAfACMAJwAsADEANgA7AEAARQBLAFAAVgBbAGAAZQBqAG4AcwB3AHsAfgCCAIUAhwCKAIwAjQCOAI8AjwCPAI4AjQCLAIkAhwCEAIEAfgB7AHcAcwBuAGkAZQBgAFsAVgBQAEsARQBAADsANgAxACwAJwAjAB8AHAAYABYAFAATABIAEgATABQAFgAYABwAHwAjACcALAAxADYAOwBAAEUASwBQAFYAWwBgAGUAagBuAHMAdwB7AH4AggCFAIcAigCMAI0AjgCPAI8AjwCOAI0AiwCJAIcAhACBAH4AewB3AHMAbgBpAGUAYABbAFYAUABLAEUAQAA7ADYAMQAsACcAIwAfABwAGAAWABQAEwASABIAEwAUABYAGAAcAB8AIwAnACwAMQA2ADsAQABFAEsAUABWAFsAYABlAGoAbgBzAHcAewB+AIIAhQCHAIoAjACNAI4AjwCPAI8AjgCNAIsAiQCHAIQAgQB+AHsAdwBzAG4AaQBlAGAAWwBWAFAASwBFAEAAOwA2ADEALAAnACMAHwAcABgAFgAUABMAEgASABMAFAAWABgAHAAfACMAJwAsADEANgA7AEAARQBLAFAAVgBbAGAAZQBqAG4AcwB3AHsAfgCCAIUAhwCKAIwAjQCOAI8AjwCPAI4AjQCLAIkAhwCEAIEAfgB7AHcAcwBuAGkAZQBgAFsAVgBQAEsARQBAADsANgAxACwAJwAjAB8AHAAYABYAFAATABIAEgATABQAFgAYABwAHwAjACcALAAxADYAOwBAAEUASwBQAFYAWwBgAGUAagBuAHMAdwB7AH4AggCFAIcAigCMAI0AjgCPAI8AjwCOAI0AiwCJAIcAhACBAH4AewB3AHMAbgBpAGUAYABbAFYAUABLAEUAQAA7ADYAMQAsACcAIwAfABwAGAAWABQAEwASAA=='
    )
    audio.volume = 0.6
    audioRef.current = audio
  }, [])

  function playBeep() {
    if (!soundEnabled || !audioRef.current) return
    try {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Browser blocked autoplay
      })
    } catch {}
  }

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('kitchen_orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        async (payload) => {
          // Fetch full order with relations
          const { data } = await supabase
            .from('orders')
            .select(
              `id, order_number, customer_name, notes, total, status, created_at, completed_at,
               restaurant_tables(table_number),
               order_items(id, item_name, quantity, subtotal, price_at_order)`
            )
            .eq('id', payload.new.id)
            .single()

          if (data) {
            // Skip jika ada di initial render
            if (!initialOrderIdsRef.current.has(data.id)) {
              newOrderIdsRef.current.add(data.id)
              playBeep()

              setOrders((prev) => {
                // Skip duplicates
                if (prev.find((o) => o.id === data.id)) return prev
                return [data as Order, ...prev]
              })

              // Remove "new" highlight after 10s
              setTimeout(() => {
                newOrderIdsRef.current.delete(data.id)
                setOrders((prev) => [...prev])
              }, 10000)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.new.id
                ? { ...o, ...payload.new } as Order
                : o
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [restaurantId, supabase, soundEnabled])

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId)
    const updateData: any = { status: newStatus }
    if (newStatus === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    setUpdatingId(null)
    startTransition(() => router.refresh())
  }

  // Filter & search
  let filteredOrders = orders
  if (filter === 'active') {
    filteredOrders = orders.filter((o) => o.status === 'pending' || o.status === 'preparing')
  } else {
    filteredOrders = orders.filter((o) => o.status === filter)
  }

  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredOrders = filteredOrders.filter(
      (o) =>
        o.customer_name?.toLowerCase().includes(term) ||
        String(o.order_number).includes(term)
    )
  }

  // Sort: pending first (oldest first), then preparing (oldest first), then completed (newest first)
  filteredOrders.sort((a, b) => {
    const aStatus = a.status === 'pending' ? 0 : a.status === 'preparing' ? 1 : 2
    const bStatus = b.status === 'pending' ? 0 : b.status === 'preparing' ? 1 : 2
    if (aStatus !== bStatus) return aStatus - bStatus

    if (a.status === 'completed') {
      // completed: newest first
      return new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime()
    }
    // pending & preparing: oldest first (FIFO kitchen)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  })

  const pendingCount = orders.filter((o) => o.status === 'pending').length
  const preparingCount = orders.filter((o) => o.status === 'preparing').length
  const completedCount = orders.filter((o) => o.status === 'completed').length

  return (
    <div style={{ padding: '24px', maxWidth: '1280px', margin: '0 auto' }}>
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
            Pesanan Dapur
          </h1>
          <p style={{ fontSize: '14px', color: '#45464d', margin: '4px 0 0 0' }}>
            Update otomatis · {orders.length} pesanan hari ini
          </p>
        </div>

        {/* Sound Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#000000',
            fontWeight: 500,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: soundEnabled ? '#16a34a' : '#76777d' }}>
            {soundEnabled ? 'notifications_active' : 'notifications_off'}
          </span>
          {soundEnabled ? 'Suara Aktif' : 'Suara Mati'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Baru" value={pendingCount} dotColor="#f59e0b" />
        <StatCard label="Diproses" value={preparingCount} dotColor="#3b82f6" />
        <StatCard label="Selesai Hari Ini" value={completedCount} dotColor="#16a34a" />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1 }}>
          <FilterBtn isActive={filter === 'active'} onClick={() => setFilter('active')}>
            🔥 Aktif ({pendingCount + preparingCount})
          </FilterBtn>
          <FilterBtn isActive={filter === 'pending'} onClick={() => setFilter('pending')}>
            Baru ({pendingCount})
          </FilterBtn>
          <FilterBtn isActive={filter === 'preparing'} onClick={() => setFilter('preparing')}>
            Diproses ({preparingCount})
          </FilterBtn>
          <FilterBtn isActive={filter === 'completed'} onClick={() => setFilter('completed')}>
            Selesai ({completedCount})
          </FilterBtn>
        </div>

        <div style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#76777d',
              fontSize: '18px',
            }}
          >
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari order/nama..."
            style={{
              height: '40px',
              paddingLeft: '36px',
              paddingRight: '16px',
              width: '220px',
              backgroundColor: '#ffffff',
              border: '1px solid #c6c6cd',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Order Cards */}
      {filteredOrders.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '64px',
            textAlign: 'center',
            color: '#76777d',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '64px', marginBottom: '16px', color: '#c6c6cd' }}>
            soup_kitchen
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: '0 0 4px 0' }}>
            {filter === 'active' ? 'Tidak ada pesanan aktif' : 'Belum ada pesanan'}
          </h3>
          <p style={{ margin: 0, fontSize: '13px' }}>
            {filter === 'active' ? 'Pesanan baru akan muncul di sini secara otomatis' : 'Coba ganti filter'}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          }}
        >
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              currentTime={currentTime}
              isNew={newOrderIdsRef.current.has(order.id)}
              isUpdating={updatingId === order.id}
              onUpdateStatus={(status) => updateStatus(order.id, status)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ===== Components =====

function StatCard({
  label,
  value,
  dotColor,
}: {
  label: string
  value: number
  dotColor: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        padding: '16px',
        borderRadius: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: dotColor }} />
        <span
          style={{
            fontSize: '11px',
            color: '#45464d',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: '32px',
          lineHeight: '40px',
          fontWeight: 600,
          color: '#000000',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </span>
    </div>
  )
}

function FilterBtn({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        whiteSpace: 'nowrap',
        padding: '8px 16px',
        borderRadius: '9999px',
        backgroundColor: isActive ? '#000000' : '#ffffff',
        color: isActive ? '#ffffff' : '#45464d',
        fontWeight: isActive ? 700 : 500,
        border: isActive ? 'none' : '1px solid #c6c6cd',
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 200ms',
      }}
    >
      {children}
    </button>
  )
}

function OrderCard({
  order,
  currentTime,
  isNew,
  isUpdating,
  onUpdateStatus,
}: {
  order: Order
  currentTime: number
  isNew: boolean
  isUpdating: boolean
  onUpdateStatus: (status: string) => void
}) {
  const table = Array.isArray(order.restaurant_tables)
    ? order.restaurant_tables[0]
    : order.restaurant_tables

  const isPending = order.status === 'pending'
  const isPreparing = order.status === 'preparing'
  const isCompleted = order.status === 'completed'

  // Time elapsed
  const elapsedMs = currentTime - new Date(order.created_at).getTime()
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000)

  let timeLabel = ''
  if (elapsedMinutes >= 60) {
    timeLabel = `${Math.floor(elapsedMinutes / 60)} jam lalu`
  } else if (elapsedMinutes >= 1) {
    timeLabel = `${elapsedMinutes} mnt lalu`
  } else {
    timeLabel = `${elapsedSeconds} dtk lalu`
  }

  // Color based on status & age
  let borderColor = '#c6c6cd'
  let bgColor = '#ffffff'
  let statusBg = '#f4ede6'
  let statusColor = '#45464d'
  let statusText = 'TIDAK DIKETAHUI'

  if (isPending) {
    borderColor = '#f59e0b'
    bgColor = '#fffbeb'
    statusBg = '#fef3c7'
    statusColor = '#92400e'
    statusText = 'BARU'

    // Urgent: > 5 menit pending
    if (elapsedMinutes >= 5) {
      borderColor = '#dc2626'
      bgColor = '#fef2f2'
      statusBg = '#fee2e2'
      statusColor = '#991b1b'
      statusText = 'URGEN'
    }
  } else if (isPreparing) {
    borderColor = '#3b82f6'
    bgColor = '#eff6ff'
    statusBg = '#dbeafe'
    statusColor = '#1e40af'
    statusText = 'DIPROSES'
  } else if (isCompleted) {
    borderColor = '#16a34a'
    bgColor = '#f0fdf4'
    statusBg = '#dcfce7'
    statusColor = '#166534'
    statusText = 'SELESAI'
  }

  return (
    <div
      style={{
        backgroundColor: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        opacity: isCompleted ? 0.85 : 1,
        animation: isNew ? 'pulse-new 2s ease-out' : 'none',
      }}
    >
      <style>{`
        @keyframes pulse-new {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 12px rgba(245, 158, 11, 0); }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '16px',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              #TY-{String(order.order_number).padStart(4, '0')}
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: statusBg,
                color: statusColor,
                letterSpacing: '0.05em',
              }}
            >
              {statusText}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {table && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#000000',
                  padding: '2px 8px',
                  backgroundColor: '#ffffff',
                  borderRadius: '4px',
                  border: '1px solid #c6c6cd',
                }}
              >
                Meja {String(table.table_number).padStart(2, '0')}
              </span>
            )}
            <span style={{ fontSize: '12px', color: '#45464d' }}>
              {order.customer_name || 'Anonim'}
            </span>
          </div>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: isPending && elapsedMinutes >= 5 ? '#991b1b' : '#45464d',
            fontWeight: isPending && elapsedMinutes >= 5 ? 700 : 400,
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}
        >
          {timeLabel}
        </span>
      </div>

      {/* Items */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.6)',
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}
      >
        {order.order_items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#ae3115',
                  minWidth: '32px',
                  padding: '2px 6px',
                  backgroundColor: '#ffdad6',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              >
                {item.quantity}x
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#000000',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.item_name}
              </span>
            </div>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '12px',
                color: '#45464d',
                whiteSpace: 'nowrap',
              }}
            >
              {formatIDR(Number(item.subtotal))}
            </span>
          </div>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '8px',
            padding: '10px 12px',
            display: 'flex',
            gap: '8px',
            alignItems: 'flex-start',
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '16px', color: '#92400e', flexShrink: 0, marginTop: '1px' }}
          >
            sticky_note_2
          </span>
          <p style={{ fontSize: '12px', color: '#92400e', margin: 0, fontWeight: 500 }}>
            {order.notes}
          </p>
        </div>
      )}

      {/* Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px dashed #c6c6cd',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#45464d' }}>Total</span>
        <span
          style={{
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            fontSize: '16px',
            fontWeight: 700,
            color: '#000000',
          }}
        >
          {formatIDR(Number(order.total))}
        </span>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {isPending && (
          <>
            <button
              onClick={() => onUpdateStatus('preparing')}
              disabled={isUpdating}
              style={primaryButtonStyle('#3b82f6')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                play_arrow
              </span>
              Mulai Proses
            </button>
          </>
        )}

        {isPreparing && (
          <button
            onClick={() => onUpdateStatus('completed')}
            disabled={isUpdating}
            style={primaryButtonStyle('#16a34a')}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              done_all
            </span>
            Tandai Selesai
          </button>
        )}

        {isCompleted && (
          <button
            onClick={() => onUpdateStatus('preparing')}
            disabled={isUpdating}
            style={secondaryButtonStyle()}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              undo
            </span>
            Batal Selesai
          </button>
        )}
      </div>
    </div>
  )
}

const primaryButtonStyle = (color: string): React.CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '44px',
  backgroundColor: color,
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '14px',
  cursor: 'pointer',
})

const secondaryButtonStyle = (): React.CSSProperties => ({
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  height: '40px',
  backgroundColor: '#f4ede6',
  color: '#45464d',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 500,
  fontSize: '13px',
  cursor: 'pointer',
})