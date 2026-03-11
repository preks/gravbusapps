import React, { useEffect, useState } from 'react'
import { Button, Card, CardContent, CardDescription, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle, AlertTriangle, Clock3, TrendingDown, XCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useFlowManagementAnalytics } from '../../hooks/useFlowAnalytics'
import {
  SuccessEmptyState,
  SuccessErrorState,
  SuccessExpressionText,
  SuccessKpiGrid,
  SuccessSectionCardHeader,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { formatHoursDuration, formatPercent } from '../../utils/formatters'
import { DEFAULT_SUCCESS_TIMEFRAME, getSuccessTimeframeOptions, type SuccessTimeframe } from '../../utils/timeframe'

interface SLATabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  headerActions?: React.ReactNode
}

export const SLATab: React.FC<SLATabProps> = ({
  prefixDataTestId = 'sla-tab',
  accessToken,
  timeframe,
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const [internalTimeframe, setInternalTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)
  const [criticalStepsPage, setCriticalStepsPage] = useState(1)
  const activeTimeframe = timeframe ?? internalTimeframe
  const handleTimeframeChange = onTimeframeChange ?? setInternalTimeframe
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined
  const criticalStepsPageSize = 5

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useFlowManagementAnalytics({
    timeframe: activeTimeframe,
    templateId: scopedTemplateId,
    accessToken
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const statusMetrics = analytics?.statusMetrics
  const criticalSteps = (analytics?.criticalSteps || []).filter(item => item.overdue_tasks > 0)
  const criticalStepsTotalPages = Math.max(1, Math.ceil(criticalSteps.length / criticalStepsPageSize))
  const pagedCriticalSteps = criticalSteps.slice(
    (criticalStepsPage - 1) * criticalStepsPageSize,
    criticalStepsPage * criticalStepsPageSize
  )
  const timeframeOptions = getSuccessTimeframeOptions(t)

  useEffect(() => {
    setCriticalStepsPage(currentPage => Math.min(currentPage, criticalStepsTotalPages))
  }, [criticalStepsTotalPages])

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
      value: String(criticalSteps.reduce((sum, item) => sum + item.overdue_tasks, 0)),
      description: t('sla-violations-description'),
      icon: <XCircle className="gba:h-5 gba:w-5" />
    },
    {
      id: 'critical-flows',
      label: t('sla-critical-flows'),
      value: String(new Set(criticalSteps.filter(item => item.violation_rate > 20).map(item => item.flow_name)).size),
      description: t('sla-critical-flows-description'),
      icon: <AlertCircle className="gba:h-5 gba:w-5" />
    }
  ]

  return (
    <SuccessTabPage
      title={t('governance-subview-sla')}
      description={t('sla-description')}
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

      <div id="sla-immediate-action" />
      <Card className="gba:border-border gba:bg-card" id="sla-critical-steps">
        <SuccessSectionCardHeader>
          <CardTitle>{t('sla-critical-steps')}</CardTitle>
          <CardDescription>{t('sla-critical-steps-description')}</CardDescription>
        </SuccessSectionCardHeader>
        <CardContent className="gba:p-5">
          {!criticalSteps.length ? (
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
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-overdue-tasks')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-violation-rate')}</th>
                    <th className="gba:p-3 gba:text-right gba:text-sm gba:font-medium">{t('sla-avg-overdue')}</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedCriticalSteps.map(item => (
                    <tr key={`${item.template_id}-${item.step_name}`} className="gba:border-b gba:border-border/60">
                      <td className="gba:p-3 gba:text-sm gba:font-medium gba:text-foreground">{item.flow_name}</td>
                      <td className="gba:p-3 gba:text-sm gba:text-foreground">
                        <SuccessExpressionText value={item.step_name} fallback={t('value-not-available')} />
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">{item.overdue_tasks}</td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {formatPercent(item.violation_rate)}
                      </td>
                      <td className="gba:p-3 gba:text-right gba:text-sm gba:text-foreground">
                        {formatHoursDuration(item.avg_overdue_hours)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {criticalSteps.length > criticalStepsPageSize ? (
                <div className="gba:flex gba:items-center gba:justify-end gba:gap-3 gba:border-t gba:border-border gba:px-3 gba:py-3">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="outline"
                      disabled={criticalStepsPage === 1}
                      onClick={() => setCriticalStepsPage(currentPage => Math.max(1, currentPage - 1))}
                      data-testid={`${prefixDataTestId}-critical-steps-prev`}
                    >
                      {t('action-back')}
                    </Button>
                    <span className="gba:min-w-20 gba:text-center gba:text-sm gba:text-muted-foreground">
                      {criticalStepsPage} / {criticalStepsTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      disabled={criticalStepsPage === criticalStepsTotalPages}
                      onClick={() =>
                        setCriticalStepsPage(currentPage => Math.min(criticalStepsTotalPages, currentPage + 1))
                      }
                      data-testid={`${prefixDataTestId}-critical-steps-next`}
                    >
                      {t('action-next')}
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </SuccessTabPage>
  )
}
