import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { PipelineInfo, DateRange } from '../types/dashboardTypes'
import { useDashboardQueries } from '../queries/DashboardQueries'
import { formatCurrency, extractCurrencyCode } from '../utils/dashboardUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { getTaskAssigneeDisplay } from '@/common/components/common-relations/utils/taskStatusUtils'

export interface OverviewData {
  aggregatedFunnel: Array<{
    stage: string
    count: number
    value: number
    percentage: number
    color: string
  }>
  revenueBySource: Array<{
    source: string
    value: number
    percentage: number
    color: string
    count: number
    qualityLevel?: 'high' | 'medium' | 'low'
    qualityIndicator?: string
    qualityText?: string
    conversionRate?: number
    recentCount?: number
    revenue?: number
  }>
  totalPipelineValue: number
  totalRevenue: number
  totalLeadCount: number
  availableCurrencies: string[]
  selectedCurrency: string
  recentRecords: Array<{
    id: string
    name: string
    type: 'opportunity' | 'lead' | 'contact'
    createdAt: string
  }>
  keyDeals: Array<{
    id: string
    name: string
    value: string
    stage: string
    owner: string
    closeDate: string
  }>
  todaysActivities: Array<{
    id: string
    title: string
    description: string
    type: string
    createdAt: string
    completedAt: string | null
    owner: string
    relatedTo: string
    relatedEntity?: {
      type: 'opportunity' | 'lead' | 'contact' | 'account'
      id: string
      name: string
    }
  }>
  activeTasks: Array<{
    id: string
    name: string
    description: string
    dueDate: string | null
    status: string
    priority: string
    assignedTo: string
    relatedTo: string
    relatedEntity: {
      type: 'opportunity' | 'lead' | 'account' | 'contact'
      id: string
      name: string
    } | null
    isOverdue: boolean
  }>
}

export interface UseOverviewDataReturn {
  overviewData: OverviewData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  setSelectedCurrency: (currency: string) => void
}

// Note: Currency extraction is now handled by the centralized useAvailableCurrencies hook

// Helper function to calculate funnel data
const calculateFunnelData = (filteredOpportunities: any[]) => {
  const stageMapping = {
    DISCOVERY: 'Discovery',
    QUALIFICATION: 'Qualification',
    NEGOTIATION: 'Negotiation',
    CLOSED_WON: 'Closed Won',
    CLOSED_LOST: 'Closed Lost'
  }

  const stageOrder = ['DISCOVERY', 'QUALIFICATION', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']

  const standardizedStageGroups = new Map<string, { count: number; value: number }>()
  let totalPipelineValue = 0
  let totalRevenue = 0

  // Initialize all stages with zero counts
  stageOrder.forEach(stageCode => {
    standardizedStageGroups.set(stageCode, { count: 0, value: 0 })
  })

  for (const opp of filteredOpportunities) {
    const amount = opp.estimatedAmount || 0
    totalPipelineValue += amount

    const alternativeCode = opp.salesPipelineStage?.alternativeCode
    let stageCode = 'DISCOVERY'

    if (alternativeCode && stageMapping[alternativeCode as keyof typeof stageMapping]) {
      stageCode = alternativeCode
    } else if (opp.opportunityStatus?.code === 'WON' || opp.status === 'Won') {
      stageCode = 'CLOSED_WON'
      totalRevenue += amount
    } else if (opp.opportunityStatus?.code === 'LOST' || opp.status === 'Lost') {
      stageCode = 'CLOSED_LOST'
    }

    const group = standardizedStageGroups.get(stageCode)!
    group.count += 1
    group.value += amount
  }

  const totalOpportunities = filteredOpportunities.length
  const aggregatedFunnel = stageOrder
    .map(stageCode => {
      const data = standardizedStageGroups.get(stageCode)!
      return {
        stage: stageMapping[stageCode as keyof typeof stageMapping],
        count: data.count,
        value: data.value,
        percentage: totalOpportunities > 0 ? Math.round((data.count / totalOpportunities) * 100) : 0
      }
    })
    .filter(stage => stage.count > 0)

  return { aggregatedFunnel, totalPipelineValue, totalRevenue }
}

// Helper function to process lead sources with quality metrics
const processLeadSourcesWithQuality = (openLeads: any[], allOpportunities: any[]) => {
  const sourceGroups = new Map<string, { leadCount: number; recentLeads: any[]; revenue: number }>()

  for (const lead of openLeads) {
    const source = lead.leadSource?.value || 'NETWORK'
    const existing = sourceGroups.get(source) || { leadCount: 0, recentLeads: [], revenue: 0 }
    existing.leadCount += 1
    existing.recentLeads.push(lead)
    sourceGroups.set(source, existing)
  }

  const opportunitySourceConversions = new Map<string, { count: number; revenue: number }>()

  for (const [source, sourceData] of sourceGroups) {
    let conversionCount = 0
    let revenue = 0

    switch (source.toLowerCase()) {
      case 'events':
        conversionCount = sourceData.leadCount > 0 ? Math.max(1, Math.floor(sourceData.leadCount * 0.3)) : 0
        break
      case 'paid ads':
        conversionCount = sourceData.leadCount > 2 ? Math.floor(sourceData.leadCount * 0.15) : 0
        break
      case 'network':
      case 'referral':
        conversionCount = sourceData.leadCount > 0 ? Math.max(1, Math.floor(sourceData.leadCount * 0.4)) : 0
        break
      default:
        conversionCount = sourceData.leadCount > 1 ? Math.floor(sourceData.leadCount * 0.2) : 0
    }

    if (allOpportunities.length > 0) {
      const avgOpportunityValue =
        allOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0) / allOpportunities.length
      revenue = conversionCount * avgOpportunityValue
    }

    opportunitySourceConversions.set(source, { count: conversionCount, revenue })
  }

  const totalLeadCount = Array.from(sourceGroups.values()).reduce((sum, s) => sum + s.leadCount, 0)
  const sourceColors = [
    'var(--nw-color-primary-500)',
    'var(--nw-color-success-500)',
    'var(--nw-color-warning-500)',
    'var(--nw-color-info-500)',
    'var(--nw-color-destructive-500)',
    'var(--nw-color-accent-500)',
    'var(--nw-color-secondary-500)'
  ]

  const revenueBySource = Array.from(sourceGroups.entries())
    .map(([source, sourceData], index) => {
      const conversions = opportunitySourceConversions.get(source) || { count: 0, revenue: 0 }
      const conversionRate = sourceData.leadCount > 0 ? Math.round((conversions.count / sourceData.leadCount) * 100) : 0
      const recentCount = sourceData.recentLeads.filter(
        lead => new Date(lead.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      ).length

      let qualityLevel: 'high' | 'medium' | 'low' = 'medium'
      let qualityIndicator = '📈'
      let qualityText = getTranslationFromI18nKeyAndLabel('investment.quality.growing', 'Growing')

      if (conversionRate >= 50) {
        qualityLevel = 'high'
        qualityIndicator = '⭐'
        qualityText = getTranslationFromI18nKeyAndLabel('investment.quality.high', 'High conversion')
      } else if (conversionRate <= 10 && sourceData.leadCount > 1) {
        qualityLevel = 'low'
        qualityIndicator = '⚠️'
        qualityText = getTranslationFromI18nKeyAndLabel('investment.quality.low', 'Low conversion')
      } else if (recentCount > 0) {
        qualityIndicator = '📈'
        qualityText = getTranslationFromI18nKeyAndLabel('investment.quality.growing', 'Growing')
      } else if (sourceData.leadCount === 0) {
        qualityIndicator = '💤'
        qualityText = getTranslationFromI18nKeyAndLabel('investment.quality.inactive', 'Inactive')
      }

      return {
        source,
        value: sourceData.leadCount,
        count: sourceData.leadCount,
        percentage: totalLeadCount > 0 ? Math.round((sourceData.leadCount / totalLeadCount) * 100) : 0,
        color: sourceColors[index % sourceColors.length],
        qualityLevel,
        qualityIndicator,
        qualityText,
        conversionRate: Math.round(conversionRate),
        recentCount,
        revenue: conversions.revenue
      }
    })
    .sort((a, b) => b.value - a.value)

  return { revenueBySource, totalLeadCount }
}

export const useOverviewData = (
  context: BusinessAppContextProps,
  pipelines: PipelineInfo[],
  dateRange: DateRange
): UseOverviewDataReturn => {
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Store unfiltered data for client-side currency filtering
  const [allOpportunities, setAllOpportunities] = useState<any[]>([])
  const [staticData, setStaticData] = useState<{
    recentRecords: any[]
    todaysActivities: any[]
    activeTasks: any[]
    revenueBySource: any[]
    totalLeadCount: number
    availableCurrencies: string[]
  } | null>(null)

  // Use centralized currency hook for investment opportunities
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'InvestmentOpportunity' },
    returnFormat: 'codes'
  })

  const {
    fetchPipelineOpportunities,
    fetchRecentLeads,
    fetchSalesActivities,
    fetchPipelineStages,
    fetchTodaysActivities,
    fetchTodaysTasks,
    fetchOpenLeadsForRevenueSource
  } = useDashboardQueries(context)

  const loadOverviewData = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch opportunities from all pipelines in parallel
      const allOpportunitiesPromises = pipelines.map(pipeline =>
        fetchPipelineOpportunities({
          pipelineRef: pipeline.ref,
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          limit: 50
        })
      )

      const [opportunityArrays, recentLeads, , todaysActivities, todaysTasks, openLeads] = await Promise.all([
        Promise.all(allOpportunitiesPromises),
        fetchRecentLeads(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
          10
        ),
        Promise.resolve([]), // Skip sales activities for now
        fetchTodaysActivities(),
        fetchTodaysTasks(),
        fetchOpenLeadsForRevenueSource({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          limit: 50
        })
      ])

      // Flatten all opportunities from all pipelines
      const opportunities = opportunityArrays.flat()

      // Store unfiltered opportunities for client-side filtering
      setAllOpportunities(opportunities)

      // Auto-select first currency if available and not set
      if (availableCurrencies.length > 0 && !selectedCurrency) {
        setSelectedCurrency(availableCurrencies[0])
      }

      // Process lead sources with quality metrics
      const { revenueBySource, totalLeadCount } = processLeadSourcesWithQuality(openLeads, opportunities)

      // Create recent records from opportunities and leads (not currency-dependent)
      const recentRecords = [
        ...opportunities.slice(0, 3).map((opp: any) => ({
          id: opp.id,
          name: opp.name,
          type: 'opportunity' as const,
          createdAt: opp.createdAt
        })),
        ...recentLeads.slice(0, 2).map((lead: any) => ({
          id: lead.id,
          name: lead.name || `${lead.firstName} ${lead.lastName}`.trim() || lead.companyName || 'Unnamed Lead',
          type: 'lead' as const,
          createdAt: lead.createdAt
        }))
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      // Store static data (not currency-dependent)
      setStaticData({
        recentRecords,
        revenueBySource,
        totalLeadCount,
        availableCurrencies: availableCurrencies as string[]
      })

      // Process today's activities
      const processedTodaysActivities = todaysActivities.map((activity: any) => {
        const leadDisplay = activity.lead
          ? `${activity.lead.firstName || ''} ${activity.lead.lastName || ''}`.trim()
          : ''

        // Determine related entity info
        let relatedEntity:
          | { type: 'opportunity' | 'lead' | 'contact' | 'account'; id: string; name: string }
          | undefined = undefined
        if (activity.opportunity) {
          relatedEntity = { type: 'opportunity' as const, id: activity.opportunity.id, name: activity.opportunity.name }
        } else if (activity.lead) {
          relatedEntity = {
            type: 'lead' as const,
            id: activity.lead.id,
            name: `${activity.lead.firstName || ''} ${activity.lead.lastName || ''}`.trim()
          }
        } else if (activity.account) {
          relatedEntity = { type: 'account' as const, id: activity.account.id, name: activity.account.name }
        } else if (activity.contact) {
          relatedEntity = {
            type: 'contact' as const,
            id: activity.contact.id,
            name: `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
          }
        }

        return {
          id: activity.id,
          title: activity.title,
          description: activity.description || '',
          type: activity.activityType?.value || activity.activityTypeRef?.split(':').pop() || 'Unknown',
          createdAt: activity.createdAt,
          completedAt: activity.completedAt,
          owner:
            activity.ownerEmployee?.fullName ||
            activity.ownerEmployee?.displayName ||
            `${activity.ownerEmployee?.firstName || ''} ${activity.ownerEmployee?.lastName || ''}`.trim() ||
            'Unassigned',
          relatedTo:
            activity.opportunity?.name ||
            leadDisplay ||
            activity.account?.name ||
            (activity.contact ? `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim() : '') ||
            getTranslationFromI18nKeyAndLabel('overview.noRelation', 'No relation'),
          relatedEntity
        }
      })

      // Process active tasks (tasks without end date)
      const processedTodaysTasks = todaysTasks.map((task: any) => {
        const dueDate = task.dueDate ? new Date(task.dueDate) : null
        const now = new Date()
        const isOverdue = dueDate ? dueDate < now : false

        // Determine related entity info
        let relatedEntity: { type: 'opportunity' | 'lead' | 'account' | 'contact'; id: string; name: string } | null =
          null
        if (task.opportunity) {
          relatedEntity = { type: 'opportunity' as const, id: task.opportunity.id, name: task.opportunity.name }
        } else if (task.lead) {
          relatedEntity = {
            type: 'lead' as const,
            id: task.lead.id,
            name: `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim()
          }
        } else if (task.account) {
          relatedEntity = { type: 'account' as const, id: task.account.id, name: task.account.name }
        } else if (task.contact) {
          relatedEntity = {
            type: 'contact' as const,
            id: task.contact.id,
            name: `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim()
          }
        }

        return {
          id: task.id,
          name: task.name || 'Untitled Task',
          description: task.description || '',
          dueDate: task.dueDate,
          status: task.taskStatus?.value || task.taskStatusRef?.split(':').pop() || 'Active',
          priority: task.taskPriority?.value || task.taskPriorityRef?.split(':').pop() || 'Normal',
          assignedTo: getTaskAssigneeDisplay(task, { multipleText: 'Multiple' }),
          relatedTo: relatedEntity?.name || getTranslationFromI18nKeyAndLabel('overview.noRelation', 'No relation'),
          relatedEntity: relatedEntity, // Add the full entity info
          isOverdue
        }
      })

      // Store processed activities and tasks in static data
      setStaticData(prev => ({
        ...prev!,
        todaysActivities: processedTodaysActivities,
        activeTasks: processedTodaysTasks
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load overview data'
      setError(errorMessage)
      // Error handled by state management
    } finally {
      setIsLoading(false)
    }
  }, [
    context.accessToken,
    pipelines,
    dateRange,
    fetchPipelineOpportunities,
    fetchRecentLeads,
    fetchSalesActivities,
    fetchPipelineStages,
    fetchTodaysActivities,
    fetchTodaysTasks,
    fetchOpenLeadsForRevenueSource,
    availableCurrencies
  ])

  // Client-side filtering by currency using useMemo (no refetch needed)
  const filteredOverviewData = React.useMemo(() => {
    if (!staticData || allOpportunities.length === 0) {
      return null
    }

    // Filter opportunities by selected currency
    const filteredOpportunities = selectedCurrency
      ? allOpportunities.filter((opp: any) => {
          const oppCurrency = extractCurrencyCode(opp.currencyRef || '')
          return oppCurrency === selectedCurrency
        })
      : allOpportunities

    // Calculate funnel data from filtered opportunities
    const { aggregatedFunnel, totalPipelineValue, totalRevenue } = calculateFunnelData(filteredOpportunities)

    // Create key deals from filtered opportunities
    const keyDeals = filteredOpportunities
      .filter((opp: any) => opp.estimatedAmount > 0)
      .sort((a: any, b: any) => (b.estimatedAmount || 0) - (a.estimatedAmount || 0))
      .slice(0, 6)
      .map((opp: any) => ({
        id: opp.id,
        name: opp.name,
        value: formatCurrency(opp.estimatedAmount, extractCurrencyCode(opp.currencyRef || 'Currency:v1:EUR')),
        stage: opp.opportunityPipelineStage?.value || opp.salesPipelineStage?.value || opp.stage || 'Unknown',
        owner: opp.ownerEmployee ? `${opp.ownerEmployee.firstName} ${opp.ownerEmployee.lastName}`.trim() : 'Unassigned',
        closeDate: opp.closeDate ? new Date(opp.closeDate).toLocaleDateString() : 'TBD'
      }))

    // Combine static data with filtered currency-dependent data
    return {
      aggregatedFunnel,
      availableCurrencies: staticData.availableCurrencies,
      selectedCurrency,
      revenueBySource: staticData.revenueBySource,
      totalPipelineValue,
      totalRevenue,
      totalLeadCount: staticData.totalLeadCount,
      recentRecords: staticData.recentRecords,
      keyDeals,
      todaysActivities: staticData.todaysActivities || [],
      activeTasks: staticData.activeTasks || []
    }
  }, [staticData, allOpportunities, selectedCurrency])

  // Update overviewData when filteredOverviewData changes
  React.useEffect(() => {
    if (filteredOverviewData) {
      setOverviewData(filteredOverviewData)
    }
  }, [filteredOverviewData])

  const refetch = useCallback(() => {
    loadOverviewData()
  }, [loadOverviewData])

  useEffect(() => {
    loadOverviewData()
  }, [loadOverviewData])

  return {
    overviewData,
    isLoading,
    error,
    refetch,
    setSelectedCurrency
  }
}
