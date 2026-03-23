/**
 * HandwritingNote Component
 * Main component for displaying and editing handwriting notes
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  useTranslation
} from '@newwork/nw-design-system'
import { ArrowLeft, Check, AlertCircle, X, Save, ListTodo, RefreshCw, PanelLeft } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

import {
  PaperBackground,
  HandwritingCanvas,
  HandwritingToolbar,
  TransformMenu,
  SummaryPanel,
  TranslationPanel,
  ActionItemsModal,
  ActionItemsList
} from './handwriting'
import type { PaperStyle, StrokeData } from './handwriting'
import type { TransformType } from './handwriting/TransformMenu'
import { TransformService } from '../services/TransformService'
import type { NoteActionItemFlow } from '../types'
import type { NoteTranslation, TranslationLanguage } from '../types/translation'
import { useActionItemFlowStatusSync } from '../hooks/useActionItemFlowStatusSync'
import { useActionItemAssigneeEnrichment } from '../hooks/useActionItemAssigneeEnrichment'
import { FlowEngineApiService } from '../services/FlowEngineApiService'
import translations from '../_i18n'

export interface HandwritingNoteUserInfo {
  id?: string
  employeeDetails?: { employeeId?: string }
}

export interface HandwritingNoteProps extends Partial<BusinessAppContextProps> {
  noteId: string
  title: string
  initialStrokes?: StrokeData[]
  initialPaperStyle?: PaperStyle
  initialSummary?: string | null
  initialTranslations?: NoteTranslation[]
  initialActionItemFlows?: NoteActionItemFlow[]
  onPersist: (params: {
    title: string
    strokes: StrokeData[]
    paperStyle: PaperStyle
    summary: string | null
    translations: NoteTranslation[]
    actionItemFlows: NoteActionItemFlow[]
  }) => Promise<void>
  onBack: () => void
  onConvertToText?: (text: string) => Promise<void>
  onCreateTextNote?: (text: string, title: string) => Promise<void>
  isSidebarCollapsed?: boolean
  onToggleSidebar?: () => void
  userInfo?: HandwritingNoteUserInfo
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
  initialSummary = null,
  initialTranslations = [],
  initialActionItemFlows = [],
  onPersist,
  onBack,
  onConvertToText,
  onCreateTextNote,
  isSidebarCollapsed,
  onToggleSidebar,
  accessToken = '',
  userInfo,
  'data-testid': testId = 'handwriting-note'
}) => {
  const { t } = useTranslation(translations)
  // State
  const [noteTitle, setNoteTitle] = useState(initialTitle || t('handwriting-untitled'))
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

  // Summary panel state (persisted in note)
  const [currentSummary, setCurrentSummary] = useState<string | null>(initialSummary)
  const summaryRef = useRef<string | null>(initialSummary)

  // Translation history (persisted in note)
  const [noteTranslations, setNoteTranslations] = useState<NoteTranslation[]>(initialTranslations)
  const noteTranslationsRef = useRef<NoteTranslation[]>(initialTranslations)

  // Action items modal state
  const [actionItemsModalOpen, setActionItemsModalOpen] = useState(false)
  const [currentActionItems, setCurrentActionItems] = useState<string[]>([])
  const [actionItemFlows, setActionItemFlows] = useState<NoteActionItemFlow[]>(initialActionItemFlows)
  const actionItemFlowsRef = useRef<NoteActionItemFlow[]>(initialActionItemFlows)
  const [actionItemsPanelOpen, setActionItemsPanelOpen] = useState(false)

  // Get current user ID
  const currentUserId = userInfo?.id || userInfo?.employeeDetails?.employeeId || ''

  // Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const strokesRef = useRef<StrokeData[]>(strokes)
  const paperStyleRef = useRef<PaperStyle>(paperStyle)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastPersistSignatureRef = useRef<string>('')

  // Keep refs in sync
  useEffect(() => {
    strokesRef.current = strokes
  }, [strokes])

  useEffect(() => {
    paperStyleRef.current = paperStyle
  }, [paperStyle])

  useEffect(() => {
    summaryRef.current = currentSummary
  }, [currentSummary])

  useEffect(() => {
    noteTranslationsRef.current = noteTranslations
  }, [noteTranslations])

  useEffect(() => {
    actionItemFlowsRef.current = actionItemFlows
  }, [actionItemFlows])

  // Show feedback temporarily
  const showFeedback = useCallback((type: 'success' | 'error', message: string) => {
    setTransformFeedback({ type, message })
    const duration = type === 'error' ? 8000 : 3000
    setTimeout(() => setTransformFeedback(null), duration)
  }, [])

  const dismissFeedback = useCallback(() => {
    setTransformFeedback(null)
  }, [])

  const buildPersistSignature = useCallback((): string => {
    const summarySig = summaryRef.current ? summaryRef.current.slice(0, 80) : ''
    const flowsSig = actionItemFlowsRef.current.map(f => `${f.workflowId}:${f.status}:${f.completedAt || ''}`).join('|')
    const translationsSig = noteTranslationsRef.current.map(t => `${t.id}:${t.targetLanguage}`).join('|')
    return [noteTitle, paperStyleRef.current, strokesRef.current.length, summarySig, flowsSig, translationsSig].join(
      '::'
    )
  }, [noteTitle])

  // Initialize persisted signature so we don't immediately re-save on open
  useEffect(() => {
    lastPersistSignatureRef.current = buildPersistSignature()
  }, [buildPersistSignature])

  const persistNow = useCallback(
    async (opts?: { showBusy?: boolean }) => {
      const signature = buildPersistSignature()
      if (signature === lastPersistSignatureRef.current) return

      const showBusy = opts?.showBusy === true
      if (showBusy) setIsSaving(true)
      try {
        await onPersist({
          title: noteTitle,
          strokes: strokesRef.current,
          paperStyle: paperStyleRef.current,
          summary: summaryRef.current,
          translations: noteTranslationsRef.current,
          actionItemFlows: actionItemFlowsRef.current
        })
        lastPersistSignatureRef.current = signature
      } catch (error) {
        console.error('[HandwritingNote] Persist failed:', error)
        showFeedback('error', t('handwriting-save-failed'))
      } finally {
        if (showBusy) setIsSaving(false)
      }
    },
    [buildPersistSignature, noteTitle, onPersist, showFeedback]
  )

  const queuePersist = useCallback(
    (delayMs: number) => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
      persistTimeoutRef.current = setTimeout(() => {
        void persistNow()
      }, delayMs)
    },
    [persistNow]
  )

  // Auto-save when strokes change
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (strokes.length > 0) {
      autoSaveTimeoutRef.current = setTimeout(() => {
        queuePersist(0)
      }, 2000) // Auto-save after 2 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [queuePersist, strokes.length])

  // Persist summary / action-item metadata updates (debounced)
  useEffect(() => {
    queuePersist(800)
  }, [queuePersist, currentSummary])

  useEffect(() => {
    queuePersist(800)
  }, [queuePersist, noteTranslations])

  useEffect(() => {
    // Status polling updates will also flow through here
    queuePersist(1200)
  }, [queuePersist, actionItemFlows])

  // Clean up pending persist on unmount
  useEffect(() => {
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current)
      }
    }
  }, [])

  const { isSyncing: isFlowStatusSyncing, syncNow: syncFlowStatuses } = useActionItemFlowStatusSync({
    accessToken,
    flows: actionItemFlows,
    onFlowsUpdated: next => setActionItemFlows(next)
  })

  // Fill missing avatar/name for older flows
  useActionItemAssigneeEnrichment({
    accessToken,
    flows: actionItemFlows,
    setFlows: next => setActionItemFlows(next)
  })

  // Sync once when opening the note (no background polling)
  useEffect(() => {
    void syncFlowStatuses()
  }, [syncFlowStatuses])

  // Recovery: older notes may have sent blinks but never persisted `actionItemFlows`.
  // If empty, fetch existing quick-task flows from flow-engine by tags and persist.
  const hasRecoveredRef = useRef(false)
  useEffect(() => {
    if (!accessToken) return
    if (hasRecoveredRef.current) return
    if (actionItemFlowsRef.current.length > 0) return

    hasRecoveredRef.current = true
    const run = async () => {
      try {
        const service = new FlowEngineApiService(accessToken)
        const recovered = await service.listBlinksForNote({ noteId, entityType: 'handwriting-note-action' })
        if (recovered.length > 0) {
          setActionItemFlows(recovered)
          showFeedback('success', t('handwriting-loaded-existing', { count: recovered.length }))
        }
      } catch {
        // ignore (best-effort)
      }
    }

    void run()
  }, [accessToken, noteId, showFeedback])

  // Handle save (manual)
  const handleSave = useCallback(async () => {
    await persistNow({ showBusy: true })
  }, [persistNow])

  const handleDismissSummary = useCallback(() => {
    summaryRef.current = null
    setCurrentSummary(null)
    // Persist immediately so deletion isn't lost on quick navigation
    queuePersist(0)
  }, [queuePersist])

  const handleDeleteTranslation = useCallback(
    (id: string) => {
      setNoteTranslations(prev => {
        const next = prev.filter(t => t.id !== id)
        noteTranslationsRef.current = next
        return next
      })
      queuePersist(0)
      showFeedback('success', t('handwriting-translation-deleted'))
    },
    [queuePersist, showFeedback]
  )

  const handleBackClick = useCallback(() => {
    // Best-effort flush before leaving (don't block navigation)
    void persistNow()
    onBack()
  }, [onBack, persistNow])

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
    if (strokes.length > 0 && confirm(t('handwriting-clear-confirm'))) {
      setStrokes([])
    }
  }, [strokes, t])

  // Handle transform
  const handleTransform = useCallback(
    async (type: TransformType, options?: { targetLanguage?: TranslationLanguage }) => {
      if (!accessToken) {
        showFeedback('error', t('handwriting-not-authenticated'))
        return
      }

      if (strokesRef.current.length === 0) {
        showFeedback('error', t('handwriting-no-content'))
        return
      }

      setIsTransforming(true)

      try {
        const transformService = new TransformService(accessToken)
        const result = await transformService.transform(noteId, type, strokesRef.current, CANVAS_WIDTH, CANVAS_HEIGHT, {
          ...(options as object),
          translate: t
        } as Parameters<typeof transformService.transform>[5])

        if (!result.success) {
          showFeedback('error', result.error || t('handwriting-transform-failed'))
          return
        }

        console.log('[HandwritingNote] Transform result:', { type, content: result.transformedContent.slice(0, 100) })

        switch (type) {
          case 'copy-text':
            await navigator.clipboard.writeText(result.transformedContent)
            showFeedback('success', t('handwriting-copied'))
            break

          case 'to-text':
            if (onConvertToText) {
              await onConvertToText(result.transformedContent)
              showFeedback('success', t('handwriting-converted'))
            } else {
              showFeedback('success', t('handwriting-text-extracted'))
              await navigator.clipboard.writeText(result.transformedContent)
            }
            break

          case 'create-text-note':
            if (onCreateTextNote) {
              await onCreateTextNote(result.transformedContent, `${noteTitle} (Text)`)
              showFeedback('success', t('handwriting-note-created'))
            } else {
              await navigator.clipboard.writeText(result.transformedContent)
              showFeedback('success', t('handwriting-copied-not-available'))
            }
            break

          case 'summarize':
            // Show summary in the panel at the bottom of the note
            summaryRef.current = result.transformedContent
            setCurrentSummary(result.transformedContent)
            // Persist immediately so navigating away doesn't lose it
            queuePersist(0)
            showFeedback('success', t('handwriting-summary-generated'))
            break

          case 'action-items':
            // Show action items in a modal for assignment
            if (result.actionItems && result.actionItems.length > 0) {
              setCurrentActionItems(result.actionItems)
              setActionItemsModalOpen(true)
              showFeedback('success', t('handwriting-action-items-found', { count: result.actionItems.length }))
            } else {
              showFeedback('success', t('handwriting-no-action-items'))
            }
            break

          case 'translate':
            setNoteTranslations(prev => {
              const targetLang = (options?.targetLanguage || 'en') as TranslationLanguage
              const targetLanguageName = t(`translation-language-${targetLang}`)
              const entry: NoteTranslation = {
                id: `tr_${Date.now()}`,
                targetLanguage: targetLang,
                targetLanguageName,
                text: result.transformedContent,
                createdAt: new Date().toISOString()
              }
              const next = [entry, ...prev]
              noteTranslationsRef.current = next
              return next
            })
            queuePersist(0)
            showFeedback('success', t('handwriting-translation-created'))
            break

          default:
            setCurrentSummary(result.transformedContent)
        }
      } catch (error) {
        console.error('[HandwritingNote] Transform failed:', error)
        showFeedback('error', error instanceof Error ? error.message : t('handwriting-transform-failed'))
      } finally {
        setIsTransforming(false)
      }
    },
    [accessToken, noteId, noteTitle, onConvertToText, onCreateTextNote, queuePersist, showFeedback, t]
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

  const handleFlowsCreated = useCallback((created: NoteActionItemFlow[]) => {
    setActionItemFlows(prev => {
      const existing = new Set(prev.map(f => f.workflowId))
      const next = [...prev, ...created.filter(f => !existing.has(f.workflowId))]
      return next
    })
    // On iPad/mobile, open the panel so user immediately sees status
    setActionItemsPanelOpen(true)
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
          <button
            onClick={dismissFeedback}
            className="gba:p-1 gba:rounded gba:hover:opacity-80"
            aria-label={t('handwriting-dismiss-aria')}
          >
            <X className="gba:w-4 gba:h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border-b gba:bg-card">
        {isSidebarCollapsed && onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8"
            onClick={onToggleSidebar}
            data-testid={`${testId}-expand-sidebar`}
          >
            <PanelLeft className="gba:w-4 gba:h-4" />
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={handleBackClick} data-testid={`${testId}-back`}>
          <ArrowLeft className="gba:w-4 gba:h-4" />
        </Button>

        <input
          type="text"
          value={noteTitle}
          onChange={handleTitleChange}
          placeholder={t('handwriting-untitled')}
          className="gba:flex-1 gba:text-xl gba:font-semibold gba:bg-transparent gba:border-0 gba:outline-none"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          data-testid={`${testId}-title`}
        />

        <div className="gba:flex gba:items-center gba:gap-2">
          {/* Action items panel button for iPad/mobile (only after tasks exist) */}
          {actionItemFlows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActionItemsPanelOpen(true)}
              className="gba:gap-2 gba:lg:hidden"
              data-testid={`${testId}-action-items-open`}
            >
              <ListTodo className="gba:w-4 gba:h-4" />
              {t('handwriting-tasks', { count: actionItemFlows.length })}
            </Button>
          )}

          <TransformMenu onTransform={handleTransform} isProcessing={isTransforming} disabled={strokes.length === 0} />

          <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} data-testid={`${testId}-save`}>
            <Save className="gba:w-4 gba:h-4 gba:mr-1" />
            {isSaving ? t('handwriting-saving') : t('handwriting-save-title')}
          </Button>
        </div>
      </div>

      {/* AI results (below title): summary + translations */}
      {(currentSummary || noteTranslations.length > 0) && (
        <div className="gba:px-4 gba:pb-4 gba:border-b gba:bg-card gba:space-y-3">
          {currentSummary && (
            <SummaryPanel
              summary={currentSummary}
              onDismiss={handleDismissSummary}
              data-testid={`${testId}-summary-panel`}
            />
          )}
          {noteTranslations.length > 0 && (
            <div className="gba:space-y-3" data-testid={`${testId}-translations`}>
              {noteTranslations.map(t => (
                <TranslationPanel
                  key={t.id}
                  translation={t}
                  onDelete={handleDeleteTranslation}
                  data-testid={`${testId}-translation-${t.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

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

      <div className="gba:flex-1 gba:flex gba:overflow-hidden">
        {/* Canvas Area */}
        <div
          ref={scrollContainerRef}
          className="gba:flex-1 gba:overflow-auto gba:relative"
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

        {/* Action Items Sidebar (desktop) - only after tasks exist */}
        {actionItemFlows.length > 0 && (
          <div className="gba:hidden gba:lg:block gba:w-80 gba:border-l gba:border-border gba:bg-card gba:overflow-y-auto gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
              <div className="gba:text-sm gba:font-semibold gba:text-foreground">{t('handwriting-action-items')}</div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:text-xs gba:text-muted-foreground">{actionItemFlows.length}</div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void syncFlowStatuses()}
                  disabled={isFlowStatusSyncing}
                  className="gba:h-7 gba:w-7 gba:p-0"
                  data-testid={`${testId}-action-items-refresh`}
                >
                  <RefreshCw className={`gba:w-4 gba:h-4 ${isFlowStatusSyncing ? 'gba:animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <ActionItemsList flows={actionItemFlows} data-testid={`${testId}-action-items-list`} />
          </div>
        )}
      </div>

      {/* Action Items Panel (iPad/mobile) */}
      {actionItemFlows.length > 0 && (
        <Dialog open={actionItemsPanelOpen} onOpenChange={setActionItemsPanelOpen}>
          <DialogContent className="gba:sm:max-w-[650px] gba:max-h-[80vh] gba:overflow-y-auto">
            <DialogHeader>
              <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                <DialogTitle>{t('handwriting-action-items')}</DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void syncFlowStatuses()}
                  disabled={isFlowStatusSyncing}
                  className="gba:h-8 gba:w-8 gba:p-0"
                  data-testid={`${testId}-action-items-refresh-dialog`}
                >
                  <RefreshCw className={`gba:w-4 gba:h-4 ${isFlowStatusSyncing ? 'gba:animate-spin' : ''}`} />
                </Button>
              </div>
              <DialogDescription>{t('handwriting-action-items-desc')}</DialogDescription>
            </DialogHeader>
            <ActionItemsList flows={actionItemFlows} data-testid={`${testId}-action-items-list-dialog`} />
          </DialogContent>
        </Dialog>
      )}

      {/* Action Items Modal */}
      <ActionItemsModal
        open={actionItemsModalOpen}
        onOpenChange={setActionItemsModalOpen}
        actionItems={currentActionItems}
        noteTitle={noteTitle}
        noteId={noteId}
        accessToken={accessToken}
        currentUserId={currentUserId}
        onFlowsCreated={handleFlowsCreated}
        data-testid={`${testId}-action-items-modal`}
      />
    </div>
  )
}

export default HandwritingNote
