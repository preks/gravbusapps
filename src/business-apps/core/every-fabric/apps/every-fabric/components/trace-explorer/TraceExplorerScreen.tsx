// Page shell for the Trace Explorer — header, tabs, and replay timeline.

import { ArrowLeftIcon, ArrowSquareOutIcon, ListMagnifyingGlassIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import { Badge, Button, useTranslation } from '@newwork/nw-design-system'
import { useEffect, useRef } from 'react'
import { useFabric } from '../../context/FabricContext'
import { useReplayClock } from '../../hooks/useReplayClock'
import { useTraceModel } from '../../hooks/useTraceModel'
import { useTraceUrlParams } from '../../hooks/useTraceUrlParams'
import { ReplayTimeline } from '../agent-mesh/ReplayTimeline'
import { TraceTabs } from './TraceTabs'
import translations from '../../_i18n'

interface TraceExplorerScreenProps {
  onBack: () => void
  onOpenAgentMesh?: (positionMs: number) => void
}

const HEADER_SUBTITLE = 'Step-by-step timeline of agent execution, tool calls, and costs'

function statusBadgeVariant(status: string | undefined): 'default' | 'destructive' | 'outline' {
  if (status === 'completed') return 'default'
  if (status === 'failed') return 'destructive'
  return 'outline'
}

function statusLabel(status: string | undefined): string {
  if (!status) return 'Running'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

export const TraceExplorerScreen: React.FC<TraceExplorerScreenProps> = ({ onBack, onOpenAgentMesh }) => {
  const { t } = useTranslation(translations)
  const { session, events, isStreaming, activeSessionId } = useFabric()

  const { model, source } = useTraceModel({ liveEvents: events, session, isStreaming })
  const isLive = isStreaming === true && (source === 'live' || source === 'merged')

  const clock = useReplayClock({
    durationMs: model.summary.durationMs,
    isLive,
    initialSpeed: 1
  })

  const { t: urlTime } = useTraceUrlParams()
  const appliedUrlTimeRef = useRef(false)

  useEffect(() => {
    if (!appliedUrlTimeRef.current && urlTime !== null && model.summary.durationMs > 0) {
      appliedUrlTimeRef.current = true
      clock.seek(urlTime)
    }
  }, [urlTime, model.summary.durationMs, clock])

  const isEmpty = !activeSessionId && !session
  const isLoading = Boolean(activeSessionId) && !session
  const sessionTitle = session?.title?.trim() || session?.input?.trim() || 'Trace'

  const renderEmptyState = () => (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:text-center gba:px-6"
      data-testid="trace-explorer-empty"
    >
      <span className="gba:flex gba:h-14 gba:w-14 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:mb-4">
        <ListMagnifyingGlassIcon className="gba:h-6 gba:w-6 gba:text-muted-foreground" weight="duotone" />
      </span>
      <h2 className="gba:text-base gba:font-semibold gba:text-foreground gba:mb-1">No session selected</h2>
      <p className="gba:max-w-md gba:text-sm gba:text-muted-foreground gba:mb-5">
        Open or start an Every Fabric session to explore its trace — every event, decision and tool call laid out on a
        timeline you can scrub through.
      </p>
      <Button onClick={onBack} variant="secondary">
        Back to landing
      </Button>
    </div>
  )

  const renderLoadingState = () => (
    <div
      className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:flex-1 gba:gap-3"
      data-testid="trace-explorer-loading"
    >
      <SpinnerGapIcon className="gba:h-5 gba:w-5 gba:animate-spin gba:text-muted-foreground" />
      <p className="gba:text-sm gba:text-muted-foreground">Loading session trace…</p>
    </div>
  )

  return (
    <div
      className="gba:flex gba:h-full gba:w-full gba:flex-col gba:bg-background gba:p-4 sm:gba:p-5 lg:gba:p-6"
      data-testid="trace-explorer-screen"
    >
      <header className="gba:flex gba:items-start gba:gap-4 gba:mb-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to workspace"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-9 gba:w-9 gba:shrink-0 gba:rounded-full gba:border gba:border-border/60 gba:bg-background gba:text-foreground gba:hover:bg-muted/60 gba:transition-colors gba:mt-1"
          data-testid="trace-explorer-back"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <h1
              className="gba:text-[22px] gba:font-semibold gba:leading-tight gba:text-foreground gba:truncate"
              data-testid="trace-explorer-title"
            >
              Trace Explorer
            </h1>
            {!isEmpty && !isLoading && model.summary.terminalStatus && (
              <Badge
                variant={statusBadgeVariant(model.summary.terminalStatus)}
                data-testid="trace-explorer-status-badge"
              >
                {statusLabel(model.summary.terminalStatus)}
              </Badge>
            )}
          </div>
          <p className="gba:mt-0.5 gba:text-[13px] gba:text-muted-foreground gba:truncate">
            {!isEmpty && !isLoading ? sessionTitle : HEADER_SUBTITLE}
          </p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {!isEmpty && !isLoading && (
            <span
              className="gba:inline-flex gba:items-center gba:gap-2 gba:rounded-full gba:bg-muted gba:px-3 gba:py-1.5 gba:text-[12px] gba:font-medium gba:text-muted-foreground gba:tabular-nums"
              data-testid="trace-explorer-stats-pill"
            >
              {model.summary.eventCount} events · {model.summary.participantCount} participants
            </span>
          )}
          {!isEmpty && !isLoading && onOpenAgentMesh && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenAgentMesh(clock.positionMs)}
              data-testid="trace-open-agent-mesh"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5 gba:mr-1.5" />
              {t('trace-explorer-agent-mesh')}
            </Button>
          )}
        </div>
      </header>

      {isEmpty ? (
        renderEmptyState()
      ) : isLoading ? (
        renderLoadingState()
      ) : (
        <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:gap-4">
          <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:rounded-lg gba:border gba:border-border/40 gba:bg-card gba:overflow-hidden">
            <TraceTabs model={model} clock={clock} isLive={isLive} />
          </div>

          <ReplayTimeline clock={clock} frames={model.frames} />
        </div>
      )}
    </div>
  )
}
