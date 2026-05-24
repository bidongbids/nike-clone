import { supabase } from './supabase'
import type { CartItem, DeliveryAddress } from '../types'

export async function createProduct(data: Record<string, unknown>) {
  const { error } = await supabase.from('products').insert([data])
  if (error) throw error
}
export async function updateProduct(id: number, data: Record<string, unknown>) {
  const { error } = await supabase.from('products').update(data).eq('id', id)
  if (error) throw error
}
export async function deleteProduct(id: number) {
  // Try hard delete first — only works if no orders reference this product
  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) {
    // Foreign key constraint — product is referenced by an order
    // Fall back to soft delete (hide from store)
    if (error.code === '23503' || error.message.includes('foreign key')) {
      const { error: softErr } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
      if (softErr) throw softErr
      // Throw a friendly message so UI can show it
      throw new Error('Product was deactivated (it has existing orders so it can\'t be fully deleted)')
    }
    throw error
  }
}

// Submit review — first ensures profile exists to avoid FK error
export async function submitReview(data: {
  product_id: number
  user_id: string
  rating: number
  title: string
  body: string
}) {
  // Make sure profile exists (fixes "reviews_user_id_fkey" violation)
  const { data: userRes } = await supabase.auth.getUser()
  if (userRes.user) {
    await supabase.from('profiles').upsert(
      { id: userRes.user.id, email: userRes.user.email, full_name: userRes.user.user_metadata?.full_name ?? '', role: 'customer' },
      { onConflict: 'id', ignoreDuplicates: true }
    )
  }
  const { error } = await supabase.from('reviews').upsert([data], { onConflict: 'product_id,user_id' })
  if (error) throw error
}

export async function deleteReview(id: number) {
  const { error } = await supabase.from('reviews').delete().eq('id', id)
  if (error) throw error
}

// ── Addresses ────────────────────────────────────────────────
export async function saveAddress(userId: string, address: Omit<DeliveryAddress, 'id'>) {
  const { data, error } = await supabase
    .from('addresses')
    .insert([{
      user_id: userId,
      label: address.label,
      full_name: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      province: address.province,
      zip: address.zip,
      country: address.country,
      is_default: address.isDefault,
    }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeAddress(id: string) {
  const { error } = await supabase.from('addresses').delete().eq('id', id)
  if (error) throw error
}

export async function setDefaultAddress(userId: string, addressId: string) {
  const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', addressId).eq('user_id', userId)
  if (error) throw error
}

// Get user's default address (used to pre-fill checkout)
export async function getDefaultAddress(userId: string): Promise<DeliveryAddress | null> {
  const { data } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('is_default', true)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id,
    label: data.label,
    fullName: data.full_name,
    phone: data.phone,
    line1: data.line1,
    line2: data.line2 ?? '',
    city: data.city,
    province: data.province,
    zip: data.zip,
    country: data.country,
    isDefault: data.is_default,
  }
}

// ── Wishlist ─────────────────────────────────────────────────
export async function addToWishlist(userId: string, productId: number) {
  const { error } = await supabase.from('wishlists').upsert([{ user_id: userId, product_id: productId }], { onConflict: 'user_id,product_id' })
  if (error) throw error
}

export async function removeFromWishlist(userId: string, productId: number) {
  const { error } = await supabase.from('wishlists').delete().eq('user_id', userId).eq('product_id', productId)
  if (error) throw error
}

export async function fetchWishlist(userId: string): Promise<number[]> {
  const { data, error } = await supabase.from('wishlists').select('product_id').eq('user_id', userId)
  if (error) throw error
  return (data ?? []).map((r: any) => r.product_id)
}

// ── ACID Order Placement (via SQL function) ──────────────────
export async function placeOrder(params: {
  userId: string
  addressId: string
  cart: CartItem[]
  paymentMethod: 'card' | 'gcash' | 'cod'
  subtotal: number
  shipping: number
  tax: number
  total: number
}): Promise<string> {
  // Use the atomic place_order() SQL function — entire order is one transaction
  const { data, error } = await supabase.rpc('place_order', {
    p_address_id: params.addressId,
    p_payment_method: params.paymentMethod,
    p_items: params.cart.map((item) => ({
      product_id: item.product.id,
      size: item.size,
      qty: item.qty,
      unit_price: item.product.sale_price ?? item.product.price,
    })),
    p_subtotal: params.subtotal,
    p_shipping: params.shipping,
    p_tax: params.tax,
    p_total: params.total,
  })

  if (error) throw error
  return `#${String(data).slice(0, 8).toUpperCase()}`
}

export async function updateOrderStatus(rawId: string, status: string) {
  const { error } = await supabase.from('orders').update({ status }).eq('id', rawId)
  if (error) throw error
}

export async function updateUserRole(userId: string, role: string) {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
  if (error) throw error
}


// Restock a product (add to current stock)
export async function restockProduct(id: number, qty: number) {
  // Fetch current stock, then update
  const { data: current, error: fetchErr } = await supabase
    .from('products')
    .select('stock')
    .eq('id', id)
    .single()
  if (fetchErr) throw fetchErr
  const { error } = await supabase
    .from('products')
    .update({ stock: (current?.stock ?? 0) + qty })
    .eq('id', id)
  if (error) throw error
}


// ── Per-size stock management ───────────────────────────────────────
export interface SizeStock { size: number; stock: number }

// Sync sizes & stock via the SQL function (atomic)
export async function syncProductSizes(productId: number, sizeStocks: SizeStock[]) {
  const { error } = await supabase.rpc('sync_product_sizes', {
    p_product_id: productId,
    p_size_stocks: sizeStocks,
  })
  if (error) throw error
}

// Fetch per-size stock for a product
export async function fetchProductSizes(productId: number): Promise<SizeStock[]> {
  const { data, error } = await supabase
    .from('product_sizes')
    .select('size, stock')
    .eq('product_id', productId)
    .order('size', { ascending: true })
  if (error) throw error
  return (data ?? []).map((r: any) => ({ size: Number(r.size), stock: Number(r.stock) }))
}

// Create product + initialize sizes
export async function createProductWithSizes(
  data: Record<string, unknown>,
  sizeStocks: SizeStock[]
): Promise<number> {
  const { data: newProduct, error } = await supabase
    .from('products')
    .insert([data])
    .select('id')
    .single()
  if (error) throw error
  if (sizeStocks.length > 0) {
    await syncProductSizes(newProduct.id, sizeStocks)
  }
  return newProduct.id
}
