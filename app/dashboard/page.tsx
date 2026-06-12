import { createClient } from '@/lib/supabase/server'
import { formatIDR } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardOverview() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  // Get restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user!.id)
    .single()

  if (!restaurant) {
    return (
      <div className="p-6">
        <div
          className="border p-6 rounded-xl"
          style={{ backgroundColor: '#faf2eb', borderColor: '#c6c6cd' }}
        >
          <h2 className="text-headline-md" style={{ color: '#000000' }}>
            Belum ada restoran
          </h2>
          <p className="text-body-md mt-1" style={{ color: '#45464d' }}>
            Hubungi admin untuk dibuatkan restoran.
          </p>
        </div>
      </div>
    )
  }

  // Stats hari ini
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total, status')
    .eq('restaurant_id', restaurant.id)
    .gte('created_at', today.toISOString())

  // Stats yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const { data: yesterdayOrders } = await supabase
    .from('orders')
    .select('total, status')
    .eq('restaurant_id', restaurant.id)
    .gte('created_at', yesterday.toISOString())
    .lt('created_at', today.toISOString())

  const totalOrders = todayOrders?.length || 0
  const yesterdayTotal = yesterdayOrders?.length || 0
  const ordersGrowth =
    yesterdayTotal > 0
      ? Math.round(((totalOrders - yesterdayTotal) / yesterdayTotal) * 100)
      : null

  const todayRevenue =
    todayOrders
      ?.filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.total), 0) || 0

  const yesterdayRevenue =
    yesterdayOrders
      ?.filter((o) => o.status === 'completed')
      .reduce((sum, o) => sum + Number(o.total), 0) || 0

  const revenueGrowth =
    yesterdayRevenue > 0
      ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100)
      : null

  const pendingCount = todayOrders?.filter((o) => o.status === 'pending').length || 0

  // Active tables
  const { data: tables } = await supabase
    .from('restaurant_tables')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)

  const { data: activeOrders } = await supabase
    .from('orders')
    .select('table_id')
    .eq('restaurant_id', restaurant.id)
    .in('status', ['pending', 'preparing'])
    .not('table_id', 'is', null)

  const totalTables = tables?.length || 0
  const activeTableIds = new Set(activeOrders?.map((o) => o.table_id) || [])
  const activeTables = activeTableIds.size
  const tableUtilization =
    totalTables > 0 ? Math.round((activeTables / totalTables) * 100) : 0

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, customer_name, created_at, restaurant_tables(table_number), order_items(id)')
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(5)

  // Format date
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  const formattedDate = new Date().toLocaleDateString('id-ID', dateOptions)

  return (
    <div>
      {/* Top App Bar */}
      <header
        className="hidden md:flex justify-between items-center px-6 py-4 sticky top-0 z-30 border-b backdrop-blur-md"
        style={{ backgroundColor: 'rgba(255, 248, 242, 0.9)', borderColor: '#e8e1db' }}
      >
        <div className="flex flex-col">
          <h2 className="text-headline-md" style={{ color: '#000000' }}>
            Halo, {profile?.full_name?.split(' ')[0] || 'Owner'}
          </h2>
          <span className="text-label-sm" style={{ color: '#45464d' }}>
            {formattedDate}
          </span>
        </div>
        <Link
          href="/dashboard/orders"
          className="p-2 rounded-full transition-colors hover:bg-gray-100"
          style={{ color: '#000000' }}
        >
          <span className="material-symbols-outlined">shopping_bag</span>
        </Link>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        {/* 4 Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Order Hari Ini"
            value={totalOrders.toString()}
            icon="receipt"
            growth={ordersGrowth}
          />

          <StatCard
            label="Revenue Hari Ini"
            value={formatIDR(todayRevenue)}
            icon="payments"
            growth={revenueGrowth}
            isCompact
          />

          {/* Pending Orders (Coral) */}
          <div
            className="border p-4 rounded-xl"
            style={{ backgroundColor: '#fd6a49', borderColor: '#ae3115', color: '#ffffff' }}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className="text-label-sm uppercase tracking-wider opacity-90"
                style={{ color: '#ffffff' }}
              >
                Pending Orders
              </span>
              <span className="material-symbols-outlined">timer</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className="text-label-mono font-bold"
                style={{ fontSize: '32px', lineHeight: '40px' }}
              >
                {pendingCount}
              </span>
              {pendingCount > 5 && (
                <span
                  className="px-1.5 py-0.5 rounded text-label-mono"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    fontSize: '10px',
                    color: '#ffffff',
                  }}
                >
                  Urgensi Tinggi
                </span>
              )}
            </div>
          </div>

          {/* Active Tables */}
          <div
            className="border p-4 rounded-xl"
            style={{ backgroundColor: '#ffffff', borderColor: '#c6c6cd' }}
          >
            <div className="flex justify-between items-start mb-2">
              <span
                className="text-label-sm uppercase tracking-wider"
                style={{ color: '#45464d' }}
              >
                Meja Aktif
              </span>
              <span className="material-symbols-outlined" style={{ color: '#000000' }}>
                table_restaurant
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span
                  className="text-label-mono font-bold"
                  style={{ fontSize: '32px', lineHeight: '40px', color: '#000000' }}
                >
                  {activeTables}/{totalTables}
                </span>
                <span className="text-label-sm" style={{ color: '#45464d' }}>
                  {tableUtilization}%
                </span>
              </div>
              <div
                className="h-2 w-full rounded-full overflow-hidden"
                style={{ backgroundColor: '#e8e1db' }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${tableUtilization}%`, backgroundColor: '#000000' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Order Feed */}
          <section
            className="lg:col-span-8 border rounded-xl overflow-hidden flex flex-col"
            style={{ backgroundColor: '#ffffff', borderColor: '#c6c6cd' }}
          >
            <div
              className="px-4 py-4 border-b flex items-center justify-between"
              style={{ borderColor: '#c6c6cd' }}
            >
              <div className="flex items-center gap-2">
                <div className="relative flex h-3 w-3">
                  <span
                    className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
                    style={{ backgroundColor: '#22c55e' }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-3 w-3"
                    style={{ backgroundColor: '#16a34a' }}
                  />
                </div>
                <h3 className="text-headline-md" style={{ color: '#000000' }}>
                  Live Order Feed
                </h3>
              </div>
              <Link
                href="/dashboard/orders"
                className="text-label-sm hover:underline"
                style={{ color: '#45464d' }}
              >
                <span className="material-symbols-outlined">more_horiz</span>
              </Link>
            </div>

            {recentOrders && recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead
                    className="border-b"
                    style={{ backgroundColor: '#faf2eb', borderColor: '#c6c6cd' }}
                  >
                    <tr>
                      <th className="px-4 py-2 text-label-sm uppercase" style={{ color: '#45464d' }}>
                        Order #
                      </th>
                      <th className="px-4 py-2 text-label-sm uppercase" style={{ color: '#45464d' }}>
                        Meja
                      </th>
                      <th className="px-4 py-2 text-label-sm uppercase" style={{ color: '#45464d' }}>
                        Items
                      </th>
                      <th className="px-4 py-2 text-label-sm uppercase text-right" style={{ color: '#45464d' }}>
                        Total
                      </th>
                      <th className="px-4 py-2 text-label-sm uppercase" style={{ color: '#45464d' }}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#c6c6cd' }}>
                    {recentOrders.map((order) => {
                      const table = Array.isArray(order.restaurant_tables)
                        ? order.restaurant_tables[0]
                        : order.restaurant_tables
                      const itemCount = Array.isArray(order.order_items)
                        ? order.order_items.length
                        : 0
                      return (
                        <tr key={order.id} className="transition-colors hover:bg-gray-50">
                          <td className="px-4 py-4 text-label-mono" style={{ color: '#000000' }}>
                            #TY-{String(order.order_number).padStart(4, '0')}
                          </td>
                          <td className="px-4 py-4">
                            {table ? (
                              <span
                                className="px-2 py-1 rounded text-label-sm font-bold border"
                                style={{ backgroundColor: '#f4ede6', borderColor: '#c6c6cd', color: '#000000' }}
                              >
                                T-{String(table.table_number).padStart(2, '0')}
                              </span>
                            ) : (
                              <span className="text-label-sm" style={{ color: '#76777d' }}>
                                Takeaway
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4" style={{ color: '#45464d' }}>
                            {itemCount} items
                          </td>
                          <td className="px-4 py-4 text-right text-label-mono" style={{ color: '#000000' }}>
                            {formatIDR(Number(order.total))}
                          </td>
                          <td className="px-4 py-4">
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center" style={{ color: '#45464d' }}>
                <p>Belum ada order hari ini</p>
              </div>
            )}

            <div className="p-4 text-center" style={{ backgroundColor: '#faf2eb' }}>
              <Link
                href="/dashboard/orders"
                className="font-bold text-label-sm hover:underline"
                style={{ color: '#000000' }}
              >
                Lihat Semua Pesanan
              </Link>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="lg:col-span-4 space-y-6">
            <section
              className="border rounded-xl p-4"
              style={{ backgroundColor: '#ffffff', borderColor: '#c6c6cd' }}
            >
              <h3 className="text-headline-md mb-4" style={{ color: '#000000' }}>
                Quick Actions
              </h3>
              <div className="flex flex-col gap-2">
                <Link
                  href="/dashboard/menu"
                  className="flex items-center gap-4 w-full p-4 border rounded-xl text-left transition-colors group"
                  style={{ backgroundColor: '#fff8f2', borderColor: '#c6c6cd' }}
                >
                  <span
                    className="material-symbols-outlined p-2 rounded-lg"
                    style={{ backgroundColor: '#000000', color: '#ffffff' }}
                  >
                    add_circle
                  </span>
                  <div className="flex-1">
                    <span className="block font-bold" style={{ color: '#000000' }}>
                      Tambah Menu Baru
                    </span>
                    <span className="block text-label-sm" style={{ color: '#45464d' }}>
                      Update stok & harga produk
                    </span>
                  </div>
                </Link>

                <Link
                  href="/dashboard/tables"
                  className="flex items-center gap-4 w-full p-4 border rounded-xl text-left transition-colors group"
                  style={{ backgroundColor: '#fff8f2', borderColor: '#c6c6cd' }}
                >
                  <span
                    className="material-symbols-outlined p-2 rounded-lg"
                    style={{ backgroundColor: '#131b2e', color: '#bec6e0' }}
                  >
                    qr_code_2
                  </span>
                  <div className="flex-1">
                    <span className="block font-bold" style={{ color: '#000000' }}>
                      Cetak QR Meja
                    </span>
                    <span className="block text-label-sm" style={{ color: '#45464d' }}>
                      Unduh kode QR digital meja
                    </span>
                  </div>
                </Link>
              </div>
            </section>

            {/* Restaurant Info */}
            <div
              className="relative h-48 rounded-xl overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #131b2e 0%, #3f465c 50%, #131b2e 100%)',
              }}
            >
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'radial-gradient(circle at 2px 2px, #FFFFFF 1px, transparent 0)',
                  backgroundSize: '30px 30px',
                }}
              />
              <div
                className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-full blur-3xl opacity-30"
                style={{ backgroundColor: '#fd6a49' }}
              />
              <div className="relative h-full flex flex-col justify-end p-4">
                <span
                  className="text-label-mono uppercase tracking-widest mb-1 opacity-70"
                  style={{ color: '#ffffff', fontSize: '10px' }}
                >
                  Restoran Aktif
                </span>
                <h4 className="font-bold text-lg" style={{ color: '#ffffff' }}>
                  {restaurant.name}
                </h4>
                {restaurant.address && (
                  <p className="text-label-sm mt-1 opacity-80" style={{ color: '#ffffff' }}>
                    {restaurant.address}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  growth,
  isCompact = false,
}: {
  label: string
  value: string
  icon: string
  growth: number | null
  isCompact?: boolean
}) {
  return (
    <div
      className="border p-4 rounded-xl"
      style={{ backgroundColor: '#ffffff', borderColor: '#c6c6cd' }}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className="text-label-sm uppercase tracking-wider"
          style={{ color: '#45464d' }}
        >
          {label}
        </span>
        <span className="material-symbols-outlined" style={{ color: '#000000' }}>
          {icon}
        </span>
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span
          className="text-label-mono font-bold"
          style={{
            fontSize: isCompact ? '24px' : '32px',
            lineHeight: isCompact ? '32px' : '40px',
            color: '#000000',
          }}
        >
          {value}
        </span>
        {growth !== null && (
          <span
            className="text-label-mono text-label-sm flex items-center"
            style={{ color: growth >= 0 ? '#16a34a' : '#dc2626' }}
          >
            <span className="material-symbols-outlined text-sm">
              {growth >= 0 ? 'trending_up' : 'trending_down'}
            </span>
            {Math.abs(growth)}%
          </span>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; dot: string; label: string }> = {
    pending: { color: '#92400e', dot: '#f59e0b', label: 'PENDING' },
    preparing: { color: '#1e40af', dot: '#2563eb', label: 'DIPROSES' },
    completed: { color: '#475569', dot: '#94a3b8', label: 'SELESAI' },
    cancelled: { color: '#991b1b', dot: '#dc2626', label: 'BATAL' },
  }
  const c = config[status] || config.pending
  return (
    <div
      className="inline-flex items-center gap-1 text-label-mono text-label-sm"
      style={{ color: c.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.dot }} />
      {c.label}
    </div>
  )
}