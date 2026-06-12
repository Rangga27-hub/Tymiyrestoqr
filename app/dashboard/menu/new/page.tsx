import { createClient } from '@/lib/supabase/server'
import MenuForm from '../menu-form'

export default async function NewMenuPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant!.id)
    .order('display_order')

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Tambah Menu Baru</h1>
      <MenuForm 
        restaurantId={restaurant!.id} 
        categories={categories || []} 
      />
    </div>
  )
}