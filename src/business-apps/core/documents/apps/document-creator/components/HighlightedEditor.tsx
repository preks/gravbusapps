import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactQuill from 'react-quill'
import { Button } from '@newwork/nw-design-system'
import { CheckCircle, XCircle, WarningCircle, Info } from '@phosphor-icons/react'
import { createPortal } from 'react-dom'

export interface EditorAnnotation {
  id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  category: string
  original_text: string
  message: string
  suggestion?: string
  resolved?: boolean
}

interface HighlightedEditorProps {
  value: string
  onChange: (value: string) => void
  annotations: EditorAnnotation[]
  onAcceptAnnotation: (annotation: EditorAnnotation) => void
  onDismissAnnotation: (id: string) => void
  placeholder?: string
}

// Popover component rendered via portal
const AnnotationPopover: React.FC<{
  annotation: EditorAnnotation
  position: { x: number; y: number }
  onAccept: () => void
  onDismiss: () => void
  onClose: () => void
}> = ({ annotation, position, onAccept, onDismiss, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 150)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="gba:w-4 gba:h-4" weight="fill" />
      case 'warning':
        return <WarningCircle className="gba:w-4 gba:h-4" weight="fill" />
      default:
        return <Info className="gba:w-4 gba:h-4" weight="fill" />
    }
  }

  const getSeverityClasses = (severity: string) => {
    switch (severity) {
      case 'critical':
        return { badge: 'gba:bg-destructive-secondary gba:text-destructive', border: 'gba:border-destructive/30' }
      case 'warning':
        return {
          badge: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
          border: 'gba:border-warning/30'
        }
      default:
        return { badge: 'gba:bg-info-secondary gba:text-info-secondary-foreground', border: 'gba:border-info/30' }
    }
  }

  const severity = getSeverityClasses(annotation.severity)

  // Position calculation
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const popoverWidth = 340
  const popoverHeight = 280

  let left = position.x - popoverWidth / 2
  let top = position.y + 15

  if (left + popoverWidth > viewportWidth - 16) left = viewportWidth - popoverWidth - 16
  if (left < 16) left = 16
  if (top + popoverHeight > viewportHeight - 16) top = position.y - popoverHeight - 15

  return createPortal(
    <div
      ref={popoverRef}
      className={`gba:fixed gba:z-[999999] gba:w-[340px] gba:bg-card gba:rounded-xl gba:p-4 gba:border-2 ${severity.border} gba:shadow-xl gba:animate-in gba:fade-in gba:zoom-in-95`}
      style={{ top, left }}
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <span
          className={`gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-md gba:text-xs gba:font-bold ${severity.badge}`}
        >
          {getSeverityIcon(annotation.severity)}
          {annotation.category.toUpperCase()}
        </span>
        <button onClick={onClose} className="gba:p-1 gba:rounded gba:text-muted-foreground hover:gba:bg-muted">
          <XCircle className="gba:w-4 gba:h-4" />
        </button>
      </div>

      {/* Problem */}
      <div className="gba:mb-3">
        <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:font-mono gba:bg-destructive-secondary gba:text-destructive gba:border gba:border-destructive/20">
          {annotation.original_text}
        </div>
      </div>

      {/* Explanation */}
      <p className="gba:text-sm gba:mb-3 gba:text-muted-foreground gba:leading-relaxed">{annotation.message}</p>

      {/* Suggestion */}
      {annotation.suggestion && (
        <div className="gba:mb-4">
          <div className="gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:font-mono gba:bg-success-secondary gba:text-success-secondary-foreground gba:border gba:border-success/20">
            → {annotation.suggestion}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="gba:flex gba:gap-2">
        <Button type="button" size="sm" onClick={onAccept} className="gba:flex-1 gba:gap-1.5">
          <CheckCircle className="gba:w-4 gba:h-4" weight="bold" />
          {annotation.suggestion ? 'Apply Fix' : 'OK'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss} className="gba:gap-1.5">
          <XCircle className="gba:w-4 gba:h-4" />
          Ignore
        </Button>
      </div>
    </div>,
    document.body
  )
}

export const HighlightedEditor: React.FC<HighlightedEditorProps> = ({
  value,
  onChange,
  annotations,
  onAcceptAnnotation,
  onDismissAnnotation,
  placeholder
}) => {
  const editorRef = useRef<ReactQuill>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<EditorAnnotation | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null)

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }, { indent: '-1' }, { indent: '+1' }],
        [{ align: [] }],
        ['link'],
        ['clean']
      ]
    }),
    []
  )

  const quillFormats = useMemo(
    () => [
      'header',
      'bold',
      'italic',
      'underline',
      'strike',
      'list',
      'bullet',
      'indent',
      'align',
      'link',
      'background'
    ],
    []
  )

  // Highlight colors using CSS custom properties (design tokens)
  // These are programmatic colors for Quill - using semantic values
  const getHighlightColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return 'hsl(var(--destructive-secondary))'
      case 'warning':
        return 'hsl(var(--warning-secondary))'
      default:
        return 'hsl(var(--info-secondary))'
    }
  }, [])

  // Apply highlights - only for UNRESOLVED annotations
  const applyHighlights = useCallback(() => {
    if (!editorRef.current) return

    try {
      const quill = editorRef.current.getEditor()
      const text = quill.getText()

      // ALWAYS clear all highlights first
      quill.formatText(0, text.length, 'background', false, 'silent')

      // Only highlight UNRESOLVED annotations
      const unresolvedAnnotations = annotations.filter(a => !a.resolved)

      console.log('[HighlightedEditor] Applying highlights for', unresolvedAnnotations.length, 'annotations')

      unresolvedAnnotations.forEach(annotation => {
        if (!annotation.original_text) return
        const searchText = annotation.original_text.toLowerCase()
        const index = text.toLowerCase().indexOf(searchText)

        if (index !== -1) {
          const color = getHighlightColor(annotation.severity)
          console.log(
            '[HighlightedEditor] Highlighting:',
            annotation.original_text,
            'at index',
            index,
            'with color',
            color
          )
          quill.formatText(index, annotation.original_text.length, 'background', color, 'silent')
        } else {
          console.log('[HighlightedEditor] Text not found:', annotation.original_text)
        }
      })
    } catch (err) {
      console.error('[HighlightedEditor] Error applying highlights:', err)
    }
  }, [annotations, getHighlightColor])

  // Re-apply highlights when annotations change (including when resolved)
  useEffect(() => {
    console.log(
      '[HighlightedEditor] Annotations changed, count:',
      annotations.length,
      'unresolved:',
      annotations.filter(a => !a.resolved).length
    )
    // Apply immediately and also after a delay
    applyHighlights()
    const timer = setTimeout(applyHighlights, 100)
    const timer2 = setTimeout(applyHighlights, 300)
    return () => {
      clearTimeout(timer)
      clearTimeout(timer2)
    }
  }, [annotations, applyHighlights])

  // Direct DOM event listener
  useEffect(() => {
    if (!editorRef.current) return

    const quillRoot = editorRef.current.getEditor().root

    const handleMouseDown = (e: MouseEvent) => {
      let target = e.target as HTMLElement | null
      let highlightedElement: HTMLElement | null = null

      for (let i = 0; i < 6 && target; i++) {
        const style = target.getAttribute('style') || ''
        if (style.includes('background-color')) {
          highlightedElement = target
          break
        }
        target = target.parentElement
      }

      if (!highlightedElement) return

      const clickedText = highlightedElement.textContent?.trim().toLowerCase() || ''
      if (!clickedText) return

      // Only check UNRESOLVED annotations
      const unresolvedAnnotations = annotations.filter(a => !a.resolved)

      for (const annotation of unresolvedAnnotations) {
        if (!annotation.original_text) continue

        const annotationText = annotation.original_text.toLowerCase().trim()

        if (
          annotationText === clickedText ||
          annotationText.includes(clickedText) ||
          clickedText.includes(annotationText)
        ) {
          e.preventDefault()
          e.stopPropagation()

          setSelectedAnnotation(annotation)
          setPopoverPosition({ x: e.clientX, y: e.clientY })
          return
        }
      }
    }

    quillRoot.addEventListener('mousedown', handleMouseDown)
    return () => quillRoot.removeEventListener('mousedown', handleMouseDown)
  }, [annotations])

  const handleAccept = useCallback(() => {
    if (selectedAnnotation) {
      onAcceptAnnotation(selectedAnnotation)
      setSelectedAnnotation(null)
      setPopoverPosition(null)
    }
  }, [selectedAnnotation, onAcceptAnnotation])

  const handleDismiss = useCallback(() => {
    if (selectedAnnotation) {
      onDismissAnnotation(selectedAnnotation.id)
      setSelectedAnnotation(null)
      setPopoverPosition(null)
    }
  }, [selectedAnnotation, onDismissAnnotation])

  const handleClose = useCallback(() => {
    setSelectedAnnotation(null)
    setPopoverPosition(null)
  }, [])

  const handleChange = useCallback(
    (newValue: string) => {
      onChange(newValue)
      setTimeout(applyHighlights, 100)
    },
    [onChange, applyHighlights]
  )

  const unresolvedCount = annotations.filter(a => !a.resolved).length

  return (
    <div ref={containerRef} className="gba:relative gba:h-full">
      {/* Issue counter - only show if there are unresolved issues */}
      {unresolvedCount > 0 && (
        <div className="gba:absolute gba:top-12 gba:right-3 gba:z-20 gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-full gba:text-xs gba:font-bold gba:bg-warning-secondary gba:text-warning-secondary-foreground gba:border-2 gba:border-warning gba:shadow-md">
          <WarningCircle className="gba:w-4 gba:h-4" weight="fill" />
          {unresolvedCount} issue{unresolvedCount !== 1 ? 's' : ''} · Click highlighted text
        </div>
      )}

      {/* Editor styles - make highlights VERY visible */}
      <style>{`
        .doc-editor .ql-container {
          height: calc(100% - 42px);
          font-size: 15px;
          line-height: 1.8;
        }
        .doc-editor .ql-editor {
          min-height: 100%;
          padding: 24px;
        }
        .doc-editor .ql-editor span[style*="background-color"] {
          cursor: pointer !important;
          padding: 2px 4px;
          margin: 0 1px;
          border-radius: 4px;
          border-bottom: 3px solid hsl(var(--destructive));
          font-weight: 500;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px hsl(var(--destructive) / 0.3);
        }
        .doc-editor .ql-editor span[style*="background-color"]:hover {
          filter: brightness(0.9);
          box-shadow: 0 3px 8px hsl(var(--destructive) / 0.4);
          transform: translateY(-1px);
        }
        .doc-editor .ql-toolbar {
          border-color: hsl(var(--border)) !important;
          background: hsl(var(--muted));
          border-radius: 8px 8px 0 0;
        }
        .doc-editor .ql-container {
          border-color: hsl(var(--border)) !important;
          border-radius: 0 0 8px 8px;
        }
      `}</style>

      <div className="gba:h-full doc-editor">
        <ReactQuill
          ref={editorRef}
          theme="snow"
          value={value}
          onChange={handleChange}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder}
        />
      </div>

      {/* Popover via Portal */}
      {selectedAnnotation && popoverPosition && (
        <AnnotationPopover
          annotation={selectedAnnotation}
          position={popoverPosition}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
          onClose={handleClose}
        />
      )}
    </div>
  )
}

export default HighlightedEditor
