import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CategoriesClient from './categories-client'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  // Get owner's restaurant
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

  // Get categories
  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order')

  // Get all menu items
  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, price, category_id, image_url, is_available')
    .eq('restaurant_id', restaurantId)
    .order('name')

  return (
    <CategoriesClient
      restaurantId={restaurantId}
      categories={categories || []}
      items={items || []}
    />
  )
}