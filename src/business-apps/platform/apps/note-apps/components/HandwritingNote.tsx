/**
 * HandwritingNote Component
 * Main component for displaying and editing handwriting notes
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowLeft, Check, AlertCircle, X, Save } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

import { PaperBackground, HandwritingCanvas, HandwritingToolbar, TransformMenu } from './handwriting'
import type { PaperStyle, StrokeData } from './handwriting'
import type { TransformType } from './handwriting/TransformMenu'
import { TransformService } from '../services/TransformService'

export interface HandwritingNoteProps extends Partial<BusinessAppContextProps> {
  noteId: string
  title: string
  initialStrokes?: StrokeData[]
  initialPaperStyle?: PaperStyle
  onSave: (title: string, strokes: StrokeData[], paperStyle: PaperStyle) => Promise<void>
  onBack: () => void
  onConvertToText?: (text: string) => Promise<void>
  onCreateTextNote?: (text: string, title: string) => Promise<void>
  'data-testid'?: string
}

// Canvas dimensions
const CANVAS_WIDTH = 800
const CANVAS_HEIGHT = 3000 // Tall for long notes

export const HandwritingNote: React.FC<HandwritingNoteProps> = ({
  noteId,
  title: initialTitle,
  initialStrokes = [],
  initialPaperStyle = 'lined',
  onSave,
  onBack,
  onConvertToText,
  onCreateTextNote,
  accessToken = '',
  'data-testid': testId = 'handwriting-note'
}) => {
  // State
  const [noteTitle, setNoteTitle] = useState(initialTitle || 'Untitled')
  const [strokes, setStrokes] = useState<StrokeData[]>(initialStrokes)
  const [penColor, setPenColor] = useState('#000000')
  const [penWidth, setPenWidth] = useState(4)
  const [paperStyle, setPaperStyle] = useState<PaperStyle>(initialPaperStyle)
  const [isSaving, setIsSaving] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)
  const [transformFeedback, setTransformFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const strokesRef = useRef<StrokeData[]>(strokes)
  const paperStyleRef = useRef<PaperStyle>(paperStyle)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Keep refs in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    paperStyleRef.current = paperStyle
  }, [paperStyle])

  // Auto-save when strokes change
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (strokes.length > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleSave()
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [strokes])

  // Show feedback temporarily
  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    console.log('[HandwritingNote] showFeedback:', { type, message })
    setTransformFeedback({ type, message })
    const duration = type === 'error' ? 8000 : 3000
    setTimeout(() => setTransformFeedback(null), duration)
  }, [])

  const dismissFeedback = useCallback(() => {
    setTransformFeedback(null)
  }, [])

  // Handle save
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      console.log(`[HandwritingNote] Saving ${strokesRef.current.length} strokes`)
      await onSave(noteTitle, strokesRef.current, paperStyleRef.current)
    } catch (error) {
      console.error('[HandwritingNote] Save failed:', error)
      showFeedback('error', 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }, [noteTitle, onSave, showFeedback])

  // Handle title change
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNoteTitle(e.target.value)
  }, [])

  // Handle stroke complete
  const handleStrokeComplete = useCallback(
    (stroke: StrokeData) => {
      console.log(
        '[HandwritingNote] Stroke complete, points:',
        stroke.points.length,
        'total strokes:',
        strokes.length + 1
      )
    },
    [strokes.length]
  )

  // Handle strokes change
  const handleStrokesChange = useCallback((newStrokes: StrokeData[]) => {
    setStrokes(newStrokes)
  }, [])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (strokes.length > 0) {
      setStrokes(strokes.slice(0, -1))
    }
  }, [strokes])

  // Handle clear
  const handleClear = useCallback(() => {
    if (strokes.length > 0 && confirm('Clear all handwriting?')) {
      setStrokes([])
    }
  }, [strokes])

  // Handle transform
  const handleTransform = useCallback(
    async (type: TransformType) => {
      if (!accessToken) {
        showFeedback('error', 'Not authenticated')
        return
      }

      if (strokesRef.current.length === 0) {
        showFeedback('error', 'No handwriting to transform')
        return
      }

      setIsTransforming(true)

      try {
        const transformService = new TransformService(accessToken)
        const result = await transformService.transform(noteId, type, strokesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT)

        if (!result.success) {
          showFeedback('error', result.error || 'Transform failed')
          return
        }

        console.log('[HandwritingNote] Transform result:', { type, content: result.transformedContent.slice(0, 100) })

        switch (type) {
          case 'copy-text':
            await navigator.clipboard.writeText(result.transformedContent)
            showFeedback('success', '✓ Copied to clipboard!')
            alert(`✓ Copied to clipboard:\n\n${result.transformedContent}`)
            break

          case 'to-text':
            if (onConvertToText) {
              await onConvertToText(result.transformedContent)
              showFeedback('success', '✓ Converted to text!')
              alert(`✓ Note converted to text:\n\n${result.transformedContent}`)
            } else {
              showFeedback('success', '✓ Text extracted!')
              alert(`✓ Extracted text:\n\n${result.transformedContent}`)
            }
            break

          case 'create-text-note':
            if (onCreateTextNote) {
              await onCreateTextNote(result.transformedContent, `${noteTitle} (Text)`)
              showFeedback('success', '✓ Text note created!')
              alert(`✓ New text note created: "${noteTitle} (Text)"`)
            } else {
              await navigator.clipboard.writeText(result.transformedContent)
              showFeedback('success', '✓ Copied (note creation not available)')
              alert(`✓ Text copied to clipboard:\n\n${result.transformedContent}`)
            }
            break

          case 'summarize':
            showFeedback('success', '✓ Summary generated!')
            alert(`📝 Summary:\n\n${result.transformedContent}`)
            break

          case 'action-items':
            showFeedback('success', '✓ Action items extracted!')
            alert(`✅ Action Items:\n\n${result.transformedContent}`)
            break

          case 'translate':
            showFeedback('success', '✓ Translation complete!')
            alert(`🌍 Translation:\n\n${result.transformedContent}`)
            break

          default:
            alert(`Result:\n\n${result.transformedContent}`)
        }
      } catch (error) {
        console.error('[HandwritingNote] Transform failed:', error)
        showFeedback('error', error instanceof Error ? error.message : 'Transform failed')
      } finally {
        setIsTransforming(false)
      }
    },
    [accessToken, noteId, noteTitle, onConvertToText, onCreateTextNote, showFeedback]
  )

  // Prevent selection globally while in this component
  useEffect(() => {
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      e.preventDefault()
    }

    document.addEventListener('selectstart', handleSelectStart, { capture: true })
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('selectstart', handleSelectStart, { capture: true })
      document.body.style.userSelect = ''
    }
  }, [])

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:bg-background gba:select-none"
      style={{
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        userSelect: 'none'
      }}
      onSelectStart={e => e.preventDefault()}
      data-testid={testId}
    >
      {/* Feedback Banner */}
      {transformFeedback && (
        <div
          className={`gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:text-sm ${
            transformFeedback.type === 'error'
              ? 'gba:bg-destructive gba:text-destructive-foreground'
              : 'gba:bg-success gba:text-success-foreground'
          }`}
          role="alert"
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            {transformFeedback.type === 'error' ? (
              <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
            ) : (
              <Check className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
            )}
            <span>{transformFeedback.message}</span>
          </div>
          <button onClick={dismissFeedback} className="gba:p-1 gba:rounded gba:hover:opacity-80" aria-label="Dismiss">
            <X className="gba:w-4 gba:h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border-b gba:bg-card">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-4 gba:h-4" />
        </Button>

        <input
          type="text"
          value={noteTitle}
          onChange={handleTitleChange}
          placeholder="Untitled"
          className="gba:flex-1 gba:text-xl gba:font-semibold gba:bg-transparent gba:border-0 gba:outline-none"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          data-testid={`${testId}-title`}
        />

        <div className="gba:flex gba:items-center gba:gap-2">
          <TransformMenu onTransform={handleTransform} isProcessing={isTransforming} disabled={strokes.length === 0} />

          <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
            <Save className="gba:w-4 gba:h-4 gba:mr-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <HandwritingToolbar
        penColor={penColor}
        penWidth={penWidth}
        paperStyle={paperStyle}
        onPenColorChange={setPenColor}
        onPenWidthChange={setPenWidth}
        onPaperStyleChange={setPaperStyle}
        onUndo={handleUndo}
        onClear={handleClear}
        canUndo={strokes.length > 0}
      />

      {/* Canvas Area */}
      <div
        ref={scrollContainerRef}
        className="gba:flex-1 gba:overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="gba:relative gba:mx-auto" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
          <PaperBackground style={paperStyle} />
          <HandwritingCanvas
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            penColor={penColor}
            penWidth={penWidth}
            initialStrokes={initialStrokes}
            onStrokeComplete={handleStrokeComplete}
            onStrokesChange={handleStrokesChange}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </div>
    </div>
  )
}

export default HandwritingNote
