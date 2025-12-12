import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import ReactQuill from 'react-quill'
import { Button } from '@newwork/nw-design-system'
import { Check, X, Warning, Info, XCircle } from '@phosphor-icons/react'
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
        return <Warning className="gba:w-4 gba:h-4" weight="fill" />
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
          <X className="gba:w-4 gba:h-4" />
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
          <Check className="gba:w-4 gba:h-4" weight="bold" />
          {annotation.suggestion ? 'Apply Fix' : 'OK'}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDismiss} className="gba:gap-1.5">
          <X className="gba:w-4 gba:h-4" />
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

  // Highlight colors - Quill requires actual color values, not CSS variables
  // Using vivid colors that stand out clearly in the editor
  const getHighlightColor = useCallback((severity: string) => {
    switch (severity) {
      case 'critical':
        return '#fecaca' // Light red - matches destructive-secondary
      case 'warning':
        return '#fef08a' // Light yellow - matches warning-secondary
      default:
        return '#bfdbfe' // Light blue - matches info-secondary
    }
  }, [])

  // Normalize text for comparison (handles whitespace differences)
  const normalizeText = useCallback((text: string) => {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ') // Normalize all whitespace to single space
      .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
      .trim()
  }, [])

  // Find text position with fuzzy matching
  const findTextPosition = useCallback(
    (quillText: string, searchText: string): { index: number; length: number } | null => {
      // Try exact match first (case-insensitive)
      const lowerQuillText = quillText.toLowerCase()
      const lowerSearchText = searchText.toLowerCase()
      const index = lowerQuillText.indexOf(lowerSearchText)

      if (index !== -1) {
        return { index, length: searchText.length }
      }

      // Try with normalized whitespace
      const normalizedSearch = normalizeText(searchText)

      // Build a sliding window search with whitespace tolerance
      const words = normalizedSearch.split(' ').filter(w => w.length > 0)
      if (words.length === 0) return null

      // Try to find the first word and then verify the rest
      const firstWord = words[0]
      let searchStart = 0

      while (searchStart < lowerQuillText.length) {
        const firstWordIndex = lowerQuillText.indexOf(firstWord, searchStart)
        if (firstWordIndex === -1) break

        // Check if the rest of the words follow (with some whitespace flexibility)
        let matchLength = firstWord.length
        let currentPos = firstWordIndex + firstWord.length
        let allWordsFound = true

        for (let i = 1; i < words.length; i++) {
          // Skip whitespace
          while (currentPos < lowerQuillText.length && /\s/.test(lowerQuillText[currentPos])) {
            currentPos++
            matchLength++
          }

          // Check for next word
          if (lowerQuillText.substring(currentPos, currentPos + words[i].length) === words[i]) {
            matchLength += words[i].length
            currentPos += words[i].length
          } else {
            allWordsFound = false
            break
          }
        }

        if (allWordsFound) {
          return { index: firstWordIndex, length: matchLength }
        }

        searchStart = firstWordIndex + 1
      }

      return null
    },
    [normalizeText]
  )

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

        const match = findTextPosition(text, annotation.original_text)

        if (match) {
          const color = getHighlightColor(annotation.severity)
          console.log(
            '[HighlightedEditor] Highlighting:',
            annotation.original_text,
            'at index',
            match.index,
            'length',
            match.length,
            'with color',
            color
          )
          quill.formatText(match.index, match.length, 'background', color, 'silent')
        } else {
          console.log(
            '[HighlightedEditor] Text not found:',
            annotation.original_text,
            '| Quill text sample:',
            text.substring(0, 200)
          )
        }
      })
    } catch (err) {
      console.error('[HighlightedEditor] Error applying highlights:', err)
    }
  }, [annotations, getHighlightColor, findTextPosition])

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
          <Warning className="gba:w-4 gba:h-4" weight="fill" />
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
          border-bottom: 3px solid #ef4444;
          font-weight: 500;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3);
        }
        .doc-editor .ql-editor span[style*="background-color"]:hover {
          filter: brightness(0.9);
          box-shadow: 0 3px 8px rgba(239, 68, 68, 0.4);
          transform: translateY(-1px);
        }
        .doc-editor .ql-toolbar {
          border-color: #e5e7eb !important;
          background: #f9fafb;
          border-radius: 8px 8px 0 0;
        }
        .doc-editor .ql-container {
          border-color: #e5e7eb !important;
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
