import type { ApiError } from '../types'

const BASE_URL = '/api'

function getToken(): string | null {
  return localStorage.getItem('vault_token')
}

export function setToken(token: string): void {
  localStorage.setItem('vault_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('vault_token')
}

export function hasToken(): boolean {
  return !!getToken()
}

function buildHeaders(extra: Record<string, string> = {}): HeadersInit {
  const headers: Record<string, string> = { ...extra }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  return headers
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    clearToken()
    window.location.hash = '#/login'
    throw { message: 'Session expired — please log in again.', status: 401 } as ApiError
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.detail ?? body.message ?? message
    } catch { /* ignore parse errors */ }
    throw { message, status: res.status } as ApiError
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'GET',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
  })
  return handleResponse<T>(res)
}

export async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}

export async function postForm<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: buildHeaders(),
    body: form,
  })
  return handleResponse<T>(res)
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
  })
  return handleResponse<T>(res)
}

export async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: buildHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return handleResponse<T>(res)
}
