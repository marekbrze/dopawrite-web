interface Props {
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({ message, confirmLabel = 'Usuń', onConfirm, onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="simple-modal">
        <div className="simple-modal-header">
          <span>Potwierdzenie</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="simple-modal-body">
          <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--text)' }}>{message}</p>
          <div className="modal-actions">
            <button type="button" className="modal-btn-secondary" onClick={onClose}>Anuluj</button>
            <button type="button" className="modal-btn-danger" onClick={onConfirm}>{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
