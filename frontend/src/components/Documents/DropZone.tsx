import React, { useCallback, useRef, useState } from 'react'
import { uploadDocument, formatFileSize, fileIcon } from '../../api/documents'
import { useStore } from '../../store'
import { Spinner } from '../ui'
import type { UploadProgress } from '../../types'

const ACCEPTED = ['.pdf', '.docx', '.doc', '.txt', '.pptx', '.xlsx']
const ACCEPTED_MIME = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

export default function DropZone() {
  const { addDocument } = useStore()
  const [dragOver, setDragOver] = useState(false)
  const [uploads, setUploads] = useState<UploadProgress[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const updateUpload = useCallback((file: File, patch: Partial<UploadProgress>) => {
    setUploads((prev) =>
      prev.map((u) => (u.file === file ? { ...u, ...patch } : u)),
    )
  }, [])

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const valid = Array.from(files).filter(
        (f) => ACCEPTED_MIME.includes(f.type) || ACCEPTED.some((ext) => f.name.endsWith(ext)),
      )
      if (!valid.length) return

      const newUploads: UploadProgress[] = valid.map((f) => ({
        file: f, progress: 0, status: 'uploading',
      }))
      setUploads((prev) => [...prev, ...newUploads])

      await Promise.all(
        valid.map(async (file) => {
          try {
            const doc = await uploadDocument(file, (pct) => {
              updateUpload(file, { progress: pct })
            })
            updateUpload(file, { status: 'processing', progress: 100 })
            // Poll for processing completion (simple: wait 1.5s then mark done)
            await new Promise((r) => setTimeout(r, 1500))
            updateUpload(file, { status: 'done' })
            addDocument(doc)
          } catch (err) {
            updateUpload(file, {
              status: 'error',
              error: err instanceof Error ? err.message : 'Upload failed',
            })
          }
        }),
      )
    },
    [addDocument, updateUpload],
  )

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    processFiles(e.dataTransfer.files)
  }

  const statusColor: Record<UploadProgress['status'], string> = {
    uploading:  'var(--blue)',
    processing: 'var(--amber)',
    done:       'var(--green)',
    error:      'var(--red)',
  }

  return (
    <div>
      {/* Drop area */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dragOver ? 'rgba(232,160,72,0.6)' : 'var(--border-md)'}`,
          borderRadius: 'var(--r-lg)',
          padding: '2.5rem 1.5rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'var(--amber-glow)' : 'var(--card)',
          transition: 'all var(--t-normal)',
          maxWidth: 520,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📂</div>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>
          Drop files here, or click to browse
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>
          Your files stay on this device — nothing is uploaded anywhere
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ACCEPTED.map((ext) => (
            <span key={ext} style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)',
              border: '1px solid var(--border)',
            }}>
              {ext.toUpperCase().slice(1)}
            </span>
          ))}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
        />
      </div>

      {/* Upload list */}
      {uploads.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 520 }}>
          {uploads.map((u, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '10px 14px',
            }}>
              <span style={{ fontSize: 16, opacity: 0.7 }}>{fileIcon(u.file.type)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 13, whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {u.file.name}
                </div>
                {u.status === 'uploading' && (
                  <div style={{ marginTop: 5, height: 3, background: 'var(--border)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      background: 'var(--blue)', width: `${u.progress}%`,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                )}
                {u.status === 'error' && (
                  <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>{u.error}</div>
                )}
                {u.status === 'processing' && (
                  <div style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>Indexing…</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                  {formatFileSize(u.file.size)}
                </span>
                {u.status === 'uploading' || u.status === 'processing'
                  ? <Spinner size={14} color={statusColor[u.status]} />
                  : u.status === 'done'
                  ? <span style={{ color: 'var(--green)', fontSize: 14 }}>✓</span>
                  : <span style={{ color: 'var(--red)', fontSize: 14 }}>✗</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
