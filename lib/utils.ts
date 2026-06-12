// ============================================
// Utility functions
// ============================================

// Format harga ke Rupiah (Rp 25.000)
export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format tanggal ke locale Indonesia
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format waktu saja (untuk live order screen)
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Time ago: "5 menit lalu", "1 jam lalu"
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  
  if (seconds < 60) return `${seconds} detik lalu`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} menit lalu`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} jam lalu`
  return `${Math.floor(seconds / 86400)} hari lalu`
}

// Get redirect path berdasarkan role
export function getRedirectPathByRole(role: string): string {
  switch (role) {
    case 'admin': return '/admin'
    case 'owner': return '/dashboard'
    case 'cashier': return '/cashier'
    default: return '/'
  }
}

// Slugify text (untuk slug resto)
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}