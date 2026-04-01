import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { hasToken } from './api/client'
import { getVaultInfo } from './api/status'
import { getMe } from './api/auth'
import { useStore } from './store'
import Welcome from './pages/Welcome'
import Wizard from './pages/Wizard'
import Login from './pages/Login'
import MainApp from './pages/MainApp'
import Settings from './pages/Settings'
import { Spinner } from './components/ui'

// ── Boot logic ─────────────────────────────────────────────────────────
// On first load we check the backend to decide where to send the user:
// 1. If vault is not set up → Welcome → Wizard
// 2. If vault is set up but no token → Login
// 3. If vault is set up AND token is valid → MainApp
// This runs once per session; the result drives the initial redirect.

type BootState = 'checking' | 'no-vault' | 'need-login' | 'ready'

function BootGuard({ children }: { children: React.ReactNode }) {
  const { setVaultInfo, setUser } = useStore()
  const [boot, setBoot] = useState<BootState>('checking')

  useEffect(() => {
    async function check() {
      try {
        // Always try vault info first — this endpoint is public
        const info = await getVaultInfo()
        setVaultInfo(info)

        if (!info.setup_complete) {
          setBoot('no-vault')
          return
        }

        if (!hasToken()) {
          setBoot('need-login')
          return
        }

        // Validate existing token
        try {
          const user = await getMe()
          setUser(user)
          setBoot('ready')
        } catch {
          // Token expired or invalid
          setBoot('need-login')
        }
      } catch {
        // Backend not up yet — show welcome so user isn't stuck on blank
        setBoot('no-vault')
      }
    }
    check()
  }, [setVaultInfo, setUser])

  if (boot === 'checking') {
    return (
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)',
        flexDirection: 'column', gap: 16,
      }}>
        <Spinner size={28} />
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Starting Vault…</p>
      </div>
    )
  }

  if (boot === 'no-vault') return <Navigate to="/" replace />
  if (boot === 'need-login') return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no auth needed */}
        <Route path="/" element={<Welcome />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/login" element={<Login />} />

        {/* Protected — boot guard decides */}
        <Route
          path="/app"
          element={
            <BootGuard>
              <MainApp />
            </BootGuard>
          }
        />

        <Route
          path="/settings"
          element={
            <BootGuard>
              <Settings />
            </BootGuard>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
