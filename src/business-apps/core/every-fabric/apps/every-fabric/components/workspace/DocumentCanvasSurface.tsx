import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DOMPurify from 'dompurify'
import { Badge } from '@newwork/nw-design-system'
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  CopyIcon,
  FileTextIcon,
  FloppyDiskIcon,
  PencilSimpleIcon,
  SpinnerGapIcon
} from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { InlineEditableMarkdownBlock } from '@/common/components/editing/InlineEditableMarkdownBlock'
import { InlineEditableTitle } from '@/common/components/editing/InlineEditableTitle'
import { EditableHtmlBlock } from '@/common/components/editing/EditableHtmlBlock'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import { useFabric } from '../../context/FabricContext'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { confirmDraft, extractEntityId } from '../../utils/confirmDraftApi'

const DOCUMENT_EDITOR_ROUTE = '/platform/every-office/documents'

function resolveContent(preview: ArtifactPreview): { text: string; isMarkdown: boolean } {
  if (!preview.content) return { text: '', isMarkdown: false }
  const md = preview.content.markdown
  if (typeof md === 'string' && md.trim()) return { text: md, isMarkdown: true }
  const html = preview.content.html
  if (typeof html === 'string') return { text: html, isMarkdown: false }
  return { text: '', isMarkdown: false }
}

interface SaveResult {
  ok: boolean
  error?: string
  entityId?: string
}

/**
 * Persist the user-edited canvas draft via prompt-manager's
 * ``/confirm-draft`` endpoint.
 *
 * We intentionally do NOT call the document-service ``PATCH /documents/:id``
 * directly: the confirm-draft endpoint is the single source of truth for the
 * AI-draft lifecycle, it re-validates session ownership server-side, and —
 * crucially — it correctly handles the "update instead of create" branch so
 * edits made against an already-persisted draft don't produce duplicates.
 */
async function saveCanvasDraft(params: {
  sessionId: string
  accessToken: string
  preview: ArtifactPreview
  title: string
  htmlContent: string
  entityId: string
}): Promise<SaveResult> {
  try {
    const result = await confirmDraft({
      sessionId: params.sessionId,
      accessToken: params.accessToken,
      artifactId: params.preview.artifactId,
      artifactType: 'document',
      title: params.title,
      entityId: params.entityId,
      contentHtml: params.htmlContent
    })
    return { ok: true, entityId: result.entity_id }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

interface CanvasToolbarProps {
  title: string
  isStreaming: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
  saveError?: string
  canEdit: boolean
  isPersisted: boolean
  canOpenInDocuments: boolean
  onCopy: () => void
  onSave: () => void
  onOpenInDocuments: () => void
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  title,
  isStreaming,
  saveState,
  saveError,
  canEdit,
  isPersisted,
  canOpenInDocuments,
  onCopy,
  onSave,
  onOpenInDocuments
}) => (
  <div
    className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border-b gba:border-border gba:bg-card/80"
    data-testid="fabric-canvas-toolbar"
  >
    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
      <div className="gba:h-6 gba:w-6 gba:rounded-md gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:shrink-0">
        <FileTextIcon className="gba:h-3 gba:w-3 gba:text-primary" />
      </div>
      <span className="gba:text-xs gba:font-semibold gba:truncate gba:text-foreground">{title}</span>
      <Badge variant={isStreaming ? 'outline' : 'secondary'} className="gba:text-[9px] gba:shrink-0">
        {isStreaming ? (
          <span className="gba:flex gba:items-center gba:gap-1">
            <SpinnerGapIcon className="gba:h-2.5 gba:w-2.5 gba:animate-spin" />
            Generating
          </span>
        ) : isPersisted ? (
          'Saved to Documents'
        ) : (
          'Document'
        )}
      </Badge>
    </div>

    {(canEdit || isPersisted) && (
      <div className="gba:flex gba:items-center gba:gap-1">
        <button
          onClick={onCopy}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:hover:bg-muted/40 gba:transition-colors"
          data-testid="fabric-canvas-copy"
        >
          <CopyIcon className="gba:h-3 gba:w-3" />
          Copy
        </button>

        {/* After first successful save the canvas becomes a read-only preview.
            Further edits must go through the full Documents app, which owns the
            collaborative editor, versioning and granular autosave. */}
        {isPersisted ? (
          <button
            onClick={onOpenInDocuments}
            disabled={!canOpenInDocuments}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-[10px] gba:font-medium gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:disabled:opacity-50 gba:transition-colors"
            data-testid="fabric-canvas-open-in-documents"
            title="Edits after the first save must be made in the Documents app"
          >
            <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
            Open in Documents
          </button>
        ) : (
          <button
            onClick={onSave}
            disabled={saveState === 'saving' || !canEdit}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-[10px] gba:font-medium gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:disabled:opacity-50 gba:transition-colors"
            data-testid="fabric-canvas-save"
          >
            {saveState === 'saving' ? (
              <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
            ) : saveState === 'saved' ? (
              <CheckCircleIcon className="gba:h-3 gba:w-3" />
            ) : (
              <FloppyDiskIcon className="gba:h-3 gba:w-3" />
            )}
            {saveState === 'saved' ? 'Saved' : 'Save'}
          </button>
        )}

        {saveState === 'error' && (
          <span
            className="gba:text-[9px] gba:text-destructive gba:font-medium gba:max-w-[10rem] gba:truncate"
            title={saveError ?? 'Save failed'}
          >
            {saveError ?? 'Failed'}
          </span>
        )}
      </div>
    )}
  </div>
)

interface DocumentCanvasSurfaceProps {
  preview: ArtifactPreview
  accessToken: string
  sessionId: string
}

export const DocumentCanvasSurface: React.FC<DocumentCanvasSurfaceProps> = ({ preview, accessToken, sessionId }) => {
  const { refreshArtifacts } = useFabric()

  const isStreaming = preview.status === 'generating'
  const { text, isMarkdown } = resolveContent(preview)
  const title = String(preview.content?.title ?? preview.title)
  // ``entity_id`` is the canonical key emitted by prompt-manager's tool;
  // older events may only populate ``document_id``. Fall through to both.
  const docId = extractEntityId(preview) ?? (preview.content?.document_id as string | undefined)

  // After the first successful PATCH we intentionally lock the canvas into a
  // read-only preview. Further edits from this surface are unreliable (the
  // document-service then drives collaboration through Yjs + contentJson, and
  // any subsequent direct PATCH races with the collab provider), so we route
  // the user into the full Documents app where all that wiring lives.
  const [isPersisted, setIsPersisted] = useState(false)

  const canEdit = !isStreaming && !!text && !isPersisted

  const [editedMarkdown, setEditedMarkdown] = useState<string | null>(null)
  const [editedHtml, setEditedHtml] = useState<string | null>(null)
  const [editedTitle, setEditedTitle] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveError, setSaveError] = useState<string | undefined>(undefined)
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Ref mirrors of the edited state. Reading from these in `handleSave`
  // guarantees we always send the latest blur-flushed value, not a value
  // captured by the useCallback closure.
  const editedMarkdownRef = useRef<string | null>(null)
  const editedHtmlRef = useRef<string | null>(null)
  // For markdown docs we additionally track the HTML projection coming from
  // InlineEditableMarkdownBlock's onHtmlChange. document-service's `content`
  // field stores HTML, so this is what we actually PATCH to the server.
  const editedMarkdownHtmlRef = useRef<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Ensure the "saved → idle" reset timer doesn't fire after unmount.
    return () => {
      if (savedResetTimerRef.current !== null) {
        clearTimeout(savedResetTimerRef.current)
        savedResetTimerRef.current = null
      }
    }
  }, [])

  const displayTitle = editedTitle ?? title
  const displayContent = isMarkdown ? (editedMarkdown ?? text) : (editedHtml ?? text)
  const sanitizedDisplayHtml = useMemo(
    () => (isMarkdown ? '' : DOMPurify.sanitize(displayContent)),
    [isMarkdown, displayContent]
  )

  const handleTitleChange = useCallback((newTitle: string) => {
    setEditedTitle(newTitle)
  }, [])

  const handleMarkdownChange = useCallback((newMd: string) => {
    editedMarkdownRef.current = newMd
    setEditedMarkdown(newMd)
  }, [])

  // HTML representation emitted in parallel with onChange from the markdown
  // editor. We only track it; we don't put it in React state because there's
  // nothing to render from it here — it's consumed only at save time.
  const handleMarkdownHtmlChange = useCallback((html: string) => {
    editedMarkdownHtmlRef.current = html
  }, [])

  const handleHtmlChange = useCallback((newHtml: string) => {
    editedHtmlRef.current = newHtml
    setEditedHtml(newHtml)
  }, [])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(displayContent)
  }, [displayContent])

  const handleOpenInDocuments = useCallback(() => {
    if (!docId) return
    navigateTo(buildPlatformUrl(DOCUMENT_EDITOR_ROUTE, { docId, view: 'editor' }))
  }, [docId])

  const handleSave = useCallback(async () => {
    if (!docId) return

    // Flush any in-progress edit: if the user clicks Save while the cursor
    // is still inside a contentEditable, the child's onBlur hasn't fired yet
    // and `editedMarkdown`/`editedHtml` are stale. Blur the focused element
    // (scoped to this canvas) so its onChange propagates before we read it.
    const active = document.activeElement
    if (active instanceof HTMLElement && rootRef.current?.contains(active)) {
      active.blur()
      // Let React flush the resulting setState from the child's onBlur.
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }

    setSaveState('saving')
    setSaveError(undefined)

    // Read the freshest HTML (refs are updated synchronously on blur).
    // - For markdown docs, we send the HTML rendered from the user's edits;
    //   if the user never edited, fall back to the original server-provided
    //   HTML from the SSE complete event so that contentJson can still be
    //   reset cleanly against a known-good HTML payload.
    // - For HTML docs, the editable surface itself is HTML.
    const originalHtml = typeof preview.content?.html === 'string' ? String(preview.content.html) : ''
    const htmlToSend = isMarkdown
      ? (editedMarkdownHtmlRef.current ?? originalHtml ?? text)
      : (editedHtmlRef.current ?? editedHtml ?? originalHtml ?? text)

    const result = await saveCanvasDraft({
      sessionId,
      accessToken,
      preview,
      title: displayTitle,
      htmlContent: htmlToSend,
      entityId: docId
    })
    if (result.ok) {
      // IMPORTANT: keep the local edit buffers intact. `preview.content` is
      // driven by the SSE stream (original AI-generated text) and is NOT
      // refreshed by REST fetches, so clearing the buffers would flip the
      // view back to the pre-edit content even though the server now holds
      // the new version. The buffers themselves are the freshly-persisted
      // "server-authoritative" state after a successful PATCH.
      // We also lock the canvas into read-only mode and swap the Save button
      // for "Open in Documents" — subsequent edits must go through the full
      // Documents app (collab editor + reliable autosave).
      void refreshArtifacts()
      setIsPersisted(true)

      setSaveState('saved')
      if (savedResetTimerRef.current !== null) clearTimeout(savedResetTimerRef.current)
      savedResetTimerRef.current = setTimeout(() => {
        setSaveState('idle')
        savedResetTimerRef.current = null
      }, 2500)
    } else {
      setSaveState('error')
      setSaveError(result.error)
    }
  }, [docId, displayTitle, editedHtml, isMarkdown, preview, sessionId, text, accessToken, refreshArtifacts])

  return (
    <div ref={rootRef} className="gba:flex gba:flex-col gba:h-full" data-testid="fabric-document-canvas">
      <CanvasToolbar
        title={displayTitle}
        isStreaming={isStreaming}
        saveState={saveState}
        saveError={saveError}
        canEdit={canEdit && !!docId}
        isPersisted={isPersisted}
        canOpenInDocuments={!!docId}
        onCopy={handleCopy}
        onSave={handleSave}
        onOpenInDocuments={handleOpenInDocuments}
      />

      {isPersisted && (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-1.5 gba:border-b gba:border-border gba:bg-muted/20 gba:text-[10px] gba:text-muted-foreground"
          data-testid="fabric-canvas-persisted-banner"
        >
          <CheckCircleIcon className="gba:h-3 gba:w-3 gba:text-success gba:shrink-0" />
          <span className="gba:truncate">
            Saved to Documents. Open the document to keep editing with real-time collaboration and version history.
          </span>
        </div>
      )}

      <div className="gba:flex-1 gba:overflow-y-auto">
        <div className="gba:mx-auto gba:px-5 gba:py-6">
          <div className="gba:bg-card gba:border gba:border-border/50 gba:rounded-xl gba:px-6 gba:py-6 gba:min-h-[20rem]">
            {text || isStreaming ? (
              <>
                {displayTitle && (
                  <header className="gba:mb-5 gba:pb-4 gba:border-b gba:border-border/30">
                    {canEdit ? (
                      <InlineEditableTitle
                        value={displayTitle}
                        onChange={handleTitleChange}
                        as="h2"
                        className="gba:text-base gba:font-bold gba:text-foreground gba:tracking-tight gba:leading-tight"
                        testId="fabric-canvas-title"
                      />
                    ) : (
                      <h2 className="gba:text-base gba:font-bold gba:text-foreground gba:tracking-tight gba:leading-tight">
                        {displayTitle}
                      </h2>
                    )}
                  </header>
                )}

                <article className="gba:prose gba:prose-sm gba:max-w-none gba:leading-relaxed gba:text-foreground">
                  {canEdit ? (
                    isMarkdown ? (
                      <InlineEditableMarkdownBlock
                        value={displayContent}
                        onChange={handleMarkdownChange}
                        onHtmlChange={handleMarkdownHtmlChange}
                        accessToken={accessToken}
                        testId="fabric-canvas-body"
                      />
                    ) : (
                      <EditableHtmlBlock html={displayContent} onChange={handleHtmlChange} />
                    )
                  ) : text ? (
                    isMarkdown ? (
                      <MarkdownWithChipsRenderer content={displayContent} accessToken={accessToken} variant="default" />
                    ) : (
                      <div
                        className="gba:prose gba:prose-sm gba:max-w-none gba:text-foreground"
                        dangerouslySetInnerHTML={{ __html: sanitizedDisplayHtml }}
                      />
                    )
                  ) : (
                    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-40 gba:gap-2">
                      <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:text-primary gba:animate-spin" />
                      <span className="gba:text-xs gba:text-muted-foreground">Generating document...</span>
                    </div>
                  )}
                </article>
              </>
            ) : (
              <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-40 gba:gap-2">
                <FileTextIcon className="gba:h-6 gba:w-6 gba:text-primary/40" />
                <span className="gba:text-xs gba:text-muted-foreground">No content</span>
              </div>
            )}

            {isStreaming && text && (
              <div className="gba:mt-6 gba:flex gba:items-center gba:gap-2 gba:text-muted-foreground gba:border-t gba:border-border/30 gba:pt-3">
                <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-primary" />
                <span className="gba:text-[10px] gba:font-medium">Writing...</span>
              </div>
            )}

            {canEdit && !isStreaming && (
              <div className="gba:mt-4 gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground/50">
                <PencilSimpleIcon className="gba:h-3 gba:w-3" />
                <span className="gba:text-[9px]">Click content to edit</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
