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

    const body = await req.json()
    const { restaurantId, newPlanId, action } = body

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'cancel') {
      const { data, error } = await admin.rpc('cancel_pending_plan_change', {
        p_restaurant_id: restaurantId,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    if (action === 'apply_all') {
      const { data, error } = await admin.rpc('apply_pending_plan_changes')
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json(data)
    }

    if (!newPlanId || !['flat_monthly', 'pay_per_order'].includes(newPlanId)) {
      return NextResponse.json({ error: 'newPlanId invalid' }, { status: 400 })
    }

    const { data, error } = await admin.rpc('request_plan_change', {
      p_restaurant_id: restaurantId,
      p_new_plan_id: newPlanId,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}