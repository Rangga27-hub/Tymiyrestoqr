'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { formatIDR } from '@/lib/utils'

type Category = {
  id: string
  name: string
  display_order: number
  restaurant_id: string
}

type MenuItem = {
  id: string
  name: string
  price: number
  category_id: string | null
  image_url: string | null
  is_available: boolean
}

export default function CategoriesClient({
  restaurantId,
  categories: initialCategories,
  items,
}: {
  restaurantId: string
  categories: Category[]
  items: MenuItem[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [, startTransition] = useTransition()
  const [categories, setCategories] = useState(initialCategories)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [manageCategoryId, setManageCategoryId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  function getItemCount(catId: string): number {
    return items.filter((i) => i.category_id === catId).length
  }

  const uncategorizedCount = items.filter((i) => !i.category_id).length

  async function createCategory() {
    if (!newCategoryName.trim()) return
    setBusy(true)
    const nextOrder = (categories[categories.length - 1]?.display_order ?? 0) + 1

    const { data, error } = await supabase
      .from('menu_categories')
      .insert({
        name: newCategoryName.trim(),
        restaurant_id: restaurantId,
        display_order: nextOrder,
      })
      .select()
      .single()

    setBusy(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    if (data) setCategories([...categories, data])
    setNewCategoryName('')
    setCreating(false)
    showToast('Kategori dibuat')
    startTransition(() => router.refresh())
  }

  async function renameCategory(id: string) {
    if (!editName.trim()) return
    setBusy(true)
    const { error } = await supabase
      .from('menu_categories')
      .update({ name: editName.trim() })
      .eq('id', id)

    setBusy(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setCategories(categories.map((c) => (c.id === id ? { ...c, name: editName.trim() } : c)))
    setEditingId(null)
    setEditName('')
    showToast('Kategori diupdate')
    startTransition(() => router.refresh())
  }

  async function deleteCategory(cat: Category) {
    const itemCount = getItemCount(cat.id)
    const msg =
      itemCount > 0
        ? `Hapus kategori "${cat.name}"? ${itemCount} menu akan jadi tanpa kategori (masuk ke "Lainnya").`
        : `Hapus kategori "${cat.name}"?`

    if (!confirm(msg)) return
    setBusy(true)

    // Set items dalam kategori ini → null
    if (itemCount > 0) {
      await supabase.from('menu_items').update({ category_id: null }).eq('category_id', cat.id)
    }

    const { error } = await supabase.from('menu_categories').delete().eq('id', cat.id)

    setBusy(false)
    if (error) {
      showToast(error.message, 'error')
      return
    }
    setCategories(categories.filter((c) => c.id !== cat.id))
    showToast('Kategori dihapus')
    startTransition(() => router.refresh())
  }

  async function moveCategory(id: string, direction: 'up' | 'down') {
    const idx = categories.findIndex((c) => c.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= categories.length) return

    setBusy(true)
    const current = categories[idx]
    const swap = categories[swapIdx]

    await Promise.all([
      supabase.from('menu_categories').update({ display_order: swap.display_order }).eq('id', current.id),
      supabase.from('menu_categories').update({ display_order: current.display_order }).eq('id', swap.id),
    ])

    const newOrder = [...categories]
    newOrder[idx] = { ...swap, display_order: current.display_order }
    newOrder[swapIdx] = { ...current, display_order: swap.display_order }
    setCategories(newOrder)
    setBusy(false)
    startTransition(() => router.refresh())
  }

  const activeManageCategory = categories.find((c) => c.id === manageCategoryId)

  return (
    <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            backgroundColor: toast.type === 'success' ? '#16a34a' : '#dc2626',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <Link
          href="/dashboard/menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            color: '#000000',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>arrow_back</span>
        </Link>
        <div>
          <h1 style={{ fontSize: '28px', lineHeight: '36px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000', margin: 0 }}>
            Kelola Kategori
          </h1>
          <p style={{ fontSize: '13px', color: '#45464d', margin: '2px 0 0 0' }}>
            Atur kategori menu + bulk assign items
          </p>
        </div>
      </div>

      {/* Stats banner */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          padding: '14px 18px',
          backgroundColor: '#faf2eb',
          border: '1px solid #e8e1db',
          borderRadius: '12px',
          marginTop: '24px',
          marginBottom: '24px',
          fontSize: '13px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <span style={{ color: '#76777d' }}>Total Kategori: </span>
          <strong style={{ color: '#000000' }}>{categories.length}</strong>
        </div>
        <div>
          <span style={{ color: '#76777d' }}>Total Menu: </span>
          <strong style={{ color: '#000000' }}>{items.length}</strong>
        </div>
        {uncategorizedCount > 0 && (
          <div>
            <span style={{ color: '#76777d' }}>Tanpa Kategori: </span>
            <strong style={{ color: '#dc2626' }}>{uncategorizedCount}</strong>
          </div>
        )}
      </div>

      {/* Add new category */}
      {!creating ? (
        <button
          onClick={() => setCreating(true)}
          style={{
            width: '100%',
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '2px dashed #c6c6cd',
            borderRadius: '12px',
            color: '#45464d',
            fontWeight: 500,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add</span>
          Tambah Kategori
        </button>
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#ffffff',
            border: '2px solid #000000',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            gap: '8px',
          }}
        >
          <input
            type="text"
            autoFocus
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') createCategory()
              if (e.key === 'Escape') {
                setCreating(false)
                setNewCategoryName('')
              }
            }}
            placeholder="Nama kategori baru..."
            style={{
              flex: 1,
              height: '40px',
              padding: '0 14px',
              border: '1px solid #c6c6cd',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
          />
          <button
            onClick={createCategory}
            disabled={busy || !newCategoryName.trim()}
            style={{
              padding: '0 18px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '13px',
              cursor: busy ? 'not-allowed' : 'pointer',
              opacity: busy || !newCategoryName.trim() ? 0.5 : 1,
            }}
          >
            Simpan
          </button>
          <button
            onClick={() => {
              setCreating(false)
              setNewCategoryName('')
            }}
            style={{
              padding: '0 16px',
              backgroundColor: '#f4ede6',
              color: '#45464d',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
        </div>
      )}

      {/* Categories list */}
      {categories.length === 0 ? (
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
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', color: '#c6c6cd' }}>
            category
          </span>
          <p style={{ margin: 0 }}>Belum ada kategori</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {categories.map((cat, idx) => {
            const isFirst = idx === 0
            const isLast = idx === categories.length - 1
            const itemCount = getItemCount(cat.id)
            const isEditing = editingId === cat.id

            return (
              <div
                key={cat.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #c6c6cd',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {/* Order controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <button
                    onClick={() => moveCategory(cat.id, 'up')}
                    disabled={isFirst || busy}
                    style={{
                      width: '24px',
                      height: '20px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: isFirst ? 'not-allowed' : 'pointer',
                      opacity: isFirst ? 0.3 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>keyboard_arrow_up</span>
                  </button>
                  <button
                    onClick={() => moveCategory(cat.id, 'down')}
                    disabled={isLast || busy}
                    style={{
                      width: '24px',
                      height: '20px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: isLast ? 'not-allowed' : 'pointer',
                      opacity: isLast ? 0.3 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>keyboard_arrow_down</span>
                  </button>
                </div>

                {/* Name */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  {isEditing ? (
                    <input
                      autoFocus
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => renameCategory(cat.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameCategory(cat.id)
                        if (e.key === 'Escape') {
                          setEditingId(null)
                          setEditName('')
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 12px',
                        border: '2px solid #000000',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: 600,
                        outline: 'none',
                      }}
                    />
                  ) : (
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#000000', margin: 0 }}>
                        {cat.name}
                      </h3>
                      <p style={{ fontSize: '11px', color: '#76777d', margin: '2px 0 0 0' }}>
                        {itemCount} menu
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setManageCategoryId(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '6px 12px',
                      backgroundColor: '#000000',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit_note</span>
                    Atur Menu
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(cat.id)
                      setEditName(cat.name)
                    }}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#f4ede6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#000000',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#ffdad6',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ba1a1a',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Manage Items Modal */}
      {activeManageCategory && (
        <ManageItemsModal
          category={activeManageCategory}
          allItems={items}
          onClose={() => setManageCategoryId(null)}
          onSaved={() => {
            setManageCategoryId(null)
            startTransition(() => router.refresh())
            showToast('Menu berhasil diatur')
          }}
        />
      )}
    </div>
  )
}

// ====== Modal Component ======

function ManageItemsModal({
  category,
  allItems,
  onClose,
  onSaved,
}: {
  category: Category
  allItems: MenuItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)

  // Items yang sekarang ada di kategori ini
  const initialItemIds = allItems
    .filter((i) => i.category_id === category.id)
    .map((i) => i.id)

  const [selectedIds, setSelectedIds] = useState<string[]>(initialItemIds)

  // Filter berdasarkan search
  const filteredItems = allItems.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase())
  )

  function toggleItem(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function selectAll() {
    setSelectedIds(filteredItems.map((i) => i.id))
  }

  function clearAll() {
    setSelectedIds([])
  }

  async function handleSave() {
    setBusy(true)

    // Items yang HARUS jadi kategori ini (sekarang di-select)
    const toAssign = selectedIds.filter((id) => {
      const item = allItems.find((i) => i.id === id)
      return item && item.category_id !== category.id
    })

    // Items yang HARUS dikeluarkan dari kategori ini (dulu di kategori ini, sekarang gak di-select)
    const toRemove = allItems
      .filter((i) => i.category_id === category.id && !selectedIds.includes(i.id))
      .map((i) => i.id)

    // Eksekusi
const promises: Promise<unknown>[] = []

if (toAssign.length > 0) {
  promises.push(
    Promise.resolve(
      supabase.from('menu_items').update({ category_id: category.id }).in('id', toAssign)
    )
  )
}

if (toRemove.length > 0) {
  promises.push(
    Promise.resolve(
      supabase.from('menu_items').update({ category_id: null }).in('id', toRemove)
    )
  )
}

    await Promise.all(promises)
    setBusy(false)
    onSaved()
  }

  const changeCount =
    selectedIds.filter((id) => !initialItemIds.includes(id)).length +
    initialItemIds.filter((id) => !selectedIds.includes(id)).length

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e8e1db', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
              Atur Menu untuk
            </p>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#000000', margin: '4px 0 0 0' }}>
              {category.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#f4ede6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Search + bulk actions */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #e8e1db', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <span
              className="material-symbols-outlined"
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#76777d', fontSize: '18px' }}
            >
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu..."
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '36px',
                paddingRight: '12px',
                border: '1px solid #c6c6cd',
                borderRadius: '8px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={selectAll}
            style={{
              padding: '0 12px',
              height: '38px',
              backgroundColor: '#f4ede6',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#000000',
            }}
          >
            Pilih Semua
          </button>
          <button
            onClick={clearAll}
            style={{
              padding: '0 12px',
              height: '38px',
              backgroundColor: '#f4ede6',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#000000',
            }}
          >
            Kosongkan
          </button>
        </div>

        {/* Item list */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '8px 24px' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#76777d' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px' }}>restaurant</span>
              <p style={{ margin: 0, fontSize: '13px' }}>
                {allItems.length === 0 ? 'Belum ada menu' : 'Tidak ada menu yang cocok'}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const selected = selectedIds.includes(item.id)
              const isInOtherCategory = item.category_id && item.category_id !== category.id
              const wasInThis = initialItemIds.includes(item.id)
              const willChange = selected !== wasInThis

              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    backgroundColor: selected ? '#dbeafe' : '#ffffff',
                    border: selected ? '2px solid #2563eb' : '1px solid #e8e1db',
                    borderRadius: '10px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms',
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      border: selected ? 'none' : '2px solid #c6c6cd',
                      backgroundColor: selected ? '#2563eb' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {selected && (
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#ffffff' }}>check</span>
                    )}
                  </div>

                  {/* Item image */}
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: '#f4ede6',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#c6c6cd' }}>restaurant</span>
                    )}
                  </div>

                  {/* Item info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#000000', margin: 0 }}>
                      {item.name}
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        color: '#45464d',
                        margin: '2px 0 0 0',
                        fontFamily: 'var(--font-jetbrains-mono), monospace',
                      }}
                    >
                      {formatIDR(Number(item.price))}
                    </p>
                  </div>

                  {/* Status badges */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                    {willChange && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: selected ? '#dcfce7' : '#fee2e2',
                          color: selected ? '#166534' : '#991b1b',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                        }}
                      >
                        {selected ? '+ Ditambah' : '− Dihapus'}
                      </span>
                    )}
                    {isInOtherCategory && !wasInThis && (
                      <span
                        style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                        }}
                      >
                        Pindah dari lain
                      </span>
                    )}
                  </div>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e8e1db',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: '12px', color: '#45464d', margin: 0 }}>
            <strong>{selectedIds.length}</strong> menu dipilih
            {changeCount > 0 && (
              <span style={{ color: '#2563eb', marginLeft: '8px' }}>
                · {changeCount} perubahan
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onClose}
              disabled={busy}
              style={{
                padding: '0 18px',
                height: '40px',
                backgroundColor: '#f4ede6',
                color: '#45464d',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '13px',
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              disabled={busy || changeCount === 0}
              style={{
                padding: '0 18px',
                height: '40px',
                backgroundColor: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: busy || changeCount === 0 ? 'not-allowed' : 'pointer',
                opacity: busy || changeCount === 0 ? 0.5 : 1,
              }}
            >
              {busy ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}