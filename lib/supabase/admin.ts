import { createClient } from '@supabase/supabase-js'

/**
 * ⚠️ DANGER: Service Role client - BYPASS ALL RLS
 * HANYA boleh dipakai di Server Components / Route Handlers / Server Actions
 * JANGAN PERNAH import ini di Client Components ('use client')
 * 
 * Use cases:
 * - Admin create user baru (signup endpoint admin-only)
 * - Background jobs
 * - Operasi sensitif yang butuh bypass RLS
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}