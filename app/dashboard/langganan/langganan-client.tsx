'use client'

import { useState } from 'react'
import { formatIDR } from '@/lib/utils'

type Restaurant = { id: string; name: string; slug: string }

type Subscription = {
  id: string
  restaurant_id: string
  plan_id: string
  status: string
  cycle_start_date: string
  next_billing_date: string
  pending_plan_id: string | null
  pending_change_effective_date: string | null
}

type Invoice = {
  id: string
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

const FLAT_PRICE = 120000
const PER_ORDER_PRICE = 150

export default function LanggananClient({
  restaurants,
  subscriptions,
  invoices,
  orderCounts,
}: {
  restaurants: Restaurant[]
  subscriptions: Subscription[]
  invoices: Invoice[]
  orderCounts: Record<string, number>
}) {
  // Multi-resto support: kalau owner punya banyak resto, kasih tab buat pilih
  const [activeRestoId, setActiveRestoId] = useState<string>(restaurants[0]?.id || '')

  const activeResto = restaurants.find((r) => r.id === activeRestoId)
  const activeSub = subscriptions.find((s) => s.restaurant_id === activeRestoId)
  const activeInvoices = invoices.filter((i) => i.restaurant_id === activeRestoId)
  const activeOrderCount = orderCounts[activeRestoId] || 0

  // Hitung estimasi tagihan bulan ini
  let estimatedBill = 0
  if (activeSub) {
    if (activeSub.plan_id === 'flat_monthly') {
      estimatedBill = FLAT_PRICE
    } else {
      estimatedBill = activeOrderCount * PER_ORDER_PRICE
    }
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Header */}
      <h1 style={{ fontSize: '32px', lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000', margin: 0, marginBottom: '8px' }}>
        Langganan
      </h1>
      <p style={{ fontSize: '14px', color: '#45464d', marginBottom: '24px' }}>
        Lihat detail plan & history tagihan TymiY
      </p>

      {/* Multi-resto tabs (kalau owner punya > 1 resto) */}
      {restaurants.length > 1 && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', overflowX: 'auto', borderBottom: '1px solid #e8e1db', paddingBottom: '0' }}>
          {restaurants.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRestoId(r.id)}
              style={{
                padding: '10px 16px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeRestoId === r.id ? '2px solid #000000' : '2px solid transparent',
                color: activeRestoId === r.id ? '#000000' : '#76777d',
                fontWeight: activeRestoId === r.id ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      {!activeSub ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#76777d' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px', color: '#c6c6cd' }}>
            card_membership
          </span>
          <p style={{ margin: 0 }}>Belum ada subscription untuk {activeResto?.name}</p>
        </div>
      ) : (
        <>
          {/* Pending Change Banner */}
          {activeSub.pending_plan_id && (
            <div
              style={{
                backgroundColor: '#fef3c7',
                border: '1px solid #f59e0b',
                borderRadius: '12px',
                padding: '14px 18px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <span className="material-symbols-outlined" style={{ color: '#92400e', fontSize: '22px', flexShrink: 0, marginTop: '2px' }}>
                schedule
              </span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', margin: 0 }}>
                  Plan akan berubah ke {planLabel(activeSub.pending_plan_id)}
                </p>
                <p style={{ fontSize: '13px', color: '#92400e', margin: '4px 0 0 0' }}>
                  Berlaku mulai {formatDate(activeSub.pending_change_effective_date)}. Kalau mau membatalkan, hubungi admin TymiY.
                </p>
              </div>
            </div>
          )}

          {/* Main Plan Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #c6c6cd',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '11px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                  Plan Saat Ini
                </p>
                <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#000000', margin: '6px 0 0 0', letterSpacing: '-0.02em' }}>
                  {planLabel(activeSub.plan_id)}
                </h2>
                <p style={{ fontSize: '13px', color: '#45464d', margin: '4px 0 0 0' }}>
                  {planDescription(activeSub.plan_id)}
                </p>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  backgroundColor: subStatusBadge(activeSub.status).bg,
                  color: subStatusBadge(activeSub.status).color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {subStatusBadge(activeSub.status).label}
              </span>
            </div>

            {/* Plan stats grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanStat
                label="Periode Berjalan"
                value={`${formatDateShort(activeSub.cycle_start_date)} – ${formatDateShort(activeSub.next_billing_date)}`}
                icon="event"
              />
              <PlanStat
                label="Order Selesai"
                value={String(activeOrderCount)}
                sub={activeSub.plan_id === 'pay_per_order' ? 'periode berjalan' : 'periode berjalan (tidak ditagih per order)'}
                icon="receipt_long"
              />
              <PlanStat
                label={activeSub.plan_id === 'flat_monthly' ? 'Tagihan Bulan Ini' : 'Estimasi Tagihan'}
                value={formatIDR(estimatedBill)}
                sub={
                  activeSub.plan_id === 'flat_monthly'
                    ? 'Sudah ditagih di awal periode'
                    : `${activeOrderCount} × Rp ${PER_ORDER_PRICE}`
                }
                icon="payments"
                highlight
              />
            </div>
          </div>

          {/* Info card */}
          <div
            style={{
              backgroundColor: '#e0f2fe',
              border: '1px solid #7dd3fc',
              borderRadius: '12px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
            }}
          >
            <span className="material-symbols-outlined" style={{ color: '#0369a1', fontSize: '20px', flexShrink: 0, marginTop: '2px' }}>
              info
            </span>
            <div style={{ fontSize: '13px', color: '#0c4a6e', lineHeight: '1.6' }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Mau ganti plan atau ada pertanyaan?</p>
              <p style={{ margin: '4px 0 0 0' }}>
                Hubungi admin TymiY langsung untuk request perubahan plan, pertanyaan tagihan, atau kebutuhan lainnya. Perubahan plan akan berlaku mulai awal bulan berikutnya.
              </p>
            </div>
          </div>

          {/* Invoice History */}
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: '0 0 12px 0' }}>
            Riwayat Tagihan
          </h3>

          {activeInvoices.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', padding: '40px', textAlign: 'center', color: '#76777d' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '40px', marginBottom: '8px', color: '#c6c6cd' }}>receipt_long</span>
              <p style={{ margin: 0, fontSize: '13px' }}>Belum ada tagihan</p>
            </div>
          ) : (
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', overflow: 'hidden' }}>
              {activeInvoices.map((inv, idx) => (
                <InvoiceRow key={inv.id} invoice={inv} isLast={idx === activeInvoices.length - 1} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ===== Components =====

function PlanStat({
  label,
  value,
  sub,
  icon,
  highlight,
}: {
  label: string
  value: string
  sub?: string
  icon: string
  highlight?: boolean
}) {
  return (
    <div
      style={{
        backgroundColor: highlight ? '#faf2eb' : '#fafafa',
        border: highlight ? '1px solid #c6c6cd' : '1px solid #e8e1db',
        borderRadius: '10px',
        padding: '16px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '16px', color: highlight ? '#ae3115' : '#45464d' }}>
          {icon}
        </span>
        <span style={{ fontSize: '11px', color: '#45464d', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
          {label}
        </span>
      </div>
      <p style={{ fontSize: highlight ? '20px' : '16px', fontWeight: 700, color: '#000000', margin: 0, fontFamily: highlight ? 'var(--font-jetbrains-mono), monospace' : 'inherit' }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '11px', color: '#76777d', margin: '4px 0 0 0' }}>
          {sub}
        </p>
      )}
    </div>
  )
}

function InvoiceRow({ invoice, isLast }: { invoice: Invoice; isLast: boolean }) {
  const badge = invoiceStatusBadge(invoice.status)

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
        <p style={{ fontSize: '11px', color: '#76777d', margin: '2px 0 0 0' }}>
          {formatDateShort(invoice.period_start)} – {formatDateShort(invoice.period_end)}
        </p>
      </div>

      <div style={{ flex: '0 0 130px' }}>
        <p style={{ fontSize: '10px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plan</p>
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
        <p style={{ fontSize: '10px', color: '#76777d', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Jumlah</p>
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
          backgroundColor: badge.bg,
          color: badge.color,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          flexShrink: 0,
        }}
      >
        {badge.label}
      </span>
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
  if (planId === 'flat_monthly') return 'Rp 120.000 per bulan · ditagih di awal periode'
  if (planId === 'pay_per_order') return 'Rp 150 per order selesai · ditagih di akhir periode'
  return ''
}

function formatDate(d?: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(d?: string | null): string {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function invoiceStatusBadge(status: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    draft: { bg: '#f4ede6', color: '#45464d', label: 'Draft' },
    issued: { bg: '#fef3c7', color: '#92400e', label: 'Belum Bayar' },
    paid: { bg: '#dcfce7', color: '#166534', label: 'Lunas' },
    overdue: { bg: '#fee2e2', color: '#991b1b', label: 'Overdue' },
    void: { bg: '#f4ede6', color: '#76777d', label: 'Void' },
  }
  return map[status] || { bg: '#f4ede6', color: '#45464d', label: status }
}

function subStatusBadge(status: string): { bg: string; color: string; label: string } {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#dcfce7', color: '#166534', label: 'Aktif' },
    past_due: { bg: '#fee2e2', color: '#991b1b', label: 'Past Due' },
    canceled: { bg: '#f4ede6', color: '#45464d', label: 'Berhenti' },
    paused: { bg: '#e0e7ff', color: '#3730a3', label: 'Paused' },
  }
  return map[status] || { bg: '#f4ede6', color: '#45464d', label: status }
}