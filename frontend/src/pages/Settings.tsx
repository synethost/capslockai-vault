import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { get, post } from '../api/client'
import { clearToken } from '../api/client'
import UsersTab from '../components/UsersTab'

interface Settings {
  vault_name: string
  username: string
  ai_provider: string
  model_name: string
  ollama_url: string
}

const inp: React.CSSProperties = {
  width: '100%', background: 'var(--card)', border: '1px solid var(--border-md)',
  borderRadius: 'var(--r-md)', padding: '11px 14px', fontFamily: 'var(--font-ui)',
  fontSize: 14, color: 'var(--text-1)', outline: 'none', transition: 'border-color 0.15s',
}
const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'rgba(232,160,72,0.5)')
const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
  (e.target.style.borderColor = 'var(--border-md)')

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 7 }}>
      {children}
    </label>
  )
}

function SaveBtn({ onClick, loading, saved, label = 'Save' }: { onClick: () => void; loading: boolean; saved: boolean; label?: string }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      style={{
        padding: '9px 20px', borderRadius: 'var(--r-sm)', border: 'none',
        background: saved ? 'var(--green-dim)' : 'var(--amber)',
        color: saved ? 'var(--green)' : '#1a0e00',
        fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s', opacity: loading ? 0.6 : 1,
        display: 'flex', alignItems: 'center', gap: 6,
      }}
    >
      {saved && <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 6-6" stroke="var(--green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
      {loading ? 'Saving…' : saved ? 'Saved' : label}
    </button>
  )
}

function ErrMsg({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div style={{ marginTop: 8, padding: '9px 12px', borderRadius: 'var(--r-sm)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}>
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="var(--red)" strokeWidth="1.2"/><path d="M7 4v3.5M7 10h.01" stroke="var(--red)" strokeWidth="1.3" strokeLinecap="round"/></svg>
      {msg}
    </div>
  )
}

type Tab = 'vault' | 'password' | 'model' | 'users'

export default function Settings() {
  const navigate  = useNavigate()
  const { setVaultInfo, setUser, user } = useStore()
  const [tab, setTab]         = useState<Tab>('vault')
  const [settings, setSettings] = useState<Settings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [models, setModels]     = useState<string[]>([])

  // Vault name
  const [vaultName, setVaultName]   = useState('')
  const [savingN, setSavingN]       = useState(false)
  const [savedN, setSavedN]         = useState(false)
  const [errN, setErrN]             = useState('')

  // Password
  const [curPw, setCurPw]     = useState('')
  const [newPw, setNewPw]     = useState('')
  const [confPw, setConfPw]   = useState('')
  const [savingP, setSavingP] = useState(false)
  const [savedP, setSavedP]   = useState(false)
  const [errP, setErrP]       = useState('')

  // Model
  const [selModel, setSelModel]   = useState('')
  const [savingM, setSavingM]     = useState(false)
  const [savedM, setSavedM]       = useState(false)
  const [errM, setErrM]           = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [s, { models: m }] = await Promise.all([
          get<Settings>('/settings'),
          get<{ models: string[] }>('/settings/ollama-models'),
        ])
        setSettings(s)
        setVaultName(s.vault_name)
        setSelModel(s.model_name)
        setModels(m)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const saveVaultName = useCallback(async () => {
    if (!vaultName.trim()) return
    setSavingN(true); setErrN(''); setSavedN(false)
    try {
      await post('/settings/vault-name', { vault_name: vaultName.trim() })
      setVaultInfo({ name: vaultName.trim(), setup_complete: true })
      setSavedN(true); setTimeout(() => setSavedN(false), 3000)
    } catch (e) { setErrN(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSavingN(false) }
  }, [vaultName, setVaultInfo])

  const savePassword = useCallback(async () => {
    setErrP(''); setSavedP(false)
    if (!curPw) { setErrP('Enter your current password'); return }
    if (newPw.length < 4) { setErrP('New password must be at least 4 characters'); return }
    if (newPw !== confPw) { setErrP('Passwords do not match'); return }
    setSavingP(true)
    try {
      await post('/settings/password', { current_password: curPw, new_password: newPw })
      setCurPw(''); setNewPw(''); setConfPw('')
      setSavedP(true); setTimeout(() => setSavedP(false), 3000)
    } catch (e) { setErrP(e instanceof Error ? e.message : 'Failed to change password') }
    finally { setSavingP(false) }
  }, [curPw, newPw, confPw])

  const saveModel = useCallback(async () => {
    if (!selModel) return
    setSavingM(true); setErrM(''); setSavedM(false)
    try {
      await post('/settings/model', { provider: 'ollama', model_name: selModel })
      setSavedM(true); setTimeout(() => setSavedM(false), 3000)
    } catch (e) { setErrM(e instanceof Error ? e.message : 'Failed to save') }
    finally { setSavingM(false) }
  }, [selModel])

  function handleLogout() {
    clearToken()
    setUser(null)
    navigate('/login')
  }

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: 'vault',    label: 'Vault',    icon: '🗃' },
    { id: 'password', label: 'Password', icon: '🔑' },
    { id: 'model',    label: 'AI model', icon: '🤖' },
    { id: 'users',    label: 'Users',    icon: '👥' },
  ]

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ color: 'var(--text-3)', fontSize: 14 }}>Loading settings…</div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Topbar */}
      <div style={{ padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', flexShrink: 0 }}>
        <button
          onClick={() => navigate('/app')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 6px', borderRadius: 'var(--r-sm)', fontFamily: 'var(--font-ui)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-1)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Back to vault
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-1)' }}>
          Settings
        </div>
        {settings && (
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
            {settings.vault_name} · {settings.username}
          </div>
        )}
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Nav */}
        <div style={{ width: 180, flexShrink: 0, padding: '1.5rem 0.8rem', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {TABS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--r-sm)', border: 'none',
                background: tab === id ? 'var(--amber-dim)' : 'transparent',
                color: tab === id ? 'var(--text-1)' : 'var(--text-2)',
                fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: tab === id ? 500 : 400,
                cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (tab !== id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (tab !== id) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-sm)', border: 'none', background: 'transparent', color: 'var(--red)', fontFamily: 'var(--font-ui)', fontSize: 13, cursor: 'pointer', transition: 'background 0.15s', textAlign: 'left', opacity: 0.7 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--red-dim)'; e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.opacity = '0.7' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5 7h7M9 4.5L11.5 7 9 9.5M8 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '2rem 2.5rem' }}>
          <div style={{ maxWidth: 480 }}>

            {/* Vault tab */}
            {tab === 'vault' && (
              <div className="fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.4rem', marginBottom: '0.3rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Vault name</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>This name appears in the sidebar and on the login screen.</p>
                <Label>Name</Label>
                <input
                  type="text" value={vaultName}
                  onChange={(e) => setVaultName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveVaultName()}
                  style={inp} onFocus={onFocus} onBlur={onBlur}
                />
                <ErrMsg msg={errN} />
                <div style={{ marginTop: 14 }}>
                  <SaveBtn onClick={saveVaultName} loading={savingN} saved={savedN} label="Save name" />
                </div>

                {/* Data path */}
                <div style={{ marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid var(--border)' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-1)', marginBottom: 8 }}>Your data location</h4>
                  <div style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--amber)', fontFamily: 'monospace' }}>
                    ~/.capslockai-vault/
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, lineHeight: 1.6 }}>
                    Documents, chat history, and your database are stored here — on this machine, not on the USB drive.
                  </p>
                </div>
              </div>
            )}

            {/* Password tab */}
            {tab === 'password' && (
              <div className="fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.4rem', marginBottom: '0.3rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>Change password</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Choose a strong password you'll remember.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { label: 'Current password', value: curPw, set: setCurPw, ph: 'Your current password' },
                    { label: 'New password',     value: newPw, set: setNewPw, ph: 'At least 4 characters' },
                    { label: 'Confirm new password', value: confPw, set: setConfPw, ph: 'Type new password again' },
                  ].map(({ label, value, set, ph }) => (
                    <div key={label}>
                      <Label>{label}</Label>
                      <input
                        type="password" value={value} placeholder={ph}
                        onChange={(e) => set(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && savePassword()}
                        style={inp} onFocus={onFocus} onBlur={onBlur}
                      />
                    </div>
                  ))}
                </div>
                <ErrMsg msg={errP} />
                <div style={{ marginTop: 14 }}>
                  <SaveBtn onClick={savePassword} loading={savingP} saved={savedP} label="Change password" />
                </div>
              </div>
            )}

            {/* Model tab */}
            {tab === 'model' && (
              <div className="fade-in">
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '1.4rem', marginBottom: '0.3rem', color: 'var(--text-1)', letterSpacing: '-0.01em' }}>AI model</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1.5rem', lineHeight: 1.6 }}>Choose which model answers your questions. Models must be installed in Ollama.</p>

                {/* Current */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-md)', background: 'var(--amber-dim)', border: '1px solid rgba(232,160,72,0.2)', marginBottom: '1.25rem' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', animation: 'breathe 2.5s ease-in-out infinite', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 500 }}>Active: {settings?.model_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{settings?.ollama_url}</div>
                  </div>
                </div>

                {models.length > 0 ? (
                  <>
                    <Label>Switch model</Label>
                    <select
                      value={selModel}
                      onChange={(e) => setSelModel(e.target.value)}
                      style={{ ...inp, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath fill='%238b949e' d='M5 7L1 3h8z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 } as React.CSSProperties}
                      onFocus={onFocus} onBlur={onBlur}
                    >
                      {models.map((m) => (
                        <option key={m} value={m} style={{ background: '#1c2430' }}>{m}</option>
                      ))}
                    </select>
                    <ErrMsg msg={errM} />
                    <div style={{ marginTop: 14 }}>
                      <SaveBtn onClick={saveModel} loading={savingM} saved={savedM} label="Set model" />
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '14px', borderRadius: 'var(--r-md)', background: 'var(--card)', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    No Ollama models found. Install one by running:<br />
                    <code style={{ color: 'var(--amber)', fontFamily: 'monospace', fontSize: 12 }}>ollama pull llama3.2:3b</code>
                  </div>
                )}

                <div style={{ marginTop: '1.5rem', padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
                  <div style={{ fontWeight: 500, color: 'var(--text-2)', marginBottom: 4 }}>Available models</div>
                  {models.length > 0 ? models.map((m) => (
                    <div key={m} style={{ padding: '2px 0', color: m === selModel ? 'var(--amber)' : 'var(--text-3)' }}>
                      {m === selModel ? '→ ' : '   '}{m}
                    </div>
                  )) : <div>Run <code style={{ color: 'var(--amber)' }}>ollama list</code> to see installed models.</div>}
                </div>
              </div>
            )}

            {/* Users tab */}
            {tab === 'users' && (
              <div className="fade-in">
                <UsersTab currentUserId={user?.id ?? 0} />
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
