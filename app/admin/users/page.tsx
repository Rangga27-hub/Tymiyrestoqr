import { createClient } from '@/lib/supabase/server'
import UsersClient from './users-client'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, restaurant_id, created_at')
    .order('created_at', { ascending: false })

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .order('name')

  const restaurantMap: Record<string, string> = {}
  restaurants?.forEach((r) => {
    restaurantMap[r.id] = r.name
  })

  return (
    <UsersClient
      profiles={profiles || []}
      restaurants={restaurants || []}
      restaurantMap={restaurantMap}
    />
  )
}