'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { getRedirectPathByRole } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', authData.user.id)
      .single()

    if (profileError || !profile) {
      setError('Akun tidak ditemukan. Hubungi admin.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    if (!profile.is_active) {
      setError('Akun kamu dinonaktifkan. Hubungi admin.')
      await supabase.auth.signOut()
      setLoading(false)
      return
    }

    const redirectPath = getRedirectPathByRole(profile.role)
    router.push(redirectPath)
    router.refresh()
  }

  return (
    <main className="flex min-h-screen">
      <section
        className="hidden md:flex md:w-1/2 relative overflow-hidden items-center justify-center p-12"
        style={{ backgroundColor: '#0F172A' }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div
            className="absolute top-0 left-0 w-full h-full"
            style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, #FFFFFF 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-start max-w-lg">
          <div className="mb-6">
            <span className="text-white text-display tracking-tighter">TymiY</span>
            <div className="h-1 w-12 mt-2" style={{ backgroundColor: '#FF6B4A' }} />
          </div>

          <h1 className="text-headline-lg text-white mb-4 leading-tight">
            Sistem pemesanan QR untuk restoran modern
          </h1>
          <p className="text-body-lg text-slate-400">
            Transformasikan pengalaman bersantap dengan efisiensi digital. Kelola pesanan, meja, dan menu dalam satu platform terpadu.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4 w-full">
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <span className="material-symbols-outlined mb-2" style={{ color: '#FF6B4A' }}>
                qr_code_2
              </span>
              <p className="text-white text-label-sm">QR Ordering</p>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm">
              <span className="material-symbols-outlined mb-2" style={{ color: '#FF6B4A' }}>
                dashboard
              </span>
              <p className="text-white text-label-sm">Real-time Analytics</p>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 right-0 w-3/4 h-1/2 opacity-20 transform translate-y-1/4 translate-x-1/4">
          <div
            className="w-full h-full rounded-full blur-3xl"
            style={{ background: 'radial-gradient(circle, #FF6B4A 0%, transparent 70%)' }}
          />
        </div>
      </section>

      <section
        className="w-full md:w-1/2 flex flex-col justify-center items-center px-4 py-12 relative"
        style={{ backgroundColor: '#FAFAF9' }}
      >
        <div className="md:hidden absolute top-12 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-headline-lg-mobile tracking-tighter" style={{ color: '#0F172A' }}>
            TymiY
          </span>
          <div className="h-1 w-8 mt-1" style={{ backgroundColor: '#FF6B4A' }} />
        </div>

        <div className="w-full max-w-sm">
          <div
            className="bg-white p-6 rounded-lg shadow-sm"
            style={{ borderWidth: '1px', borderColor: '#E7E5E4', borderStyle: 'solid' }}
          >
            <div className="mb-6">
              <h2 className="text-headline-md mb-2" style={{ color: '#000000' }}>
                Selamat Datang
              </h2>
              <p className="text-body-md" style={{ color: '#45464d' }}>
                Masuk ke panel manajemen restoran Anda
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="flex flex-col space-y-2">
                <label className="text-label-sm px-1" style={{ color: '#45464d' }} htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@restaurant.com"
                  className="h-[44px] w-full px-4 rounded-lg text-body-md transition-all outline-none"
                  style={{ borderWidth: '1px', borderColor: '#E7E5E4', borderStyle: 'solid' }}
                  onFocus={(e) => (e.target.style.borderColor = '#0F172A')}
                  onBlur={(e) => (e.target.style.borderColor = '#E7E5E4')}
                />
              </div>

              <div className="flex flex-col space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-label-sm" style={{ color: '#45464d' }} htmlFor="password">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-label-sm hover:underline cursor-pointer bg-transparent border-0 p-0"
                    style={{ color: '#ae3115' }}
                    onClick={() => alert('Hubungi admin untuk reset password.')}
                  >
                    Lupa password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-[44px] w-full px-4 rounded-lg text-body-md transition-all outline-none"
                    style={{ borderWidth: '1px', borderColor: '#E7E5E4', borderStyle: 'solid' }}
                    onFocus={(e) => (e.target.style.borderColor = '#0F172A')}
                    onBlur={(e) => (e.target.style.borderColor = '#E7E5E4')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: '#76777d' }}
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="p-3 rounded-lg text-body-md"
                  style={{ backgroundColor: '#ffdad6', color: '#93000a' }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[48px] text-white text-body-lg rounded-lg transition-all active:scale-[0.98] mt-6 shadow-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#FF6B4A' }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#ae3115'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#FF6B4A'
                }}
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTopWidth: '1px', borderColor: '#E7E5E4', borderStyle: 'solid' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-label-mono" style={{ color: '#c6c6cd' }}>
                  Akses Terbatas
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-body-md" style={{ color: '#45464d' }}>
                Belum punya akun? <br />
                <span className="font-medium" style={{ color: '#000000' }}>
                  Hubungi admin atau pemilik restoran.
                </span>
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-center space-x-6">
            <button
              className="text-label-sm transition-colors hover:underline bg-transparent border-0 cursor-pointer"
              style={{ color: '#76777d' }}
            >
              Bantuan
            </button>
            <button
              className="text-label-sm transition-colors hover:underline bg-transparent border-0 cursor-pointer"
              style={{ color: '#76777d' }}
            >
              Syarat & Ketentuan
            </button>
            <button
              className="text-label-sm transition-colors hover:underline bg-transparent border-0 cursor-pointer"
              style={{ color: '#76777d' }}
            >
              Privasi
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}