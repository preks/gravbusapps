import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  CaretDownIcon,
  CaretUpIcon,
  PresentationIcon,
  SpinnerGapIcon,
  WarningIcon
} from '@phosphor-icons/react'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import { PanelCard } from './PanelCard'
import { SlideCanvasMiniPreview, SlideThumbnailGrid, useContainerWidth, type SlideData } from './SlideCanvasMiniPreview'
import { ChartPreview } from './ChartPreview'
import { DraftSlidesPreview } from './DraftPreviewCard'
import { DocumentCanvasSurface } from './DocumentCanvasSurface'
import { AutoHeightHtmlIframe } from '../artifacts/AutoHeightHtmlIframe'
import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'
import { useEnterpriseAgentClient } from '../../hooks/useEnterpriseAgentClient'

const SLIDE_FALLBACK_WIDTH = 400

function normalizeArtifactPath(path: string): string {
  return path.replace(/^\/+/, '')
}

function buildHtmlArtifactUrl(sessionId: string, artifactPath: string): string {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  const normalized = normalizeArtifactPath(artifactPath)
  return `${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(normalized)}`
}

const HtmlArtifactLivePreview: React.FC<{
  preview: ArtifactPreview
  sessionId: string
  headerExtra?: React.ReactNode
}> = ({ preview, sessionId, headerExtra }) => {
  const rawPath = typeof preview.content?.path === 'string' ? preview.content.path : ''
  const path = normalizeArtifactPath(rawPath)
  if (!path || !sessionId) {
    return (
      <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
        <p className="gba:p-4 gba:text-xs gba:text-muted-foreground">HTML artifact path unavailable.</p>
      </PanelCard>
    )
  }
  const src = buildHtmlArtifactUrl(sessionId, path)
  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div className="gba:flex gba:flex-col gba:p-2 gba:min-h-[420px]">
        <AutoHeightHtmlIframe
          src={src}
          title={preview.title || path}
          variant="panel"
          data-testid="fabric-live-preview-html-iframe"
        />
      </div>
    </PanelCard>
  )
}

const PdfPreview: React.FC<{
  preview: ArtifactPreview
  sessionId: string
  accessToken: string
  headerExtra?: React.ReactNode
}> = ({ preview, sessionId, accessToken, headerExtra }) => {
  const client = useEnterpriseAgentClient(accessToken)
  const attachmentId = typeof preview.content?.attachment_id === 'string' ? preview.content.attachment_id : ''
  const fileName = typeof preview.content?.file_name === 'string' ? preview.content.file_name : preview.title

  const [blobUrl, setBlobUrl] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    // The /attachments/{id}/content endpoint requires a Bearer token, which a
    // raw <iframe src=…> can't send. Fetch via the authenticated client and
    // hand the iframe a blob: URL instead. This mirrors the PdfExportCard fix
    // in FinalAnswerRenderer.
    if (!sessionId || !attachmentId) return
    let revoked = false
    let createdUrl = ''
    setError('')
    client
      .fetchAttachmentContent(sessionId, attachmentId)
      .then(blob => {
        if (revoked) return
        createdUrl = URL.createObjectURL(blob)
        setBlobUrl(createdUrl)
      })
      .catch((err: unknown) => {
        if (revoked) return
        const detail = err instanceof Error ? err.message : 'unknown error'
        setError(detail)
      })
    return () => {
      revoked = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [client, sessionId, attachmentId])

  let body: React.ReactElement
  if (blobUrl) {
    body = (
      <iframe
        src={blobUrl}
        title={preview.title || fileName}
        className="gba:h-[70vh] gba:w-full gba:rounded-md gba:border gba:border-border gba:bg-background"
        data-testid="fabric-live-preview-pdf-iframe"
      />
    )
  } else if (error) {
    body = <p className="gba:p-4 gba:text-xs gba:text-destructive">PDF preview failed: {error}</p>
  } else if (!attachmentId) {
    body = <p className="gba:p-4 gba:text-xs gba:text-muted-foreground">PDF reference missing.</p>
  } else {
    body = <p className="gba:p-4 gba:text-xs gba:text-muted-foreground">Loading PDF…</p>
  }

  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div className="gba:flex gba:flex-col gba:gap-2 gba:p-2">
        {body}
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-1">
          <p className="gba:text-[11px] gba:text-muted-foreground gba:truncate">
            {fileName} · attached to this session
          </p>
          {blobUrl && (
            <a
              href={blobUrl}
              download={fileName}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-border gba:px-2 gba:py-0.5 gba:text-[11px] gba:text-foreground gba:hover:bg-muted/40"
              data-testid="fabric-live-preview-pdf-download"
            >
              Download PDF
            </a>
          )}
        </div>
      </div>
    </PanelCard>
  )
}

interface MaximizeToggleProps {
  isMaximized: boolean
  onToggle: () => void
}

const MaximizeToggle: React.FC<MaximizeToggleProps> = ({ isMaximized, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="gba:inline-flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:rounded-md gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50 gba:transition-colors"
    aria-label={isMaximized ? 'Collapse preview' : 'Expand preview'}
    title={isMaximized ? 'Collapse preview' : 'Expand preview'}
    data-testid="fabric-live-preview-maximize-toggle"
  >
    {isMaximized ? (
      <ArrowsInIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
    ) : (
      <ArrowsOutIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
    )}
  </button>
)

const GeneratingSpinner: React.FC<{ preview: ArtifactPreview; headerExtra?: React.ReactNode }> = ({
  preview,
  headerExtra
}) => {
  const label = preview.artifactType === 'slides' ? 'presentation' : preview.artifactType
  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6">
        <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:text-primary gba:animate-spin" />
        <p className="gba:text-xs gba:text-muted-foreground gba:text-center">Generating {label}...</p>
        {preview.title && (
          <p className="gba:text-[10px] gba:text-muted-foreground/60 gba:text-center gba:line-clamp-2">
            {preview.title}
          </p>
        )}
      </div>
    </PanelCard>
  )
}

const StreamingSlidesPreview: React.FC<{
  preview: ArtifactPreview
  slides: SlideData[]
  currentSlide: number
  setCurrentSlide: (updater: (i: number) => number) => void
  userOverrideRef: React.MutableRefObject<boolean>
  headerExtra?: React.ReactNode
}> = ({ preview, slides, currentSlide, setCurrentSlide, userOverrideRef, headerExtra }) => {
  const [mainRef, measuredWidth] = useContainerWidth<HTMLDivElement>()
  const containerWidth = measuredWidth ?? SLIDE_FALLBACK_WIDTH

  // Auto-follow the latest rendered slide as new ones stream in, unless the
  // user has manually navigated — then we stay where they left us.
  const targetIndex = slides.length - 1
  useEffect(() => {
    if (userOverrideRef.current) return
    if (targetIndex < 0) return
    setCurrentSlide(() => targetIndex)
  }, [targetIndex, setCurrentSlide, userOverrideRef])

  const prev = useCallback(() => {
    userOverrideRef.current = true
    setCurrentSlide(i => Math.max(0, i - 1))
  }, [setCurrentSlide, userOverrideRef])
  const next = useCallback(() => {
    userOverrideRef.current = true
    setCurrentSlide(i => Math.min((slides.length || 1) - 1, i + 1))
  }, [slides.length, setCurrentSlide, userOverrideRef])

  const totalSlides = (preview.content?.slideCount as number | undefined) ?? slides.length
  const renderedCount = slides.length
  const phase = (preview.content?.phase as string | undefined) ?? 'generating'
  const phaseLabel = phase === 'transforming' ? 'Transforming to visual layout...' : 'Generating content...'

  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div className="gba:flex gba:flex-col" data-testid="fabric-live-preview-slides-streaming">
        <div ref={mainRef} className="gba:flex gba:items-center gba:justify-center gba:p-3">
          <SlideCanvasMiniPreview
            slide={slides[currentSlide] ?? {}}
            containerWidth={Math.max(200, containerWidth - 24)}
          />
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:shrink-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
              data-testid="fabric-live-preview-streaming-prev"
            >
              <ArrowLeftIcon className="gba:h-3 gba:w-3" />
            </button>
            <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:tabular-nums">
              {currentSlide + 1} / {totalSlides || renderedCount}
            </span>
            <button
              onClick={next}
              disabled={currentSlide >= renderedCount - 1}
              className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
              data-testid="fabric-live-preview-streaming-next"
            >
              <ArrowRightIcon className="gba:h-3 gba:w-3" />
            </button>
          </div>
          <div className="gba:flex gba:items-center gba:gap-1.5">
            <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:text-primary gba:animate-spin" />
            <span className="gba:text-[10px] gba:text-muted-foreground">
              {renderedCount}
              {totalSlides ? ` / ${totalSlides}` : ''} · {phaseLabel}
            </span>
          </div>
        </div>
      </div>
    </PanelCard>
  )
}

interface GeneratingSlidesProgressProps {
  preview: ArtifactPreview
  currentSlide: number
  setCurrentSlide: (updater: (i: number) => number) => void
  userOverrideRef: React.MutableRefObject<boolean>
  headerExtra?: React.ReactNode
}

const GeneratingSlidesProgress: React.FC<GeneratingSlidesProgressProps> = ({
  preview,
  currentSlide,
  setCurrentSlide,
  userOverrideRef,
  headerExtra
}) => {
  const slideCount = (preview.content?.slideCount as number | undefined) ?? 0
  const phase = (preview.content?.phase as string | undefined) ?? 'generating'
  const streamedSlides = Array.isArray(preview.content?.slides) ? (preview.content?.slides as SlideData[]) : []

  if (streamedSlides.length > 0) {
    return (
      <StreamingSlidesPreview
        preview={preview}
        slides={streamedSlides}
        currentSlide={currentSlide}
        setCurrentSlide={setCurrentSlide}
        userOverrideRef={userOverrideRef}
        headerExtra={headerExtra}
      />
    )
  }

  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div
        className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-3 gba:p-6"
        data-testid="fabric-live-preview-slides-progress"
      >
        <div className="gba:w-full gba:aspect-video gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-4 gba:animate-pulse">
          <PresentationIcon className="gba:h-8 gba:w-8 gba:text-primary/60" weight="duotone" />
          <p className="gba:text-xs gba:font-semibold gba:text-foreground gba:text-center gba:line-clamp-2">
            {String(preview.content?.title ?? preview.title)}
          </p>
          {slideCount > 0 && (
            <p className="gba:text-[10px] gba:text-muted-foreground">
              {slideCount} slides {phase === 'transforming' ? '- preparing layout...' : '- generating...'}
            </p>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:text-primary gba:animate-spin" />
          <span className="gba:text-[10px] gba:text-muted-foreground">
            {phase === 'transforming' ? 'Transforming to visual layout...' : 'Generating content...'}
          </span>
        </div>
      </div>
    </PanelCard>
  )
}

/**
 * Human-readable fallback copy when the backend didn't ship a structured
 * ``user_message`` — e.g. legacy traces or a pre-upgrade server. We never
 * surface raw HTTP body text; at worst the user sees a generic sentence and
 * can still click "Try again".
 */
const FRIENDLY_FALLBACK_HEADLINE: Record<ArtifactPreview['artifactType'], string> = {
  slides: "We couldn't finish your slides",
  document: "We couldn't finish your document",
  note: "We couldn't finish your note",
  chart: "We couldn't finish your chart",
  html: "We couldn't finish your page",
  pdf: "We couldn't finish your PDF"
}

const FRIENDLY_FALLBACK_BODY =
  'Something went wrong while generating this. It might be a temporary hiccup — try again in a moment.'

interface ErrorStateProps {
  preview: ArtifactPreview
  onRetry?: () => void
  headerExtra?: React.ReactNode
}

const ErrorState: React.FC<ErrorStateProps> = ({ preview, onRetry, headerExtra }) => {
  const [showDetails, setShowDetails] = useState(false)

  const headline = FRIENDLY_FALLBACK_HEADLINE[preview.artifactType] ?? "We couldn't finish this"
  const body = preview.userMessage?.trim() || FRIENDLY_FALLBACK_BODY
  const canRetry = preview.retryable !== false && !!onRetry
  // Prefer the new ``technicalDetail`` surface; fall back to the legacy
  // ``error`` string only if the backend hasn't been upgraded yet. We still
  // never render a raw HTTP body as the headline.
  const detail = preview.technicalDetail?.trim() || preview.error?.trim() || ''

  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div
        className="gba:flex gba:flex-col gba:items-stretch gba:gap-3 gba:p-4"
        data-testid="fabric-live-preview-error"
      >
        <div className="gba:flex gba:items-start gba:gap-3">
          <div className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-amber-500/10 gba:text-amber-600 dark:gba:text-amber-400">
            <WarningIcon className="gba:h-4 gba:w-4" weight="fill" />
          </div>
          <div className="gba:flex gba:min-w-0 gba:flex-col gba:gap-1">
            <p className="gba:text-sm gba:font-semibold gba:text-foreground gba:leading-snug">{headline}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed">{body}</p>
          </div>
        </div>

        {canRetry && (
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-md gba:bg-primary gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-primary-foreground gba:shadow-sm gba:hover:bg-primary/90 gba:transition-colors"
              data-testid="fabric-live-preview-error-retry"
            >
              <ArrowClockwiseIcon className="gba:h-3.5 gba:w-3.5" weight="bold" />
              Try again
            </button>
            {preview.errorCode && (
              <span className="gba:text-[10px] gba:text-muted-foreground/70 gba:font-mono">{preview.errorCode}</span>
            )}
          </div>
        )}

        {detail && (
          <div className="gba:border-t gba:border-border/60 gba:pt-2">
            <button
              type="button"
              onClick={() => setShowDetails(s => !s)}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
              data-testid="fabric-live-preview-error-details-toggle"
              aria-expanded={showDetails}
            >
              {showDetails ? (
                <CaretUpIcon className="gba:h-3 gba:w-3" />
              ) : (
                <CaretDownIcon className="gba:h-3 gba:w-3" />
              )}
              {showDetails ? 'Hide technical details' : 'Show technical details'}
            </button>
            {showDetails && (
              <p
                className="gba:mt-1.5 gba:max-h-24 gba:overflow-y-auto gba:rounded-md gba:bg-muted/40 gba:p-2 gba:text-[10px] gba:text-muted-foreground gba:font-mono gba:whitespace-pre-wrap gba:break-words"
                data-testid="fabric-live-preview-error-details"
              >
                {detail}
              </p>
            )}
          </div>
        )}
      </div>
    </PanelCard>
  )
}

const SlidesPreview: React.FC<{
  preview: ArtifactPreview
  slides: SlideData[]
  headerExtra?: React.ReactNode
}> = ({ slides, headerExtra }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [mainRef, measuredWidth] = useContainerWidth<HTMLDivElement>()
  const prev = useCallback(() => setCurrentSlide(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setCurrentSlide(i => Math.min((slides.length || 1) - 1, i + 1)), [slides.length])

  const [showGrid, setShowGrid] = useState(false)
  const containerWidth = measuredWidth ?? SLIDE_FALLBACK_WIDTH

  return (
    <PanelCard title="Live Preview" defaultOpen extra={headerExtra}>
      <div className="gba:flex gba:flex-col" data-testid="fabric-live-preview-slides">
        <div ref={mainRef} className="gba:flex gba:items-center gba:justify-center gba:p-3">
          <SlideCanvasMiniPreview
            slide={slides[currentSlide] ?? {}}
            containerWidth={Math.max(200, containerWidth - 24)}
          />
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:shrink-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              onClick={prev}
              disabled={currentSlide === 0}
              className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
              data-testid="fabric-live-preview-prev"
            >
              <ArrowLeftIcon className="gba:h-3 gba:w-3" />
            </button>
            <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:tabular-nums">
              {currentSlide + 1} / {slides.length}
            </span>
            <button
              onClick={next}
              disabled={currentSlide === slides.length - 1}
              className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
              data-testid="fabric-live-preview-next"
            >
              <ArrowRightIcon className="gba:h-3 gba:w-3" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowGrid(g => !g)}
            className="gba:text-[10px] gba:font-medium gba:text-primary gba:hover:underline"
            data-testid="fabric-live-preview-toggle-grid"
          >
            {showGrid ? 'Hide grid' : 'Show all'}
          </button>
        </div>

        {showGrid && (
          <SlideThumbnailGrid slides={slides} activeSlideIndex={currentSlide} onSelectSlide={setCurrentSlide} />
        )}
      </div>
    </PanelCard>
  )
}

function isDocumentPreview(preview: ArtifactPreview): boolean {
  return preview.artifactType === 'document' && !!(preview.content?.html || preview.content?.markdown)
}

interface LivePreviewCardProps {
  preview: ArtifactPreview
  accessToken?: string
  sessionId?: string
  /** Invoked when the user clicks "Try again" on the error state. */
  onRetry?: () => void
  /** Whether the preview is currently shown in its expanded layout. */
  isMaximized?: boolean
  /** Toggles the expanded layout when provided. */
  onToggleMaximized?: () => void
}

interface SlideCarouselState {
  currentSlide: number
  setCurrentSlide: (updater: (i: number) => number) => void
  userOverrideRef: React.MutableRefObject<boolean>
}

function renderGenerating(
  preview: ArtifactPreview,
  carousel: SlideCarouselState,
  headerExtra?: React.ReactNode,
  sessionId = '',
  accessToken = ''
): React.ReactElement {
  if (preview.artifactType === 'slides') {
    return (
      <GeneratingSlidesProgress
        preview={preview}
        currentSlide={carousel.currentSlide}
        setCurrentSlide={carousel.setCurrentSlide}
        userOverrideRef={carousel.userOverrideRef}
        headerExtra={headerExtra}
      />
    )
  }
  if (preview.artifactType === 'html') {
    return <HtmlArtifactLivePreview preview={preview} sessionId={sessionId} headerExtra={headerExtra} />
  }
  if (preview.artifactType === 'chart') {
    return <ChartPreview preview={preview} sessionId={sessionId} accessToken={accessToken} />
  }
  return <GeneratingSpinner preview={preview} headerExtra={headerExtra} />
}

function renderDraftReady(
  preview: ArtifactPreview,
  carousel: SlideCarouselState,
  accessToken: string,
  sessionId: string
): React.ReactElement | null {
  if (preview.artifactType === 'slides' && Array.isArray(preview.content?.slides)) {
    return (
      <DraftSlidesPreview
        preview={preview}
        slides={preview.content.slides as SlideData[]}
        accessToken={accessToken}
        sessionId={sessionId}
        currentSlide={carousel.currentSlide}
        setCurrentSlide={carousel.setCurrentSlide}
      />
    )
  }
  return null
}

function renderReady(
  preview: ArtifactPreview,
  headerExtra?: React.ReactNode,
  sessionId = '',
  accessToken = ''
): React.ReactElement | null {
  if (!preview.content && preview.artifactType !== 'chart') return null
  if (preview.artifactType === 'slides' && Array.isArray(preview.content?.slides)) {
    return <SlidesPreview preview={preview} slides={preview.content.slides as SlideData[]} headerExtra={headerExtra} />
  }
  if (preview.artifactType === 'html') {
    return <HtmlArtifactLivePreview preview={preview} sessionId={sessionId} headerExtra={headerExtra} />
  }
  if (preview.artifactType === 'chart') {
    return <ChartPreview preview={preview} sessionId={sessionId} accessToken={accessToken} />
  }
  if (preview.artifactType === 'pdf') {
    return <PdfPreview preview={preview} sessionId={sessionId} accessToken={accessToken} headerExtra={headerExtra} />
  }
  return null
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  preview,
  accessToken = '',
  sessionId = '',
  onRetry,
  isMaximized = false,
  onToggleMaximized
}) => {
  const maximizeToggle = onToggleMaximized ? (
    <MaximizeToggle isMaximized={isMaximized} onToggle={onToggleMaximized} />
  ) : undefined
  // Shared slide carousel index. Kept at the card level so the position
  // survives the streaming → draft_ready → ready status transitions for the
  // same artifact: otherwise the user sees the streaming view auto-advance
  // to slide N, then jump back to slide 1 when the draft card mounts.
  const [currentSlide, setCurrentSlide] = useState(0)
  const userOverrideRef = useRef(false)
  const lastArtifactIdRef = useRef<string | null>(null)

  // Reset whenever we switch to a different artifact preview.
  if (lastArtifactIdRef.current !== preview.artifactId) {
    lastArtifactIdRef.current = preview.artifactId
    userOverrideRef.current = false
    // Safe to call setState during render here only because we guard with
    // a ref equality check; this pattern matches React's "deriving state"
    // recommendation for cheap resets.
    if (currentSlide !== 0) setCurrentSlide(0)
  }

  const updateSlide = useCallback((updater: (i: number) => number) => setCurrentSlide(prev => updater(prev)), [])

  if (preview.status === 'error') return <ErrorState preview={preview} onRetry={onRetry} headerExtra={maximizeToggle} />

  if (preview.artifactType === 'document' && (isDocumentPreview(preview) || preview.status === 'generating')) {
    // Wrap in PanelCard so the document canvas behaves like the other
    // live-preview surfaces (slides, chart) — collapsible via the rail
    // header so the user can access Plan / Decisions / Activity while
    // a long document is still streaming.
    return (
      <PanelCard title="Live Preview" defaultOpen extra={maximizeToggle}>
        <DocumentCanvasSurface preview={preview} accessToken={accessToken} sessionId={sessionId} />
      </PanelCard>
    )
  }

  const carousel: SlideCarouselState = { currentSlide, setCurrentSlide: updateSlide, userOverrideRef }

  if (preview.status === 'generating') {
    return renderGenerating(preview, carousel, maximizeToggle, sessionId, accessToken)
  }

  if (preview.status === 'draft_ready' && preview.content) {
    return renderDraftReady(preview, carousel, accessToken, sessionId)
  }

  if (preview.status === 'ready') {
    return renderReady(preview, maximizeToggle, sessionId, accessToken)
  }

  return null
}
