import { useState, useEffect, useRef } from 'react'
import './App.css'
import { db } from './db'
import { saveAutoBackup } from './utils/dataPortability'
import { completeMigrationIfPending } from './utils/cloudMigration'
import { SettingsModal } from './components/SettingsModal'
import { DziennikView } from './views/DziennikView'
import { NotatnikiView } from './views/NotatnikiView'

type ActiveView = 'dziennik' | 'notatniki'

export default function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [activeView, setActiveView] = useState<ActiveView>('dziennik')
  const [mobileListOpen, setMobileListOpen] = useState(false)
  const autoBackupTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    completeMigrationIfPending()
  }, [])

  useEffect(() => {
    autoBackupTimer.current = setInterval(() => saveAutoBackup(db), 5 * 60 * 1000)
    return () => { if (autoBackupTimer.current) clearInterval(autoBackupTimer.current) }
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Dopawrite</span>
        <nav className="view-tabs">
          <button
            className={`view-tab${activeView === 'dziennik' ? ' active' : ''}`}
            onClick={() => setActiveView('dziennik')}
          >
            Dziennik
          </button>
          <button
            className={`view-tab${activeView === 'notatniki' ? ' active' : ''}`}
            onClick={() => setActiveView('notatniki')}
          >
            Notatniki
          </button>
        </nav>
        {activeView === 'dziennik' && (
          <button className="mobile-list-toggle" onClick={() => setMobileListOpen(o => !o)}>
            Wpisy
          </button>
        )}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          Ustawienia
        </button>
      </header>

      {activeView === 'dziennik' && (
        <DziennikView mobileListOpen={mobileListOpen} setMobileListOpen={setMobileListOpen} />
      )}
      {activeView === 'notatniki' && <NotatnikiView />}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
