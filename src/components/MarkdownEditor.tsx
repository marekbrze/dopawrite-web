import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  autoFocus?: boolean
}

export function MarkdownEditor({ value, onChange, placeholder, autoFocus }: Props) {
  const [isPreview, setIsPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const switchToEdit = useCallback(() => {
    setIsPreview(false)
    requestAnimationFrame(() => {
      textareaRef.current?.focus()
    })
  }, [])

  const switchToPreview = useCallback(() => {
    if (value.trim()) setIsPreview(true)
  }, [value])

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
      onBlur={switchToPreview}
      placeholder={placeholder}
      autoFocus={autoFocus}
    />
  )
}
