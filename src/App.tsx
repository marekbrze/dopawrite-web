import { useState, useEffect, useRef, useCallback } from 'react'
import { liveQuery } from 'dexie'
import './App.css'
import { db } from './db'
import { saveAutoBackup } from './utils/dataPortability'
import { completeMigrationIfPending } from './utils/cloudMigration'
import { SettingsModal } from './components/SettingsModal'
import type { JournalEntry } from './types'

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
}

function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  return date.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

function getMonthKey(dateStr: string): string {
  return dateStr.slice(0, 7) // YYYY-MM
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

interface EditorState {
  id: string
  date: string
  title: string
  content: string
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('')
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoBackupTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const [entries, setEntries] = useState<JournalEntry[] | undefined>(undefined)

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.entries.orderBy('date').reverse().toArray()
    ).subscribe(setEntries)
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    completeMigrationIfPending()
  }, [])

  // Auto-backup every 5 minutes
  useEffect(() => {
    autoBackupTimer.current = setInterval(() => saveAutoBackup(db), 5 * 60 * 1000)
    return () => { if (autoBackupTimer.current) clearInterval(autoBackupTimer.current) }
  }, [])

  // Load selected entry into editor
  useEffect(() => {
    if (!selectedId || !entries) return
    const entry = entries.find(e => e.id === selectedId)
    if (entry) {
      setEditorState({ id: entry.id, date: entry.date, title: entry.title, content: entry.content })
    }
  }, [selectedId, entries])

  const scheduleSave = useCallback((state: EditorState) => {
    setSaveStatus('saving')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await db.entries.update(state.id, {
        date: state.date,
        title: state.title,
        content: state.content,
        updatedAt: new Date().toISOString(),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(''), 2000)
    }, 1000)
  }, [])

  const handleEditorChange = (patch: Partial<EditorState>) => {
    if (!editorState) return
    const next = { ...editorState, ...patch }
    setEditorState(next)
    scheduleSave(next)
  }

  const handleNewEntry = async () => {
    const id = generateId()
    const now = new Date().toISOString()
    await db.entries.add({
      id,
      date: todayStr(),
      title: '',
      content: '',
      createdAt: now,
      updatedAt: now,
    })
    setSelectedId(id)
    setMobileListOpen(false)
  }

  const handleSelectEntry = (entry: JournalEntry) => {
    if (saveTimer.current && editorState) {
      clearTimeout(saveTimer.current)
      db.entries.update(editorState.id, {
        date: editorState.date,
        title: editorState.title,
        content: editorState.content,
        updatedAt: new Date().toISOString(),
      })
    }
    setSelectedId(entry.id)
    setMobileListOpen(false)
  }

  const handleDeleteEntry = async () => {
    if (!selectedId) return
    if (!confirm('Usunąć ten wpis?')) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await db.entries.delete(selectedId)
    setSelectedId(null)
    setEditorState(null)
  }

  // Group entries by month
  const grouped: { monthKey: string; label: string; entries: JournalEntry[] }[] = []
  if (entries) {
    for (const entry of entries) {
      const key = getMonthKey(entry.date)
      const last = grouped[grouped.length - 1]
      if (!last || last.monthKey !== key) {
        grouped.push({ monthKey: key, label: formatMonthLabel(entry.date), entries: [entry] })
      } else {
        last.entries.push(entry)
      }
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Dopawrite</span>
        <button className="mobile-list-toggle" onClick={() => setMobileListOpen(o => !o)}>
          Wpisy
        </button>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          Ustawienia
        </button>
      </header>

      <div className="journal-layout">
        {/* Entry list */}
        <aside className={`entry-list${mobileListOpen ? ' mobile-open' : ''}`}>
          <div className="entry-list-header">
            <h2>Wpisy</h2>
            <button className="new-entry-btn" onClick={handleNewEntry} title="Nowy wpis">+</button>
          </div>
          <div className="entry-list-body">
            {entries === undefined ? null : entries.length === 0 ? (
              <p className="entry-list-empty">Brak wpisów. Kliknij + aby zacząć.</p>
            ) : (
              grouped.map(group => (
                <div key={group.monthKey} className="entry-month-group">
                  <div className="entry-month-label">{group.label}</div>
                  {group.entries.map(entry => (
                    <div
                      key={entry.id}
                      className={`entry-item${entry.id === selectedId ? ' selected' : ''}`}
                      onClick={() => handleSelectEntry(entry)}
                    >
                      <span className="entry-item-date">{formatDateLabel(entry.date)}</span>
                      <span className="entry-item-title">
                        {entry.title || <em style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Bez tytułu</em>}
                      </span>
                      {entry.content && (
                        <span className="entry-item-preview">{entry.content.slice(0, 60)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="editor-panel">
          {!editorState ? (
            <div className="editor-empty">
              <p>Wybierz wpis lub utwórz nowy</p>
              <button onClick={handleNewEntry}>Nowy wpis</button>
            </div>
          ) : (
            <>
              <div className="editor-toolbar">
                <input
                  type="date"
                  className="editor-date-input"
                  value={editorState.date}
                  onChange={e => handleEditorChange({ date: e.target.value })}
                />
                <div className="editor-toolbar-divider" />
                <input
                  type="text"
                  className="editor-title-input"
                  value={editorState.title}
                  onChange={e => handleEditorChange({ title: e.target.value })}
                  placeholder="Tytuł wpisu…"
                />
                {saveStatus === 'saving' && <span className="editor-save-status">Zapisywanie…</span>}
                {saveStatus === 'saved' && <span className="editor-save-status">Zapisano</span>}
                <button className="editor-delete-btn" onClick={handleDeleteEntry}>Usuń</button>
              </div>
              <div className="editor-content">
                <textarea
                  className="editor-textarea"
                  value={editorState.content}
                  onChange={e => handleEditorChange({ content: e.target.value })}
                  placeholder="Zacznij pisać…"
                  autoFocus
                />
              </div>
            </>
          )}
        </main>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
