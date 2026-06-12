import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes (skip semua auth check)
  const publicPaths = [
    '/r/',
    '/api/stock/',
    '/api/payment/',
    '/_next',
    '/favicon.ico',
  ]

  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Root '/' adalah login page (public, tapi auto-redirect kalau udah login)
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Belum login + akses protected → redirect ke '/'
  if (!user) {
    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/cashier')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
    // Path '/' atau lainnya yang public → biarin
    return supabaseResponse
  }

  // Sudah login: cek role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role

  // Block cashier dari /dashboard
  if (pathname.startsWith('/dashboard') && role !== 'owner' && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'cashier' ? '/cashier' : '/'
    return NextResponse.redirect(url)
  }

  // Block non-admin dari /admin
  if (pathname.startsWith('/admin') && role !== 'admin') {
    const url = request.nextUrl.clone()
    url.pathname = role === 'owner' ? '/dashboard' : role === 'cashier' ? '/cashier' : '/'
    return NextResponse.redirect(url)
  }

  // Block selain staff dari /cashier
  if (pathname.startsWith('/cashier') && !['cashier', 'owner', 'admin'].includes(role || '')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}