// ── Auth ─────────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string
  password: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

export interface User {
  id: number
  username: string
  email?: string
}

// ── Vault ─────────────────────────────────────────────────────────────
export interface VaultInfo {
  name: string
  setup_complete: boolean
  created_at?: string
}

export interface VaultSetupRequest {
  vault_name: string
}

// ── Documents ─────────────────────────────────────────────────────────
export type DocumentStatus = 'processing' | 'ready' | 'error'

export interface VaultDocument {
  id: string
  name: string
  size: number
  type: string
  status: DocumentStatus
  created_at: string
  page_count?: number
}

export interface UploadProgress {
  file: File
  progress: number
  status: 'uploading' | 'processing' | 'done' | 'error'
  error?: string
}

// ── Chat ─────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant'

export interface MessageSource {
  document_name: string
  document_id: string
  page?: number
  excerpt?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  sources?: MessageSource[]
  timestamp: string
}

export interface ChatRequest {
  message: string
  document_ids?: string[]
}

export interface ChatResponse {
  id: string
  response: string
  sources: MessageSource[]
  timestamp: string
}

// ── Status ─────────────────────────────────────────────────────────────
export type AIStatus = 'ready' | 'loading' | 'offline' | 'error'
export type AIProvider = 'ollama' | 'openai' | 'anthropic' | 'none'

export interface SystemStatus {
  ai_status: AIStatus
  ai_provider: AIProvider
  model_name?: string
  documents_count: number
  internet_available: boolean
}

// ── UI State ─────────────────────────────────────────────────────────
export type AppRoute = 'welcome' | 'wizard' | 'login' | 'app'
export type WizardStep = 1 | 2 | 3

export interface ApiError {
  message: string
  status?: number
}
