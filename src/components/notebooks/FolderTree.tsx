import type { Folder, Notebook } from '../../types'

const FolderIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'block' }}>
    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.586a1 1 0 0 1 .707.293L8.207 4H13.5A1.5 1.5 0 0 1 15 5.5v7A1.5 1.5 0 0 1 13.5 14h-11A1.5 1.5 0 0 1 1 12.5v-9z"/>
  </svg>
)

const FolderOpenIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'block' }}>
    <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h3.586a1 1 0 0 1 .707.293L8.207 4H13.5A1.5 1.5 0 0 1 15 5.5v.64c.57.265.94.876.856 1.546l-.64 5.124A2.5 2.5 0 0 1 12.733 15H3.266a2.5 2.5 0 0 1-2.481-2.19l-.64-5.124A1.5 1.5 0 0 1 1 6.14V3.5zM2 6h12v-.5a.5.5 0 0 0-.5-.5H7.793a1 1 0 0 1-.707-.293L5.172 3H2.5a.5.5 0 0 0-.5.5V6zm-.623 1.5A.5.5 0 0 0 1 8.13l.64 5.123a1.5 1.5 0 0 0 1.489 1.317h9.468a1.5 1.5 0 0 0 1.49-1.317l.638-5.123A.5.5 0 0 0 14 7.5H2z"/>
  </svg>
)

const NotebookIcon = () => (
  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'block' }}>
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h11A1.5 1.5 0 0 1 15 2.5v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 13.5v-11zM2.5 2a.5.5 0 0 0-.5.5v11a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-11a.5.5 0 0 0-.5-.5h-11zM4 5.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm0 3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8.5zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5z"/>
  </svg>
)

const CIRCUMFERENCE = 2 * Math.PI * 5 // r=5

function PromptRing({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? used / total : 0
  const done = used >= total
  const fill = pct * CIRCUMFERENCE
  return (
    <svg
      className={`nb-prompt-ring${done ? ' nb-prompt-ring--done' : ''}`}
      width="14" height="14" viewBox="0 0 14 14"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="5" className="nb-prompt-ring-bg" />
      <circle
        cx="7" cy="7" r="5"
        className="nb-prompt-ring-fill"
        strokeDasharray={`${fill} ${CIRCUMFERENCE}`}
        transform="rotate(-90 7 7)"
      />
    </svg>
  )
}

interface Props {
  folders: Folder[]
  notebooks: Notebook[]
  usedPromptCounts: Map<string, number>
  selectedNotebookId: string | null
  expandedFolderIds: Set<string>
  onSelectNotebook: (id: string) => void
  onToggleFolder: (id: string) => void
  onCreateFolder: () => void
  onCreateNotebook: () => void
  onEditFolder: (folder: Folder) => void
  onEditNotebook: (notebook: Notebook) => void
}

export function FolderTree({
  folders,
  notebooks,
  usedPromptCounts,
  selectedNotebookId,
  expandedFolderIds,
  onSelectNotebook,
  onToggleFolder,
  onCreateFolder,
  onCreateNotebook,
  onEditFolder,
  onEditNotebook,
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
            className={`notebook-row${nb.type === 'prompt-based' ? ' notebook-row--prompt' : ''}${nb.id === selectedNotebookId ? ' selected' : ''}`}
            onClick={() => onSelectNotebook(nb.id)}
          >
            <span className="notebook-row-icon"><NotebookIcon /></span>
            <span className="notebook-row-name">{nb.name}</span>
            {nb.type === 'prompt-based' && (nb.prompts ?? []).length > 0 && (
              <PromptRing used={usedPromptCounts.get(nb.id) ?? 0} total={(nb.prompts ?? []).length} />
            )}
            <span className="row-actions">
              <button className="row-action-btn" title="Edytuj" onClick={e => { e.stopPropagation(); onEditNotebook(nb) }}>✎</button>
            </span>
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
                <span className="folder-icon">{isExpanded ? <FolderOpenIcon /> : <FolderIcon />}</span>
                <span className="folder-name">{folder.name}</span>
                <span className="row-actions">
                  <button className="row-action-btn" title="Edytuj folder" onClick={e => { e.stopPropagation(); onEditFolder(folder) }}>✎</button>
                </span>
              </div>
              {isExpanded && folderNotebooks.map(nb => (
                <div
                  key={nb.id}
                  className={`notebook-row notebook-row--indented${nb.type === 'prompt-based' ? ' notebook-row--prompt' : ''}${nb.id === selectedNotebookId ? ' selected' : ''}`}
                  onClick={() => onSelectNotebook(nb.id)}
                >
                  <span className="notebook-row-icon"><NotebookIcon /></span>
                  <span className="notebook-row-name">{nb.name}</span>
                  {nb.type === 'prompt-based' && (nb.prompts ?? []).length > 0 && (
              <PromptRing used={usedPromptCounts.get(nb.id) ?? 0} total={(nb.prompts ?? []).length} />
            )}
                  <span className="row-actions">
                    <button className="row-action-btn" title="Edytuj" onClick={e => { e.stopPropagation(); onEditNotebook(nb) }}>✎</button>
                  </span>
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
