import React, { useRef, useState, useCallback } from 'react'
import { SendIcon } from '../ui'

interface Props {
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatInput({ onSend, disabled = false }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const grow = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div style={{ padding: '0.9rem 1.25rem', borderTop: '1px solid var(--border)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 10,
        background: 'var(--card)', border: '1px solid var(--border-md)',
        borderRadius: 14, padding: '10px 12px',
        transition: 'border-color var(--t-fast)',
      }}
        onFocus={() => {}}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); grow() }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={disabled ? 'AI is getting ready…' : 'Ask a question about your documents…'}
          rows={1}
          style={{
            flex: 1, background: 'none', border: 'none', outline: 'none',
            fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-1)',
            resize: 'none', lineHeight: 1.55, minHeight: 24, maxHeight: 140,
            caretColor: 'var(--amber)',
          }}
        />
        <button
          onClick={submit}
          disabled={!canSend}
          style={{
            width: 34, height: 34, borderRadius: 9, border: 'none',
            background: canSend ? 'var(--amber)' : 'var(--border)',
            color: canSend ? '#1a0e00' : 'var(--text-3)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'all var(--t-fast)',
          }}
          aria-label="Send message"
        >
          <SendIcon size={15} />
        </button>
      </div>
      <p style={{
        fontSize: 11, color: 'var(--text-3)',
        textAlign: 'center', marginTop: 7,
      }}>
        Your questions and answers never leave this device · Shift+Enter for new line
      </p>
    </div>
  )
}
