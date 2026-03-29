import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

const PREVIEW_DELAY = 1500

export function MarkdownEditor({ value, onChange, placeholder, autoFocus }: Props) {
  const [isPreview, setIsPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const schedulePreview = useCallback(() => {
    cancelTimer()
    if (!value.trim()) return
    timerRef.current = setTimeout(() => setIsPreview(true), PREVIEW_DELAY)
  }, [value, cancelTimer])

  const switchToEdit = useCallback(() => {
    cancelTimer()
    setIsPreview(false)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }, [cancelTimer])

  // Schedule preview whenever value changes while editing
  useEffect(() => {
    if (!isPreview) {
      schedulePreview()
    }
    return cancelTimer
  }, [value, isPreview, schedulePreview, cancelTimer])

  // If content is cleared, go back to edit mode
  useEffect(() => {
    if (!value.trim() && isPreview) {
      setIsPreview(false)
    }
  }, [value, isPreview])

  if (isPreview) {
    return (
      <div
        className="markdown-preview"
        onClick={switchToEdit}
        onKeyDown={switchToEdit}
        tabIndex={0}
        role="textbox"
        aria-multiline
        aria-label="Podgląd markdown, kliknij aby edytować"
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
      </div>
    )
  }

  return (
    <textarea
      ref={textareaRef}
      className="editor-textarea"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  )
}
