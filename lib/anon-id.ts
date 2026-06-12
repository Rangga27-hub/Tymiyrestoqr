const ANON_ID_KEY = 'tymiy_anon_id'

export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return ''

  let id = localStorage.getItem(ANON_ID_KEY)
  if (!id) {
    id = generateUUID()
    localStorage.setItem(ANON_ID_KEY, id)
  }
  return id
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function clearAnonId() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(ANON_ID_KEY)
}