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
import Dashboard from './pages/Dashboard'
import { Spinner } from './components/ui'

type BootState = 'checking' | 'no-vault' | 'need-login' | 'ready'

function BootGuard({ children }: { children: React.ReactNode }) {
  const { setVaultInfo, setUser } = useStore()
  const [boot, setBoot] = useState<BootState>('checking')

  useEffect(() => {
    async function check() {
      try {
        const info = await getVaultInfo()
        setVaultInfo(info)
        if (!info.setup_complete) { setBoot('no-vault'); return }
        if (!hasToken()) { setBoot('need-login'); return }
        try {
          const user = await getMe()
          setUser(user)
          setBoot('ready')
        } catch {
          setBoot('need-login')
        }
      } catch {
        setBoot('no-vault')
      }
    }
    check()
  }, [setVaultInfo, setUser])

  if (boot === 'checking') {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
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
        <Route path="/" element={<Welcome />} />
        <Route path="/wizard" element={<Wizard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<BootGuard><MainApp /></BootGuard>} />
        <Route path="/settings" element={<BootGuard><Settings /></BootGuard>} />
        <Route path="/dashboard" element={<BootGuard><Dashboard /></BootGuard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}