import { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store'
import { sendMessage } from '../../api/chat'
import { generateLocalId } from '../../api/chat'
import ChatMessage, { TypingIndicator } from './ChatMessage'
import ChatInput from './ChatInput'
import type { ChatMessage as ChatMessageType } from '../../types'

const SUGGESTIONS = [
  "What's our leave policy?",
  'Summarise the Q3 sales report',
  'What are the IT password rules?',
  "What's in the onboarding checklist?",
  'Who do I contact about payroll?',
  'What are our data retention rules?',
]

export default function Chat() {
  const navigate = useNavigate()
  const {
    messages, isThinking, systemStatus,
    addMessage, setIsThinking, updateLastMessage, clearMessages,
  } = useStore()

  const bottomRef = useRef<HTMLDivElement>(null)
  const isEmpty = messages.length === 0

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = useCallback(async (text: string) => {
    if (isThinking) return

    const userMsg: ChatMessageType = {
      id: generateLocalId(),
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    }
    addMessage(userMsg)
    setIsThinking(true)

    // Optimistic AI placeholder
    const placeholderId = generateLocalId()
    const placeholder: ChatMessageType = {
      id: placeholderId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    }
    addMessage(placeholder)

    try {
      const response = await sendMessage({ message: text })
      updateLastMessage({
        content: response.response,
        sources: response.sources,
        id: response.id,
        timestamp: response.timestamp,
      })
    } catch (err) {
      updateLastMessage({
        content: err instanceof Error
          ? `Something went wrong: ${err.message}. Please try again.`
          : 'Something went wrong. Please try again.',
        sources: [],
      })
    } finally {
      setIsThinking(false)
    }
  }, [isThinking, addMessage, setIsThinking, updateLastMessage])

  async function handleClear() {
    clearMessages()
  }

  const aiNotReady = systemStatus?.ai_status !== 'ready'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>

      {/* Topbar */}
      <div style={{
        padding: '0.9rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '1rem',
          fontWeight: 300, flex: 1, color: 'var(--text-1)',
        }}>
          Ask anything about your documents
        </h3>
        {messages.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '5px 12px',
              fontSize: 12, color: 'var(--text-2)', cursor: 'pointer',
              fontFamily: 'var(--font-ui)', transition: 'all var(--t-fast)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            New conversation
          </button>
        )}
        <button
          onClick={() => navigate('/settings')}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 'var(--r-sm)', padding: '5px 12px',
            fontSize: 12, color: 'var(--text-2)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)', transition: 'all var(--t-fast)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          ⚙ Settings
        </button>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '1.5rem',
        display: 'flex', flexDirection: 'column', gap: '1.5rem',
      }}>
        {isEmpty ? (
          /* Welcome / empty state */
          <div className="fade-up" style={{
            textAlign: 'center', padding: '3rem 1rem',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: '1rem', opacity: 0.35 }}>🔍</div>
            <h3 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.4rem',
              fontWeight: 300, marginBottom: '0.5rem',
            }}>
              What would you like to know?
            </h3>
            <p style={{
              fontSize: 14, color: 'var(--text-2)',
              maxWidth: 380, margin: '0 auto 1.75rem', lineHeight: 1.7,
            }}>
              I've read all your documents and I'm ready to help.
              Ask me anything — in plain language.
            </p>
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8,
              justifyContent: 'center', maxWidth: 520,
            }}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => !aiNotReady && handleSend(s)}
                  disabled={aiNotReady}
                  style={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: 20, padding: '7px 14px',
                    fontSize: 13, color: 'var(--text-2)', cursor: aiNotReady ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ui)', transition: 'all var(--t-normal)',
                    opacity: aiNotReady ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (aiNotReady) return
                    e.currentTarget.style.borderColor = 'rgba(232,160,72,0.4)'
                    e.currentTarget.style.color = 'var(--amber)'
                    e.currentTarget.style.background = 'var(--amber-glow)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.color = 'var(--text-2)'
                    e.currentTarget.style.background = 'var(--card)'
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) =>
              msg.content === '' && isThinking
                ? <TypingIndicator key={msg.id} />
                : msg.content !== '' && <ChatMessage key={msg.id} message={msg} />
            )}
            {isThinking && messages[messages.length - 1]?.content !== '' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={handleSend} disabled={aiNotReady || isThinking} />
    </div>
  )
}
