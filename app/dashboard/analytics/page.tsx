import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsClient from './analytics-client'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days } = await searchParams
  const period = parseInt(days || '7')
  const validPeriod = [7, 15, 30].includes(period) ? period : 7

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['owner', 'admin'].includes(profile.role)) redirect('/')

  let restaurantId: string | null = profile.restaurant_id
  if (profile.role === 'owner') {
    const { data: ownedResto } = await supabase
      .from('restaurants')
      .select('id')
      .eq('owner_id', user.id)
      .single()
    restaurantId = ownedResto?.id || null
  }

  if (!restaurantId) {
    return (
      <div style={{ padding: '32px 24px', textAlign: 'center', color: '#45464d' }}>
        Tidak ada restoran terkait.
      </div>
    )
  }

  // Date range
  const endDate = new Date()
  endDate.setHours(23, 59, 59, 999)
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (validPeriod - 1))
  startDate.setHours(0, 0, 0, 0)

  // Fetch completed orders + their items in period
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total, created_at, completed_at, status, order_items(menu_item_id, item_name, quantity, subtotal)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString())
    .order('completed_at', { ascending: true })

  // Fetch categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('id, name, display_order')
    .eq('restaurant_id', restaurantId)
    .order('display_order')

  // Fetch all menu items (current state, untuk menampilkan menu yang ada walau gak laku)
  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, price, category_id')
    .eq('restaurant_id', restaurantId)
    .order('name')

  return (
    <AnalyticsClient
      period={validPeriod}
      orders={orders || []}
      categories={categories || []}
      items={items || []}
      startDate={startDate.toISOString()}
      endDate={endDate.toISOString()}
    />
  )
}