// Spell check editor with ContentEditable and inline underlines.

import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@newwork/nw-design-system'
import type { SlideAnnotation } from '../types/slideSpellCheck'
import { getAnnotationColorClass } from '../types/slideSpellCheck'
import './spellCheck.css'

interface SpellCheckEditorProps {
  content: string
  annotations: SlideAnnotation[]
  onChange: (content: string) => void
  onAnnotationClick: (annotation: SlideAnnotation, rect: DOMRect) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  'data-testid'?: string
}

interface TextSegment {
  text: string
  annotation?: SlideAnnotation
  start: number
  end: number
}

function buildSegments(content: string, annotations: SlideAnnotation[]): TextSegment[] {
  if (annotations.length === 0) {
    return [{ text: content, start: 0, end: content.length }]
  }

  const sortedAnnotations = [...annotations].filter(a => !a.resolved).sort((a, b) => a.startOffset - b.startOffset)

  const segments: TextSegment[] = []
  let currentIndex = 0

  for (const annotation of sortedAnnotations) {
    if (annotation.startOffset < 0 || annotation.endOffset > content.length) {
      continue
    }

    if (annotation.startOffset > currentIndex) {
      segments.push({
        text: content.slice(currentIndex, annotation.startOffset),
        start: currentIndex,
        end: annotation.startOffset
      })
    }

    if (annotation.startOffset >= currentIndex) {
      segments.push({
        text: content.slice(annotation.startOffset, annotation.endOffset),
        annotation,
        start: annotation.startOffset,
        end: annotation.endOffset
      })
      currentIndex = annotation.endOffset
    }
  }

  if (currentIndex < content.length) {
    segments.push({
      text: content.slice(currentIndex),
      start: currentIndex,
      end: content.length
    })
  }

  return segments
}

export const SpellCheckEditor: React.FC<SpellCheckEditorProps> = ({
  content,
  annotations,
  onChange,
  onAnnotationClick,
  placeholder = 'Enter text...',
  className,
  disabled = false,
  'data-testid': testId = 'spell-check-editor'
}) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const isComposingRef = useRef(false)
  const lastContentRef = useRef(content)

  const segments = useMemo(() => buildSegments(content, annotations), [content, annotations])

  const saveSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || !editorRef.current) {
      return null
    }

    const range = selection.getRangeAt(0)
    if (!editorRef.current.contains(range.commonAncestorContainer)) {
      return null
    }

    const preRange = document.createRange()
    preRange.selectNodeContents(editorRef.current)
    preRange.setEnd(range.startContainer, range.startOffset)
    const start = preRange.toString().length

    return {
      start,
      end: start + range.toString().length
    }
  }, [])

  const restoreSelection = useCallback((savedSelection: { start: number; end: number } | null) => {
    if (!savedSelection || !editorRef.current) return

    const selection = window.getSelection()
    if (!selection) return

    const range = document.createRange()
    let currentOffset = 0
    let startNode: Node | null = null
    let startOffset = 0
    let endNode: Node | null = null
    let endOffset = 0

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textLength = node.textContent?.length || 0
        if (!startNode && currentOffset + textLength >= savedSelection.start) {
          startNode = node
          startOffset = savedSelection.start - currentOffset
        }
        if (!endNode && currentOffset + textLength >= savedSelection.end) {
          endNode = node
          endOffset = savedSelection.end - currentOffset
        }
        currentOffset += textLength
      } else {
        for (const child of Array.from(node.childNodes)) {
          walk(child)
          if (startNode && endNode) break
        }
      }
    }

    walk(editorRef.current)

    if (startNode && endNode) {
      try {
        range.setStart(startNode, startOffset)
        range.setEnd(endNode, endOffset)
        selection.removeAllRanges()
        selection.addRange(range)
      } catch {
        // Selection restoration failed
      }
    }
  }, [])

  const getTextContent = useCallback(() => {
    if (!editorRef.current) return ''
    return editorRef.current.innerText || ''
  }, [])

  const handleInput = useCallback(() => {
    if (isComposingRef.current) return

    const newContent = getTextContent()
    if (newContent !== lastContentRef.current) {
      lastContentRef.current = newContent
      onChange(newContent)
    }
  }, [getTextContent, onChange])

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true
  }, [])

  const handleCompositionEnd = useCallback(() => {
    isComposingRef.current = false
    handleInput()
  }, [handleInput])

  const handleAnnotationClick = useCallback(
    (e: React.MouseEvent, annotation: SlideAnnotation) => {
      e.preventDefault()
      e.stopPropagation()
      const target = e.currentTarget as HTMLElement
      const rect = target.getBoundingClientRect()
      onAnnotationClick(annotation, rect)
    },
    [onAnnotationClick]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        const unresolvedAnnotations = annotations.filter(a => !a.resolved)
        if (unresolvedAnnotations.length === 0) return

        const selection = window.getSelection()
        if (!selection || !editorRef.current) return

        const currentPos = saveSelection()?.start || 0

        const nextAnnotation = unresolvedAnnotations.find(a => a.startOffset > currentPos) || unresolvedAnnotations[0]

        if (nextAnnotation && editorRef.current) {
          const spans = editorRef.current.querySelectorAll(`[data-annotation-id="${nextAnnotation.id}"]`)
          if (spans.length > 0) {
            const span = spans[0] as HTMLElement
            const range = document.createRange()
            range.selectNodeContents(span)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        }
      }
    },
    [annotations, saveSelection]
  )

  useEffect(() => {
    if (!editorRef.current || isComposingRef.current) return

    if (content !== lastContentRef.current) {
      const savedSelection = saveSelection()
      lastContentRef.current = content

      requestAnimationFrame(() => {
        restoreSelection(savedSelection)
      })
    }
  }, [content, saveSelection, restoreSelection])

  const renderSegments = () => {
    if (!content && !disabled) {
      return <span className="gba:text-muted-foreground">{placeholder}</span>
    }

    return segments.map((segment, index) => {
      if (segment.annotation) {
        const colorClass = getAnnotationColorClass(segment.annotation)
        return (
          <span
            key={`${segment.annotation.id}-${index}`}
            data-annotation-id={segment.annotation.id}
            className={cn(colorClass, 'gba:cursor-pointer')}
            onClick={e => handleAnnotationClick(e, segment.annotation!)}
            title={segment.annotation.message}
          >
            {segment.text}
          </span>
        )
      }
      return <span key={`text-${index}`}>{segment.text}</span>
    })
  }

  return (
    <div
      ref={editorRef}
      contentEditable={!disabled}
      suppressContentEditableWarning
      className={cn(
        'gba:min-h-[200px] gba:p-3 gba:rounded-md gba:border gba:border-input gba:bg-background',
        'gba:text-base gba:leading-relaxed gba:whitespace-pre-wrap gba:break-words',
        'focus:gba:outline-none focus:gba:ring-2 focus:gba:ring-ring focus:gba:ring-offset-2',
        disabled && 'gba:opacity-50 gba:cursor-not-allowed',
        className
      )}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={handleKeyDown}
      data-testid={testId}
      role="textbox"
      aria-multiline="true"
      aria-placeholder={placeholder}
    >
      {renderSegments()}
    </div>
  )
}

export default SpellCheckEditor
