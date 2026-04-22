import { useCallback, useState } from 'react'
import { CheckCircleIcon, SpinnerGapIcon, TrashIcon } from '@phosphor-icons/react'
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
  const [state, setState] = useState<'idle' | 'confirming' | 'discarding' | 'done' | 'error'>('idle')

  // Discard becomes destructive (DELETE) when the AI already persisted the
  // artifact. Surface that to the user via the button tooltip so nobody is
  // surprised when their draft disappears from the workspace list.
  const entityId = extractEntityId(preview)
  const discardLabel = entityId ? 'Delete draft from Documents' : 'Dismiss preview'

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
        <span className="gba:text-[10px] gba:text-success gba:font-medium">Done</span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:bg-destructive/5">
        <span className="gba:text-[10px] gba:text-destructive gba:font-medium">Save failed</span>
        <button
          onClick={() => setState('idle')}
          className="gba:text-[10px] gba:font-medium gba:text-primary gba:hover:underline"
          data-testid="fabric-draft-retry"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:border-t gba:border-border gba:bg-muted/10">
      <span className="gba:text-[10px] gba:text-warning gba:font-medium">Draft - Review before saving</span>
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
          {entityId ? 'Delete' : 'Discard'}
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
          Save
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
}> = ({ preview, slides, accessToken, sessionId }) => {
  const [currentSlide] = useState(0)
  const [mainRef, measuredWidth] = useContainerWidth<HTMLDivElement>()
  const containerWidth = measuredWidth ?? SLIDE_FALLBACK_WIDTH

  return (
    <PanelCard title="Live Preview" defaultOpen>
      <div className="gba:flex gba:flex-col" data-testid="fabric-live-preview-draft-slides">
        <div ref={mainRef} className="gba:flex gba:items-center gba:justify-center gba:p-3">
          <SlideCanvasMiniPreview
            slide={slides[currentSlide] ?? {}}
            containerWidth={Math.max(200, containerWidth - 24)}
          />
        </div>
        <div className="gba:flex gba:items-center gba:justify-center gba:gap-3 gba:py-2 gba:border-t gba:border-border">
          <span className="gba:text-[10px] gba:font-medium gba:text-muted-foreground gba:tabular-nums">
            {currentSlide + 1} / {slides.length}
          </span>
        </div>
      </div>
      <DraftActionBar sessionId={sessionId} preview={preview} accessToken={accessToken} />
    </PanelCard>
  )
}
