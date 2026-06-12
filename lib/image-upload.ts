import { createClient } from '@/lib/supabase/client'

const BUCKET_NAME = 'menu-images'
const FINAL_SIZE = 800
const JPEG_QUALITY = 0.82

export type CropArea = {
  x: number
  y: number
  width: number
  height: number
}

export async function cropImage(
  imageSrc: string,
  cropArea: CropArea
): Promise<Blob> {
  console.log('🔵 [cropImage] START', { cropArea })

  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      console.log('🔵 [cropImage] image loaded, size:', img.width, 'x', img.height)

      const canvas = document.createElement('canvas')
      canvas.width = FINAL_SIZE
      canvas.height = FINAL_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas tidak didukung'))
        return
      }

      ctx.drawImage(
        img,
        cropArea.x,
        cropArea.y,
        cropArea.width,
        cropArea.height,
        0,
        0,
        FINAL_SIZE,
        FINAL_SIZE
      )

      console.log('🔵 [cropImage] drew to canvas, converting to blob...')

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.error('🔴 [cropImage] toBlob returned null')
            reject(new Error('Gagal konversi gambar'))
            return
          }
          console.log('🟢 [cropImage] DONE, blob size:', (blob.size / 1024).toFixed(1), 'KB')
          resolve(blob)
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }
    img.onerror = (e) => {
      console.error('🔴 [cropImage] image load failed', e)
      reject(new Error('Gambar tidak valid'))
    }
    img.src = imageSrc
  })
}

export async function uploadCroppedImage(
  blob: Blob,
  restaurantId: string,
  oldImageUrl?: string | null
): Promise<string> {
  console.log('🔵 [upload] START', {
    restaurantId,
    blobSize: (blob.size / 1024).toFixed(1) + ' KB',
    blobType: blob.type,
  })

  const supabase = createClient()

  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const filename = `${timestamp}-${random}.jpg`
  const path = `${restaurantId}/${filename}`

  console.log('🔵 [upload] uploading to path:', path)

  // Add timeout wrapper biar gak stuck selamanya
  const uploadPromise = supabase.storage
    .from(BUCKET_NAME)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '3600',
      upsert: false,
    })

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Upload timeout setelah 20 detik')), 20000)
  )

  const result = await Promise.race([uploadPromise, timeoutPromise])
  const { data, error } = result as Awaited<typeof uploadPromise>

  console.log('🔵 [upload] supabase response:', { data, error })

  if (error) throw new Error(`Upload gagal: ${error.message}`)
  if (!data) throw new Error('Upload gagal: no data')

  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path)

  console.log('🟢 [upload] DONE, public URL:', urlData.publicUrl)

  if (oldImageUrl) {
    console.log('🔵 [upload] deleting old image:', oldImageUrl)
    await deleteMenuImage(oldImageUrl).catch((err) =>
      console.warn('Failed to delete old image:', err)
    )
  }

  return urlData.publicUrl
}

export async function deleteMenuImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return

  const supabase = createClient()

  const match = imageUrl.match(/\/menu-images\/(.+)$/)
  if (!match) return

  const path = match[1]
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path])
  if (error) {
    console.warn('Failed to delete old image:', error.message)
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => resolve(e.target?.result as string)
    reader.onerror = () => reject(new Error('Gagal baca file'))
    reader.readAsDataURL(file)
  })
}

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'File harus berupa gambar (JPG, PNG, dll)' }
  }
  const MAX_SIZE = 5 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return { valid: false, error: 'Ukuran gambar maksimal 5MB' }
  }
  return { valid: true }
}