import React, { useState, useEffect, useCallback } from 'react'
import { useAggregatedFunnelData, type AggregatedFunnelConfig } from './useAggregatedFunnelData'
import { useLeadSourceData, type LeadSourceConfig } from './useLeadSourceData'
import { useRecentRecordsData, type RecentRecordsConfig } from './useRecentRecordsData'
import { useActiveTasksData, type ActiveTasksConfig } from './useActiveTasksData'
import { useTodaysActivitiesData, type TodaysActivitiesConfig } from './useTodaysActivitiesData'
import { useTopDealsData, type TopDealsConfig } from './useTopDealsData'
import type { OverviewData, RelatedEntityType } from './types/OverviewDataTypes'

/**
 * Comprehensive configuration for overview dashboard
 * Contains all configs needed for all overview hooks
 */
export interface OverviewDashboardConfig {
  leadSource: LeadSourceConfig
  recentRecords: RecentRecordsConfig
  todaysActivities: TodaysActivitiesConfig
  topDeals: TopDealsConfig
  aggregatedFunnel: AggregatedFunnelConfig
  activeTasks: ActiveTasksConfig
}

export interface GenericPipelineInfo {
  ref: string
  [key: string]: any
}

export interface GenericDateRange {
  startDate: Date
  endDate: Date
}

// Re-use shared OverviewData type
export type GenericOverviewData = OverviewData

export interface UseGenericOverviewDataReturn {
  overviewData: GenericOverviewData | null
  isLoading: boolean
  error: string | null
  refetch: () => void
  setSelectedCurrency: (currency: string) => void
  selectedDealCurrency: string
  setSelectedDealCurrency: (currency: string) => void
  handleTasksPageChange: (page: number, pageSize: number) => Promise<void>
  handleActivitiesPageChange: (page: number, pageSize: number) => Promise<void>
}

/**
 * Helper functions for data formatting and extraction
 */
export interface HelperFunctions {
  formatCurrency: (amount: number, currencyCode: string) => string
  extractCurrencyCode: (currencyRef: string) => string
}

/**
 * Generic hook for fetching overview dashboard data across modules (CRM, IRM, etc.)
 * Module-agnostic - accepts comprehensive configuration for all dashboard queries
 *
 * @param accessToken - Authentication token
 * @param pipelines - Array of pipelines
 * @param dateRange - Date range for filtering
 * @param shouldFetch - Whether to fetch data
 * @param currentEmployeeId - Current user's employee ID for filtering
 * @param helperFunctions - Helper functions for formatting and extraction
 * @param config - Comprehensive configuration for all overview dashboard queries
 */
export const useGenericOverviewData = (
  accessToken: string,
  pipelines: GenericPipelineInfo[],
  dateRange: GenericDateRange,
  shouldFetch: boolean,
  currentEmployeeId: string | undefined,
  helperFunctions: HelperFunctions,
  config: OverviewDashboardConfig
): UseGenericOverviewDataReturn => {
  const { formatCurrency, extractCurrencyCode } = helperFunctions
  const [overviewData, setOverviewData] = useState<GenericOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(shouldFetch)
  const [error, setError] = useState<string | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')
  const [selectedDealCurrency, setSelectedDealCurrency] = useState<string>('EUR')

  // Use shared hooks with config parameters extracted from comprehensive config
  const pipelineRefs = pipelines.map(p => p.ref)
  const {
    aggregatedFunnel: sharedAggregatedFunnel,
    availableCurrencies: sharedAvailableCurrencies,
    totalPipelineValue: sharedTotalPipelineValue
  } = useAggregatedFunnelData({
    accessToken,
    pipelineRefs,
    selectedCurrency,
    currentYear: null, // null = no year filter, show all opportunities
    enabled: shouldFetch,
    config: config.aggregatedFunnel
  })

  const { leadSources: sharedLeadSources, totalLeadCount: sharedTotalLeadCount } = useLeadSourceData({
    accessToken,
    startDate: dateRange.startDate.toISOString(),
    endDate: dateRange.endDate.toISOString(),
    enabled: shouldFetch,
    config: config.leadSource
  })

  const { recentRecords: sharedRecentRecords } = useRecentRecordsData({
    accessToken,
    enabled: shouldFetch,
    config: config.recentRecords,
    limit: 5
  })

  const [tasksLimit, setTasksLimit] = useState(20)
  const [tasksOffset, setTasksOffset] = useState(0)
  const { tasks: sharedActiveTasks, totalCount: sharedActiveTasksTotal } = useActiveTasksData({
    accessToken,
    enabled: shouldFetch,
    config: config.activeTasks,
    limit: tasksLimit,
    offset: tasksOffset,
    currentEmployeeId
  })

  const [activitiesLimit, setActivitiesLimit] = useState(20)
  const [activitiesOffset, setActivitiesOffset] = useState(0)
  const { activities: sharedTodaysActivities, totalCount: sharedTodaysActivitiesTotal } = useTodaysActivitiesData({
    accessToken,
    enabled: shouldFetch,
    config: config.todaysActivities,
    limit: activitiesLimit,
    offset: activitiesOffset,
    currentEmployeeId
  })

  const { deals: sharedTopDeals } = useTopDealsData({
    accessToken,
    enabled: shouldFetch,
    config: config.topDeals,
    selectedCurrency: selectedDealCurrency,
    limit: 5
  })

  const [staticData, setStaticData] = useState<{
    recentRecords: any[]
    revenueBySource: any[]
    totalLeadCount: number
    availableCurrencies: string[]
  } | null>(null)

  const loadOverviewData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (sharedAvailableCurrencies.length > 0 && !selectedCurrency) {
        setSelectedCurrency(sharedAvailableCurrencies[0])
      }

      setStaticData({
        recentRecords: sharedRecentRecords,
        revenueBySource: sharedLeadSources,
        totalLeadCount: sharedTotalLeadCount,
        availableCurrencies: sharedAvailableCurrencies
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load overview data'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    accessToken,
    selectedCurrency,
    sharedAvailableCurrencies,
    sharedRecentRecords,
    sharedLeadSources,
    sharedTotalLeadCount
  ])

  const processedActiveTasks = React.useMemo(() => {
    return sharedActiveTasks.map(task => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null
      const now = new Date()
      const isOverdue = dueDate ? dueDate < now : false

      let relatedEntity: { type: RelatedEntityType; id: string; name: string } | null = null

      if (task.opportunity) {
        relatedEntity = { type: 'opportunity', id: task.opportunity.id, name: task.opportunity.name }
      } else if (task.lead) {
        const leadName =
          task.lead.name ||
          (task.lead.firstName || task.lead.lastName
            ? `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim()
            : 'Unnamed Lead')
        relatedEntity = { type: 'lead', id: task.lead.id, name: leadName }
      } else if (task.account) {
        relatedEntity = { type: 'account', id: task.account.id, name: task.account.name }
      } else if (task.contact) {
        const contactName =
          task.contact.firstName || task.contact.lastName
            ? `${task.contact.firstName || ''} ${task.contact.lastName || ''}`.trim()
            : 'Unnamed Contact'
        relatedEntity = { type: 'contact', id: task.contact.id, name: contactName }
      }

      return {
        id: task.id,
        name: task.name,
        description: task.description || '',
        dueDate: task.dueDate || null,
        status: task.status?.value || 'Unknown',
        priority: task.priority?.value || 'Normal',
        assignedTo:
          task.assignedEmployee?.displayName ||
          `${task.assignedEmployee?.firstName || ''} ${task.assignedEmployee?.lastName || ''}`.trim() ||
          'Unassigned',
        relatedTo: relatedEntity
          ? relatedEntity.name
          : task.opportunity?.name ||
            task.lead?.name ||
            `${task.lead?.firstName || ''} ${task.lead?.lastName || ''}`.trim() ||
            task.account?.name ||
            `${task.contact?.firstName || ''} ${task.contact?.lastName || ''}`.trim() ||
            'No relation',
        relatedEntity,
        isOverdue
      }
    })
  }, [sharedActiveTasks])

  const processedTodaysActivities = React.useMemo(() => {
    return sharedTodaysActivities.map(activity => {
      let relatedEntity: { type: RelatedEntityType; id: string; name: string } | undefined

      if (activity.opportunity) {
        relatedEntity = { type: 'opportunity', id: activity.opportunity.id, name: activity.opportunity.name }
      } else if (activity.lead) {
        const leadName =
          activity.lead.name ||
          (activity.lead.firstName || activity.lead.lastName
            ? `${activity.lead.firstName || ''} ${activity.lead.lastName || ''}`.trim()
            : 'Unnamed Lead')
        relatedEntity = { type: 'lead', id: activity.lead.id, name: leadName }
      } else if (activity.account) {
        relatedEntity = { type: 'account', id: activity.account.id, name: activity.account.name }
      } else if (activity.contact) {
        const contactName =
          activity.contact.firstName || activity.contact.lastName
            ? `${activity.contact.firstName || ''} ${activity.contact.lastName || ''}`.trim()
            : 'Unnamed Contact'
        relatedEntity = { type: 'contact', id: activity.contact.id, name: contactName }
      }

      return {
        id: activity.id,
        title: activity.title,
        description: activity.description || '',
        type: activity.activityType?.value || 'Unknown',
        createdAt: activity.createdAt,
        completedAt: activity.completedAt || null,
        owner:
          activity.ownerEmployee?.displayName ||
          `${activity.ownerEmployee?.firstName || ''} ${activity.ownerEmployee?.lastName || ''}`.trim() ||
          'Unknown',
        relatedTo: relatedEntity
          ? relatedEntity.name
          : activity.opportunity?.name ||
            activity.lead?.name ||
            `${activity.lead?.firstName || ''} ${activity.lead?.lastName || ''}`.trim() ||
            activity.account?.name ||
            `${activity.contact?.firstName || ''} ${activity.contact?.lastName || ''}`.trim() ||
            'No relation',
        relatedEntity
      }
    })
  }, [sharedTodaysActivities])

  const processedTopDeals = React.useMemo(() => {
    return sharedTopDeals.map(deal => {
      const currencyCode = deal.currencyRef ? extractCurrencyCode(deal.currencyRef) : selectedDealCurrency

      return {
        id: deal.id,
        name: deal.name,
        value: formatCurrency(deal.estimatedAmount || 0, currencyCode),
        stage: deal.pipelineStage?.value || 'Unknown',
        owner: `${deal.ownerEmployee?.firstName || ''} ${deal.ownerEmployee?.lastName || ''}`.trim() || 'Unknown',
        closeDate: deal.closeDate || 'Not set'
      }
    })
  }, [sharedTopDeals, selectedDealCurrency, formatCurrency, extractCurrencyCode])

  useEffect(() => {
    if (shouldFetch) {
      void loadOverviewData()
    }
  }, [shouldFetch, loadOverviewData])

  useEffect(() => {
    if (staticData) {
      // Calculate percentage for aggregated funnel
      const totalValue = sharedAggregatedFunnel.reduce((sum, stage) => sum + stage.value, 0)
      const funnelWithPercentage = sharedAggregatedFunnel.map(stage => ({
        ...stage,
        percentage: totalValue > 0 ? (stage.value / totalValue) * 100 : 0
      }))

      setOverviewData({
        aggregatedFunnel: funnelWithPercentage,
        availableCurrencies: staticData.availableCurrencies,
        selectedCurrency,
        revenueBySource: staticData.revenueBySource,
        totalPipelineValue: sharedTotalPipelineValue,
        totalRevenue: staticData.revenueBySource.reduce((sum, source) => sum + source.value, 0),
        totalLeadCount: staticData.totalLeadCount,
        recentRecords: staticData.recentRecords,
        keyDeals: processedTopDeals,
        todaysActivities: processedTodaysActivities,
        todaysActivitiesTotal: sharedTodaysActivitiesTotal,
        activeTasks: processedActiveTasks,
        activeTasksTotal: sharedActiveTasksTotal
      })
    }
  }, [
    staticData,
    sharedAggregatedFunnel,
    sharedTotalPipelineValue,
    selectedCurrency,
    processedTopDeals,
    processedTodaysActivities,
    sharedTodaysActivitiesTotal,
    processedActiveTasks,
    sharedActiveTasksTotal
  ])

  const handleTasksPageChange = useCallback(async (page: number, pageSize: number) => {
    setTasksLimit(pageSize)
    setTasksOffset((page - 1) * pageSize)
  }, [])

  const handleActivitiesPageChange = useCallback(async (page: number, pageSize: number) => {
    setActivitiesLimit(pageSize)
    setActivitiesOffset((page - 1) * pageSize)
  }, [])

  const refetch = useCallback(() => {
    void loadOverviewData()
  }, [loadOverviewData])

  return {
    overviewData,
    isLoading,
    error,
    refetch,
    setSelectedCurrency,
    selectedDealCurrency,
    setSelectedDealCurrency,
    handleTasksPageChange,
    handleActivitiesPageChange
  }
}
