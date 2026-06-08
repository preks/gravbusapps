import { LineChart } from 'lucide-react'
import { RecordNavigationConfig } from '../overview/widgets/RecordSummary'

/**
 * Builds overview props for DashboardLayout component
 */
export const buildOverviewProps = (
  overviewData: any,
  handlers: {
    setSelectedCurrency: (currency: string) => void
    handleOpportunityClick: (opportunityId: string) => void
    setSelectedOpportunityCurrency: (currency: string) => void
  },
  selectedOpportunityCurrency: string,
  recordNavigationConfig: RecordNavigationConfig
) => {
  if (!overviewData) return undefined

  return {
    aggregatedFunnel: overviewData.aggregatedFunnel,
    availableCurrencies: overviewData.availableCurrencies,
    selectedCurrency: overviewData.selectedCurrency,
    onCurrencyChange: handlers.setSelectedCurrency,
    revenueBySource: overviewData.revenueBySource,
    totalRevenue: overviewData.totalRevenue,
    totalLeadCount: overviewData.totalLeadCount,
    recentRecords: overviewData.recentRecords,
    keyOpportunities: overviewData.keyOpportunities,
    onOpportunityClick: handlers.handleOpportunityClick,
    selectedOpportunityCurrency,
    onOpportunityCurrencyChange: handlers.setSelectedOpportunityCurrency,
    recordNavigationConfig,
    // Opportunity status data (IRM only)
    opportunityStatuses: overviewData.opportunityStatuses,
    totalOpportunityCount: overviewData.totalOpportunityCount,
    openOpportunitiesComparison: overviewData.openOpportunitiesComparison,
    useOpportunityStatus: overviewData.useOpportunityStatus
  }
}

/**
 * Builds pipeline props for DashboardLayout component
 */
interface BuildPipelinePropsOptions {
  selectedPipeline: any
  pipelineData: any
  pipelines: any[]
  selectedPipelineId: string
  pipelineCurrencies: string[]
  pipelineCurrency: string | undefined
  pipelineLoading: boolean
  handlers: {
    handlePipelineChange: (id: string) => void
    setPipelineCurrency: (currency: string | undefined) => void
  }
  formatCurrency: (amount: number, currency: string) => string
}

export const buildPipelineProps = ({
  selectedPipeline,
  pipelineData,
  pipelines,
  selectedPipelineId,
  pipelineCurrencies,
  pipelineCurrency,
  pipelineLoading,
  handlers,
  formatCurrency
}: BuildPipelinePropsOptions) => {
  if (!selectedPipeline) return undefined

  return {
    headerLeft: (
      <div className="gba:p-3 gba:rounded-xl gba:shadow-sm gba:bg-blue-100">
        <LineChart className="gba:h-6 gba:w-6 gba:text-blue-600" />
      </div>
    ),
    pipelineTitle: selectedPipeline.name,
    pipelineDescription: selectedPipeline.description,
    pipelines: pipelines.map(p => ({ id: p.id, name: p.name })),
    selectedPipelineId,
    onPipelineChange: handlers.handlePipelineChange,
    availableCurrencies: pipelineCurrencies,
    selectedCurrency: pipelineCurrency,
    onCurrencyChange: handlers.setPipelineCurrency,
    isLoading: pipelineLoading,
    pipelineHeaderBadges: pipelineData
      ? [
          {
            label: `${pipelineData.metrics.totalOpportunities} opportunities`,
            variant: 'secondary' as const
          },
          {
            label: `${formatCurrency(pipelineData.metrics.totalValue, pipelineCurrency || 'EUR')}`,
            variant: 'default' as const
          },
          {
            label: `${pipelineData.metrics.opportunitiesWon} won`,
            variant: 'outline' as const
          }
        ]
      : [],
    pipelineId: selectedPipeline.id,
    metrics: pipelineData
      ? {
          totalValue: pipelineData.metrics.totalValue,
          avgOpportunitySize: pipelineData.metrics.avgOpportunitySize,
          opportunitiesWon: pipelineData.metrics.opportunitiesWon,
          winRate: pipelineData.metrics.winRate
        }
      : {
          totalValue: 0,
          avgOpportunitySize: 0,
          opportunitiesWon: 0,
          winRate: 0
        },
    funnelData: pipelineData?.funnelData || [],
    winRateMetrics: pipelineData?.winRateMetrics || {
      monthToDate: { won: 0, lost: 0, winRate: 0 },
      quarterToDate: { won: 0, lost: 0, winRate: 0 }
    },
    activityVolume: pipelineData?.activityVolume || {
      last7Days: { total: 0, types: [] },
      last30Days: { total: 0, types: [] }
    },
    leaderboard: pipelineData?.leaderboard || []
  }
}
