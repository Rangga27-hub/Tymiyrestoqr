import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StokClient from './stok-client'

export default async function StokPage() {
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

  // Get restaurant info (with TTL setting)
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, reservation_ttl_minutes')
    .eq('id', restaurantId)
    .single()

  // Get categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order')

  // Get menu items
  const { data: items } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  // Get active reservations count per item
  const { data: reservations } = await supabase
    .from('stock_reservations')
    .select('menu_item_id, quantity')
    .gt('expires_at', new Date().toISOString())

  const reservedMap: Record<string, number> = {}
  reservations?.forEach((r) => {
    reservedMap[r.menu_item_id] = (reservedMap[r.menu_item_id] || 0) + r.quantity
  })

  return (
    <StokClient
      restaurant={restaurant!}
      categories={categories || []}
      items={items || []}
      reservedMap={reservedMap}
    />
  )
}