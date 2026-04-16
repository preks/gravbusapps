import { useState, useCallback, useRef, useEffect } from 'react'
import { toast, useTranslation } from '@newwork/nw-design-system'
import { EmptyCanvas } from './EmptyCanvas'
import { ArtifactToolbar } from './ArtifactToolbar'
import { DocumentRenderer } from '../renderers/DocumentRenderer'
import { AnalysisRenderer } from '../renderers/AnalysisRenderer'
import type { SaveResult } from '../../hooks/useArtifact'
import type { NexusArtifact, DocumentContent, AnalysisContent } from '../../types/nexus.types'
import { normalizeNexusMarkdown } from '../../utils/normalizeNexusMarkdown'
import { buildPlatformUrl, openInNewTab } from '@/common/utils/navigationUtils'
import translations from '../../_i18n'

const AUTOSAVE_DELAY_MS = 800

interface ArtifactCanvasProps {
  artifact: NexusArtifact | null
  artifactStreaming: boolean
  artifactStreamContent: string
  accessToken: string
  onOpenChat: () => void
  onSuggestionClick: (prompt: string) => void
  onSaveArtifact: (artifactId: string) => Promise<SaveResult>
  onUpdateArtifact: (
    artifactId: string,
    updates: { title?: string; content?: Record<string, unknown> }
  ) => Promise<NexusArtifact | null>
  onWaitForDocumentReady: (documentId: string) => Promise<boolean>
  onSetActiveArtifact: React.Dispatch<React.SetStateAction<NexusArtifact | null>>
  testId?: string
}

const LegacySlidesNotice = ({ t, testId }: { t: (key: string) => string; testId: string }) => (
  <div className="gba:flex gba:h-full gba:items-center gba:justify-center gba:px-8 gba:py-10">
    <div
      className="gba:max-w-lg gba:rounded-2xl gba:border gba:border-border gba:bg-card gba:p-6 gba:text-center gba:shadow-sm"
      data-testid={`${testId}-legacy-slides`}
    >
      <h2 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('artifact-legacy-slides-title')}</h2>
      <p className="gba:mt-2 gba:text-sm gba:leading-relaxed gba:text-muted-foreground">
        {t('artifact-legacy-slides-description')}
      </p>
    </div>
  </div>
)

export const ArtifactCanvas = ({
  artifact,
  artifactStreaming,
  artifactStreamContent,
  accessToken,
  onOpenChat,
  onSuggestionClick,
  onSaveArtifact,
  onUpdateArtifact,
  onWaitForDocumentReady,
  onSetActiveArtifact,
  testId = 'nexus-canvas'
}: ArtifactCanvasProps) => {
  const { t } = useTranslation(translations)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Tracks the in-flight autosave promise so handleSave can await it
  const autoSavePromiseRef = useRef<Promise<unknown> | null>(null)

  // Ref that always holds the very latest artifact, updated synchronously
  // in every edit handler so handleSave never reads stale state.
  const latestArtifactRef = useRef<NexusArtifact | null>(artifact)
  const openInDocumentsInFlightRef = useRef(false)

  // Keep the ref in sync with the prop (covers external updates like streaming)
  useEffect(() => {
    latestArtifactRef.current = artifact
  }, [artifact])

  // Clear save success indicator after 3 seconds
  useEffect(() => {
    if (!saveSuccess) return
    const timer = setTimeout(() => setSaveSuccess(false), 3000)
    return () => clearTimeout(timer)
  }, [saveSuccess])

  // Clean up autosave timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [])

  const savedDocumentId = (artifact?.metadata as Record<string, unknown>)?.savedDocumentId as string | undefined

  // Debounced autosave to backend
  const scheduleAutoSave = useCallback(
    (updatedArtifact: NexusArtifact) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = setTimeout(() => {
        setIsAutoSaving(true)
        const promise = onUpdateArtifact(updatedArtifact.id, {
          title: updatedArtifact.title,
          content: updatedArtifact.content as unknown as Record<string, unknown>
        }).finally(() => {
          autoSavePromiseRef.current = null
          setIsAutoSaving(false)
        })
        autoSavePromiseRef.current = promise
      }, AUTOSAVE_DELAY_MS)
    },
    [onUpdateArtifact]
  )

  // Handle content edits from document renderer
  const handleDocumentContentChange = useCallback(
    (updates: Partial<DocumentContent>) => {
      if (!artifact) return
      const newContent = { ...(artifact.content as DocumentContent), ...updates }
      const updated = { ...artifact, content: newContent }
      latestArtifactRef.current = updated
      onSetActiveArtifact(updated)
      scheduleAutoSave(updated)
    },
    [artifact, onSetActiveArtifact, scheduleAutoSave]
  )

  // Handle title edits from analysis renderer
  const handleAnalysisTitleChange = useCallback(
    (title: string) => {
      if (!artifact) return
      const updated = { ...artifact, title }
      latestArtifactRef.current = updated
      onSetActiveArtifact(updated)
      scheduleAutoSave(updated)
    },
    [artifact, onSetActiveArtifact, scheduleAutoSave]
  )

  // Handle content edits from analysis renderer
  const handleAnalysisContentChange = useCallback(
    (updates: Partial<AnalysisContent>) => {
      if (!artifact) return
      const newContent = { ...(artifact.content as AnalysisContent), ...updates }
      const updated = { ...artifact, content: newContent }
      latestArtifactRef.current = updated
      onSetActiveArtifact(updated)
      scheduleAutoSave(updated)
    },
    [artifact, onSetActiveArtifact, scheduleAutoSave]
  )

  // Save uses latestArtifactRef so it always has the freshest content,
  // even if blur → onChange → setState hasn't committed yet.
  const handleSave = useCallback(async () => {
    const currentArtifact = latestArtifactRef.current
    if (!currentArtifact || currentArtifact.type === 'slides') return

    setIsSaving(true)
    setSaveSuccess(false)
    try {
      // Cancel any pending debounced autosave timer
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      // Wait for any in-flight autosave PATCH to finish before we flush+save,
      // so we don't have two concurrent writes racing against each other.
      if (autoSavePromiseRef.current) {
        await autoSavePromiseRef.current
      }
      // Normalize markdown right before persisting/saving (fixes "flattened" tables).
      let artifactToFlush = currentArtifact
      if (currentArtifact.type === 'document') {
        const doc = currentArtifact.content as DocumentContent
        const normalized = normalizeNexusMarkdown(doc.markdown || '')
        if (normalized && normalized !== (doc.markdown || '')) {
          const normalizedContent = { ...doc, markdown: normalized }
          artifactToFlush = { ...currentArtifact, content: normalizedContent }
          latestArtifactRef.current = artifactToFlush
          onSetActiveArtifact(prev => (prev?.id === currentArtifact.id ? artifactToFlush : prev))
        }
      }

      // Now flush the very latest content to the backend
      await onUpdateArtifact(artifactToFlush.id, {
        title: currentArtifact.title,
        content: artifactToFlush.content as unknown as Record<string, unknown>
      })

      const result = await onSaveArtifact(artifactToFlush.id)
      if (result.success) {
        setSaveSuccess(true)
        toast.success(
          result.action === 'updated'
            ? t('canvas-toast-updated-success', { message: result.message })
            : t('canvas-toast-saved-success', { message: result.message })
        )
        // Update local artifact metadata with savedDocumentId
        if (result.savedId) {
          onSetActiveArtifact(prev => {
            const updated = prev
              ? { ...prev, metadata: { ...(prev.metadata || {}), savedDocumentId: result.savedId } }
              : prev
            latestArtifactRef.current = updated
            return updated
          })

          void onWaitForDocumentReady(result.savedId)
        }
      } else {
        toast.error(t('canvas-toast-save-failed', { message: result.message }))
      }
    } finally {
      setIsSaving(false)
    }
  }, [onSaveArtifact, onUpdateArtifact, onSetActiveArtifact, onWaitForDocumentReady, t])

  const handleCopy = useCallback(() => {
    if (!artifact) return

    const text =
      artifact.type === 'document'
        ? (artifact.content as DocumentContent).markdown || ''
        : (artifact.content as AnalysisContent).summary || ''

    navigator.clipboard.writeText(text)
    toast.success(t('canvas-toast-copied'))
  }, [artifact, t])

  const handleOpenInDocuments = useCallback(async () => {
    if (!savedDocumentId || artifact?.type === 'slides') return
    if (openInDocumentsInFlightRef.current) return

    openInDocumentsInFlightRef.current = true

    try {
      const isReady = await onWaitForDocumentReady(savedDocumentId)
      if (!isReady) {
        toast.error(t('canvas-toast-open-not-ready'))
        return
      }

      openInNewTab(
        buildPlatformUrl('/platform/every-office/documents', {
          docId: savedDocumentId,
          view: 'editor',
          from: 'nexus'
        })
      )
    } finally {
      openInDocumentsInFlightRef.current = false
    }
  }, [artifact?.type, onWaitForDocumentReady, savedDocumentId, t])

  if (!artifact) {
    return <EmptyCanvas onOpenChat={onOpenChat} onSuggestionClick={onSuggestionClick} />
  }

  const isComplete = artifact.status === 'complete'

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <ArtifactToolbar
        artifact={artifact}
        onSave={handleSave}
        onCopy={handleCopy}
        onOpenInDocuments={savedDocumentId && artifact.type !== 'slides' ? handleOpenInDocuments : undefined}
        isSaving={isSaving}
        saveSuccess={saveSuccess}
        isAutoSaving={isAutoSaving}
        hasSavedDocument={!!savedDocumentId}
      />

      <div className="gba:flex-1 gba:overflow-y-auto">
        {artifact.type === 'slides' && <LegacySlidesNotice t={t} testId={testId} />}

        {artifact.type === 'document' && (
          <DocumentRenderer
            content={artifact.content as DocumentContent}
            isStreaming={artifactStreaming}
            streamContent={artifactStreamContent}
            accessToken={accessToken}
            editable={isComplete}
            onContentChange={handleDocumentContentChange}
          />
        )}

        {artifact.type === 'analysis' && (
          <AnalysisRenderer
            content={artifact.content as AnalysisContent}
            title={artifact.title}
            isStreaming={artifactStreaming}
            accessToken={accessToken}
            editable={isComplete}
            onTitleChange={handleAnalysisTitleChange}
            onContentChange={handleAnalysisContentChange}
          />
        )}
      </div>
    </div>
  )
}
