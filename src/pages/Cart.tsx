import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useStore } from '../store/useStore'

export default function Cart() {
  const { cart, removeFromCart, updateQty, getCartTotal, addToast } = useStore()
  const navigate = useNavigate()
  const total = getCartTotal()
  const shipping = total >= 75 ? 0 : 9.99
  const tax = total * 0.08
  const orderTotal = total + shipping + tax

  if (cart.length === 0) {
    return (
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <ShoppingBag size={64} strokeWidth={1} color="var(--gray-300)" />
        <h2 style={{ fontSize: 28, fontFamily: 'var(--font-display)' }}>Your bag is empty</h2>
        <p style={{ color: 'var(--gray-500)' }}>Add some shoes to get started.</p>
        <Link to="/products" className="btn btn-primary">Shop Now</Link>
      </div>
    )
  }

  return (
    <div style={{ paddingTop: 'var(--nav-h)', background: 'var(--gray-50)', minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 36 }}>Your Bag</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {cart.map((item) => {
              const price = item.product.sale_price ?? item.product.price
              const maxQty = item.product.stock
              return (
                <div key={item.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 20, padding: '24px 0', borderBottom: '1px solid var(--gray-200)', background: 'var(--white)', borderRadius: 0, marginBottom: 0 }}>
                  <Link to={`/products/${item.product.id}`}>
                    <div style={{ background: 'var(--gray-100)', borderRadius: 12, overflow: 'hidden', aspectRatio: '1' }}>
                      <img src={item.product.image} alt={item.product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  </Link>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Link to={`/products/${item.product.id}`}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{item.product.name}</h3>
                      </Link>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 2, textTransform: 'capitalize' }}>{item.product.category}</p>
                      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>Size: US {item.size}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button
                          onClick={() => updateQty(item.key, item.qty - 1)}
                          style={{ width: 30, height: 30, border: '1.5px solid var(--gray-300)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                        <button
                          onClick={() => {
                            if (item.qty >= maxQty) { addToast(`Only ${maxQty} in stock`, 'warning'); return }
                            updateQty(item.key, item.qty + 1)
                          }}
                          disabled={item.qty >= maxQty}
                          style={{ width: 30, height: 30, border: '1.5px solid var(--gray-300)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: item.qty >= maxQty ? 'not-allowed' : 'pointer', opacity: item.qty >= maxQty ? 0.4 : 1 }}
                        >
                          <Plus size={12} />
                        </button>
                        {item.qty >= maxQty && (
                          <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 600 }}>Max stock</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 700, fontSize: 16 }}>₱{(price * item.qty).toFixed(2)}</p>
                      {item.product.sale_price && (
                        <p style={{ fontSize: 12, color: 'var(--gray-400)', textDecoration: 'line-through' }}>
                          ₱{(item.product.price * item.qty).toFixed(2)}
                        </p>
                      )}
                      <button
                        onClick={() => removeFromCart(item.key)}
                        style={{ marginTop: 12, color: 'var(--gray-400)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, marginLeft: 'auto' }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div style={{ background: 'var(--white)', borderRadius: 16, padding: 28, position: 'sticky', top: 'calc(var(--nav-h) + 20px)', border: '1px solid var(--gray-200)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Order Summary</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--gray-600)' }}>Subtotal ({cart.reduce((s, i) => s + i.qty, 0)} items)</span>
                <span>₱{total.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--gray-600)' }}>Shipping</span>
                <span style={{ color: shipping === 0 ? '#22c55e' : 'var(--black)', fontWeight: shipping === 0 ? 600 : 400 }}>
                  {shipping === 0 ? 'FREE' : `₱${shipping.toFixed(2)}`}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: 'var(--gray-600)' }}>Tax (8%)</span>
                <span>₱{tax.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--gray-100)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18 }}>
                <span>Total</span><span>₱{orderTotal.toFixed(2)}</span>
              </div>
            </div>

            {shipping > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e' }}>
                🚚 Add <strong>₱{(75 - total).toFixed(2)}</strong> more for free shipping!
              </div>
            )}

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary btn-full"
              style={{ fontSize: 16, padding: 18, marginBottom: 12 }}
            >
              Proceed to Checkout <ArrowRight size={16} />
            </button>
            <Link
              to="/products"
              style={{ display: 'block', textAlign: 'center', fontSize: 14, color: 'var(--gray-500)', textDecoration: 'underline' }}
            >
              Continue Shopping
            </Link>

            {/* Accepted payments */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--gray-100)' }}>
              <p style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', marginBottom: 8 }}>SECURE CHECKOUT</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                {['💳 Visa', '💳 Mastercard', '📱 GCash', '💵 COD'].map((m) => (
                  <span key={m} style={{ fontSize: 11, padding: '4px 8px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 4 }}>{m}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
