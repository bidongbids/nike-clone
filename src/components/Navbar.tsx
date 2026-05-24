import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ShoppingBag, Heart, Search, Menu, X, ChevronDown, User } from 'lucide-react'
import { useStore } from '../store/useStore'
import { hasPermission } from '../lib/rbac'
import './Navbar.css'

interface NavLink {
  label: string
  to: string
}

const NAV_LINKS: NavLink[] = [
  { label: 'Men',        to: '/products?cat=men' },
  { label: 'Women',      to: '/products?cat=women' },
  { label: 'Lifestyle',  to: '/products?cat=lifestyle' },
  { label: 'Basketball', to: '/products?cat=basketball' },
]

export default function Navbar() {
  const { user, role, logout, getCartCount, wishlistIds } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const cartCount = getCartCount()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setProfileOpen(false)
  }, [location])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQ.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQ)}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
    <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
      <div className="navbar-inner">
        <Link to="/" className="navbar-logo" aria-label="Nike Home">
          <svg viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="nike-swoosh">
            <path d="M6 18L42.5 4C44.5 3.2 46 3.5 46 5.5C46 7.5 43 10.5 40 12L6 18Z" fill="currentColor" />
          </svg>
        </Link>

        <div className={`navbar-links${menuOpen ? ' open' : ''}`}>
          {NAV_LINKS.map((l) => (
            <Link key={l.label} to={l.to} className="nav-link">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          <button className="action-btn" onClick={() => setSearchOpen((s) => !s)} aria-label="Search">
            <Search size={20} />
          </button>

          <Link to="/wishlist" className="action-btn" aria-label="Wishlist">
            <Heart size={20} />
            {wishlistIds.length > 0 && <span className="action-badge">{wishlistIds.length}</span>}
          </Link>

          <Link to="/cart" className="action-btn" aria-label="Cart">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="action-badge">{cartCount}</span>}
          </Link>

          {user ? (
            <div className="profile-dropdown">
              <button
                className="action-btn profile-btn"
                onClick={() => setProfileOpen((s) => !s)}
                aria-label="Profile menu"
              >
                <User size={20} />
                <ChevronDown size={14} />
              </button>
              {profileOpen && (
                <div className="dropdown-menu">
                  <span className="dropdown-name">{user.email?.split('@')[0]}</span>
                  <Link to="/orders" className="dropdown-item">My Orders</Link>
                  <Link to="/wishlist" className="dropdown-item">Wishlist</Link>
                  {hasPermission(role, 'admin:access') && (
                    <Link to="/admin" className="dropdown-item admin-link">Admin Panel</Link>
                  )}
                  <button onClick={logout} className="dropdown-item logout-btn">Sign Out</button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-sm btn-primary">Sign In</Link>
          )}

          <button
            className="action-btn mobile-menu-btn"
            onClick={() => setMenuOpen((s) => !s)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="search-bar">
          <form onSubmit={handleSearch} className="search-form">
            <Search size={18} className="search-icon" />
            <input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search for shoes, apparel..."
              className="search-input"
            />
            <button type="button" onClick={() => setSearchOpen(false)} aria-label="Close search">
              <X size={18} />
            </button>
          </form>
        </div>
      )}
    </nav>
  )
}
