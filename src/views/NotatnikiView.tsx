import { useState, useEffect } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../db'
import { FolderTree } from '../components/notebooks/FolderTree'
import { NotebookEditor } from '../components/notebooks/NotebookEditor'
import { CreateFolderModal } from '../components/notebooks/CreateFolderModal'
import { CreateNotebookModal } from '../components/notebooks/CreateNotebookModal'
import type { Folder, Notebook } from '../types'

export function NotatnikiView() {
  const [folders, setFolders] = useState<Folder[]>([])
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [showCreateNotebook, setShowCreateNotebook] = useState(false)

  useEffect(() => {
    const sub1 = liveQuery(() => db.folders.orderBy('order').toArray()).subscribe(setFolders)
    const sub2 = liveQuery(() => db.notebooks.orderBy('order').toArray()).subscribe(setNotebooks)
    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
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

  return (
    <div className="journal-layout">
      <aside className="entry-list">
        <FolderTree
          folders={folders}
          notebooks={notebooks}
          selectedNotebookId={selectedNotebookId}
          expandedFolderIds={expandedFolderIds}
          onSelectNotebook={setSelectedNotebookId}
          onToggleFolder={handleToggleFolder}
          onCreateFolder={() => setShowCreateFolder(true)}
          onCreateNotebook={() => setShowCreateNotebook(true)}
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
    </div>
  )
}
