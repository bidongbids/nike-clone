import { useState, useMemo } from 'react'
import { useAdminOrders, useAdminProducts, useAdminUsers } from '../../lib/hooks'
import { restockProduct } from '../../lib/api'
import AdminLayout from './AdminLayout'
import { TrendingUp, TrendingDown, Loader, Package, Plus, X, ChevronDown, Calendar } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
type ChartTab = 'revenue' | 'orders'
type DateRange = 'today' | '7d' | '30d' | '90d' | 'month' | 'year' | 'all'

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: 'Today',         value: 'today' },
  { label: 'Last 7 days',   value: '7d'    },
  { label: 'Last 30 days',  value: '30d'   },
  { label: 'Last 90 days',  value: '90d'   },
  { label: 'This month',    value: 'month' },
  { label: 'This year',     value: 'year'  },
  { label: 'All time',      value: 'all'   },
]

// Get start date for a given range
function rangeStart(range: DateRange): Date | null {
  const now = new Date()
  switch (range) {
    case 'today':   { const d = new Date(now); d.setHours(0,0,0,0); return d }
    case '7d':      { const d = new Date(now); d.setDate(d.getDate() - 7);  return d }
    case '30d':     { const d = new Date(now); d.setDate(d.getDate() - 30); return d }
    case '90d':     { const d = new Date(now); d.setDate(d.getDate() - 90); return d }
    case 'month':   return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'year':    return new Date(now.getFullYear(), 0, 1)
    case 'all':     return null
  }
}

// Previous-period start for comparison
function previousRange(range: DateRange): { start: Date | null; end: Date } {
  const now = new Date()
  switch (range) {
    case 'today':   { const e = new Date(now); e.setHours(0,0,0,0); const s = new Date(e); s.setDate(s.getDate()-1); return { start: s, end: e } }
    case '7d':      { const e = new Date(now); e.setDate(e.getDate()-7);  const s = new Date(e); s.setDate(s.getDate()-7);  return { start: s, end: e } }
    case '30d':     { const e = new Date(now); e.setDate(e.getDate()-30); const s = new Date(e); s.setDate(s.getDate()-30); return { start: s, end: e } }
    case '90d':     { const e = new Date(now); e.setDate(e.getDate()-90); const s = new Date(e); s.setDate(s.getDate()-90); return { start: s, end: e } }
    case 'month':   { const e = new Date(now.getFullYear(), now.getMonth(), 1); const s = new Date(now.getFullYear(), now.getMonth()-1, 1); return { start: s, end: e } }
    case 'year':    { const e = new Date(now.getFullYear(), 0, 1); const s = new Date(now.getFullYear()-1, 0, 1); return { start: s, end: e } }
    case 'all':     return { start: null, end: new Date(0) }
  }
}

export default function AdminAnalytics() {
  const [chartTab, setChartTab] = useState<ChartTab>('revenue')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [showRangeMenu, setShowRangeMenu] = useState(false)
  const [openCategory, setOpenCategory] = useState<string | null>('men')
  const [restockingId, setRestockingId] = useState<number | null>(null)
  const [restockQty, setRestockQty] = useState('20')
  const [restockSaving, setRestockSaving] = useState(false)

  const { data: orders, loading: ordersLoading, refetch: refetchOrders } = useAdminOrders()
  const { data: products, loading: productsLoading, refetch: refetchProducts } = useAdminProducts()
  const { data: users, loading: usersLoading } = useAdminUsers()

  const loading = ordersLoading || productsLoading || usersLoading

  // ── Filter orders by date range ─────────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    if (!orders) return []
    const start = rangeStart(dateRange)
    if (!start) return orders
    return orders.filter((o: any) => o.createdAt && new Date(o.createdAt) >= start)
  }, [orders, dateRange])

  const previousPeriodOrders = useMemo(() => {
    if (!orders) return []
    const { start, end } = previousRange(dateRange)
    if (!start) return []
    return orders.filter((o: any) => {
      const d = new Date(o.createdAt)
      return d >= start && d < end
    })
  }, [orders, dateRange])

  // ── KPIs with comparison ────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const valid    = filteredOrders.filter((o: any) => o.status !== 'Cancelled')
    const prevValid = previousPeriodOrders.filter((o: any) => o.status !== 'Cancelled')

    const totalRevenue = valid.reduce((s: number, o: any) => s + Number(o.amount), 0)
    const prevRevenue  = prevValid.reduce((s: number, o: any) => s + Number(o.amount), 0)
    const avgOrderValue = valid.length > 0 ? totalRevenue / valid.length : 0
    const prevAvg = prevValid.length > 0 ? prevRevenue / prevValid.length : 0

    const cancelledCount = filteredOrders.filter((o: any) => o.status === 'Cancelled').length
    const cancelRate     = filteredOrders.length > 0 ? (cancelledCount / filteredOrders.length) * 100 : 0
    const prevCancelRate = previousPeriodOrders.length > 0
      ? (previousPeriodOrders.filter((o: any) => o.status === 'Cancelled').length / previousPeriodOrders.length) * 100
      : 0

    const pct = (curr: number, prev: number) => prev === 0 ? null : ((curr - prev) / prev) * 100

    return [
      { label: 'Total Revenue',     value: `₱${totalRevenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`,   change: pct(totalRevenue, prevRevenue),   inverted: false },
      { label: 'Total Orders',      value: valid.length.toString(),                                                     change: pct(valid.length, prevValid.length), inverted: false },
      { label: 'Avg Order Value',   value: `₱${avgOrderValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`,   change: pct(avgOrderValue, prevAvg),     inverted: false },
      { label: 'Cancellation Rate', value: `${cancelRate.toFixed(1)}%`,                                                  change: pct(cancelRate, prevCancelRate), inverted: true },
      { label: 'Total Customers',   value: (users?.length ?? 0).toString(),                                              change: null,                            inverted: false },
      { label: 'Items Sold',        value: valid.reduce((s: number, o: any) => s + (o.orderItems?.reduce((x: number, i: any) => x + (i.qty ?? 0), 0) ?? 0), 0).toString(), change: null, inverted: false },
    ]
  }, [filteredOrders, previousPeriodOrders, users])

  // ── Top sellers ─────────────────────────────────────────────────────────────
  const topSellers = useMemo(() => {
    const map = new Map<number, { id: number; name: string; image: string; category: string; units: number; revenue: number }>()
    filteredOrders.forEach((o: any) => {
      if (o.status === 'Cancelled') return
      ;(o.orderItems ?? []).forEach((item: any) => {
        const p = item.products
        if (!p) return
        const existing = map.get(p.id) ?? { id: p.id, name: p.name, image: p.image, category: p.category, units: 0, revenue: 0 }
        existing.units += item.qty
        existing.revenue += Number(item.unit_price) * item.qty
        map.set(p.id, existing)
      })
    })
    return Array.from(map.values()).sort((a, b) => b.units - a.units).slice(0, 10)
  }, [filteredOrders])

  const totalRevAllSellers = topSellers.reduce((s, x) => s + x.revenue, 0)

  // ── Stock with sales-rate-based days-until-stockout ─────────────────────────
  // Daily sales rate for each product within the selected range
  const productSalesRate = useMemo(() => {
    const days = (() => {
      const start = rangeStart(dateRange)
      if (!start) {
        // For 'all time' use 30 days as a sensible default
        const oldest = orders?.reduce((earliest: Date, o: any) => {
          const d = new Date(o.createdAt)
          return d < earliest ? d : earliest
        }, new Date()) ?? new Date()
        return Math.max(1, Math.ceil((Date.now() - oldest.getTime()) / 86400000))
      }
      return Math.max(1, Math.ceil((Date.now() - start.getTime()) / 86400000))
    })()

    const sold = new Map<number, number>()
    filteredOrders.forEach((o: any) => {
      if (o.status === 'Cancelled') return
      ;(o.orderItems ?? []).forEach((item: any) => {
        if (!item.products) return
        sold.set(item.products.id, (sold.get(item.products.id) ?? 0) + item.qty)
      })
    })

    const result = new Map<number, number>()
    sold.forEach((qty, id) => result.set(id, qty / days))
    return result
  }, [filteredOrders, dateRange, orders])

  // Stock grouped by category with subtotals
  const stockByCategory = useMemo(() => {
    const grouped: Record<string, { items: any[]; totalUnits: number; totalValue: number }> = {
      men:        { items: [], totalUnits: 0, totalValue: 0 },
      women:      { items: [], totalUnits: 0, totalValue: 0 },
      lifestyle:  { items: [], totalUnits: 0, totalValue: 0 },
      basketball: { items: [], totalUnits: 0, totalValue: 0 },
    }
    ;(products ?? []).forEach((p: any) => {
      const cat = p.category
      if (grouped[cat]) {
        const dailyRate = productSalesRate.get(p.id) ?? 0
        const daysLeft = dailyRate > 0 ? Math.floor(p.stock / dailyRate) : Infinity
        grouped[cat].items.push({ ...p, dailyRate, daysLeft })
        grouped[cat].totalUnits += p.stock
        grouped[cat].totalValue += p.stock * Number(p.price)
      }
    })

    // Sort each group by criticality (days left ascending, then stock ascending)
    Object.values(grouped).forEach((g) => {
      g.items.sort((a, b) => {
        if (a.daysLeft !== b.daysLeft) return a.daysLeft - b.daysLeft
        return a.stock - b.stock
      })
    })
    return grouped
  }, [products, productSalesRate])

  // ── Chart data ──────────────────────────────────────────────────────────────
  const { monthlyRevenue, monthlyOrders } = useMemo(() => {
    const rev = Array(12).fill(0)
    const ord = Array(12).fill(0)
    const year = new Date().getFullYear()
    filteredOrders.forEach((o: any) => {
      if (o.status === 'Cancelled') return
      const d = new Date(o.createdAt)
      if (d.getFullYear() !== year) return
      const m = d.getMonth()
      rev[m] += Number(o.amount) || 0
      ord[m] += 1
    })
    return { monthlyRevenue: rev, monthlyOrders: ord }
  }, [filteredOrders])

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleRestock = async () => {
    if (!restockingId) return
    const qty = parseInt(restockQty, 10)
    if (!qty || qty < 1) return
    setRestockSaving(true)
    try {
      await restockProduct(restockingId, qty)
      await refetchProducts()
      await refetchOrders()
      setRestockingId(null)
      setRestockQty('20')
    } catch (err: any) {
      alert(err.message || 'Restock failed')
    } finally {
      setRestockSaving(false)
    }
  }

  if (loading) return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Loader size={32} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </AdminLayout>
  )

  const chartData = chartTab === 'revenue' ? monthlyRevenue : monthlyOrders
  const maxVal = Math.max(...chartData, 1)
  const chartColor = chartTab === 'revenue' ? '#111' : '#3b82f6'
  const chartPale = chartTab === 'revenue' ? '#e5e5e5' : '#bfdbfe'
  const currentRangeLabel = DATE_RANGES.find((r) => r.value === dateRange)?.label ?? ''

  return (
    <AdminLayout>
      {/* Header with date range filter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="admin-section-title">Analytics</h2>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowRangeMenu((s) => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--white)', border: '1.5px solid var(--gray-200)', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Calendar size={15} color="var(--gray-500)" />
            {currentRangeLabel}
            <ChevronDown size={14} style={{ transform: showRangeMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {showRangeMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: 200, overflow: 'hidden' }}>
              {DATE_RANGES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setDateRange(r.value); setShowRangeMenu(false) }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, textAlign: 'left', background: dateRange === r.value ? 'var(--gray-50)' : 'var(--white)', color: dateRange === r.value ? 'var(--black)' : 'var(--gray-600)', fontWeight: dateRange === r.value ? 700 : 400 }}
                >
                  {r.label} {dateRange === r.value && '✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {kpis.map((k) => {
          const isUp = (k.change ?? 0) > 0
          const isDown = (k.change ?? 0) < 0
          const goodChange = k.inverted ? isDown : isUp
          const color = k.change === null ? 'var(--gray-500)' : goodChange ? '#22c55e' : '#f04048'
          const Icon  = isUp ? TrendingUp : TrendingDown
          return (
            <div key={k.label} className="admin-card" style={{ padding: '20px 24px' }}>
              <p className="stat-label">{k.label}</p>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 30, margin: '4px 0' }}>{k.value}</p>
              <p style={{ fontSize: 12, color, display: 'flex', alignItems: 'center', gap: 4 }}>
                {k.change !== null && (isUp || isDown) ? (
                  <><Icon size={13} /> {Math.abs(k.change).toFixed(1)}% vs previous period</>
                ) : (
                  <span style={{ color: 'var(--gray-500)' }}>Live from database</span>
                )}
              </p>
            </div>
          )
        })}
      </div>

      {/* Top sellers + Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Chart */}
        <div className="admin-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15 }}>
              Monthly {chartTab === 'revenue' ? 'Revenue' : 'Orders'} · {new Date().getFullYear()}
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['revenue','orders'] as ChartTab[]).map((t) => (
                <button key={t} onClick={() => setChartTab(t)}
                  style={{ padding: '5px 14px', borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                    borderColor: chartTab === t ? 'var(--black)' : 'var(--gray-200)',
                    background: chartTab === t ? 'var(--black)' : 'var(--white)',
                    color: chartTab === t ? 'var(--white)' : 'var(--gray-600)' }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="bar-chart">
            {chartData.map((v, i) => (
              <div key={i} className="bar-col">
                <span className="bar-val">
                  {chartTab === 'revenue'
                    ? (v >= 1000 ? `₱${(v/1000).toFixed(0)}k` : v > 0 ? `₱${v.toFixed(0)}` : '')
                    : v > 0 ? v : ''}
                </span>
                <div className="bar" style={{ height: `${(v/maxVal) * 160}px`, background: v > 0 ? chartColor : chartPale, minHeight: v > 0 ? 4 : 0 }} />
                <span className="bar-label">{MONTHS[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top sellers — quick view */}
        <div className="admin-card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>🏆 Top Sellers ({currentRangeLabel})</h3>
          {topSellers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--gray-400)', fontSize: 13 }}>
              No sales in this period yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {topSellers.slice(0, 5).map((p, i) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: i === 0 ? '#f59e0b' : 'var(--gray-400)', minWidth: 16 }}>#{i+1}</div>
                  <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'var(--gray-100)', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--gray-500)' }}>{p.units} sold</p>
                  </div>
                  <strong style={{ fontSize: 13 }}>₱{(p.revenue/1000).toFixed(1)}k</strong>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top sellers — full table */}
      {topSellers.length > 0 && (
        <div className="admin-card" style={{ padding: 24, marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Best Sellers — {currentRangeLabel}</h3>
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th><th>Product</th><th>Category</th><th>Units Sold</th><th>Revenue</th><th>% of Sales</th>
              </tr>
            </thead>
            <tbody>
              {topSellers.map((p, i) => (
                <tr key={p.id}>
                  <td><strong style={{ color: i < 3 ? '#f59e0b' : 'var(--gray-400)' }}>#{i+1}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'var(--gray-100)' }} />
                      <strong style={{ fontSize: 14 }}>{p.name}</strong>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--gray-500)', fontSize: 13 }}>{p.category}</td>
                  <td><strong>{p.units}</strong></td>
                  <td><strong>₱{p.revenue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</strong></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 80, height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${totalRevAllSellers > 0 ? (p.revenue / totalRevAllSellers) * 100 : 0}%`, background: 'var(--black)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--gray-500)', minWidth: 32 }}>
                        {totalRevAllSellers > 0 ? ((p.revenue / totalRevAllSellers) * 100).toFixed(0) : 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock levels grouped by category */}
      <div className="admin-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontWeight: 700, fontSize: 15 }}>📦 Stock Levels by Category</h3>
          <div style={{ display: 'flex', gap: 16, fontSize: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#22c55e' }} /> Healthy (&gt;30 days)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b' }} /> Low (7–30 days)</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f04048' }} /> Critical (&lt;7 days)</span>
          </div>
        </div>

        {(['men','women','lifestyle','basketball'] as const).map((cat) => {
          const group = stockByCategory[cat]
          if (group.items.length === 0) return null
          const critical = group.items.filter((p) => p.daysLeft < 7).length
          const isOpen = openCategory === cat
          return (
            <div key={cat} style={{ marginBottom: 12 }}>
              {/* Clickable category header */}
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '12px 16px',
                  background: isOpen ? 'var(--gray-100)' : 'var(--gray-50)',
                  borderRadius: 8,
                  alignItems: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = '#ececec' }}
                onMouseOut={(e) => { if (!isOpen) (e.currentTarget as HTMLButtonElement).style.background = 'var(--gray-50)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: 'var(--gray-500)' }} />
                  <strong style={{ textTransform: 'capitalize', fontSize: 14 }}>{cat}</strong>
                </div>
                <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--gray-600)', flexWrap: 'wrap' }}>
                  <span><strong>{group.items.length}</strong> products</span>
                  <span><strong>{group.totalUnits}</strong> units</span>
                  <span><strong>₱{group.totalValue.toLocaleString('en-PH', { maximumFractionDigits: 0 })}</strong> inventory value</span>
                  {critical > 0 && (
                    <span style={{ color: '#f04048', fontWeight: 700 }}>⚠ {critical} critical</span>
                  )}
                </div>
              </button>

              {/* Items — only shown when expanded */}
              {isOpen && (
              <table className="admin-table" style={{ background: 'transparent', marginTop: 10 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ width: 90 }}>Stock</th>
                    <th style={{ width: 110 }}>Daily Sales</th>
                    <th style={{ width: 130 }}>Days Until Out</th>
                    <th style={{ width: 100 }}>Status</th>
                    <th style={{ width: 110 }}>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((p) => {
                    const daysLeft = p.daysLeft
                    const color = daysLeft < 7 ? '#f04048' : daysLeft < 30 ? '#f59e0b' : '#22c55e'
                    const showCritical = daysLeft < 7
                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img src={p.image} alt="" style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover', background: 'var(--gray-100)' }} />
                            <strong style={{ fontSize: 13 }}>{p.name}</strong>
                          </div>
                        </td>
                        <td><strong>{p.stock}</strong></td>
                        <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>
                          {p.dailyRate > 0 ? `${p.dailyRate.toFixed(1)}/day` : <span style={{ color: 'var(--gray-300)' }}>No sales</span>}
                        </td>
                        <td>
                          {daysLeft === Infinity
                            ? <span style={{ color: 'var(--gray-400)', fontSize: 13 }}>—</span>
                            : <strong style={{ color }}>{daysLeft} days</strong>
                          }
                        </td>
                        <td>
                          <span style={{ background: color + '22', color, padding: '3px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700 }}>
                            {daysLeft < 7 ? 'Critical' : daysLeft < 30 ? 'Low' : 'Healthy'}
                          </span>
                        </td>
                        <td>
                          {showCritical && (
                            <button
                              onClick={() => { setRestockingId(p.id); setRestockQty('20') }}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', background: '#f04048', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                            >
                              <Plus size={12} /> Reorder
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              )}
            </div>
          )
        })}
      </div>

      {/* Restock modal */}
      {restockingId !== null && (
        <div className="modal-overlay" onClick={() => setRestockingId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontWeight: 700, fontSize: 18 }}>Restock Product</h3>
              <button onClick={() => setRestockingId(null)}><X size={18} /></button>
            </div>
            {(() => {
              const p = products?.find((p: any) => p.id === restockingId)
              if (!p) return null
              return (
                <>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', padding: 14, background: 'var(--gray-50)', borderRadius: 10 }}>
                    <img src={p.image} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', background: 'var(--gray-100)' }} />
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{p.name}</strong>
                      <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>Current stock: <strong>{p.stock}</strong> units</p>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 18 }}>
                    <label className="form-label">Add Units</label>
                    <input
                      className="form-input"
                      type="number"
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(e.target.value)}
                      autoFocus
                    />
                    <p style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>
                      New stock will be: <strong>{p.stock + (parseInt(restockQty, 10) || 0)}</strong> units
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => setRestockingId(null)} className="btn btn-secondary btn-sm">Cancel</button>
                    <button onClick={handleRestock} className="btn btn-primary btn-sm" disabled={restockSaving || !parseInt(restockQty, 10)}>
                      {restockSaving ? <><span className="spinner" /> Saving…</> : <><Package size={14} /> Confirm Reorder</>}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
