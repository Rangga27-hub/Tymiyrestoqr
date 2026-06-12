'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

type TableRow = {
  id: string
  restaurant_id: string
  table_number: number
  is_active: boolean
  qr_code_url: string | null
}

export default function TablesClient({
  restaurantId,
  restaurantSlug,
  baseUrl,
  tables,
  stats,
}: {
  restaurantId: string
  restaurantSlug: string
  baseUrl: string
  tables: TableRow[]
  stats: { total: number; active: number; inactive: number }
}) {
  const router = useRouter()
  const supabase = createClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  function buildQrUrl(tableNumber: number) {
    return `${baseUrl}/r/${restaurantSlug}?table=${tableNumber}`
  }

  async function addTable() {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) + 1 : 1
    const { error } = await supabase
      .from('restaurant_tables')
      .insert({
        restaurant_id: restaurantId,
        table_number: nextNumber,
        qr_code_url: buildQrUrl(nextNumber),
        is_active: true,
      })
    if (error) alert('Error: ' + error.message)
    else router.refresh()
  }

  async function toggleActive(table: TableRow) {
    await supabase
      .from('restaurant_tables')
      .update({ is_active: !table.is_active })
      .eq('id', table.id)
    setOpenMenuId(null)
    router.refresh()
  }

  async function deleteTable(table: TableRow) {
    if (!confirm(`Hapus Meja ${String(table.table_number).padStart(2, '0')}?`)) return
    await supabase.from('restaurant_tables').delete().eq('id', table.id)
    setOpenMenuId(null)
    router.refresh()
  }

  const filteredTables = tables.filter((t) =>
    `meja ${t.table_number}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div style={{ padding: '24px 24px 100px 24px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
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
            Meja & QR Code
          </h1>
          <p style={{ fontSize: '16px', lineHeight: '24px', color: '#45464d', marginTop: '4px', margin: 0 }}>
            Kelola meja dan buat QR untuk akses pemesanan instan
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <span
              className="material-symbols-outlined"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#76777d',
                fontSize: '20px',
              }}
            >
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari meja..."
              style={{
                height: '40px',
                paddingLeft: '40px',
                paddingRight: '16px',
                width: '200px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '12px',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#000000')}
              onBlur={(e) => (e.target.style.borderColor = '#c6c6cd')}
            />
          </div>

          <button
            onClick={addTable}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '0 24px',
              height: '40px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              add
            </span>
            Tambah Meja
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Meja" value={stats.total} dotColor="#94a3b8" textColor="#000000" />
        <StatCard label="Aktif" value={stats.active} dotColor="#16a34a" textColor="#15803d" />
        <StatCard label="Tidak Aktif" value={stats.inactive} dotColor="#f59e0b" textColor="#b45309" />
      </div>

      {/* Grid */}
      {filteredTables.length === 0 && tables.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #c6c6cd',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            color: '#76777d',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '48px', marginBottom: '12px' }}>
            table_restaurant
          </span>
          <p style={{ marginBottom: '12px' }}>Belum ada meja</p>
          <button
            onClick={addTable}
            style={{
              backgroundColor: '#000000',
              color: '#ffffff',
              padding: '10px 24px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            + Tambah Meja Pertama
          </button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#76777d' }}>
          Tidak ada meja yang cocok dengan pencarian
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: '16px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          }}
        >
          {filteredTables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              qrUrl={buildQrUrl(table.table_number)}
              isMenuOpen={openMenuId === table.id}
              onMenuToggle={() => setOpenMenuId(openMenuId === table.id ? null : table.id)}
              onToggleActive={() => toggleActive(table)}
              onDelete={() => deleteTable(table)}
            />
          ))}
        </div>
      )}

      <BulkActionBar tables={filteredTables} restaurantSlug={restaurantSlug} baseUrl={baseUrl} />
    </div>
  )
}

// === Components ===

function StatCard({
  label,
  value,
  dotColor,
  textColor,
}: {
  label: string
  value: number
  dotColor: string
  textColor: string
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        padding: '24px',
        borderRadius: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span
        style={{
          fontSize: '12px',
          fontWeight: 500,
          color: '#45464d',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '9999px', backgroundColor: dotColor }} />
        {label}
      </span>
      <span
        style={{
          fontSize: '32px',
          lineHeight: '40px',
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: textColor,
        }}
      >
        {String(value).padStart(2, '0')}
      </span>
    </div>
  )
}

function TableCard({
  table,
  qrUrl,
  isMenuOpen,
  onMenuToggle,
  onToggleActive,
  onDelete,
}: {
  table: TableRow
  qrUrl: string
  isMenuOpen: boolean
  onMenuToggle: () => void
  onToggleActive: () => void
  onDelete: () => void
}) {
  const qrRef = useRef<SVGSVGElement>(null)

  function downloadPNG() {
    const svg = qrRef.current
    if (!svg) return

    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 600
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 0, 0, size, size)

      const link = document.createElement('a')
      link.download = `qr-meja-${String(table.table_number).padStart(2, '0')}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  function copyUrl() {
    navigator.clipboard.writeText(qrUrl)
    alert('Link QR berhasil disalin!')
  }

  const isActive = table.is_active

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #c6c6cd',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: '20px', lineHeight: '28px', fontWeight: 600, color: '#000000', margin: 0 }}>
            Meja {String(table.table_number).padStart(2, '0')}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '9999px',
                backgroundColor: isActive ? '#16a34a' : '#f59e0b',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                fontWeight: 500,
                textTransform: 'uppercase',
                color: isActive ? '#15803d' : '#b45309',
              }}
            >
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={onMenuToggle}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#45464d',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <span className="material-symbols-outlined">more_vert</span>
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '32px',
                backgroundColor: '#ffffff',
                border: '1px solid #c6c6cd',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 20,
                minWidth: '160px',
                overflow: 'hidden',
              }}
            >
              <DropdownItem icon={isActive ? 'pause' : 'play_arrow'} onClick={onToggleActive}>
                {isActive ? 'Nonaktifkan' : 'Aktifkan'}
              </DropdownItem>
              <DropdownItem icon="content_copy" onClick={copyUrl}>
                Salin Link
              </DropdownItem>
              <DropdownItem icon="delete" onClick={onDelete} danger>
                Hapus
              </DropdownItem>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          aspectRatio: '1 / 1',
          backgroundColor: '#f4ede6',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          opacity: isActive ? 1 : 0.5,
          filter: isActive ? 'none' : 'grayscale(1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
            backgroundImage: 'radial-gradient(circle at 1px 1px, #e5e7eb 1px, transparent 0)',
            backgroundSize: '16px 16px',
          }}
        />
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            border: '1px solid #c6c6cd',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <QRCodeSVG
            ref={qrRef}
            value={qrUrl}
            size={150}
            level="M"
            marginSize={0}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={downloadPNG}
          style={{
            flex: 1,
            height: '40px',
            border: '1px solid #c6c6cd',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            color: '#000000',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            download
          </span>
          Download PNG
        </button>
        <a
          href={qrUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid #c6c6cd',
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            textDecoration: 'none',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
            visibility
          </span>
        </a>
      </div>
    </div>
  )
}

function DropdownItem({
  icon,
  onClick,
  children,
  danger = false,
}: {
  icon: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '10px 14px',
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
        fontSize: '13px',
        color: danger ? '#ba1a1a' : '#000000',
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
        {icon}
      </span>
      {children}
    </button>
  )
}

function BulkActionBar({
  tables,
  restaurantSlug,
  baseUrl,
}: {
  tables: TableRow[]
  restaurantSlug: string
  baseUrl: string
}) {
  const [generating, setGenerating] = useState(false)

  async function downloadAllPDF() {
    if (tables.length === 0) {
      alert('Belum ada meja untuk diexport')
      return
    }

    setGenerating(true)

    const qrSize = 200
    const qrItems = tables
      .map((t) => {
        const url = `${baseUrl}/r/${restaurantSlug}?table=${t.table_number}`
        return `
          <div class="qr-card">
            <h2>Meja ${String(t.table_number).padStart(2, '0')}</h2>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(
          url
        )}" width="${qrSize}" height="${qrSize}" />
            </div>
            <p class="url">${url}</p>
            <p class="instruction">Scan untuk memesan</p>
          </div>
        `
      })
      .join('')

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Codes - ${restaurantSlug}</title>
        <style>
          body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: white; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
          .qr-card {
            border: 2px dashed #ccc;
            padding: 20px;
            text-align: center;
            page-break-inside: avoid;
            border-radius: 12px;
          }
          .qr-card h2 { font-size: 24px; margin: 0 0 12px; color: #000; }
          .qr-box { background: white; padding: 12px; display: inline-block; }
          .qr-box img { display: block; }
          .url { font-size: 10px; color: #666; margin: 8px 0 4px; word-break: break-all; font-family: monospace; }
          .instruction { font-size: 14px; color: #333; margin: 8px 0 0; font-weight: bold; }
          @media print {
            body { padding: 0; }
            .qr-card { border: 1px solid #ddd; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${qrItems}</div>
        <script>window.onload = () => window.print();<\/script>
      </body>
      </html>
    `

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')

    setGenerating(false)
  }

  if (tables.length === 0) return null

  return (
    <div
      className="md:ml-60"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255, 248, 242, 0.95)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid #c6c6cd',
        zIndex: 50,
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <span style={{ fontSize: '13px', color: '#45464d', fontWeight: 500 }}>
        {tables.length} meja siap untuk dicetak
      </span>
      <button
        onClick={downloadAllPDF}
        disabled={generating}
        style={{
          backgroundColor: '#ae3115',
          color: '#ffffff',
          padding: '12px 24px',
          borderRadius: '12px',
          border: 'none',
          fontWeight: 700,
          cursor: generating ? 'not-allowed' : 'pointer',
          opacity: generating ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
        }}
      >
        <span className="material-symbols-outlined">print</span>
        {generating ? 'Memuat...' : 'Cetak Semua QR'}
      </button>
    </div>
  )
}