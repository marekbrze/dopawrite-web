import { useState } from 'react'
import type { JournalEntry } from '../../types'

interface Props {
  entries: JournalEntry[]
  selectedId: string | null
  onSelectDate: (date: string, entry: JournalEntry | null) => void
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const DAY_LABELS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd']

function getMonthName(month: number, year: number): string {
  const d = new Date(year, month - 1, 1)
  return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
}

export function MonthCalendar({ entries, selectedId, onSelectDate }: Props) {
  const today = todayStr()
  const now = new Date()
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 })

  const entryByDate = new Map<string, JournalEntry>()
  for (const e of entries) {
    entryByDate.set(e.date, e)
  }

  // Build calendar grid (Mon-first weeks)
  const firstOfMonth = new Date(viewMonth.year, viewMonth.month - 1, 1)
  // 0=Sun,1=Mon...6=Sat → convert to Mon-first: Mon=0...Sun=6
  const firstDow = (firstOfMonth.getDay() + 6) % 7
  const daysInMonth = new Date(viewMonth.year, viewMonth.month, 0).getDate()
  const daysInPrevMonth = new Date(viewMonth.year, viewMonth.month - 1, 0).getDate()

  const cells: { date: string; otherMonth: boolean }[] = []

  // Pad with previous month days
  for (let i = firstDow - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const prevMonth = viewMonth.month === 1 ? 12 : viewMonth.month - 1
    const prevYear = viewMonth.month === 1 ? viewMonth.year - 1 : viewMonth.year
    cells.push({ date: dateStr(prevYear, prevMonth, day), otherMonth: true })
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: dateStr(viewMonth.year, viewMonth.month, d), otherMonth: false })
  }

  // Pad to fill remaining grid (up to 6 rows × 7 cols = 42)
  const nextMonth = viewMonth.month === 12 ? 1 : viewMonth.month + 1
  const nextYear = viewMonth.month === 12 ? viewMonth.year + 1 : viewMonth.year
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({ date: dateStr(nextYear, nextMonth, nextDay++), otherMonth: true })
  }

  const prevMonth = () => {
    setViewMonth(v => {
      if (v.month === 1) return { year: v.year - 1, month: 12 }
      return { year: v.year, month: v.month - 1 }
    })
  }

  const nextMonthNav = () => {
    setViewMonth(v => {
      if (v.month === 12) return { year: v.year + 1, month: 1 }
      return { year: v.year, month: v.month + 1 }
    })
  }

  return (
    <div className="calendar-wrapper">
      <div className="calendar-nav">
        <button className="calendar-nav-btn" onClick={prevMonth}>‹</button>
        <span className="calendar-month-label">{getMonthName(viewMonth.month, viewMonth.year)}</span>
        <button className="calendar-nav-btn" onClick={nextMonthNav}>›</button>
      </div>
      <div className="calendar-grid">
        {DAY_LABELS.map(d => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {cells.map(cell => {
          const entry = entryByDate.get(cell.date) ?? null
          const isSelected = entry !== null && entry.id === selectedId
          const isToday = cell.date === today
          let cls = 'calendar-cell'
          if (cell.otherMonth) cls += ' other-month'
          if (entry) cls += ' has-entry'
          if (isToday) cls += ' today'
          if (isSelected) cls += ' selected'
          return (
            <button
              key={cell.date}
              className={cls}
              onClick={() => onSelectDate(cell.date, entry)}
            >
              {parseInt(cell.date.slice(8))}
            </button>
          )
        })}
      </div>
    </div>
  )
}
