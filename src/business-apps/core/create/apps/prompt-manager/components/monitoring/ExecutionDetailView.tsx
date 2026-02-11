import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
import { ExecutionTraceTimeline } from './ExecutionTraceTimeline'
import { ToolsTabContent } from './ToolsTabContent'

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

export interface ExecutionDetailViewProps extends BusinessAppContextProps {
  executionId: string
  onBack: () => void
}

export const ExecutionDetailView: React.FC<ExecutionDetailViewProps> = ({ accessToken, executionId, onBack }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [run, setRun] = useState<ExecutionRun | null>(null)
  const [trace, setTrace] = useState<ExecutionTraceEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!executionId) return
    setIsLoading(true)
    setError(null)
    try {
      const r = await client.getExecutionRun(executionId)
      const tr = await client.getExecutionTrace(executionId, { limit: 100, offset: 0, returnTotalRecords: true })
      setRun(r)
      setTrace(tr.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [client, executionId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const promptResolved = useMemo(() => trace.find(e => e.eventType === 'prompt.resolved'), [trace])

  const toolTraceEvents = useMemo(() => trace.filter(e => e.eventType.startsWith('tool.call.')), [trace])

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-16" data-testid="execution-detail-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-3 gba:py-8" data-testid="execution-detail-error">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="execution-detail-back">
          {t('monitoring-detail-back')}
        </Button>
        <div className="gba:text-sm gba:text-destructive">{error}</div>
        <Button variant="outline" onClick={load} data-testid="execution-detail-retry">
          {t('retry')}
        </Button>
      </div>
    )
  }

  if (!run) {
    return (
      <div className="gba:space-y-3 gba:py-8" data-testid="execution-detail-empty">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="execution-detail-back">
          {t('monitoring-detail-back')}
        </Button>
        <div className="gba:text-sm gba:text-muted-foreground">{t('monitoring-details-empty')}</div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-4" data-testid="execution-detail-view">
      {/* Header */}
      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3" data-testid="execution-detail-header">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="execution-detail-back">
          {t('monitoring-detail-back')}
        </Button>
        <div className="gba:text-lg gba:font-semibold">{t('monitoring-details-title')}</div>
        <Badge variant={toStatusVariant(run.status)} data-testid="execution-detail-status">
          {run.status}
        </Badge>
        {typeof run.durationMs === 'number' && (
          <Badge variant="outline" data-testid="execution-detail-duration">
            {t('monitoring-details-duration', { ms: run.durationMs })}
          </Badge>
        )}
        <Badge variant="outline" data-testid="execution-detail-tool-calls">
          {t('monitoring-details-tools', { count: run.toolCallsCount ?? 0 })}
        </Badge>
        {run.totalTokens != null && run.totalTokens > 0 && (
          <Badge variant="outline" data-testid="execution-detail-tokens">
            {t('monitoring-detail-total-token-summary', {
              total: run.totalTokens,
              prompt: run.promptTokens ?? 0,
              completion: run.completionTokens ?? 0,
              requests: run.llmRequests ?? 0
            })}
          </Badge>
        )}
        {run.tags &&
          run.tags.length > 0 &&
          run.tags.map(tag => (
            <Badge
              key={tag}
              variant={tag === 'execution:test' ? 'info' : 'secondary'}
              className="gba:text-[10px]"
              data-testid="execution-detail-tag"
            >
              {tag === 'execution:test' ? t('tag-execution-test') : tag}
            </Badge>
          ))}
        <div className="gba:ml-auto">
          <Button variant="outline" size="sm" onClick={load} data-testid="execution-detail-refresh">
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-12 gba:gap-4">
        {/* Left column */}
        <div className="gba:lg:col-span-7 gba:space-y-4">
          <MetadataSection run={run} />
          {(run.errorMessage || run.errorType) && <ErrorSection run={run} />}
          <InputOutputToolsTabs
            promptData={promptResolved?.data ?? null}
            output={run.finalOutputPreview}
            run={run}
            toolTraceEvents={toolTraceEvents}
          />
        </div>

        {/* Right column */}
        <div className="gba:lg:col-span-5">
          <ExecutionTraceTimeline trace={trace} />
        </div>
      </div>
    </div>
  )
}

/* ── Sub-sections ── */

const MetaItem: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wide">{label}</div>
    <div className={`gba:text-sm ${mono ? 'gba:font-mono gba:text-xs' : ''}`}>{value}</div>
  </div>
)

const SectionCard: React.FC<{ testId?: string; header: React.ReactNode; children: React.ReactNode }> = ({
  testId,
  header,
  children
}) => (
  <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card" data-testid={testId}>
    <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border">{header}</div>
    <div className="gba:p-4">{children}</div>
  </div>
)

const MetadataSection: React.FC<{ run: ExecutionRun }> = ({ run }) => {
  const { t } = useTranslation(translations)
  return (
    <SectionCard
      testId="execution-detail-meta"
      header={<div className="gba:text-sm gba:font-medium">{t('monitoring-detail-section-metadata')}</div>}
    >
      <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-3 gba:gap-x-6 gba:gap-y-3">
        <MetaItem label={t('monitoring-detail-execution-id')} value={run.executionId} mono />
        <MetaItem label={t('monitoring-details-prompt')} value={run.promptName || run.promptId || '—'} />
        <MetaItem
          label={t('monitoring-detail-version')}
          value={run.promptVersion != null ? String(run.promptVersion) : '—'}
        />
        <MetaItem label={t('monitoring-detail-ai-service')} value={run.aiService || '—'} />
        <MetaItem label={t('monitoring-detail-ai-model')} value={run.aiModel || '—'} />
        <MetaItem
          label={t('monitoring-details-started')}
          value={run.startedAt ? new Date(run.startedAt).toLocaleString() : '—'}
        />
        <MetaItem
          label={t('monitoring-detail-finished')}
          value={run.finishedAt ? new Date(run.finishedAt).toLocaleString() : '—'}
        />
        {run.policyRootIds && run.policyRootIds.length > 0 && (
          <div>
            <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              {t('monitoring-column-policies')}
            </div>
            <div className="gba:flex gba:flex-wrap gba:gap-1 gba:mt-1">
              {run.policyRootIds.map(id => (
                <Badge key={id} variant="outline" className="gba:text-[10px]">
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

const ErrorSection: React.FC<{ run: ExecutionRun }> = ({ run }) => {
  const { t } = useTranslation(translations)
  return (
    <div
      className="gba:rounded-lg gba:border gba:border-destructive gba:bg-destructive-secondary gba:p-4 gba:space-y-1"
      data-testid="execution-detail-error-block"
    >
      <div className="gba:text-sm gba:font-medium gba:text-destructive-secondary-foreground">
        {t('monitoring-details-error')}
      </div>
      {run.errorType && <div className="gba:text-xs gba:text-destructive-secondary-foreground">{run.errorType}</div>}
      {run.errorMessage && (
        <div className="gba:text-sm gba:text-destructive-secondary-foreground">{run.errorMessage}</div>
      )}
    </div>
  )
}

const PromptBlock: React.FC<{ label: string; content: string; maxH?: string }> = ({ label, content, maxH }) => (
  <div>
    <div className="gba:text-[10px] gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">{label}</div>
    <pre
      className={`gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-3 ${maxH || 'gba:max-h-96'}`}
    >
      {content}
    </pre>
  </div>
)

interface InputOutputToolsTabsProps {
  promptData: Record<string, any> | null
  output?: string | null
  run: ExecutionRun
  toolTraceEvents: ExecutionTraceEvent[]
}

const InputOutputToolsTabs: React.FC<InputOutputToolsTabsProps> = ({ promptData, output, run, toolTraceEvents }) => {
  const { t } = useTranslation(translations)
  const toolCount = run.toolCallsCount ?? 0
  return (
    <div className="gba:rounded-lg gba:border gba:border-border gba:bg-card" data-testid="execution-detail-tabs">
      <Tabs defaultValue="input">
        <div className="gba:px-4 gba:pt-3 gba:border-b gba:border-border">
          <TabsList>
            <TabsTrigger value="input" data-testid="execution-detail-tab-input">
              {t('monitoring-detail-tab-input')}
            </TabsTrigger>
            <TabsTrigger value="output" data-testid="execution-detail-tab-output">
              {t('monitoring-detail-tab-output')}
            </TabsTrigger>
            <TabsTrigger value="tools" data-testid="execution-detail-tab-tools">
              {t('monitoring-detail-tab-tools')}
              {toolCount > 0 ? ` (${toolCount})` : ''}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="gba:p-4">
          <TabsContent value="input">
            {!promptData ? (
              <div className="gba:text-xs gba:text-muted-foreground">{t('monitoring-detail-prompt-not-recorded')}</div>
            ) : (
              <div className="gba:space-y-4">
                {promptData.system_params && Object.keys(promptData.system_params).length > 0 && (
                  <PromptBlock
                    label={t('monitoring-detail-system-params')}
                    content={formatJson(promptData.system_params)}
                    maxH="gba:max-h-40"
                  />
                )}
                {promptData.user_params && Object.keys(promptData.user_params).length > 0 && (
                  <PromptBlock
                    label={t('monitoring-detail-user-params')}
                    content={formatJson(promptData.user_params)}
                    maxH="gba:max-h-40"
                  />
                )}
                {promptData.system_prompt_preview && (
                  <PromptBlock
                    label={t('monitoring-detail-system-prompt')}
                    content={promptData.system_prompt_preview}
                  />
                )}
                {promptData.user_prompt_preview && (
                  <PromptBlock label={t('monitoring-detail-user-prompt')} content={promptData.user_prompt_preview} />
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="output">
            {!output ? (
              <div className="gba:text-xs gba:text-muted-foreground">{t('monitoring-detail-no-output')}</div>
            ) : (
              <pre className="gba:text-xs gba:whitespace-pre-wrap gba:break-words gba:max-h-96 gba:overflow-auto gba:rounded-md gba:bg-muted gba:p-3">
                {output}
              </pre>
            )}
          </TabsContent>

          <TabsContent value="tools">
            <ToolsTabContent run={run} toolTraceEvents={toolTraceEvents} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}

export default ExecutionDetailView
