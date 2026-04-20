import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Info,
  Play,
  Target,
  Users
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useTrendComparison } from '../../hooks/useFlowAnalytics'
import { useSystemTaskReliability } from '../../hooks/useSystemTaskReliability'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessSectionCardHeader,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { TrendsReliabilityCharts } from './trends/TrendsReliabilityCharts'
import { formatDetailedHoursDuration, formatPercent } from '../../utils/formatters'
import { getSuccessTimeframeOptions, type SuccessTimeframe } from '../../utils/timeframe'
import type { FlowSuccessDrilldownTarget } from '../../shellState'

interface TrendsTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

type TrendKey =
  | 'workflowsStarted'
  | 'workflowsCompleted'
  | 'completionRate'
  | 'avgCycleTime'
  | 'activeUsers'
  | 'avgTasksPerUser'

export const TrendsTab: React.FC<TrendsTabProps> = ({
  prefixDataTestId = 'trends-tab',
  accessToken,
  timeframe,
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const [internalTimeframe, setInternalTimeframe] = useState<SuccessTimeframe>('wtd')
  const activeTimeframe = timeframe ?? internalTimeframe
  const handleTimeframeChange = onTimeframeChange ?? setInternalTimeframe
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined

  const {
    data: trendData,
    isLoading,
    error,
    refetch
  } = useTrendComparison({
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    accessToken
  })
  const { data: systemReliability } = useSystemTaskReliability({
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    accessToken
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const timeframeOptions = getSuccessTimeframeOptions(t, { includeLast24h: true })
  const trendMetrics: Array<{
    key: TrendKey
    title: string
    value: string
    previous: string
    icon: React.ReactNode
    trend?: { change: number; percentage: number; direction: 'up' | 'down' | 'stable'; note?: string }
  }> = trendData
    ? [
        {
          key: 'workflowsStarted',
          title: t('trends-workflows-started'),
          value: String(trendData.current.workflowsStarted),
          previous: String(trendData.previous.workflowsStarted),
          icon: <Play className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.workflowsStarted
        },
        {
          key: 'workflowsCompleted',
          title: t('trends-workflows-completed'),
          value: String(trendData.current.workflowsCompleted),
          previous: String(trendData.previous.workflowsCompleted),
          icon: <CheckCircle2 className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.workflowsCompleted
        },
        {
          key: 'completionRate',
          title: t('trends-completion-rate'),
          value: formatPercent(trendData.current.completionRate),
          previous: formatPercent(trendData.previous.completionRate),
          icon: <Target className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.completionRate
        },
        {
          key: 'avgCycleTime',
          title: t('trends-avg-cycle-time'),
          value: formatDetailedHoursDuration(trendData.current.avgCycleTime),
          previous: formatDetailedHoursDuration(trendData.previous.avgCycleTime),
          icon: <Clock3 className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.avgCycleTime
        },
        {
          key: 'activeUsers',
          title: t('trends-active-users'),
          value: String(trendData.current.activeUsers),
          previous: String(trendData.previous.activeUsers),
          icon: <Users className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.activeUsers
        },
        {
          key: 'avgTasksPerUser',
          title: t('trends-avg-tasks-per-user'),
          value: trendData.current.avgTasksPerUser.toFixed(1),
          previous: trendData.previous.avgTasksPerUser.toFixed(1),
          icon: <Activity className="gba:h-5 gba:w-5" />,
          trend: trendData.trends.avgTasksPerUser
        }
      ]
    : []

  const renderTrendIcon = (key: TrendKey, direction?: 'up' | 'down' | 'stable') => {
    const isNegativeWhenUp = key === 'avgCycleTime'
    if (direction === 'up') {
      return (
        <ArrowUpRight className={`gba:h-4 gba:w-4 ${isNegativeWhenUp ? 'gba:text-destructive' : 'gba:text-success'}`} />
      )
    }
    if (direction === 'down') {
      return (
        <ArrowDownRight
          className={`gba:h-4 gba:w-4 ${isNegativeWhenUp ? 'gba:text-success' : 'gba:text-destructive'}`}
        />
      )
    }
    return <ArrowRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
  }

  if (error) {
    return (
      <SuccessErrorState
        title={t('state-error-title')}
        message={error.message}
        onRetry={refetch}
        retryLabel={t('action-retry')}
        data-testid={`${prefixDataTestId}-error`}
      />
    )
  }

  return (
    <SuccessTabPage
      title={t('analytics-subview-trends')}
      description={t('trends-description')}
      actions={
        showControls || headerActions ? (
          <>
            {showControls ? (
              <SuccessTimeframeSelect
                value={activeTimeframe}
                onChange={handleTimeframeChange}
                options={timeframeOptions}
                data-testid={`${prefixDataTestId}-timeframe-select`}
              />
            ) : null}
            {headerActions}
          </>
        ) : undefined
      }
      data-testid={prefixDataTestId}
    >
      {!trendData ? (
        <SuccessEmptyState
          title={t('state-empty')}
          description={t('trends-description')}
          icon={<Info className="gba:h-8 gba:w-8" />}
        />
      ) : (
        <>
          {trendData.metadata && !trendData.metadata.hasPreviousData ? (
            <Card className="gba:border-border gba:bg-card">
              <CardContent className="gba:flex gba:items-start gba:gap-3 gba:p-5">
                <Info className="gba:h-5 gba:w-5 gba:text-warning" />
                <div className="gba:flex gba:flex-col gba:gap-1">
                  <span className="gba:font-medium gba:text-foreground">{t('trends-no-comparison')}</span>
                  <span className="gba:text-sm gba:text-muted-foreground">{trendData.metadata.message}</span>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="gba:grid gba:grid-cols-1 gba:gap-4 gba:md:grid-cols-2 gba:xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="gba:border-border gba:bg-card">
                    <CardContent className="gba:p-5">
                      <div className="gba:h-20 gba:animate-pulse gba:rounded gba:bg-muted" />
                    </CardContent>
                  </Card>
                ))
              : trendMetrics.map(metric => (
                  <Card
                    key={metric.key}
                    className="gba:border-border gba:bg-card"
                    data-testid={`${prefixDataTestId}-${metric.key}`}
                  >
                    <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:p-5">
                      <div className="gba:flex gba:items-center gba:justify-between">
                        <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">{metric.title}</span>
                        <div className="gba:text-muted-foreground">{metric.icon}</div>
                      </div>
                      <div className="gba:flex gba:items-start gba:justify-between">
                        <div className="gba:flex gba:flex-col gba:gap-1">
                          <span className="gba:text-2xl gba:font-semibold gba:text-foreground">{metric.value}</span>
                          <span className="gba:text-sm gba:text-muted-foreground">
                            {t('trends-previous-period')}: {metric.previous}
                          </span>
                        </div>
                        <div className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:font-medium gba:text-foreground">
                          {renderTrendIcon(metric.key, metric.trend?.direction)}
                          <span>{metric.trend ? `${Math.abs(metric.trend.percentage).toFixed(1)}%` : '0.0%'}</span>
                        </div>
                      </div>
                      {metric.trend?.note ? (
                        <span className="gba:text-xs gba:text-muted-foreground">{metric.trend.note}</span>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
          </div>

          <Card className="gba:border-border gba:bg-card" id="trend-summary">
            <SuccessSectionCardHeader>
              <CardTitle>{t('trends-summary')}</CardTitle>
              <CardDescription>{t('trends-description')}</CardDescription>
            </SuccessSectionCardHeader>
            <CardContent className="gba:p-5">
              <div className="gba:overflow-x-auto">
                <table className="gba:w-full gba:border-collapse">
                  <thead>
                    <tr className="gba:border-b gba:border-border">
                      <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('label-scope')}</th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('trends-current-period')}
                      </th>
                      <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">
                        {t('trends-previous-period')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {trendMetrics.map(metric => (
                      <tr key={metric.key} className="gba:border-b gba:border-border/60">
                        <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">{metric.title}</td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{metric.value}</td>
                        <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{metric.previous}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card className="gba:border-border gba:bg-card" id="trend-reliability">
            <SuccessSectionCardHeader>
              <CardTitle>{t('system-reliability-trend-title')}</CardTitle>
              <CardDescription>{t('system-reliability-trend-description')}</CardDescription>
            </SuccessSectionCardHeader>
            <CardContent className="gba:p-5">
              <TrendsReliabilityCharts
                data={systemReliability?.timeSeries || []}
                emptyTitle={t('state-empty')}
                emptyDescription={t('system-reliability-trend-description')}
                successRateLabel={t('system-reliability-success-rate')}
                failuresLabel={t('system-reliability-failures')}
                timeoutsLabel={t('system-reliability-timeouts')}
                data-testid={`${prefixDataTestId}-reliability-charts`}
              />
            </CardContent>
          </Card>
        </>
      )}
    </SuccessTabPage>
  )
}
