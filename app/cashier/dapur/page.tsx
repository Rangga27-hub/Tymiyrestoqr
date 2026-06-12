import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DapurClient from './dapur-client'

export default async function DapurPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  // Get restaurant_id
  let restaurantId: string | null = profile.restaurant_id
  if (profile.role === 'owner') {
    const { data: ownedRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    restaurantId = ownedRestaurant?.id || null
  }

  if (!restaurantId) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#45464d' }}>
        Tidak ada restoran terkait. Hubungi admin.
      </div>
    )
  }

  // Get active orders (pending + preparing) + completed today
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: orders } = await supabase
    .from('orders')
    .select(
      `id, order_number, customer_name, notes, total, status, created_at, completed_at,
       restaurant_tables(table_number),
       order_items(id, item_name, quantity, subtotal, price_at_order)`
    )
    .eq('restaurant_id', restaurantId)
    .or(`status.in.(pending,preparing),and(status.eq.completed,completed_at.gte.${todayStart.toISOString()})`)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <DapurClient
      restaurantId={restaurantId}
      initialOrders={orders || []}
    />
  )
}