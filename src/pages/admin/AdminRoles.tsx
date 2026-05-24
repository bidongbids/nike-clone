import AdminLayout from './AdminLayout'
import { ROLE_META, ROLE_PERMISSIONS } from '../../lib/rbac'
import type { Role, Permission } from '../../lib/rbac'
import { useStore } from '../../store/useStore'
import { Shield, Check, X } from 'lucide-react'

const ALL_PERMISSIONS: { group: string; perms: Permission[] }[] = [
  { group: 'Admin',    perms: ['admin:access'] },
  { group: 'Products', perms: ['products:read', 'products:create', 'products:update', 'products:delete'] },
  { group: 'Orders',   perms: ['orders:read', 'orders:update_status', 'orders:delete'] },
  { group: 'Users',    perms: ['users:read', 'users:update_role', 'users:delete'] },
  { group: 'Analytics',perms: ['analytics:read'] },
]

const ROLES: Role[] = ['super_admin', 'manager', 'editor', 'viewer', 'customer']

export default function AdminRoles() {
  const { role: currentRole } = useStore()
  const currentMeta = ROLE_META[currentRole]

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Roles & Permissions</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: currentMeta.bg, padding: '8px 16px', borderRadius: 50 }}>
          <Shield size={15} color={currentMeta.color} />
          <span style={{ fontSize: 13, fontWeight: 700, color: currentMeta.color }}>
            Your role: {currentMeta.label}
          </span>
        </div>
      </div>

      {/* Role cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {ROLES.map((r) => {
          const m = ROLE_META[r]
          const permCount = ROLE_PERMISSIONS[r].length
          const isCurrentRole = r === currentRole
          return (
            <div key={r} style={{ background: '#fff', border: `2px solid ${isCurrentRole ? m.color : 'var(--gray-200)'}`, borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ background: m.bg, borderRadius: 8, padding: 8 }}>
                  <Shield size={16} color={m.color} />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: m.color }}>{m.label}</p>
                  {isCurrentRole && <span style={{ fontSize: 10, background: m.color, color: '#fff', padding: '1px 6px', borderRadius: 50, fontWeight: 700 }}>YOU</span>}
                </div>
              </div>
              <p style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.5, marginBottom: 10 }}>{m.description}</p>
              <p style={{ fontSize: 12, fontWeight: 600, color: permCount > 0 ? m.color : 'var(--gray-400)' }}>
                {permCount} permission{permCount !== 1 ? 's' : ''}
              </p>
            </div>
          )
        })}
      </div>

      {/* Full permission matrix */}
      <div className="admin-card">
        <div className="admin-card-header">
          <span className="admin-card-title">Permission Matrix</span>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>✓ = granted &nbsp; — = denied</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 200 }}>Permission</th>
                {ROLES.map((r) => {
                  const m = ROLE_META[r]
                  return (
                    <th key={r} style={{ textAlign: 'center', color: r === currentRole ? m.color : undefined }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                        <Shield size={13} color={m.color} />
                        {m.label}
                        {r === currentRole && <span style={{ fontSize: 9, background: m.color, color: '#fff', padding: '1px 5px', borderRadius: 50, fontWeight: 700 }}>YOU</span>}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {ALL_PERMISSIONS.map(({ group, perms }) => (
                <>
                  <tr key={`group-${group}`}>
                    <td colSpan={ROLES.length + 1} style={{ background: 'var(--gray-50)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gray-500)', padding: '10px 20px' }}>
                      {group}
                    </td>
                  </tr>
                  {perms.map((perm) => (
                    <tr key={perm}>
                      <td>
                        <code style={{ fontSize: 12, background: 'var(--gray-100)', padding: '2px 6px', borderRadius: 4 }}>
                          {perm}
                        </code>
                      </td>
                      {ROLES.map((r) => {
                        const granted = ROLE_PERMISSIONS[r].includes(perm)
                        const isMe = r === currentRole
                        return (
                          <td key={r} style={{ textAlign: 'center', background: isMe ? ROLE_META[r].bg : undefined }}>
                            {granted
                              ? <Check size={16} color="#22c55e" strokeWidth={2.5} style={{ margin: '0 auto' }} />
                              : <X size={14} color="var(--gray-300)" style={{ margin: '0 auto' }} />
                            }
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
