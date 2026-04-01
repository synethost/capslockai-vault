import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()
  return (
    <div style={{
      height: '100%', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', padding: '2rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', width: 700, height: 700, borderRadius: '50%',
        top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(232,160,72,0.05) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />
      <div className="fade-up" style={{ textAlign: 'center', maxWidth: 480, position: 'relative' }}>
        <div style={{
          width: 92, height: 92, borderRadius: 28, margin: '0 auto 2.5rem',
          background: 'var(--amber-dim)', border: '1.5px solid rgba(232,160,72,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
        }}>
          <div style={{ position: 'absolute', inset: -12, borderRadius: 40, border: '1px solid rgba(232,160,72,0.12)', animation: 'pulse 3s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', inset: -24, borderRadius: 52, border: '1px solid rgba(232,160,72,0.05)', animation: 'pulse 3s ease-in-out infinite 0.6s' }} />
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="10" width="28" height="22" rx="4" stroke="var(--amber)" strokeWidth="1.5"/>
            <circle cx="20" cy="21" r="4" stroke="var(--amber)" strokeWidth="1.5"/>
            <path d="M20 17v-4M20 25v3" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M9 10V8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v2" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 300, lineHeight: 1.15, color: 'var(--text-1)', marginBottom: '1.1rem', letterSpacing: '-0.02em' }}>
          Your company's knowledge,{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--amber)' }}>always with you</em>
        </h1>

        <p style={{ color: 'var(--text-2)', fontSize: '1rem', lineHeight: 1.8, marginBottom: '2.5rem', maxWidth: 400, margin: '0 auto 2.5rem' }}>
          Ask questions and find answers using AI that runs entirely on your device. No internet required. Nothing ever leaves this drive.
        </p>

        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
          {[
            { dot: 'var(--green)', text: 'Works fully offline' },
            { dot: 'var(--green)', text: 'Data stays on device' },
            { dot: 'var(--amber)', text: 'No account needed' },
          ].map((p) => (
            <div key={p.text} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-2)' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.dot, flexShrink: 0, animation: 'breathe 2.5s ease-in-out infinite' }} />
              {p.text}
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/wizard')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 36px', borderRadius: 'var(--r-md)', border: 'none', background: 'var(--amber)', color: '#1a0e00', fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--amber-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.transform = 'none' }}
        >
          Set up my vault
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <p style={{ marginTop: '1.25rem', fontSize: 12, color: 'var(--text-3)' }}>Takes 2 minutes · No account required</p>
      </div>
    </div>
  )
}
