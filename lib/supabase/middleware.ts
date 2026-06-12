import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // Public routes - skip auth check
  const isPublicRoute = 
    pathname === '/' ||
    pathname.startsWith('/r/') ||  // Customer menu pages
    pathname.startsWith('/auth/')   // Auth callbacks

  // Protected routes
  const isProtectedRoute = 
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/cashier')

  // Not logged in + accessing protected → redirect to login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Logged in + accessing login page → redirect based on role
  if (user && pathname === '/') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      const url = request.nextUrl.clone()
      switch (profile.role) {
        case 'admin': url.pathname = '/admin'; break
        case 'owner': url.pathname = '/dashboard'; break
        case 'cashier': url.pathname = '/cashier'; break
      }
      return NextResponse.redirect(url)
    }
  }

  // Role-based route protection
  if (user && isProtectedRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_active) {
      // Akun di-deactivate → logout
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Cek role match dengan area
    const url = request.nextUrl.clone()
    if (pathname.startsWith('/admin') && profile.role !== 'admin') {
      url.pathname = profile.role === 'owner' ? '/dashboard' : '/cashier'
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/dashboard') && profile.role !== 'owner') {
      url.pathname = profile.role === 'admin' ? '/admin' : '/cashier'
      return NextResponse.redirect(url)
    }
    if (pathname.startsWith('/cashier') && profile.role !== 'cashier') {
      url.pathname = profile.role === 'admin' ? '/admin' : '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}