export interface JournalEntry {
  id: string
  date: string       // YYYY-MM-DD
  title: string
  content: string
  createdAt: string  // ISO timestamp
  updatedAt: string  // ISO timestamp
}

export interface AppState {
  entries: JournalEntry[]
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
