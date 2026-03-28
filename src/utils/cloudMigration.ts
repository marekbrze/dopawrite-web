import { db } from '../db'
import type { JournalEntry, Folder, Notebook, NotebookEntry } from '../types'

const MIGRATION_KEY = 'dopawrite-migration-data'

export async function migrateToCloudSchema(): Promise<void> {
  const [entries, folders, notebooks, notebookEntries] = await Promise.all([
    db.entries.toArray(),
    db.folders.toArray(),
    db.notebooks.toArray(),
    db.notebookEntries.toArray(),
  ])
  sessionStorage.setItem(MIGRATION_KEY, JSON.stringify({ entries, folders, notebooks, notebookEntries }))
  localStorage.setItem('dopawrite-schema', 'cloud')
  await db.delete()
  window.location.reload()
}

export async function completeMigrationIfPending(): Promise<void> {
  const raw = sessionStorage.getItem(MIGRATION_KEY)
  if (!raw) return
  sessionStorage.removeItem(MIGRATION_KEY)

  try {
    const parsed = JSON.parse(raw)
    if (
      typeof parsed !== 'object' || parsed === null ||
      !Array.isArray(parsed.entries)
    ) {
      console.error('Migration data invalid — aborting')
      return
    }
    const {
      entries,
      folders = [],
      notebooks = [],
      notebookEntries = [],
    } = parsed as {
      entries: JournalEntry[]
      folders: Folder[]
      notebooks: Notebook[]
      notebookEntries: NotebookEntry[]
    }

    await db.entries.clear()
    for (const entry of entries) {
      await db.entries.add({
        date: entry.date,
        title: entry.title,
        content: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })
    }
    if (folders.length) await db.folders.bulkAdd(folders)
    if (notebooks.length) await db.notebooks.bulkAdd(notebooks)
    if (notebookEntries.length) await db.notebookEntries.bulkAdd(notebookEntries)
  } catch (err) {
    console.error('Migration restore failed:', err)
  }
}

export async function connectToExistingCloud(): Promise<void> {
  localStorage.setItem('dopawrite-schema', 'cloud')
  await db.delete()
  window.location.reload()
}
