// Phase A: Trace tab inside the Workforce Agent detail screen.
//
// Full-page view for a single run's grouped trace. When no run is
// selected (no `runId` in the URL), the tab shows a hint plus a list
// of the most recent runs so the operator can pick one without leaving
// the tab. When a run is selected, the trigger payload (if any) is
// pinned to the top so an inbound-email run reads in context with the
// original message.

import { ArrowsClockwiseIcon, EnvelopeIcon, GraphIcon, ListBulletsIcon, SpinnerGapIcon } from '@phosphor-icons/react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import { GroupedTraceTimeline } from '../trace/GroupedTraceTimeline'
import { WorkforceRunMesh } from '../mesh/WorkforceRunMesh'
import { LiveStatusPill } from '../../LiveStatusPill'
import { useWorkforceAgentRuns } from '../../useWorkforceAgentRuns'
import { useWorkforceRunStream } from '../../useWorkforceRunStream'
import type { WorkforceRun } from '../../workforceTypes'
import { formatTimestamp, runCredits, runStatusVisual, shortenInput } from '../../runDisplay'
import translations from '../../../../_i18n'

type TraceView = 'timeline' | 'mesh'

interface AgentTraceTabContentProps {
  accessToken: string
  run: WorkforceRun
  onReload: () => void
}

export interface AgentTraceTabProps {
  accessToken: string
  agentId: string
  runId: string | null
  onSelectRun: (runId: string | null) => void
}

interface TriggerPayloadHeaderProps {
  run: WorkforceRun
}

function readPayloadField(run: WorkforceRun, field: string): string {
  const payload = run.trigger_payload
  if (payload && typeof payload === 'object') {
    const value = (payload as Record<string, unknown>)[field]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

const TriggerPayloadHeader: React.FC<TriggerPayloadHeaderProps> = ({ run }) => {
  const { t } = useTranslation(translations)
  if (run.source !== 'inbound_email' || !run.trigger_payload) return null
  const from = readPayloadField(run, 'from')
  const subject = readPayloadField(run, 'subject')
  const body = readPayloadField(run, 'body')
  return (
    <section
      className="gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-4"
      data-testid="workforce-trace-trigger-payload"
    >
      <header className="gba:mb-2 gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
        <EnvelopeIcon className="gba:h-3.5 gba:w-3.5" />
        {t('trace-inbound-email-header', { time: formatTimestamp(run.created_at) })}
      </header>
      <p className="gba:text-xs gba:text-muted-foreground">
        {t('trace-from')} <span className="gba:text-foreground">{from || '—'}</span>
      </p>
      <p className="gba:mt-0.5 gba:text-sm gba:font-semibold gba:text-foreground">{subject || t('trace-no-subject')}</p>
      {body && (
        <pre className="gba:mt-2 gba:max-h-48 gba:overflow-auto gba:whitespace-pre-wrap gba:rounded gba:bg-muted/40 gba:p-2 gba:text-[11px] gba:text-foreground/85">
          {body}
        </pre>
      )}
    </section>
  )
}

interface RunPickerProps {
  accessToken: string
  agentId: string
  onSelectRun: (runId: string) => void
}

const RunPicker: React.FC<RunPickerProps> = ({ accessToken, agentId, onSelectRun }) => {
  const { t } = useTranslation(translations)
  const { runs, isLoading } = useWorkforceAgentRuns({
    accessToken,
    agentId,
    params: { limit: 20 }
  })

  if (isLoading && runs.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
        <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
        {t('trace-loading-runs')}
      </div>
    )
  }

  if (runs.length === 0) {
    return <p className="gba:text-xs gba:text-muted-foreground">{t('trace-no-runs-hint')}</p>
  }

  return (
    <ul className="gba:divide-y gba:divide-border/60">
      {runs.map(run => {
        const visual = runStatusVisual(run.status)
        return (
          <li key={run.session_id}>
            <button
              type="button"
              onClick={() => onSelectRun(run.session_id)}
              className="gba:flex gba:w-full gba:items-center gba:gap-3 gba:px-2 gba:py-2 gba:text-left gba:hover:bg-muted/40"
              data-testid="workforce-trace-pick-run"
            >
              <span
                className={`gba:inline-flex gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium ${visual.pillClass}`}
              >
                {visual.label}
              </span>
              <span className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-xs gba:text-foreground">
                {shortenInput(run.input)}
              </span>
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatTimestamp(run.created_at)} · {t('trace-picker-credits', { credits: runCredits(run) })}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// Streams the selected run's trace live (a run is a deep-agent session, so we
// reuse the shared SSE registry). When the run finishes streaming we reload the
// authoritative REST run once to pull final output / cost / crm actions.
const VIEW_TABS: Array<{ key: TraceView; labelKey: string; icon: typeof ListBulletsIcon; testId: string }> = [
  { key: 'timeline', labelKey: 'trace-view-timeline', icon: ListBulletsIcon, testId: 'workforce-trace-view-timeline' },
  { key: 'mesh', labelKey: 'trace-view-mesh', icon: GraphIcon, testId: 'workforce-trace-view-mesh' }
]

const AgentTraceTabContent: React.FC<AgentTraceTabContentProps> = ({ accessToken, run, onReload }) => {
  const { t } = useTranslation(translations)
  const { trace, isStreaming, isConnected } = useWorkforceRunStream(run, accessToken)
  const wasStreamingRef = useRef(isStreaming)
  const [view, setView] = useState<TraceView>('timeline')

  useEffect(() => {
    if (wasStreamingRef.current && !isStreaming) {
      onReload()
    }
    wasStreamingRef.current = isStreaming
  }, [isStreaming, onReload])

  return (
    <div className="gba:flex gba:flex-col gba:gap-2">
      <div className="gba:flex gba:items-center gba:gap-2">
        <div className="gba:inline-flex gba:rounded-md gba:border gba:border-border gba:bg-background gba:p-0.5">
          {VIEW_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setView(tab.key)}
              className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded gba:px-2.5 gba:py-1 gba:text-xs gba:font-medium gba:transition-colors ${
                view === tab.key
                  ? 'gba:bg-muted gba:text-foreground'
                  : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={tab.testId}
              aria-pressed={view === tab.key}
            >
              <tab.icon className="gba:h-3.5 gba:w-3.5" />
              {t(tab.labelKey)}
            </button>
          ))}
        </div>
        {isStreaming && (
          <div className="gba:flex gba:items-center gba:gap-2" data-testid="workforce-trace-live">
            <LiveStatusPill connected={isConnected} />
            <span className="gba:text-[11px] gba:text-muted-foreground">{t('trace-streaming-live')}</span>
          </div>
        )}
      </div>
      {view === 'timeline' ? (
        <GroupedTraceTimeline trace={trace} />
      ) : (
        <WorkforceRunMesh trace={trace} isStreaming={isStreaming} isConnected={isConnected} />
      )}
    </div>
  )
}

export const AgentTraceTab: React.FC<AgentTraceTabProps> = ({ accessToken, agentId, runId, onSelectRun }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [run, setRun] = useState<WorkforceRun | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!runId) {
      setRun(null)
      setError(null)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    client
      .getWorkforceRun(runId)
      .then(fresh => {
        if (!cancelled) setRun(fresh)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : t('trace-load-fail'))
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [client, runId, t])

  const reload = useMemo(
    () => () => {
      if (!runId) return
      client
        .getWorkforceRun(runId)
        .then(fresh => setRun(fresh))
        .catch(err => setError(err instanceof Error ? err.message : t('trace-load-fail')))
    },
    [client, runId, t]
  )

  if (!runId) {
    return (
      <section
        className="gba:flex gba:flex-col gba:gap-3 gba:rounded-2xl gba:border gba:border-border/60 gba:bg-card gba:p-5"
        data-testid="workforce-trace-tab-empty"
      >
        <header>
          <h2 className="gba:text-sm gba:font-semibold gba:text-foreground">{t('trace-title')}</h2>
          <p className="gba:mt-0.5 gba:text-xs gba:text-muted-foreground">{t('trace-desc')}</p>
        </header>
        <RunPicker accessToken={accessToken} agentId={agentId} onSelectRun={onSelectRun} />
      </section>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-4" data-testid="workforce-trace-tab">
      <div className="gba:flex gba:items-center gba:justify-between">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <button
            type="button"
            onClick={() => onSelectRun(null)}
            className="gba:underline-offset-2 gba:hover:underline"
            data-testid="workforce-trace-clear-run"
          >
            {t('trace-back-to-list')}
          </button>
          {run && <span>·</span>}
          {run && <span>{run.session_id}</span>}
        </div>
        <button
          type="button"
          onClick={reload}
          className="gba:inline-flex gba:h-8 gba:items-center gba:gap-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:px-2.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
          data-testid="workforce-trace-reload"
        >
          <ArrowsClockwiseIcon className="gba:h-3.5 gba:w-3.5" />
          {t('trace-reload')}
        </button>
      </div>

      {isLoading && !run && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          <SpinnerGapIcon className="gba:h-4 gba:w-4 gba:animate-spin" />
          {t('trace-loading-run')}
        </div>
      )}

      {error && (
        <div
          className="gba:rounded-lg gba:border gba:border-destructive/30 gba:bg-destructive/5 gba:px-3 gba:py-2 gba:text-xs gba:text-destructive"
          data-testid="workforce-trace-error"
        >
          {error}
        </div>
      )}

      {run && <TriggerPayloadHeader run={run} />}

      {run && <AgentTraceTabContent accessToken={accessToken} run={run} onReload={reload} />}
    </div>
  )
}
