import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { Product, Review, DeliveryAddress, OrderRow } from '../types'

// ── Generic hook factory ──────────────────────────────────────────────────────
function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fn())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { run() }, [run])
  return { data, loading, error, refetch: run }
}

// ── Products ──────────────────────────────────────────────────────────────────
export function useProducts() {
  return useAsync<Product[]>(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Product[]
  }, [])
}

export function useProduct(id: number) {
  return useAsync<Product | null>(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single()
    if (error) throw error
    return data as Product
  }, [id])
}

// Admin: all products including inactive
export function useAdminProducts() {
  return useAsync<Product[]>(async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Product[]
  }, [])
}

// ── Reviews ───────────────────────────────────────────────────────────────────
export function useReviews(productId: number) {
  return useAsync<Review[]>(async () => {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        *,
        profiles ( full_name, email )
      `)
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((r: any) => ({
      id: r.id,
      productId: r.product_id,
      userId: r.user_id,
      userName: r.profiles?.full_name || r.profiles?.email?.split('@')[0] || 'Anonymous',
      rating: r.rating,
      title: r.title,
      body: r.body,
      verified: r.verified,
      date: new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    })) as Review[]
  }, [productId])
}

// ── Addresses ─────────────────────────────────────────────────────────────────
export function useAddresses(userId: string | undefined) {
  return useAsync<DeliveryAddress[]>(async () => {
    if (!userId) return []
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
    if (error) throw error
    return (data ?? []).map((a: any) => ({
      id: a.id,
      label: a.label,
      fullName: a.full_name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2 ?? '',
      city: a.city,
      province: a.province,
      zip: a.zip,
      country: a.country,
      isDefault: a.is_default,
    })) as DeliveryAddress[]
  }, [userId])
}

// ── Orders ────────────────────────────────────────────────────────────────────
export function useOrders(userId: string | undefined) {
  return useAsync<OrderRow[]>(async () => {
    if (!userId) return []
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        addresses ( full_name, city, province ),
        order_items (
          qty,
          unit_price,
          size,
          products ( name, image )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((o: any) => ({
      id: `#${o.id.slice(0, 8).toUpperCase()}`,
      rawId: o.id,
      customer: o.addresses?.full_name ?? '',
      email: '',
      items: o.order_items?.length ?? 0,
      amount: Number(o.total),
      status: o.status,
      date: new Date(o.created_at).toLocaleDateString(),
      address: o.addresses ? `${o.addresses.city}, ${o.addresses.province}` : '',
      orderItems: o.order_items ?? [],
    })) as any[]
  }, [userId])
}

// Admin: all orders
export function useAdminOrders() {
  return useAsync<any[]>(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles ( full_name, email ),
        addresses ( full_name, line1, city, province ),
        order_items ( qty, unit_price, products ( id, name, image, category ) )
      `)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map((o: any) => ({
      id: `#${o.id.slice(0, 8).toUpperCase()}`,
      rawId: o.id,
      customer: o.profiles?.full_name || o.profiles?.email?.split('@')[0] || 'Unknown',
      email: o.profiles?.email ?? '',
      items: o.order_items?.length ?? 0,
      amount: Number(o.total),
      status: o.status,
      date: new Date(o.created_at).toLocaleDateString(),
      createdAt: o.created_at,
      address: o.addresses ? `${o.addresses.line1}, ${o.addresses.city}` : '',
      orderItems: o.order_items ?? [],
    }))
  }, [])
}

// Admin: all users
export function useAdminUsers() {
  return useAsync<any[]>(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  }, [])
}

// Admin: analytics aggregate
export function useAdminAnalytics() {
  return useAsync<any>(async () => {
    const [ordersRes, productsRes, usersRes] = await Promise.all([
      supabase.from('orders').select('total, status, created_at'),
      supabase.from('products').select('id, name, stock, category'),
      supabase.from('profiles').select('id, created_at'),
    ])
    if (ordersRes.error) throw ordersRes.error

    const orders = ordersRes.data ?? []
    const products = productsRes.data ?? []
    const users = usersRes.data ?? []

    const delivered = orders.filter((o: any) => o.status !== 'Cancelled')
    const totalRevenue = delivered.reduce((s: number, o: any) => s + Number(o.total), 0)

    // Monthly revenue for current year
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1
      return delivered
        .filter((o: any) => new Date(o.created_at).getMonth() + 1 === month &&
          new Date(o.created_at).getFullYear() === new Date().getFullYear())
        .reduce((s: number, o: any) => s + Number(o.total), 0)
    })

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalUsers: users.length,
      totalProducts: products.length,
      lowStockProducts: products.filter((p: any) => p.stock < 10),
      products,
      monthly,
    }
  }, [])
}


// Per-size stock for a product
export function useProductSizes(productId: number | undefined) {
  return useAsync<{ size: number; stock: number }[]>(async () => {
    if (!productId) return []
    const { data, error } = await supabase
      .from('product_sizes')
      .select('size, stock')
      .eq('product_id', productId)
      .order('size', { ascending: true })
    if (error) throw error
    return (data ?? []).map((r: any) => ({ size: Number(r.size), stock: Number(r.stock) }))
  }, [productId])
}
