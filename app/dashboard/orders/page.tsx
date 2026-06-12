import { createClient } from '@/lib/supabase/server'
import OrdersClient from './orders-client'

type SearchParams = Promise<{
  status?: string
  q?: string
  page?: string
}>

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user!.id)
    .single()

  if (!restaurant) {
    return (
      <div className="p-6">
        <p>Belum ada restoran. Hubungi admin.</p>
      </div>
    )
  }

  let query = supabase
    .from('orders')
    .select(
      '*, restaurant_tables(table_number), order_items(id, item_name, quantity, subtotal)',
      { count: 'exact' }
    )
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }

  if (params.q) {
    const search = params.q.trim()
    if (search.startsWith('#TY-')) {
      const num = parseInt(search.replace('#TY-', ''))
      if (!isNaN(num)) {
        query = query.eq('order_number', num)
      }
    } else {
      query = query.ilike('customer_name', `%${search}%`)
    }
  }

  const PAGE_SIZE = 10
  const currentPage = Math.max(1, parseInt(params.page || '1'))
  const offset = (currentPage - 1) * PAGE_SIZE

  query = query.range(offset, offset + PAGE_SIZE - 1)

  const { data: orders, count } = await query

  const { count: activeCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('restaurant_id', restaurant.id)
    .in('status', ['pending', 'preparing'])

  const totalPages = Math.ceil((count || 0) / PAGE_SIZE)

  return (
    <OrdersClient
      orders={orders || []}
      totalCount={count || 0}
      activeCount={activeCount || 0}
      currentPage={currentPage}
      totalPages={totalPages}
      currentStatus={params.status || 'all'}
      currentSearch={params.q || ''}
    />
  )
}