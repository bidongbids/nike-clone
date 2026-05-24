import { useState, useMemo } from 'react'
import { Search, X, Shield, User, ChevronDown, Loader } from 'lucide-react'
import AdminLayout from './AdminLayout'
import { Can } from '../../components/Guards'
import { ROLE_META, canModifyRole } from '../../lib/rbac'
import { useAdminUsers } from '../../lib/hooks'
import { updateUserRole } from '../../lib/api'
import { useStore } from '../../store/useStore'
import type { Role } from '../../lib/rbac'

const ALL_ROLES: Role[] = ['super_admin','manager','editor','viewer','customer']

export default function AdminUsers() {
  const { role: currentRole } = useStore()
  const { data: users, loading, refetch } = useAdminUsers()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<Role|'All'>('All')
  const [openRoleMenu, setOpenRoleMenu] = useState<string|null>(null)
  const [saving, setSaving] = useState<string|null>(null)

  const filtered = useMemo(() => {
    let items = [...(users ?? [])]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter((u: any) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
    }
    if (roleFilter !== 'All') items = items.filter((u: any) => u.role === roleFilter)
    return items
  }, [users, search, roleFilter])

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setSaving(userId)
    try { await updateUserRole(userId, newRole); await refetch(); setOpenRoleMenu(null) }
    catch (err: any) { alert(err.message) }
    finally { setSaving(null) }
  }

  return (
    <AdminLayout>
      <div className="admin-section-header">
        <h2 className="admin-section-title">Users</h2>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--gray-500)' }}>
          <span>Total: <strong style={{ color: 'var(--black)' }}>{users?.length ?? '…'}</strong></span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="admin-search" style={{ flex: 1, minWidth: 200 }}>
          <Search size={16} color="var(--gray-400)" />
          <input placeholder="Search by name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <select className="sort-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as Role|'All')} style={{ borderRadius: 8 }}>
          <option value="All">All Roles</option>
          {ALL_ROLES.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
        </select>
      </div>

      <div className="admin-card">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader size={28} strokeWidth={1.5} color="var(--gray-300)" style={{ animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th><th>Joined</th><th>Role</th>
                <Can do="users:update_role"><th>Change Role</th></Can>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => {
                const userRole = (u.role ?? 'customer') as Role
                const meta = ROLE_META[userRole] ?? ROLE_META.customer
                const canChange = canModifyRole(currentRole, userRole)
                return (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {userRole !== 'customer'
                            ? <Shield size={15} color={meta.color} />
                            : <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-600)' }}>{(u.full_name || u.email || '?').charAt(0).toUpperCase()}</span>
                          }
                        </div>
                        <div>
                          <strong style={{ fontSize: 14 }}>{u.full_name || '(no name)'}</strong><br />
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-500)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: meta.bg, color: meta.color, padding: '4px 12px', borderRadius: 50, fontSize: 12, fontWeight: 700 }}>
                        {userRole !== 'customer' ? <Shield size={10} /> : <User size={10} />}
                        {meta.label}
                      </span>
                    </td>
                    <Can do="users:update_role">
                      <td>
                        {canChange ? (
                          <div style={{ position: 'relative' }}>
                            <button
                              onClick={() => setOpenRoleMenu(openRoleMenu === u.id ? null : u.id)}
                              disabled={saving === u.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1.5px solid var(--gray-200)', borderRadius: 6, fontSize: 13, cursor: 'pointer', background: 'var(--white)' }}>
                              {saving === u.id ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Saving…</> : <>Change <ChevronDown size={13} /></>}
                            </button>
                            {openRoleMenu === u.id && (
                              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: 'var(--white)', border: '1px solid var(--gray-200)', borderRadius: 8, boxShadow: 'var(--shadow-lg)', zIndex: 50, minWidth: 160, overflow: 'hidden' }}>
                                {ALL_ROLES.filter((r) => canModifyRole(currentRole, r) || r === userRole).map((r) => {
                                  const m = ROLE_META[r]
                                  return (
                                    <button key={r} onClick={() => handleRoleChange(u.id, r)}
                                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', fontSize: 13, textAlign: 'left', background: r === userRole ? m.bg : 'var(--white)', color: r === userRole ? m.color : 'var(--black)', fontWeight: r === userRole ? 700 : 400 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
                                      {m.label} {r === userRole && '✓'}
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>—</span>
                        )}
                      </td>
                    </Can>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        {!loading && filtered.length === 0 && <div className="admin-table-empty">No users found.</div>}
      </div>
    </AdminLayout>
  )
}
