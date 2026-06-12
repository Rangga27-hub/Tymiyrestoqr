'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { formatIDR } from '@/lib/utils'
import { getOrCreateAnonId } from '@/lib/anon-id'

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

export default function CartClient({
  restaurant,
  tableNumber,
}: {
  restaurant: { id: string; name: string; slug: string }
  tableNumber: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [anonId, setAnonId] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  useEffect(() => {
    setAnonId(getOrCreateAnonId())
  }, [])

  useEffect(() => {
    const cartKey = `tymiy_cart_${restaurant.slug}`
    const stored = localStorage.getItem(cartKey)
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch {}
    }
  }, [restaurant.slug])

  // Fetch earliest expiry time
  useEffect(() => {
    if (!anonId || cart.length === 0) {
      setTimeLeft(null)
      return
    }

    async function fetchExpiry() {
      const { data } = await supabase
        .from('stock_reservations')
        .select('expires_at')
        .eq('anon_id', anonId)
        .order('expires_at', { ascending: true })
        .limit(1)

      if (data && data.length > 0) {
        const expiryMs = new Date(data[0].expires_at).getTime()
        const nowMs = Date.now()
        setTimeLeft(Math.max(0, expiryMs - nowMs))
      } else {
        setTimeLeft(null)
      }
    }

    fetchExpiry()
    const interval = setInterval(fetchExpiry, 5000)
    return () => clearInterval(interval)
  }, [anonId, cart.length, supabase])

  // Countdown
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null
        const next = prev - 1000
        if (next <= 0) {
          // Refresh cart from localStorage (kalau ada items yang ke-release, kita harus update)
          checkExpiredItems()
          return 0
        }
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeLeft])

  async function checkExpiredItems() {
    if (!anonId) return

    // Fetch current valid reservations
    const { data } = await supabase
      .from('stock_reservations')
      .select('menu_item_id, quantity')
      .eq('anon_id', anonId)
      .gt('expires_at', new Date().toISOString())

    const validReservations: Record<string, number> = {}
    data?.forEach((r) => {
      validReservations[r.menu_item_id] = r.quantity
    })

    // Filter cart: hapus item yang reservation-nya udah expired
    setCart((prev) => {
      const filtered = prev.filter((c) => {
        // Kalau item track_stock & ga ada di valid reservations, hapus
        return c.id in validReservations || validReservations[c.id] !== undefined
      })

      if (filtered.length < prev.length) {
        setError('Beberapa item dihapus karena reservasi habis')
        setTimeout(() => setError(null), 4000)
      }

      const cartKey = `tymiy_cart_${restaurant.slug}`
      localStorage.setItem(cartKey, JSON.stringify(filtered))
      return filtered
    })
  }

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  function persistCart(newCart: CartItem[]) {
    setCart(newCart)
    const cartKey = `tymiy_cart_${restaurant.slug}`
    localStorage.setItem(cartKey, JSON.stringify(newCart))
  }

  async function updateQty(itemId: string, delta: number) {
    // Release/reserve via API
    if (delta < 0) {
      await fetch('/api/stock/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: itemId,
          anonId,
          quantity: 1,
        }),
      })
    } else {
      const res = await fetch('/api/stock/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menuItemId: itemId,
          anonId,
          quantity: 1,
          restaurantId: restaurant.id,
        }),
      })
      const result = await res.json()
      if (!result.success) {
        setError(result.error || 'Stok tidak cukup')
        setTimeout(() => setError(null), 3000)
        return
      }
    }

    const updated = cart
      .map((c) => (c.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
      .filter((c) => c.quantity > 0)
    persistCart(updated)
  }

  async function removeItem(itemId: string) {
    // Release all of this item
    await fetch('/api/stock/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menuItemId: itemId,
        anonId,
      }),
    })
    persistCart(cart.filter((c) => c.id !== itemId))
  }

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const total = subtotal

  async function handleCheckout() {
    setError(null)

    if (!customerName.trim()) {
      setError('Nama pemesan wajib diisi')
      return
    }

    if (cart.length === 0) {
      setError('Keranjang kosong')
      return
    }

    setSubmitting(true)

    try {
      let tableId: string | null = null
      if (tableNumber) {
        const { data: t } = await supabase
          .from('restaurant_tables')
          .select('id')
          .eq('restaurant_id', restaurant.id)
          .eq('table_number', parseInt(tableNumber))
          .single()
        tableId = t?.id || null
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_id: tableId,
          customer_name: customerName.trim(),
          notes: notes.trim() || null,
          total,
          status: 'pending',
        })
        .select()
        .single()

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Gagal membuat pesanan')
      }

      const orderItems = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.id,
        item_name: c.name,
        price_at_order: c.price,
        quantity: c.quantity,
        subtotal: c.price * c.quantity,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)

      if (itemsError) {
        throw new Error(itemsError.message)
      }

      // Consume reservations → permanently deduct stock
      await fetch('/api/stock/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonId }),
      })

      // Clear cart
      localStorage.removeItem(`tymiy_cart_${restaurant.slug}`)

      router.push(`/r/${restaurant.slug}/order/${order.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setSubmitting(false)
    }
  }

  if (cart.length === 0) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2' }}>
        <Header restaurant={restaurant} />
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '64px', color: '#c6c6cd', marginBottom: '16px' }}
          >
            shopping_cart
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#000000', margin: 0 }}>
            Keranjang Kosong
          </h2>
          <p style={{ fontSize: '14px', color: '#45464d', margin: '8px 0 24px 0' }}>
            Belum ada menu yang dipilih
          </p>
          <Link
            href={`/r/${restaurant.slug}${tableNumber ? `?table=${tableNumber}` : ''}`}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '9999px',
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: '14px',
              display: 'inline-block',
            }}
          >
            Lihat Menu
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2', paddingBottom: '140px' }}>
      <Header restaurant={restaurant} />

      {/* Timer warning bar */}
      {timeLeft !== null && timeLeft > 0 && (
        <div
          style={{
            backgroundColor: timeLeft < 60000 ? '#ffdad6' : '#fef3c7',
            borderBottom: '1px solid',
            borderColor: timeLeft < 60000 ? '#ba1a1a' : '#f59e0b',
            padding: '10px 16px',
          }}
        >
          <div
            style={{
              maxWidth: '640px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: timeLeft < 60000 ? '#93000a' : '#92400e',
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '18px' }}
            >
              schedule
            </span>
            <span>
              Selesaikan pesanan dalam{' '}
              <strong style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                {formatTime(timeLeft)}
              </strong>
              {' '}atau item akan dilepas
            </span>
          </div>
        </div>
      )}

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '24px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#000000', margin: 0 }}>
            Pesanan Anda
          </h2>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: '11px',
              backgroundColor: '#eee7e0',
              padding: '4px 10px',
              borderRadius: '9999px',
            }}
          >
            {cart.length} ITEM
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
          {cart.map((item) => (
            <div
              key={item.id}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  backgroundColor: '#f4ede6',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="material-symbols-outlined" style={{ color: '#c6c6cd' }}>
                    restaurant
                  </span>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#000000', margin: 0 }}>
                    {item.name}
                  </h3>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#45464d',
                      padding: '2px',
                    }}
                    aria-label="Hapus"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                      delete_outline
                    </span>
                  </button>
                </div>
                <div
                  style={{
                    marginTop: 'auto',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#ae3115',
                    }}
                  >
                    {formatIDR(item.price * item.quantity)}
                  </span>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      border: '1px solid #c6c6cd',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff',
                      padding: '2px',
                    }}
                  >
                    <button
                      onClick={() => updateQty(item.id, -1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        remove
                      </span>
                    </button>
                    <span
                      style={{
                        padding: '0 12px',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                        fontWeight: 700,
                        fontSize: '13px',
                        minWidth: '20px',
                        textAlign: 'center',
                      }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQty(item.id, 1)}
                      style={{
                        width: '28px',
                        height: '28px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        add
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
          <FormField label="Nama Pemesan" required>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Masukkan nama"
              style={inputStyle}
            />
          </FormField>

          <FormField label="Catatan Tambahan" optional>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: tanpa pedas, alergi udang, dll."
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
            />
          </FormField>
        </div>

        <div
          style={{
            backgroundColor: '#f4ede6',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#000000' }}>Total</span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 700,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: '#000000',
              }}
            >
              {formatIDR(total)}
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#ffdad6',
              color: '#93000a',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <footer
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '16px',
          backgroundColor: 'rgba(255, 248, 242, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid #c6c6cd',
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <button
            onClick={handleCheckout}
            disabled={submitting}
            style={{
              width: '100%',
              backgroundColor: '#000000',
              color: '#ffffff',
              height: '56px',
              borderRadius: '9999px',
              fontWeight: 700,
              fontSize: '15px',
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 24px',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {submitting ? 'Memproses...' : 'Pesan Sekarang'}
              {!submitting && <span className="material-symbols-outlined">chevron_right</span>}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '14px',
              }}
            >
              {formatIDR(total)}
            </span>
          </button>
        </div>
      </footer>
    </div>
  )
}

function Header({ restaurant }: { restaurant: { name: string; slug: string } }) {
  return (
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
        alignItems: 'center',
        gap: '12px',
      }}
    >
      <Link
        href={`/r/${restaurant.slug}`}
        style={{
          padding: '4px',
          display: 'flex',
          color: '#000000',
          textDecoration: 'none',
        }}
      >
        <span className="material-symbols-outlined">arrow_back</span>
      </Link>
      <h1 style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: 0 }}>Keranjang</h1>
    </header>
  )
}

function FormField({
  label,
  required,
  optional,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label
          style={{
            fontSize: '11px',
            fontWeight: 500,
            color: '#45464d',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label} {required && <span style={{ color: '#ba1a1a' }}>*</span>}
        </label>
        {optional && (
          <span
            style={{
              fontSize: '10px',
              color: '#76777d',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Opsional
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '48px',
  padding: '0 16px',
  backgroundColor: '#ffffff',
  border: '1px solid #c6c6cd',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 200ms',
  fontFamily: 'inherit',
}