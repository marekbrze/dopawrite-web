export interface JournalEntry {
  id: string
  date: string       // YYYY-MM-DD
  title: string
  content: string
  createdAt: string  // ISO timestamp
  updatedAt: string  // ISO timestamp
}

export type NotebookType = 'regular' | 'prompt-based'
export type PromptMode = 'sequential' | 'shuffle'

export interface Folder {
  id: string
  name: string
  parentId: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface Notebook {
  id: string
  folderId: string | null
  name: string
  type: NotebookType
  order: number
  promptMode?: PromptMode
  prompts?: string[]
  nextPromptIndex?: number
  createdAt: string
  updatedAt: string
}

export interface NotebookEntry {
  id: string
  notebookId: string
  order: number
  title: string
  content: string
  prompt?: string
  createdAt: string
  updatedAt: string
}

export interface AppState {
  entries: JournalEntry[]
  folders?: Folder[]
  notebooks?: Notebook[]
  notebookEntries?: NotebookEntry[]
}

export interface ExportData {
  version: number
  exportedAt: string
  checksum: string
  data: AppState
}

export type ImportMode = 'merge' | 'replace'

export interface ImportPreview {
  entries: { added: number; updated: number }
}
