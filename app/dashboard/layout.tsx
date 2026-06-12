import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .single()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, slug')
    .eq('owner_id', user.id)
    .single()

  return (
    <DashboardShell
      userName={profile?.full_name || 'Owner'}
      userEmail={profile?.email || ''}
      restaurantName={restaurant?.name || 'Belum ada resto'}
      restaurantSlug={restaurant?.slug}
    >
      {children}
    </DashboardShell>
  )
}