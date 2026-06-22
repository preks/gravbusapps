// Header for the full-screen run detail: a back affordance, the run identity +
// live status, and a compact fact grid answering who ran it, what triggered it,
// which case it touched, when it started, how long it took, and what it cost.

import {
  ArrowLeftIcon,
  ClockIcon,
  CoinsIcon,
  IdentificationBadgeIcon,
  MagnifyingGlassIcon,
  SpinnerGapIcon,
  TimerIcon
} from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import React from 'react'
import { FeatureHub } from 'featurehub-javascript-client-sdk'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'
import { Feature } from '@/common/types/constants/FeatureHub'
import { useAgentSettings } from '../../../hooks/useAgentSettings'
import { isEveryFabricDevToolsEnabled } from '../../../utils/devToolsGate'
import { LiveStatusPill } from '../LiveStatusPill'
import { formatTimestamp, runCredits, runDurationLabel, statusVisualForRun } from '../runDisplay'
import { sourceVisual } from '../workforceSourceDisplay'
import type { WorkforceRun, WorkforceRunTraceEvent } from '../workforceTypes'
import { RunContextLinks } from './RunContextLinks'
import { resolveSource, resolveTriggerName } from './runDetailFacts'
import translations from '../../../_i18n'

export interface RunDetailHeaderProps {
  run: WorkforceRun
  agentName: string
  accessToken: string
  trace: readonly WorkforceRunTraceEvent[]
  isStreaming: boolean
  isConnected: boolean
  isRefreshing: boolean
  // A completed run whose triggered flow is paused on a human approval; shows an
  // "Awaiting approval" pill instead of the raw "Completed" status.
  awaitingFlowApproval?: boolean
  onBack: () => void
}

interface FactProps {
  icon: Icon
  label: string
  value: string
}

/** Read the dev-tools flag without requiring a FeatureHub context (test envs). */
function readDevToolsFeatureFlag(): boolean | undefined {
  try {
    return FeatureHub.feature<boolean>(Feature.EveryFabric.DevTools.Key).value
  } catch {
    return undefined
  }
}

/** Dev-gated jump into TraceLens preselecting this run (`traceRunId` deep link). */
function openRunInTraceLens(sessionId: string): void {
  if (globalThis.history === undefined || globalThis.location === undefined) return
  const next = getCurrentUrlWithUpdatedSearchParams({
    view: 'trace-lens',
    traceRunId: sessionId,
    agentId: null,
    tab: null,
    runId: null
  })
  if (!next) return
  globalThis.history.pushState({ ...(globalThis.history.state ?? {}) }, '', next)
  globalThis.dispatchEvent(new PopStateEvent('popstate', { state: globalThis.history.state }))
}

const Fact: React.FC<FactProps> = ({ icon: IconComponent, label, value }) => (
  <div className="gba:flex gba:items-start gba:gap-2">
    <IconComponent className="gba:mt-0.5 gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:min-w-0">
      <p className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
        {label}
      </p>
      <p className="gba:truncate gba:text-xs gba:font-medium gba:text-foreground" title={value}>
        {value}
      </p>
    </div>
  </div>
)

export const RunDetailHeader: React.FC<RunDetailHeaderProps> = ({
  run,
  agentName,
  accessToken,
  trace,
  isStreaming,
  isConnected,
  isRefreshing,
  awaitingFlowApproval,
  onBack
}) => {
  const { t } = useTranslation(translations)
  const { devModeEnabled: localDevModeEnabled } = useAgentSettings()
  const devModeEnabled = isEveryFabricDevToolsEnabled(readDevToolsFeatureFlag()) && localDevModeEnabled

  const visual = statusVisualForRun({
    status: run.status,
    pending_flow_approval: awaitingFlowApproval || run.pending_flow_approval
  })
  const source = resolveSource(run)
  const sourceInfo = sourceVisual(source)
  const sourceLabel = t(sourceInfo.labelKey)
  const SourceIcon = sourceInfo.icon
  const triggerName = resolveTriggerName(run)
  const triggerValue = triggerName ? `${sourceLabel} · ${triggerName}` : sourceLabel
  const duration = runDurationLabel(run)
  const credits = runCredits(run)

  return (
    <header className="gba:shrink-0 gba:border-b gba:border-border gba:bg-card gba:px-6 gba:py-4">
      <div className="gba:mx-auto gba:max-w-5xl">
        <div className="gba:flex gba:items-center gba:gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('run-detail-back')}
            className="gba:inline-flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
            data-testid="run-detail-back"
          >
            <ArrowLeftIcon className="gba:h-4 gba:w-4" />
          </button>
          <span
            className={`gba:inline-flex gba:items-center gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium ${visual.pillClass}`}
            data-testid="run-detail-status"
          >
            {visual.label}
          </span>
          <h1
            className="gba:truncate gba:text-base gba:font-semibold gba:text-foreground"
            data-testid="run-detail-title"
          >
            {agentName}
          </h1>
          {isStreaming && <LiveStatusPill connected={isConnected} />}
          {isRefreshing && !isStreaming && (
            <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:text-muted-foreground">
              <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
              {t('run-detail-refreshing')}
            </span>
          )}
          <span className="gba:ml-auto gba:font-mono gba:text-[11px] gba:text-muted-foreground">
            {run.session_id.slice(0, 8)}
          </span>
          {devModeEnabled && (
            <button
              type="button"
              onClick={() => openRunInTraceLens(run.session_id)}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:border gba:border-border/60 gba:px-2 gba:py-1 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
              data-testid="run-detail-open-trace-lens"
            >
              <MagnifyingGlassIcon className="gba:h-3 gba:w-3" />
              TraceLens
            </button>
          )}
        </div>

        <div className="gba:mt-4 gba:grid gba:grid-cols-2 gba:gap-3 gba:sm:grid-cols-3 gba:lg:grid-cols-5">
          <Fact icon={IdentificationBadgeIcon} label={t('run-detail-fact-agent')} value={agentName} />
          <Fact icon={SourceIcon} label={t('run-detail-fact-trigger')} value={triggerValue} />
          <Fact
            icon={ClockIcon}
            label={t('run-detail-fact-started')}
            value={formatTimestamp(run.started_at ?? run.created_at)}
          />
          <Fact icon={TimerIcon} label={t('run-detail-fact-duration')} value={duration ?? '—'} />
          <Fact icon={CoinsIcon} label={t('run-detail-fact-credits')} value={`${credits}`} />
        </div>

        <RunContextLinks run={run} accessToken={accessToken} trace={trace} />
      </div>
    </header>
  )
}
