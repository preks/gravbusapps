import React, { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, Button, Badge, Skeleton, Spinner } from '@newwork/nw-design-system'
import { Play, History, ChevronRight, RefreshCw } from 'lucide-react'
import { DOCUMENT_API_URL } from '@/common/utils/serviceResolver'
import type { AutomationRun, AutomationWithRuns, TranslateFn } from './automationSectionTypes'
import {
  extractArray,
  getAutomationTypeIcon,
  getAutomationTypeLabel,
  formatRelativeTime,
  getStatusBadgeVariant,
  getStatusIcon
} from './automationSectionUtils'
import { RunDetailPanel } from './RunDetailPanel'

interface AutomationDetailViewProps {
  automation: AutomationWithRuns
  accessToken: string
  onBack: () => void
  onRunAgain: () => void
  isRunning: boolean
  t: TranslateFn
  'data-testid'?: string
}

export const AutomationDetailView: React.FC<AutomationDetailViewProps> = ({
  automation,
  accessToken,
  onBack,
  onRunAgain,
  isRunning,
  t,
  'data-testid': testId
}) => {
  const [runs, setRuns] = useState<AutomationRun[]>(automation.recentRuns || [])
  const [isLoadingRuns, setIsLoadingRuns] = useState(false)
  const [selectedRun, setSelectedRun] = useState<AutomationRun | null>(null)

  const docServiceUrl = DOCUMENT_API_URL.replace(/\/+$/, '')
  const Icon = getAutomationTypeIcon(automation.type)

  const fetchRuns = useCallback(async () => {
    if (!accessToken) return

    setIsLoadingRuns(true)
    try {
      const response = await fetch(`${docServiceUrl}/automations/${automation.id}/runs?limit=50`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        const data = await response.json()
        setRuns(extractArray<AutomationRun>(data))
      }
    } catch (err) {
      console.error('[AutomationDetailView] Error fetching runs:', err)
    } finally {
      setIsLoadingRuns(false)
    }
  }, [accessToken, docServiceUrl, automation.id])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  useEffect(() => {
    if (runs.length === 0) {
      setSelectedRun(null)
      return
    }
    setSelectedRun(prev => {
      if (!prev) return runs[0]
      return runs.find(run => run.id === prev.id) || runs[0]
    })
  }, [runs])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ChevronRight className="gba:w-4 gba:h-4 gba:rotate-180 gba:mr-1" />
            {t('sa-back')}
          </Button>
        </div>

        <div className="gba:flex gba:items-start gba:justify-between">
          <div className="gba:flex gba:items-start gba:gap-4">
            <div className="gba:w-12 gba:h-12 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <Icon className="gba:w-6 gba:h-6 gba:text-primary" />
            </div>
            <div>
              <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{automation.name}</h2>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {getAutomationTypeLabel(automation.type, t)}
                {automation.spreadsheetAppName && ` \u2022 ${automation.spreadsheetAppName}`}
              </p>
              {automation.description && (
                <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">{automation.description}</p>
              )}
            </div>
          </div>

          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={fetchRuns}>
              <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('sa-refresh')}
            </Button>
            {automation.trigger === 'manual' && automation.type === 'excel_collection' && (
              <Button size="sm" onClick={onRunAgain} disabled={!automation.isEnabled || isRunning}>
                {isRunning ? <Spinner size="sm" className="gba:mr-2" /> : <Play className="gba:w-4 gba:h-4 gba:mr-2" />}
                {t('sa-run-again')}
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <History className="gba:w-4 gba:h-4" />
          {t('sa-run-history')}
        </h3>

        {isLoadingRuns ? (
          <div className="gba:space-y-3 gba:py-4">
            <Skeleton className="gba:h-20 gba:w-full gba:rounded-lg" />
            <Skeleton className="gba:h-20 gba:w-full gba:rounded-lg" />
            <Skeleton className="gba:h-20 gba:w-3/4 gba:rounded-lg" />
          </div>
        ) : runs.length === 0 ? (
          <Card className="gba:border-dashed">
            <CardContent className="gba:py-12 gba:text-center">
              <History className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <h4 className="gba:font-semibold gba:text-foreground gba:mb-2">{t('sa-no-runs')}</h4>
              <p className="gba:text-muted-foreground">{t('sa-no-runs-hint')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gba:gap-4">
            <div className="gba:space-y-3">
              {runs.map(run => {
                const StatusIcon = getStatusIcon(run.status)
                const progress = run.recipientCount > 0 ? (run.completedCount / run.recipientCount) * 100 : 0
                const isSelected = selectedRun?.id === run.id

                return (
                  <Card
                    key={run.id}
                    className={`gba:transition-colors gba:cursor-pointer ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedRun(run)}
                  >
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
                        <div className="gba:flex gba:items-center gba:gap-3">
                          <StatusIcon
                            className={`gba:w-5 gba:h-5 ${
                              run.status === 'COMPLETED'
                                ? 'gba:text-success'
                                : run.status === 'FAILED' || run.status === 'CANCELLED'
                                  ? 'gba:text-destructive'
                                  : run.status === 'RUNNING'
                                    ? 'gba:text-info gba:animate-spin'
                                    : 'gba:text-muted-foreground'
                            }`}
                          />
                          <div>
                            <div className="gba:flex gba:items-center gba:gap-2">
                              <span className="gba:font-medium gba:text-foreground">
                                {formatRelativeTime(run.startedAt, t)}
                              </span>
                              <Badge variant={getStatusBadgeVariant(run.status)} className="gba:text-xs">
                                {run.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                              {run.completedCount} / {run.recipientCount} {t('sa-status-completed').toLowerCase()}
                              {run.message && ` \u2022 ${run.message}`}
                            </p>
                          </div>
                        </div>

                        <div className="gba:flex gba:items-center gba:gap-4">
                          <div className="gba:w-32">
                            <div className="gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
                              <div
                                className={`gba:h-full gba:rounded-full ${
                                  run.status === 'COMPLETED'
                                    ? 'gba:bg-success'
                                    : run.status === 'FAILED'
                                      ? 'gba:bg-destructive'
                                      : 'gba:bg-primary'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                          <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <RunDetailPanel run={selectedRun} accessToken={accessToken} t={t} data-testid={`${testId}-run-detail`} />
          </div>
        )}
      </div>
    </div>
  )
}
