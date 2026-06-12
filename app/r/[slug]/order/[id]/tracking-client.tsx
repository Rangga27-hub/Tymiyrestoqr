'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { formatIDR } from '@/lib/utils'

type Order = {
  id: string
  order_number: number
  status: string
  customer_name: string | null
  notes: string | null
  total: number
  created_at: string
  restaurant_tables: { table_number: number } | { table_number: number }[] | null
  order_items: {
    id: string
    item_name: string
    price_at_order: number
    quantity: number
    subtotal: number
  }[]
}

const STATUS_STEPS = [
  { key: 'pending', label: 'Menunggu', icon: 'pending' },
  { key: 'preparing', label: 'Diproses', icon: 'sync' },
  { key: 'completed', label: 'Selesai', icon: 'done_all' },
]

export default function OrderTrackingClient({
  restaurant,
  order: initialOrder,
}: {
  restaurant: { id: string; name: string; slug: string }
  order: Order
}) {
  const supabase = createClient()
  const [order, setOrder] = useState(initialOrder)

  // Subscribe to realtime status updates
  useEffect(() => {
    const channel = supabase
      .channel(`order_${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          setOrder((prev) => ({ ...prev, ...payload.new } as Order))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [order.id, supabase])

  const isCancelled = order.status === 'cancelled'
  const currentStepIndex = isCancelled
    ? -1
    : STATUS_STEPS.findIndex((s) => s.key === order.status)

  const table = Array.isArray(order.restaurant_tables)
    ? order.restaurant_tables[0]
    : order.restaurant_tables

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2' }}>
      {/* Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 248, 242, 0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e8e1db',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: 0 }}>TymiY</h1>
      </header>

      <main
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '24px 16px',
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: '1fr',
        }}
        className="lg:grid-cols-12"
      >
        {/* Status Card */}
        <section
          className="lg:col-span-7"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              marginBottom: '32px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '11px',
                color: '#ae3115',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {isCancelled ? 'Pesanan Dibatalkan' : 'Terima Kasih Atas Pesanan'}
            </span>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <h1
                style={{
                  fontSize: '28px',
                  lineHeight: '36px',
                  fontWeight: 600,
                  letterSpacing: '-0.02em',
                  color: '#000000',
                  margin: 0,
                }}
              >
                {isCancelled ? 'Pesanan Batal' : 'Pesanan Diterima'}
              </h1>
              <div
                style={{
                  backgroundColor: '#faf2eb',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #c6c6cd',
                }}
              >
                <span style={{ fontSize: '10px', color: '#45464d', display: 'block' }}>
                  Order ID
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: '16px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    color: '#000000',
                  }}
                >
                  TY-{String(order.order_number).padStart(4, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Status Steps */}
          {isCancelled ? (
            <div
              style={{
                padding: '24px',
                backgroundColor: '#ffdad6',
                borderRadius: '12px',
                textAlign: 'center',
                color: '#93000a',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px' }}>
                cancel
              </span>
              <p style={{ margin: 0, fontWeight: 500 }}>
                Pesanan ini telah dibatalkan oleh restoran
              </p>
            </div>
          ) : (
            <div style={{ position: 'relative', padding: '32px 0 16px 0' }}>
              {/* Progress Line */}
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  left: '20px',
                  right: '20px',
                  height: '2px',
                  backgroundColor: '#e8e1db',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#ae3115',
                    width: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%`,
                    transition: 'width 1s',
                  }}
                />
              </div>

              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between' }}>
                {STATUS_STEPS.map((step, idx) => {
                  const isCompleted = idx < currentStepIndex
                  const isActive = idx === currentStepIndex

                  return (
                    <div
                      key={step.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: idx > currentStepIndex ? 0.4 : 1,
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: '40px',
                          height: '40px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                      >
                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backgroundColor: 'rgba(174, 49, 21, 0.2)',
                              borderRadius: '9999px',
                              animation: 'tymiy-pulse 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite',
                            }}
                          />
                        )}
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '9999px',
                            backgroundColor:
                              isCompleted || isActive ? '#ae3115' : '#eee7e0',
                            color: isCompleted || isActive ? '#ffffff' : '#45464d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: isCompleted || isActive ? 'none' : '1px solid #c6c6cd',
                            position: 'relative',
                            zIndex: 1,
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                            {isCompleted ? 'check' : step.icon}
                          </span>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: isActive ? 700 : 500,
                          color: isActive ? '#ae3115' : isCompleted ? '#000000' : '#45464d',
                          textAlign: 'center',
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  )
                })}
              </div>

              <style>{`
                @keyframes tymiy-pulse {
                  0% { transform: scale(0.8); opacity: 0.7; }
                  50% { transform: scale(1.1); opacity: 0.3; }
                  100% { transform: scale(0.8); opacity: 0.7; }
                }
              `}</style>
            </div>
          )}

          {/* Info row */}
          {table && !isCancelled && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: '#faf2eb',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: '1px solid #c6c6cd',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '9999px',
                  backgroundColor: '#f4ede6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ae3115',
                }}
              >
                <span className="material-symbols-outlined">table_restaurant</span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: '#45464d', margin: 0 }}>Antar ke</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: 0 }}>
                  Meja {String(table.table_number).padStart(2, '0')}
                </p>
              </div>
            </div>
          )}

          {order.status === 'preparing' && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: '#fff8e1',
                color: '#92400e',
                borderRadius: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                schedule
              </span>
              Pesanan sedang dimasak. Mohon ditunggu sebentar.
            </div>
          )}

          {order.status === 'completed' && (
            <div
              style={{
                marginTop: '12px',
                padding: '12px 16px',
                backgroundColor: '#dcfce7',
                color: '#166534',
                borderRadius: '12px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                check_circle
              </span>
              Pesanan selesai. Selamat menikmati!
            </div>
          )}
        </section>

        {/* Order Summary */}
        <section
          className="lg:col-span-5"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '24px',
            height: 'fit-content',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: 0, marginBottom: '24px' }}>
            Ringkasan Pesanan
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px', borderBottom: '1px solid #e8e1db', marginBottom: '24px' }}>
            {order.order_items.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#000000', margin: 0 }}>
                    {item.item_name}
                  </h3>
                  <p
                    style={{
                      fontSize: '11px',
                      color: '#45464d',
                      margin: 0,
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      marginTop: '2px',
                    }}
                  >
                    {item.quantity}x · {formatIDR(Number(item.price_at_order))}
                  </p>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: '13px',
                    color: '#000000',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatIDR(Number(item.subtotal))}
                </span>
              </div>
            ))}
          </div>

          {order.customer_name && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#45464d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Atas Nama
              </p>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#000000', margin: 0, marginTop: '2px' }}>
                {order.customer_name}
              </p>
            </div>
          )}

          {order.notes && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', color: '#45464d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Catatan
              </p>
              <p style={{ fontSize: '13px', color: '#000000', margin: 0, marginTop: '2px' }}>
                {order.notes}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#45464d' }}>
              <span style={{ fontSize: '14px' }}>Subtotal</span>
              <span style={{ fontSize: '14px', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                {formatIDR(Number(order.total))}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid #e8e1db',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#000000' }}>Total</span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#000000',
                  fontFamily: 'var(--font-jetbrains-mono), monospace',
                }}
              >
                {formatIDR(Number(order.total))}
              </span>
            </div>
          </div>

          <Link
            href={`/r/${restaurant.slug}${table ? `?table=${table.table_number}` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              backgroundColor: '#ae3115',
              color: '#ffffff',
              padding: '14px',
              borderRadius: '8px',
              border: 'none',
              fontWeight: 700,
              textDecoration: 'none',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              refresh
            </span>
            Pesan Lagi
          </Link>
        </section>
      </main>
    </div>
  )
}