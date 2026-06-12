import { createClient } from '@/lib/supabase/server'
import { formatIDR } from '@/lib/utils'
import Link from 'next/link'

export default async function AdminRestaurantsPage() {
  const supabase = await createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug, address, phone, created_at, owner_id')
    .order('created_at', { ascending: false })

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('restaurant_id, status, current_period_count, next_billing_date')

  const subMap: Record<string, any> = {}
  subscriptions?.forEach((s) => {
    subMap[s.restaurant_id] = s
  })

  // Get owner names
  const ownerIds = restaurants?.map((r) => r.owner_id).filter(Boolean) || []
  const { data: owners } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', ownerIds.length > 0 ? ownerIds : ['none'])

  const ownerMap: Record<string, string> = {}
  owners?.forEach((o) => {
    ownerMap[o.id] = o.full_name || 'Tanpa Nama'
  })

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1100px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', lineHeight: '40px', fontWeight: 600, letterSpacing: '-0.02em', color: '#000000', margin: 0, marginBottom: '8px' }}>
        Restoran
      </h1>
      <p style={{ fontSize: '14px', color: '#45464d', marginBottom: '32px' }}>
        {restaurants?.length || 0} restoran terdaftar di platform
      </p>

      {(!restaurants || restaurants.length === 0) ? (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #c6c6cd', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#76777d' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>storefront</span>
          <p style={{ margin: 0 }}>Belum ada restoran</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {restaurants.map((resto) => {
            const sub = subMap[resto.id]
            const statusColor: Record<string, { bg: string; color: string }> = {
              active: { bg: '#dcfce7', color: '#166534' },
              trial: { bg: '#fef3c7', color: '#92400e' },
              past_due: { bg: '#ffdad6', color: '#991b1b' },
              canceled: { bg: '#f4ede6', color: '#45464d' },
              paused: { bg: '#e0e7ff', color: '#3730a3' },
            }
            const sc = statusColor[sub?.status] || statusColor.trial

            return (
              <div
                key={resto.id}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #c6c6cd',
                  borderRadius: '12px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#000000', margin: 0 }}>
                      {resto.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: '#45464d', margin: '2px 0 0 0', fontFamily: 'var(--font-jetbrains-mono), monospace' }}>
                      /{resto.slug}
                    </p>
                  </div>
                  {sub && (
                    <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '9999px', backgroundColor: sc.bg, color: sc.color, textTransform: 'uppercase' }}>
                      {sub.status}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#45464d' }}>
                  {resto.owner_id && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>person</span>
                      {ownerMap[resto.owner_id] || 'Tanpa Owner'}
                    </div>
                  )}
                  {resto.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                      {resto.address}
                    </div>
                  )}
                  {sub && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event</span>
                      Tagihan berikutnya: {new Date(sub.next_billing_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}