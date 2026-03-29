import { useState, useEffect, useRef } from 'react'
import './App.css'
import { db } from './db'
import { saveAutoBackup } from './utils/dataPortability'
import { completeMigrationIfPending } from './utils/cloudMigration'
import { SettingsModal } from './components/SettingsModal'
import { DziennikView } from './views/DziennikView'
import { NotatnikiView } from './views/NotatnikiView'

type ActiveView = 'dziennik' | 'notatniki'

function IconJournal() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="4.5" y="2.5" width="13" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="7.5" y1="7.5" x2="14.5" y2="7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="11" x2="14.5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="14.5" x2="11.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconNotebooks() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <rect x="4.5" y="6.5" width="13" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 4.5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M9 2.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="11" x2="14.5" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="7.5" y1="14" x2="11.5" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 2.5V4M11 18v1.5M2.5 11H4M18 11h1.5M4.75 4.75l1.06 1.06M16.19 16.19l1.06 1.06M4.75 17.25l1.06-1.06M16.19 5.81l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

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

  const handleBottomNavTap = (view: ActiveView) => {
    if (view === activeView) {
      setMobileListOpen(o => !o)
    } else {
      setActiveView(view)
      setMobileListOpen(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Dopawrite</span>
        <nav className="view-tabs">
          <button
            className={`view-tab${activeView === 'dziennik' ? ' active' : ''}`}
            onClick={() => { setActiveView('dziennik'); setMobileListOpen(false); }}
          >
            Dziennik
          </button>
          <button
            className={`view-tab${activeView === 'notatniki' ? ' active' : ''}`}
            onClick={() => { setActiveView('notatniki'); setMobileListOpen(false); }}
          >
            Notatniki
          </button>
        </nav>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          Ustawienia
        </button>
      </header>

      {mobileListOpen && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileListOpen(false)} />
      )}

      {activeView === 'dziennik' && (
        <DziennikView mobileListOpen={mobileListOpen} setMobileListOpen={setMobileListOpen} />
      )}
      {activeView === 'notatniki' && (
        <NotatnikiView mobileListOpen={mobileListOpen} setMobileListOpen={setMobileListOpen} />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}

      <nav className="app-bottom-nav" aria-label="Główna nawigacja">
        <button
          className={`app-bottom-nav-item${activeView === 'dziennik' ? ' active' : ''}`}
          onClick={() => handleBottomNavTap('dziennik')}
          aria-label="Dziennik"
        >
          <IconJournal />
          <span>Dziennik</span>
        </button>
        <button
          className={`app-bottom-nav-item${activeView === 'notatniki' ? ' active' : ''}`}
          onClick={() => handleBottomNavTap('notatniki')}
          aria-label="Notatniki"
        >
          <IconNotebooks />
          <span>Notatniki</span>
        </button>
        <button
          className="app-bottom-nav-item"
          onClick={() => setShowSettings(true)}
          aria-label="Ustawienia"
        >
          <IconSettings />
          <span>Ustawienia</span>
        </button>
      </nav>
    </div>
  )
}
