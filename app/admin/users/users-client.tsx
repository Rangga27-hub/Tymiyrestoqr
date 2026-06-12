'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

type Profile = {
  id: string
  email: string | null
  full_name: string | null
  role: string
  restaurant_id: string | null
  created_at: string
}

type Restaurant = { id: string; name: string }

type PlanId = 'flat_monthly' | 'pay_per_order'

export default function UsersClient({
  profiles,
  restaurants,
  restaurantMap,
}: {
  profiles: Profile[]
  restaurants: Restaurant[]
  restaurantMap: Record<string, string>
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'owner' | 'cashier' | 'admin'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [, startTransition] = useTransition()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'owner' | 'cashier'>('cashier')

  const [restaurantId, setRestaurantId] = useState('')

  const [ownerMode, setOwnerMode] = useState<'new' | 'existing'>('new')
  const [newRestoName, setNewRestoName] = useState('')
  const [newRestoSlug, setNewRestoSlug] = useState('')
  const [newRestoAddress, setNewRestoAddress] = useState('')
  const [selectedRestoIds, setSelectedRestoIds] = useState<string[]>([])

  // PLAN (Step 2)
  const [planId, setPlanId] = useState<PlanId>('pay_per_order')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleRestoNameChange(value: string) {
    setNewRestoName(value)
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
    setNewRestoSlug(slug)
  }

  function toggleRestoSelection(id: string) {
    setSelectedRestoIds((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  let filteredProfiles = profiles
  if (filter !== 'all') filteredProfiles = profiles.filter((p) => p.role === filter)
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredProfiles = filteredProfiles.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(term) ||
        p.email?.toLowerCase().includes(term)
    )
  }

  function resetForm() {
    setEmail('')
    setPassword('')
    setFullName('')
    setRestaurantId('')
    setNewRestoName('')
    setNewRestoSlug('')
    setNewRestoAddress('')
    setSelectedRestoIds([])
    setPlanId('pay_per_order')
  }

  async function handleCreate() {
    setError(null)
    setSuccess(null)

    if (!email || !password || !fullName) {
      setError('Nama, email, dan password wajib diisi')
      return
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter')
      return
    }
    if (role === 'cashier' && !restaurantId) {
      setError('Kasir wajib punya restoran')
      return
    }
    if (role === 'owner' && ownerMode === 'new' && (!newRestoName || !newRestoSlug)) {
      setError('Nama & slug restoran wajib diisi')
      return
    }
    if (role === 'owner' && ownerMode === 'existing' && selectedRestoIds.length === 0) {
      setError('Pilih minimal 1 restoran')
      return
    }

    setSubmitting(true)

    try {
      const payload: any = { email, password, fullName, role }

      if (role === 'cashier') {
        payload.restaurantId = restaurantId
      } else if (role === 'owner') {
        payload.ownerMode = ownerMode
        if (ownerMode === 'new') {
          payload.newRestaurant = {
            name: newRestoName,
            slug: newRestoSlug,
            address: newRestoAddress,
          }
          payload.planId = planId
        } else {
          payload.existingRestaurantIds = selectedRestoIds
        }
      }

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Gagal membuat user')
      }

      setSuccess(`User ${fullName} berhasil dibuat!`)
      resetForm()
      setSubmitting(false)
      startTransition(() => router.refresh())

      setTimeout(() => {
        setShowForm(false)
        setSuccess(null)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setSubmitting(false)
    }
  }

  const roleBadge = (r: string) => {
    const map: Record<string, { bg: string; color: string; label: string }> = {
      admin: { bg: '#fee2e2', color: '#991b1b', label: 'Admin' },
      owner: { bg: '#dbeafe', color: '#1e40af', label: 'Owner' },
      cashier: { bg: '#ede9fe', color: '#6d28d9', label: 'Kasir' },
    }
    return map[r] || { bg: '#f4ede6', color: '#45464d', label: r }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '32px', lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000', margin: 0 }}>
            Pengguna
          </h1>
          <p style={{ fontSize: '14px', color: '#45464d', margin: '4px 0 0 0' }}>
            {profiles.length} pengguna terdaftar
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            backgroundColor: '#000000',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '10px',
            border: 'none',
            fontWeight: 700,
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
            {showForm ? 'close' : 'person_add'}
          </span>
          {showForm ? 'Tutup' : 'Tambah Pengguna'}
        </button>
      </div>

      {showForm && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: '0 0 20px 0' }}>
            Buat Pengguna Baru
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Field label="Nama Lengkap">
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Budi Santoso" style={inputStyle} />
            </Field>
            <Field label="Email">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="budi@resto.com" style={inputStyle} />
            </Field>
            <Field label="Password">
              <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 karakter" style={inputStyle} />
            </Field>
            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value as 'owner' | 'cashier')} style={inputStyle}>
                <option value="cashier">Kasir</option>
                <option value="owner">Owner</option>
              </select>
            </Field>
          </div>

          {role === 'cashier' && (
            <div style={{ marginBottom: '16px' }}>
              <Field label="Restoran (wajib untuk kasir)">
                <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)} style={inputStyle}>
                  <option value="">— Pilih Restoran —</option>
                  {restaurants.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
              </Field>
            </div>
          )}

          {role === 'owner' && (
            <div
              style={{
                backgroundColor: '#faf2eb',
                border: '1px solid #e8e1db',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px',
              }}
            >
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#45464d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                Restoran untuk Owner ini
              </label>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <ModeButton active={ownerMode === 'new'} onClick={() => setOwnerMode('new')} icon="add_business" label="Buat Restoran Baru" />
                <ModeButton active={ownerMode === 'existing'} onClick={() => setOwnerMode('existing')} icon="storefront" label="Pilih Restoran Existing" />
              </div>

              {ownerMode === 'new' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <Field label="Nama Restoran">
                    <input type="text" value={newRestoName} onChange={(e) => handleRestoNameChange(e.target.value)} placeholder="Warung Makan Sederhana" style={inputStyle} />
                  </Field>
                  <Field label="Slug (URL)">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#76777d', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>/r/</span>
                      <input type="text" value={newRestoSlug} onChange={(e) => setNewRestoSlug(e.target.value)} placeholder="warung-makan-sederhana" style={{ ...inputStyle, fontFamily: 'var(--font-jetbrains-mono), monospace' }} />
                    </div>
                  </Field>
                  <Field label="Alamat">
                    <input type="text" value={newRestoAddress} onChange={(e) => setNewRestoAddress(e.target.value)} placeholder="Jl. Contoh No. 123, Jakarta" style={inputStyle} />
                  </Field>

                  {/* PLAN SELECTOR (Step 2) */}
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#45464d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                      Plan Langganan
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <PlanCard
                        selected={planId === 'pay_per_order'}
                        onClick={() => setPlanId('pay_per_order')}
                        title="Pay Per Order"
                        price="Rp 150"
                        priceUnit="/ transaksi"
                        description="Postpaid · invoice akhir bulan · cocok untuk resto baru"
                        recommended
                      />
                      <PlanCard
                        selected={planId === 'flat_monthly'}
                        onClick={() => setPlanId('flat_monthly')}
                        title="Flat Monthly"
                        price="Rp 120.000"
                        priceUnit="/ bulan"
                        description="Prepaid · invoice awal bulan · hemat untuk > 800 order/bulan"
                      />
                    </div>
                  </div>
                </div>
              )}

              {ownerMode === 'existing' && (
                <div>
                  <p style={{ fontSize: '12px', color: '#45464d', margin: '0 0 12px 0' }}>
                    Pilih restoran yang akan dikelola owner ini (bisa lebih dari 1):
                  </p>
                  {restaurants.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#76777d', fontStyle: 'italic' }}>
                      Belum ada restoran. Buat restoran baru dulu.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                      {restaurants.map((r) => {
                        const selected = selectedRestoIds.includes(r.id)
                        return (
                          <button
                            key={r.id}
                            onClick={() => toggleRestoSelection(r.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              padding: '12px 16px',
                              backgroundColor: selected ? '#dbeafe' : '#ffffff',
                              border: selected ? '2px solid #2563eb' : '1px solid #c6c6cd',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              textAlign: 'left',
                              width: '100%',
                            }}
                          >
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
                            <span style={{ fontSize: '14px', fontWeight: 500, color: '#000000' }}>{r.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {selectedRestoIds.length > 0 && (
                    <p style={{ fontSize: '12px', color: '#2563eb', margin: '12px 0 0 0', fontWeight: 500 }}>
                      {selectedRestoIds.length} restoran dipilih
                    </p>
                  )}
                  <p style={{ fontSize: '11px', color: '#76777d', margin: '12px 0 0 0', fontStyle: 'italic' }}>
                    Plan langganan mengikuti plan yang sudah ada di setiap restoran.
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={{ padding: '12px', backgroundColor: '#ffdad6', color: '#93000a', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ padding: '12px', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
              {success}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={submitting}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '10px',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.5 : 1,
            }}
          >
            {submitting ? 'Membuat...' : 'Buat Pengguna'}
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1 }}>
          <FilterBtn isActive={filter === 'all'} onClick={() => setFilter('all')}>
            Semua ({profiles.length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'owner'} onClick={() => setFilter('owner')}>
            Owner ({profiles.filter((p) => p.role === 'owner').length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'cashier'} onClick={() => setFilter('cashier')}>
            Kasir ({profiles.filter((p) => p.role === 'cashier').length})
          </FilterBtn>
          <FilterBtn isActive={filter === 'admin'} onClick={() => setFilter('admin')}>
            Admin ({profiles.filter((p) => p.role === 'admin').length})
          </FilterBtn>
        </div>
        <div style={{ position: 'relative' }}>
          <span className="material-symbols-outlined" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#76777d', fontSize: '18px' }}>
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama/email..."
            style={{ height: '40px', paddingLeft: '36px', paddingRight: '16px', width: '220px', backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '10px', fontSize: '14px', outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', overflow: 'hidden' }}>
        {filteredProfiles.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#76777d' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>group_off</span>
            <p style={{ margin: 0 }}>Tidak ada pengguna</p>
          </div>
        ) : (
          filteredProfiles.map((profile, idx) => {
            const badge = roleBadge(profile.role)
            return (
              <div
                key={profile.id}
                style={{
                  padding: '16px',
                  borderBottom: idx === filteredProfiles.length - 1 ? 'none' : '1px solid #e8e1db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '9999px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '14px',
                    flexShrink: 0,
                  }}
                >
                  {(profile.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: '#000000', margin: 0 }}>
                    {profile.full_name || 'Tanpa Nama'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#45464d', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {profile.email}
                  </p>
                </div>
                {profile.restaurant_id && (
                  <span style={{ fontSize: '11px', color: '#45464d', padding: '4px 10px', backgroundColor: '#f4ede6', borderRadius: '9999px', whiteSpace: 'nowrap' }}>
                    {restaurantMap[profile.restaurant_id] || 'Resto'}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function PlanCard({
  selected,
  onClick,
  title,
  price,
  priceUnit,
  description,
  recommended,
}: {
  selected: boolean
  onClick: () => void
  title: string
  price: string
  priceUnit: string
  description: string
  recommended?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        textAlign: 'left',
        padding: '16px',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        border: selected ? '2px solid #2563eb' : '1px solid #c6c6cd',
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 200ms',
      }}
    >
      {recommended && (
        <span
          style={{
            position: 'absolute',
            top: '-8px',
            right: '12px',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            backgroundColor: '#16a34a',
            color: '#ffffff',
            borderRadius: '9999px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Default
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <div
          style={{
            width: '18px',
            height: '18px',
            borderRadius: '9999px',
            border: selected ? 'none' : '2px solid #c6c6cd',
            backgroundColor: selected ? '#2563eb' : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {selected && (
            <span style={{ width: '8px', height: '8px', borderRadius: '9999px', backgroundColor: '#ffffff' }} />
          )}
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color: '#000000' }}>{title}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#000000', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          {price}
        </span>
        <span style={{ fontSize: '12px', color: '#45464d' }}>{priceUnit}</span>
      </div>

      <p style={{ fontSize: '11px', color: '#45464d', margin: 0, lineHeight: '1.4' }}>
        {description}
      </p>
    </button>
  )
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: string
  label: string
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '12px',
        backgroundColor: active ? '#000000' : '#ffffff',
        color: active ? '#ffffff' : '#45464d',
        border: active ? 'none' : '1px solid #c6c6cd',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        fontSize: '13px',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
      {label}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: '#45464d', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function FilterBtn({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: React.ReactNode }) {
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
      }}
    >
      {children}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  padding: '0 14px',
  backgroundColor: '#ffffff',
  border: '1px solid #c6c6cd',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
}