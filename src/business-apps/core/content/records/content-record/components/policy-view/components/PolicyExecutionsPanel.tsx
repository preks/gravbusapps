import React, { useCallback, useEffect, useState } from 'react'
import { Alert, AlertDescription, AlertTitle, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import type { ExecutionRun } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import translations from '../../../_i18n'

interface PolicyExecutionsPanelProps {
  accessToken: string
  policyRootId: string
}

const toStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'success') return 'secondary'
  if (status === 'error') return 'destructive'
  if (status === 'running') return 'default'
  return 'outline'
}

export const PolicyExecutionsPanel: React.FC<PolicyExecutionsPanelProps> = ({ accessToken, policyRootId }) => {
  const { t } = useTranslation(translations)
  const client = usePromptManagerClient(accessToken)
  const [runs, setRuns] = useState<ExecutionRun[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await client.getExecutionRuns({
        policyRootId,
        limit: 10,
        offset: 0,
        returnTotalRecords: false
      })
      setRuns(res.data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setIsLoading(false)
    }
  }, [client, policyRootId])

  useEffect(() => {
    load().catch(() => undefined)
  }, [load])

  const openMonitoring = useCallback(() => {
    const url = buildPlatformUrl('/platform/create/prompt-manager', {
      pmTab: 'monitoring',
      policyRootId
    })
    navigateTo(url)
  }, [policyRootId])

  const openRun = useCallback(
    (executionId: string) => {
      const url = buildPlatformUrl('/platform/create/prompt-manager', {
        pmTab: 'monitoring',
        policyRootId,
        executionId
      })
      navigateTo(url)
    },
    [policyRootId]
  )

  if (isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:py-6" data-testid="policy-executions-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:space-y-3" data-testid="policy-executions-error">
        <Alert variant="destructive">
          <AlertTitle>{t('policy_executions_error_title')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          <Button variant="outline" onClick={load} data-testid="policy-executions-retry">
            {t('retry')}
          </Button>
          <Button variant="outline" onClick={openMonitoring} data-testid="policy-executions-open-monitoring">
            {t('policy_executions_open_monitoring')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:space-y-3" data-testid="policy-executions-panel">
      <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
        <Badge variant="outline" data-testid="policy-executions-count">
          {t('policy_executions_count', { count: runs.length })}
        </Badge>
        <Button variant="outline" onClick={openMonitoring} data-testid="policy-executions-open-monitoring">
          {t('policy_executions_open_monitoring')}
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="gba:text-sm gba:text-muted-foreground" data-testid="policy-executions-empty">
          {t('policy_executions_empty')}
        </div>
      ) : (
        <div className="gba:space-y-2" data-testid="policy-executions-list">
          {runs.map(r => (
            <button
              key={r.executionId}
              type="button"
              onClick={() => openRun(r.executionId)}
              className="gba:w-full gba:text-left gba:p-3 gba:rounded-md gba:border gba:border-border gba:bg-card gba:hover:bg-accent gba:transition-colors"
              data-testid={`policy-execution-row-${r.executionId}`}
            >
              <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-2">
                <div className="gba:min-w-0">
                  <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                    <Badge variant={toStatusVariant(String(r.status))}>{String(r.status)}</Badge>
                    <div className="gba:font-medium gba:text-foreground gba:truncate">
                      {r.promptName || r.promptId || t('policy_executions_unknown_expert')}
                    </div>
                  </div>
                  <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
                    {r.startedAt ? new Date(r.startedAt).toLocaleString() : '—'}
                    {typeof r.durationMs === 'number' ? ` • ${r.durationMs} ms` : ''}
                    {typeof r.toolCallsCount === 'number'
                      ? ` • ${t('policy_executions_tool_calls', { count: r.toolCallsCount })}`
                      : ''}
                  </div>
                </div>
                <Badge variant="outline" className="gba:shrink-0">
                  {t('policy_executions_open')}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default PolicyExecutionsPanel
