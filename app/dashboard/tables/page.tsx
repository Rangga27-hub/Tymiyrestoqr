import { createClient } from '@/lib/supabase/server'
import TablesClient from './tables-client'

export default async function TablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, slug')
    .eq('owner_id', user!.id)
    .single()

  if (!restaurant) {
    return <div className="p-6">Belum ada restoran. Hubungi admin.</div>
  }

  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .order('table_number')

  const totalTables = tables?.length || 0
  const activeTables = tables?.filter((t) => t.is_active).length || 0
  const inactiveTables = totalTables - activeTables

  // Build base URL for QR (customer menu URL)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  return (
    <TablesClient
      restaurantId={restaurant.id}
      restaurantSlug={restaurant.slug}
      baseUrl={baseUrl}
      tables={tables || []}
      stats={{
        total: totalTables,
        active: activeTables,
        inactive: inactiveTables,
      }}
    />
  )
}