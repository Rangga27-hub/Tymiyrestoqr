import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { menuItemId, anonId, quantity, restaurantId } = body

    if (!menuItemId || !anonId || !quantity || !restaurantId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (quantity < 1) {
      return NextResponse.json({ error: 'Invalid quantity' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Get TTL from restaurant
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('reservation_ttl_minutes')
      .eq('id', restaurantId)
      .single()

    const ttl = restaurant?.reservation_ttl_minutes || 5

    // Call DB function
    const { data, error } = await supabase.rpc('reserve_stock', {
      p_menu_item_id: menuItemId,
      p_anon_id: anonId,
      p_quantity: quantity,
      p_ttl_minutes: ttl,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}