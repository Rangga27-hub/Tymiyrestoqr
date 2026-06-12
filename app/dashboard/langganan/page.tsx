import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LanggananClient from './langganan-client'

export default async function LanggananPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')
  if (!['owner', 'admin'].includes(profile.role)) redirect('/')

  // Get owner's restaurants (via junction table)
  const { data: ownerRestos } = await supabase
    .from('restaurant_owners')
    .select('restaurant_id, restaurants(id, name, slug)')
    .eq('owner_id', user.id)

  type RestoLite = { id: string; name: string; slug: string }
  const restaurants: RestoLite[] = (ownerRestos || [])
    .map((r: any) => {
      const resto = Array.isArray(r.restaurants) ? r.restaurants[0] : r.restaurants
      return resto ? { id: resto.id, name: resto.name, slug: resto.slug } : null
    })
    .filter((r): r is RestoLite => r !== null)

  if (restaurants.length === 0) {
    return (
      <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '48px', color: '#c6c6cd' }}>
          card_membership
        </span>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#000000', marginTop: '16px' }}>
          Belum ada restoran
        </h2>
        <p style={{ fontSize: '14px', color: '#45464d', marginTop: '8px' }}>
          Hubungi admin untuk daftarkan restoran Anda.
        </p>
      </div>
    )
  }

  const restaurantIds = restaurants.map((r) => r.id)

  // Get subscriptions for all owned restaurants
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .in('restaurant_id', restaurantIds)

  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .in('restaurant_id', restaurantIds)
    .order('created_at', { ascending: false })
    .limit(20)

  // Get current period order counts (untuk hitung perkiraan tagihan Pay Per Order)
  const orderCounts: Record<string, number> = {}
  for (const sub of subscriptions || []) {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('restaurant_id', sub.restaurant_id)
      .eq('status', 'completed')
      .gte('completed_at', sub.cycle_start_date)

    orderCounts[sub.restaurant_id] = count || 0
  }

  return (
    <LanggananClient
      restaurants={restaurants}
      subscriptions={subscriptions || []}
      invoices={invoices || []}
      orderCounts={orderCounts}
    />
  )
}