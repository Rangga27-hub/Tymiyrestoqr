'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SessionExpiredModal() {
  const router = useRouter()
  const supabase = createClient()
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user.email) {
          localStorage.setItem('tymiy_last_email', session.user.email)
          setEmail(session.user.email)
          setShow(false)
        }
        // Session expired or signed out unexpectedly
        if (event === 'TOKEN_REFRESHED' && !session) {
          await showModal()
        }
        if (event === 'SIGNED_OUT' && window.location.pathname !== '/') {
          await showModal()
        }
      }
    )

    // Periodic check: every 30 seconds, verify session
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session && window.location.pathname !== '/') {
        await showModal()
      }
    }, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function showModal() {
    // Get last known email for display
    const cachedEmail = localStorage.getItem('tymiy_last_email')
    if (cachedEmail) {
      setEmail(cachedEmail)
    }
    setShow(true)
  }

  async function handleReauth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        setError(signInError.code === 'invalid_credentials'
          ? 'Email atau kata sandi tidak sesuai. Periksa kembali keduanya.'
          : `Gagal masuk: ${signInError.message}`)
        return
      }

      localStorage.setItem('tymiy_last_email', data.user?.email || email.trim())
      setShow(false)
      setPassword('')
      router.refresh()
    } catch {
      setError('Tidak dapat terhubung. Periksa koneksi internet lalu coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    localStorage.removeItem('tymiy_last_email')
    router.push('/')
  }

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      style={{
        backgroundColor: 'rgba(51, 48, 44, 0.4)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-xl shadow-sm overflow-hidden"
        style={{
          backgroundColor: '#ffffff',
          borderWidth: '1px',
          borderColor: '#c6c6cd',
          borderStyle: 'solid',
        }}
      >
        <div className="p-12 space-y-6">
          {/* Icon + Title */}
          <div className="text-center space-y-2">
            <div
              className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: '#eee7e0' }}
            >
              <span
                className="material-symbols-outlined text-3xl"
                style={{
                  color: '#ae3115',
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                lock_person
              </span>
            </div>
            <h2 className="text-headline-lg" style={{ color: '#000000' }}>
              Sesi Kamu Berakhir
            </h2>
            <p className="text-body-md" style={{ color: '#45464d' }}>
              Untuk keamanan, kami perlu verifikasi ulang identitasmu sebelum melanjutkan akses ke dashboard.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleReauth} className="space-y-4">
            {/* Editable fallback for sessions created before email caching */}
            <div className="space-y-1">
              <label
                className="text-label-sm px-1"
                style={{ color: '#45464d' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="Masukkan email akun"
                className="w-full h-10 px-4 rounded-lg text-body-md"
                style={{
                  backgroundColor: '#faf2eb',
                  borderWidth: '1px',
                  borderColor: '#c6c6cd',
                  borderStyle: 'solid',
                  color: '#45464d',
                }}
              />
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label
                className="text-label-sm px-1"
                style={{ color: '#45464d' }}
              >
                Kata Sandi
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Masukkan kata sandi"
                className="w-full h-10 px-4 rounded-lg outline-none text-body-md transition-all"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: '1px',
                  borderColor: '#c6c6cd',
                  borderStyle: 'solid',
                }}
                onFocus={(e) => (e.target.style.borderColor = '#000000')}
                onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="p-3 rounded-lg text-body-md"
                style={{ backgroundColor: '#ffdad6', color: '#93000a' }}
              >
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="space-y-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-white rounded-lg font-bold active:scale-[0.98] transition-all disabled:opacity-60"
                style={{ backgroundColor: '#ae3115' }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.filter = 'brightness(1.1)'
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.filter = 'brightness(1)'
                }}
              >
                {loading ? 'Memproses...' : 'Masuk Kembali'}
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full h-10 bg-transparent rounded-lg font-medium transition-colors flex items-center justify-center gap-2 hover:bg-red-50"
                style={{ color: '#ba1a1a' }}
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}