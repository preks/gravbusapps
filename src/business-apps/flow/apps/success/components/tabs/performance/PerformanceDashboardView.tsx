import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, useTranslation } from '@newwork/nw-design-system'
import { Info, Layers3 } from 'lucide-react'
import { ReadonlyTemplateFlowCanvas } from '@/common/components/flow'
import { PerformanceDashboardFlowDataPanel } from './PerformanceDashboardFlowDataPanel'
import translations from '../../../_i18n'
import { useFlowsList } from '../../../hooks/useFlowAnalytics'
import {
  SuccessActivityChart,
  SuccessEmptyState,
  SuccessErrorState,
  SystemTaskReliabilityPanel,
  type SuccessKpiItem
} from '../../shared'
import { type SuccessTimeframe, getSuccessTimeframeDateRange } from '../../../utils/timeframe'
import { DecisionOptimizationPanel } from '../DecisionOptimizationPanel'
import { FlowInsightsAiAssetsPanel } from '../FlowInsightsAiAssetsPanel'
import type { SystemTaskReliabilityData } from '../../../hooks/useSystemTaskReliability'
import { OverviewKpiBand } from '../overview/OverviewKpiBand'
import { OverviewRecentFlowsPanel } from '../overview/OverviewRecentFlowsPanel'

interface PerformanceDashboardViewProps {
  accessToken: string
  timeframe: SuccessTimeframe
  scopedTemplateId?: string
  selectedFlowName: string
  hasAnalyticsData: boolean
  kpiItems: SuccessKpiItem[]
  isLoading?: boolean
  error?: Error | null
  timeSeries: Array<{
    date: string
    workflows_started: number
    workflows_completed: number
  }>
  decisionOptimization: unknown
  isOptimizationLoading?: boolean
  systemReliability: SystemTaskReliabilityData | null
  isReliabilityLoading?: boolean
  'data-testid'?: string
}

export const PerformanceDashboardView: React.FC<PerformanceDashboardViewProps> = ({
  accessToken,
  timeframe,
  scopedTemplateId,
  selectedFlowName,
  hasAnalyticsData,
  kpiItems,
  isLoading = false,
  error,
  timeSeries,
  decisionOptimization,
  isOptimizationLoading = false,
  systemReliability,
  isReliabilityLoading = false,
  'data-testid': testId = 'flow-success-performance-dashboard'
}) => {
  const { t } = useTranslation(translations)
  const [flowsSearch, setFlowsSearch] = useState('')
  const [flowsStatus, setFlowsStatus] = useState<string>('ALL')
  const [flowsPage, setFlowsPage] = useState(0)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const fromUrl = new URLSearchParams(window.location.search).get('flowId')?.trim()
    return fromUrl || null
  })
  const userClearedFlowSelectionRef = useRef(false)
  const flowsPageSize = 6
  const timeframeRange = useMemo(() => getSuccessTimeframeDateRange(timeframe), [timeframe])
  const {
    data: flowsList,
    isLoading: flowsLoading,
    error: flowsError
  } = useFlowsList({
    search: flowsSearch,
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
  const recentFlows = useMemo(() => {
    const flows = flowsList?.flows ?? []
    return [...flows].sort((a, b) => {
      const leftTime = new Date(a.lastActivityTime || a.updateTime || a.startTime || 0).getTime()
      const rightTime = new Date(b.lastActivityTime || b.updateTime || b.startTime || 0).getTime()
      return rightTime - leftTime
    })
  }, [flowsList?.flows])

  useEffect(() => {
    setFlowsPage(0)
    setSelectedFlowId(null)
    userClearedFlowSelectionRef.current = false
  }, [timeframe, scopedTemplateId])

  useEffect(() => {
    if (userClearedFlowSelectionRef.current || selectedFlowId) return
    const firstFlowId = recentFlows[0]?.flowId
    if (firstFlowId) setSelectedFlowId(firstFlowId)
  }, [recentFlows, selectedFlowId])

  if (!scopedTemplateId) {
    return (
      <SuccessEmptyState
        title={t('state-no-selection')}
        description={t('templates-dashboard-empty')}
        icon={<Layers3 className="gba:h-8 gba:w-8" />}
        data-testid={`${testId}-empty`}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-6" id="performance-dashboard" data-testid={testId}>
      {!hasAnalyticsData ? (
        <Card className="gba:border-border gba:bg-card">
          <CardContent className="gba:flex gba:items-start gba:gap-3 gba:p-5">
            <Info className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
            <div className="gba:flex gba:flex-col gba:gap-1">
              <span className="gba:font-medium gba:text-foreground">{t('performance-selected-empty-title')}</span>
              <span className="gba:text-sm gba:text-muted-foreground">
                {t('performance-selected-empty-description')}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <SuccessErrorState title={t('state-error-title')} message={error.message} data-testid={`${testId}-error`} />
      ) : (
        <OverviewKpiBand
          items={kpiItems}
          isLoading={isLoading}
          emptyDescription={t('templates-dashboard-description')}
          hideHeader
          data-testid={`${testId}-overview-band`}
        />
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
        <OverviewRecentFlowsPanel
          flows={recentFlows}
          isLoading={flowsLoading}
          error={flowsError}
          search={flowsSearch}
          status={flowsStatus}
          currentPage={flowsPage + 1}
          totalPages={Math.max(1, Math.ceil((flowsList?.totalCount || 0) / flowsPageSize))}
          hasMore={Boolean(flowsList?.hasMore)}
          onSearchChange={value => {
            setFlowsSearch(value)
            setFlowsPage(0)
          }}
          onStatusChange={value => {
            setFlowsStatus(value)
            setFlowsPage(0)
          }}
          onPreviousPage={() => setFlowsPage(Math.max(0, flowsPage - 1))}
          onNextPage={() => setFlowsPage(flowsPage + 1)}
          onSelectFlow={flow => setSelectedFlowId(flow.flowId)}
          selectedFlowId={selectedFlowId}
          data-testid={`${testId}-recent-flows`}
        />
        <div id="performance-preview">
          <ReadonlyTemplateFlowCanvas
            accessToken={accessToken}
            templateId={scopedTemplateId}
            title={t('templates-preview-title')}
            description={t('templates-preview-description')}
            emptyTitle={t('state-no-selection')}
            emptyDescription={t('templates-dashboard-empty')}
            data-testid={`${testId}-preview`}
          />
        </div>
      </div>

      {selectedFlowId ? (
        <PerformanceDashboardFlowDataPanel
          flowId={selectedFlowId}
          accessToken={accessToken}
          onBack={() => {
            userClearedFlowSelectionRef.current = true
            setSelectedFlowId(null)
          }}
          data-testid={`${testId}-flow-data`}
        />
      ) : (
        <Card className="gba:border-dashed gba:border-border gba:bg-muted/10" data-testid={`${testId}-flow-data-hint`}>
          <CardContent className="gba:p-5 gba:text-sm gba:text-muted-foreground">
            {recentFlows.length ? t('performance-flow-data-select-hint') : t('overview-no-flows')}
          </CardContent>
        </Card>
      )}

      <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
        <div id="performance-activity" className="gba:h-full">
          <SuccessActivityChart
            title={t('flows-period-activity')}
            description={selectedFlowName}
            startedLabel={t('flows-started')}
            completedLabel={t('flows-completed')}
            emptyTitle={t('state-empty')}
            emptyDescription={t('templates-dashboard-description')}
            data={timeSeries}
            fillHeight
            data-testid={`${testId}-activity`}
          />
        </div>
        <SystemTaskReliabilityPanel
          title={t('system-reliability-template-title')}
          description={
            selectedFlowName
              ? `${t('system-reliability-template-description')} · ${selectedFlowName}`
              : t('system-reliability-template-description')
          }
          data={systemReliability}
          isLoading={isReliabilityLoading}
          data-testid={`${testId}-system-reliability`}
        />
      </div>

      <DecisionOptimizationPanel
        data={decisionOptimization as any}
        variant="insights"
        secondaryPanel={
          <FlowInsightsAiAssetsPanel
            accessToken={accessToken}
            templateId={scopedTemplateId}
            reliabilityHotspots={systemReliability?.hotspots || []}
            data-testid={`${testId}-ai-assets`}
          />
        }
        isLoading={isOptimizationLoading}
        data-testid={`${testId}-optimization`}
      />
    </div>
  )
}
