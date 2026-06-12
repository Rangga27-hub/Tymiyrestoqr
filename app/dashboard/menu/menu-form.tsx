'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useRef } from 'react'
import {
  cropImage,
  uploadCroppedImage,
  deleteMenuImage,
  validateImageFile,
  fileToDataUrl,
  type CropArea,
} from '@/lib/image-upload'
import ImageCropModal from './image-crop-modal'

type Category = {
  id: string
  name: string
}

type MenuItem = {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string | null
  is_available: boolean
  image_url: string | null
}

export default function MenuForm({
  restaurantId,
  categories,
  item,
}: {
  restaurantId: string
  categories: Category[]
  item?: MenuItem
}) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(item?.name || '')
  const [description, setDescription] = useState(item?.description || '')
  const [price, setPrice] = useState(item?.price?.toString() || '')
  const [categoryId, setCategoryId] = useState(item?.category_id || '')
  const [isAvailable, setIsAvailable] = useState(item?.is_available ?? true)

  // Image state
  const [imageUrl, setImageUrl] = useState<string | null>(item?.image_url || null)
  const [croppedPreview, setCroppedPreview] = useState<string | null>(null) // Blob URL hasil crop
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null)
  const [imageMarkedForDelete, setImageMarkedForDelete] = useState(false)

  // Crop modal state
  const [showCropModal, setShowCropModal] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)

  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  async function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      setError(validation.error || 'File tidak valid')
      e.target.value = ''
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      setCropImageSrc(dataUrl)
      setShowCropModal(true)
    } catch (err) {
      setError('Gagal membaca foto')
    }

    // Reset file input supaya bisa pick file yang sama lagi
    e.target.value = ''
  }

  async function handleCropConfirm(cropArea: CropArea) {
    if (!cropImageSrc) return

    try {
      // Generate cropped blob
      const blob = await cropImage(cropImageSrc, cropArea)

      // Bersihkan preview lama kalau ada
      if (croppedPreview) {
        URL.revokeObjectURL(croppedPreview)
      }

      // Set preview baru
      const previewUrl = URL.createObjectURL(blob)
      setCroppedPreview(previewUrl)
      setCroppedBlob(blob)
      setImageMarkedForDelete(false)

      // Tutup modal
      setShowCropModal(false)
      setCropImageSrc(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal crop foto')
      setShowCropModal(false)
    }
  }

  function handleCropCancel() {
    setShowCropModal(false)
    setCropImageSrc(null)
  }

  function handleRemoveImage() {
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview)
    }
    setCroppedPreview(null)
    setCroppedBlob(null)
    if (imageUrl) {
      setImageMarkedForDelete(true)
    }
  }

  function handleCancelNewImage() {
    if (croppedPreview) {
      URL.revokeObjectURL(croppedPreview)
    }
    setCroppedPreview(null)
    setCroppedBlob(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      let finalImageUrl: string | null = imageUrl

      if (croppedBlob) {
        // User crop foto baru → upload
        setUploadProgress('Upload foto...')
        finalImageUrl = await uploadCroppedImage(croppedBlob, restaurantId, imageUrl || undefined)
      } else if (imageMarkedForDelete && imageUrl) {
        // User hapus foto existing
        setUploadProgress('Menghapus foto...')
        await deleteMenuImage(imageUrl).catch(() => {})
        finalImageUrl = null
      }

      setUploadProgress('Menyimpan menu...')

      const data = {
        restaurant_id: restaurantId,
        category_id: categoryId || null,
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        is_available: isAvailable,
        image_url: finalImageUrl,
      }

      const result = item
        ? await supabase.from('menu_items').update(data).eq('id', item.id)
        : await supabase.from('menu_items').insert(data)

      if (result.error) {
        throw new Error(result.error.message)
      }

      // Cleanup preview blob URL
      if (croppedPreview) URL.revokeObjectURL(croppedPreview)

      router.push('/dashboard/menu')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      setLoading(false)
      setUploadProgress('')
    }
  }

  // Tentukan foto mana yang ditampilkan
  const displayedImage = croppedPreview || (imageMarkedForDelete ? null : imageUrl)
  const isNewImage = croppedPreview !== null
  const showImageArea = displayedImage !== null

  return (
    <>
      {/* Crop Modal */}
      {showCropModal && cropImageSrc && (
        <ImageCropModal
          imageSrc={cropImageSrc}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}

      <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
        <div className="mb-6">
          <Link
            href="/dashboard/menu"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: '#45464d',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              arrow_back
            </span>
            Kembali ke Menu
          </Link>
          <h1
            style={{
              fontSize: '32px',
              lineHeight: '40px',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: '#000000',
              margin: 0,
            }}
          >
            {item ? 'Edit Menu' : 'Tambah Menu Baru'}
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: '#ffffff',
            padding: '24px',
            borderRadius: '12px',
            border: '1px solid #c6c6cd',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* ===== FOTO MENU ===== */}
          <FormField label="Foto Menu (Opsional)">
            {showImageArea ? (
              <div
                style={{
                  position: 'relative',
                  width: '200px',
                  height: '200px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#f4ede6',
                  border: '1px solid #e8e1db',
                }}
              >
                <img
                  src={displayedImage}
                  alt="Preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />

                {isNewImage && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Baru
                  </div>
                )}

                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    display: 'flex',
                    gap: '4px',
                  }}
                >
                  {isNewImage && (
                    <button
                      type="button"
                      onClick={handleCancelNewImage}
                      title="Batalkan foto baru"
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        color: '#45464d',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        undo
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Ganti foto"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: 'rgba(255,255,255,0.95)',
                      color: '#000000',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      swap_horiz
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Hapus foto"
                    style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#ba1a1a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '200px',
                  height: '200px',
                  backgroundColor: '#faf2eb',
                  border: '2px dashed #c6c6cd',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  color: '#45464d',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f4ede6'
                  e.currentTarget.style.borderColor = '#000000'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#faf2eb'
                  e.currentTarget.style.borderColor = '#c6c6cd'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '32px', color: '#76777d' }}>
                  add_photo_alternate
                </span>
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Pilih foto</span>
                <span style={{ fontSize: '10px', color: '#76777d', textAlign: 'center', padding: '0 8px' }}>
                  JPG, PNG · Max 5MB
                </span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              style={{ display: 'none' }}
            />

            <p
              style={{
                fontSize: '11px',
                color: '#76777d',
                margin: '8px 0 0 0',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                info
              </span>
              Foto akan ditampilkan square di menu customer
            </p>

            {imageMarkedForDelete && !croppedBlob && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderRadius: '8px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  info
                </span>
                <span>
                  Foto akan dihapus saat disimpan.{' '}
                  <button
                    type="button"
                    onClick={() => setImageMarkedForDelete(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#92400e',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: 0,
                      fontWeight: 600,
                    }}
                  >
                    Batalkan
                  </button>
                </span>
              </div>
            )}
          </FormField>

          {/* Name */}
          <FormField label="Nama Menu *">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nasi Goreng Spesial"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#000000')}
              onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
            />
          </FormField>

          {/* Description */}
          <FormField label="Deskripsi">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional - jelaskan menu ini"
              style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
              onFocus={(e) => (e.target.style.borderColor = '#000000')}
              onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
            />
          </FormField>

          {/* Price */}
          <FormField label="Harga (Rp) *">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              step="500"
              placeholder="25000"
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#000000')}
              onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
            />
          </FormField>

          {/* Category */}
          <FormField label="Kategori">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              style={inputStyle}
              onFocus={(e) => (e.target.style.borderColor = '#000000')}
              onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
            >
              <option value="">— Tanpa kategori —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </FormField>

          {/* Availability */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isAvailable}
              onChange={(e) => setIsAvailable(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#ae3115' }}
            />
            <span style={{ fontSize: '14px', color: '#000000' }}>
              Tersedia (tampilkan di menu customer)
            </span>
          </label>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#ffdad6',
                color: '#93000a',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '8px', paddingTop: '16px', alignItems: 'center' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                backgroundColor: '#000000',
                color: '#ffffff',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                fontSize: '14px',
              }}
            >
              {loading ? uploadProgress || 'Menyimpan...' : item ? 'Update Menu' : 'Simpan'}
            </button>
            <Link
              href="/dashboard/menu"
              style={{
                padding: '10px 24px',
                backgroundColor: '#f4ede6',
                color: '#000000',
                borderRadius: '8px',
                fontWeight: 500,
                textDecoration: 'none',
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Batal
            </Link>
          </div>
        </form>
      </div>
    </>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          color: '#45464d',
          marginBottom: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  border: '1px solid #c6c6cd',
  borderRadius: '8px',
  padding: '10px 12px',
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 200ms',
  fontFamily: 'inherit',
  backgroundColor: '#ffffff',
}