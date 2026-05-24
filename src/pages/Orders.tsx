import { Link } from 'react-router-dom'
import { Package, Loader } from 'lucide-react'
import { useStore } from '../store/useStore'
import { useOrders } from '../lib/hooks'

const STATUS_COLORS: Record<string, string> = {
  Delivered: '#22c55e', Shipped: '#3b82f6', Processing: '#f59e0b', Cancelled: '#f04048',
}

export default function Orders() {
  const { user } = useStore()
  const { data: orders, loading } = useOrders(user?.id)

  if (!user) return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32 }}>Please sign in</h2>
      <Link to="/login" className="btn btn-primary">Sign In</Link>
    </div>
  )

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 40, marginBottom: 36 }}>My Orders</h1>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <Loader size={32} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : !orders || orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <Package size={64} strokeWidth={1} color="var(--gray-300)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: 22, marginBottom: 8 }}>No orders yet</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>Your order history will appear here.</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {orders.map((order: any) => (
              <div key={order.id} style={{ border: '1.5px solid var(--gray-200)', borderRadius: 12, overflow: 'hidden', background: 'var(--white)' }}>
                {/* Header */}
                <div style={{ padding: '16px 24px', background: 'var(--gray-50)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Order', value: order.id },
                      { label: 'Date', value: order.date },
                      { label: 'Total', value: `₱${order.amount.toFixed(2)}` },
                      { label: 'Items', value: `${order.items} item${order.items !== 1 ? 's' : ''}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-500)', marginBottom: 2 }}>{label}</p>
                        <strong style={{ fontSize: 14 }}>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <span style={{ background: STATUS_COLORS[order.status] + '22', color: STATUS_COLORS[order.status], padding: '6px 16px', borderRadius: 50, fontWeight: 700, fontSize: 13 }}>
                    {order.status}
                  </span>
                </div>

                {/* Items preview */}
                <div style={{ padding: '16px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(order.orderItems ?? []).slice(0, 3).map((item: any, i: number) => (
                      <div key={i} style={{ width: 64, height: 64, borderRadius: 8, overflow: 'hidden', background: 'var(--gray-100)', flexShrink: 0 }}>
                        {item.products?.image && <img src={item.products.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ flex: 1 }}>
                    {(order.orderItems ?? []).slice(0, 2).map((item: any, i: number) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 2 }}>
                        {item.products?.name} · US {item.size} × {item.qty}
                      </p>
                    ))}
                    {(order.orderItems ?? []).length > 2 && (
                      <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>+{order.orderItems.length - 2} more</p>
                    )}
                    {order.address && <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>📍 {order.address}</p>}
                  </div>
                  <Link to="/products" className="btn btn-secondary btn-sm">Buy Again</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
