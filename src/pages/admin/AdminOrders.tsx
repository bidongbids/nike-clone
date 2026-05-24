import { useState, useMemo } from 'react'
import { Search, X, Loader } from 'lucide-react'
import AdminLayout from './AdminLayout'
import { Can } from '../../components/Guards'
import { useAdminOrders } from '../../lib/hooks'
import { updateOrderStatus } from '../../lib/api'
import type { OrderRow } from '../../types'

const STATUS_COLORS: Record<OrderRow['status'], string> = {
  Delivered: '#22c55e', Processing: '#f59e0b', Shipped: '#3b82f6', Cancelled: '#f04048',
}
const ALL_STATUSES: OrderRow['status'][] = ['Processing','Shipped','Delivered','Cancelled']

export default function AdminOrders() {
  const { data: orders, loading, refetch } = useAdminOrders()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderRow['status']|'All'>('All')
  const [editingStatus, setEditingStatus] = useState<string|null>(null)
  const [saving, setSaving] = useState<string|null>(null)

  const filtered = useMemo(() => {
    let items = [...(orders ?? [])]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((o) => o.customer.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
    }
    if (statusFilter !== 'All') items = items.filter((o) => o.status === statusFilter)
    return items
  }, [orders, search, statusFilter])

  const counts = useMemo(() => {
    const c: Record<string,number> = { All: orders?.length ?? 0 }
    ALL_STATUSES.forEach((s) => { c[s] = (orders ?? []).filter((o) => o.status === s).length })
    return c
  }, [orders])

  const handleStatusChange = async (rawId: string, status: OrderRow['status']) => {
    setSaving(rawId)
    try { await updateOrderStatus(rawId, status); await refetch(); setEditingStatus(null) }
    catch (err: any) { alert(err.message) }
    finally { setSaving(null) }
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Orders</h2>
        <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{filtered.length} results</span>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="admin-search" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--gray-400)" />
          <input placeholder="Search by customer, email, order ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {(['All', ...ALL_STATUSES] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} style={{
              padding: '7px 14px', borderRadius: 50, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: '1.5px solid',
              borderColor: statusFilter === s ? (s === 'All' ? 'var(--black)' : STATUS_COLORS[s as OrderRow['status']]) : 'var(--gray-200)',
              background: statusFilter === s ? (s === 'All' ? 'var(--black)' : STATUS_COLORS[s as OrderRow['status']] + '18') : 'var(--white)',
              color: statusFilter === s ? (s === 'All' ? 'var(--white)' : STATUS_COLORS[s as OrderRow['status']]) : 'var(--gray-600)',
            }}>
              {s} <span style={{ opacity: 0.7, marginLeft: 4 }}>({counts[s] ?? 0})</span>
            </button>
          ))}
        </div>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader size={28} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Amount</th><th>Date</th><th>Address</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map((o: any) => (
                <tr key={o.id}>
                  <td><strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{o.id}</strong></td>
                  <td>
                    <strong style={{ fontSize: 13 }}>{o.customer}</strong><br />
                    <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{o.email}</span>
                  </td>
                  <td style={{ color: 'var(--gray-600)' }}>{o.items}</td>
                  <td><strong>₱{o.amount.toFixed(2)}</strong></td>
                  <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{o.date}</td>
                  <td style={{ fontSize: 13, color: 'var(--gray-600)', maxWidth: 160 }}>{o.address}</td>
                  <td>
                    <Can do="orders:update_status"
                      fallback={<span className="status-badge" style={{ background: STATUS_COLORS[o.status as OrderRow['status']] + '18', color: STATUS_COLORS[o.status as OrderRow['status']] }}>{o.status}</span>}>
                      {editingStatus === o.rawId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 130 }}>
                          {ALL_STATUSES.map((s) => (
                            <button key={s} onClick={() => handleStatusChange(o.rawId, s)}
                              className="status-badge" style={{ background: STATUS_COLORS[s] + '18', color: STATUS_COLORS[s], cursor: 'pointer', fontSize: 12, opacity: saving === o.rawId ? 0.5 : 1 }}>
                              {s}
                            </button>
                          ))}
                          <button onClick={() => setEditingStatus(null)} style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditingStatus(o.rawId)}
                          className="status-badge" style={{ background: STATUS_COLORS[o.status as OrderRow['status']] + '18', color: STATUS_COLORS[o.status as OrderRow['status']], cursor: 'pointer' }}
                          title="Click to change status">
                          {o.status} ▾
                        </button>
                      )}
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-table-empty">No orders found.</div>}
      </div>
    </AdminLayout>
  )
}
