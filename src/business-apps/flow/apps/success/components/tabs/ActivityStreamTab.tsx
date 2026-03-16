import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useAuditFilterOptions, useAuditLogs } from '../../hooks/useAuditData'
import { useFlowsList } from '../../hooks/useFlowAnalytics'
import type { FlowSuccessDrilldownTarget } from '../../shellState'
import {
  DEFAULT_SUCCESS_TIMEFRAME,
  getSuccessTimeframeDateRange,
  getSuccessTimeframeOptions,
  type SuccessTimeframe
} from '../../utils/timeframe'
import { SuccessTabPage, SuccessTimeframeSelect } from '../shared'
import { OverviewRecentActivityPanel } from './overview/OverviewRecentActivityPanel'
import { OverviewRecentFlowsPanel } from './overview/OverviewRecentFlowsPanel'

interface ActivityStreamTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe?: SuccessTimeframe
  onTimeframeChange?: (timeframe: SuccessTimeframe) => void
  templateId?: string
  showControls?: boolean
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const ActivityStreamTab: React.FC<ActivityStreamTabProps> = ({
  prefixDataTestId = 'flow-success-activity-stream',
  accessToken,
  timeframe,
  onTimeframeChange,
  templateId,
  showControls = true,
  section,
  onDrilldown,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const [internalTimeframe, setInternalTimeframe] = useState<SuccessTimeframe>(DEFAULT_SUCCESS_TIMEFRAME)
  const [flowsStatus, setFlowsStatus] = useState<string>('ALL')
  const [activityAction, setActivityAction] = useState<string>('ALL')
  const [flowsPage, setFlowsPage] = useState(0)
  const [activityPage, setActivityPage] = useState(0)
  const flowsPageSize = 6
  const activityPageSize = 6
  const activeTimeframe = timeframe ?? internalTimeframe
  const handleTimeframeChange = onTimeframeChange ?? setInternalTimeframe
  const scopedTemplateId = templateId && templateId !== 'ALL' ? templateId : undefined
  const timeframeRange = useMemo(() => getSuccessTimeframeDateRange(activeTimeframe), [activeTimeframe])
  const recentActivityFilters = useMemo(
    () => ({
      limit: activityPageSize,
      offset: activityPage * activityPageSize,
      action: activityAction === 'ALL' ? undefined : activityAction,
      templateId: scopedTemplateId,
      startDate: timeframeRange.startDate,
      endDate: timeframeRange.endDate
    }),
    [activityAction, activityPage, activityPageSize, scopedTemplateId, timeframeRange.endDate, timeframeRange.startDate]
  )

  const { data: auditFilterOptions } = useAuditFilterOptions(accessToken)
  const {
    data: auditData,
    isLoading: auditLoading,
    error: auditError
  } = useAuditLogs(recentActivityFilters, accessToken)
  const {
    data: flowsList,
    isLoading: flowsLoading,
    error: flowsError
  } = useFlowsList({
    status: flowsStatus === 'ALL' ? undefined : flowsStatus,
    templateId: scopedTemplateId,
    startDate: timeframeRange.startDate,
    endDate: timeframeRange.endDate,
    limit: flowsPageSize,
    offset: flowsPage * flowsPageSize,
    orderBy: 'updated_time',
    orderDirection: 'DESC',
    accessToken
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  useEffect(() => {
    setFlowsPage(0)
  }, [flowsStatus, activeTimeframe, scopedTemplateId])

  useEffect(() => {
    setActivityPage(0)
  }, [activityAction, activeTimeframe, scopedTemplateId])

  const timeframeOptions = getSuccessTimeframeOptions(t)
  const recentFlows = useMemo(() => {
    const flows = flowsList?.flows ?? []
    return [...flows].sort((a, b) => new Date(b.updateTime || 0).getTime() - new Date(a.updateTime || 0).getTime())
  }, [flowsList?.flows])
  const auditEntries = useMemo(() => {
    const entries = auditData?.entries ?? []
    return [...entries].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime())
  }, [auditData?.entries])
  const activityActionOptions = useMemo(
    () => [...new Set(auditFilterOptions?.actions ?? [])].sort((left, right) => left.localeCompare(right)),
    [auditFilterOptions?.actions]
  )

  return (
    <SuccessTabPage
      title={t('operations-subview-activity')}
      description={t('activity-stream-description')}
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
      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
        <OverviewRecentFlowsPanel
          flows={recentFlows}
          isLoading={flowsLoading}
          error={flowsError}
          status={flowsStatus}
          currentPage={flowsPage + 1}
          totalPages={Math.max(1, Math.ceil((flowsList?.totalCount || 0) / flowsPageSize))}
          hasMore={Boolean(flowsList?.hasMore)}
          onStatusChange={setFlowsStatus}
          onPreviousPage={() => setFlowsPage(Math.max(0, flowsPage - 1))}
          onNextPage={() => setFlowsPage(flowsPage + 1)}
          onSelectFlow={flow =>
            onDrilldown?.({
              primaryView: 'operations',
              operationsView: 'dashboard',
              templateId: flow.templateId || 'ALL',
              section: 'performance-dashboard'
            })
          }
          title={t('overview-recent-flows')}
          description={t('flows-selector-description')}
          showSearch={false}
          statusFilterPlacement="header"
          data-testid={`${prefixDataTestId}-flows`}
        />
        <OverviewRecentActivityPanel
          entries={auditEntries}
          isLoading={auditLoading}
          error={auditError}
          action={activityAction}
          actionOptions={activityActionOptions}
          onActionChange={setActivityAction}
          currentPage={activityPage + 1}
          totalPages={Math.max(1, Math.ceil((auditData?.pagination.total || 0) / activityPageSize))}
          hasMore={Boolean(auditData?.pagination.hasMore)}
          onPreviousPage={() => setActivityPage(Math.max(0, activityPage - 1))}
          onNextPage={() => setActivityPage(activityPage + 1)}
          data-testid={`${prefixDataTestId}-recent-activity`}
        />
      </div>
    </SuccessTabPage>
  )
}
