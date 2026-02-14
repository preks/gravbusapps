import { useRef, useCallback } from 'react'

interface InlineEditableTitleProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  as?: 'h1' | 'h2' | 'h3' | 'span'
  className?: string
  testId?: string
}

/**
 * Renders a heading / title that can be edited directly in-place.
 * Uses contentEditable so the visual appearance is identical to the
 * static version — no input field, no border, nothing changes on click.
 */
export const InlineEditableTitle = ({
  value,
  onChange,
  disabled = false,
  as: Tag = 'span',
  className = '',
  testId = 'nexus-editable-title'
}: InlineEditableTitleProps) => {
  const elRef = useRef<HTMLElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const handleBlur = useCallback(() => {
    if (!elRef.current) return
    const text = (elRef.current.textContent || '').trim()
    if (text && text !== valueRef.current) {
      onChange(text)
    } else if (!text) {
      // Revert to original if emptied
      elRef.current.textContent = valueRef.current
    }
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      ;(e.target as HTMLElement).blur()
    }
    if (e.key === 'Escape') {
      if (elRef.current) elRef.current.textContent = valueRef.current
      ;(e.target as HTMLElement).blur()
    }
  }, [])

  return (
    <Tag
      ref={elRef as React.Ref<HTMLHeadingElement>}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`gba:outline-none gba:cursor-text gba:rounded-md gba:transition-all gba:duration-200 gba:hover:bg-accent/5 gba:focus:bg-accent/5 gba:focus:ring-1 gba:focus:ring-primary/20 gba:-mx-2 gba:px-2 ${className}`}
      data-testid={testId}
    >
      {value}
    </Tag>
  )
}
