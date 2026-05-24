import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Heart, ChevronRight, Truck, RotateCcw, AlertTriangle, Loader } from 'lucide-react'
import { useProduct, useProducts, useProductSizes } from '../lib/hooks'
import { useStore } from '../store/useStore'
import ProductCard from '../components/ProductCard'
import Reviews from '../components/Reviews'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: product, loading } = useProduct(Number(id))
  const { data: allProducts } = useProducts()
  const { data: sizeStocks } = useProductSizes(product?.id)
  const { addToCart, toggleWishlist, isWishlisted, addToast } = useStore()
  const navigate = useNavigate()
  const [selectedSize, setSelectedSize] = useState<number | null>(null)
  const [qty, setQty] = useState(1)
  const [sizeError, setSizeError] = useState(false)

  // Reset size selection when product changes
  useEffect(() => { setSelectedSize(null); setQty(1) }, [id])

  if (loading) return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader size={36} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (!product) return (
    <div style={{ paddingTop: 120, textAlign: 'center', minHeight: '60vh' }}>
      <h2>Product not found</h2>
      <Link to="/products" className="btn btn-primary" style={{ marginTop: 20, display: 'inline-flex' }}>Back to Products</Link>
    </div>
  )

  const wishlisted = isWishlisted(product.id)
  const price = product.sale_price ?? product.price
  const isOutOfStock = product.stock === 0
  const isLowStock = product.stock > 0 && product.stock < 10
  const related = (allProducts ?? []).filter((p) => p.id !== product.id && p.category === product.category).slice(0, 4)

  const selectedSizeStock = selectedSize
    ? (sizeStocks ?? []).find((x) => x.size === selectedSize)?.stock ?? 0
    : 0
  const maxQtyForSize = selectedSize ? selectedSizeStock : product.stock

  const handleAdd = () => {
    if (!selectedSize) { setSizeError(true); addToast('Please select a size', 'error'); return }
    setSizeError(false); addToCart(product, selectedSize, qty)
  }
  const handleBuy = () => {
    if (!selectedSize) { setSizeError(true); addToast('Please select a size', 'error'); return }
    setSizeError(false); addToCart(product, selectedSize, qty); navigate('/cart')
  }

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      {/* Breadcrumb */}
      <div className="container" style={{ padding: '16px 48px', display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: 'var(--gray-500)', flexWrap: 'wrap' }}>
        <Link to="/">Home</Link><ChevronRight size={12} />
        <Link to="/products">Shoes</Link><ChevronRight size={12} />
        <Link to={`/products?cat=${product.category}`} style={{ textTransform: 'capitalize' }}>{product.category}</Link><ChevronRight size={12} />
        <span style={{ color: 'var(--black)' }}>{product.name}</span>
      </div>

      <div className="container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, paddingBottom: 80, alignItems: 'start' }}>
        {/* Image */}
        <div style={{ position: 'sticky', top: 'calc(var(--nav-h) + 20px)' }}>
          <div style={{ background: 'var(--gray-100)', borderRadius: 20, overflow: 'hidden', aspectRatio: '1', position: 'relative' }}>
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {product.badge && <span className={`badge badge-${product.badge}`} style={{ position: 'absolute', top: 16, left: 16 }}>{product.badge}</span>}
            {isOutOfStock && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ background: 'var(--white)', padding: '12px 24px', borderRadius: 50, fontWeight: 700, fontSize: 16 }}>Out of Stock</span>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <p style={{ textTransform: 'capitalize', color: 'var(--gray-500)', marginBottom: 4, fontSize: 13 }}>{product.category}</p>
          <h1 style={{ fontSize: 36, fontFamily: 'var(--font-display)', letterSpacing: 0.5, marginBottom: 16 }}>{product.name}</h1>

          {/* Price */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 30, fontWeight: 700, color: product.sale_price ? 'var(--red)' : 'var(--black)' }}>₱{price}</span>
            {product.sale_price && <>
              <span style={{ fontSize: 20, color: 'var(--gray-400)', textDecoration: 'line-through' }}>₱{product.price}</span>
              <span style={{ background: '#fef2f2', color: 'var(--red)', padding: '3px 10px', borderRadius: 50, fontSize: 12, fontWeight: 700 }}>
                Save ₱{(product.price - product.sale_price).toFixed(2)}
              </span>
            </>}
          </div>

          {/* Low stock */}
          {isLowStock && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
              <AlertTriangle size={16} color="#f59e0b" />
              Only <strong>{product.stock} left</strong> — order soon!
            </div>
          )}

          {/* Colors */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Color</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {product.colors.map((c, i) => <span key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid var(--gray-200)', flexShrink: 0 }} />)}
            </div>
          </div>

          {/* Sizes */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Select Size (US)
                {sizeError && <span style={{ color: 'var(--red)', fontWeight: 400, marginLeft: 8, fontSize: 11 }}>← required</span>}
              </p>
              <button style={{ fontSize: 12, color: 'var(--gray-500)', textDecoration: 'underline' }}>Size Guide</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {product.sizes.map((s) => {
                const sizeInfo = (sizeStocks ?? []).find((x) => x.size === s)
                const sizeStock = sizeInfo?.stock ?? 0
                const sizeOut = sizeStock === 0
                const sizeLow = sizeStock > 0 && sizeStock < 5
                const disabled = isOutOfStock || sizeOut
                return (
                  <button key={s} onClick={() => { if (!disabled) { setSelectedSize(s); setSizeError(false) } }} disabled={disabled}
                    title={sizeOut ? 'Out of stock' : sizeLow ? `Only ${sizeStock} left` : `${sizeStock} in stock`}
                    style={{
                      padding: '12px 4px', fontSize: 13,
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      border: `1.5px solid ${selectedSize === s ? 'var(--black)' : sizeError ? 'var(--red)' : 'var(--gray-200)'}`,
                      borderRadius: 6,
                      fontWeight: selectedSize === s ? 700 : 400,
                      background: selectedSize === s ? 'var(--black)' : disabled ? 'var(--gray-50)' : 'var(--white)',
                      color: selectedSize === s ? 'var(--white)' : disabled ? 'var(--gray-300)' : 'var(--black)',
                      transition: 'all 0.15s',
                      position: 'relative',
                      textDecoration: sizeOut && !selectedSize ? 'line-through' : 'none',
                    }}>
                    {s}
                    {sizeLow && !sizeOut && selectedSize !== s && (
                      <span style={{ position: 'absolute', top: -4, right: -4, background: '#f59e0b', color: '#fff', borderRadius: 50, fontSize: 9, fontWeight: 700, padding: '1px 5px' }}>
                        {sizeStock}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Qty */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Qty:</span>
            <div style={{ display: 'flex', border: '1.5px solid var(--gray-300)', borderRadius: 8, overflow: 'hidden' }}>
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 16 }}>−</button>
              <span style={{ padding: '8px 14px', fontWeight: 700, minWidth: 36, textAlign: 'center' }}>{qty}</span>
              <button onClick={() => setQty((q) => Math.min(maxQtyForSize, q + 1))} disabled={qty >= maxQtyForSize} style={{ padding: '8px 14px', fontWeight: 700, fontSize: 16, opacity: qty >= maxQtyForSize ? 0.3 : 1 }}>+</button>
            </div>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {selectedSize
                ? `${maxQtyForSize} available in US ${selectedSize}`
                : `${product.stock} total available — select a size`}
            </span>
          </div>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            <button className="btn btn-primary btn-full" onClick={handleAdd} disabled={isOutOfStock} style={{ fontSize: 16, padding: 18, opacity: isOutOfStock ? 0.5 : 1 }}>
              {isOutOfStock ? 'Out of Stock' : 'Add to Bag'}
            </button>
            {!isOutOfStock && <button className="btn btn-secondary btn-full" onClick={handleBuy} style={{ fontSize: 16, padding: 18 }}>Buy It Now</button>}
            <button onClick={() => toggleWishlist(product)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, border: '1.5px solid var(--gray-200)', borderRadius: 50, fontWeight: 600, fontSize: 14, color: wishlisted ? 'var(--red)' : 'var(--black)', transition: 'all 0.15s' }}>
              <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
              {wishlisted ? 'Wishlisted' : 'Add to Wishlist'}
            </button>
          </div>

          {/* Perks */}
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--gray-600)' }}><Truck size={18} style={{ flexShrink: 0, color: 'var(--black)' }} /> Free shipping on orders over ₱75</div>
            <div style={{ display: 'flex', gap: 12, fontSize: 14, color: 'var(--gray-600)' }}><RotateCcw size={18} style={{ flexShrink: 0, color: 'var(--black)' }} /> Free 30-day returns</div>
          </div>

          <div style={{ marginTop: 24, background: 'var(--gray-50)', borderRadius: 12, padding: '20px 24px' }}>
            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>About this product</h4>
            <p style={{ color: 'var(--gray-600)', lineHeight: 1.7, fontSize: 14 }}>{product.description}</p>
          </div>
        </div>
      </div>

      {/* Reviews from Supabase */}
      <div id="reviews" className="container" style={{ paddingBottom: 60 }}>
        <Reviews productId={product.id} productName={product.name} />
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="container" style={{ paddingBottom: 80 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, marginBottom: 24 }}>You Might Also Like</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24 }}>
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
