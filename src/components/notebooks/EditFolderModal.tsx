import { useState } from 'react'
import { db } from '../../db'
import type { Folder } from '../../types'

interface Props {
  folder: Folder
  onClose: () => void
  onDelete: () => void
}

export function EditFolderModal({ folder, onClose, onDelete }: Props) {
  const [name, setName] = useState(folder.name)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await db.folders.update(folder.id, { name: name.trim(), updatedAt: new Date().toISOString() })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="simple-modal">
        <div className="simple-modal-header">
          <span>Edytuj folder</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="simple-modal-body">
          <label className="modal-label">
            Nazwa
            <input
              className="modal-text-input"
              type="text"
              placeholder="Nazwa folderu…"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </label>
          <div className="modal-actions modal-actions--spread">
            <button type="button" className="modal-btn-danger" onClick={onDelete}>Usuń folder</button>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="modal-btn-secondary" onClick={onClose}>Anuluj</button>
              <button type="submit" className="modal-btn-primary" disabled={!name.trim()}>Zapisz</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
