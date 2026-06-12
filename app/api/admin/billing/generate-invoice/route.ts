import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const { restaurantId } = body

    const admin = createAdminClient()

    if (restaurantId) {
      // Generate untuk 1 resto
      const { data, error } = await admin.rpc('generate_invoice_for_restaurant', {
        p_restaurant_id: restaurantId,
      })

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json(data)
    }

    // Generate untuk SEMUA resto active
    const { data: subs } = await admin
      .from('subscriptions')
      .select('restaurant_id')
      .eq('status', 'active')

    if (!subs || subs.length === 0) {
      return NextResponse.json({ success: true, message: 'No active subscriptions', count: 0 })
    }

    const results = []
    let successCount = 0
    let failCount = 0

    for (const sub of subs) {
      const { data, error } = await admin.rpc('generate_invoice_for_restaurant', {
        p_restaurant_id: sub.restaurant_id,
      })

      if (error) {
        failCount++
        results.push({ restaurantId: sub.restaurant_id, success: false, error: error.message })
      } else if (data?.success) {
        successCount++
        results.push({ restaurantId: sub.restaurant_id, success: true, amount: data.amount })
      } else {
        failCount++
        results.push({ restaurantId: sub.restaurant_id, success: false })
      }
    }

    return NextResponse.json({
      success: true,
      count: subs.length,
      successCount,
      failCount,
      results,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}