import { useRef, useCallback, useLayoutEffect, useEffect } from 'react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { htmlToMarkdown } from './htmlToMarkdown'

interface InlineEditableMarkdownBlockProps {
  value: string
  onChange: (value: string) => void
  /**
   * Fires on blur alongside `onChange` with the rendered HTML of the editable
   * surface. Callers that need HTML (e.g. to PATCH a document-service
   * endpoint whose `content` column stores HTML) should read from here and
   * avoid re-converting markdown back to HTML.
   */
  onHtmlChange?: (html: string) => void
  accessToken: string
  variant?: 'default' | 'chat'
  placeholder?: string
  disabled?: boolean
  className?: string
  testId?: string
}

/**
 * Renders markdown normally and makes the output directly editable.
 *
 * Internally we use two layers:
 *  1. A hidden div where React renders MarkdownWithChipsRenderer normally.
 *  2. A visible contentEditable div whose innerHTML is copied from (1).
 *
 * React never touches the visible div, so user edits are never disturbed.
 * On blur the edited HTML is converted back to markdown.
 */
export const InlineEditableMarkdownBlock = ({
  value,
  onChange,
  onHtmlChange,
  accessToken,
  variant = 'default',
  placeholder = 'Click to edit...',
  disabled = false,
  className = '',
  testId = 'editable-markdown-block'
}: InlineEditableMarkdownBlockProps) => {
  const editableRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)
  const isDirtyRef = useRef(false)
  const valueRef = useRef(value)
  const hasSyncedRef = useRef(false)

  const syncContent = useCallback(() => {
    if (!isFocusedRef.current && editableRef.current && rendererRef.current) {
      const html = rendererRef.current.innerHTML
      if (html) {
        editableRef.current.innerHTML = html
        valueRef.current = value
        hasSyncedRef.current = true
      }
    }
  }, [value])

  useLayoutEffect(() => {
    hasSyncedRef.current = false
    syncContent()
  }, [value, syncContent])

  // Fallback: if useLayoutEffect didn't sync (renderer not ready), retry after paint
  useEffect(() => {
    if (!hasSyncedRef.current) {
      syncContent()
    }
  }, [value, syncContent])

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
    isDirtyRef.current = false
  }, [])

  const handleInput = useCallback(() => {
    isDirtyRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    if (!editableRef.current || !rendererRef.current) return

    if (!isDirtyRef.current) {
      editableRef.current.innerHTML = rendererRef.current.innerHTML
      return
    }

    const md = htmlToMarkdown(editableRef.current)
    if (md !== valueRef.current) {
      valueRef.current = md
      // Emit HTML first so the parent has both representations available
      // by the time `onChange(md)` triggers its downstream effects.
      onHtmlChange?.(editableRef.current.innerHTML)
      onChange(md)
      return
    }

    editableRef.current.innerHTML = rendererRef.current.innerHTML
  }, [onChange, onHtmlChange])

  if (!value && disabled) {
    return <p className="gba:text-sm gba:text-muted-foreground gba:italic">{placeholder}</p>
  }

  return (
    <>
      <div ref={rendererRef} className="gba:hidden" aria-hidden="true">
        {value ? (
          <MarkdownWithChipsRenderer content={value} accessToken={accessToken} variant={variant} />
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground gba:italic">{placeholder}</p>
        )}
      </div>

      <div
        ref={editableRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        onFocus={handleFocus}
        onInput={handleInput}
        onBlur={handleBlur}
        className={`gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:outline-none gba:cursor-text gba:rounded-lg gba:transition-all gba:duration-200 gba:min-h-[2rem] gba:hover:bg-accent/5 gba:focus:bg-accent/5 gba:focus:ring-1 gba:focus:ring-primary/20 gba:-mx-3 gba:-my-1 gba:px-3 gba:py-1 ${className}`}
        data-testid={testId}
      />
    </>
  )
}
