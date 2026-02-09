import React, { useMemo, useState } from 'react'
import { Badge, Button, Separator, useTranslation } from '@newwork/nw-design-system'
import type { ExecutionTraceEvent } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'
import { PromptResolvedDetail, LlmIterationDetail, ToolCallDetail } from './TraceEventDetails'

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

const TRACE_EVENT_I18N_KEYS: Record<string, string> = {
  'execution.started': 'trace-event-execution-started',
  'execution.finished': 'trace-event-execution-finished',
  'execution.error': 'trace-event-execution-error',
  'prompt.resolved': 'trace-event-prompt-resolved',
  'llm.iteration': 'trace-event-llm-iteration',
  'llm.final': 'trace-event-llm-final',
  'llm.event': 'trace-event-llm-event',
  'tool.call.started': 'trace-event-tool-call-started',
  'tool.call.finished': 'trace-event-tool-call-finished',
  'tool.call.error': 'trace-event-tool-call-error',
  'tools.load.started': 'trace-event-tools-load-started',
  'tools.load.finished': 'trace-event-tools-load-finished',
  'knowledge.load.started': 'trace-event-knowledge-load-started',
  'knowledge.load.finished': 'trace-event-knowledge-load-finished'
}

const eventTypeBadgeVariant = (eventType: string): 'default' | 'outline' | 'destructive' | 'success' => {
  if (eventType.includes('error')) return 'destructive'
  if (eventType === 'llm.iteration' || eventType === 'llm.event') return 'default'
  if (eventType === 'llm.final') return 'success'
  if (eventType === 'prompt.resolved') return 'success'
  if (eventType === 'execution.finished') return 'success'
  if (eventType.startsWith('tool.call.')) return 'outline'
  return 'outline'
}

interface TraceEventCardProps {
  evt: ExecutionTraceEvent
  isExpanded: boolean
  onToggle: () => void
}

const TraceEventCard: React.FC<TraceEventCardProps> = ({ evt, isExpanded, onToggle }) => {
  const { t } = useTranslation(translations)
  const data = evt.data as Record<string, any>

  const summary = useMemo(() => {
    if (evt.eventType === 'llm.iteration') {
      const usage = data?.usage
      const model = data?.model || ''
      const total = Number(usage?.total_tokens)
      const prompt = Number(usage?.prompt_tokens)
      const completion = Number(usage?.completion_tokens)
      const toolCalls = Number(data?.tool_calls_count ?? 0)
      if (Number.isFinite(total)) {
        return `${model ? model + ' - ' : ''}${total} tokens (${prompt}p + ${completion}c) - ${toolCalls} tool calls`
      }
      return model || t('monitoring-details-event-preview')
    }
    if (evt.eventType === 'prompt.resolved') {
      const hasSystem = !!data?.system_prompt_preview
      const hasUser = !!data?.user_prompt_preview
      return `${hasSystem ? 'System + ' : ''}${hasUser ? 'User prompt' : 'No user prompt'} resolved`
    }
    if (evt.eventType.startsWith('tool.call.')) {
      return `Tool: ${data?.tool_name || data?.toolName || 'unknown'}`
    }
    if (evt.eventType === 'execution.started') {
      return data?.prompt_name || data?.promptName || data?.prompt_id || ''
    }
    if (evt.eventType.includes('.load.finished')) {
      // duration_ms is already shown as the elapsed badge, don't duplicate it
      return ''
    }
    return ''
  }, [evt, data, t])

  const elapsed = useMemo(() => {
    const ms = data?.duration_ms
    if (ms != null && Number.isFinite(Number(ms))) return `${ms} ms`
    return null
  }, [data])

  return (
    <div
      className="gba:rounded-md gba:border gba:border-border gba:bg-card"
      data-testid={`execution-trace-event-${evt.seq}`}
    >
      <button
        type="button"
        className="gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-2 gba:p-3 gba:text-left"
        onClick={onToggle}
        data-testid={`execution-trace-event-${evt.seq}-toggle`}
      >
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Badge variant={eventTypeBadgeVariant(evt.eventType)} className="gba:text-[10px]">
            {TRACE_EVENT_I18N_KEYS[evt.eventType] ? t(TRACE_EVENT_I18N_KEYS[evt.eventType]) : evt.eventType}
          </Badge>
          <span className="gba:text-xs gba:text-muted-foreground">{summary}</span>
          {elapsed && (
            <Badge variant="outline" className="gba:text-[10px]">
              {elapsed}
            </Badge>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-[10px] gba:text-muted-foreground">
            {evt.ts ? new Date(evt.ts).toLocaleTimeString() : ''}
          </span>
          <span className="gba:text-xs gba:text-muted-foreground">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="gba:border-t gba:border-border gba:p-3 gba:space-y-3">
          {evt.eventType === 'prompt.resolved' ? (
            <>
              <PromptResolvedDetail data={data} />
              <Separator />
              <details>
                <summary className="gba:text-xs gba:text-muted-foreground gba:cursor-pointer">
                  {t('monitoring-detail-raw-json')}
                </summary>
                <pre className="gba:mt-2 gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
                  {formatJson(data)}
                </pre>
              </details>
            </>
          ) : evt.eventType === 'llm.iteration' ? (
            <>
              <LlmIterationDetail data={data} />
              <Separator />
              <details>
                <summary className="gba:text-xs gba:text-muted-foreground gba:cursor-pointer">
                  {t('monitoring-detail-raw-json')}
                </summary>
                <pre className="gba:mt-2 gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
                  {formatJson(data)}
                </pre>
              </details>
            </>
          ) : evt.eventType.startsWith('tool.call.') ? (
            <>
              <ToolCallDetail data={data} eventType={evt.eventType} />
              <Separator />
              <details>
                <summary className="gba:text-xs gba:text-muted-foreground gba:cursor-pointer">
                  {t('monitoring-detail-raw-json')}
                </summary>
                <pre className="gba:mt-2 gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
                  {formatJson(data)}
                </pre>
              </details>
            </>
          ) : (
            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-64 gba:overflow-auto gba:bg-muted gba:rounded-md gba:p-2">
              {formatJson(data)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export interface ExecutionTraceTimelineProps {
  trace: ExecutionTraceEvent[]
}

export const ExecutionTraceTimeline: React.FC<ExecutionTraceTimelineProps> = ({ trace }) => {
  const { t } = useTranslation(translations)
  const [expandedSet, setExpandedSet] = useState<Set<number>>(new Set())
  const [showAll, setShowAll] = useState(false)

  const displayed = showAll ? trace : trace.slice(0, 50)

  const toggle = (seq: number) => {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(seq)) next.delete(seq)
      else next.add(seq)
      return next
    })
  }

  const expandAll = () => setExpandedSet(new Set(trace.map(e => e.seq)))
  const collapseAll = () => setExpandedSet(new Set())

  return (
    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card" data-testid="execution-detail-trace">
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <div className="gba:text-sm gba:font-medium">{t('monitoring-details-trace')}</div>
          <Badge variant="outline">{t('monitoring-details-trace-count', { count: trace.length })}</Badge>
        </div>
        <div className="gba:flex gba:gap-1">
          <Button variant="outline" size="sm" onClick={expandAll} data-testid="execution-detail-trace-expand-all">
            {t('monitoring-detail-expand-all')}
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll} data-testid="execution-detail-trace-collapse-all">
            {t('monitoring-detail-collapse-all')}
          </Button>
        </div>
      </div>

      <div className="gba:p-4">
        {trace.length === 0 ? (
          <div className="gba:text-sm gba:text-muted-foreground">{t('monitoring-details-trace-empty')}</div>
        ) : (
          <div className="gba:space-y-2">
            {displayed.map(evt => (
              <TraceEventCard
                key={`${evt.executionId}-${evt.seq}`}
                evt={evt}
                isExpanded={expandedSet.has(evt.seq)}
                onToggle={() => toggle(evt.seq)}
              />
            ))}
            {!showAll && trace.length > 50 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(true)}
                data-testid="execution-detail-trace-show-all"
              >
                {t('monitoring-details-trace-truncated', { count: trace.length - 50 })}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ExecutionTraceTimeline
