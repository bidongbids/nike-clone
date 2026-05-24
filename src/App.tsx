import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { useStore } from './store/useStore'
import type { Role } from './lib/rbac'
import { RequireAuth, RequireAdmin, AccessDenied } from './components/Guards'

import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Toast from './components/Toast'
import CartModal from './components/CartModal'

import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Wishlist from './pages/Wishlist'
import Orders from './pages/Orders'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'

import Dashboard from './pages/admin/Dashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminUsers from './pages/admin/AdminUsers'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminRoles from './pages/admin/AdminRoles'

import './index.css'

function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <div style={{ minHeight: '100vh' }}>{children}</div>
      <Footer />
      <CartModal />
    </>
  )
}

// Cache role in localStorage so we don't re-fetch on every page load
const ROLE_CACHE_KEY = 'nike-role-cache'

function getCachedRole(userId: string): Role | null {
  try {
    const cached = localStorage.getItem(ROLE_CACHE_KEY)
    if (!cached) return null
    const { id, role, ts } = JSON.parse(cached)
    // Cache valid for 1 hour
    if (id === userId && Date.now() - ts < 3600_000) return role as Role
    return null
  } catch { return null }
}

function setCachedRole(userId: string, role: Role) {
  try {
    localStorage.setItem(ROLE_CACHE_KEY, JSON.stringify({ id: userId, role, ts: Date.now() }))
  } catch { /* ignore */ }
}

export default function App() {
  const { setUser, setAuthLoading } = useStore()

  useEffect(() => {
    const resolveUserAndRole = async (session: any) => {
      if (!session?.user) {
        setUser(null, 'customer')
        return
      }

      // 1) Check cache first — instant, no DB call
      const cachedRole = getCachedRole(session.user.id)
      if (cachedRole) {
        setUser(session.user, cachedRole)
        // Refresh in background to catch role changes
        supabase.from('profiles').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            const role = (data?.role as Role) ?? 'customer'
            if (role !== cachedRole) {
              setCachedRole(session.user.id, role)
              setUser(session.user, role)
            }
          })
        return
      }

      // 2) No cache — fetch from DB
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      const role = (data?.role as Role) ?? 'customer'
      setCachedRole(session.user.id, role)
      setUser(session.user, role)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      resolveUserAndRole(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (_event === 'SIGNED_OUT') localStorage.removeItem(ROLE_CACHE_KEY)
        resolveUserAndRole(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [setUser, setAuthLoading])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/access-denied"   element={<StoreLayout><AccessDenied fullPage /></StoreLayout>} />

        <Route path="/admin"           element={<RequireAdmin><Dashboard /></RequireAdmin>} />
        <Route path="/admin/products"  element={<RequireAdmin><AdminProducts /></RequireAdmin>} />
        <Route path="/admin/orders"    element={<RequireAdmin><AdminOrders /></RequireAdmin>} />
        <Route path="/admin/users"     element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
        <Route path="/admin/roles"     element={<RequireAdmin><AdminRoles /></RequireAdmin>} />

        <Route path="/"             element={<StoreLayout><Home /></StoreLayout>} />
        <Route path="/products"     element={<StoreLayout><Products /></StoreLayout>} />
        <Route path="/products/:id" element={<StoreLayout><ProductDetail /></StoreLayout>} />

        <Route path="/cart"     element={<StoreLayout><RequireAuth><Cart /></RequireAuth></StoreLayout>} />
        <Route path="/checkout" element={<StoreLayout><RequireAuth><Checkout /></RequireAuth></StoreLayout>} />
        <Route path="/wishlist" element={<StoreLayout><RequireAuth><Wishlist /></RequireAuth></StoreLayout>} />
        <Route path="/orders"   element={<StoreLayout><RequireAuth><Orders /></RequireAuth></StoreLayout>} />
      </Routes>
      <Toast />
    </BrowserRouter>
  )
}
