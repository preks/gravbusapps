import { useCallback, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, SpinnerGapIcon, TrashIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'
import type { ArtifactPreview } from '../../hooks/useArtifactPreview'
import { confirmDraft as confirmDraftApi, confirmDraftFromPreview, extractEntityId } from '../../utils/confirmDraftApi'
import { PanelCard } from './PanelCard'
import { SlideCanvasMiniPreview, useContainerWidth, type SlideData } from './SlideCanvasMiniPreview'

const SLIDE_FALLBACK_WIDTH = 400

// Re-export for backwards compatibility with any external callers that used
// the old positional API. New code should import from
// ``../../utils/confirmDraftApi`` directly.
export { confirmDraftApi as confirmDraft }

interface DraftActionBarProps {
  sessionId: string
  preview: ArtifactPreview
  accessToken: string
  onConfirmed?: () => void
  onDiscarded?: () => void
}

export const DraftActionBar: React.FC<DraftActionBarProps> = ({
  sessionId,
  preview,
  accessToken,
  onConfirmed,
  onDiscarded
}) => {
  const { t } = useTranslation(translations)
  const [state, setState] = useState<'idle' | 'confirming' | 'discarding' | 'done' | 'error'>('idle')

  // Discard becomes destructive (DELETE) when the AI already persisted the
  // artifact. Surface that to the user via the button tooltip so nobody is
  // surprised when their draft disappears from the workspace list.
  const entityId = extractEntityId(preview)
  const discardLabel = entityId ? t('workspace-draft-discard-delete') : t('workspace-draft-discard-dismiss')

  const handleConfirm = useCallback(async () => {
    setState('confirming')
    try {
      await confirmDraftFromPreview(sessionId, preview, accessToken)
      setState('done')
      onConfirmed?.()
    } catch {
      setState('error')
    }
  }, [sessionId, preview, accessToken, onConfirmed])

  const handleDiscard = useCallback(async () => {
    setState('discarding')
    try {
      await confirmDraftFromPreview(sessionId, preview, accessToken, { discard: true })
      setState('done')
      onDiscarded?.()
    } catch {
      setState('error')
    }
  }, [sessionId, preview, accessToken, onDiscarded])

  if (state === 'done') {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:px-3 gba:py-2 gba:border-t gba:border-border">
        <span className="gba:text-[10px] gba:text-success gba:font-medium">{t('workspace-draft-done')}</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:bg-destructive/5">
        <span className="gba:text-[10px] gba:text-destructive gba:font-medium">{t('workspace-draft-save-failed')}</span>
        <button
          onClick={() => setState('idle')}
          className="gba:text-[10px] gba:font-medium gba:text-primary gba:hover:underline"
          data-testid="fabric-draft-retry"
        >
          {t('workspace-draft-retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:bg-muted/10">
      <span className="gba:text-[10px] gba:text-warning gba:font-medium">{t('workspace-draft-review')}</span>
      <div className="gba:flex gba:items-center gba:gap-1.5">
        <button
          onClick={handleDiscard}
          disabled={state !== 'idle'}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded-md gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:hover:bg-muted/40 gba:disabled:opacity-50 gba:transition-colors"
          data-testid="fabric-draft-discard"
          title={discardLabel}
        >
          {state === 'discarding' ? (
            <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
          ) : (
            <TrashIcon className="gba:h-3 gba:w-3" />
          )}
          {entityId ? t('workspace-draft-delete') : t('workspace-draft-discard')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={state !== 'idle'}
          className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2.5 gba:py-1 gba:rounded-md gba:text-[10px] gba:font-medium gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90 gba:disabled:opacity-50 gba:transition-colors"
          data-testid="fabric-draft-confirm"
        >
          {state === 'confirming' ? (
            <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
          ) : (
            <CheckCircleIcon className="gba:h-3 gba:w-3" />
          )}
          {t('action-save')}
        </button>
      </div>
    </div>
  )
}

export const DraftSlidesPreview: React.FC<{
  preview: ArtifactPreview
  slides: SlideData[]
  accessToken: string
  sessionId: string
  /**
   * Optional externally-controlled slide index. When the live preview is
   * lifted up to ``LivePreviewCard`` (so the carousel position survives the
   * streaming → draft_ready transition) both props are provided. When the
   * component is used standalone we fall back to internal state starting at
   * slide 0.
   */
  currentSlide?: number
  setCurrentSlide?: (updater: (i: number) => number) => void
}> = ({ preview, slides, accessToken, sessionId, currentSlide: externalIndex, setCurrentSlide: externalSetter }) => {
  const { t } = useTranslation(translations)
  const [internalIndex, setInternalIndex] = useState(0)
  const currentSlide = externalIndex ?? internalIndex
  const setCurrentSlide =
    externalSetter ?? ((updater: (i: number) => number) => setInternalIndex(prev => updater(prev)))

  const [mainRef, measuredWidth] = useContainerWidth<HTMLDivElement>()
  const containerWidth = measuredWidth ?? SLIDE_FALLBACK_WIDTH

  // Clamp to range so the shared index (which may still reflect the last
  // streaming position) never points past the end of the deck.
  const clampedIndex = Math.max(0, Math.min(currentSlide, Math.max(0, slides.length - 1)))

  const prev = useCallback(
    () => setCurrentSlide(i => Math.max(0, Math.min(i, slides.length - 1) - 1)),
    [setCurrentSlide, slides.length]
  )
  const next = useCallback(
    () => setCurrentSlide(i => Math.min(slides.length - 1, Math.max(0, i) + 1)),
    [setCurrentSlide, slides.length]
  )

  return (
    <PanelCard title={t('workspace-live-preview-title')} defaultOpen>
      <div className="gba:flex gba:flex-col" data-testid="fabric-live-preview-draft-slides">
        <div ref={mainRef} className="gba:flex gba:items-center gba:justify-center gba:p-3">
          <SlideCanvasMiniPreview
            slide={slides[clampedIndex] ?? {}}
            containerWidth={Math.max(200, containerWidth - 24)}
          />
        </div>
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-2 gba:py-2 gba:border-t gba:border-border">
          <button
            onClick={prev}
            disabled={clampedIndex === 0}
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
            data-testid="fabric-live-preview-draft-prev"
            aria-label={t('workspace-prev-slide')}
          >
            <ArrowLeftIcon className="gba:h-3 gba:w-3" />
          </button>
          <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:tabular-nums">
            {clampedIndex + 1} / {slides.length}
          </span>
          <button
            onClick={next}
            disabled={clampedIndex >= slides.length - 1}
            className="gba:inline-flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded-md gba:border gba:border-border gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/40 gba:disabled:opacity-30 gba:disabled:cursor-not-allowed gba:transition-colors"
            data-testid="fabric-live-preview-draft-next"
            aria-label={t('workspace-next-slide')}
          >
            <ArrowRightIcon className="gba:h-3 gba:w-3" />
          </button>
        </div>
      </div>
      <DraftActionBar sessionId={sessionId} preview={preview} accessToken={accessToken} />
    </PanelCard>
  )
}
