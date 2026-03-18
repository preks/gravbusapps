/**
 * SpeakerNotesPanel - Floating draggable panel for editing speaker notes.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button, Textarea, cn } from '@newwork/nw-design-system'
import { X, GripHorizontal, StickyNote } from 'lucide-react'

export interface SpeakerNotesPanelProps {
  notes: string
  slideIndex: number
  onNotesChange: (notes: string) => void
  onClose: () => void
  t: (key: string, params?: Record<string, string | number>) => string
  'data-testid'?: string
}

export const SpeakerNotesPanel: React.FC<SpeakerNotesPanelProps> = ({
  notes,
  slideIndex,
  onNotesChange,
  onClose,
  t,
  'data-testid': testId = 'speaker-notes-panel'
}) => {
  const [localNotes, setLocalNotes] = useState(notes)
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: window.innerHeight - 280 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const panelRef = useRef<HTMLDivElement>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync local notes when slide changes or external notes update
  useEffect(() => {
    setLocalNotes(notes)
  }, [notes, slideIndex])

  // Debounced save to parent
  const handleNotesChange = useCallback(
    (value: string) => {
      setLocalNotes(value)

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        onNotesChange(value)
      }, 500)
    },
    [onNotesChange]
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Drag handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest('button')) return

      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    },
    [position]
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return

      const newX = Math.max(0, Math.min(window.innerWidth - 420, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 250, e.clientY - dragOffset.y))

      setPosition({ x: newX, y: newY })
    },
    [isDragging, dragOffset]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div
      ref={panelRef}
      className={cn(
        'gba:fixed gba:z-[90] gba:w-[400px]',
        'gba:bg-card gba:rounded-lg gba:shadow-xl',
        'gba:border gba:border-border',
        'gba:flex gba:flex-col',
        'gba:animate-in gba:fade-in gba:slide-in-from-bottom-4 gba:duration-300'
      )}
      style={{
        left: position.x,
        top: position.y
      }}
      data-testid={testId}
    >
      {/* Draggable Header */}
      <div
        className={cn(
          'gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2',
          'gba:border-b gba:border-border gba:bg-muted/30 gba:rounded-t-lg',
          isDragging ? 'gba:cursor-grabbing' : 'gba:cursor-grab'
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="gba:flex gba:items-center gba:gap-2">
          <GripHorizontal className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <StickyNote className="gba:w-4 gba:h-4 gba:text-primary" />
          <span className="gba:text-sm gba:font-medium">{t('editor-speaker-notes')}</span>
          <span className="gba:text-xs gba:text-muted-foreground">
            (
            {t('editor-slide-of', { current: slideIndex + 1, total: '' })
              .replace(' of ', ' #')
              .trim()}
            )
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="gba:h-7 gba:w-7 gba:p-0"
          data-testid={`${testId}-close`}
        >
          <X className="gba:w-4 gba:h-4" />
        </Button>
      </div>

      {/* Notes Editor */}
      <div className="gba:p-3 gba:flex gba:flex-col gba:gap-2">
        <Textarea
          value={localNotes}
          onChange={e => handleNotesChange(e.target.value)}
          placeholder={t('editor-speaker-notes-placeholder')}
          className="gba:min-h-[150px] gba:resize-y gba:text-sm"
          data-testid={`${testId}-textarea`}
        />
        <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-muted-foreground">
          <span>{t('editor-speaker-notes-chars', { count: localNotes.length })}</span>
          {localNotes !== notes && <span className="gba:text-primary">Saving...</span>}
        </div>
      </div>
    </div>
  )
}

export default SpeakerNotesPanel
