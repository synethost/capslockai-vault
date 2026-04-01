import { get, del } from './client'
import type { ChatMessage, ChatResponse, ChatRequest } from '../types'

export async function getChatHistory(): Promise<ChatMessage[]> {
  return get<ChatMessage[]>('/chat/history')
}

export async function clearChatHistory(): Promise<void> {
  return del('/chat/history')
}

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  const token = localStorage.getItem('vault_token')
  const res = await fetch('/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `Chat error (${res.status})`)
  }

  return res.json() as Promise<ChatResponse>
}

// Streaming version — yields text chunks as they arrive
export async function* sendMessageStream(
  req: ChatRequest,
): AsyncGenerator<string, ChatResponse, unknown> {
  const token = localStorage.getItem('vault_token')
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(req),
  })

  if (!res.ok || !res.body) {
    throw new Error(`Stream failed (${res.status})`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let finalResponse: ChatResponse | null = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          if (parsed.type === 'text') yield parsed.content as string
          if (parsed.type === 'done') finalResponse = parsed.response as ChatResponse
        } catch { /* skip malformed chunks */ }
      }
    }
  }

  return finalResponse ?? ({ id: '', response: '', sources: [], timestamp: new Date().toISOString() } as ChatResponse)
}

export function generateLocalId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
