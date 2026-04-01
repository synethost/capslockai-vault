import { useEffect } from 'react'
import { useStore } from '../store'
import { getSystemStatus } from '../api/status'
import { listDocuments } from '../api/documents'
import { getChatHistory } from '../api/chat'
import Sidebar from '../components/Sidebar'
import Chat from '../components/Chat/Chat'

const POLL_INTERVAL = 15_000 // ms

export default function MainApp() {
  const {
    setSystemStatus, setDocuments, setMessages,
    sidebarOpen,
  } = useStore()

  // Boot: load docs, chat history, and system status
  useEffect(() => {
    async function boot() {
      try {
        const [docs, history, status] = await Promise.all([
          listDocuments(),
          getChatHistory(),
          getSystemStatus(),
        ])
        setDocuments(docs)
        setMessages(history)
        setSystemStatus(status)
      } catch (err) {
        console.error('Boot error:', err)
      }
    }
    boot()
  }, [setDocuments, setMessages, setSystemStatus])

  // Poll status every 15s
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const status = await getSystemStatus()
        setSystemStatus(status)
      } catch { /* silent — UI already shows offline */ }
    }, POLL_INTERVAL)
    return () => clearInterval(id)
  }, [setSystemStatus])

  return (
    <div style={{ height: '100%', display: 'flex', background: 'var(--bg)' }}>
      {sidebarOpen && <Sidebar />}
      <Chat />
    </div>
  )
}
