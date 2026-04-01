import React from 'react'

// ── Button ────────────────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'ghost' | 'danger'
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'ghost',
  loading = false,
  icon,
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '11px 22px', borderRadius: 'var(--r-md)', border: 'none',
    fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 500,
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all var(--t-normal)',
    opacity: disabled || loading ? 0.5 : 1,
    whiteSpace: 'nowrap',
    ...style,
  }

  const variants: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: 'var(--amber)', color: '#1a0e00' },
    ghost: {
      background: 'transparent', color: 'var(--text-2)',
      border: '1px solid var(--border-md)',
    },
    danger: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid var(--red-dim)' },
  }

  return (
    <button
      {...rest}
      disabled={disabled || loading}
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={(e) => {
        if (disabled || loading) return
        if (variant === 'primary')
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--amber-light)'
        else
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary')
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--amber)'
        else
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
      }}
    >
      {loading ? <Spinner size={14} /> : icon}
      {children}
    </button>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────
export function Spinner({ size = 18, color = 'var(--amber)' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 20 20" fill="none"
      style={{ animation: 'spin 0.75s linear infinite', flexShrink: 0 }}
    >
      <path
        d="M10 2a8 8 0 1 0 8 8"
        stroke={color} strokeWidth="2" strokeLinecap="round"
      />
    </svg>
  )
}

// ── StatusBadge ───────────────────────────────────────────────────────
type StatusType = 'ready' | 'loading' | 'offline' | 'error' | 'processing'
const STATUS_CONFIG: Record<StatusType, { label: string; color: string; bg: string; pulse: boolean }> = {
  ready:      { label: 'AI is ready',      color: 'var(--green)',  bg: 'var(--green-dim)',  pulse: true },
  loading:    { label: 'Loading AI…',      color: 'var(--amber)',  bg: 'var(--amber-dim)',  pulse: false },
  offline:    { label: 'Offline mode',     color: 'var(--text-2)', bg: 'var(--border)',     pulse: false },
  error:      { label: 'AI unavailable',   color: 'var(--red)',    bg: 'var(--red-dim)',    pulse: false },
  processing: { label: 'Processing…',      color: 'var(--blue)',   bg: 'var(--blue-dim)',   pulse: false },
}

export function StatusBadge({ status }: { status: StatusType }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '7px 12px', borderRadius: 'var(--r-sm)',
      background: cfg.bg, border: `1px solid ${cfg.color}30`,
      fontSize: 12, color: cfg.color, fontWeight: 500,
    }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%', background: cfg.color, flexShrink: 0,
        animation: cfg.pulse ? 'breathe 2s ease-in-out infinite' : undefined,
      }} />
      {cfg.label}
    </div>
  )
}

// ── ProgressBar ───────────────────────────────────────────────────────
export function ProgressBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{
      height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden',
    }}>
      <div style={{
        height: '100%', borderRadius: 2,
        background: 'var(--amber)',
        width: `${pct}%`,
        transition: 'width 0.6s ease',
      }} />
    </div>
  )
}

// ── VaultIcon ─────────────────────────────────────────────────────────
export function VaultIcon({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="6" y="10" width="28" height="22" rx="4" stroke="var(--amber)" strokeWidth="1.5" />
      <circle cx="20" cy="21" r="4" stroke="var(--amber)" strokeWidth="1.5" />
      <path d="M20 17v-4M20 25v3" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 10V8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v2" stroke="var(--amber)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── LogoMark (small) ──────────────────────────────────────────────────
export function LogoMark({ size = 28 }: { size?: number }) {
  const pad = size * 0.15
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.25,
      background: 'var(--amber-dim)',
      border: '1px solid rgba(232,160,72,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={size - pad * 2} height={size - pad * 2} viewBox="0 0 16 16" fill="none">
        <rect x="2" y="4" width="12" height="9" rx="2" stroke="var(--amber)" strokeWidth="1.2" />
        <circle cx="8" cy="8.5" r="1.8" stroke="var(--amber)" strokeWidth="1.2" />
        <path d="M4 4V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" stroke="var(--amber)" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

// ── Send icon ─────────────────────────────────────────────────────────
export function SendIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M2 8h12M8 2l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Arrow right ───────────────────────────────────────────────────────
export function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Check ─────────────────────────────────────────────────────────────
export function CheckIcon({ size = 14, color = 'var(--green)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3.5 3.5 6-6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Trash ─────────────────────────────────────────────────────────────
export function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M5 3.5V2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v1M5.5 6v4.5M8.5 6v4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M3 3.5l.5 7a1 1 0 0 0 1 .95h5a1 1 0 0 0 1-.95l.5-7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}
