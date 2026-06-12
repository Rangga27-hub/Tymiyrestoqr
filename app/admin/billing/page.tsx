import { createClient } from '@/lib/supabase/server'
import BillingClient from './billing-client'

export default async function AdminBillingPage() {
  const supabase = await createClient()

  // Get all subscriptions
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all restaurants
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .order('name')

  // Get all invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const restaurantMap: Record<string, { name: string; slug: string }> = {}
  restaurants?.forEach((r) => {
    restaurantMap[r.id] = { name: r.name, slug: r.slug }
  })

  // Count pending plan changes
  const pendingChangesCount = subscriptions?.filter((s) => s.pending_plan_id !== null).length || 0

  return (
    <BillingClient
      subscriptions={subscriptions || []}
      invoices={invoices || []}
      restaurantMap={restaurantMap}
      pendingChangesCount={pendingChangesCount}
    />
  )
}