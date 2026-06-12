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
    const { invoiceId, status } = body

    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 })
    }

    if (!['paid', 'overdue', 'void', 'issued'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const admin = createAdminClient()

    const updateData: any = { status }
    if (status === 'paid') {
      updateData.paid_at = new Date().toISOString()
    } else {
      updateData.paid_at = null
    }

    const { error } = await admin
      .from('invoices')
      .update(updateData)
      .eq('id', invoiceId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}