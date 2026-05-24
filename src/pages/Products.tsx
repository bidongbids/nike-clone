import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, Search, Loader } from 'lucide-react'
import { useProducts } from '../lib/hooks'
import ProductCard from '../components/ProductCard'
import type { Category, SortOption } from '../types'
import './Products.css'

const CATEGORIES: Category[] = ['all', 'men', 'women', 'lifestyle', 'basketball']
const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Featured',          value: 'featured'   },
  { label: 'Price: Low → High', value: 'price_asc'  },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Newest',            value: 'new'         },
]
const ALL_SIZES = [7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 13]

export default function Products() {
  const [searchParams] = useSearchParams()
  const catParam = searchParams.get('cat') ?? ''
  const urlQuery = searchParams.get('q') ?? ''

  const { data: products, loading } = useProducts()

  const [searchQuery, setSearchQuery] = useState(urlQuery)
  const [selectedCat, setSelectedCat] = useState<Category>(() =>
    CATEGORIES.includes(catParam as Category) && !['new','sale'].includes(catParam)
      ? (catParam as Category) : 'all'
  )
  const [sort, setSort] = useState<SortOption>('featured')
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 20000])
  const [selectedSizes, setSelectedSizes] = useState<number[]>([])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  useEffect(() => { setSearchQuery(urlQuery) }, [urlQuery])

  // Sync category selection when URL changes (clicking navbar links)
  useEffect(() => {
    if (CATEGORIES.includes(catParam as Category) && !['new','sale'].includes(catParam)) {
      setSelectedCat(catParam as Category)
    } else if (!catParam) {
      setSelectedCat('all')
    }
  }, [catParam])

  const filtered = useMemo(() => {
    let items = [...(products ?? [])]
    if (catParam === 'new')  items = items.filter((p) => p.badge === 'new')
    else if (catParam === 'sale') items = items.filter((p) => p.badge === 'sale')
    else if (selectedCat !== 'all') items = items.filter((p) => p.category === selectedCat)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter((p) => p.name.toLowerCase().includes(q) || p.category.includes(q))
    }
    items = items.filter((p) => {
      const price = p.sale_price ?? p.price
      return price >= priceRange[0] && price <= priceRange[1]
    })
    if (selectedSizes.length) items = items.filter((p) => selectedSizes.some((s) => p.sizes.includes(s)))
    if (inStockOnly) items = items.filter((p) => p.stock > 0)
    if (sort === 'price_asc')  items.sort((a, b) => (a.sale_price ?? a.price) - (b.sale_price ?? b.price))
    if (sort === 'price_desc') items.sort((a, b) => (b.sale_price ?? b.price) - (a.sale_price ?? a.price))
    if (sort === 'new') items.sort((a) => (a.badge === 'new' ? -1 : 1))
    return items
  }, [products, searchQuery, selectedCat, catParam, sort, priceRange, selectedSizes, inStockOnly])

  const activeFilterCount = [
    selectedCat !== 'all' ? 1 : 0,
    priceRange[0] > 0 || priceRange[1] < 20000 ? 1 : 0,
    selectedSizes.length > 0 ? 1 : 0,
    inStockOnly ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const clearAll = () => { setSelectedCat('all'); setPriceRange([0, 20000]); setSelectedSizes([]); setInStockOnly(false); setSearchQuery('') }
  const toggleSize = (s: number) => setSelectedSizes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])

  const pageTitle = catParam === 'sale' ? 'Sale' : catParam === 'new' ? 'New Arrivals'
    : selectedCat !== 'all' ? selectedCat.charAt(0).toUpperCase() + selectedCat.slice(1) : 'All Shoes'

  return (
    <div style={{ paddingTop: 'var(--nav-h)' }}>
      <div className="products-header container">
        <div>
          <h1 className="products-title">{pageTitle}</h1>
          <span className="products-count">
            {loading ? <Loader size={13} className="spin" /> : filtered.length} Products
          </span>
        </div>
        <div className="products-controls">
          <div className="live-search-wrap">
            <Search size={16} className="live-search-icon" />
            <input className="live-search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products…" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="live-search-clear"><X size={14} /></button>}
          </div>
          <button className={`filter-toggle btn btn-secondary btn-sm${activeFilterCount > 0 ? ' has-filters' : ''}`} onClick={() => setFilterOpen((s) => !s)}>
            <SlidersHorizontal size={16} /> Filters
            {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
          </button>
          <select className="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}>
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {(activeFilterCount > 0 || searchQuery) && (
        <div className="container active-filters">
          {searchQuery && <span className="active-chip">"{searchQuery}" <button onClick={() => setSearchQuery('')}><X size={12} /></button></span>}
          {selectedCat !== 'all' && <span className="active-chip">{selectedCat} <button onClick={() => setSelectedCat('all')}><X size={12} /></button></span>}
          {(priceRange[0] > 0 || priceRange[1] < 20000) && <span className="active-chip">₱{priceRange[0]}–₱{priceRange[1]} <button onClick={() => setPriceRange([0, 20000])}><X size={12} /></button></span>}
          {selectedSizes.map((s) => <span key={s} className="active-chip">US {s} <button onClick={() => toggleSize(s)}><X size={12} /></button></span>)}
          {inStockOnly && <span className="active-chip">In Stock <button onClick={() => setInStockOnly(false)}><X size={12} /></button></span>}
          <button className="clear-all-btn" onClick={clearAll}>Clear all</button>
        </div>
      )}

      <div className="products-body container">
        <aside className={`filter-sidebar${filterOpen ? ' open' : ''}`}>
          <div className="filter-header">
            <span>Filters {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}</span>
            <button onClick={() => setFilterOpen(false)}><X size={18} /></button>
          </div>
          {activeFilterCount > 0 && <button className="clear-all-btn sidebar-clear" onClick={clearAll}>Clear all filters</button>}

          {!catParam && (
            <div className="filter-group">
              <h4 className="filter-label">Category</h4>
              {CATEGORIES.map((c) => (
                <button key={c} className={`filter-chip${selectedCat === c ? ' active' : ''}`} onClick={() => setSelectedCat(c)}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="filter-group">
            <h4 className="filter-label">Price Range <span style={{ fontWeight: 400, color: 'var(--gray-500)' }}>₱{priceRange[0]}–₱{priceRange[1]}</span></h4>
            <input type="range" min={0} max={20000} step={500} value={priceRange[0]} onChange={(e) => { const v = Number(e.target.value); if (v < priceRange[1]) setPriceRange([v, priceRange[1]]) }} className="price-slider" />
            <input type="range" min={0} max={20000} step={500} value={priceRange[1]} onChange={(e) => { const v = Number(e.target.value); if (v > priceRange[0]) setPriceRange([priceRange[0], v]) }} className="price-slider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-500)' }}><span>₱0</span><span>₱20,000</span></div>
          </div>

          <div className="filter-group">
            <h4 className="filter-label">Size (US)</h4>
            <div className="size-grid">
              {ALL_SIZES.map((s) => <button key={s} className={`size-btn${selectedSizes.includes(s) ? ' active' : ''}`} onClick={() => toggleSize(s)}>{s}</button>)}
            </div>
          </div>

          <div className="filter-group">
            <label className="stock-toggle">
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} />
              <span>In Stock Only</span>
            </label>
          </div>
        </aside>

        <div className="products-grid-area">
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 8, background: 'var(--gray-100)', aspectRatio: '1', animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <p style={{ fontSize: 48 }}>🔍</p>
              <h3>No products found</h3>
              <p>Try adjusting your search or filters.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} onClick={clearAll}>Clear Filters</button>
            </div>
          ) : (
            <div className="products-grid">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} .spin{animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
