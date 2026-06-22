import { useTranslation } from '@newwork/nw-design-system'
import { ClockIcon, HardDrivesIcon, HashIcon, TagIcon } from '@phosphor-icons/react'
import type { TraceFrame } from '../../utils/traceModel'
import translations from '../../_i18n'
import { traceColor } from './traceColors'

interface TraceStepDetailProps {
  frame: TraceFrame
  onClose: () => void
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

export const TraceStepDetail: React.FC<TraceStepDetailProps> = ({ frame, onClose }) => {
  const { t } = useTranslation(translations)
  const color = traceColor(frame.kind)

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden gba:border-l gba:border-border/40"
      data-testid="trace-step-detail"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-3 gba:border-b gba:border-border/30">
        <h3 className="gba:text-sm gba:font-semibold gba:truncate gba:text-foreground">{frame.title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="gba:text-muted-foreground gba:hover:text-foreground gba:text-xs gba:shrink-0 gba:ml-2"
          data-testid="trace-step-detail-close"
        >
          {t('action-close')}
        </button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-4 gba:space-y-3">
        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
          <span
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full ${color.bar} ${color.text}`}
          >
            <TagIcon className="gba:h-3 gba:w-3" />
            {t(color.labelKey)}
          </span>

          {frame.status && (
            <span
              className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full ${
                frame.status === 'done'
                  ? 'gba:bg-success/20 gba:text-success-foreground'
                  : frame.status === 'failed'
                    ? 'gba:bg-destructive/20 gba:text-destructive-foreground'
                    : 'gba:bg-warning/20 gba:text-warning-foreground'
              }`}
            >
              <HardDrivesIcon className="gba:h-3 gba:w-3" />
              {frame.status}
            </span>
          )}
        </div>

        <dl className="gba:grid gba:grid-cols-2 gba:gap-x-4 gba:gap-y-2 gba:text-xs">
          <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
            <HashIcon className="gba:h-3 gba:w-3" />
            {t('trace-explorer-detail-seq')}
          </div>
          <dd className="gba:text-foreground">{frame.seq}</dd>

          <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
            <ClockIcon className="gba:h-3 gba:w-3" />
            {t('trace-explorer-detail-offset')}
          </div>
          <dd className="gba:text-foreground">{formatMs(frame.offsetMs)}</dd>

          {frame.durationMs != null && (
            <>
              <div className="gba:flex gba:items-center gba:gap-1 gba:text-muted-foreground">
                <ClockIcon className="gba:h-3 gba:w-3" />
                {t('trace-explorer-detail-duration')}
              </div>
              <dd className="gba:text-foreground">{formatMs(frame.durationMs)}</dd>
            </>
          )}
        </dl>

        {frame.summary && (
          <div className="gba:space-y-1">
            <h4 className="gba:text-xs gba:font-medium gba:text-muted-foreground">
              {t('trace-explorer-detail-summary')}
            </h4>
            <p className="gba:text-xs gba:text-foreground gba:whitespace-pre-wrap gba:leading-relaxed">
              {frame.summary}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
