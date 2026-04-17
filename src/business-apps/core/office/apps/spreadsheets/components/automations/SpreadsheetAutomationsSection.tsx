import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Card, CardContent, Button, Input, Skeleton, useTranslation } from '@newwork/nw-design-system'
import { Zap, Search, RefreshCw, XCircle } from 'lucide-react'
import { getSpreadsheetServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/spreadsheetServiceUrl'
import translations from '../../_i18n'
import type { AutomationWithRuns, SpreadsheetAutomationsSectionProps } from './automationSectionTypes'
import { fetchAccessibleSpreadsheets, fetchAutomationsForApp, fetchRunsForAutomation } from './automationSectionUtils'
import { AutomationListItem } from './AutomationListItem'
import { AutomationDetailView } from './AutomationDetailView'

export type { AutomationRun, AutomationWithRuns, SpreadsheetAutomationsSectionProps } from './automationSectionTypes'

export const SpreadsheetAutomationsSection: React.FC<SpreadsheetAutomationsSectionProps> = ({
  accessToken,
  'data-testid': testId = 'spreadsheet-automations-section'
}) => {
  const { t } = useTranslation(translations)
  const [automations, setAutomations] = useState<AutomationWithRuns[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationWithRuns | null>(null)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())
  const [stoppingRuns, setStoppingRuns] = useState<Set<string>>(new Set())

  const docServiceUrl = getSpreadsheetServiceApiUrl().replace(/\/+$/, '')

  const fetchAutomations = useCallback(async () => {
    if (!accessToken) {
      setError(t('sa-error-no-token'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const spreadsheets = await fetchAccessibleSpreadsheets(docServiceUrl, accessToken)
      const automationsByApp = await Promise.all(
        spreadsheets.map(async app => {
          try {
            return await fetchAutomationsForApp(app, docServiceUrl, accessToken)
          } catch {
            return [] as AutomationWithRuns[]
          }
        })
      )

      const automationsWithRuns = await Promise.all(
        automationsByApp.flat().map(automation => fetchRunsForAutomation(automation, docServiceUrl, accessToken))
      )

      setAutomations(automationsWithRuns)
    } catch (err) {
      console.error('[SpreadsheetAutomationsSection] Error fetching automations:', err)
      setError(err instanceof Error ? err.message : t('sa-error-load'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, docServiceUrl, t])

  useEffect(() => {
    fetchAutomations()
  }, [fetchAutomations])

  const getLatestAutomationTimestamp = useCallback((automation: AutomationWithRuns): number => {
    const latestRun = automation.recentRuns?.[0]
    const candidates = [latestRun?.startedAt, latestRun?.createdAt, automation.updatedAt, automation.createdAt]
    const validTimestamps = candidates
      .map(value => (value ? new Date(value).getTime() : Number.NaN))
      .filter(value => Number.isFinite(value))

    if (validTimestamps.length === 0) return 0
    return Math.max(...validTimestamps)
  }, [])

  const filteredAutomations = useMemo(() => {
    let filtered = automations

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        a => a.name.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
      )
    }

    return [...filtered].sort((a, b) => getLatestAutomationTimestamp(b) - getLatestAutomationTimestamp(a))
  }, [automations, searchQuery, getLatestAutomationTimestamp])

  const handleRunAutomation = useCallback(
    async (automation: AutomationWithRuns) => {
      if (!accessToken) return

      setRunningAutomations(prev => new Set(prev).add(automation.id))

      try {
        const response = await fetch(`${docServiceUrl}/automations/${automation.id}/run`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipients: automation.collectionConfig?.recipients || [] })
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to run automation: ${response.statusText}`)
        }

        await fetchAutomations()
      } catch (err) {
        console.error('[SpreadsheetAutomationsSection] Error running automation:', err)
        setError(err instanceof Error ? err.message : t('sa-error-run'))
      } finally {
        setRunningAutomations(prev => {
          const next = new Set(prev)
          next.delete(automation.id)
          return next
        })
      }
    },
    [accessToken, docServiceUrl, fetchAutomations, t]
  )

  const handleViewAutomation = useCallback((automation: AutomationWithRuns) => {
    setSelectedAutomation(automation)
  }, [])

  const handleStopRun = useCallback(
    async (runId: string) => {
      if (!accessToken || !runId) return

      setStoppingRuns(prev => new Set(prev).add(runId))
      try {
        const response = await fetch(`${docServiceUrl}/automations/runs/${runId}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.message || `Failed to stop run: ${response.statusText}`)
        }

        await fetchAutomations()
      } catch (err) {
        console.error('[SpreadsheetAutomationsSection] Error stopping run:', err)
        setError(err instanceof Error ? err.message : t('sa-error-stop'))
      } finally {
        setStoppingRuns(prev => {
          const next = new Set(prev)
          next.delete(runId)
          return next
        })
      }
    },
    [accessToken, docServiceUrl, fetchAutomations, t]
  )

  const stats = useMemo(() => {
    const total = automations.length
    const byType: Record<string, number> = {}
    let totalRuns = 0
    let activeRuns = 0

    automations.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + 1
      a.recentRuns?.forEach(run => {
        totalRuns++
        if (run.status === 'RUNNING' || run.status === 'PENDING') {
          activeRuns++
        }
      })
    })

    return { total, byType, totalRuns, activeRuns }
  }, [automations])

  if (isLoading) {
    return (
      <div className="gba:flex gba:flex-col gba:gap-6 gba:p-6" data-testid={testId}>
        <Skeleton className="gba:h-8 gba:w-48" />
        <div className="gba:grid gba:grid-cols-4 gba:gap-3">
          <Skeleton className="gba:h-16 gba:rounded-lg" />
          <Skeleton className="gba:h-16 gba:rounded-lg" />
          <Skeleton className="gba:h-16 gba:rounded-lg" />
          <Skeleton className="gba:h-16 gba:rounded-lg" />
        </div>
        <Skeleton className="gba:h-10 gba:w-full gba:rounded-lg" />
        <div className="gba:space-y-3">
          <Skeleton className="gba:h-24 gba:w-full gba:rounded-lg" />
          <Skeleton className="gba:h-24 gba:w-full gba:rounded-lg" />
          <Skeleton className="gba:h-24 gba:w-3/4 gba:rounded-lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid={testId}>
        <Card className="gba:p-6 gba:text-center">
          <XCircle className="gba:w-12 gba:h-12 gba:text-destructive gba:mx-auto gba:mb-4" />
          <p className="gba:text-destructive">{error}</p>
          <Button variant="outline" className="gba:mt-4" onClick={fetchAutomations}>
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('sa-retry')}
          </Button>
        </Card>
      </div>
    )
  }

  if (selectedAutomation) {
    return (
      <AutomationDetailView
        automation={selectedAutomation}
        accessToken={accessToken}
        onBack={() => setSelectedAutomation(null)}
        onRunAgain={() => handleRunAutomation(selectedAutomation)}
        isRunning={runningAutomations.has(selectedAutomation.id)}
        t={t}
        data-testid={`${testId}-detail`}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <div className="gba:border-b gba:bg-card gba:px-6 gba:py-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h2 className="gba:text-lg gba:font-semibold gba:text-foreground gba:flex gba:items-center gba:gap-2">
              <Zap className="gba:w-5 gba:h-5 gba:text-primary" />
              {t('automations-hub-title')}
            </h2>
            <p className="gba:text-sm gba:text-muted-foreground">{t('automations-hub-subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchAutomations}>
            <RefreshCw className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('sa-refresh')}
          </Button>
        </div>

        <div className="gba:grid gba:grid-cols-4 gba:gap-3">
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">{t('automations-hub-total')}</div>
                <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.total}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:text-xs gba:text-muted-foreground gba:mb-2">{t('sa-stat-collection-breakdown')}</div>
              <div className="gba:flex gba:flex-col gba:gap-2">
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground">{t('sa-stat-form-collections')}</span>
                  <span className="gba:text-base gba:font-bold gba:text-foreground">
                    {stats.byType['bulk_collection'] || 0}
                  </span>
                </div>
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className="gba:text-xs gba:text-muted-foreground">{t('sa-stat-template-collections')}</span>
                  <span className="gba:text-base gba:font-bold gba:text-primary">
                    {stats.byType['excel_collection'] || 0}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">{t('sa-stat-total-runs')}</div>
                <div className="gba:text-lg gba:font-bold gba:text-foreground">{stats.totalRuns}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="gba:p-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <div className="gba:text-xs gba:text-muted-foreground">{t('automations-hub-active')}</div>
                <div className="gba:text-lg gba:font-bold gba:text-info">{stats.activeRuns}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="gba:px-6 gba:py-3 gba:border-b gba:flex gba:items-center gba:gap-4">
        <div className="gba:relative gba:flex-1 gba:max-w-sm">
          <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
          <Input
            placeholder={t('automations-hub-search-placeholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:pl-10"
          />
        </div>
      </div>

      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {filteredAutomations.length === 0 ? (
          <Card className="gba:border-dashed">
            <CardContent className="gba:py-16 gba:text-center">
              <Zap className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-4" />
              <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:mb-2">
                {automations.length === 0 ? t('automations-hub-empty-title') : t('automations-hub-empty-filtered')}
              </h3>
              <p className="gba:text-muted-foreground">
                {automations.length === 0 ? t('automations-hub-empty-hint') : t('automations-hub-empty-search-hint')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="gba:space-y-3">
            {filteredAutomations.map(automation => (
              <AutomationListItem
                key={automation.id}
                automation={automation}
                onView={() => handleViewAutomation(automation)}
                onRun={() => handleRunAutomation(automation)}
                onStopRun={runId => handleStopRun(runId)}
                isRunning={runningAutomations.has(automation.id)}
                isStoppingRun={Boolean(automation.recentRuns?.[0]?.id && stoppingRuns.has(automation.recentRuns[0].id))}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SpreadsheetAutomationsSection
