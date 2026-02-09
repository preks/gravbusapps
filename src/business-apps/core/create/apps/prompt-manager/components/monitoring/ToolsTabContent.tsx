import React, { useMemo } from 'react'
import { Badge, Separator, useTranslation } from '@newwork/nw-design-system'
import type { ExecutionRun, ExecutionTraceEvent } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import translations from '../../_i18n'

const formatJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export interface ToolsTabContentProps {
  run: ExecutionRun
  toolTraceEvents: ExecutionTraceEvent[]
}

export const ToolsTabContent: React.FC<ToolsTabContentProps> = ({ run, toolTraceEvents }) => {
  const { t } = useTranslation(translations)
  const toolCount = run.toolCallsCount ?? 0
  const toolsUsed = run.toolsUsed ?? []

  // Group trace events into pairs (started + finished/error) by tool_call_id
  const toolCalls = useMemo(() => {
    const map = new Map<string, { started?: ExecutionTraceEvent; finished?: ExecutionTraceEvent }>()
    const orphans: ExecutionTraceEvent[] = []
    for (const evt of toolTraceEvents) {
      const callId = (evt.data as any)?.tool_call_id
      if (!callId) {
        orphans.push(evt)
        continue
      }
      const entry = map.get(callId) ?? {}
      if (evt.eventType === 'tool.call.started') entry.started = evt
      else entry.finished = evt
      map.set(callId, entry)
    }
    const paired = Array.from(map.values())
    return { paired, orphans }
  }, [toolTraceEvents])

  if (toolCount === 0 && toolTraceEvents.length === 0) {
    return <div className="gba:text-xs gba:text-muted-foreground">{t('monitoring-detail-no-tools')}</div>
  }

  return (
    <div className="gba:space-y-4">
      {/* Summary row */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
        <Badge variant="outline">{t('monitoring-details-tools', { count: toolCount })}</Badge>
        {toolsUsed.map(tool => (
          <Badge key={tool} variant="secondary" className="gba:text-[10px]">
            {tool}
          </Badge>
        ))}
      </div>

      {/* Individual tool calls */}
      {toolCalls.paired.length > 0 && (
        <div className="gba:space-y-3">
          {toolCalls.paired.map((pair, idx) => (
            <ToolCallCard key={(pair.started?.data as any)?.tool_call_id || idx} pair={pair} idx={idx} />
          ))}
        </div>
      )}

      {/* Orphan events (no matching pair) */}
      {toolCalls.orphans.length > 0 && (
        <div className="gba:space-y-2">
          <Separator />
          {toolCalls.orphans.map((evt, idx) => (
            <div key={idx} className="gba:rounded-md gba:bg-muted gba:p-3">
              <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase">{evt.eventType}</div>
              <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:mt-1">
                {formatJson(evt.data)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

interface ToolCallCardProps {
  pair: { started?: ExecutionTraceEvent; finished?: ExecutionTraceEvent }
  idx: number
}

const ToolCallCard: React.FC<ToolCallCardProps> = ({ pair, idx }) => {
  const { t } = useTranslation(translations)
  const startData = (pair.started?.data ?? {}) as Record<string, any>
  const finishData = (pair.finished?.data ?? {}) as Record<string, any>
  const toolName = startData.tool_name || finishData.tool_name || 'unknown'
  const toolCode = startData.tool_code || finishData.tool_code
  const durationMs = finishData.duration_ms
  const isError = pair.finished?.eventType === 'tool.call.error'

  return (
    <div className="gba:rounded-md gba:border gba:border-border" data-testid={`execution-detail-tool-call-${idx}`}>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:border-b gba:border-border">
        <Badge variant={isError ? 'destructive' : 'outline'} className="gba:text-[10px]">
          {isError ? 'error' : 'success'}
        </Badge>
        <span className="gba:text-xs gba:font-medium">{toolName}</span>
        {toolCode && toolCode !== toolName && (
          <span className="gba:text-[10px] gba:text-muted-foreground gba:font-mono">{toolCode}</span>
        )}
        {durationMs != null && (
          <Badge variant="outline" className="gba:text-[10px] gba:ml-auto">
            {durationMs} ms
          </Badge>
        )}
      </div>
      <div className="gba:p-3 gba:space-y-2">
        {startData.arguments && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
              {t('monitoring-detail-arguments')}
            </div>
            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-2">
              {formatJson(startData.arguments)}
            </pre>
          </div>
        )}
        {finishData.result_preview && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
              {t('monitoring-detail-result')}
            </div>
            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-40 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-2">
              {finishData.result_preview}
            </pre>
          </div>
        )}
        {isError && (finishData.error_message || finishData.error_type) && (
          <div>
            <div className="gba:text-[10px] gba:text-destructive gba:uppercase gba:tracking-wide gba:mb-1">
              {t('monitoring-details-error')}
            </div>
            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:rounded-md gba:bg-muted gba:p-2">
              {finishData.error_message || finishData.error_type || '—'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default ToolsTabContent
