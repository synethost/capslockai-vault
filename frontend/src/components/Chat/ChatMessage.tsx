import React from 'react'
import type { ChatMessage as ChatMessageType } from '../../types'

interface Props {
  message: ChatMessageType
  isThinking?: boolean
}

export function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 12, maxWidth: 720 }}>
      <Avatar role="assistant" />
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: 6,
        }}>
          Vault AI
        </div>
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: '14px', borderTopLeftRadius: 4,
          padding: '14px 18px', display: 'inline-flex', gap: 5,
        }}>
          {[0, 150, 300].map((delay) => (
            <span key={delay} style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--text-3)', display: 'block',
              animation: `typingBounce 0.9s ease-in-out ${delay}ms infinite`,
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

function Avatar({ role }: { role: 'user' | 'assistant' }) {
  const isAI = role === 'assistant'
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: isAI ? 14 : 11, fontWeight: 500, marginTop: 2,
      background: isAI ? 'var(--amber-dim)' : 'rgba(255,255,255,0.06)',
      border: `1px solid ${isAI ? 'rgba(232,160,72,0.2)' : 'var(--border)'}`,
      color: isAI ? 'var(--amber)' : 'var(--text-2)',
      userSelect: 'none',
    }}>
      {isAI ? '✦' : 'Me'}
    </div>
  )
}

// Simple markdown-lite renderer: bold, code, line breaks
function renderContent(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  return lines.flatMap((line, li) => {
    const parts: React.ReactNode[] = []
    const segments = line.split(/(\*\*.*?\*\*|`.*?`)/)
    segments.forEach((seg, si) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        parts.push(<strong key={`${li}-${si}`} style={{ fontWeight: 500, color: 'var(--text-1)' }}>{seg.slice(2, -2)}</strong>)
      } else if (seg.startsWith('`') && seg.endsWith('`')) {
        parts.push(
          <code key={`${li}-${si}`} style={{
            fontFamily: 'monospace', fontSize: 13,
            background: 'rgba(255,255,255,0.08)', padding: '1px 6px',
            borderRadius: 4, color: 'var(--amber)',
          }}>
            {seg.slice(1, -1)}
          </code>
        )
      } else {
        parts.push(seg)
      }
    })
    if (li < lines.length - 1) parts.push(<br key={`br-${li}`} />)
    return parts
  })
}

export default function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'

  return (
    <div style={{
      display: 'flex', gap: 12, maxWidth: 720,
      flexDirection: isUser ? 'row-reverse' : 'row',
      alignSelf: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeUp 0.3s ease both',
    }}>
      <Avatar role={message.role} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase',
          color: 'var(--text-3)', marginBottom: 6,
          textAlign: isUser ? 'right' : 'left',
        }}>
          {isUser ? 'You' : 'Vault AI'}
        </div>

        <div style={{
          background: isUser ? 'var(--amber-dim)' : 'var(--card)',
          border: `1px solid ${isUser ? 'rgba(232,160,72,0.2)' : 'var(--border)'}`,
          borderRadius: 14,
          borderTopLeftRadius: isUser ? 14 : 4,
          borderTopRightRadius: isUser ? 4 : 14,
          padding: '12px 16px',
          fontSize: 14, lineHeight: 1.7,
          color: 'var(--text-1)',
          wordBreak: 'break-word',
        }}>
          {renderContent(message.content)}
        </div>

        {/* Source citations */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {message.sources.map((src, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 20, padding: '4px 10px',
                fontSize: 11, color: 'var(--text-3)',
              }}>
                <span style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: 'var(--amber)', flexShrink: 0,
                }} />
                <span style={{ color: 'var(--text-2)' }}>{src.document_name}</span>
                {src.page && <span>· p.{src.page}</span>}
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
