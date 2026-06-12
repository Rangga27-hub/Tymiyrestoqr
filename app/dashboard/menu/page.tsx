import { createClient } from '@/lib/supabase/server'
import MenuClient from './menu-client'

type SearchParams = Promise<{ category?: string; q?: string }>

export default async function MenuPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  if (!restaurant) {
    return <div className="p-6">Belum ada restoran. Hubungi admin.</div>
  }

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('display_order')

  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  if (params.category && params.category !== 'all') {
    query = query.eq('category_id', params.category)
  }

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`)
  }

  const { data: items } = await query

  const { data: allItems } = await supabase
    .from('menu_items')
    .select('category_id')
    .eq('restaurant_id', restaurant.id)

  const categoryCounts: Record<string, number> = {}
  allItems?.forEach((item) => {
    if (item.category_id) {
      categoryCounts[item.category_id] = (categoryCounts[item.category_id] || 0) + 1
    }
  })

  return (
    <MenuClient
      restaurantId={restaurant.id}
      items={items || []}
      categories={categories || []}
      categoryCounts={categoryCounts}
      totalItems={allItems?.length || 0}
      currentCategory={params.category || 'all'}
    />
  )
}