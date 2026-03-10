import React, { useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import { Activity, CalendarClock, CheckCircle2, Clock3, Target, TrendingUp, Workflow } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowDetailView } from '@/common/components/flow'
import { formatDisplayText } from '@/common/utils/displayText'
import translations from '../../_i18n'
import { useAuditLogs } from '../../hooks/useAuditData'
import { useFlowAnalytics, useFlowsList } from '../../hooks/useFlowAnalytics'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessKpiGrid,
  SuccessStatusBadge,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { formatDateTime, formatEnumLabel, formatHoursDuration, formatPercent } from '../../utils/formatters'
import {
  DEFAULT_SUCCESS_TIMEFRAME,
  getSuccessTimeframeDateRange,
  getSuccessTimeframeOptions,
  type SuccessTimeframe
} from '../../utils/timeframe'

interface OverviewTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const STATUS_OPTIONS = ['RUNNING', 'COMPLETED', 'TIMED_OUT', 'FAILED'] as const

export const OverviewTab: React.FC<OverviewTabProps> = ({
  prefixDataTestId = 'flow-success-overview',
  accessToken
}) => {
  const { t } = useTranslation(translations)
  const [timeframe, setTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)
  const [flowsSearch, setFlowsSearch] = useState('')
  const [flowsStatus, setFlowsStatus] = useState<string>('ALL')
  const [flowsPage, setFlowsPage] = useState(0)
  const flowsPageSize = 8
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)
  const timeframeRange = useMemo(() => getSuccessTimeframeDateRange(timeframe), [timeframe])
  const recentActivityFilters = useMemo(
    () => ({
      limit: 6,
      offset: 0,
      startDate: timeframeRange.startDate,
      endDate: timeframeRange.endDate
    }),
    [timeframeRange.endDate, timeframeRange.startDate]
  )

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useFlowAnalytics({
    timeframe,
    includeBusinessMetrics: true,
    includeOperationalMetrics: false,
    accessToken
  })

  const {
    data: flowsList,
    isLoading: flowsLoading,
    error: flowsError
  } = useFlowsList({
    search: flowsSearch,
    status: flowsStatus === 'ALL' ? undefined : flowsStatus,
    startDate: timeframeRange.startDate,
    endDate: timeframeRange.endDate,
    limit: flowsPageSize,
    offset: flowsPage * flowsPageSize,
    orderBy: 'updated_time',
    orderDirection: 'DESC',
    accessToken
  })

  const {
    data: auditData,
    isLoading: auditLoading,
    error: auditError
  } = useAuditLogs(recentActivityFilters, accessToken)

  useEffect(() => {
    setFlowsPage(0)
  }, [flowsSearch, flowsStatus])

  const timeframeOptions = useMemo(() => getSuccessTimeframeOptions(t), [t])
  const recentFlows = useMemo(() => {
    const flows = flowsList?.flows ?? []
    return [...flows].sort((a, b) => {
      const aTime = new Date(a.lastActivityTime || a.updateTime || a.startTime || 0).getTime()
      const bTime = new Date(b.lastActivityTime || b.updateTime || b.startTime || 0).getTime()
      return bTime - aTime
    })
  }, [flowsList?.flows])
  const auditEntries = useMemo(() => {
    const entries = auditData?.entries ?? []
    return [...entries].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  }, [auditData?.entries])

  if (selectedFlowId) {
    return (
      <FlowDetailView
        flowId={selectedFlowId}
        onBack={() => setSelectedFlowId(null)}
        showBackButton
        accessToken={accessToken}
      />
    )
  }

  const businessKpis = analytics?.businessKpis
  const kpiItems = [
    {
      id: 'total-workflows',
      label: t('overview-total-workflows'),
      value: String(businessKpis?.totalWorkflows ?? 0),
      description: t('overview-total-workflows-description'),
      icon: <Target className="gba:h-5 gba:w-5" />
    },
    {
      id: 'completion-rate',
      label: t('overview-completion-rate'),
      value: formatPercent(businessKpis?.completionRate),
      description: t('overview-completion-rate-description'),
      icon: <TrendingUp className="gba:h-5 gba:w-5" />
    },
    {
      id: 'avg-cycle-time',
      label: t('overview-avg-cycle-time'),
      value: formatHoursDuration(businessKpis?.avgCycleTime),
      description: t('overview-avg-cycle-time-description'),
      icon: <Clock3 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'sla-adherence',
      label: t('overview-sla-adherence'),
      value: formatPercent(businessKpis?.slaAdherence),
      description: t('overview-sla-adherence-description'),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />
    }
  ]

  return (
    <SuccessTabPage
      title={t('overview-title')}
      description={t('overview-description')}
      actions={
        <SuccessTimeframeSelect
          value={timeframe}
          onChange={setTimeframe}
          options={timeframeOptions}
          data-testid={`${prefixDataTestId}-timeframe-select`}
        />
      }
      data-testid={prefixDataTestId}
    >
      {analyticsError && !analytics ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={analyticsError.message}
          onRetry={refetchAnalytics}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-analytics-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={kpiItems}
          isLoading={analyticsLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('overview-description')}
          data-testid={`${prefixDataTestId}-kpis`}
        />
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-[1.8fr_1fr]">
        <Card className="gba:border-border gba:bg-card">
          <CardHeader className="gba:border-b gba:border-border">
            <CardTitle>{t('overview-recent-flows')}</CardTitle>
            <CardDescription>{t('overview-recent-flows-description')}</CardDescription>
            <div className="gba:flex gba:flex-col gba:gap-3 gba:pt-2 gba:md:flex-row">
              <Input
                value={flowsSearch}
                onChange={event => setFlowsSearch(event.target.value)}
                placeholder={t('placeholder-search-flows')}
                data-testid={`${prefixDataTestId}-flows-search`}
              />
              <Select value={flowsStatus} onValueChange={setFlowsStatus}>
                <SelectTrigger className="gba:w-full gba:md:w-52" data-testid={`${prefixDataTestId}-status-select`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('filter-all-statuses')}</SelectItem>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option} value={option}>
                      {formatEnumLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:p-5">
            {flowsLoading ? (
              <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
                {t('state-loading')}
              </div>
            ) : flowsError ? (
              <SuccessErrorState
                title={t('state-error-title')}
                message={flowsError.message}
                data-testid={`${prefixDataTestId}-flows-error`}
              />
            ) : !recentFlows.length ? (
              <SuccessEmptyState
                title={t('overview-no-flows')}
                description={t('overview-recent-flows-description')}
                icon={<Workflow className="gba:h-8 gba:w-8" />}
                data-testid={`${prefixDataTestId}-flows-empty`}
              />
            ) : (
              <>
                <div className="gba:flex gba:flex-col gba:gap-3">
                  {recentFlows.map((flow, index) => {
                    const activityTimestamp = flow.lastActivityTime || flow.updateTime || flow.startTime
                    return (
                      <button
                        key={flow.flowId}
                        type="button"
                        className="gba:flex gba:w-full gba:flex-col gba:gap-3 gba:rounded-xl gba:border gba:border-border gba:bg-background gba:p-4 gba:text-left gba:transition-colors gba:hover:bg-muted/50"
                        onClick={() => setSelectedFlowId(flow.flowId)}
                        data-testid={`${prefixDataTestId}-flow-${index}`}
                      >
                        <div className="gba:flex gba:flex-col gba:gap-3 gba:md:flex-row gba:md:items-start gba:md:justify-between">
                          <div className="gba:flex gba:flex-col gba:gap-2">
                            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                              <span className="gba:font-medium gba:text-foreground">
                                {flow.flowName || `Flow ${flow.flowId.slice(-8)}`}
                              </span>
                              <SuccessStatusBadge status={flow.status} />
                            </div>
                            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                              <span className="gba:flex gba:items-center gba:gap-1">
                                <CalendarClock className="gba:h-4 gba:w-4" />
                                {flow.lastActivityTime ? t('overview-last-activity') : t('overview-started')}:{' '}
                                {formatDateTime(activityTimestamp)}
                              </span>
                              <span>{flow.progressPercentage || 0}%</span>
                              <span>
                                {flow.stepStatus?.completed || 0}/{flow.stepStatus?.total || 0}
                              </span>
                            </div>
                          </div>
                          <span className="gba:text-xs gba:text-muted-foreground">{flow.flowId.slice(-8)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {flowsList.totalCount > flowsPageSize ? (
                  <div className="gba:flex gba:flex-col gba:gap-3 gba:border-t gba:border-border gba:pt-4 gba:md:flex-row gba:md:items-center gba:md:justify-between">
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {t('overview-page')} {flowsPage + 1} {t('overview-of')}{' '}
                      {Math.ceil(flowsList.totalCount / flowsPageSize)}
                    </span>
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFlowsPage(Math.max(0, flowsPage - 1))}
                        disabled={flowsPage === 0}
                      >
                        {t('action-back')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFlowsPage(flowsPage + 1)}
                        disabled={!flowsList.hasMore}
                      >
                        {t('action-refresh')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="gba:border-border gba:bg-card">
          <CardHeader className="gba:border-b gba:border-border">
            <CardTitle>{t('overview-recent-activity')}</CardTitle>
            <CardDescription>{t('overview-recent-activity-description')}</CardDescription>
          </CardHeader>
          <CardContent className="gba:flex gba:flex-col gba:gap-4 gba:p-5" aria-busy={auditLoading}>
            {auditLoading && !auditEntries.length ? (
              <div className="gba:flex gba:min-h-56 gba:items-center gba:justify-center gba:text-sm gba:text-muted-foreground">
                {t('state-loading')}
              </div>
            ) : auditError && !auditEntries.length ? (
              <SuccessErrorState
                title={t('state-error-title')}
                message={auditError.message}
                data-testid={`${prefixDataTestId}-activity-error`}
              />
            ) : !auditEntries.length ? (
              <SuccessEmptyState
                title={t('state-no-activity')}
                description={t('overview-recent-activity-description')}
                icon={<Activity className="gba:h-8 gba:w-8" />}
                data-testid={`${prefixDataTestId}-activity-empty`}
              />
            ) : (
              auditEntries.map(entry => (
                <div
                  key={entry.id}
                  className="gba:flex gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:p-4"
                >
                  <div className="gba:flex gba:h-10 gba:w-10 gba:flex-shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted">
                    <Activity className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                  </div>
                  <div className="gba:flex gba:min-w-0 gba:flex-1 gba:flex-col gba:gap-1">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground">
                      {formatDisplayText(entry.flowName, entry.flowId)}
                    </span>
                    <span className="gba:text-sm gba:text-muted-foreground">
                      {formatEnumLabel(entry.action)}
                      {entry.taskName ? ` · ${formatDisplayText(entry.taskName, entry.action)}` : ''}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground">{formatDateTime(entry.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </SuccessTabPage>
  )
}
