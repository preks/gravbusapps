import { useRef, useCallback, useLayoutEffect } from 'react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { htmlToMarkdown } from './htmlToMarkdown'

interface InlineEditableMarkdownBlockProps {
  value: string
  onChange: (value: string) => void
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
  accessToken,
  variant = 'default',
  placeholder = 'Click to edit...',
  disabled = false,
  className = '',
  testId = 'nexus-editable-block'
}: InlineEditableMarkdownBlockProps) => {
  const editableRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<HTMLDivElement>(null)
  const isFocusedRef = useRef(false)
  const valueRef = useRef(value)

  // Sync rendered HTML → editable container whenever value changes and
  // the user is not actively editing. useLayoutEffect prevents any flash.
  useLayoutEffect(() => {
    if (!isFocusedRef.current && editableRef.current && rendererRef.current) {
      editableRef.current.innerHTML = rendererRef.current.innerHTML
      valueRef.current = value
    }
  }, [value])

  const handleFocus = useCallback(() => {
    isFocusedRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    isFocusedRef.current = false
    if (!editableRef.current) return
    const md = htmlToMarkdown(editableRef.current)
    if (md !== valueRef.current) {
      valueRef.current = md
      onChange(md)
    }
  }, [onChange])

  if (!value && disabled) {
    return <p className="gba:text-sm gba:text-muted-foreground gba:italic">{placeholder}</p>
  }

  return (
    <>
      {/* Hidden: React renders markdown here normally */}
      <div ref={rendererRef} className="gba:hidden" aria-hidden="true">
        {value ? (
          <MarkdownWithChipsRenderer content={value} accessToken={accessToken} variant={variant} />
        ) : (
          <p className="gba:text-sm gba:text-muted-foreground gba:italic">{placeholder}</p>
        )}
      </div>

      {/* Visible: user edits this directly — React never touches its innerHTML */}
      <div
        ref={editableRef}
        contentEditable={!disabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`gba:outline-none gba:cursor-text gba:rounded-lg gba:transition-all gba:duration-200 gba:hover:bg-accent/5 gba:focus:bg-accent/5 gba:focus:ring-1 gba:focus:ring-primary/20 gba:-mx-3 gba:-my-1 gba:px-3 gba:py-1 ${className}`}
        data-testid={testId}
      />
    </>
  )
}
