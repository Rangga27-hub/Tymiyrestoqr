'use client'

import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { formatIDR } from '@/lib/utils'
import { getOrCreateAnonId } from '@/lib/anon-id'
import { createClient } from '@/lib/supabase/client'

type Restaurant = {
  id: string
  name: string
  slug: string
  address: string | null
  logo_url: string | null
  reservation_ttl_minutes: number
}

type Category = {
  id: string
  name: string
  display_order: number
}

type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  is_available: boolean
  track_stock: boolean
  stock_quantity: number
}

type TableInfo = {
  id: string
  table_number: number
  is_active: boolean
}

type CartItem = {
  id: string
  name: string
  price: number
  quantity: number
  image_url: string | null
}

const UNCATEGORIZED_ID = '__uncategorized__'

export default function CustomerMenuClient({
  restaurant,
  categories,
  items,
  reservedMap: initialReservedMap,
  tableInfo,
}: {
  restaurant: Restaurant
  categories: Category[]
  items: MenuItem[]
  reservedMap: Record<string, number>
  tableInfo: TableInfo | null
}) {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [anonId, setAnonId] = useState<string>('')
  const [reservedMap, setReservedMap] = useState<Record<string, number>>(initialReservedMap)
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('')

  // Refs untuk Intersection Observer dan scroll-to
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())
  const pillRefs = useRef<Map<string, HTMLElement>>(new Map())
  const isClickScrolling = useRef(false)
  const pillsContainerRef = useRef<HTMLDivElement>(null)

  // Build display categories (kategori dari DB + Uncategorized kalau ada item tanpa kategori)
  const hasUncategorized = items.some((i) => !i.category_id)
  const displayCategories = [
    ...categories,
    ...(hasUncategorized
      ? [{ id: UNCATEGORIZED_ID, name: 'Lainnya', display_order: 9999 }]
      : []),
  ]

  // Group items by category
  const itemsByCategory: Record<string, MenuItem[]> = {}
  displayCategories.forEach((cat) => {
    if (cat.id === UNCATEGORIZED_ID) {
      itemsByCategory[cat.id] = items.filter((i) => !i.category_id)
    } else {
      itemsByCategory[cat.id] = items.filter((i) => i.category_id === cat.id)
    }
  })

  // Filter pencarian: kalau search aktif, semua category filter dilewati
  const isSearching = searchTerm.trim() !== ''
  const searchResults = isSearching
    ? items.filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : []

  // Setup anon_id
  useEffect(() => {
    setAnonId(getOrCreateAnonId())
  }, [])

  // Load cart from localStorage
  useEffect(() => {
    const cartKey = `tymiy_cart_${restaurant.slug}`
    const stored = localStorage.getItem(cartKey)
    if (stored) {
      try {
        setCart(JSON.parse(stored))
      } catch {}
    }
  }, [restaurant.slug])

  // Persist cart
  useEffect(() => {
    const cartKey = `tymiy_cart_${restaurant.slug}`
    localStorage.setItem(cartKey, JSON.stringify(cart))
  }, [cart, restaurant.slug])

  // Save table info
  useEffect(() => {
    if (tableInfo) {
      localStorage.setItem(
        `tymiy_table_${restaurant.slug}`,
        JSON.stringify(tableInfo)
      )
    }
  }, [tableInfo, restaurant.slug])

  // Realtime stock reservations
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('stock_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'stock_reservations' },
        () => refreshReservations()
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => refreshReservations(), 15000)
    return () => clearInterval(interval)
  }, [])

  // Set initial active category
  useEffect(() => {
    if (displayCategories.length > 0 && !activeCategoryId) {
      setActiveCategoryId(displayCategories[0].id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayCategories.length])

  // Intersection Observer untuk auto-highlight pill saat scroll
  useEffect(() => {
    if (isSearching) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (isClickScrolling.current) return // Jangan update saat sedang scroll dari klik

        // Cari section yang paling banyak terlihat
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length === 0) return

        // Ambil yang paling top dulu
        const topMost = visible.reduce((prev, curr) =>
          prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
        )

        const catId = topMost.target.getAttribute('data-category-id')
        if (catId) {
          setActiveCategoryId(catId)
          scrollPillIntoView(catId)
        }
      },
      {
        rootMargin: '-180px 0px -50% 0px', // Trigger saat section masuk 180px dari atas
        threshold: 0,
      }
    )

    sectionRefs.current.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [displayCategories.length, isSearching])

  function scrollPillIntoView(catId: string) {
    const pill = pillRefs.current.get(catId)
    const container = pillsContainerRef.current
    if (pill && container) {
      const pillRect = pill.getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const offset = pillRect.left - containerRect.left - containerRect.width / 2 + pillRect.width / 2
      container.scrollBy({ left: offset, behavior: 'smooth' })
    }
  }

  function handlePillClick(catId: string) {
    setActiveCategoryId(catId)
    const section = sectionRefs.current.get(catId)
    if (section) {
      isClickScrolling.current = true
      const yOffset = -140 // offset untuk sticky header
      const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })

      // Reset flag setelah scroll selesai
      setTimeout(() => {
        isClickScrolling.current = false
      }, 1000)
    }
    scrollPillIntoView(catId)
  }

  async function refreshReservations() {
    const supabase = createClient()
    const { data } = await supabase
      .from('stock_reservations')
      .select('menu_item_id, quantity')
      .gt('expires_at', new Date().toISOString())

    const newMap: Record<string, number> = {}
    data?.forEach((r) => {
      newMap[r.menu_item_id] = (newMap[r.menu_item_id] || 0) + r.quantity
    })
    setReservedMap(newMap)
  }

  function getAvailableStock(item: MenuItem): number {
    if (!item.track_stock) return 999999
    const myQty = cart.find((c) => c.id === item.id)?.quantity || 0
    const totalReserved = reservedMap[item.id] || 0
    const reservedByOthers = Math.max(0, totalReserved - myQty)
    return Math.max(0, item.stock_quantity - reservedByOthers)
  }

  async function addToCart(item: MenuItem) {
    setErrorMsg(null)
    setLoadingItemId(item.id)

    if (item.track_stock) {
      try {
        const res = await fetch('/api/stock/reserve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            menuItemId: item.id,
            anonId,
            quantity: 1,
            restaurantId: restaurant.id,
          }),
        })
        const result = await res.json()
        if (!result.success) {
          setErrorMsg(result.error || 'Stok tidak cukup')
          setLoadingItemId(null)
          setTimeout(() => setErrorMsg(null), 3000)
          await refreshReservations()
          return
        }
      } catch {
        setErrorMsg('Gagal reserve stok')
        setLoadingItemId(null)
        setTimeout(() => setErrorMsg(null), 3000)
        return
      }
    }

    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id)
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      }
      return [
        ...prev,
        { id: item.id, name: item.name, price: Number(item.price), quantity: 1, image_url: item.image_url },
      ]
    })

    await refreshReservations()
    setLoadingItemId(null)
  }

  async function updateQty(itemId: string, delta: number) {
    const item = items.find((i) => i.id === itemId)
    if (!item) return

    setLoadingItemId(itemId)
    setErrorMsg(null)

    if (delta > 0) {
      if (item.track_stock) {
        try {
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
            setErrorMsg(result.error || 'Stok tidak cukup')
            setLoadingItemId(null)
            setTimeout(() => setErrorMsg(null), 3000)
            await refreshReservations()
            return
          }
        } catch {
          setLoadingItemId(null)
          return
        }
      }
    } else {
      if (item.track_stock) {
        await fetch('/api/stock/release', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menuItemId: itemId, anonId, quantity: 1 }),
        })
      }
    }

    setCart((prev) =>
      prev
        .map((c) => (c.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    )

    await refreshReservations()
    setLoadingItemId(null)
  }

  const cartItemCount = cart.reduce((sum, c) => sum + c.quantity, 0)
  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)

  function getQtyInCart(itemId: string): number {
    return cart.find((c) => c.id === itemId)?.quantity || 0
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff8f2', paddingBottom: cartItemCount > 0 ? '120px' : '40px' }}>
      {/* ===== STICKY HEADER (Logo + Search) ===== */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 248, 242, 0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #e8e1db',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            maxWidth: '760px',
            margin: '0 auto',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#000000',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span className="material-symbols-outlined">restaurant</span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#000000',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {restaurant.name}
              </h1>
              {tableInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: '#fd6a49' }} />
                  <span
                    style={{
                      fontSize: '10px',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      color: '#45464d',
                    }}
                  >
                    Meja {tableInfo.table_number}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 16px 12px', maxWidth: '760px', margin: '0 auto' }}>
          <div style={{ position: 'relative' }}>
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari menu..."
              style={{
                width: '100%',
                height: '40px',
                paddingLeft: '40px',
                paddingRight: searchTerm ? '40px' : '16px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '9999px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#76777d',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
              </button>
            )}
          </div>
        </div>

        {/* Sticky Category Pills (hide saat searching) */}
        {!isSearching && displayCategories.length > 0 && (
          <div
            ref={pillsContainerRef}
            style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              padding: '0 16px 12px',
              maxWidth: '760px',
              margin: '0 auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <style>{`
              [data-pills-container]::-webkit-scrollbar { display: none; }
            `}</style>
            <div data-pills-container style={{ display: 'flex', gap: '8px' }}>
              {displayCategories.map((cat) => {
                const isActive = activeCategoryId === cat.id
                const itemCount = itemsByCategory[cat.id]?.length || 0
                if (itemCount === 0) return null
                return (
                  <button
                    key={cat.id}
                    ref={(el) => {
                      if (el) pillRefs.current.set(cat.id, el)
                    }}
                    onClick={() => handlePillClick(cat.id)}
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
                      flexShrink: 0,
                    }}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Error toast */}
        {errorMsg && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#ba1a1a',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              marginTop: '8px',
            }}
          >
            {errorMsg}
          </div>
        )}
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <main style={{ maxWidth: '760px', margin: '0 auto', padding: '16px' }}>
        {/* SEARCHING MODE: tampil semua hasil tanpa section */}
        {isSearching ? (
          <>
            <p style={{ fontSize: '13px', color: '#45464d', marginBottom: '12px' }}>
              {searchResults.length} hasil untuk &quot;{searchTerm}&quot;
            </p>
            {searchResults.length === 0 ? (
              <EmptyState text="Menu tidak ditemukan" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {searchResults.map((item) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    quantity={getQtyInCart(item.id)}
                    availableStock={getAvailableStock(item)}
                    isLoading={loadingItemId === item.id}
                    onAdd={() => addToCart(item)}
                    onIncrement={() => updateQty(item.id, 1)}
                    onDecrement={() => updateQty(item.id, -1)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          /* NORMAL MODE: tampil semua section per kategori */
          <>
            {displayCategories.length === 0 ? (
              <EmptyState text="Belum ada menu" />
            ) : (
              displayCategories.map((cat) => {
                const catItems = itemsByCategory[cat.id] || []
                if (catItems.length === 0) return null

                return (
                  <section
                    key={cat.id}
                    ref={(el) => {
                      if (el) sectionRefs.current.set(cat.id, el)
                    }}
                    data-category-id={cat.id}
                    style={{ marginBottom: '32px', scrollMarginTop: '160px' }}
                  >
                    {/* Sub-header kategori */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '12px',
                        paddingBottom: '8px',
                        borderBottom: '2px solid #e8e1db',
                      }}
                    >
                      <h2
                        style={{
                          fontSize: '20px',
                          fontWeight: 700,
                          color: '#000000',
                          margin: 0,
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {cat.name}
                      </h2>
                      <span
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--font-jetbrains-mono), monospace',
                          color: '#45464d',
                          padding: '2px 8px',
                          backgroundColor: '#f4ede6',
                          borderRadius: '9999px',
                        }}
                      >
                        {catItems.length}
                      </span>
                    </div>

                    {/* Items in category */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {catItems.map((item) => (
                        <MenuRow
                          key={item.id}
                          item={item}
                          quantity={getQtyInCart(item.id)}
                          availableStock={getAvailableStock(item)}
                          isLoading={loadingItemId === item.id}
                          onAdd={() => addToCart(item)}
                          onIncrement={() => updateQty(item.id, 1)}
                          onDecrement={() => updateQty(item.id, -1)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })
            )}
          </>
        )}
      </main>

      {/* ===== Cart Floating Bar ===== */}
      {cartItemCount > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            right: '16px',
            zIndex: 50,
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <Link
            href={`/r/${restaurant.slug}/cart${tableInfo ? `?table=${tableInfo.table_number}` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 20px',
              backgroundColor: '#000000',
              color: '#ffffff',
              borderRadius: '9999px',
              textDecoration: 'none',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '11px', opacity: 0.7 }}>{cartItemCount} item</span>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: '15px', fontWeight: 600 }}>
                {formatIDR(cartTotal)}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px', fontWeight: 700 }}>Lihat Keranjang</span>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>shopping_cart</span>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

// ============ Components ============

function MenuRow({
  item,
  quantity,
  availableStock,
  isLoading,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  item: MenuItem
  quantity: number
  availableStock: number
  isLoading: boolean
  onAdd: () => void
  onIncrement: () => void
  onDecrement: () => void
}) {
  const unavailable = !item.is_available
  const stockOut = item.track_stock && availableStock === 0 && quantity === 0
  const stockLow = item.track_stock && availableStock > 0 && availableStock <= 5
  const cannotAdd = item.track_stock && availableStock === 0 && quantity > 0
  const disabled = unavailable || stockOut

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: quantity > 0 ? '2px solid #ae3115' : '1px solid #e8e1db',
        borderRadius: '12px',
        padding: '12px',
        display: 'flex',
        gap: '12px',
        opacity: disabled ? 0.6 : 1,
        transition: 'border-color 200ms',
      }}
    >
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
          <h3
            style={{
              fontSize: '15px',
              lineHeight: '20px',
              fontWeight: 600,
              color: '#000000',
              margin: 0,
              flex: 1,
              minWidth: 0,
            }}
          >
            {item.name}
          </h3>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: '#45464d',
            margin: 0,
            marginBottom: '8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '32px',
          }}
        >
          {item.description || ''}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: '14px',
              fontWeight: 700,
              color: '#ae3115',
            }}
          >
            {formatIDR(Number(item.price))}
          </span>
          {item.track_stock && stockLow && quantity === 0 && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: '#92400e',
                backgroundColor: '#fef3c7',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              SISA {availableStock}
            </span>
          )}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
          {unavailable || stockOut ? (
            <span
              style={{
                fontSize: '11px',
                color: '#ba1a1a',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                textTransform: 'uppercase',
                padding: '4px 12px',
                backgroundColor: '#ffdad6',
                borderRadius: '9999px',
              }}
            >
              Habis
            </span>
          ) : quantity === 0 ? (
            <button
              onClick={onAdd}
              disabled={isLoading}
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '9999px',
                border: 'none',
                fontWeight: 700,
                fontSize: '12px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.5 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {isLoading ? (
                '...'
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
                  Tambah
                </>
              )}
            </button>
          ) : (
            <QuantityStepper
              quantity={quantity}
              canIncrement={!cannotAdd}
              isLoading={isLoading}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          )}
        </div>
      </div>

      <div
        style={{
          width: '88px',
          height: '88px',
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
          backgroundColor: '#f4ede6',
          position: 'relative',
        }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: disabled ? 'grayscale(1)' : 'none',
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c6c6cd' }}>
            <span className="material-symbols-outlined">restaurant</span>
          </div>
        )}
      </div>
    </div>
  )
}

function QuantityStepper({
  quantity,
  canIncrement,
  isLoading,
  onIncrement,
  onDecrement,
}: {
  quantity: number
  canIncrement: boolean
  isLoading: boolean
  onIncrement: () => void
  onDecrement: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#f4ede6',
        borderRadius: '9999px',
        padding: '2px',
        gap: '2px',
        opacity: isLoading ? 0.6 : 1,
      }}
    >
      <button
        onClick={onDecrement}
        disabled={isLoading}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '9999px',
          backgroundColor: '#ffffff',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          color: '#000000',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>remove</span>
      </button>
      <span
        style={{
          padding: '0 12px',
          fontFamily: 'var(--font-jetbrains-mono), monospace',
          fontWeight: 700,
          fontSize: '14px',
          color: '#000000',
          minWidth: '20px',
          textAlign: 'center',
        }}
      >
        {quantity}
      </span>
      <button
        onClick={onIncrement}
        disabled={isLoading || !canIncrement}
        style={{
          width: '30px',
          height: '30px',
          borderRadius: '9999px',
          backgroundColor: canIncrement ? '#000000' : '#c6c6cd',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: isLoading || !canIncrement ? 'not-allowed' : 'pointer',
          color: '#ffffff',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
      </button>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: '#76777d' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>
        restaurant
      </span>
      <p style={{ margin: 0 }}>{text}</p>
    </div>
  )
}