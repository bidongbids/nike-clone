import { Link } from 'react-router-dom'
import { X, ShoppingBag, ArrowRight, Check } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function CartModal() {
  const { cartModalProduct, setCartModal, getCartCount, getCartTotal } = useStore()
  if (!cartModalProduct) return null

  const p = cartModalProduct
  const price = p.sale_price ?? p.price

  return (
    <div
      style={{
        position: 'fixed', top: 80, right: 24, zIndex: 900,
        width: 340, background: 'var(--white)',
        border: '1.5px solid var(--gray-200)', borderRadius: 16,
        boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        animation: 'slideInRight 0.3s cubic-bezier(.4,0,.2,1)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
        <div style={{ background: '#22c55e', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={14} color="white" strokeWidth={3} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#15803d', flex: 1 }}>Added to your bag!</span>
        <button onClick={() => setCartModal(null)} style={{ color: '#86efac' }}><X size={16} /></button>
      </div>

      {/* Product */}
      <div style={{ display: 'flex', gap: 14, padding: 16, alignItems: 'center' }}>
        <div style={{ width: 72, height: 72, background: 'var(--gray-100)', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
          <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
          <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4, textTransform: 'capitalize' }}>{p.category}</p>
          <p style={{ fontWeight: 700, fontSize: 15, color: p.sale_price ? 'var(--red)' : 'var(--black)' }}>₱{price}</p>
        </div>
      </div>

      {/* Cart summary */}
      <div style={{ padding: '0 16px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)' }}>
        <span>{getCartCount()} item{getCartCount() !== 1 ? 's' : ''} in bag</span>
        <span>Subtotal: <strong style={{ color: 'var(--black)' }}>₱{getCartTotal().toFixed(2)}</strong></span>
      </div>

      {/* CTAs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
        <button
          onClick={() => setCartModal(null)}
          style={{ padding: '11px', border: '1.5px solid var(--gray-300)', borderRadius: 50, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: 'var(--white)' }}
        >
          Keep Shopping
        </button>
        <Link
          to="/cart"
          onClick={() => setCartModal(null)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '11px', background: 'var(--black)', color: 'var(--white)', borderRadius: 50, fontSize: 13, fontWeight: 600 }}
        >
          <ShoppingBag size={14} /> View Bag <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  )
}
