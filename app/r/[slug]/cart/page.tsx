import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CartClient from './cart-client'

type Params = Promise<{ slug: string }>
type SearchParams = Promise<{ table?: string }>

export default async function CartPage({
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
    .select('id, name, slug')
    .eq('slug', slug)
    .single()

  if (!restaurant) return notFound()

  return <CartClient restaurant={restaurant} tableNumber={table || null} />
}