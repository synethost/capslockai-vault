import React, { useState, useEffect, useCallback } from 'react'
import { get, post, patch, del } from '../api/client'

interface VaultUser {
  id: number
  username: string
  email?: string
  role: string
}

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  admin:  { bg: 'var(--amber-dim)',  color: 'var(--amber)', border: 'rgba(232,160,72,0.25)' },
  member: { bg: 'var(--green-dim)',  color: 'var(--green)', border: 'rgba(63,185,80,0.25)' },
  viewer: { bg: 'rgba(255,255,255,0.05)', color: 'var(--text-2)', border: 'var(--border)' },
}

function RoleBadge({ role }: { role: string }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.viewer
  return (
    <span style={{
      fontSize: 11, padding: '2px 8px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontWeight: 500, letterSpacing: '0.02em',
    }}>
      {role}
    </span>
  )
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase()
}

export default function UsersTab({ currentUserId }: { currentUserId: number }) {
  const [users, setUsers]         = useState<VaultUser[]>([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)

  // Create form
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole]         = useState('member')
  const [newEmail, setNewEmail]       = useState('')
  const [creating, setCreating]       = useState(false)
  const [createErr, setCreateErr]     = useState('')

  const load = useCallback(async () => {
    try {
      const u = await get<VaultUser[]>('/users')
      setUsers(u)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = useCallback(async () => {
    if (!newUsername.trim() || !newPassword) return
    setCreating(true); setCreateErr('')
    try {
      await post('/users', {
        username: newUsername.trim(),
        password: newPassword,
        role: newRole,
        email: newEmail || undefined,
      })
      setNewUsername(''); setNewPassword(''); setNewEmail(''); setNewRole('member')
      setShowCreate(false)
      await load()
    } catch (e) {
      setCreateErr(e instanceof Error ? e.message : 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }, [newUsername, newPassword, newRole, newEmail, load])

  const handleRoleChange = useCallback(async (userId: number, role: string) => {
    try {
      await patch(`/users/${userId}`, { role })  // PATCH via post
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to update role')
    }
  }, [])

  const handleDelete = useCallback(async (userId: number, username: string) => {
    if (!confirm(`Remove user "${username}"? This cannot be undone.`)) return
    try {
      await del(`/users/${userId}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to delete user')
    }
  }, [])

  const inp: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--border-md)',
    borderRadius: 'var(--r-sm)', padding: '9px 12px',
    fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-1)',
    outline: 'none', transition: 'border-color 0.15s',
  }

  if (loading) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.4rem', color: 'var(--text-1)', letterSpacing: '-0.01em', marginBottom: 3 }}>Team members</h3>
          <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{users.length} user{users.length !== 1 ? 's' : ''} have access to this vault.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 'var(--r-sm)', border: 'none',
            background: showCreate ? 'var(--border)' : 'var(--amber)',
            color: showCreate ? 'var(--text-2)' : '#1a0e00',
            fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          {showCreate ? '✕ Cancel' : '+ Add user'}
        </button>
      </div>

      {/* Create user form */}
      {showCreate && (
        <div className="fade-in" style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '1.25rem',
          marginBottom: '1.25rem',
        }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: '1rem' }}>New user</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Username *</label>
              <input
                type="text" value={newUsername} placeholder="username"
                onChange={(e) => setNewUsername(e.target.value)}
                style={{ ...inp, width: '100%' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Password *</label>
              <input
                type="password" value={newPassword} placeholder="Min 4 characters"
                onChange={(e) => setNewPassword(e.target.value)}
                style={{ ...inp, width: '100%' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Email (optional)</label>
              <input
                type="email" value={newEmail} placeholder="user@company.com"
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ ...inp, width: '100%' }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 6 }}>Role</label>
              <select
                value={newRole} onChange={(e) => setNewRole(e.target.value)}
                style={{ ...inp, width: '100%', cursor: 'pointer', appearance: 'none' } as React.CSSProperties}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border-md)')}
              >
                <option value="member" style={{ background: '#1c2430' }}>Member — chat + view docs</option>
                <option value="admin"  style={{ background: '#1c2430' }}>Admin — full access</option>
                <option value="viewer" style={{ background: '#1c2430' }}>Viewer — chat only</option>
              </select>
            </div>
          </div>
          {createErr && (
            <div style={{ padding: '8px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{createErr}</div>
          )}
          <button
            onClick={handleCreate}
            disabled={creating || !newUsername.trim() || !newPassword}
            style={{
              padding: '9px 20px', borderRadius: 'var(--r-sm)', border: 'none',
              background: creating || !newUsername.trim() || !newPassword ? 'rgba(232,160,72,0.35)' : 'var(--amber)',
              color: '#1a0e00', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
              cursor: creating || !newUsername.trim() || !newPassword ? 'not-allowed' : 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create user'}
          </button>
        </div>
      )}

      {/* User list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {users.map((user) => {
          const isMe = user.id === currentUserId
          return (
            <div
              key={user.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 'var(--r-md)',
                background: 'var(--card)', border: '1px solid var(--border)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-md)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              {/* Avatar */}
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 500,
                background: isMe ? 'var(--amber-dim)' : 'rgba(255,255,255,0.06)',
                color: isMe ? 'var(--amber)' : 'var(--text-2)',
                border: `1px solid ${isMe ? 'rgba(232,160,72,0.25)' : 'var(--border)'}`,
              }}>
                {initials(user.username)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>{user.username}</span>
                  {isMe && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>you</span>}
                </div>
                {user.email && <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1 }}>{user.email}</div>}
              </div>

              {/* Role selector */}
              {!isMe ? (
                <select
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)', padding: '5px 10px',
                    fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-2)',
                    cursor: 'pointer', outline: 'none', appearance: 'none',
                  } as React.CSSProperties}
                >
                  <option value="admin"  style={{ background: '#1c2430' }}>Admin</option>
                  <option value="member" style={{ background: '#1c2430' }}>Member</option>
                  <option value="viewer" style={{ background: '#1c2430' }}>Viewer</option>
                </select>
              ) : (
                <RoleBadge role={user.role} />
              )}

              {/* Delete */}
              {!isMe && (
                <button
                  onClick={() => handleDelete(user.id, user.username)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-3)', padding: '4px 6px', borderRadius: 4,
                    display: 'flex', alignItems: 'center', transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                  title="Remove user"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6v4.5M8.5 6v4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><path d="M3 3.5l.5 7a1 1 0 0 0 1 .95h5a1 1 0 0 0 1-.95l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Role descriptions */}
      <div style={{ marginTop: '1.5rem', padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.8 }}>
        <div><span style={{ color: 'var(--amber)', fontWeight: 500 }}>Admin</span> — full access: manage users, upload/delete documents, change settings</div>
        <div><span style={{ color: 'var(--green)', fontWeight: 500 }}>Member</span> — chat with AI and view all documents, cannot manage users or settings</div>
        <div><span style={{ color: 'var(--text-2)', fontWeight: 500 }}>Viewer</span> — chat with AI only, cannot upload documents or view document list</div>
      </div>
    </div>
  )
}
