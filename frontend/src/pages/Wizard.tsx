import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { setupVault } from '../api/auth'
import { Spinner, ArrowRight, CheckIcon } from '../components/ui'
import DropZone from '../components/Documents/DropZone'

const STEPS = [
  { n: 1, label: 'Name your vault' },
  { n: 2, label: 'Add documents' },
  { n: 3, label: 'Getting ready' },
]

const PHASES = [
  { delay: 0,    pct: 15, active: 1 },
  { delay: 900,  pct: 40, active: 1 },
  { delay: 1800, pct: 62, active: 2, done: [1] },
  { delay: 2800, pct: 82, active: 3, done: [1, 2] },
  { delay: 3800, pct: 100, done: [1, 2, 3] },
]

const PHASE_LABELS = [
  { label: 'Reading your documents',        sub: 'Scanning for text and structure' },
  { label: 'Building your knowledge index', sub: 'Organising so you can search instantly' },
  { label: 'Starting your AI engine',       sub: 'Loading the language model locally' },
]

export default function Wizard() {
  const navigate = useNavigate()
  const { wizardStep, setWizardStep, wizardVaultName, setWizardVaultName, documents } = useStore()

  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [confirmPw, setConfirmPw]       = useState('')
  const [saving, setSaving]             = useState(false)
  const [saveError, setSaveError]       = useState('')
  const [progPct, setProgPct]           = useState(0)
  const [doneSteps, setDoneSteps]       = useState<number[]>([])
  const [activePhaseIdx, setActivePhaseIdx] = useState(0)

  useEffect(() => {
    if (wizardStep !== 3) return
    const timers: ReturnType<typeof setTimeout>[] = []
    PHASES.forEach((phase, i) => {
      timers.push(setTimeout(() => {
        setProgPct(phase.pct)
        setActivePhaseIdx(i)
        if (phase.done) setDoneSteps(phase.done)
      }, phase.delay))
    })
    timers.push(setTimeout(() => navigate('/login'), 4600))
    return () => timers.forEach(clearTimeout)
  }, [wizardStep, navigate])

  async function handleStep1() {
    if (!wizardVaultName.trim()) return
    if (password.length < 4) { setSaveError('Password must be at least 4 characters'); return }
    if (password !== confirmPw) { setSaveError('Passwords do not match'); return }
    setSaving(true); setSaveError('')
    try {
      await setupVault(wizardVaultName.trim(), username.trim() || 'admin', password)
      setWizardStep(2)
    } catch (err: unknown) {
      // 400 means vault already set up — send to login
      if (err && typeof err === 'object' && 'status' in err && (err as {status:number}).status === 400) {
        navigate('/login')
        return
      }
      setSaveError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', background: 'var(--card)', border: '1px solid var(--border-md)',
    borderRadius: 'var(--r-md)', padding: '12px 14px', fontFamily: 'var(--font-ui)',
    fontSize: 15, color: 'var(--text-1)', outline: 'none', transition: 'border-color 0.15s',
  }
  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'rgba(232,160,72,0.5)')
  const onBlur  = (e: React.FocusEvent<HTMLInputElement>) => (e.target.style.borderColor = 'var(--border-md)')

  return (
    <div style={{ height: '100%', display: 'flex', background: 'var(--bg)' }}>

      {/* Sidebar */}
      <div style={{ width: 240, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '3rem' }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--amber-dim)', border: '1px solid rgba(232,160,72,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 40 40" fill="none"><rect x="6" y="10" width="28" height="22" rx="4" stroke="var(--amber)" strokeWidth="1.8"/><circle cx="20" cy="21" r="4" stroke="var(--amber)" strokeWidth="1.8"/><path d="M9 10V8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v2" stroke="var(--amber)" strokeWidth="1.8" strokeLinecap="round"/></svg>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '0.95rem', color: 'var(--text-1)' }}>Vault</span>
        </div>

        {STEPS.map(({ n, label }) => {
          const isActive = wizardStep === n
          const isDone   = wizardStep > n
          return (
            <div key={n} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 'var(--r-sm)', marginBottom: 4,
              background: isActive ? 'var(--amber-dim)' : 'transparent',
              transition: 'background 0.2s',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 500,
                background: isDone ? 'var(--green)' : 'transparent',
                border: `1.5px solid ${isDone ? 'var(--green)' : isActive ? 'var(--amber)' : 'var(--border-md)'}`,
                color: isDone ? '#0d1117' : isActive ? 'var(--amber)' : 'var(--text-3)',
                transition: 'all 0.3s',
              }}>
                {isDone ? <CheckIcon size={12} color="#0d1117" /> : n}
              </div>
              <span style={{ fontSize: 13, fontWeight: isActive ? 500 : 400, color: isActive ? 'var(--text-1)' : isDone ? 'var(--text-2)' : 'var(--text-3)', transition: 'color 0.2s' }}>
                {label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '3rem 3.5rem', overflowY: 'auto' }}>

        {/* Step 1 */}
        {wizardStep === 1 && (
          <div className="fade-up">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
              What should we call your <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>vault?</em>
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '2.5rem', fontSize: 15 }}>
              Name it, then choose a username and password — these are yours, no one else's.
            </p>

            <div style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { label: 'Vault name', value: wizardVaultName, set: setWizardVaultName, type: 'text', ph: 'e.g. Acme HR Knowledge Base' },
                { label: 'Username',   value: username, set: setUsername,   type: 'text',     ph: 'e.g. admin' },
                { label: 'Password',   value: password, set: setPassword,   type: 'password', ph: 'At least 4 characters' },
                { label: 'Confirm password', value: confirmPw, set: setConfirmPw, type: 'password', ph: 'Type password again' },
              ].map(({ label, value, set, type, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 8 }}>{label}</label>
                  <input
                    type={type} value={value} placeholder={ph}
                    onChange={(e) => set(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
                    style={inp} onFocus={onFocus} onBlur={onBlur}
                    autoFocus={label === 'Vault name'}
                  />
                </div>
              ))}
            </div>

            {saveError && (
              <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 'var(--r-sm)', background: 'var(--red-dim)', color: 'var(--red)', fontSize: 13, maxWidth: 440 }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 'auto', paddingTop: '2.5rem' }}>
              <button onClick={() => navigate('/')} style={{ padding: '11px 22px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text-2)', fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>← Back</button>
              <button
                onClick={handleStep1}
                disabled={saving || !wizardVaultName.trim()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 'var(--r-md)', border: 'none', background: saving || !wizardVaultName.trim() ? 'rgba(232,160,72,0.4)' : 'var(--amber)', color: '#1a0e00', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, cursor: saving || !wizardVaultName.trim() ? 'not-allowed' : 'pointer' }}
              >
                {saving ? <><Spinner size={14} color="#1a0e00" /> Saving…</> : <>Continue <ArrowRight size={14} /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {wizardStep === 2 && (
          <div className="fade-up">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
              Add your company <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>documents</em>
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '2.5rem', fontSize: 15 }}>
              These are the files your AI will learn from. You can always add more later.
            </p>
            <DropZone />
            <div style={{ display: 'flex', gap: 12, marginTop: '2.5rem' }}>
              <button onClick={() => setWizardStep(1)} style={{ padding: '11px 22px', borderRadius: 'var(--r-md)', border: '1px solid var(--border-md)', background: 'transparent', color: 'var(--text-2)', fontFamily: 'var(--font-ui)', fontSize: 14, cursor: 'pointer' }}>← Back</button>
              <button onClick={() => setWizardStep(3)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--amber)', color: '#1a0e00', fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                {documents.length > 0 ? `Continue with ${documents.length} doc${documents.length !== 1 ? 's' : ''}` : 'Continue without documents'} <ArrowRight size={14} />
              </button>
            </div>
            {documents.length === 0 && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>You can add documents later from the main screen.</p>}
          </div>
        )}

        {/* Step 3 */}
        {wizardStep === 3 && (
          <div className="fade-up">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', fontWeight: 300, marginBottom: '0.5rem', letterSpacing: '-0.01em', color: 'var(--text-1)' }}>
              Getting <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>everything ready…</em>
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: '2rem', fontSize: 15 }}>Your AI is reading your documents. This usually takes a minute or two.</p>

            {/* Progress bar */}
            <div style={{ maxWidth: 440, marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Setting up…</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{progPct}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 2, background: 'var(--amber)', width: `${progPct}%`, transition: 'width 0.8s ease' }} />
              </div>
            </div>

            {PHASE_LABELS.map(({ label, sub }, i) => {
              const stepN   = i + 1
              const isDone  = doneSteps.includes(stepN)
              const isActive = PHASES[activePhaseIdx]?.active === stepN && !isDone
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', borderBottom: '1px solid var(--border)', maxWidth: 440 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--green-dim)' : isActive ? 'var(--amber-dim)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isDone ? 'rgba(63,185,80,0.3)' : isActive ? 'rgba(232,160,72,0.3)' : 'var(--border)'}`,
                    transition: 'all 0.3s',
                  }}>
                    {isDone
                      ? <CheckIcon size={13} />
                      : isActive
                      ? <Spinner size={13} color="var(--amber)" />
                      : <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border-md)' }} />
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: isDone || isActive ? 'var(--text-1)' : 'var(--text-3)', transition: 'color 0.3s' }}>{label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{sub}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
