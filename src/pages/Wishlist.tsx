import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Loader } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useProducts } from '../lib/hooks'
import { fetchWishlist } from '../lib/api'
import ProductCard from '../components/ProductCard'

export default function Wishlist() {
  const { user, wishlistIds, setWishlistIds } = useStore()
  const { data: allProducts, loading } = useProducts()

  // Sync wishlist from DB on mount
  useEffect(() => {
    if (user && !user.id.startsWith('demo-')) {
      fetchWishlist(user.id).then(setWishlistIds).catch(console.error)
    }
  }, [user, setWishlistIds])

  const wishlistProducts = (allProducts ?? []).filter((p) => wishlistIds.includes(p.id))

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 8 }}>Wishlist</h1>
        <p style={{ color: 'var(--gray-500)', marginBottom: 36 }}>
          {loading ? '…' : wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
        </p>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader size={32} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Heart size={64} strokeWidth={1} color="var(--gray-300)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>Your wishlist is empty</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Save items you love for later.</p>
            <Link to="/products" className="btn btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
            {wishlistProducts.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
