import { get, del } from './client'
import type { VaultDocument } from '../types'


export async function listDocuments(): Promise<VaultDocument[]> {
  return get<VaultDocument[]>('/documents')
}

export async function deleteDocument(id: string): Promise<void> {
  return del(`/documents/${id}`)
}

export function uploadDocument(
  file: File,
  onProgress: (pct: number) => void,
): Promise<VaultDocument> {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('vault_token')
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as VaultDocument)
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else {
        let msg = `Upload failed (${xhr.status})`
        try { msg = JSON.parse(xhr.responseText)?.detail ?? msg } catch { /* ignore */ }
        reject(new Error(msg))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', '/api/documents/upload')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function fileIcon(type: string): string {
  if (type.includes('pdf')) return '📄'
  if (type.includes('word') || type.includes('docx')) return '📝'
  if (type.includes('text')) return '📋'
  if (type.includes('powerpoint') || type.includes('pptx')) return '📊'
  if (type.includes('excel') || type.includes('xlsx')) return '📈'
  return '📁'
}
