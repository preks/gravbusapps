import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, TrendingDown, XCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useFlowManagementAnalytics } from '../../hooks/useFlowAnalytics'
import { SuccessEmptyState, SuccessErrorState, SuccessKpiGrid, SuccessTabPage, SuccessTimeframeSelect } from '../shared'
import { formatHoursDuration, formatPercent } from '../../utils/formatters'
import { DEFAULT_SUCCESS_TIMEFRAME, getSuccessTimeframeOptions, type SuccessTimeframe } from '../../utils/timeframe'

interface SLATabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SLATab: React.FC<SLATabProps> = ({ prefixDataTestId = 'sla-tab', accessToken }) => {
  const { t } = useTranslation(translations)
  const [timeframe, setTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken
  })

  const statusMetrics = analytics?.statusMetrics
  const slaKillers = analytics?.slaKillers || []
  const timeframeOptions = useMemo(() => getSuccessTimeframeOptions(t), [t])
  const kpiItems = [
    {
      id: 'overdue-tasks',
      label: t('sla-overdue-tasks'),
      value: String(statusMetrics?.overdue_tasks ?? 0),
      description: t('sla-overdue-tasks-description'),
      icon: <AlertTriangle className="gba:h-5 gba:w-5" />
    },
    {
      id: 'overdue-rate',
      label: t('sla-overdue-rate'),
      value: formatPercent(statusMetrics?.overdue_percentage),
      description: t('sla-overdue-rate-description'),
      icon: <TrendingDown className="gba:h-5 gba:w-5" />
    },
    {
      id: 'sla-violations',
      label: t('sla-violations'),
      value: String(slaKillers.reduce((sum, killer) => sum + killer.sla_violations, 0)),
      description: t('sla-violations-description'),
      icon: <XCircle className="gba:h-5 gba:w-5" />
    },
    {
      id: 'critical-flows',
      label: t('sla-critical-flows'),
      value: String(
        new Set(slaKillers.filter(killer => killer.violation_rate > 20).map(killer => killer.flow_name)).size
      ),
      description: t('sla-critical-flows-description'),
      icon: <AlertCircle className="gba:h-5 gba:w-5" />
    }
  ]

  return (
    <SuccessTabPage
      title={t('sla-title')}
      description={t('sla-description')}
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
      {error ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={error instanceof Error ? error.message : t('state-error-title')}
          onRetry={refetch}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={kpiItems}
          isLoading={isLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('sla-description')}
          data-testid={`${prefixDataTestId}-kpis`}
        />
      )}

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{t('sla-immediate-action')}</CardTitle>
          <CardDescription>{t('sla-immediate-action-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:p-5">
          {(statusMetrics?.overdue_tasks || 0) === 0 ? (
            <SuccessEmptyState
              title={t('sla-no-overdue-title')}
              description={t('sla-no-overdue-description')}
              icon={<CheckCircle2 className="gba:h-8 gba:w-8" />}
            />
          ) : (
            <div className="gba:flex gba:flex-col gba:gap-3 gba:rounded-xl gba:border gba:border-destructive-secondary gba:bg-destructive-secondary/40 gba:p-5">
              <div className="gba:flex gba:items-center gba:gap-3">
                <AlertTriangle className="gba:h-5 gba:w-5 gba:text-destructive" />
                <span className="gba:text-base gba:font-medium gba:text-foreground">
                  {statusMetrics?.overdue_tasks} {t('sla-overdue-tasks')}
                </span>
              </div>
              <div className="gba:grid gba:grid-cols-1 gba:gap-3 gba:text-sm gba:text-muted-foreground gba:md:grid-cols-3">
                <span>
                  {formatPercent(statusMetrics?.overdue_percentage)} {t('sla-overdue-rate')}
                </span>
                <span>
                  {statusMetrics?.pending_tasks || 0} {t('tasks-pending')}
                </span>
                <span>
                  {statusMetrics?.completed_tasks || 0} {t('tasks-completed-tasks')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="gba:border-border gba:bg-card">
        <CardHeader className="gba:border-b gba:border-border">
          <CardTitle>{t('sla-critical-steps')}</CardTitle>
          <CardDescription>{t('sla-critical-steps-description')}</CardDescription>
        </CardHeader>
        <CardContent className="gba:p-5">
          {!slaKillers.length ? (
            <SuccessEmptyState
              title={t('state-empty')}
              description={t('sla-critical-steps-description')}
              icon={<Clock3 className="gba:h-8 gba:w-8" />}
            />
          ) : (
            <div className="gba:overflow-x-auto">
              <table className="gba:w-full gba:border-collapse">
                <thead>
                  <tr className="gba:border-b gba:border-border">
                    <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('sla-flow')}</th>
                    <th className="gba:p-3 gba:text-left gba:text-sm gba:font-medium">{t('sla-step')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('tasks-total-tasks')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-violations')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-violation-rate')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-avg-overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {slaKillers.map((killer, index) => (
                    <tr
                      key={`${killer.flow_name}-${killer.step_name}-${index}`}
                      className="gba:border-b gba:border-border/60"
                    >
                      <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">{killer.flow_name}</td>
                      <td className="gba:p-3 gba:text-sm gba:text-foreground">{killer.step_name}</td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{killer.total_tasks}</td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {killer.sla_violations}
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {formatPercent(killer.violation_rate)}
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {formatHoursDuration(killer.avg_overdue_hours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
