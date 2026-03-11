import React, { useEffect, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Activity, AlertTriangle, BarChart3, ShieldAlert } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useFlowManagementAnalytics, useFlowsList } from '../../hooks/useFlowAnalytics'
import { useGuardianVelocityInsights } from '../../hooks/useGuardianVelocityInsights'
import { useSystemTaskReliability } from '../../hooks/useSystemTaskReliability'
import type { FlowSuccessDrilldownTarget } from '../../shellState'
import { formatTimeSince } from '../../utils/formatters'
import { getSuccessTimeframeDateRange, type SuccessTimeframe, getSuccessTimeframeOptions } from '../../utils/timeframe'
import {
  SuccessErrorState,
  SuccessKpiGrid,
  SuccessCompactFlowList,
  SuccessTabPage,
  SuccessTimeframeSelect
} from '../shared'
import { OperationsOverviewBottlenecksSection } from './overview/OperationsOverviewBottlenecksSection'
import { OperationsOverviewSlaQueueSection } from './overview/OperationsOverviewSlaQueueSection'
import { getStalledFlows, getTopBottlenecks } from './overview/operationsOverviewUtils'

interface OperationsOverviewTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const OperationsOverviewTab: React.FC<OperationsOverviewTabProps> = ({
  prefixDataTestId = 'operations-overview-tab',
  accessToken,
  timeframe = 'mtd',
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined
  const timeframeRange = useMemo(() => getSuccessTimeframeDateRange(timeframe), [timeframe])
  const {
    data: velocityData,
    isLoading: velocityLoading,
    error: velocityError,
    refetch: refetchVelocity
  } = useGuardianVelocityInsights({
    timeframe,
    templateId: scopedTemplateId,
    accessToken
  })
  const {
    data: managementData,
    isLoading: managementLoading,
    error: managementError
  } = useFlowManagementAnalytics({
    timeframe,
    templateId: scopedTemplateId,
    accessToken
  })
  const {
    data: reliabilityData,
    isLoading: reliabilityLoading,
    error: reliabilityError
  } = useSystemTaskReliability({
    timeframe,
    templateId: scopedTemplateId,
    accessToken
  })
  const {
    data: flowsData,
    isLoading: flowsLoading,
    error: flowsError
  } = useFlowsList({
    templateId: scopedTemplateId,
    startDate: timeframeRange.startDate,
    endDate: timeframeRange.endDate,
    limit: 50,
    offset: 0,
    orderBy: 'updated_time',
    orderDirection: 'DESC',
    accessToken
  })
  const {
    data: timedOutData,
    isLoading: timedOutLoading,
    error: timedOutError
  } = useFlowsList({
    templateId: scopedTemplateId,
    status: 'TIMED_OUT',
    startDate: timeframeRange.startDate,
    endDate: timeframeRange.endDate,
    limit: 25,
    offset: 0,
    orderBy: 'updated_time',
    orderDirection: 'DESC',
    accessToken
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const overview = velocityData?.overview.kpis
  const systemFailures = (reliabilityData?.summary.failedTasks || 0) + (reliabilityData?.summary.timedOutTasks || 0)
  const allFlows = flowsData?.flows || []
  const stalledFlows = useMemo(() => getStalledFlows(allFlows), [allFlows])
  const immediateSlaQueue = useMemo(
    () =>
      (managementData?.immediateActionQueue || []).map(item => ({
        flowId: item.flow_id,
        flowName: item.flow_name,
        templateId: item.template_id,
        status: item.status,
        lastActivityTime: item.last_activity_time,
        dueDate: item.due_date,
        topStep: item.step_name,
        slaViolations: item.sla_violations,
        violationRate: item.violation_rate,
        avgOverdueHours: item.avg_overdue_hours
      })),
    [managementData?.immediateActionQueue]
  )
  const bottlenecks = useMemo(() => getTopBottlenecks(velocityData?.bottlenecks), [velocityData?.bottlenecks])
  const kpiItems = [
    {
      id: 'throughput',
      label: t('capacity-throughput-title'),
      value: String(Math.round(overview?.throughputPerDay || 0)),
      description: t('capacity-throughput-description'),
      icon: <BarChart3 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'wip',
      label: t('capacity-wip-title'),
      value: String(overview?.wipActive || 0),
      description: t('capacity-wip-description'),
      icon: <Activity className="gba:h-5 gba:w-5" />
    },
    {
      id: 'sla-breaches',
      label: t('capacity-breaches-title'),
      value: String(overview?.slaBreaches || 0),
      description: t('capacity-breaches-description'),
      icon: <ShieldAlert className="gba:h-5 gba:w-5" />
    },
    {
      id: 'system-failures',
      label: t('operations-overview-system-failures-title'),
      value: reliabilityError ? 'n/a' : String(systemFailures),
      description: t('operations-overview-system-failures-description'),
      icon: <AlertTriangle className="gba:h-5 gba:w-5" />
    }
  ]
  return (
    <SuccessTabPage
      title={t('operations-subview-overview')}
      description={t('operations-overview-description')}
      actions={
        showControls || headerActions ? (
          <>
            {showControls ? (
              <SuccessTimeframeSelect
                value={timeframe}
                onChange={value => onTimeframeChange?.(value)}
                options={getSuccessTimeframeOptions(t)}
                data-testid={`${prefixDataTestId}-timeframe-select`}
              />
            ) : null}
            {headerActions}
          </>
        ) : undefined
      }
      data-testid={prefixDataTestId}
    >
      {velocityError ? (
        <SuccessErrorState
          title={t('state-error-title')}
          message={velocityError.message}
          onRetry={refetchVelocity}
          retryLabel={t('action-retry')}
          data-testid={`${prefixDataTestId}-error`}
        />
      ) : (
        <SuccessKpiGrid
          items={kpiItems}
          isLoading={velocityLoading || reliabilityLoading}
          emptyTitle={t('state-empty')}
          emptyDescription={t('operations-overview-description')}
          variant="compact"
          data-testid={`${prefixDataTestId}-kpis`}
        />
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
        <OperationsOverviewSlaQueueSection
          items={immediateSlaQueue}
          isLoading={managementLoading}
          error={managementError}
          data-testid={`${prefixDataTestId}-sla-queue`}
        />
        <OperationsOverviewBottlenecksSection
          items={bottlenecks}
          isLoading={velocityLoading}
          error={velocityError}
          data-testid={`${prefixDataTestId}-bottlenecks`}
        />
        <SuccessCompactFlowList
          title={t('operations-overview-stalled-flows-title')}
          description={t('operations-overview-stalled-flows-description')}
          flows={stalledFlows}
          isLoading={flowsLoading}
          error={flowsError}
          emptyDescription={t('operations-overview-stalled-flows-empty')}
          metricLabel={t('operations-overview-no-movement-for')}
          renderMetric={flow => formatTimeSince(flow.lastActivityTime || flow.updateTime || flow.startTime)}
          data-testid={`${prefixDataTestId}-stalled-flows`}
        />
        <SuccessCompactFlowList
          title={t('operations-overview-timed-out-flows-title')}
          description={t('operations-overview-timed-out-flows-description')}
          flows={timedOutData?.flows || []}
          isLoading={timedOutLoading}
          error={timedOutError}
          emptyDescription={t('operations-overview-timed-out-flows-empty')}
          metricLabel={t('operations-overview-timed-out-for')}
          renderMetric={flow => formatTimeSince(flow.endTime || flow.lastActivityTime || flow.updateTime)}
          data-testid={`${prefixDataTestId}-timed-out-flows`}
        />
      </div>
    </SuccessTabPage>
  )
}
