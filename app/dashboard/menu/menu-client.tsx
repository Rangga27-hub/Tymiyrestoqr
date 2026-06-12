'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils'

type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  image_url: string | null
  is_available: boolean
  menu_categories: { name: string } | { name: string }[] | null
}

type Category = {
  id: string
  name: string
  display_order: number
}

export default function MenuClient({
  restaurantId,
  items,
  categories,
  categoryCounts,
  totalItems,
  currentCategory,
}: {
  restaurantId: string
  items: MenuItem[]
  categories: Category[]
  categoryCounts: Record<string, number>
  totalItems: number
  currentCategory: string

}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [, startTransition] = useTransition()

  function updateCategory(catId: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (catId === 'all') {
      params.delete('category')
    } else {
      params.set('category', catId)
    }
    startTransition(() => {
      router.push(`/dashboard/menu?${params.toString()}`)
    })
  }

  async function toggleAvailability(itemId: string, current: boolean) {
    await supabase
      .from('menu_items')
      .update({ is_available: !current })
      .eq('id', itemId)
    router.refresh()
  }

  async function deleteItem(itemId: string, itemName: string) {
    if (!confirm(`Hapus menu "${itemName}"?`)) return
    await supabase.from('menu_items').delete().eq('id', itemId)
    router.refresh()
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
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
            Menu
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: '#45464d',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '9999px',
                  backgroundColor: '#16a34a',
                }}
              />
              Active Menu
            </span>
            <span style={{ color: '#c6c6cd' }}>|</span>
            <span style={{ fontSize: '12px', color: '#45464d' }}>
              {totalItems} Total Items
            </span>
          </div>
        </div>

        <Link
          href="/dashboard/menu/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '10px 24px',
            backgroundColor: '#000000',
            color: '#ffffff',
            borderRadius: '8px',
            fontWeight: 700,
            textDecoration: 'none',
            transition: 'opacity 200ms',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            add
          </span>
          Tambah Menu
        </Link>
      </div>

      {/* Category Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          borderBottom: '1px solid #c6c6cd',
          marginBottom: '24px',
          overflowX: 'auto',
          paddingBottom: '2px',
        }}
      >
        <CategoryTab
          label="All Items"
          count={totalItems}
          isActive={currentCategory === 'all'}
          onClick={() => updateCategory('all')}
        />
        {categories.map((cat) => (
          <CategoryTab
            key={cat.id}
            label={cat.name}
            count={categoryCounts[cat.id] || 0}
            isActive={currentCategory === cat.id}
            onClick={() => updateCategory(cat.id)}
          />
        ))}
        <Link
          href="/dashboard/menu/categories"
          style={{
            paddingBottom: '12px',
            paddingLeft: '12px',
            paddingRight: '12px',
            color: '#76777d',
            fontSize: '14px',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            settings
          </span>
          Kelola Kategori
        </Link>
      </div>

      {/* Menu Grid */}
      {items.length === 0 ? (
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
          <p style={{ marginBottom: '12px' }}>Belum ada menu di kategori ini</p>
          <Link
            href="/dashboard/menu/new"
            style={{ color: '#000000', fontWeight: 700, textDecoration: 'underline' }}
          >
            + Tambah menu pertama
          </Link>
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          style={{ gap: '16px' }}
        >
          {items.map((item) => {
            const category = Array.isArray(item.menu_categories)
              ? item.menu_categories[0]
              : item.menu_categories
            return (
             <MenuItemCard
                key={item.id}
                item={item}
                categoryName={category?.name || 'Tanpa kategori'}
                onToggleAvailability={toggleAvailability}
                onDelete={deleteItem}
                />
            )
          })}
        </div>
      )}
    </div>
  )
}

// === Components ===

function CategoryTab({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string
  count: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        paddingBottom: '12px',
        paddingLeft: '16px',
        paddingRight: '16px',
        color: isActive ? '#000000' : '#45464d',
        fontWeight: isActive ? 700 : 500,
        borderBottom: isActive ? '2px solid #ae3115' : '2px solid transparent',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        whiteSpace: 'nowrap',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'color 200ms',
        fontSize: '14px',
      }}
    >
      {label}
      <span
        style={{
          fontSize: '12px',
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: isActive ? '#e8e1db' : '#f4ede6',
          color: isActive ? '#000000' : '#45464d',
        }}
      >
        {count}
      </span>
    </button>
  )
}

function MenuItemCard({
  item,
  categoryName,
  onToggleAvailability,
  onDelete,
}: {
  item: MenuItem
  categoryName: string
  onToggleAvailability: (id: string, current: boolean) => Promise<void>
  onDelete: (id: string, name: string) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)

  async function handleToggle() {
    setLoading(true)
    await onToggleAvailability(item.id, item.is_available)
    setLoading(false)
  }

  const unavailable = !item.is_available

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        borderRadius: '10px',
        overflow: 'hidden',
        transition: 'box-shadow 300ms',
        opacity: unavailable ? 0.7 : 1,
        filter: unavailable ? 'grayscale(0.5)' : 'none',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Image */}
      <div style={{ position: 'relative', height: '180px', overflow: 'hidden', backgroundColor: '#f4ede6' }}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: unavailable ? 'grayscale(1)' : 'none',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#c6c6cd',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '48px' }}>
              restaurant
            </span>
          </div>
        )}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <span
            style={{
              padding: '4px 8px',
              backgroundColor: 'rgba(232, 225, 219, 0.9)',
              backdropFilter: 'blur(8px)',
              borderRadius: '4px',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              fontSize: '10px',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: item.is_available ? '#16a34a' : '#dc2626',
              }}
            />
            {categoryName}
          </span>
        </div>
        {unavailable && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                padding: '4px 12px',
                backgroundColor: '#ba1a1a',
                color: '#ffffff',
                borderRadius: '9999px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Habis
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3
            style={{
              fontSize: '16px',
              lineHeight: '22px',
              fontWeight: 600,
              color: '#000000',
              margin: 0,
              flex: 1,
            }}
          >
            {item.name}
          </h3>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#ae3115',
              whiteSpace: 'nowrap',
            }}
          >
           
          </span>
        </div>
        <p
          style={{
            fontSize: '14px',
            color: '#45464d',
            margin: '0 0 16px 0',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            minHeight: '40px',
          }}
        >
          {item.description || 'Tidak ada deskripsi'}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid #c6c6cd',
          }}
        >
          {/* Toggle availability */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#45464d' }}>Tersedia</span>
            <button
              onClick={handleToggle}
              disabled={loading}
              style={{
                width: '40px',
                height: '24px',
                borderRadius: '9999px',
                backgroundColor: item.is_available ? '#ae3115' : '#c6c6cd',
                position: 'relative',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 200ms',
                opacity: loading ? 0.5 : 1,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: item.is_available ? '20px' : '4px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#ffffff',
                  borderRadius: '9999px',
                  transition: 'left 200ms',
                }}
              />
            </button>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Link
              href={`/dashboard/menu/${item.id}`}
              style={{
                padding: '8px',
                color: '#45464d',
                textDecoration: 'none',
                transition: 'color 200ms',
                display: 'inline-flex',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#000000')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#45464d')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                edit
              </span>
            </Link>
            <button
              onClick={() => onDelete(item.id, item.name)}
              style={{
                padding: '8px',
                color: '#45464d',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'color 200ms',
                display: 'inline-flex',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ba1a1a')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#45464d')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                delete
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}