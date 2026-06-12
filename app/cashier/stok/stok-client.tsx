'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type MenuItem = {
  id: string
  name: string
  category_id: string | null
  track_stock: boolean
  stock_quantity: number
  is_available: boolean
  image_url: string | null
  menu_categories: { name: string } | { name: string }[] | null
}

type Category = { id: string; name: string }

type Restaurant = {
  id: string
  name: string
  reservation_ttl_minutes: number
}

export default function StokClient({
  restaurant,
  categories,
  items,
  reservedMap,
}: {
  restaurant: Restaurant
  categories: Category[]
  items: MenuItem[]
  reservedMap: Record<string, number>
}) {
  const router = useRouter()
  const supabase = createClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [filter, setFilter] = useState<'all' | 'tracked' | 'low' | 'out' | 'unavailable'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)

  // Stats
  const trackedItems = items.filter((i) => i.track_stock)
  const lowStock = trackedItems.filter((i) => {
    const reserved = reservedMap[i.id] || 0
    const available = Math.max(0, i.stock_quantity - reserved)
    return available > 0 && available <= 5 && i.is_available
  })
  const outOfStock = trackedItems.filter((i) => {
    const reserved = reservedMap[i.id] || 0
    return i.stock_quantity - reserved <= 0
  })
  const unavailableItems = items.filter((i) => !i.is_available)

  // Filter items
  let filteredItems = items
  if (filter === 'tracked') filteredItems = trackedItems
  if (filter === 'low') filteredItems = lowStock
  if (filter === 'out') filteredItems = outOfStock
  if (filter === 'unavailable') filteredItems = unavailableItems

  if (searchTerm) {
    filteredItems = filteredItems.filter((i) =>
      i.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  // Group by category
  const groupedByCategory: Record<string, MenuItem[]> = {}
  const uncategorized: MenuItem[] = []
  filteredItems.forEach((item) => {
    if (item.category_id) {
      if (!groupedByCategory[item.category_id]) {
        groupedByCategory[item.category_id] = []
      }
      groupedByCategory[item.category_id].push(item)
    } else {
      uncategorized.push(item)
    }
  })

  async function toggleTrackStock(item: MenuItem) {
    setSavingId(item.id)
    await supabase
      .from('menu_items')
      .update({ track_stock: !item.track_stock })
      .eq('id', item.id)
    setSavingId(null)
    startTransition(() => router.refresh())
  }

  async function toggleAvailability(item: MenuItem) {
    setSavingId(item.id)
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available })
      .eq('id', item.id)
    setSavingId(null)
    startTransition(() => router.refresh())
  }

  async function updateStock(itemId: string, newStock: number) {
    if (newStock < 0) return
    setSavingId(itemId)
    await supabase
      .from('menu_items')
      .update({ stock_quantity: newStock })
      .eq('id', itemId)
    setSavingId(null)
    setEditingId(null)
    setEditValue('')
    startTransition(() => router.refresh())
  }

  async function quickAdjust(item: MenuItem, delta: number) {
    const newStock = Math.max(0, item.stock_quantity + delta)
    await updateStock(item.id, newStock)
  }

  async function bulkAddStock(amount: number) {
    if (!confirm(`Tambah ${amount} stok ke SEMUA menu yang pakai stok?`)) return
    setSavingId('bulk')

    for (const item of trackedItems) {
      await supabase
        .from('menu_items')
        .update({ stock_quantity: item.stock_quantity + amount })
        .eq('id', item.id)
    }

    setSavingId(null)
    startTransition(() => router.refresh())
  }

  async function resetAllStock() {
    if (!confirm('Reset semua stok ke 0? Tindakan ini tidak bisa dibatalkan.')) return
    setSavingId('bulk')

    for (const item of trackedItems) {
      await supabase
        .from('menu_items')
        .update({ stock_quantity: 0 })
        .eq('id', item.id)
    }

    setSavingId(null)
    startTransition(() => router.refresh())
  }

  async function markAllAvailable() {
    if (!confirm('Tandai SEMUA menu sebagai tersedia?')) return
    setSavingId('bulk')

    for (const item of items) {
      await supabase
        .from('menu_items')
        .update({ is_available: true })
        .eq('id', item.id)
    }

    setSavingId(null)
    startTransition(() => router.refresh())
  }

  async function updateTTL(newTTL: number) {
    await supabase
      .from('restaurants')
      .update({ reservation_ttl_minutes: newTTL })
      .eq('id', restaurant.id)
    startTransition(() => router.refresh())
  }

  function categoryName(catId: string) {
    return categories.find((c) => c.id === catId)?.name || 'Tanpa Kategori'
  }

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
            Manajemen Stok
          </h1>
          <p style={{ fontSize: '14px', color: '#45464d', margin: '4px 0 0 0' }}>
            Atur stok menu dan tandai habis/tersedia dengan cepat
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <p
            style={{
              fontSize: '11px',
              color: '#45464d',
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Waktu Reservasi Cart
          </p>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => updateTTL(mins)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: restaurant.reservation_ttl_minutes === mins ? '#000000' : '#f4ede6',
                  color: restaurant.reservation_ttl_minutes === mins ? '#ffffff' : '#45464d',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {mins} mnt
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Guide Card */}
      <div
        style={{
          backgroundColor: '#e0f2fe',
          border: '1px solid #7dd3fc',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <span
          className="material-symbols-outlined"
          style={{ color: '#0369a1', fontSize: '20px', flexShrink: 0, marginTop: '2px' }}
        >
          tips_and_updates
        </span>
        <div style={{ fontSize: '13px', color: '#0c4a6e', lineHeight: '1.6' }}>
          <strong>Tips Cepat:</strong> Toggle <strong>"Tersedia"</strong> = tandai menu habis/ready (paling cepat).
          Toggle <strong>"Pakai Stok"</strong> = aktifkan tracking jumlah stok. Atur angka kalau pakai stok mode.
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Tersedia"
          value={items.filter((i) => i.is_available).length}
          dotColor="#16a34a"
        />
        <StatCard
          label="Habis (manual)"
          value={unavailableItems.length}
          dotColor="#dc2626"
        />
        <StatCard label="Stok Tipis (≤5)" value={lowStock.length} dotColor="#f59e0b" />
        <StatCard label="Pakai Stok" value={trackedItems.length} dotColor="#000000" />
      </div>

      {/* Bulk Actions */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 500, color: '#45464d' }}>Bulk Actions:</span>
        <BulkBtn onClick={markAllAvailable} icon="check_circle" color="#16a34a">
          Tersedia Semua
        </BulkBtn>
        <BulkBtn onClick={() => bulkAddStock(10)} icon="add" color="#000000">
          +10 Stok Semua
        </BulkBtn>
        <BulkBtn onClick={() => bulkAddStock(50)} icon="add" color="#000000">
          +50 Stok Semua
        </BulkBtn>
        <BulkBtn onClick={resetAllStock} icon="restart_alt" color="#dc2626">
          Reset Stok ke 0
        </BulkBtn>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1 }}>
          <FilterBtn isActive={filter === 'all'} onClick={() => setFilter('all')}>
            Semua ({items.length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'unavailable'} onClick={() => setFilter('unavailable')}>
            Habis ({unavailableItems.length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'tracked'} onClick={() => setFilter('tracked')}>
            Pakai Stok ({trackedItems.length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'low'} onClick={() => setFilter('low')}>
            Tipis ({lowStock.length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'out'} onClick={() => setFilter('out')}>
            Stok 0 ({outOfStock.length})
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
            placeholder="Cari menu..."
            style={{
              height: '40px',
              paddingLeft: '36px',
              paddingRight: '16px',
              width: '200px',
              backgroundColor: '#ffffff',
              border: '1px solid #c6c6cd',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            color: '#76777d',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>
            inventory_2
          </span>
          <p style={{ margin: 0 }}>Tidak ada menu yang cocok dengan filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {Object.entries(groupedByCategory).map(([catId, catItems]) => (
            <CategorySection
              key={catId}
              categoryName={categoryName(catId)}
              items={catItems}
              reservedMap={reservedMap}
              editingId={editingId}
              editValue={editValue}
              savingId={savingId}
              onEditStart={(id, current) => {
                setEditingId(id)
                setEditValue(String(current))
              }}
              onEditCancel={() => {
                setEditingId(null)
                setEditValue('')
              }}
              onEditSave={(id) => {
                const n = parseInt(editValue)
                if (!isNaN(n)) updateStock(id, n)
              }}
              onEditChange={setEditValue}
              onQuickAdjust={quickAdjust}
              onToggleTrack={toggleTrackStock}
              onToggleAvailability={toggleAvailability}
            />
          ))}
          {uncategorized.length > 0 && (
            <CategorySection
              categoryName="Tanpa Kategori"
              items={uncategorized}
              reservedMap={reservedMap}
              editingId={editingId}
              editValue={editValue}
              savingId={savingId}
              onEditStart={(id, current) => {
                setEditingId(id)
                setEditValue(String(current))
              }}
              onEditCancel={() => {
                setEditingId(null)
                setEditValue('')
              }}
              onEditSave={(id) => {
                const n = parseInt(editValue)
                if (!isNaN(n)) updateStock(id, n)
              }}
              onEditChange={setEditValue}
              onQuickAdjust={quickAdjust}
              onToggleTrack={toggleTrackStock}
              onToggleAvailability={toggleAvailability}
            />
          )}
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
        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: dotColor }} />
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
          fontSize: '28px',
          lineHeight: '36px',
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

function BulkBtn({
  onClick,
  icon,
  color,
  children,
}: {
  onClick: () => void
  icon: string
  color: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        backgroundColor: `${color}15`,
        color: color,
        borderRadius: '8px',
        border: 'none',
        fontSize: '12px',
        fontWeight: 500,
        cursor: 'pointer',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
        {icon}
      </span>
      {children}
    </button>
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
        padding: '8px 14px',
        borderRadius: '9999px',
        backgroundColor: isActive ? '#000000' : '#ffffff',
        color: isActive ? '#ffffff' : '#45464d',
        fontWeight: isActive ? 700 : 500,
        border: isActive ? 'none' : '1px solid #c6c6cd',
        fontSize: '12px',
        cursor: 'pointer',
        transition: 'all 200ms',
      }}
    >
      {children}
    </button>
  )
}

function CategorySection({
  categoryName,
  items,
  reservedMap,
  editingId,
  editValue,
  savingId,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditChange,
  onQuickAdjust,
  onToggleTrack,
  onToggleAvailability,
}: {
  categoryName: string
  items: MenuItem[]
  reservedMap: Record<string, number>
  editingId: string | null
  editValue: string
  savingId: string | null
  onEditStart: (id: string, current: number) => void
  onEditCancel: () => void
  onEditSave: (id: string) => void
  onEditChange: (v: string) => void
  onQuickAdjust: (item: MenuItem, delta: number) => void
  onToggleTrack: (item: MenuItem) => void
  onToggleAvailability: (item: MenuItem) => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#000000', margin: 0 }}>
          {categoryName}
        </h2>
        <span
          style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '9999px',
            backgroundColor: '#f4ede6',
            color: '#45464d',
            fontWeight: 500,
          }}
        >
          {items.length} menu
        </span>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #c6c6cd',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {items.map((item, idx) => (
          <StockRow
            key={item.id}
            item={item}
            reserved={reservedMap[item.id] || 0}
            isLast={idx === items.length - 1}
            isEditing={editingId === item.id}
            editValue={editValue}
            isSaving={savingId === item.id}
            onEditStart={() => onEditStart(item.id, item.stock_quantity)}
            onEditCancel={onEditCancel}
            onEditSave={() => onEditSave(item.id)}
            onEditChange={onEditChange}
            onQuickAdjust={(delta) => onQuickAdjust(item, delta)}
            onToggleTrack={() => onToggleTrack(item)}
            onToggleAvailability={() => onToggleAvailability(item)}
          />
        ))}
      </div>
    </div>
  )
}

function StockRow({
  item,
  reserved,
  isLast,
  isEditing,
  editValue,
  isSaving,
  onEditStart,
  onEditCancel,
  onEditSave,
  onEditChange,
  onQuickAdjust,
  onToggleTrack,
  onToggleAvailability,
}: {
  item: MenuItem
  reserved: number
  isLast: boolean
  isEditing: boolean
  editValue: string
  isSaving: boolean
  onEditStart: () => void
  onEditCancel: () => void
  onEditSave: () => void
  onEditChange: (v: string) => void
  onQuickAdjust: (delta: number) => void
  onToggleTrack: () => void
  onToggleAvailability: () => void
}) {
  const available = Math.max(0, item.stock_quantity - reserved)
  const stockOut = item.track_stock && available <= 0
  const stockLow = item.track_stock && available > 0 && available <= 5
  const isUnavailable = !item.is_available

  let badgeColor = '#16a34a'
  let badgeBg = '#dcfce7'
  let badgeText = 'AMAN'

  if (isUnavailable) {
    badgeColor = '#991b1b'
    badgeBg = '#fee2e2'
    badgeText = 'HABIS'
  } else if (stockOut) {
    badgeColor = '#991b1b'
    badgeBg = '#fee2e2'
    badgeText = 'STOK 0'
  } else if (stockLow) {
    badgeColor = '#92400e'
    badgeBg = '#fef3c7'
    badgeText = 'TIPIS'
  }

  return (
    <div
      style={{
        padding: '14px 16px',
        borderBottom: isLast ? 'none' : '1px solid #e8e1db',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        opacity: isUnavailable ? 0.55 : 1,
        backgroundColor: isUnavailable ? '#fafafa' : '#ffffff',
      }}
    >
      {/* Image */}
      <div
        style={{
          width: '40px',
          height: '40px',
          backgroundColor: '#f4ede6',
          borderRadius: '8px',
          flexShrink: 0,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          filter: isUnavailable ? 'grayscale(0.5)' : 'none',
        }}
      >
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span className="material-symbols-outlined" style={{ color: '#c6c6cd', fontSize: '20px' }}>
            restaurant
          </span>
        )}
      </div>

      {/* Name + Badge */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#000000',
              margin: 0,
              textDecoration: isUnavailable ? 'line-through' : 'none',
            }}
          >
            {item.name}
          </h3>
          {(item.track_stock || isUnavailable) && (
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontWeight: 700,
                padding: '2px 6px',
                borderRadius: '4px',
                backgroundColor: badgeBg,
                color: badgeColor,
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
        {item.track_stock && reserved > 0 && !isUnavailable && (
          <p style={{ fontSize: '11px', color: '#45464d', margin: '2px 0 0 0' }}>
            <span style={{ color: '#dc2626' }}>{reserved} di cart</span> ·{' '}
            <span style={{ color: '#16a34a' }}>{available} tersedia</span>
          </p>
        )}
      </div>

      {/* Toggle Tersedia (Quick Action - Most Important) */}
      <ToggleSwitch
        label="Tersedia"
        active={item.is_available}
        onClick={onToggleAvailability}
        activeColor="#16a34a"
      />

      {/* Toggle Pakai Stok */}
      <ToggleSwitch
        label="Pakai Stok"
        active={item.track_stock}
        onClick={onToggleTrack}
        activeColor="#000000"
      />

      {/* Stock Controls (only show if track_stock = true) */}
      {item.track_stock && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => onQuickAdjust(-1)}
            disabled={isSaving || item.stock_quantity === 0}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#f4ede6',
              border: 'none',
              cursor: isSaving || item.stock_quantity === 0 ? 'not-allowed' : 'pointer',
              opacity: isSaving || item.stock_quantity === 0 ? 0.4 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000000',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              remove
            </span>
          </button>

          {isEditing ? (
            <input
              type="number"
              autoFocus
              value={editValue}
              onChange={(e) => onEditChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave()
                if (e.key === 'Escape') onEditCancel()
              }}
              min="0"
              style={{
                width: '64px',
                height: '32px',
                textAlign: 'center',
                border: '2px solid #000000',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontWeight: 700,
                outline: 'none',
              }}
            />
          ) : (
            <button
              onClick={onEditStart}
              style={{
                width: '64px',
                height: '32px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontWeight: 700,
                color: '#000000',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              {item.stock_quantity}
            </button>
          )}

          <button
            onClick={() => onQuickAdjust(1)}
            disabled={isSaving}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#000000',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
          </button>

          <button
            onClick={() => onQuickAdjust(10)}
            disabled={isSaving}
            style={{
              padding: '0 8px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#f4ede6',
              border: 'none',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              color: '#000000',
            }}
          >
            +10
          </button>
        </div>
      )}

      {!item.track_stock && (
        <span
          style={{
            fontSize: '11px',
            color: '#76777d',
            fontStyle: 'italic',
            padding: '4px 12px',
            backgroundColor: '#f4ede6',
            borderRadius: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          Unlimited
        </span>
      )}
    </div>
  )
}

function ToggleSwitch({
  label,
  active,
  onClick,
  activeColor,
}: {
  label: string
  active: boolean
  onClick: () => void
  activeColor: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <span style={{ fontSize: '10px', color: '#45464d', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <button
        onClick={onClick}
        style={{
          width: '36px',
          height: '20px',
          borderRadius: '9999px',
          backgroundColor: active ? activeColor : '#c6c6cd',
          border: 'none',
          position: 'relative',
          cursor: 'pointer',
          transition: 'background-color 200ms',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '3px',
            left: active ? '18px' : '3px',
            width: '14px',
            height: '14px',
            backgroundColor: '#ffffff',
            borderRadius: '9999px',
            transition: 'left 200ms',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}
        />
      </button>
    </div>
  )
}