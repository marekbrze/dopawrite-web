import Dexie, { type EntityTable } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import type { JournalEntry, Folder, Notebook, NotebookEntry } from './types'

const getCloudUrl = (): string | null => {
  const raw = localStorage.getItem('dopawrite-cloud-url')
  if (!raw) return null
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    return raw
  } catch {
    return null
  }
}

export const isCloudSchema = () => localStorage.getItem('dopawrite-schema') === 'cloud'

export class DopawriteDB extends Dexie {
  entries!: EntityTable<JournalEntry, 'id'>
  folders!: EntityTable<Folder, 'id'>
  notebooks!: EntityTable<Notebook, 'id'>
  notebookEntries!: EntityTable<NotebookEntry, 'id'>

  constructor() {
    const cloudUrl = getCloudUrl()
    const cloud = isCloudSchema()
    super('dopawrite', { addons: (cloud || !!cloudUrl) ? [dexieCloud] : [] })

    if (cloud) {
      this.version(1).stores({
        entries: '@id, date',
      })
      this.version(2).stores({
        entries: '@id, date',
        folders: 'id, parentId',
        notebooks: 'id, folderId',
        notebookEntries: 'id, notebookId',
      })
    } else {
      this.version(1).stores({
        entries: 'id, date',
      })
      this.version(2).stores({
        entries: 'id, date',
        folders: 'id, parentId',
        notebooks: 'id, folderId',
        notebookEntries: 'id, notebookId',
      })
    }

    if (cloudUrl) {
      this.cloud.configure({
        databaseUrl: cloudUrl,
        requireAuth: true,
      })
    }
  }
}

export const db = new DopawriteDB()
