import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LogOut, Store, Menu, X } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { hasPermission, ADMIN_NAV_ITEMS, ROLE_META } from '../../lib/rbac'
import { ReadOnlyBadge } from '../../components/Guards'
import './Admin.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Only show nav items the current role can access
  const visibleNav = ADMIN_NAV_ITEMS.filter((item) => hasPermission(role, item.permission))

  const roleMeta = ROLE_META[role]
  const isReadOnly = hasPermission(role, 'admin:access') && !hasPermission(role, 'products:create')
  const currentPage = visibleNav.find((n) => n.to === location.pathname)?.label ?? 'Admin'

  return (
    <div className="admin-shell">
      {sidebarOpen && (
        <div className="admin-mobile-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="admin-logo">
          <svg viewBox="0 0 60 24" fill="none" style={{ width: 44, height: 18 }}>
            <path d="M6 18L42.5 4C44.5 3.2 46 3.5 46 5.5C46 7.5 43 10.5 40 12L6 18Z" fill="white" />
          </svg>
          <span>Admin</span>
          <button className="admin-sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Role badge in sidebar */}
        <div className="admin-role-badge">
          <span style={{ background: roleMeta.color + '30', color: roleMeta.color, padding: '4px 12px', borderRadius: 50, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {roleMeta.label}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 3, display: 'block' }}>
            {roleMeta.description}
          </span>
        </div>

        <nav className="admin-nav">
          {visibleNav.map((item) => {
            const active = location.pathname === item.to
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`admin-nav-item${active ? ' active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {active && <span className="nav-indicator" />}
              </Link>
            )
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <Link to="/" className="admin-nav-item footer-item">
            <Store size={18} /><span>View Store</span>
          </Link>
          <button onClick={logout} className="admin-nav-item footer-item logout">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="admin-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <h1 className="admin-page-title">{currentPage}</h1>
            {isReadOnly && <ReadOnlyBadge />}
          </div>
          <div className="admin-topbar-right">
            <div className="admin-avatar" style={{ background: roleMeta.color }}>
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1 }}>
                {user?.email?.split('@')[0]}
              </p>
              <p style={{ fontSize: 11, marginTop: 2 }}>
                <span style={{ color: roleMeta.color, fontWeight: 600 }}>{roleMeta.label}</span>
              </p>
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
