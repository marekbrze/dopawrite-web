import { useState, useEffect } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../db'
import { FolderTree } from '../components/notebooks/FolderTree'
import { NotebookEditor } from '../components/notebooks/NotebookEditor'
import { CreateFolderModal } from '../components/notebooks/CreateFolderModal'
import { CreateNotebookModal } from '../components/notebooks/CreateNotebookModal'
import { EditNotebookModal } from '../components/notebooks/EditNotebookModal'
import { EditFolderModal } from '../components/notebooks/EditFolderModal'
import { ConfirmModal } from '../components/notebooks/ConfirmModal'
import type { Folder, Notebook } from '../types'

type PendingDelete =
  | { type: 'notebook'; item: Notebook; entryCount: number }
  | { type: 'folder'; item: Folder; notebookCount: number; entryCount: number }

async function deleteNotebook(notebookId: string) {
  await db.transaction('rw', db.notebooks, db.notebookEntries, async () => {
    await db.notebookEntries.where('notebookId').equals(notebookId).delete()
    await db.notebooks.delete(notebookId)
  })
}

async function deleteFolder(folderId: string) {
  await db.transaction('rw', db.folders, db.notebooks, db.notebookEntries, async () => {
    const notebookIds = (await db.notebooks.where('folderId').equals(folderId).primaryKeys()) as string[]
    for (const nbId of notebookIds) {
      await db.notebookEntries.where('notebookId').equals(nbId).delete()
    }
    await db.notebooks.where('folderId').equals(folderId).delete()
    await db.folders.delete(folderId)
  })
}

interface Props {
  mobileListOpen: boolean
  setMobileListOpen: (open: boolean) => void
}

export function NotatnikiView({ mobileListOpen, setMobileListOpen }: Props) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [usedPromptCounts, setUsedPromptCounts] = useState<Map<string, number>>(new Map())
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateNotebook, setShowCreateNotebook] = useState(false)
  const [editingNotebook, setEditingNotebook] = useState<Notebook | null>(null)
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)

  useEffect(() => {
    const sub1 = liveQuery(() => db.folders.toArray()).subscribe(rows => setFolders([...rows].sort((a, b) => a.order - b.order)))
    const sub2 = liveQuery(() => db.notebooks.toArray()).subscribe(rows => setNotebooks([...rows].sort((a, b) => a.order - b.order)))
    const sub3 = liveQuery(() => db.notebookEntries.toArray()).subscribe(rows => {
      const counts = new Map<string, number>()
      for (const entry of rows) {
        if (entry.prompt) {
          counts.set(entry.notebookId, (counts.get(entry.notebookId) ?? 0) + 1)
        }
      }
      setUsedPromptCounts(counts)
    })
    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
      sub3.unsubscribe()
    }
  }, [])

  const handleToggleFolder = (id: string) => {
    setExpandedFolderIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleRequestDeleteNotebook = async (nb: Notebook) => {
    setEditingNotebook(null)
    const entryCount = await db.notebookEntries.where('notebookId').equals(nb.id).count()
    setPendingDelete({ type: 'notebook', item: nb, entryCount })
  }

  const handleRequestDeleteFolder = async (folder: Folder) => {
    setEditingFolder(null)
    const notebookIds = (await db.notebooks.where('folderId').equals(folder.id).primaryKeys()) as string[]
    const entryCount = await db.notebookEntries.where('notebookId').anyOf(notebookIds).count()
    setPendingDelete({ type: 'folder', item: folder, notebookCount: notebookIds.length, entryCount })
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.type === 'notebook') {
      await deleteNotebook(pendingDelete.item.id)
      if (selectedNotebookId === pendingDelete.item.id) setSelectedNotebookId(null)
    } else {
      const folderNotebookIds = new Set(
        notebooks.filter(n => n.folderId === pendingDelete.item.id).map(n => n.id)
      )
      await deleteFolder(pendingDelete.item.id)
      if (selectedNotebookId && folderNotebookIds.has(selectedNotebookId)) setSelectedNotebookId(null)
    }
    setPendingDelete(null)
  }

  const deleteMessage = pendingDelete
    ? pendingDelete.type === 'notebook'
      ? `Usunąć notatnik «${pendingDelete.item.name}»? Zawiera ${pendingDelete.entryCount} ${pendingDelete.entryCount === 1 ? 'notatkę' : 'notatek'}.`
      : `Usunąć folder «${pendingDelete.item.name}»? Zawiera ${pendingDelete.notebookCount} ${pendingDelete.notebookCount === 1 ? 'notatnik' : 'notatników'} i ${pendingDelete.entryCount} ${pendingDelete.entryCount === 1 ? 'notatkę' : 'notatek'}.`
    : ''

  return (
    <div className="journal-layout">
      <aside className={`entry-list${mobileListOpen ? ' mobile-open' : ''}`}>
        <FolderTree
          folders={folders}
          notebooks={notebooks}
          usedPromptCounts={usedPromptCounts}
          selectedNotebookId={selectedNotebookId}
          expandedFolderIds={expandedFolderIds}
          onSelectNotebook={(id) => { setSelectedNotebookId(id); setMobileListOpen(false); }}
          onToggleFolder={handleToggleFolder}
          onCreateFolder={() => setShowCreateFolder(true)}
          onCreateNotebook={() => setShowCreateNotebook(true)}
          onEditFolder={setEditingFolder}
          onEditNotebook={setEditingNotebook}
        />
      </aside>

      <main className="editor-panel" style={{ padding: 0 }}>
        {selectedNotebookId ? (
          <NotebookEditor key={selectedNotebookId} notebookId={selectedNotebookId} />
        ) : (
          <div className="editor-empty">
            <p>Wybierz notatnik lub utwórz nowy</p>
            <button onClick={() => setShowCreateNotebook(true)}>Nowy notatnik</button>
          </div>
        )}
      </main>

      {showCreateFolder && (
        <CreateFolderModal onClose={() => setShowCreateFolder(false)} />
      )}
      {showCreateNotebook && (
        <CreateNotebookModal
          folders={folders}
          onClose={() => setShowCreateNotebook(false)}
        />
      )}
      {editingNotebook && (
        <EditNotebookModal
          notebook={editingNotebook}
          folders={folders}
          onClose={() => setEditingNotebook(null)}
          onDelete={() => handleRequestDeleteNotebook(editingNotebook)}
        />
      )}
      {editingFolder && (
        <EditFolderModal
          folder={editingFolder}
          onClose={() => setEditingFolder(null)}
          onDelete={() => handleRequestDeleteFolder(editingFolder)}
        />
      )}
      {pendingDelete && (
        <ConfirmModal
          message={deleteMessage}
          onConfirm={handleConfirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
