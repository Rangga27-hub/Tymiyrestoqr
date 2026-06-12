import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CustomerMenuClient from './menu-client'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ table?: string }>

export default async function CustomerMenuPage({
  params,
  searchParams,
}: {
  params: Params
  searchParams: SearchParams
}) {
  const { slug } = await params
  const { table } = await searchParams

  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, address, logo_url, reservation_ttl_minutes')
    .eq('slug', slug)
    .single()

  if (!restaurant) return notFound()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('display_order')

  const { data: items } = await supabase
    .from('menu_items')
    .select('id, name, description, price, category_id, image_url, is_available, track_stock, stock_quantity')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  // Get active reservations (for displaying available stock)
  const { data: reservations } = await supabase
    .from('stock_reservations')
    .select('menu_item_id, quantity')
    .gt('expires_at', new Date().toISOString())

  const reservedMap: Record<string, number> = {}
  reservations?.forEach((r) => {
    reservedMap[r.menu_item_id] = (reservedMap[r.menu_item_id] || 0) + r.quantity
  })

  // Validate table
  let tableInfo = null
  if (table) {
    const tableNumber = parseInt(table)
    if (!isNaN(tableNumber)) {
      const { data: t } = await supabase
        .from('restaurant_tables')
        .select('id, table_number, is_active')
        .eq('restaurant_id', restaurant.id)
        .eq('table_number', tableNumber)
        .eq('is_active', true)
        .single()
      if (t) tableInfo = t
    }
  }

  return (
    <CustomerMenuClient
      restaurant={restaurant}
      categories={categories || []}
      items={items || []}
      reservedMap={reservedMap}
      tableInfo={tableInfo}
    />
  )
}