import { useState } from 'react'
import { db } from '../../db'
import type { Folder, NotebookType, PromptMode } from '../../types'

interface Props {
  folders: Folder[]
  onClose: () => void
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function parsePrompts(raw: string): string[] {
  return raw
    .split('\n')
    .map(line => line.replace(/\\n/g, '\n'))
    .filter(line => line.trim().length > 0)
}

export function CreateNotebookModal({ folders, onClose }: Props) {
  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState<string>('')
  const [type, setType] = useState<NotebookType>('regular')
  const [promptMode, setPromptMode] = useState<PromptMode>('sequential')
  const [promptsRaw, setPromptsRaw] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const now = new Date().toISOString()
    const base = {
      id: generateId(),
      folderId: folderId || null,
      name: name.trim(),
      type,
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    }
    if (type === 'prompt-based') {
      await db.notebooks.add({
        ...base,
        promptMode,
        prompts: parsePrompts(promptsRaw),
        nextPromptIndex: 0,
      })
    } else {
      await db.notebooks.add(base)
    }
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="simple-modal simple-modal--wide">
        <div className="simple-modal-header">
          <span>Nowy notatnik</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="simple-modal-body">
          <label className="modal-label">
            Nazwa
            <input
              className="modal-text-input"
              type="text"
              placeholder="Nazwa notatnika…"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </label>

          <label className="modal-label">
            Folder
            <select
              className="modal-select"
              value={folderId}
              onChange={e => setFolderId(e.target.value)}
            >
              <option value="">Brak folderu</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </label>

          <div className="modal-label">
            Typ
            <div className="modal-radio-group">
              <label className="modal-radio-label">
                <input
                  type="radio"
                  value="regular"
                  checked={type === 'regular'}
                  onChange={() => setType('regular')}
                />
                Zwykły
              </label>
              <label className="modal-radio-label">
                <input
                  type="radio"
                  value="prompt-based"
                  checked={type === 'prompt-based'}
                  onChange={() => setType('prompt-based')}
                />
                Oparty na podpowiedziach
              </label>
            </div>
          </div>

          {type === 'prompt-based' && (
            <>
              <div className="modal-label">
                Tryb
                <div className="modal-radio-group">
                  <label className="modal-radio-label">
                    <input
                      type="radio"
                      value="sequential"
                      checked={promptMode === 'sequential'}
                      onChange={() => setPromptMode('sequential')}
                    />
                    Sekwencyjny
                  </label>
                  <label className="modal-radio-label">
                    <input
                      type="radio"
                      value="shuffle"
                      checked={promptMode === 'shuffle'}
                      onChange={() => setPromptMode('shuffle')}
                    />
                    Losowy
                  </label>
                </div>
              </div>

              <label className="modal-label">
                Podpowiedzi
                <textarea
                  className="modal-textarea"
                  value={promptsRaw}
                  onChange={e => setPromptsRaw(e.target.value)}
                  placeholder={'Jedna podpowiedź na linię.\nUżyj \\n wewnątrz linii dla podziału akapitu.'}
                  rows={6}
                />
              </label>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Anuluj</button>
            <button type="submit" className="modal-btn-primary" disabled={!name.trim()}>Utwórz</button>
          </div>
        </form>
      </div>
    </div>
  )
}
