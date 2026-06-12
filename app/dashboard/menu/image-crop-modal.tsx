'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { CropArea } from '@/lib/image-upload'

export default function ImageCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string
  onCancel: () => void
  onConfirm: (cropArea: CropArea) => void
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)

  const onCropComplete = useCallback(
    (_croppedArea: any, croppedAreaPixels: CropArea) => {
      setCroppedAreaPixels(croppedAreaPixels)
    },
    []
  )

  function handleConfirm() {
    if (croppedAreaPixels) {
      onConfirm(croppedAreaPixels)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #e8e1db',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#000000', margin: 0 }}>
              Atur Foto
            </h2>
            <p style={{ fontSize: '12px', color: '#76777d', margin: '2px 0 0 0' }}>
              Geser & zoom untuk pas-in ke frame
            </p>
          </div>
          <button
            onClick={onCancel}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#f4ede6',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>

        {/* Crop area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '380px',
            backgroundColor: '#1a1a1a',
          }}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={true}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            style={{
              containerStyle: {
                backgroundColor: '#1a1a1a',
              },
              cropAreaStyle: {
                border: '2px solid #ffffff',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
              },
            }}
          />
        </div>

        {/* Zoom slider */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e8e1db',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#76777d' }}>
            zoom_out
          </span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{
              flex: 1,
              accentColor: '#ae3115',
              cursor: 'pointer',
            }}
          />
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#76777d' }}>
            zoom_in
          </span>
        </div>

        {/* Tips */}
        <div
          style={{
            padding: '8px 24px 16px',
            display: 'flex',
            gap: '6px',
            alignItems: 'center',
            fontSize: '11px',
            color: '#76777d',
            flexWrap: 'wrap',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
            info
          </span>
          <span>
            Drag foto untuk geser · Scroll mouse atau pinch untuk zoom
          </span>
        </div>

        {/* Footer buttons */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid #e8e1db',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: '10px 18px',
              backgroundColor: '#f4ede6',
              color: '#45464d',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Batal
          </button>
          <button
            onClick={handleConfirm}
            disabled={!croppedAreaPixels}
            style={{
              padding: '10px 18px',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: croppedAreaPixels ? 1 : 0.5,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              check
            </span>
            Pakai Foto Ini
          </button>
        </div>
      </div>
    </div>
  )
}