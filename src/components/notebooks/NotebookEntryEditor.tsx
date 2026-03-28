import type { Notebook } from '../../types'

interface EditorState {
  id: string
  title: string
  content: string
}

interface Props {
  notebook: Notebook
  editorState: EditorState | null
  draftPrompt: string | null
  saveStatus: 'saved' | 'saving' | ''
  onEditorChange: (patch: Partial<EditorState>) => void
  onDelete: () => void
  onReroll: () => void
  onNewEntry: () => void
}

export function NotebookEntryEditor({
  notebook,
  editorState,
  draftPrompt,
  saveStatus,
  onEditorChange,
  onDelete,
  onReroll,
  onNewEntry,
}: Props) {
  const isPromptBased = notebook.type === 'prompt-based'
  const rerollLabel = notebook.promptMode === 'sequential' ? 'Następny' : 'Losuj'

  return (
    <main className="editor-panel">
      {!editorState ? (
        <div className="editor-empty">
          <p>Wybierz notatkę lub utwórz nową</p>
          <button onClick={onNewEntry}>Nowa notatka</button>
        </div>
      ) : (
        <>
          {isPromptBased && draftPrompt !== null && (
            <div className="prompt-banner">
              <div className="prompt-banner-top">
                <span className="prompt-banner-label">Podpowiedź</span>
                <button className="prompt-reroll-btn" onClick={onReroll}>{rerollLabel} ↺</button>
              </div>
              <p className="prompt-banner-text">{draftPrompt}</p>
            </div>
          )}
          <div className="editor-toolbar">
            <input
              type="text"
              className="editor-title-input"
              value={editorState.title}
              onChange={e => onEditorChange({ title: e.target.value })}
              placeholder="Tytuł notatki…"
            />
            {saveStatus === 'saving' && <span className="editor-save-status">Zapisywanie…</span>}
            {saveStatus === 'saved' && <span className="editor-save-status">Zapisano</span>}
            <button className="editor-delete-btn" onClick={onDelete}>Usuń</button>
          </div>
          <div className="editor-content">
            <textarea
              className="editor-textarea"
              value={editorState.content}
              onChange={e => onEditorChange({ content: e.target.value })}
              placeholder="Zacznij pisać…"
              autoFocus
            />
          </div>
        </>
      )}
    </main>
  )
}

export type { EditorState as NotebookEditorState }
