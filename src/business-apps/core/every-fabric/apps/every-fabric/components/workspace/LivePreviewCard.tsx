import { useCallback, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, PresentationIcon, SpinnerGapIcon, XCircleIcon } from '@phosphor-icons/react'
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

const GeneratingSlidesProgress: React.FC<{ preview: ArtifactPreview }> = ({ preview }) => {
  const slideCount = (preview.content?.slideCount as number | undefined) ?? 0
  const phase = (preview.content?.phase as string | undefined) ?? 'generating'

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

const ErrorState: React.FC<{ preview: ArtifactPreview }> = ({ preview }) => (
  <PanelCard title="Live Preview" defaultOpen>
    <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:p-6">
      <XCircleIcon className="gba:h-5 gba:w-5 gba:text-destructive" />
      <p className="gba:text-xs gba:text-destructive">Preview failed</p>
      <p className="gba:text-[10px] gba:text-muted-foreground gba:text-center gba:line-clamp-3">
        {preview.error ?? 'Unknown error'}
      </p>
    </div>
  </PanelCard>
)

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
}

export const LivePreviewCard: React.FC<LivePreviewCardProps> = ({ preview, accessToken = '', sessionId = '' }) => {
  if (preview.status === 'error') return <ErrorState preview={preview} />

  if (preview.artifactType === 'document') {
    if (isDocumentPreview(preview) || preview.status === 'generating') {
      return <DocumentCanvasSurface preview={preview} accessToken={accessToken} sessionId={sessionId} />
    }
  }

  if (preview.status === 'generating') {
    if (preview.artifactType === 'slides') return <GeneratingSlidesProgress preview={preview} />
    if (preview.artifactType === 'chart' && preview.content?.chartType) return <ChartPreview preview={preview} />
    return <GeneratingSpinner preview={preview} />
  }

  if (preview.status === 'draft_ready' && preview.content) {
    if (preview.artifactType === 'slides' && Array.isArray(preview.content.slides)) {
      return (
        <DraftSlidesPreview
          preview={preview}
          slides={preview.content.slides as SlideData[]}
          accessToken={accessToken}
          sessionId={sessionId}
        />
      )
    }
  }

  if (preview.status !== 'ready' || !preview.content) return null

  if (preview.artifactType === 'slides' && Array.isArray(preview.content.slides)) {
    return <SlidesPreview preview={preview} slides={preview.content.slides as SlideData[]} />
  }

  if (preview.artifactType === 'chart') {
    return <ChartPreview preview={preview} />
  }

  return null
}
