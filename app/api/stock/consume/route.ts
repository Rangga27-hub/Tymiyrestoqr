import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { anonId } = body

    if (!anonId) {
      return NextResponse.json({ error: 'Missing anonId' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase.rpc('consume_reservations_for_order', {
      p_anon_id: anonId,
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