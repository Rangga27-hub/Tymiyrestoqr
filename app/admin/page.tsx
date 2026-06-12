import { createClient } from '@/lib/supabase/server'
import OverviewClient from './overview_client'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // Count restaurants
  const { count: restaurantCount } = await supabase
    .from('restaurants')
    .select('id', { count: 'exact', head: true })

  // Count users by role
  const { data: profiles } = await supabase
    .from('profiles')
    .select('role')

  const ownerCount = profiles?.filter((p) => p.role === 'owner').length || 0
  const cashierCount = profiles?.filter((p) => p.role === 'cashier').length || 0

  // Count subscriptions
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('status')

  const activeSubsCount = subs?.filter((s) => s.status === 'active').length || 0

  // Get ALL invoices for chart (12 bulan ke belakang)
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)
  twelveMonthsAgo.setHours(0, 0, 0, 0)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('amount, status, issued_at, paid_at, period_start, billing_model_applied')
    .gte('created_at', twelveMonthsAgo.toISOString())
    .order('created_at', { ascending: true })

  // Total revenue (paid)
  const totalRevenuePaid = invoices
    ?.filter((i) => i.status === 'paid')
    .reduce((sum, i) => sum + Number(i.amount), 0) || 0

  // Pending (issued + overdue)
  const totalRevenuePending = invoices
    ?.filter((i) => i.status === 'issued' || i.status === 'overdue')
    .reduce((sum, i) => sum + Number(i.amount), 0) || 0

  return (
    <OverviewClient
      restaurantCount={restaurantCount || 0}
      ownerCount={ownerCount}
      cashierCount={cashierCount}
      activeSubsCount={activeSubsCount}
      totalRevenuePaid={totalRevenuePaid}
      totalRevenuePending={totalRevenuePending}
      invoices={invoices || []}
    />
  )
}