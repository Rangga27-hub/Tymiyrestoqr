import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CashierShell from './cashier-shell'

export default async function CashierLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, role, restaurant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/')

  // Only cashier (and owner/admin) can access
  if (!['cashier', 'owner', 'admin'].includes(profile.role)) {
    redirect('/')
  }

  let restaurantName = 'Belum ada resto'
  if (profile.restaurant_id) {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('name')
      .eq('id', profile.restaurant_id)
      .single()
    
    if (restaurant) restaurantName = restaurant.name
  }

  return (
    <CashierShell
      userName={profile.full_name || 'Kasir'}
      userEmail={profile.email || ''}
      restaurantName={restaurantName}
    >
      {children}
    </CashierShell>
  )
}