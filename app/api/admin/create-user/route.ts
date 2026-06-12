import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: admin only' }, { status: 403 })
    }

    const body = await req.json()
    const {
      email,
      password,
      fullName,
      role,
      restaurantId,
      ownerMode,
      newRestaurant,
      existingRestaurantIds,
      planId,
    } = body

    if (!email || !password || !fullName || !role) {
      return NextResponse.json({ error: 'Field tidak lengkap' }, { status: 400 })
    }

    if (!['owner', 'cashier', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Role tidak valid' }, { status: 400 })
    }

    if (role === 'cashier' && !restaurantId) {
      return NextResponse.json({ error: 'Kasir wajib punya restoran' }, { status: 400 })
    }

    if (role === 'owner') {
      if (ownerMode === 'new') {
        if (!newRestaurant?.name || !newRestaurant?.slug) {
          return NextResponse.json({ error: 'Nama & slug restoran wajib diisi' }, { status: 400 })
        }
        if (!planId || !['flat_monthly', 'pay_per_order'].includes(planId)) {
          return NextResponse.json({ error: 'Plan tidak valid' }, { status: 400 })
        }
      } else if (ownerMode === 'existing') {
        if (!existingRestaurantIds || existingRestaurantIds.length === 0) {
          return NextResponse.json({ error: 'Pilih minimal 1 restoran' }, { status: 400 })
        }
      } else {
        return NextResponse.json({ error: 'Mode owner tidak valid' }, { status: 400 })
      }
    }

    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError || !authData.user) {
      return NextResponse.json({ error: authError?.message || 'Gagal membuat user' }, { status: 500 })
    }

    const newUserId = authData.user.id

    const { error: profileError } = await admin
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        full_name: fullName,
        role,
        restaurant_id: role === 'cashier' ? restaurantId : null,
      })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUserId)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (role === 'owner') {
      if (ownerMode === 'new') {
        const { data: existingSlug } = await admin
          .from('restaurants')
          .select('id')
          .eq('slug', newRestaurant.slug)
          .maybeSingle()

        if (existingSlug) {
          await admin.auth.admin.deleteUser(newUserId)
          return NextResponse.json({ error: 'Slug restoran sudah dipakai. Ganti slug lain.' }, { status: 400 })
        }

        const { data: newResto, error: restoError } = await admin
          .from('restaurants')
          .insert({
            name: newRestaurant.name,
            slug: newRestaurant.slug,
            address: newRestaurant.address || null,
            owner_id: newUserId,
          })
          .select()
          .single()

        if (restoError || !newResto) {
          await admin.auth.admin.deleteUser(newUserId)
          return NextResponse.json({ error: restoError?.message || 'Gagal membuat restoran' }, { status: 500 })
        }

        // Update subscription plan (trigger auto-created with default 'pay_per_order')
        // Kalau admin pilih flat_monthly, kita override
        if (planId === 'flat_monthly') {
          const { error: subError } = await admin
            .from('subscriptions')
            .update({ plan_id: 'flat_monthly' })
            .eq('restaurant_id', newResto.id)

          if (subError) {
            console.error('Failed to update subscription plan:', subError)
            // Non-fatal: resto sudah dibuat, subscription default tetap pay_per_order
          }
        }

        // Link in junction table
        await admin.from('restaurant_owners').insert({
          restaurant_id: newResto.id,
          owner_id: newUserId,
        })
      } else {
        const links = existingRestaurantIds.map((rid: string) => ({
          restaurant_id: rid,
          owner_id: newUserId,
        }))

        const { error: linkError } = await admin
          .from('restaurant_owners')
          .insert(links)

        if (linkError) {
          await admin.auth.admin.deleteUser(newUserId)
          return NextResponse.json({ error: linkError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ success: true, userId: newUserId })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}