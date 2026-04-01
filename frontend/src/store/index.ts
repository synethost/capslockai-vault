import { create } from 'zustand'
import type {
  User,
  VaultInfo,
  VaultDocument,
  ChatMessage,
  SystemStatus,
  AppRoute,
  WizardStep,
} from '../types'

interface VaultStore {
  // ── Routing ──────────────────────────────────────────────────────
  route: AppRoute
  setRoute: (r: AppRoute) => void

  // ── Auth ──────────────────────────────────────────────────────────
  user: User | null
  setUser: (u: User | null) => void

  // ── Vault ──────────────────────────────────────────────────────────
  vaultInfo: VaultInfo | null
  setVaultInfo: (v: VaultInfo | null) => void

  // ── Wizard ──────────────────────────────────────────────────────────
  wizardStep: WizardStep
  wizardVaultName: string
  setWizardStep: (s: WizardStep) => void
  setWizardVaultName: (n: string) => void

  // ── Documents ──────────────────────────────────────────────────────
  documents: VaultDocument[]
  setDocuments: (docs: VaultDocument[]) => void
  addDocument: (doc: VaultDocument) => void
  removeDocument: (id: string) => void
  updateDocument: (id: string, patch: Partial<VaultDocument>) => void

  // ── Chat ──────────────────────────────────────────────────────────
  messages: ChatMessage[]
  isThinking: boolean
  setMessages: (msgs: ChatMessage[]) => void
  addMessage: (msg: ChatMessage) => void
  setIsThinking: (v: boolean) => void
  updateLastMessage: (patch: Partial<ChatMessage>) => void
  clearMessages: () => void

  // ── Status ──────────────────────────────────────────────────────────
  systemStatus: SystemStatus | null
  setSystemStatus: (s: SystemStatus | null) => void

  // ── UI ──────────────────────────────────────────────────────────────
  activeDocumentId: string | null
  setActiveDocumentId: (id: string | null) => void
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
}

export const useStore = create<VaultStore>((set) => ({
  // Routing
  route: 'welcome',
  setRoute: (route) => set({ route }),

  // Auth
  user: null,
  setUser: (user) => set({ user }),

  // Vault
  vaultInfo: null,
  setVaultInfo: (vaultInfo) => set({ vaultInfo }),

  // Wizard
  wizardStep: 1,
  wizardVaultName: '',
  setWizardStep: (wizardStep) => set({ wizardStep }),
  setWizardVaultName: (wizardVaultName) => set({ wizardVaultName }),

  // Documents
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((s) => ({ documents: [...s.documents, doc] })),
  removeDocument: (id) =>
    set((s) => ({ documents: s.documents.filter((d) => d.id !== id) })),
  updateDocument: (id, patch) =>
    set((s) => ({
      documents: s.documents.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    })),

  // Chat
  messages: [],
  isThinking: false,
  setMessages: (messages) => set({ messages }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  setIsThinking: (isThinking) => set({ isThinking }),
  updateLastMessage: (patch) =>
    set((s) => {
      const msgs = [...s.messages]
      if (msgs.length === 0) return {}
      msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], ...patch }
      return { messages: msgs }
    }),
  clearMessages: () => set({ messages: [] }),

  // Status
  systemStatus: null,
  setSystemStatus: (systemStatus) => set({ systemStatus }),

  // UI
  activeDocumentId: null,
  setActiveDocumentId: (activeDocumentId) => set({ activeDocumentId }),
  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
}))
