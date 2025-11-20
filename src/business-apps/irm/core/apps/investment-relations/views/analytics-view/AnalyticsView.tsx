import React, { useState, useEffect } from 'react'
import { Alert, AlertTitle, AlertDescription, Button, Spinner } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AnalyticsLayout } from '@/common/components/common-relations/view-layouts/analytics-layout/AnalyticsLayout'
import { useOpportunitiesOverTime } from './hooks/useOpportunitiesOverTime'
import { useOpportunityTrendData } from './hooks/useOpportunityTrendData'
import { useOpportunitiesByStage } from './hooks/useOpportunitiesByStage'
import { useContactsOverTime as useInvestmentContactsOverTime } from './hooks/useContactsOverTime'
import { useContactInsights as useInvestmentContactInsights } from './hooks/useContactInsights'
import { useContactQualityData as useInvestmentContactQualityData } from './hooks/useContactQualityData'
import { useTopRevenueEarners as useInvestmentTopRevenueEarners } from './hooks/useTopRevenueEarners'
import { useAccountsCount as useInvestmentAccountsCount } from './hooks/useAccountsCount'
import { useCrmAnalyticsData } from './hooks/useCrmAnalyticsData'
import { useLeadsTrendData } from './hooks/useLeadsTrendData'
import { useKpiTrendData } from './hooks/useKpiTrendData'
import { useRevenueTrends } from './hooks/useRevenueTrends'
import { usePipelineHealth } from './hooks/usePipelineHealth'
import { useActivityHeatmap } from './hooks/useActivityHeatmap'
import { useGeographicDistribution } from './hooks/useGeographicDistribution'

import { useOpportunityVelocityData } from './hooks/useOpportunityVelocityData'
import { useDealHealthData } from './hooks/useDealHealthData'

export interface AnalyticsViewProps extends BusinessAppContextProps {
  moduleColor?: string
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ moduleColor = 'default', ...context }) => {
  const [leadsTimeFilter, setLeadsTimeFilter] = useState<'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'>(
    'quarter'
  )
  const [oppTimeFilter, setOppTimeFilter] = useState<'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'>(
    'quarter'
  )
  const [contactsTimeFilter, setContactsTimeFilter] = useState<
    'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'
  >('quarter')
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'>(
    'sixMonths'
  )
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [selectedStagePipelineId, setSelectedStagePipelineId] = useState<string | undefined>(undefined)

  // Helper function to convert our time filter to contacts time filter
  const convertToContactsTimeFilter = (
    filter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'
  ): 'month' | 'quarter' | 'year' | 'historical' => {
    if (filter === 'sixMonths') return 'quarter' // Map sixMonths to quarter for contacts
    return filter
  }

  // Data hooks
  const { data, isLoading, error, refetch } = useCrmAnalyticsData(context)
  const { trendData: kpiTrendData } = useKpiTrendData(context.accessToken)
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    context.accessToken,
    revenueTimeFilter,
    selectedPipelineId
  )
  const { pipelineHealth, isLoading: pipelineHealthLoading } = usePipelineHealth(
    context.accessToken,
    selectedPipelineId
  )
  const { activityData: activityHeatmap, isLoading: activityLoading } = useActivityHeatmap(context.accessToken)
  const { geographicData, isLoading: geoLoading } = useGeographicDistribution(context.accessToken)
  const { data: oppVelocityData } = useOpportunityVelocityData(context.accessToken)
  const { data: oppHealthData } = useDealHealthData(context.accessToken)
  const { trendData: leadsTrendData, isLoading: leadsTrendLoading } = useLeadsTrendData(
    context.accessToken,
    leadsTimeFilter as 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'
  )
  const { data: oppLifecycleData } = useOpportunitiesOverTime(context.accessToken, oppTimeFilter, selectedPipelineId)
  const { trendData: oppTrendData } = useOpportunityTrendData(context.accessToken, 'quarter')
  const { data: oppStageData } = useOpportunitiesByStage(context.accessToken, selectedStagePipelineId)
  const { data: contactsMetrics } = useInvestmentContactsOverTime({
    accessToken: context.accessToken,
    timeFilter: convertToContactsTimeFilter(contactsTimeFilter)
  })
  const { data: contactInsights } = useInvestmentContactInsights(context.accessToken)
  const { data: contactQuality } = useInvestmentContactQualityData(context.accessToken)
  const { contacts: topRevenueContacts, isLoading: topRevenueLoading } = useInvestmentTopRevenueEarners(
    context.accessToken
  )
  const { count: investmentAccountCount } = useInvestmentAccountsCount(context.accessToken)

  // Extract pipelines from opportunities data
  const pipelines = data?.opportunities?.opportunitiesByPipeline
    ? data.opportunities.opportunitiesByPipeline.map(p => ({ id: p.pipelineId, name: p.pipeline }))
    : []

  // Initialize selectedStagePipelineId to first pipeline if not set
  useEffect(() => {
    if (pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id)
    }
  }, [pipelines.length])

  if (isLoading) {
    return (
      <div
        data-testid="crm-analytics-loading"
        className="gba:flex gba:items-center gba:justify-center gba:min-h-screen"
      >
        <div className="gba:text-center">
          <Spinner size="lg" />
          <div className="gba:mt-4 gba:text-gray-600 gba:text-lg">Loading CRM Analytics...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        data-testid="crm-analytics-error"
        className="gba:min-h-screen gba:p-6 gba:flex gba:items-center gba:justify-center"
      >
        <div className="gba:max-w-lg gba:w-full">
          <Alert variant="destructive" className="gba:shadow-lg">
            <AlertTitle>Error Loading Analytics</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <Button size="sm" onClick={refetch} variant="default">
              Retry
            </Button>
          </Alert>
        </div>
      </div>
    )
  }

  // Transform KpiTrendData to TrendData format
  const transformedTrendData = kpiTrendData
    ? {
        totalLeadsThisMonth: kpiTrendData.totalLeadsThisMonth,
        totalLeadsLastMonth: kpiTrendData.totalLeadsLastMonth,
        totalAccountsThisMonth: kpiTrendData.totalAccountsThisMonth,
        totalAccountsLastMonth: kpiTrendData.totalAccountsLastMonth,
        totalOpportunitiesThisMonth: kpiTrendData.totalOpportunitiesThisMonth,
        totalOpportunitiesLastMonth: kpiTrendData.totalOpportunitiesLastMonth,
        totalContactsThisMonth: kpiTrendData.totalContactsThisMonth,
        totalContactsLastMonth: kpiTrendData.totalContactsLastMonth,
        currentMonthWonOpportunities: kpiTrendData.currentMonthWonOpportunities,
        previousMonthWonOpportunities: kpiTrendData.previousMonthWonOpportunities,
        // New trend metrics for the missing cards
        currentMonthLeadConversionRate: kpiTrendData.currentMonthLeadConversionRate,
        previousMonthLeadConversionRate: kpiTrendData.previousMonthLeadConversionRate,
        currentMonthAvgDealSize: kpiTrendData.currentMonthAvgDealSize,
        previousMonthAvgDealSize: kpiTrendData.previousMonthAvgDealSize,
        currentMonthSalesCycleLength: kpiTrendData.currentMonthSalesCycleLength,
        previousMonthSalesCycleLength: kpiTrendData.previousMonthSalesCycleLength
      }
    : null

  // Prepare the props for each tab based on the actual data structure
  const overviewProps = data?.overview
    ? {
        title: 'Investment Relations Overview',
        counts: data.overview.totalCounts,
        conversionMetrics: data.overview.conversionMetrics,
        trendData: transformedTrendData,
        trendLoading: false,
        pipelines: pipelines,
        selectedPipelineId: selectedPipelineId,
        onPipelineChange: setSelectedPipelineId,
        revenueTimeFilter: revenueTimeFilter,
        onRevenueTimeFilterChange: setRevenueTimeFilter,
        revenueTrends: revenueTrends || [],
        revenueLoading: revenueLoading,
        pipelineHealth: {
          data: pipelineHealth,
          isLoading: pipelineHealthLoading
        },
        geographicDistribution: {
          data: geographicData || [],
          isLoading: geoLoading
        },
        activityHeatmap: {
          data: activityHeatmap || [],
          isLoading: activityLoading
        },
        topPerformers: data.overview.topPerformers
      }
    : undefined

  // Prepare leads props using the data structure
  const leadsProps = data?.leads
    ? {
        title: 'Leads Analytics',
        totalLeads: data.leads.totalLeads,
        conversionRate: data.leads.conversionRate,
        avgTimeToConversion: data.leads.avgTimeToConversion,
        trendData: leadsTrendData || null,
        trendLoading: leadsTrendLoading,
        leadsOverTime: data.leads.leadsOverTime, // Pass raw data, let component handle filtering
        selectedTimeFilter: leadsTimeFilter,
        onTimeFilterChange: setLeadsTimeFilter,
        leadsBySource: data.leads.leadsBySource.map(x => ({
          source: x.source,
          count: x.count,
          percentage: x.percentage
        })),
        leadsByStatus: data.leads.leadsByStatus.map(x => ({ status: x.status, count: x.count })),
        topOwners: data.leads.topOwners.map(o => ({
          employeeId: o.employeeId,
          employeeName: o.employeeName,
          leadCount: o.leadCount,
          conversionRate: o.conversionRate
        })),
        leadsByRating: data.leads.leadsByRating.map(r => ({
          rating: r.rating,
          count: r.count,
          percentage: r.percentage
        }))
      }
    : undefined

  // Prepare accounts props
  const accountsProps = data?.accounts
    ? {
        title: 'Accounts Analytics',
        totalAccounts: data.accounts.totalAccounts,
        accountsWithOpportunities: data.accounts.accountsWithOpportunities,
        avgOpportunitiesPerAccount: data.accounts.avgOpportunitiesPerAccount,
        trendData: kpiTrendData
          ? {
              currentMonthAccounts: kpiTrendData.currentMonthAccounts,
              previousMonthAccounts: kpiTrendData.previousMonthAccounts,
              currentMonthOpportunities: kpiTrendData.currentMonthOpportunities,
              previousMonthOpportunities: kpiTrendData.previousMonthOpportunities
            }
          : null,
        trendLoading: false,
        accountsOverTime: data.accounts.accountsOverTime,
        accountsByIndustry: data.accounts.accountsByIndustry,
        accountsBySize: data.accounts.accountsBySize,
        topAccounts: data.accounts.topAccounts
      }
    : undefined

  // Prepare opportunities props
  const opportunitiesProps = data?.opportunities
    ? {
        title: 'Opportunities Analytics',
        totalOpportunities: data.opportunities.totalOpportunities,
        totalValue: data.opportunities.totalValue,
        winRate: data.opportunities.winRate,
        avgDealSize: data.opportunities.avgDealSize,
        avgSalesCycle: data.opportunities.avgSalesCycle,
        pipelineVelocity: data.opportunities.pipelineVelocity,
        trendData: oppTrendData || null,
        trendLoading: false,
        lifecycleData: (oppLifecycleData || []).map(d => ({
          date: d.date,
          opportunitiesCreated: d.opportunitiesCreated,
          opportunitiesWon: d.opportunitiesWon
        })),
        pipelines: (data.opportunities.opportunitiesByPipeline || []).map(p => ({
          id: p.pipelineId,
          name: p.pipeline
        })),
        selectedPipelineId: selectedPipelineId,
        onPipelineChange: (id: string) => setSelectedPipelineId(id === 'all' ? undefined : id),
        selectedTimeFilter: oppTimeFilter,
        onTimeFilterChange: setOppTimeFilter,
        opportunitiesByStage: (oppStageData || []).map(s => ({ stage: s.stage, count: s.count, value: s.value })),
        selectedStagePipelineId: selectedStagePipelineId,
        onStagePipelineChange: (id: string) => setSelectedStagePipelineId(id),
        opportunitiesByPipeline: data.opportunities.opportunitiesByPipeline.map(p => ({
          pipelineId: p.pipelineId,
          pipeline: p.pipeline,
          count: p.count,
          percentage: p.percentage
        })),
        topDeals: data.opportunities.topDeals,
        velocityData: oppVelocityData || null,
        dealHealthData: oppHealthData || null
      }
    : undefined

  // Prepare contacts props
  const contactsProps =
    contactsMetrics && contactInsights
      ? {
          title: 'Contacts Analytics',
          totalContacts: contactsMetrics.total,
          thisMonth: contactsMetrics.thisMonth,
          lastMonth: contactsMetrics.lastMonth,
          growth: contactsMetrics.growth,
          totalLastMonth: contactsMetrics.totalLastMonth,
          totalGrowth: contactsMetrics.totalGrowth,
          selectedTimeFilter: convertToContactsTimeFilter(contactsTimeFilter),
          onTimeFilterChange: (filter: 'month' | 'quarter' | 'year' | 'historical') => setContactsTimeFilter(filter),
          overTimeData: contactsMetrics.data,
          topAccountsByContacts: contactInsights.topAccountsByContacts,
          recentContacts: contactInsights.recentContacts,
          insightsData: {
            totalContacts: contactInsights.totalContacts,
            contactsByType: contactInsights.contactsByType,
            contactsByAccount: contactInsights.topAccountsByContacts,
            recentContacts: contactInsights.recentContacts
          },
          qualityData: contactQuality || undefined,
          topRevenueContacts: topRevenueContacts,
          topRevenueLoading: topRevenueLoading,
          avgPerAccount:
            investmentAccountCount > 0 ? Math.round((contactsMetrics.total / investmentAccountCount) * 10) / 10 : 0,
          avgPerAccountLastMonth:
            investmentAccountCount > 0
              ? Math.round((contactsMetrics.totalLastMonth / investmentAccountCount) * 10) / 10
              : 0
        }
      : undefined

  return (
    <div data-testid="crm-analytics" className="gba:h-full gba:p-6">
      <AnalyticsLayout
        defaultTab="overview"
        moduleColor={moduleColor}
        overviewProps={overviewProps}
        leadsProps={leadsProps}
        accountsProps={accountsProps}
        opportunitiesProps={opportunitiesProps}
        contactsProps={contactsProps}
      />
    </div>
  )
}

export default AnalyticsView
