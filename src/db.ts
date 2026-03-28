import Dexie, { type EntityTable } from 'dexie'
import dexieCloud from 'dexie-cloud-addon'
import type { JournalEntry } from './types'

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

  constructor() {
    const cloudUrl = getCloudUrl()
    const cloud = isCloudSchema()
    super('dopawrite', { addons: (cloud || !!cloudUrl) ? [dexieCloud] : [] })

    if (cloud) {
      this.version(1).stores({
        entries: '@id, date',
      })
    } else {
      this.version(1).stores({
        entries: 'id, date',
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
