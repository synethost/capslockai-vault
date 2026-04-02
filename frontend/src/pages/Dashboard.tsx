import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/client'
import { formatFileSize, fileIcon } from '../api/documents'
import { LogoMark, Spinner } from '../components/ui'

interface DashboardData {
  documents: { total: number; ready: number; error: number; indexing: number; total_size_bytes: number }
  chat: { total_messages: number; questions_asked: number; answers_given: number }
  users: { total: number }
  ai: { provider: string; model_name: string; internet: boolean; status: string }
  storage: { disk_used_bytes: number }
  recent_activity: { id: string; content: string; timestamp: string }[]
  recent_documents: { id: string; name: string; size: number; status: string; created_at: string }[]
}

function StatCard({ label, value, sub, color = 'var(--amber)' }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
    }}>
      <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, color, lineHeight: 1, marginBottom: sub ? 6 : 0 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{sub}</div>}
    </div>
  )
}

function timeAgo(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function DocHealthBar({ ready, error, indexing, total }: {
  ready: number; error: number; indexing: number; total: number
}) {
  if (total === 0) return null
  const rPct = (ready    / total) * 100
  const ePct = (error    / total) * 100
  const iPct = (indexing / total) * 100

  return (
    <div>
      <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', gap: 1, marginBottom: 8 }}>
        <div style={{ width: `${rPct}%`, background: 'var(--green)', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${iPct}%`, background: 'var(--amber)', transition: 'width 0.6s ease' }} />
        <div style={{ width: `${ePct}%`, background: 'var(--red)', transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[
          { color: 'var(--green)', label: `${ready} ready` },
          ...(indexing > 0 ? [{ color: 'var(--amber)', label: `${indexing} indexing` }] : []),
          ...(error > 0    ? [{ color: 'var(--red)',   label: `${error} error`    }] : []),
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate  = useNavigate()
  const [data, setData]     = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const d = await get<DashboardData>('/dashboard')
        setData(d)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ height: '100%', background: 'var(--bg)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{
        padding: '0.9rem 1.5rem', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <LogoMark size={28} />
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 300, fontSize: '0.95rem', flex: 1 }}>
          Dashboard
        </div>
        <button
          onClick={() => navigate('/app')}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            padding: '5px 14px', fontSize: 13, color: 'var(--text-2)', cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          ← Back to vault
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
            <Spinner size={24} />
          </div>
        )}

        {error && (
          <div style={{ padding: '1rem', background: 'var(--red-dim)', color: 'var(--red)', borderRadius: 'var(--r-md)', fontSize: 14 }}>
            {error}
          </div>
        )}

        {data && (
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <StatCard
                label="Documents"
                value={data.documents.total}
                sub={formatFileSize(data.documents.total_size_bytes)}
              />
              <StatCard
                label="Questions asked"
                value={data.chat.questions_asked}
                sub={`${data.chat.answers_given} answered`}
                color="var(--green)"
              />
              <StatCard
                label="Team members"
                value={data.users.total}
                color="var(--blue)"
              />
              <StatCard
                label="Storage used"
                value={formatFileSize(data.storage.disk_used_bytes)}
                color="var(--text-2)"
              />
            </div>

            {/* AI status + doc health */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              {/* AI status */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  AI engine
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: data.ai.status === 'ready' ? 'var(--green)' : 'var(--red)',
                    animation: data.ai.status === 'ready' ? 'breathe 2.5s ease-in-out infinite' : 'none',
                  }} />
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-1)' }}>
                    {data.ai.status === 'ready' ? 'Running' : 'Offline'}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                  Model: <span style={{ color: 'var(--amber)' }}>{data.ai.model_name || '—'}</span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>
                  Provider: {data.ai.provider}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Internet: {data.ai.internet
                    ? <span style={{ color: 'var(--green)' }}>online</span>
                    : <span style={{ color: 'var(--text-3)' }}>offline mode</span>}
                </div>
              </div>

              {/* Document health */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  Document health
                </div>
                {data.documents.total === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No documents uploaded yet.</div>
                ) : (
                  <DocHealthBar
                    ready={data.documents.ready}
                    error={data.documents.error}
                    indexing={data.documents.indexing}
                    total={data.documents.total}
                  />
                )}
              </div>
            </div>

            {/* Recent activity + recent docs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>

              {/* Recent questions */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  Recent questions
                </div>
                {data.recent_activity.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No questions asked yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.recent_activity.map((item) => (
                      <div key={item.id} style={{
                        padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                      }}>
                        <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: 4 }}>
                          {item.content}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                          {timeAgo(item.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent documents */}
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem',
              }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                  Recent documents
                </div>
                {data.recent_documents.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No documents uploaded yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {data.recent_documents.map((doc) => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 'var(--r-sm)',
                        background: 'var(--surface)', border: '1px solid var(--border)',
                      }}>
                        <span style={{ fontSize: 16, opacity: 0.6 }}>{fileIcon(doc.name)}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 13, color: 'var(--text-1)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {doc.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                            {formatFileSize(doc.size)} · {timeAgo(doc.created_at)}
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 500,
                          background: doc.status === 'ready' ? 'var(--green-dim)' : doc.status === 'error' ? 'var(--red-dim)' : 'var(--amber-dim)',
                          color: doc.status === 'ready' ? 'var(--green)' : doc.status === 'error' ? 'var(--red)' : 'var(--amber)',
                        }}>
                          {doc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
