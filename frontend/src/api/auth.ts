import { post, setToken, clearToken } from './client'
import type { AuthToken, LoginRequest, User } from '../types'
import { get } from './client'

export async function login(credentials: LoginRequest): Promise<AuthToken> {
  const form = new FormData()
  form.append('username', credentials.username)
  form.append('password', credentials.password)

  const res = await fetch('/api/auth/token', {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? 'Invalid username or password')
  }

  const token: AuthToken = await res.json()
  setToken(token.access_token)
  return token
}

export async function logout(): Promise<void> {
  try { await post('/auth/logout', {}) } catch { /* best effort */ }
  clearToken()
}

export async function getMe(): Promise<User> {
  return get<User>('/auth/me')
}

export async function setupVault(
  vaultName: string,
  username: string = 'admin',
  password: string = 'admin'
): Promise<void> {
  await post('/vault/setup', {
    vault_name: vaultName,
    username,
    password,
  })
}
