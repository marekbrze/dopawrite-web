import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../../db'
import { NotebookEntryEditor } from './NotebookEntryEditor'
import type { Notebook, NotebookEntry } from '../../types'
import type { NotebookEditorState } from './NotebookEntryEditor'

interface Props {
  notebookId: string
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const DRAFT_ID = '__draft__'

export function NotebookEditor({ notebookId }: Props) {
  const [notebook, setNotebook] = useState<Notebook | undefined>(undefined)
  const [entries, setEntries] = useState<NotebookEntry[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<NotebookEditorState | null>(null)
  const [draftPrompt, setDraftPrompt] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const sub1 = liveQuery(() => db.notebooks.get(notebookId)).subscribe(nb => {
      setNotebook(nb)
    })
    const sub2 = liveQuery(() =>
      db.notebookEntries.where('notebookId').equals(notebookId).toArray()
        .then(rows => rows.sort((a, b) => a.order - b.order))
    ).subscribe(setEntries)
    return () => {
      sub1.unsubscribe()
      sub2.unsubscribe()
    }
  }, [notebookId])

  const usedPrompts = useMemo(
    () => new Set(entries.map(e => e.prompt).filter(Boolean) as string[]),
    [entries]
  )

  // Reset state when switching notebooks
  useEffect(() => {
    setSelectedEntryId(null)
    setEditorState(null)
    setDraftPrompt(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
  }, [notebookId])

  // Load selected entry into editor
  useEffect(() => {
    if (!selectedEntryId || selectedEntryId === DRAFT_ID) return
    const entry = entries.find(e => e.id === selectedEntryId)
    if (entry) {
      setEditorState({ id: entry.id, title: entry.title, content: entry.content })
      // For prompt-based notebooks, show the saved prompt
      if (notebook?.type === 'prompt-based' && entry.prompt) {
        setDraftPrompt(entry.prompt)
      } else {
        setDraftPrompt(null)
      }
    }
  }, [selectedEntryId, entries, notebook])

  const pickPrompt = useCallback((nb: Notebook, used: Set<string>): string => {
    const prompts = (nb.prompts ?? []).filter(p => !used.has(p))
    if (prompts.length === 0) return ''
    if (nb.promptMode === 'shuffle') {
      return prompts[Math.floor(Math.random() * prompts.length)]
    }
    // sequential: first unused in original order
    return prompts[0]
  }, [])

  const handleReroll = useCallback(() => {
    if (!notebook) return
    const prompts = (notebook.prompts ?? []).filter(p => !usedPrompts.has(p))
    if (prompts.length === 0) return
    if (notebook.promptMode === 'shuffle') {
      setDraftPrompt(prompts[Math.floor(Math.random() * prompts.length)])
    } else {
      setDraftPrompt(prompts[0])
    }
  }, [notebook, usedPrompts])

  const handleNewEntry = useCallback(() => {
    if (!notebook) return
    const newId = generateId()
    const now = new Date().toISOString()

    if (notebook.type === 'prompt-based') {
      const availablePrompts = (notebook.prompts ?? []).filter(p => !usedPrompts.has(p))
      if (availablePrompts.length === 0) return
      const prompt = pickPrompt(notebook, usedPrompts)
      setDraftPrompt(prompt)
      setEditorState({ id: DRAFT_ID, title: '', content: '' })
      setSelectedEntryId(DRAFT_ID)
    } else {
      // Create immediately for regular notebooks
      const maxOrder = entries.length > 0 ? Math.max(...entries.map(e => e.order)) : 0
      db.notebookEntries.add({
        id: newId,
        notebookId,
        order: maxOrder + 1,
        title: '',
        content: '',
        createdAt: now,
        updatedAt: now,
      }).then(() => {
        setSelectedEntryId(newId)
        setDraftPrompt(null)
      })
    }
  }, [notebook, notebookId, entries, pickPrompt])

  const handleSelectEntry = (entry: NotebookEntry) => {
    if (saveTimer.current && editorState) {
      clearTimeout(saveTimer.current)
      flushSave(editorState)
    }
    setSelectedEntryId(entry.id)
  }

  const flushSave = useCallback(async (state: NotebookEditorState) => {
    if (state.id === DRAFT_ID) return
    await db.notebookEntries.update(state.id, {
      title: state.title,
      content: state.content,
      updatedAt: new Date().toISOString(),
    })
  }, [])

  const scheduleSave = useCallback((state: NotebookEditorState, prompt: string | null) => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const now = new Date().toISOString()

      if (state.id === DRAFT_ID) {
        // Persist draft to DB
        const maxOrder = entries.length > 0 ? Math.max(...entries.map(e => e.order)) : 0
        const newId = generateId()
        await db.notebookEntries.add({
          id: newId,
          notebookId,
          order: maxOrder + 1,
          title: state.title,
          content: state.content,
          prompt: prompt ?? undefined,
          createdAt: now,
          updatedAt: now,
        })
        setSelectedEntryId(newId)
        setEditorState(prev => prev ? { ...prev, id: newId } : null)
      } else {
        await db.notebookEntries.update(state.id, {
          title: state.title,
          content: state.content,
          updatedAt: now,
        })
      }

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 1000)
  }, [notebookId, entries])

  const handleEditorChange = (patch: Partial<NotebookEditorState>) => {
    if (!editorState) return
    const next = { ...editorState, ...patch }
    setEditorState(next)
    scheduleSave(next, draftPrompt)
  }

  const handleDelete = async () => {
    if (!selectedEntryId || selectedEntryId === DRAFT_ID) {
      setSelectedEntryId(null)
      setEditorState(null)
      setDraftPrompt(null)
      return
    }
    if (!confirm('Usunąć tę notatkę?')) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await db.notebookEntries.delete(selectedEntryId)
    setSelectedEntryId(null)
    setEditorState(null)
    setDraftPrompt(null)
  }

  if (!notebook) return null

  const allPromptsUsed =
    notebook.type === 'prompt-based' &&
    (notebook.prompts ?? []).length > 0 &&
    (notebook.prompts ?? []).every(p => usedPrompts.has(p))

  const usedCount = usedPrompts.size
  const totalCount = (notebook.prompts ?? []).length
  const progressPct = totalCount > 0 ? Math.round((usedCount / totalCount) * 100) : 0

  return (
    <div className="notebook-editor-layout">
      <aside className="notebook-entries-list">
        <div className="entry-list-header">
          <h2>{notebook.name}</h2>
          <button
            className="new-entry-btn"
            onClick={handleNewEntry}
            title={allPromptsUsed ? 'Wszystkie podpowiedzi użyte' : 'Nowa notatka'}
            disabled={allPromptsUsed}
          >+</button>
        </div>
        {notebook.type === 'prompt-based' && totalCount > 0 && (
          <div className={`prompt-progress${allPromptsUsed ? ' prompt-progress--done' : ''}`}>
            <div className="prompt-progress-text">
              <span className="prompt-progress-count">{usedCount} / {totalCount}</span>
              <span className="prompt-progress-label">podpowiedzi</span>
            </div>
            <div
              className="prompt-progress-track"
              role="progressbar"
              aria-valuenow={usedCount}
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-label={`Postęp podpowiedzi: ${usedCount} z ${totalCount} użytych`}
            >
              <div
                className="prompt-progress-fill"
                style={{ width: `${Math.min(progressPct, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="entry-list-body">
          {/* Draft entry shown at top when in draft mode */}
          {selectedEntryId === DRAFT_ID && (
            <div className="entry-item selected">
              <span className="entry-item-title">
                {notebook.type === 'prompt-based' && draftPrompt
                  ? draftPrompt
                  : <em style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Nowa notatka…</em>
                }
              </span>
            </div>
          )}
          {entries.length === 0 && selectedEntryId !== DRAFT_ID && (
            <p className="entry-list-empty">Brak notatek. Kliknij + aby zacząć.</p>
          )}
          {entries.map(entry => {
            const displayTitle = notebook.type === 'prompt-based'
              ? (entry.prompt || <em style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Bez podpowiedzi</em>)
              : (entry.title || <em style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Bez tytułu</em>)
            return (
              <div
                key={entry.id}
                className={`entry-item${entry.id === selectedEntryId ? ' selected' : ''}`}
                onClick={() => handleSelectEntry(entry)}
              >
                <span className="entry-item-title">{displayTitle}</span>
                {entry.content && (
                  <span className="entry-item-preview">{entry.content.slice(0, 60)}</span>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      <NotebookEntryEditor
        notebook={notebook}
        editorState={editorState}
        draftPrompt={draftPrompt}
        saveStatus={saveStatus}
        onEditorChange={handleEditorChange}
        onDelete={handleDelete}
        onReroll={handleReroll}
        onNewEntry={handleNewEntry}
      />
    </div>
  )
}
