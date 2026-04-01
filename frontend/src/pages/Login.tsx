import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { login, getMe } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const { vaultInfo, setUser } = useStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [shake, setShake]       = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setError(''); setLoading(true)
    try {
      await login({ username, password })
      const user = await getMe()
      setUser(user)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect username or password')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--card)',
    border: '1px solid var(--border-md)', borderRadius: 'var(--r-md)',
    padding: '12px 14px', fontFamily: 'var(--font-ui)', fontSize: 15,
    color: 'var(--text-1)', outline: 'none', transition: 'border-color 0.15s',
  }

  return (
    <div style={{ height: '100%', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Left decorative strip */}
      <div style={{
        width: 4, flexShrink: 0,
        background: 'linear-gradient(to bottom, transparent 0%, var(--amber) 30%, var(--amber) 70%, transparent 100%)',
        opacity: 0.4,
      }} />

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="fade-up" style={{ width: '100%', maxWidth: 380 }}>

          {/* Vault identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: '2.5rem' }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'var(--amber-dim)', border: '1.5px solid rgba(232,160,72,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 40 40" fill="none">
                <rect x="6" y="10" width="28" height="22" rx="4" stroke="var(--amber)" strokeWidth="1.8"/>
                <circle cx="20" cy="21" r="4" stroke="var(--amber)" strokeWidth="1.8"/>
                <path d="M9 10V8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v2" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: 300, color: 'var(--text-1)', lineHeight: 1.2 }}>
                {vaultInfo?.name || 'Vault'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                Private AI assistant
              </div>
            </div>
          </div>

          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 300, marginBottom: '0.4rem', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
            Welcome back
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: '2rem', lineHeight: 1.6 }}>
            Sign in to access your knowledge vault.
          </p>

          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex', flexDirection: 'column', gap: 14,
              animation: shake ? 'shake 0.4s ease' : 'none',
            }}
          >
            <style>{`
              @keyframes shake {
                0%,100%{transform:translateX(0)}
                20%{transform:translateX(-6px)}
                40%{transform:translateX(6px)}
                60%{transform:translateX(-4px)}
                80%{transform:translateX(4px)}
              }
            `}</style>

            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Username</label>
              <input
                type="text" autoComplete="username"
                value={username} onChange={(e) => setUsername(e.target.value)}
                style={inp} placeholder="your-username"
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e)  => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>Password</label>
              <input
                type="password" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={inp} placeholder="••••••••"
                onFocus={(e) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')}
                onBlur={(e)  => (e.target.style.borderColor = 'var(--border-md)')}
              />
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--r-sm)',
                background: 'var(--red-dim)', border: '1px solid rgba(248,81,73,0.2)',
                fontSize: 13, color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--red)" strokeWidth="1.2"/><path d="M7 4v3.5M7 10h.01" stroke="var(--red)" strokeWidth="1.3" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading || !username || !password}
              style={{
                width: '100%', padding: '13px', borderRadius: 'var(--r-md)', border: 'none',
                background: loading || !username || !password ? 'rgba(232,160,72,0.4)' : 'var(--amber)',
                color: '#1a0e00', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500,
                cursor: loading || !username || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', marginTop: 4,
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: 12, color: 'var(--text-3)', textAlign: 'center' }}>
            All data stays on this device — nothing is sent anywhere.
          </p>
        </div>
      </div>
    </div>
  )
}
