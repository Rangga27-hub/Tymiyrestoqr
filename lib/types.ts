// ============================================
// Database Types (sesuai schema v3)
// ============================================

export type UserRole = 'admin' | 'owner' | 'cashier'

export type Profile = {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  restaurant_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Restaurant = {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  address: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RestaurantTable = {
  id: string
  restaurant_id: string
  table_number: number
  qr_code_url: string | null
  is_active: boolean
  created_at: string
}

export type MenuCategory = {
  id: string
  restaurant_id: string
  name: string
  display_order: number
  is_active: boolean
  created_at: string
}

export type MenuItem = {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export type OrderStatus = 'pending' | 'preparing' | 'completed' | 'cancelled'

export type Order = {
  id: string
  order_number: number
  restaurant_id: string
  table_id: string | null
  status: OrderStatus
  total: number
  customer_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export type OrderItem = {
  id: string
  order_id: string
  menu_item_id: string | null
  item_name: string
  quantity: number
  price_at_order: number
  subtotal: number
  notes: string | null
  created_at: string
}

// Composite types untuk join queries
export type MenuItemWithCategory = MenuItem & {
  menu_categories: Pick<MenuCategory, 'name' | 'display_order'> | null
}

export type OrderWithItems = Order & {
  order_items: OrderItem[]
  restaurant_tables: Pick<RestaurantTable, 'table_number'> | null
}