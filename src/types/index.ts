import type { Role } from '../lib/rbac'

export interface Product {
  id: number
  name: string
  category: 'men' | 'women' | 'lifestyle' | 'basketball'
  price: number
  sale_price: number | null
  image: string
  colors: string[]
  sizes: number[]
  badge: 'new' | 'sale' | null
  stock: number
  description: string
  is_active?: boolean
}

export interface CartItem {
  key: string
  product: Product
  size: number
  qty: number
}

export interface Review {
  id: number
  productId: number
  userId: string
  userName: string
  rating: number       // 1–5
  title: string
  body: string
  verified: boolean
  date: string
}

export interface DeliveryAddress {
  id: string
  label: string        // e.g. "Home", "Office"
  fullName: string
  phone: string
  line1: string
  line2: string
  city: string
  province: string
  zip: string
  country: string
  isDefault: boolean
}

export interface OrderRow {
  id: string
  customer: string
  email: string
  items: number
  amount: number
  status: 'Delivered' | 'Processing' | 'Shipped' | 'Cancelled'
  date: string
  address: string
}

export interface AdminUser {
  id: number
  name: string
  email: string
  joined: string
  orders: number
  spent: number
  role: Role
}

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  message: string
  type: ToastType
}

export type SortOption = 'featured' | 'price_asc' | 'price_desc' | 'new'
export type Category = 'all' | 'men' | 'women' | 'lifestyle' | 'basketball'
