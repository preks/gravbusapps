import React, { useEffect } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { Activity, CheckCircle2, Clock3, Target, Workflow } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import translations from '../../_i18n'
import { useDecisionOptimizationAnalytics } from '../../hooks/useDecisionData'
import { useFlowManagementAnalytics, useTemplatePerformanceAnalytics } from '../../hooks/useFlowAnalytics'
import { useSystemTaskReliability } from '../../hooks/useSystemTaskReliability'
import type { FlowSuccessDrilldownTarget, FlowSuccessPerformanceView } from '../../shellState'
import { formatPercent } from '../../utils/formatters'
import { SuccessTabPage } from '../shared'
import { PerformanceDashboardView } from './performance/PerformanceDashboardView'
import { PerformancePortfolioView } from './performance/PerformancePortfolioView'

interface PerformanceWorkspaceProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  timeframe: 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd'
  templateId: string
  selectedFlowName: string
  hasAnalyticsData: boolean
  subView: FlowSuccessPerformanceView
  section?: string
  onDrilldown?: (target: FlowSuccessDrilldownTarget) => void
  headerActions?: React.ReactNode
}

export const PerformanceWorkspace: React.FC<PerformanceWorkspaceProps> = ({
  prefixDataTestId = 'performance-workspace',
  accessToken,
  timeframe,
  templateId,
  selectedFlowName,
  hasAnalyticsData,
  subView,
  section,
  onDrilldown,
  headerActions
}) => {
  const { t } = useTranslation(translations)
  const scopedTemplateId = templateId !== 'ALL' ? templateId : undefined
  const {
    data: portfolioAnalytics,
    isLoading: portfolioLoading,
    error: portfolioError,
    refetch: refetchPortfolio
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken
  })
  const {
    data: selectedAnalytics,
    isLoading: selectedLoading,
    error: selectedError
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken,
    templateId: scopedTemplateId
  })
  const {
    data: templateTableData,
    isLoading: templateLoading,
    error: templateError,
    refetch: refetchTemplates
  } = useTemplatePerformanceAnalytics({
    timeframe,
    accessToken,
    limit: subView === 'portfolio' ? 100 : 12,
    offset: 0,
    sortBy: 'totalWorkflows',
    sortOrder: 'desc'
  })
  const { data: systemReliability, isLoading: reliabilityLoading } = useSystemTaskReliability({
    timeframe,
    accessToken,
    templateId: scopedTemplateId
  })
  const { data: decisionOptimization, isLoading: optimizationLoading } = useDecisionOptimizationAnalytics({
    timeframe,
    accessToken,
    templateId: scopedTemplateId
  })

  useEffect(() => {
    if (!section) return
    const element = document.getElementById(section)
    if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [section])

  const templates = templateTableData?.templates || []
  const statusMetrics = portfolioAnalytics?.statusMetrics
  const scopedMetrics = selectedAnalytics?.statusMetrics
  const selectedTemplateKpis = [
    {
      id: 'selected-total',
      label: t('flows-total-workflows'),
      value: String(scopedMetrics?.total_workflows ?? 0),
      icon: <Workflow className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-completed',
      label: t('flows-completed-workflows'),
      value: String(scopedMetrics?.completed_workflows ?? 0),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-rate',
      label: t('flows-completion-rate'),
      value: formatPercent(scopedMetrics?.workflow_completion_rate),
      icon: <Target className="gba:h-5 gba:w-5" />
    },
    {
      id: 'selected-pending',
      label: t('overview-in-progress'),
      value: String(scopedMetrics?.pending_workflows ?? 0),
      icon: <Activity className="gba:h-5 gba:w-5" />
    }
  ]
  const portfolioKpis = [
    {
      id: 'portfolio-total',
      label: t('flows-total-workflows'),
      value: String(statusMetrics?.total_workflows ?? 0),
      description: t('flows-portfolio-description'),
      icon: <Workflow className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({ primaryView: 'performance', performanceView: 'portfolio', section: 'performance-portfolio' })
    },
    {
      id: 'portfolio-completed',
      label: t('flows-completed-workflows'),
      value: String(statusMetrics?.completed_workflows ?? 0),
      description: t('overview-completion-rate-description'),
      icon: <CheckCircle2 className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({ primaryView: 'performance', performanceView: 'portfolio', section: 'performance-portfolio' })
    },
    {
      id: 'portfolio-rate',
      label: t('flows-completion-rate'),
      value: formatPercent(statusMetrics?.workflow_completion_rate),
      description: t('overview-completion-rate-description'),
      icon: <Target className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({ primaryView: 'performance', performanceView: 'portfolio', section: 'performance-portfolio' })
    },
    {
      id: 'portfolio-pending',
      label: t('overview-in-progress'),
      value: String(statusMetrics?.pending_workflows ?? 0),
      description: t('flows-portfolio-description'),
      icon: <Clock3 className="gba:h-5 gba:w-5" />,
      actionLabel: t('action-view-details'),
      onClick: () =>
        onDrilldown?.({ primaryView: 'governance', governanceView: 'sla', templateId, section: 'sla-immediate-action' })
    }
  ]

  const workspaceCopy = {
    trends: {
      title: t('analytics-subview-trends'),
      description: t('trends-description')
    },
    dashboard: {
      title: t('templates-subview-dashboard'),
      description: selectedFlowName
        ? `${selectedFlowName} · ${t('templates-dashboard-description')}`
        : t('templates-dashboard-description')
    },
    portfolio: {
      title: t('analytics-subview-performance'),
      description: t('templates-workspace-description')
    }
  }[subView]

  return (
    <SuccessTabPage
      title={workspaceCopy.title}
      description={workspaceCopy.description}
      actions={headerActions}
      data-testid={prefixDataTestId}
    >
      {subView === 'portfolio' ? (
        <PerformancePortfolioView
          kpiItems={portfolioKpis}
          isPortfolioLoading={portfolioLoading}
          portfolioError={portfolioError}
          onRetryPortfolio={refetchPortfolio}
          isTemplatesLoading={templateLoading}
          templates={templates}
          templatesError={templateError}
          onRetryTemplates={refetchTemplates}
          data-testid={`${prefixDataTestId}-portfolio`}
        />
      ) : null}

      {subView === 'dashboard' ? (
        <PerformanceDashboardView
          accessToken={accessToken}
          timeframe={timeframe}
          scopedTemplateId={scopedTemplateId}
          selectedFlowName={selectedFlowName}
          hasAnalyticsData={hasAnalyticsData}
          kpiItems={selectedTemplateKpis}
          isLoading={selectedLoading}
          error={selectedError}
          timeSeries={selectedAnalytics?.timeSeries || []}
          decisionOptimization={decisionOptimization}
          isOptimizationLoading={optimizationLoading}
          systemReliability={systemReliability}
          isReliabilityLoading={reliabilityLoading}
          data-testid={`${prefixDataTestId}-dashboard`}
        />
      ) : null}
    </SuccessTabPage>
  )
}
