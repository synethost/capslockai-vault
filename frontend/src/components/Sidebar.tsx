import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { deleteDocument, formatFileSize, fileIcon } from '../api/documents'
import { StatusBadge, TrashIcon } from './ui'
import type { AIStatus } from '../types'
import DropZone from './Documents/DropZone'

export default function Sidebar() {
  const navigate = useNavigate()
  const { vaultInfo, documents, systemStatus, user, activeDocumentId, setActiveDocumentId, removeDocument } = useStore()
  const [showAdd, setShowAdd] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove this document from your vault?')) return
    setDeletingId(id)
    try {
      await deleteDocument(id)
      removeDocument(id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete')
    } finally {
      setDeletingId(null)
    }
  }, [removeDocument])

  const aiStatus: AIStatus = systemStatus?.ai_status ?? 'loading'
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : '?'
  const readyDocs = documents.filter(d => d.status === 'ready').length
  const errorDocs = documents.filter(d => d.status === 'error').length

  return (
    <div style={{ width: 260, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ padding: '1rem 1rem 0.7rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--amber-dim)', border: '1px solid rgba(232,160,72,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 40 40" fill="none"><rect x="6" y="10" width="28" height="22" rx="4" stroke="var(--amber)" strokeWidth="2"/><circle cx="20" cy="21" r="4" stroke="var(--amber)" strokeWidth="2"/><path d="M9 10V8a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v2" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '0.88rem', color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {vaultInfo?.name || 'Vault'}
            </div>
          </div>
          {/* User avatar */}
          <div
            title={`Logged in as ${user?.username}`}
            style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(232,160,72,0.15)', border: '1px solid rgba(232,160,72,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, color: 'var(--amber)', flexShrink: 0, cursor: 'pointer' }}
            onClick={() => navigate('/settings')}
          >
            {initials}
          </div>
        </div>

        {/* Status */}
        <StatusBadge status={aiStatus} />

        {/* Model info */}
        {systemStatus?.model_name && (
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 5 }}>
            {systemStatus.model_name}
            <span style={{ marginLeft: 6, color: systemStatus.internet_available ? 'var(--green)' : 'var(--text-3)' }}>
              · {systemStatus.internet_available ? 'online' : 'offline'}
            </span>
          </div>
        )}
      </div>

      {/* Documents section header */}
      <div style={{ padding: '0.8rem 1rem 0.3rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 500 }}>
          Documents
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {readyDocs > 0 && <span style={{ fontSize: 10, background: 'var(--green-dim)', color: 'var(--green)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(63,185,80,0.2)' }}>{readyDocs}</span>}
          {errorDocs > 0 && <span style={{ fontSize: 10, background: 'var(--red-dim)', color: 'var(--red)', padding: '1px 6px', borderRadius: 10, border: '1px solid rgba(248,81,73,0.2)' }}>{errorDocs} err</span>}
        </div>
      </div>

      {/* Document list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.4rem' }}>
        {documents.length === 0 ? (
          <div style={{ padding: '1rem 0.8rem', fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>
            No documents yet. Add some below.
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = activeDocumentId === doc.id
            const isDeleting = deletingId === doc.id
            return (
              <div
                key={doc.id}
                onClick={() => setActiveDocumentId(isActive ? null : doc.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 'var(--r-sm)', cursor: 'pointer', marginBottom: 1, background: isActive ? 'var(--amber-dim)' : 'transparent', transition: 'background 0.15s', position: 'relative' }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                  if (btn) btn.style.opacity = '1'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                  const btn = e.currentTarget.querySelector('.del-btn') as HTMLElement
                  if (btn) btn.style.opacity = '0'
                }}
              >
                <span style={{ fontSize: 14, opacity: doc.status === 'error' ? 0.4 : 0.65, flexShrink: 0 }}>{fileIcon(doc.type)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: isActive ? 'var(--text-1)' : 'var(--text-2)', opacity: doc.status === 'error' ? 0.6 : 1 }}>
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 10, marginTop: 1, color: doc.status === 'error' ? 'var(--red)' : doc.status === 'processing' ? 'var(--amber)' : 'var(--text-3)' }}>
                    {formatFileSize(doc.size)}{doc.status === 'processing' ? ' · indexing…' : doc.status === 'error' ? ' · error' : ''}
                  </div>
                </div>
                <button
                  className="del-btn"
                  onClick={(e) => handleDelete(doc.id, e)}
                  disabled={isDeleting}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '2px 3px', borderRadius: 4, display: 'flex', alignItems: 'center', opacity: 0, transition: 'all 0.15s', flexShrink: 0 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  <TrashIcon size={12} />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Add documents */}
      <div style={{ padding: '0.6rem 0.8rem', borderTop: '1px solid var(--border)' }}>
        {showAdd ? (
          <div>
            <DropZone />
            <button onClick={() => setShowAdd(false)} style={{ marginTop: 8, width: '100%', background: 'none', border: 'none', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: '4px 0' }}>Done adding</button>
          </div>
        ) : (
          <button
            onClick={() => setShowAdd(true)}
            style={{ width: '100%', padding: '8px 0', background: 'none', border: '1.5px dashed var(--border)', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'all 0.2s', textAlign: 'center' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(232,160,72,0.4)'; e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'var(--amber-glow)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'none' }}
          >
            + Add documents
          </button>
        )}
      </div>

      {/* Settings footer */}
      <div style={{ padding: '0 0.8rem 0.8rem' }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ width: '100%', padding: '8px', background: 'none', border: 'none', borderRadius: 'var(--r-sm)', fontSize: 12, color: 'var(--text-3)', cursor: 'pointer', fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-2)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
          Settings
        </button>
      </div>
    </div>
  )
}
