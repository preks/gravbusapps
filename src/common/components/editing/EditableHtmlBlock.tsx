import { useRef, useCallback } from 'react'

interface EditableHtmlBlockProps {
  html: string
  onChange: (html: string) => void
  className?: string
  testId?: string
}

/**
 * Editable HTML surface: renders trusted HTML in a contentEditable div.
 * On blur, captures the edited innerHTML and fires onChange.
 */
export const EditableHtmlBlock: React.FC<EditableHtmlBlockProps> = ({
  html,
  onChange,
  className = '',
  testId = 'editable-html-block'
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const isDirtyRef = useRef(false)
  const initialHtmlRef = useRef(html)

  const handleInput = useCallback(() => {
    isDirtyRef.current = true
  }, [])

  const handleBlur = useCallback(() => {
    if (!ref.current || !isDirtyRef.current) return
    isDirtyRef.current = false
    const edited = ref.current.innerHTML
    if (edited !== initialHtmlRef.current) {
      initialHtmlRef.current = edited
      onChange(edited)
    }
  }, [onChange])

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      className={`gba:prose gba:prose-sm gba:max-w-none gba:text-foreground gba:outline-none gba:cursor-text gba:rounded-lg gba:min-h-[2rem] gba:transition-all gba:duration-200 gba:hover:bg-accent/5 gba:focus:bg-accent/5 gba:focus:ring-1 gba:focus:ring-primary/20 gba:-mx-3 gba:-my-1 gba:px-3 gba:py-1 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid={testId}
    />
  )
}
