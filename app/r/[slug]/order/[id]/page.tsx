import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import OrderTrackingClient from './tracking-client'

type Params = Promise<{ slug: string; id: string }>

export default async function OrderTrackingPage({ params }: { params: Params }) {
  const { slug, id } = await params
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!restaurant) return notFound()

  const { data: order } = await supabase
    .from('orders')
    .select('*, restaurant_tables(table_number), order_items(*)')
    .eq('id', id)
    .eq('restaurant_id', restaurant.id)
    .single()

  if (!order) return notFound()

  return <OrderTrackingClient restaurant={restaurant} order={order} />
}