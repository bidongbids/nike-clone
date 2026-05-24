import { Link } from 'react-router-dom'
import { DollarSign, ShoppingBag, Users, Package, TrendingUp, ArrowUpRight, Loader } from 'lucide-react'
import { useAdminAnalytics, useAdminOrders } from '../../lib/hooks'
import AdminLayout from './AdminLayout'

const STATUS_COLORS: Record<string,string> = {
  Delivered: '#22c55e', Processing: '#f59e0b', Shipped: '#3b82f6', Cancelled: '#f04048',
}

export default function Dashboard() {
  const { data: analytics, loading } = useAdminAnalytics()
  const { data: orders, loading: ordersLoading } = useAdminOrders()
  const recentOrders = (orders ?? []).slice(0, 6)

  const stats = analytics ? [
    { label: 'Total Revenue',  value: `₱${analytics.totalRevenue.toLocaleString('en',{maximumFractionDigits:0})}`, icon: DollarSign, color: '#3b82f6' },
    { label: 'Orders',         value: analytics.totalOrders.toLocaleString(), icon: ShoppingBag, color: '#8b5cf6' },
    { label: 'Customers',      value: analytics.totalUsers.toLocaleString(), icon: Users, color: '#22c55e' },
    { label: 'Products',       value: analytics.totalProducts, icon: Package, color: '#f59e0b', sub: `${analytics.lowStockProducts.length} low stock` },
  ] : []

  return (
    <AdminLayout>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <Loader size={32} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="stat-cards">
            {stats.map((s) => (
              <div key={s.label} className="stat-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p className="stat-label">{s.label}</p>
                    <p className="stat-value">{s.value}</p>
                    <p className="stat-sub stat-up">
                      <TrendingUp size={12} style={{ display: 'inline', marginRight: 3 }} />
                      {(s as any).sub ?? 'Live data'}
                    </p>
                  </div>
                  <div style={{ background: s.color + '18', borderRadius: 10, padding: 10 }}>
                    <s.icon size={20} color={s.color} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
            {/* Recent orders */}
            <div className="admin-card">
              <div className="admin-card-header">
                <span className="admin-card-title">Recent Orders</span>
                <Link to="/admin/orders" style={{ fontSize: 13, color: 'var(--gray-500)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>
              {ordersLoading ? (
                <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><span style={{ color: 'var(--gray-400)', fontSize: 13 }}>Loading…</span></div>
              ) : (
                <table className="admin-table">
                  <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead>
                  <tbody>
                    {recentOrders.map((o: any) => (
                      <tr key={o.id}>
                        <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{o.id}</strong><br /><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{o.date}</span></td>
                        <td>{o.customer}<br /><span style={{ fontSize: 11, color: 'var(--gray-400)' }}>{o.email}</span></td>
                        <td><strong>₱{o.amount.toFixed(2)}</strong></td>
                        <td><span className="status-badge" style={{ background: STATUS_COLORS[o.status] + '18', color: STATUS_COLORS[o.status] }}>{o.status}</span></td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && <tr><td colSpan={4} className="admin-table-empty">No orders yet</td></tr>}
                  </tbody>
                </table>
              )}
            </div>

            {/* Low stock */}
            <div className="admin-card">
              <div className="admin-card-header">
                <span className="admin-card-title">⚠️ Low Stock</span>
                <Link to="/admin/products" style={{ fontSize: 13, color: 'var(--gray-500)' }}>Manage</Link>
              </div>
              <table className="admin-table">
                <thead><tr><th>Product</th><th>Stock</th></tr></thead>
                <tbody>
                  {(analytics?.lowStockProducts ?? []).map((p: any) => (
                    <tr key={p.id}>
                      <td style={{ fontSize: 13 }}>{p.name}</td>
                      <td><span style={{ color: p.stock < 5 ? 'var(--red)' : '#f59e0b', fontWeight: 700, fontSize: 13 }}>{p.stock}</span></td>
                    </tr>
                  ))}
                  {(analytics?.lowStockProducts ?? []).length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', padding: 20, color: 'var(--gray-400)', fontSize: 13 }}>✓ All products well-stocked</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* All products table */}
          <div className="admin-card" style={{ marginTop: 0 }}>
            <div className="admin-card-header">
              <span className="admin-card-title">All Products — Stock Overview</span>
            </div>
            <table className="admin-table">
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th></tr></thead>
              <tbody>
                {(analytics?.products ?? []).map((p: any) => (
                  <tr key={p.id}>
                    <td><strong style={{ fontSize: 13 }}>{p.name}</strong></td>
                    <td style={{ textTransform: 'capitalize', color: 'var(--gray-500)', fontSize: 13 }}>{p.category}</td>
                    <td style={{ fontWeight: 600 }}>₱{p.price}</td>
                    <td><span style={{ color: p.stock < 10 ? 'var(--red)' : p.stock < 20 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{p.stock}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 80, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, (p.stock / 50) * 100)}%`, background: p.stock < 10 ? 'var(--red)' : p.stock < 20 ? '#f59e0b' : '#22c55e', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>{p.stock}/50</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  )
}
