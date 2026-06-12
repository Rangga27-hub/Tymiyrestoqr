'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { formatIDR } from '@/lib/utils'

type Subscription = {
  id: string
  restaurant_id: string
  plan_id: string
  status: string
  cycle_start_date: string
  next_billing_date: string
  current_period_count: number
  pending_plan_id: string | null
  pending_change_effective_date: string | null
}

type Invoice = {
  id: string
  subscription_id: string
  restaurant_id: string
  invoice_number: string
  period_start: string
  period_end: string
  order_count: number
  billing_model_applied: string
  amount: number
  status: string
  issued_at: string | null
  paid_at: string | null
  due_date: string | null
}

type Tab = 'invoices' | 'subscriptions'

export default function BillingClient({
  subscriptions,
  invoices,
  restaurantMap,
  pendingChangesCount,
}: {
  subscriptions: Subscription[]
  invoices: Invoice[]
  restaurantMap: Record<string, { name: string; slug: string }>
  pendingChangesCount: number
}) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('invoices')
  const [invoiceFilter, setInvoiceFilter] = useState<'all' | 'issued' | 'paid' | 'overdue'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [, startTransition] = useTransition()
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function generateInvoicesAll() {
    if (!confirm('Generate invoice untuk SEMUA resto active? Ini akan membuat invoice baru atau update yang ada.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(`Sukses: ${result.successCount} invoice dibuat, ${result.failCount} gagal`)
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function generateInvoiceFor(restaurantId: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/generate-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(`Invoice dibuat: ${formatIDR(result.amount || 0)}`)
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function changePlan(restaurantId: string, newPlanId: string) {
    if (!confirm(`Ganti plan ke ${planLabel(newPlanId)}? Berlaku mulai awal bulan depan.`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, newPlanId }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Gagal ganti plan')
      showToast(`Plan akan berubah ke ${planLabel(newPlanId)} mulai ${formatDate(result.effective_date)}`)
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function cancelPendingPlan(restaurantId: string) {
    if (!confirm('Batalkan pending plan change?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId, action: 'cancel' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast('Pending change dibatalkan')
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function applyAllPending() {
    if (!confirm(`Apply ${pendingChangesCount} pending plan changes yang sudah lewat tanggalnya?`)) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply_all' }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(`${result.applied_count} pending changes applied`)
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function markInvoice(invoiceId: string, status: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/billing/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, status }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      showToast(`Invoice ditandai: ${status}`)
      startTransition(() => router.refresh())
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error')
    } finally {
      setBusy(false)
    }
  }

  // Filter invoices
  let filteredInvoices = invoices
  if (invoiceFilter !== 'all') {
    filteredInvoices = filteredInvoices.filter((i) => i.status === invoiceFilter)
  }
  if (searchTerm) {
    const term = searchTerm.toLowerCase()
    filteredInvoices = filteredInvoices.filter(
      (i) =>
        i.invoice_number.toLowerCase().includes(term) ||
        restaurantMap[i.restaurant_id]?.name.toLowerCase().includes(term)
    )
  }

  const totalIssued = invoices.filter((i) => i.status === 'issued').reduce((s, i) => s + Number(i.amount), 0)
  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amount), 0)
  const totalOverdue = invoices.filter((i) => i.status === 'overdue').reduce((s, i) => s + Number(i.amount), 0)

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1200px', margin: '0 auto', position: 'relative' }}>
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

      <h1 style={{ fontSize: '32px', lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000', margin: 0, marginBottom: '8px' }}>
        Billing
      </h1>
      <p style={{ fontSize: '14px', color: '#45464d', marginBottom: '24px' }}>
        Kelola invoice & langganan semua restoran
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Tagihan Belum Dibayar" value={formatIDR(totalIssued)} icon="hourglass_top" color="#f59e0b" count={invoices.filter((i) => i.status === 'issued').length} />
        <StatCard label="Sudah Dibayar" value={formatIDR(totalPaid)} icon="check_circle" color="#16a34a" count={invoices.filter((i) => i.status === 'paid').length} />
        <StatCard label="Overdue" value={formatIDR(totalOverdue)} icon="warning" color="#dc2626" count={invoices.filter((i) => i.status === 'overdue').length} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #c6c6cd' }}>
        <TabBtn active={tab === 'invoices'} onClick={() => setTab('invoices')} icon="receipt_long">
          Invoices ({invoices.length})
        </TabBtn>
        <TabBtn active={tab === 'subscriptions'} onClick={() => setTab('subscriptions')} icon="card_membership">
          Subscriptions ({subscriptions.length})
          {pendingChangesCount > 0 && (
            <span style={{ marginLeft: '6px', backgroundColor: '#f59e0b', color: '#ffffff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '9999px' }}>
              {pendingChangesCount}
            </span>
          )}
        </TabBtn>
      </div>

      {/* ===== TAB: INVOICES ===== */}
      {tab === 'invoices' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-4 items-start md:items-center">
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', flex: 1 }}>
              <FilterBtn isActive={invoiceFilter === 'all'} onClick={() => setInvoiceFilter('all')}>
                Semua ({invoices.length})
              </FilterBtn>
              <FilterBtn isActive={invoiceFilter === 'issued'} onClick={() => setInvoiceFilter('issued')}>
                Belum Dibayar ({invoices.filter((i) => i.status === 'issued').length})
              </FilterBtn>
              <FilterBtn isActive={invoiceFilter === 'paid'} onClick={() => setInvoiceFilter('paid')}>
                Dibayar ({invoices.filter((i) => i.status === 'paid').length})
              </FilterBtn>
              <FilterBtn isActive={invoiceFilter === 'overdue'} onClick={() => setInvoiceFilter('overdue')}>
                Overdue ({invoices.filter((i) => i.status === 'overdue').length})
              </FilterBtn>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari INV / resto..."
                style={{ height: '40px', padding: '0 14px', backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '10px', fontSize: '13px', outline: 'none', width: '200px' }}
              />
              <button
                onClick={generateInvoicesAll}
                disabled={busy}
                style={{
                  backgroundColor: '#000000',
                  color: '#ffffff',
                  padding: '0 16px',
                  height: '40px',
                  borderRadius: '10px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  opacity: busy ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>autorenew</span>
                Generate All
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', overflow: 'hidden' }}>
            {filteredInvoices.length === 0 ? (
              <EmptyState icon="receipt_long" text="Belum ada invoice" />
            ) : (
              filteredInvoices.map((inv, idx) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  restaurant={restaurantMap[inv.restaurant_id]}
                  isLast={idx === filteredInvoices.length - 1}
                  busy={busy}
                  onMark={markInvoice}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ===== TAB: SUBSCRIPTIONS ===== */}
      {tab === 'subscriptions' && (
        <>
          {pendingChangesCount > 0 && (
            <div
              style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '12px',
                padding: '14px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined" style={{ color: '#92400e' }}>schedule</span>
                <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
                  Ada {pendingChangesCount} pending plan change. Apply manual setelah tanggal effective.
                </span>
              </div>
              <button
                onClick={applyAllPending}
                disabled={busy}
                style={{
                  backgroundColor: '#92400e',
                  color: '#ffffff',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: busy ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Apply Pending
              </button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
            {subscriptions.length === 0 ? (
              <EmptyState icon="card_membership" text="Belum ada subscription" />
            ) : (
              subscriptions.map((sub) => (
                <SubscriptionCard
                  key={sub.id}
                  sub={sub}
                  restaurant={restaurantMap[sub.restaurant_id]}
                  busy={busy}
                  onChangePlan={changePlan}
                  onCancelPending={cancelPendingPlan}
                  onGenerateInvoice={generateInvoiceFor}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ===== Components =====

function StatCard({
  label,
  value,
  icon,
  color,
  count,
}: {
  label: string
  value: string
  icon: string
  color: string
  count: number
}) {
  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span className="material-symbols-outlined" style={{ color, fontSize: '20px' }}>{icon}</span>
        <span style={{ fontSize: '12px', color: '#45464d', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: '24px', fontWeight: 700, color: '#000000', margin: 0, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
        {value}
      </p>
      <p style={{ fontSize: '11px', color: '#76777d', margin: '4px 0 0 0' }}>
        {count} invoice
      </p>
    </div>
  )
}

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: string
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '12px 18px',
        backgroundColor: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid #000000' : '2px solid transparent',
        color: active ? '#000000' : '#76777d',
        fontWeight: active ? 700 : 500,
        fontSize: '13px',
        cursor: 'pointer',
        marginBottom: '-1px',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
      {children}
    </button>
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

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: '64px', textAlign: 'center', color: '#76777d' }}>
      <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', color: '#c6c6cd' }}>{icon}</span>
      <p style={{ margin: 0, fontSize: '14px' }}>{text}</p>
    </div>
  )
}

function InvoiceRow({
  invoice,
  restaurant,
  isLast,
  busy,
  onMark,
}: {
  invoice: Invoice
  restaurant?: { name: string; slug: string }
  isLast: boolean
  busy: boolean
  onMark: (id: string, status: string) => void
}) {
  const statusBadge = invoiceStatusBadge(invoice.status)

  return (
    <div
      style={{
        padding: '16px 20px',
        borderBottom: isLast ? 'none' : '1px solid #e8e1db',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#000000', margin: 0, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          {invoice.invoice_number}
        </p>
        <p style={{ fontSize: '12px', color: '#45464d', margin: '2px 0 0 0' }}>
          {restaurant?.name || 'Unknown resto'}
        </p>
      </div>

      <div style={{ flex: '1 1 120px' }}>
        <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periode</p>
        <p style={{ fontSize: '12px', color: '#000000', margin: '2px 0 0 0' }}>
          {formatDateShort(invoice.period_start)} - {formatDateShort(invoice.period_end)}
        </p>
      </div>

      <div style={{ flex: '0 0 120px' }}>
        <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</p>
        <p style={{ fontSize: '12px', color: '#000000', margin: '2px 0 0 0', fontWeight: 600 }}>
          {planLabel(invoice.billing_model_applied)}
        </p>
        {invoice.billing_model_applied === 'pay_per_order' && (
          <p style={{ fontSize: '10px', color: '#76777d', margin: '2px 0 0 0' }}>
            {invoice.order_count} order
          </p>
        )}
      </div>

      <div style={{ flex: '0 0 110px' }}>
        <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jumlah</p>
        <p style={{ fontSize: '14px', fontWeight: 700, color: '#000000', margin: '2px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          {formatIDR(Number(invoice.amount))}
        </p>
      </div>

      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          padding: '4px 10px',
          borderRadius: '9999px',
          backgroundColor: statusBadge.bg,
          color: statusBadge.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {statusBadge.label}
      </span>

      <div style={{ display: 'flex', gap: '6px' }}>
        {invoice.status !== 'paid' && (
          <button
            onClick={() => onMark(invoice.id, 'paid')}
            disabled={busy}
            style={{
              padding: '6px 12px',
              backgroundColor: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Tandai Dibayar
          </button>
        )}
        {invoice.status === 'paid' && (
          <button
            onClick={() => onMark(invoice.id, 'issued')}
            disabled={busy}
            style={{
              padding: '6px 12px',
              backgroundColor: '#f4ede6',
              color: '#45464d',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: busy ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Batalkan Paid
          </button>
        )}
      </div>
    </div>
  )
}

function SubscriptionCard({
  sub,
  restaurant,
  busy,
  onChangePlan,
  onCancelPending,
  onGenerateInvoice,
}: {
  sub: Subscription
  restaurant?: { name: string; slug: string }
  busy: boolean
  onChangePlan: (id: string, plan: string) => void
  onCancelPending: (id: string) => void
  onGenerateInvoice: (id: string) => void
}) {
  const statusBadge = subStatusBadge(sub.status)
  const otherPlan = sub.plan_id === 'flat_monthly' ? 'pay_per_order' : 'flat_monthly'

  return (
    <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', padding: '20px' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: 0 }}>
            {restaurant?.name || 'Unknown'}
          </h3>
          <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '9999px', backgroundColor: statusBadge.bg, color: statusBadge.color, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            {statusBadge.label}
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#76777d', margin: '2px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
          /{restaurant?.slug}
        </p>
      </div>

      {/* Plan info */}
      <div
        style={{
          backgroundColor: '#faf2eb',
          borderRadius: '10px',
          padding: '14px',
          marginBottom: '12px',
        }}
      >
        <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Plan Saat Ini
        </p>
        <p style={{ fontSize: '16px', fontWeight: 700, color: '#000000', margin: '4px 0 0 0' }}>
          {planLabel(sub.plan_id)}
        </p>
        <p style={{ fontSize: '11px', color: '#45464d', margin: '4px 0 0 0' }}>
          {planDescription(sub.plan_id)}
        </p>
      </div>

      {/* Pending change */}
      {sub.pending_plan_id && (
        <div
          style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '10px',
            padding: '12px',
            marginBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#92400e' }}>schedule</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Pending Change
            </span>
          </div>
          <p style={{ fontSize: '12px', color: '#92400e', margin: 0 }}>
            Akan ganti ke <strong>{planLabel(sub.pending_plan_id)}</strong> mulai {formatDate(sub.pending_change_effective_date)}
          </p>
          <button
            onClick={() => onCancelPending(sub.restaurant_id)}
            disabled={busy}
            style={{
              marginTop: '8px',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              backgroundColor: 'transparent',
              color: '#92400e',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Batalkan
          </button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', fontSize: '12px' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#76777d', margin: 0, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Cycle Start</p>
          <p style={{ color: '#000000', margin: '2px 0 0 0', fontWeight: 600 }}>{formatDateShort(sub.cycle_start_date)}</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#76777d', margin: 0, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.05em' }}>Next Billing</p>
          <p style={{ color: '#000000', margin: '2px 0 0 0', fontWeight: 600 }}>{formatDateShort(sub.next_billing_date)}</p>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {!sub.pending_plan_id && (
          <button
            onClick={() => onChangePlan(sub.restaurant_id, otherPlan)}
            disabled={busy}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>swap_horiz</span>
            Ganti ke {planLabel(otherPlan)}
          </button>
        )}
        <button
          onClick={() => onGenerateInvoice(sub.restaurant_id)}
          disabled={busy}
          style={{
            padding: '10px 12px',
            backgroundColor: '#f4ede6',
            color: '#000000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: busy ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>request_quote</span>
          Invoice
        </button>
      </div>
    </div>
  )
}

// ===== Helpers =====

function planLabel(planId: string): string {
  if (planId === 'flat_monthly') return 'Flat Monthly'
  if (planId === 'pay_per_order') return 'Pay Per Order'
  return planId
}

function planDescription(planId: string): string {
  if (planId === 'flat_monthly') return 'Rp 120.000/bulan · prepaid'
  if (planId === 'pay_per_order') return 'Rp 150/order · postpaid'
  return ''
}

function formatDate(d?: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateShort(d?: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function invoiceStatusBadge(status: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#f4ede6', color: '#45464d', label: 'Draft' },
    issued: { bg: '#fef3c7', color: '#92400e', label: 'Belum Bayar' },
    paid: { bg: '#dcfce7', color: '#166534', label: 'Dibayar' },
    overdue: { bg: '#fee2e2', color: '#991b1b', label: 'Overdue' },
    void: { bg: '#f4ede6', color: '#76777d', label: 'Void' },
  }
  return map[status] || { bg: '#f4ede6', color: '#45464d', label: status }
}

function subStatusBadge(status: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Active' },
    past_due: { bg: '#fee2e2', color: '#991b1b', label: 'Past Due' },
    canceled: { bg: '#f4ede6', color: '#45464d', label: 'Canceled' },
    paused: { bg: '#e0e7ff', color: '#3730a3', label: 'Paused' },
  }
  return map[status] || { bg: '#f4ede6', color: '#45464d', label: status }
}