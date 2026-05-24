import { Navigate } from 'react-router-dom'
import { ShieldOff, Lock } from 'lucide-react'
import { useStore } from '../store/useStore'
import { hasPermission, hasAnyPermission } from '../lib/rbac'
import type { Permission } from '../lib/rbac'

// ── RequireAuth ───────────────────────────────────────────────────────────────
// Redirects unauthenticated users to /login
interface RequireAuthProps {
  children: React.ReactNode
  redirectTo?: string
}
export function RequireAuth({ children, redirectTo = '/login' }: RequireAuthProps) {
  const { user, authLoading } = useStore()
  if (authLoading) return <AuthLoadingScreen />
  if (!user) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}

// ── RequirePermission ─────────────────────────────────────────────────────────
// Renders <AccessDenied> (or a custom fallback) when permission is missing.
interface RequirePermissionProps {
  permission: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}
export function RequirePermission({ permission, children, fallback }: RequirePermissionProps) {
  const { role } = useStore()
  if (!hasPermission(role, permission)) {
    return fallback !== undefined ? <>{fallback}</> : <AccessDenied permission={permission} />
  }
  return <>{children}</>
}

// ── RequireAnyPermission ──────────────────────────────────────────────────────
interface RequireAnyPermissionProps {
  permissions: Permission[]
  children: React.ReactNode
  fallback?: React.ReactNode
}
export function RequireAnyPermission({ permissions, children, fallback }: RequireAnyPermissionProps) {
  const { role } = useStore()
  if (!hasAnyPermission(role, permissions)) {
    return fallback !== undefined ? <>{fallback}</> : <AccessDenied />
  }
  return <>{children}</>
}

// ── RequireAdmin ──────────────────────────────────────────────────────────────
// Redirects non-admin users. Used to gate /admin/* routes at the router level.
interface RequireAdminProps { children: React.ReactNode }
export function RequireAdmin({ children }: RequireAdminProps) {
  const { user, role, authLoading } = useStore()
  if (authLoading) return <AuthLoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!hasPermission(role, 'admin:access')) return <Navigate to="/access-denied" replace />
  return <>{children}</>
}

// ── Can ───────────────────────────────────────────────────────────────────────
// Inline conditional: renders children only when user HAS the permission.
// Usage: <Can do="products:delete"><DeleteButton /></Can>
interface CanProps {
  do: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}
export function Can({ do: permission, children, fallback = null }: CanProps) {
  const { role } = useStore()
  return hasPermission(role, permission) ? <>{children}</> : <>{fallback}</>
}

// ── Cannot ────────────────────────────────────────────────────────────────────
// Inverse of Can — renders children when user LACKS the permission.
interface CannotProps {
  do: Permission
  children: React.ReactNode
}
export function Cannot({ do: permission, children }: CannotProps) {
  const { role } = useStore()
  return !hasPermission(role, permission) ? <>{children}</> : null
}

// ── AccessDenied ──────────────────────────────────────────────────────────────
interface AccessDeniedProps {
  permission?: Permission
  fullPage?: boolean
}
export function AccessDenied({ permission, fullPage = false }: AccessDeniedProps) {
  const style: React.CSSProperties = fullPage
    ? { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8', padding: 40 }
    : { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', textAlign: 'center' }

  return (
    <div style={style}>
      <div style={{ background: '#fef2f2', borderRadius: '50%', padding: 20, marginBottom: 20 }}>
        <ShieldOff size={40} color="var(--red)" />
      </div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, marginBottom: 8 }}>
        Access Denied
      </h2>
      <p style={{ color: 'var(--gray-500)', maxWidth: 340, lineHeight: 1.6 }}>
        You don't have permission to view this
        {permission ? <> (requires <code style={{ background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 4 }}>{permission}</code>)</> : ''}.
        Contact your administrator to request access.
      </p>
      {fullPage && (
        <a href="/" className="btn btn-secondary btn-sm" style={{ marginTop: 24 }}>
          Go to Store
        </a>
      )}
    </div>
  )
}

// ── ReadOnlyBadge ─────────────────────────────────────────────────────────────
export function ReadOnlyBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#fef3c7', color: '#92400e',
      padding: '4px 10px', borderRadius: 50, fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, textTransform: 'uppercase',
    }}>
      <Lock size={10} /> Read Only
    </span>
  )
}

// ── Auth loading skeleton ─────────────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8f8f8' }}>
      <div style={{ textAlign: 'center' }}>
        <svg viewBox="0 0 60 24" fill="none" style={{ width: 60, height: 24, margin: '0 auto 16px' }}>
          <path d="M6 18L42.5 4C44.5 3.2 46 3.5 46 5.5C46 7.5 43 10.5 40 12L6 18Z" fill="#111" />
        </svg>
        <div className="spinner" style={{ margin: '0 auto', borderColor: '#111', borderTopColor: 'transparent' }} />
      </div>
    </div>
  )
}
