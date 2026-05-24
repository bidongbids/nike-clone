import { useState, useMemo } from 'react'
import { Plus, Pencil, Trash2, X, Search, Package, Loader, Minus } from 'lucide-react'
import { useAdminProducts } from '../../lib/hooks'
import { createProductWithSizes, updateProduct, deleteProduct, syncProductSizes, fetchProductSizes } from '../../lib/api'
import AdminLayout from './AdminLayout'
import ImageUpload from '../../components/ImageUpload'
import { Can, RequirePermission } from '../../components/Guards'
import type { Product } from '../../types'

interface SizeStock { size: number; stock: number }

type FormData = {
  name: string
  category: string
  price: string
  sale_price_str: string
  image: string
  description: string
  sizeStocks: SizeStock[]   // [{ size: 9, stock: 5 }, ...]
  colors: string[]
}

const EMPTY: FormData = {
  name: '', category: 'men', price: '', sale_price_str: '',
  image: '', description: '', sizeStocks: [], colors: ['#111'],
}

const ALL_SIZES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 14]

const SIZE_PRESETS: { label: string; sizes: number[] }[] = [
  { label: 'Standard',    sizes: [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 12] },
  { label: "Men's only",  sizes: [8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13] },
  { label: "Women's only", sizes: [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10] },
  { label: 'All sizes',   sizes: ALL_SIZES },
  { label: 'Clear',       sizes: [] },
]

// Common shoe colors
const COLOR_PRESETS: { name: string; hex: string }[] = [
  { name: 'Black',     hex: '#111111' },
  { name: 'White',     hex: '#ffffff' },
  { name: 'Grey',      hex: '#737373' },
  { name: 'Red',       hex: '#dc2626' },
  { name: 'Blue',      hex: '#2563eb' },
  { name: 'Navy',      hex: '#1e3a8a' },
  { name: 'Green',     hex: '#16a34a' },
  { name: 'Yellow',    hex: '#fbbf24' },
  { name: 'Volt',      hex: '#e5ff00' },
  { name: 'Orange',    hex: '#ea580c' },
  { name: 'Pink',      hex: '#ec4899' },
  { name: 'Purple',    hex: '#7c3aed' },
  { name: 'Brown',     hex: '#92400e' },
  { name: 'Beige',     hex: '#f5e6d3' },
  { name: 'Sky Blue',  hex: '#0ea5e9' },
  { name: 'Cream',     hex: '#fef3c7' },
]

export default function AdminProducts() {
  const { data: products, loading, refetch } = useAdminProducts()
  const [modal, setModal] = useState<'add'|'edit'|null>(null)
  const [editId, setEditId] = useState<number|null>(null)
  const [form, setForm] = useState<FormData>(EMPTY)
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [deleteConfirm, setDeleteConfirm] = useState<number|null>(null)
  const [saving, setSaving] = useState(false)
  const [bulkStock, setBulkStock] = useState('10')

  const totalStock = useMemo(
    () => form.sizeStocks.reduce((s, x) => s + (x.stock || 0), 0),
    [form.sizeStocks]
  )

  const filtered = useMemo(() => {
    let items = [...(products ?? [])]
    if (search) items = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    if (catFilter !== 'all') items = items.filter((p) => p.category === catFilter)
    return items
  }, [products, search, catFilter])

  const openAdd = () => { setForm(EMPTY); setModal('add') }

  const openEdit = async (p: Product) => {
    // Load real per-size stock from DB
    try {
      const realSizes = await fetchProductSizes(p.id)
      setForm({
        name: p.name,
        category: p.category,
        price: String(p.price),
        sale_price_str: p.sale_price ? String(p.sale_price) : '',
        image: p.image,
        description: p.description,
        sizeStocks: realSizes.length > 0 ? realSizes : (p.sizes ?? []).map((s) => ({ size: s, stock: 0 })),
        colors: p.colors && p.colors.length > 0 ? p.colors : ['#111'],
      })
    } catch {
      setForm({
        name: p.name,
        category: p.category,
        price: String(p.price),
        sale_price_str: p.sale_price ? String(p.sale_price) : '',
        image: p.image,
        description: p.description,
        sizeStocks: (p.sizes ?? []).map((s) => ({ size: s, stock: 0 })),
        colors: p.colors && p.colors.length > 0 ? p.colors : ['#111'],
      })
    }
    setEditId(p.id)
    setModal('edit')
  }

  const close = () => { setModal(null); setEditId(null) }

  const setField = <K extends keyof FormData>(k: K) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement|HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // ── Color management ──
  const toggleColor = (hex: string) => {
    setForm((f) => ({
      ...f,
      colors: f.colors.includes(hex) ? f.colors.filter((c) => c !== hex) : [...f.colors, hex],
    }))
  }
  const removeColor = (hex: string) => {
    setForm((f) => ({ ...f, colors: f.colors.filter((c) => c !== hex) }))
  }
  const [customColor, setCustomColor] = useState('#000000')
  const addCustomColor = () => {
    if (!form.colors.includes(customColor)) {
      setForm((f) => ({ ...f, colors: [...f.colors, customColor] }))
    }
  }

  // Add/remove a size with default stock
  const toggleSize = (size: number) => {
    setForm((f) => {
      const has = f.sizeStocks.find((x) => x.size === size)
      const newStocks = has
        ? f.sizeStocks.filter((x) => x.size !== size)
        : [...f.sizeStocks, { size, stock: 0 }].sort((a, b) => a.size - b.size)
      return { ...f, sizeStocks: newStocks }
    })
  }

  // Update stock for a specific size
  const updateStock = (size: number, delta: number) => {
    setForm((f) => ({
      ...f,
      sizeStocks: f.sizeStocks.map((x) =>
        x.size === size ? { ...x, stock: Math.max(0, x.stock + delta) } : x
      ),
    }))
  }
  const setStock = (size: number, value: string) => {
    const n = Math.max(0, parseInt(value, 10) || 0)
    setForm((f) => ({
      ...f,
      sizeStocks: f.sizeStocks.map((x) => x.size === size ? { ...x, stock: n } : x),
    }))
  }

  // Apply preset (replaces with stock=0 for each)
  const applyPreset = (sizes: number[]) => {
    setForm((f) => ({
      ...f,
      sizeStocks: sizes.map((s) => {
        const existing = f.sizeStocks.find((x) => x.size === s)
        return existing ?? { size: s, stock: 0 }
      }),
    }))
  }

  // Apply same stock value to all current sizes
  const applyBulkStock = () => {
    const n = Math.max(0, parseInt(bulkStock, 10) || 0)
    setForm((f) => ({
      ...f,
      sizeStocks: f.sizeStocks.map((x) => ({ ...x, stock: n })),
    }))
  }

  const handleSave = async () => {
    if (!form.name || !form.price) return
    if (form.sizeStocks.length === 0) {
      alert('Please select at least one size for this product.')
      return
    }
    if (form.colors.length === 0) {
      alert('Please add at least one color for this product.')
      return
    }
    setSaving(true)
    try {
      const productData = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        sale_price: form.sale_price_str ? Number(form.sale_price_str) : null,
        image: form.image || 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
        description: form.description,
        stock: totalStock,
        colors: form.colors,
        sizes: form.sizeStocks.map((x) => x.size),
        badge: form.sale_price_str ? 'sale' : null,
        is_active: true,
      }

      if (modal === 'add') {
        await createProductWithSizes(productData, form.sizeStocks)
      } else if (editId) {
        await updateProduct(editId, productData)
        await syncProductSizes(editId, form.sizeStocks)
      }
      await refetch()
      close()
    } catch (err: any) { alert(err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    setSaving(true)
    try {
      await deleteProduct(id)
      await refetch()
      setDeleteConfirm(null)
    } catch (err: any) {
      if (err.message && err.message.includes('deactivated')) {
        await refetch()
        setDeleteConfirm(null)
        alert(err.message)
      } else {
        alert(err.message || 'Failed to delete product')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Products {products ? `(${products.length})` : ''}</h2>
        <Can do="products:create">
          <button onClick={openAdd} className="btn btn-primary btn-sm"><Plus size={16} /> Add Product</button>
        </Can>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="admin-search" style={{ flex: 1 }}>
          <Search size={16} color="var(--gray-400)" />
          <input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <select className="sort-select" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ borderRadius: 8 }}>
          <option value="all">All Categories</option>
          <option value="men">Men</option>
          <option value="women">Women</option>
          <option value="lifestyle">Lifestyle</option>
          <option value="basketball">Basketball</option>
        </select>
        <span style={{ fontSize: 13, color: 'var(--gray-500)', alignSelf: 'center' }}>
          {filtered.length} of {products?.length ?? '…'}
        </span>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader size={28} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-table-empty">
            <Package size={40} strokeWidth={1} color="var(--gray-300)" style={{ margin: '0 auto 12px' }} />
            <p>No products found</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Total Stock</th><th>Sizes</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} style={{ opacity: p.is_active === false ? 0.5 : 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={p.image} alt={p.name} style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover', background: 'var(--gray-100)', flexShrink: 0 }} />
                      <strong style={{ fontSize: 14 }}>{p.name}</strong>
                    </div>
                  </td>
                  <td><span style={{ textTransform: 'capitalize', background: 'var(--gray-100)', padding: '4px 10px', borderRadius: 50, fontSize: 12, fontWeight: 600 }}>{p.category}</span></td>
                  <td>
                    {p.sale_price
                      ? <><span style={{ color: 'var(--red)', fontWeight: 700 }}>₱{p.sale_price}</span>{' '}<span style={{ color: 'var(--gray-400)', textDecoration: 'line-through', fontSize: 12 }}>₱{p.price}</span></>
                      : <strong>₱{p.price}</strong>}
                  </td>
                  <td><span style={{ color: p.stock < 10 ? 'var(--red)' : p.stock < 20 ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>{p.stock}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--gray-600)' }}>{p.sizes.length} sizes</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Can do="products:update">
                        <button onClick={() => openEdit(p)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1.5px solid #3b82f6', color: '#3b82f6', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                          <Pencil size={13} /> Edit
                        </button>
                      </Can>
                      <Can do="products:delete">
                        <button onClick={() => setDeleteConfirm(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1.5px solid var(--red)', color: 'var(--red)', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
                          <Trash2 size={13} /> Delete
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <RequirePermission permission={modal === 'add' ? 'products:create' : 'products:update'}>
          <div className="modal-overlay" onClick={close}>
            <div className="modal" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 20 }}>{modal === 'add' ? 'Add New Product' : 'Edit Product'}</h3>
                <button onClick={close}><X size={20} /></button>
              </div>
              <div className="admin-modal-grid">
                <div className="form-group full"><label className="form-label">Product Name *</label><input className="form-input" value={form.name} onChange={setField('name')} placeholder="Air Max 270" /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-input" value={form.category} onChange={setField('category')}><option value="men">Men</option><option value="women">Women</option><option value="lifestyle">Lifestyle</option><option value="basketball">Basketball</option></select></div>
                <div className="form-group"><label className="form-label">Total Stock <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(calculated)</span></label><input className="form-input" value={totalStock} disabled style={{ background: 'var(--gray-50)' }} /></div>
                <div className="form-group"><label className="form-label">Price (₱) *</label><input className="form-input" type="number" min={0} value={form.price} onChange={setField('price')} placeholder="7500" /></div>
                <div className="form-group"><label className="form-label">Sale Price (₱) <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>optional</span></label><input className="form-input" type="number" min={0} value={form.sale_price_str} onChange={setField('sale_price_str')} placeholder="blank = no sale" /></div>

                <div className="form-group full">
                  <label className="form-label">Product Image</label>
                  <ImageUpload value={form.image} onChange={(url) => setForm((f) => ({ ...f, image: url }))} bucket="product-images" />
                </div>

                {/* ── Sizes + Per-Size Stock ── */}
                <div className="form-group full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                    <label className="form-label" style={{ margin: 0 }}>
                      Sizes & Stock per Size *
                      <span style={{ marginLeft: 6, color: 'var(--gray-400)', fontWeight: 400 }}>
                        ({form.sizeStocks.length} sizes · {totalStock} total units)
                      </span>
                    </label>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {SIZE_PRESETS.map((preset) => (
                        <button key={preset.label} type="button" onClick={() => applyPreset(preset.sizes)}
                          style={{ fontSize: 11, padding: '4px 9px', background: 'var(--gray-50)', border: '1px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', color: 'var(--gray-600)' }}>
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Size grid — click to add/remove */}
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Click sizes to enable them:</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 12 }}>
                    {ALL_SIZES.map((s) => {
                      const enabled = form.sizeStocks.some((x) => x.size === s)
                      return (
                        <button key={s} type="button" onClick={() => toggleSize(s)}
                          style={{
                            padding: '6px 4px', fontSize: 12, fontWeight: enabled ? 700 : 500,
                            border: `1.5px solid ${enabled ? 'var(--black)' : 'var(--gray-200)'}`,
                            background: enabled ? 'var(--black)' : 'var(--white)',
                            color: enabled ? 'var(--white)' : 'var(--black)',
                            borderRadius: 6, cursor: 'pointer', transition: 'all 0.12s',
                          }}>
                          {s}
                        </button>
                      )
                    })}
                  </div>

                  {/* Stock per size */}
                  {form.sizeStocks.length > 0 && (
                    <>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8, fontSize: 12 }}>
                        <span style={{ color: 'var(--gray-600)', fontWeight: 600 }}>Bulk-set stock:</span>
                        <input
                          type="number"
                          min={0}
                          value={bulkStock}
                          onChange={(e) => setBulkStock(e.target.value)}
                          style={{ width: 70, padding: '4px 8px', border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 12 }}
                        />
                        <button type="button" onClick={applyBulkStock}
                          style={{ padding: '4px 12px', background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                          Apply to all sizes
                        </button>
                      </div>

                      <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', padding: '8px 14px', background: 'var(--gray-50)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--gray-500)', borderBottom: '1px solid var(--gray-200)' }}>
                          <span>Size (US)</span>
                          <span>Stock</span>
                          <span style={{ textAlign: 'right' }}>Status</span>
                        </div>
                        {form.sizeStocks.map((item) => {
                          const status = item.stock === 0 ? 'Out' : item.stock < 5 ? 'Low' : 'OK'
                          const color = item.stock === 0 ? 'var(--red)' : item.stock < 5 ? '#f59e0b' : '#22c55e'
                          return (
                            <div key={item.size} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 90px', padding: '8px 14px', borderBottom: '1px solid var(--gray-100)', alignItems: 'center' }}>
                              <strong style={{ fontSize: 13 }}>US {item.size}</strong>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button type="button" onClick={() => updateStock(item.size, -1)}
                                  style={{ width: 26, height: 26, border: '1px solid var(--gray-200)', borderRadius: 6, background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Minus size={12} />
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  value={item.stock}
                                  onChange={(e) => setStock(item.size, e.target.value)}
                                  style={{ width: 60, padding: '4px 8px', border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 13, textAlign: 'center' }}
                                />
                                <button type="button" onClick={() => updateStock(item.size, 1)}
                                  style={{ width: 26, height: 26, border: '1px solid var(--gray-200)', borderRadius: 6, background: 'var(--white)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Plus size={12} />
                                </button>
                                <button type="button" onClick={() => toggleSize(item.size)}
                                  style={{ marginLeft: 'auto', color: 'var(--gray-400)', padding: 4, cursor: 'pointer', background: 'none', border: 'none' }}>
                                  <X size={14} />
                                </button>
                              </div>
                              <span style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color, background: color + '22', padding: '3px 10px', borderRadius: 50, justifySelf: 'end' }}>
                                {status}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}

                  {form.sizeStocks.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
                      Select at least one size for this product.
                    </p>
                  )}
                </div>

                {/* ── Color picker ── */}
                <div className="form-group full">
                  <label className="form-label">
                    Product Colors
                    <span style={{ marginLeft: 6, color: 'var(--gray-400)', fontWeight: 400 }}>
                      ({form.colors.length} selected)
                    </span>
                  </label>

                  {/* Currently selected colors */}
                  {form.colors.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 12, background: 'var(--gray-50)', borderRadius: 10, marginBottom: 10 }}>
                      {form.colors.map((hex) => (
                        <div key={hex} style={{ position: 'relative' }}>
                          <div
                            style={{
                              width: 40, height: 40, borderRadius: '50%',
                              background: hex, border: '2px solid var(--gray-200)',
                              boxShadow: 'inset 0 0 0 2px var(--white)',
                            }}
                            title={hex}
                          />
                          <button
                            type="button"
                            onClick={() => removeColor(hex)}
                            style={{
                              position: 'absolute', top: -4, right: -4,
                              width: 18, height: 18, borderRadius: '50%',
                              background: 'var(--white)', border: '1.5px solid var(--gray-300)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: 0,
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Common color presets */}
                  <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 6 }}>Quick picks:</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {COLOR_PRESETS.map((c) => {
                      const selected = form.colors.includes(c.hex)
                      return (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => toggleColor(c.hex)}
                          title={c.name}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 10px 5px 5px',
                            background: selected ? 'var(--black)' : 'var(--white)',
                            color: selected ? 'var(--white)' : 'var(--gray-700)',
                            border: `1.5px solid ${selected ? 'var(--black)' : 'var(--gray-200)'}`,
                            borderRadius: 50, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            transition: 'all 0.12s',
                          }}
                        >
                          <span style={{
                            width: 18, height: 18, borderRadius: '50%',
                            background: c.hex, border: c.hex === '#ffffff' ? '1px solid var(--gray-300)' : 'none',
                            flexShrink: 0,
                          }} />
                          {c.name}
                          {selected && <span style={{ marginLeft: 2 }}>✓</span>}
                        </button>
                      )
                    })}
                  </div>

                  {/* Custom hex color picker */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 12px', background: 'var(--gray-50)', borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 600 }}>Custom:</span>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      style={{ width: 36, height: 28, padding: 0, border: '1px solid var(--gray-200)', borderRadius: 6, cursor: 'pointer', background: 'none' }}
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      style={{ width: 90, padding: '4px 8px', border: '1px solid var(--gray-200)', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
                      placeholder="#000000"
                    />
                    <button
                      type="button"
                      onClick={addCustomColor}
                      disabled={form.colors.includes(customColor)}
                      style={{ padding: '4px 14px', background: form.colors.includes(customColor) ? 'var(--gray-200)' : 'var(--black)', color: form.colors.includes(customColor) ? 'var(--gray-500)' : 'var(--white)', border: 'none', borderRadius: 6, fontSize: 12, cursor: form.colors.includes(customColor) ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                      {form.colors.includes(customColor) ? 'Already added' : '+ Add color'}
                    </button>
                  </div>
                  {form.colors.length === 0 && (
                    <p style={{ fontSize: 12, color: 'var(--red)', marginTop: 6 }}>
                      Add at least one color for this product.
                    </p>
                  )}
                </div>

                <div className="form-group full"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={setField('description')} rows={3} style={{ resize: 'vertical' }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button onClick={close} className="btn btn-secondary btn-sm">Cancel</button>
                <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={!form.name || !form.price || form.sizeStocks.length === 0 || form.colors.length === 0 || saving}>
                  {saving ? <><span className="spinner" /> Saving…</> : modal === 'add' ? 'Add Product' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </RequirePermission>
      )}

      {deleteConfirm !== null && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Trash2 size={40} color="var(--red)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ fontWeight: 700, fontSize: 20, marginBottom: 8 }}>Delete Product?</h3>
            <p style={{ color: 'var(--gray-500)', marginBottom: 24 }}>This hides the product from the store. Cannot be undone.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <Can do="products:delete">
                <button onClick={() => handleDelete(deleteConfirm!)} className="btn btn-danger btn-sm" disabled={saving}>
                  {saving ? <><span className="spinner" /> Deleting…</> : 'Delete'}
                </button>
              </Can>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
