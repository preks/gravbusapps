import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type {
  ExecutionRun,
  ExecutionTraceEvent,
  ExecutionRunStatus
} from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'

const toStatusVariant = (status: ExecutionRunStatus | string): 'success' | 'default' | 'destructive' | 'outline' => {
  if (status === 'success') return 'success'
  if (status === 'error') return 'destructive'
  if (status === 'running') return 'default'
  return 'outline'
}

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Render a summary line for a single trace event. */
const TraceEventSummary: React.FC<{
  evt: ExecutionTraceEvent
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ evt, t }) => {
  if (evt.eventType.startsWith('tool.call.')) {
    const tool = String((evt.data as any)?.tool_name || (evt.data as any)?.toolName || 'unknown')
    return <span>{t('monitoring-details-tool-event', { tool })}</span>
  }

  if (evt.eventType === 'llm.iteration') {
    const usage = (evt.data as any)?.usage
    const total = Number(usage?.total_tokens)
    if (!Number.isFinite(total)) return <span>{t('monitoring-details-event-preview')}</span>

    const prompt = Number(usage?.prompt_tokens)
    const completion = Number(usage?.completion_tokens)
    const modelRaw = String((evt.data as any)?.model || '')
    const toolCalls = Number((evt.data as any)?.tool_calls_count)
    return (
      <span data-testid={`prompt-manager-execution-trace-${evt.seq}-tokens`}>
        {t('monitoring-details-llm-tokens', {
          model: modelRaw ? ` ${modelRaw}` : '',
          total,
          prompt: Number.isFinite(prompt) ? prompt : 0,
          completion: Number.isFinite(completion) ? completion : 0,
          toolCalls: Number.isFinite(toolCalls) ? toolCalls : 0
        })}
      </span>
    )
  }

  return <span>{t('monitoring-details-event-preview')}</span>
}

/** Render the loaded run details content. */
const RunDetailsContent: React.FC<{
  run: ExecutionRun
  trace: ExecutionTraceEvent[]
  decisions: any[]
  showRaw: boolean
  setShowRaw: (fn: (v: boolean) => boolean) => void
  t: (key: string, vars?: Record<string, unknown>) => string
}> = ({ run, trace, decisions, showRaw, setShowRaw, t }) => (
  <div className="gba:space-y-4">
    <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Badge variant={toStatusVariant(run.status)} data-testid="prompt-manager-execution-details-status">
          {run.status}
        </Badge>
        {typeof run.durationMs === 'number' && (
          <Badge variant="outline" data-testid="prompt-manager-execution-details-duration">
            {t('monitoring-details-duration', { ms: run.durationMs })}
          </Badge>
        )}
        <Badge variant="outline" data-testid="prompt-manager-execution-details-tools">
          {t('monitoring-details-tools', { count: run.toolCallsCount ?? 0 })}
        </Badge>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowRaw(v => !v)}
        data-testid="prompt-manager-execution-details-toggle-raw"
      >
        {showRaw ? t('monitoring-details-hide-raw') : t('monitoring-details-show-raw')}
      </Button>
    </div>

    <div
      className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3"
      data-testid="prompt-manager-execution-details-meta"
    >
      <div className="gba:space-y-1">
        <div className="gba:text-xs gba:text-muted-foreground">{t('monitoring-details-prompt')}</div>
        <div className="gba:text-sm gba:font-medium">{run.promptName || run.promptId || '—'}</div>
      </div>
      <div className="gba:space-y-1">
        <div className="gba:text-xs gba:text-muted-foreground">{t('monitoring-details-started')}</div>
        <div className="gba:text-sm">{run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}</div>
      </div>
    </div>

    {decisions.length > 0 && (
      <div className="gba:space-y-2" data-testid="prompt-manager-execution-details-decisions">
        <div className="gba:text-sm gba:font-medium">{t('monitoring-details-decisions')}</div>
        <div className="gba:space-y-2">
          {decisions.map((d: any, idx: number) => (
            <div key={idx} className="gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-3">
              <div className="gba:text-xs gba:text-muted-foreground">{String(d.type || 'decision')}</div>
              <div className="gba:text-sm gba:mt-1">{formatJson(d)}</div>
            </div>
          ))}
        </div>
      </div>
    )}

    <Separator />

    <div className="gba:space-y-2" data-testid="prompt-manager-execution-details-trace">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <div className="gba:text-sm gba:font-medium">{t('monitoring-details-trace')}</div>
        <Badge variant="outline" data-testid="prompt-manager-execution-details-trace-count">
          {t('monitoring-details-trace-count', { count: trace.length })}
        </Badge>
      </div>

      {trace.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground">{t('monitoring-details-trace-empty')}</div>
      ) : (
        <div className="gba:space-y-2">
          {trace.slice(0, 50).map(evt => (
            <div
              key={`${evt.executionId}-${evt.seq}`}
              className="gba:rounded-md gba:border gba:border-border gba:bg-card gba:p-3"
              data-testid={`prompt-manager-execution-trace-${evt.seq}`}
            >
              <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
                <div className="gba:font-mono gba:text-xs">{evt.eventType}</div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {evt.ts ? new Date(evt.ts).toLocaleString() : ''}
                </div>
              </div>
              {showRaw ? (
                <pre className="gba:mt-2 gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto">
                  {formatJson(evt.data)}
                </pre>
              ) : (
                <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">
                  <TraceEventSummary evt={evt} t={t} />
                </div>
              )}
            </div>
          ))}
          {trace.length > 50 && (
            <div
              className="gba:text-xs gba:text-muted-foreground"
              data-testid="prompt-manager-execution-details-trace-truncated"
            >
              {t('monitoring-details-trace-truncated', { count: trace.length - 50 })}
            </div>
          )}
        </div>
      )}
    </div>

    {(run.errorMessage || run.errorType) && (
      <>
        <Separator />
        <div className="gba:space-y-1" data-testid="prompt-manager-execution-details-error-block">
          <div className="gba:text-sm gba:font-medium">{t('monitoring-details-error')}</div>
          <div className="gba:text-xs gba:text-muted-foreground">{run.errorType || ''}</div>
          <div className="gba:text-sm">{run.errorMessage || ''}</div>
        </div>
      </>
    )}
  </div>
)

export interface ExecutionRunDetailsDialogProps extends BusinessAppContextProps {
  open: boolean
  executionId: string | null
  onOpenChange: (open: boolean) => void
}

export const ExecutionRunDetailsDialog: React.FC<ExecutionRunDetailsDialogProps> = ({
  accessToken,
  open,
  executionId,
  onOpenChange
}) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [run, setRun] = useState<ExecutionRun | null>(null)
  const [trace, setTrace] = useState<ExecutionTraceEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  const load = useCallback(async () => {
    if (!executionId) return
    setIsLoading(true)
    setError(null)
    try {
      const r = await client.getExecutionRun(executionId)
      const tr = await client.getExecutionTrace(executionId, { limit: 100, offset: 0, returnTotalRecords: false })
      setRun(r)
      setTrace(tr.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [client, executionId])

  useEffect(() => {
    if (open) load().catch(() => undefined)
  }, [open, load])

  const decisions = useMemo(() => {
    const list = (run?.reasoningSummary as any)?.decisions
    return Array.isArray(list) ? list : []
  }, [run])

  const renderBody = () => {
    if (isLoading) {
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center gba:py-10"
          data-testid="prompt-manager-execution-details-loading"
        >
          <Spinner size="lg" />
        </div>
      )
    }
    if (error) {
      return (
        <div className="gba:space-y-3" data-testid="prompt-manager-execution-details-error">
          <div className="gba:text-sm gba:text-destructive">{error}</div>
          <Button variant="outline" onClick={load} data-testid="prompt-manager-execution-details-retry">
            {t('retry')}
          </Button>
        </div>
      )
    }
    if (!run) {
      return (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="prompt-manager-execution-details-empty">
          {t('monitoring-details-empty')}
        </div>
      )
    }
    return (
      <RunDetailsContent
        run={run}
        trace={trace}
        decisions={decisions}
        showRaw={showRaw}
        setShowRaw={setShowRaw}
        t={t}
      />
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-3xl" data-testid="prompt-manager-execution-details-dialog">
        <DialogHeader>
          <DialogTitle>{t('monitoring-details-title')}</DialogTitle>
          <DialogDescription>{executionId || ''}</DialogDescription>
        </DialogHeader>

        <div className="gba:overflow-y-auto gba:pr-1" style={{ maxHeight: 'calc(80vh - 10rem)' }}>
          {renderBody()}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="prompt-manager-execution-details-close"
          >
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
