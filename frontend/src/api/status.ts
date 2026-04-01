import { get } from './client'
import type { SystemStatus, VaultInfo } from '../types'

export async function getSystemStatus(): Promise<SystemStatus> {
  return get<SystemStatus>('/status')
}

export async function getVaultInfo(): Promise<VaultInfo> {
  return get<VaultInfo>('/vault/info')
}

export async function ping(): Promise<boolean> {
  try {
    const res = await fetch('/api/health', { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
