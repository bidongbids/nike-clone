import { LayoutDashboard, Package, ShoppingBag, Users, BarChart2, Shield } from 'lucide-react'

// ── Roles ─────────────────────────────────────────────────────────────────────
export type Role = 'super_admin' | 'manager' | 'editor' | 'viewer' | 'customer'

// ── Permissions ───────────────────────────────────────────────────────────────
export type Permission =
  | 'admin:access'
  | 'products:read'   | 'products:create' | 'products:update' | 'products:delete'
  | 'orders:read'     | 'orders:update_status' | 'orders:delete'
  | 'users:read'      | 'users:update_role'    | 'users:delete'
  | 'analytics:read'

// ── Role → Permission map ─────────────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: [
    'admin:access',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'orders:read', 'orders:update_status', 'orders:delete',
    'users:read', 'users:update_role', 'users:delete',
    'analytics:read',
  ],
  manager: [
    'admin:access',
    'products:read', 'products:create', 'products:update', 'products:delete',
    'orders:read', 'orders:update_status',
    'users:read',
    'analytics:read',
  ],
  editor: [
    'admin:access',
    'products:read', 'products:create', 'products:update',
    'orders:read',
  ],
  viewer: [
    'admin:access',
    'products:read',
    'orders:read',
    'analytics:read',
  ],
  customer: [],
}

// ── Role metadata ─────────────────────────────────────────────────────────────
export interface RoleMeta {
  label: string
  color: string
  bg: string
  description: string
  rank: number  // higher = more privileged
}

export const ROLE_META: Record<Role, RoleMeta> = {
  super_admin: { label: 'Super Admin', color: '#7c3aed', bg: '#7c3aed18', description: 'Full access to everything',               rank: 4 },
  manager:     { label: 'Manager',     color: '#2563eb', bg: '#2563eb18', description: 'Manage products, orders & view users',    rank: 3 },
  editor:      { label: 'Editor',      color: '#0891b2', bg: '#0891b218', description: 'Create & edit products, view orders',     rank: 2 },
  viewer:      { label: 'Viewer',      color: '#059669', bg: '#05966918', description: 'Read-only access to admin panel',         rank: 1 },
  customer:    { label: 'Customer',    color: '#737373', bg: '#73737318', description: 'Store customer — no admin access',        rank: 0 },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasAnyPermission(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p))
}

export function canModifyRole(actorRole: Role, targetRole: Role): boolean {
  return ROLE_META[actorRole].rank > ROLE_META[targetRole].rank
}

// ── Admin nav items (filtered by permission at render time) ───────────────────
export interface AdminNavItem {
  to: string
  label: string
  icon: React.ElementType
  permission: Permission
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: '/admin',           label: 'Dashboard', icon: LayoutDashboard, permission: 'admin:access'   },
  { to: '/admin/products',  label: 'Products',  icon: Package,         permission: 'products:read'  },
  { to: '/admin/orders',    label: 'Orders',    icon: ShoppingBag,     permission: 'orders:read'    },
  { to: '/admin/users',     label: 'Users',     icon: Users,           permission: 'users:read'     },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart2,       permission: 'analytics:read' },
  { to: '/admin/roles',     label: 'Roles',     icon: Shield,          permission: 'admin:access'   },
]

// Note: AdminRoles page uses its own route but is accessible to any admin:access role
