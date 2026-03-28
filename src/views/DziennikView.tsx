import { useState, useEffect, useRef, useCallback } from 'react'
import { liveQuery } from 'dexie'
import { db } from '../db'
import { MonthCalendar } from '../components/calendar/MonthCalendar'
import type { JournalEntry } from '../types'

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
  return dateStr.slice(0, 7)
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

interface Props {
  mobileListOpen: boolean
  setMobileListOpen: (open: boolean) => void
}

export function DziennikView({ mobileListOpen, setMobileListOpen }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editorState, setEditorState] = useState<EditorState | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | ''>('')
  const [sidebarMode, setSidebarMode] = useState<'list' | 'calendar'>('list')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [entries, setEntries] = useState<JournalEntry[] | undefined>(undefined)

  useEffect(() => {
    const subscription = liveQuery(() =>
      db.entries.orderBy('date').reverse().toArray()
    ).subscribe(setEntries)
    return () => subscription.unsubscribe()
  }, [])

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

  const handleNewEntry = async (date?: string) => {
    const id = generateId()
    const now = new Date().toISOString()
    await db.entries.add({
      id,
      date: date ?? todayStr(),
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

  const handleSelectDate = (date: string, entry: JournalEntry | null) => {
    if (entry) {
      handleSelectEntry(entry)
    } else {
      handleNewEntry(date)
    }
  }

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
    <div className="journal-layout">
      <aside className={`entry-list${mobileListOpen ? ' mobile-open' : ''}`}>
        <div className="entry-list-header">
          <h2>Wpisy</h2>
          <div className="entry-list-header-actions">
            <button
              className={`sidebar-mode-btn${sidebarMode === 'list' ? ' active' : ''}`}
              onClick={() => setSidebarMode('list')}
              title="Lista"
            >≡</button>
            <button
              className={`sidebar-mode-btn${sidebarMode === 'calendar' ? ' active' : ''}`}
              onClick={() => setSidebarMode('calendar')}
              title="Kalendarz"
            >▦</button>
            <button className="new-entry-btn" onClick={() => handleNewEntry()} title="Nowy wpis">+</button>
          </div>
        </div>
        <div className="entry-list-body">
          {entries === undefined ? null : sidebarMode === 'calendar' ? (
            <MonthCalendar
              entries={entries}
              selectedId={selectedId}
              onSelectDate={handleSelectDate}
            />
          ) : entries.length === 0 ? (
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

      <main className="editor-panel">
        {!editorState ? (
          <div className="editor-empty">
            <p>Wybierz wpis lub utwórz nowy</p>
            <button onClick={() => handleNewEntry()}>Nowy wpis</button>
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
  )
}
