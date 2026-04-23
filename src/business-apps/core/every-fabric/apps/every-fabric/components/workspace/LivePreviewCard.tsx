import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
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

const SLIDE_FALLBACK_WIDTH = 400

const GeneratingSpinner: React.FC<{ preview: ArtifactPreview }> = ({ preview }) => {
  const label = preview.artifactType === 'slides' ? 'presentation' : preview.artifactType
  return (
    <PanelCard title="Live Preview" defaultOpen>
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
}> = ({ preview, slides, currentSlide, setCurrentSlide, userOverrideRef }) => {
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
    <PanelCard title="Live Preview" defaultOpen>
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
}

const GeneratingSlidesProgress: React.FC<GeneratingSlidesProgressProps> = ({
  preview,
  currentSlide,
  setCurrentSlide,
  userOverrideRef
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
      />
    )
  }

  return (
    <PanelCard title="Live Preview" defaultOpen>
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
  chart: "We couldn't finish your chart"
}

const FRIENDLY_FALLBACK_BODY =
  'Something went wrong while generating this. It might be a temporary hiccup — try again in a moment.'

interface ErrorStateProps {
  preview: ArtifactPreview
  onRetry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({ preview, onRetry }) => {
  const [showDetails, setShowDetails] = useState(false)

  const headline = FRIENDLY_FALLBACK_HEADLINE[preview.artifactType] ?? "We couldn't finish this"
  const body = preview.userMessage?.trim() || FRIENDLY_FALLBACK_BODY
  const canRetry = preview.retryable !== false && !!onRetry
  // Prefer the new ``technicalDetail`` surface; fall back to the legacy
  // ``error`` string only if the backend hasn't been upgraded yet. We still
  // never render a raw HTTP body as the headline.
  const detail = preview.technicalDetail?.trim() || preview.error?.trim() || ''

  return (
    <PanelCard title="Live Preview" defaultOpen>
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

const SlidesPreview: React.FC<{ preview: ArtifactPreview; slides: SlideData[] }> = ({ slides }) => {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [mainRef, measuredWidth] = useContainerWidth<HTMLDivElement>()
  const prev = useCallback(() => setCurrentSlide(i => Math.max(0, i - 1)), [])
  const next = useCallback(() => setCurrentSlide(i => Math.min((slides.length || 1) - 1, i + 1)), [slides.length])

  const [showGrid, setShowGrid] = useState(false)
  const containerWidth = measuredWidth ?? SLIDE_FALLBACK_WIDTH

  return (
    <PanelCard title="Live Preview" defaultOpen>
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
}

interface SlideCarouselState {
  currentSlide: number
  setCurrentSlide: (updater: (i: number) => number) => void
  userOverrideRef: React.MutableRefObject<boolean>
}

function renderGenerating(preview: ArtifactPreview, carousel: SlideCarouselState): React.ReactElement {
  if (preview.artifactType === 'slides') {
    return (
      <GeneratingSlidesProgress
        preview={preview}
        currentSlide={carousel.currentSlide}
        setCurrentSlide={carousel.setCurrentSlide}
        userOverrideRef={carousel.userOverrideRef}
      />
    )
  }
  if (preview.artifactType === 'chart' && preview.content?.chartType) {
    return <ChartPreview preview={preview} />
  }
  return <GeneratingSpinner preview={preview} />
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

function renderReady(preview: ArtifactPreview): React.ReactElement | null {
  if (!preview.content) return null
  if (preview.artifactType === 'slides' && Array.isArray(preview.content.slides)) {
    return <SlidesPreview preview={preview} slides={preview.content.slides as SlideData[]} />
  }
  if (preview.artifactType === 'chart') {
    return <ChartPreview preview={preview} />
  }
  return null
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({
  preview,
  accessToken = '',
  sessionId = '',
  onRetry
}) => {
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

  if (preview.status === 'error') return <ErrorState preview={preview} onRetry={onRetry} />

  if (preview.artifactType === 'document' && (isDocumentPreview(preview) || preview.status === 'generating')) {
    // Wrap in PanelCard so the document canvas behaves like the other
    // live-preview surfaces (slides, chart) — collapsible via the rail
    // header so the user can access Plan / Decisions / Activity while
    // a long document is still streaming.
    return (
      <PanelCard title="Live Preview" defaultOpen>
        <DocumentCanvasSurface preview={preview} accessToken={accessToken} sessionId={sessionId} />
      </PanelCard>
    )
  }

  const carousel: SlideCarouselState = { currentSlide, setCurrentSlide: updateSlide, userOverrideRef }

  if (preview.status === 'generating') {
    return renderGenerating(preview, carousel)
  }

  if (preview.status === 'draft_ready' && preview.content) {
    return renderDraftReady(preview, carousel, accessToken, sessionId)
  }

  if (preview.status === 'ready') {
    return renderReady(preview)
  }

  return null
}
