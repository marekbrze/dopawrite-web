import type { Folder, Notebook } from '../../types'

interface Props {
  folders: Folder[]
  notebooks: Notebook[]
  selectedNotebookId: string | null
  expandedFolderIds: Set<string>
  onSelectNotebook: (id: string) => void
  onToggleFolder: (id: string) => void
  onCreateFolder: () => void
  onCreateNotebook: () => void
}

export function FolderTree({
  folders,
  notebooks,
  selectedNotebookId,
  expandedFolderIds,
  onSelectNotebook,
  onToggleFolder,
  onCreateFolder,
  onCreateNotebook,
}: Props) {
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order)
  const rootNotebooks = [...notebooks]
    .filter(n => n.folderId === null)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="folder-tree">
      <div className="folder-tree-header">
        <h2>Notatniki</h2>
        <div className="folder-tree-actions">
          <button className="new-entry-btn" onClick={onCreateFolder} title="Nowy folder">⊕</button>
          <button className="new-entry-btn" onClick={onCreateNotebook} title="Nowy notatnik">+</button>
        </div>
      </div>
      <div className="folder-tree-body">
        {rootNotebooks.map(nb => (
          <div
            key={nb.id}
            className={`notebook-row${nb.id === selectedNotebookId ? ' selected' : ''}`}
            onClick={() => onSelectNotebook(nb.id)}
          >
            <span className="notebook-row-icon">{nb.type === 'prompt-based' ? '✦' : '◻'}</span>
            <span className="notebook-row-name">{nb.name}</span>
          </div>
        ))}

        {sortedFolders.map(folder => {
          const folderNotebooks = [...notebooks]
            .filter(n => n.folderId === folder.id)
            .sort((a, b) => a.order - b.order)
          const isExpanded = expandedFolderIds.has(folder.id)

          return (
            <div key={folder.id} className="folder-group">
              <div className="folder-row" onClick={() => onToggleFolder(folder.id)}>
                <span className="folder-arrow">{isExpanded ? '▾' : '▸'}</span>
                <span className="folder-name">{folder.name}</span>
              </div>
              {isExpanded && folderNotebooks.map(nb => (
                <div
                  key={nb.id}
                  className={`notebook-row notebook-row--indented${nb.id === selectedNotebookId ? ' selected' : ''}`}
                  onClick={() => onSelectNotebook(nb.id)}
                >
                  <span className="notebook-row-icon">{nb.type === 'prompt-based' ? '✦' : '◻'}</span>
                  <span className="notebook-row-name">{nb.name}</span>
                </div>
              ))}
            </div>
          )
        })}

        {folders.length === 0 && notebooks.length === 0 && (
          <p className="entry-list-empty">Brak notatników. Kliknij + aby zacząć.</p>
        )}
      </div>
    </div>
  )
}
