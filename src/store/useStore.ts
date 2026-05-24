import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { addToWishlist, removeFromWishlist } from '../lib/api'
import type { Product, CartItem, ToastItem, ToastType } from '../types'
import type { Role } from '../lib/rbac'
import type { User } from '@supabase/supabase-js'

interface StoreState {
  user: User | null
  role: Role
  authLoading: boolean
  cart: CartItem[]
  wishlistIds: number[]        // just IDs — full product data fetched via useProducts
  toasts: ToastItem[]
  cartModalProduct: Product | null

  setUser: (user: User | null, role?: Role) => void
  setAuthLoading: (v: boolean) => void
  logout: () => Promise<void>

  addToCart: (product: Product, size: number, qty?: number) => void
  removeFromCart: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  getCartCount: () => number
  getCartTotal: () => number
  setCartModal: (product: Product | null) => void

  toggleWishlist: (product: Product) => Promise<void>
  isWishlisted: (id: number) => boolean
  setWishlistIds: (ids: number[]) => void

  addToast: (message: string, type?: ToastType) => void
  removeToast: (id: number) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      role: 'customer' as Role,
      authLoading: true,
      cart: [],
      wishlistIds: [],
      toasts: [],
      cartModalProduct: null,

      setUser: (user, role = 'customer') => set({ user, role, authLoading: false }),
      setAuthLoading: (v) => set({ authLoading: v }),

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, role: 'customer', cart: [], wishlistIds: [], cartModalProduct: null })
      },

      addToCart: (product, size, qty = 1) => {
        const { cart } = get()
        const totalInCart = cart
          .filter((i) => i.product.id === product.id)
          .reduce((s, i) => s + i.qty, 0)

        if (totalInCart + qty > product.stock) {
          get().addToast(`Only ${product.stock} in stock — you have ${totalInCart} in bag`, 'warning')
          return
        }

        const key = `${product.id}-${size}`
        const existing = cart.find((i) => i.key === key)
        if (existing) {
          set({ cart: cart.map((i) => (i.key === key ? { ...i, qty: i.qty + qty } : i)) })
        } else {
          set({ cart: [...cart, { key, product, size, qty }] })
        }

        set({ cartModalProduct: product })
        setTimeout(() => set({ cartModalProduct: null }), 4000)
        get().addToast(`${product.name} added to bag!`, 'success')
      },

      removeFromCart: (key) => set((s) => ({ cart: s.cart.filter((i) => i.key !== key) })),

      updateQty: (key, qty) => {
        if (qty < 1) return get().removeFromCart(key)
        const item = get().cart.find((i) => i.key === key)
        if (item && qty > item.product.stock) {
          get().addToast(`Max stock is ${item.product.stock}`, 'warning')
          return
        }
        set((s) => ({ cart: s.cart.map((i) => (i.key === key ? { ...i, qty } : i)) }))
      },

      clearCart: () => set({ cart: [] }),
      getCartCount: () => get().cart.reduce((s, i) => s + i.qty, 0),
      getCartTotal: () => get().cart.reduce((s, i) => {
        const price = i.product.sale_price ?? i.product.price
        return s + price * i.qty
      }, 0),
      setCartModal: (product) => set({ cartModalProduct: product }),

      toggleWishlist: async (product) => {
        const { user, wishlistIds } = get()
        const isIn = wishlistIds.includes(product.id)

        // Optimistic update
        set({ wishlistIds: isIn ? wishlistIds.filter((id) => id !== product.id) : [...wishlistIds, product.id] })
        get().addToast(isIn ? 'Removed from wishlist' : 'Added to wishlist ♥', isIn ? 'info' : 'success')

        // Sync with DB if logged in
        if (user) {
          try {
            if (isIn) await removeFromWishlist(user.id, product.id)
            else await addToWishlist(user.id, product.id)
          } catch {
            // Revert on failure
            set({ wishlistIds: isIn ? [...wishlistIds] : wishlistIds.filter((id) => id !== product.id) })
            get().addToast('Wishlist sync failed', 'error')
          }
        }
      },

      isWishlisted: (id) => get().wishlistIds.includes(id),
      setWishlistIds: (ids) => set({ wishlistIds: ids }),

      addToast: (message, type = 'info') => {
        const id = Date.now()
        set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
        setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
      },
      removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
    }),
    {
      name: 'nike-store',
      partialize: (s) => ({ cart: s.cart, wishlistIds: s.wishlistIds }),
    }
  )
)
