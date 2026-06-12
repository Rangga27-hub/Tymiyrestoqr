import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import MenuForm from '../menu-form'

export default async function EditMenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  const { data: item } = await supabase
    .from('menu_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant!.id)
    .order('display_order')

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6">Edit Menu</h1>
      <MenuForm 
        restaurantId={restaurant!.id}
        categories={categories || []}
        item={item}
      />
    </div>
  )
}