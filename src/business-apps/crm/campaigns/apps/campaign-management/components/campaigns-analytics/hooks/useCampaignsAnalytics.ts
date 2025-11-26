import { useState, useCallback } from 'react'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignsAnalyticsQueries } from '../queries/CampaignsAnalyticsQueries'
import {
  CampaignsAnalyticsData,
  CampaignsAnalyticsMetrics,
  CampaignPerformanceComparison,
  CampaignsTimelineData,
  TopPerformingCampaign,
  TopPerformingEmployee,
  TimelinePeriod,
  TIMELINE_PERIODS
} from '../types/CampaignsAnalyticsTypes'

// Extend dayjs with required plugins
dayjs.extend(weekday)
dayjs.extend(advancedFormat)

// Internal types for campaign entities
interface EntityWithCreatedAt {
  createdAt: string
}

interface OpportunityWithStatus extends EntityWithCreatedAt {
  opportunityStatus?: {
    value: string
  } | null
  estimatedAmount?: number
}

interface CampaignWithEntities {
  id: string
  name: string
  createdAt: string
  startDate: string
  endDate: string
  lead?: EntityWithCreatedAt[]
  account?: EntityWithCreatedAt[]
  contact?: EntityWithCreatedAt[]
  opportunity?: OpportunityWithStatus[]
  leadAggregate?: { aggregate: { count: number } }
  accountAggregate?: { aggregate: { count: number } }
  contactAggregate?: { aggregate: { count: number } }
  opportunityAggregate?: { aggregate: { count: number } }
  wonOpportunityAggregate?: { aggregate: { count: number } }
  revenueAggregate?: { aggregate: { sum: { estimatedAmount: number | null } } }
}

interface EmployeeBasicInfo {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
}

// Note: Campaign type is now fetched directly from the type.value field in GraphQL

// Helper function to get campaign status
const getCampaignStatus = (startDate?: string, endDate?: string): string => {
  if (!startDate || !endDate) return 'Unknown'
  const now = dayjs()
  const start = dayjs(startDate)
  const end = dayjs(endDate)

  if (now.isBefore(start)) return 'Upcoming'
  if (now.isAfter(end)) return 'Completed'
  return 'Active'
}

// Helper function to calculate conversion rate
const calculateConversionRate = (converted: number, total: number): number => {
  return total > 0 ? (converted / total) * 100 : 0
}

// Helper function to calculate win rate
const calculateWinRate = (won: number, total: number): number => {
  return total > 0 ? (won / total) * 100 : 0
}

// Helper function to calculate campaign duration in days
const calculateDuration = (startDate: string, endDate: string): number => {
  return dayjs(endDate).diff(dayjs(startDate), 'day')
}

// Helper function to calculate start date based on timeline period
const getStartDateForPeriod = (period: TimelinePeriod): string => {
  const periodConfig = TIMELINE_PERIODS.find(p => p.value === period)
  if (!periodConfig) {
    // Default to historical (5 years)
    return dayjs().subtract(1825, 'day').format('YYYY-MM-DD')
  }
  return dayjs().subtract(periodConfig.days, 'day').format('YYYY-MM-DD')
}

// Helper to initialize daily data entry
const initializeDailyData = () => ({
  campaignsCreated: 0,
  leadsGenerated: 0,
  accountsCreated: 0,
  contactsCreated: 0,
  opportunitiesCreated: 0,
  dailyRevenue: 0
})

// Helper to ensure date exists in dailyData map
const ensureDateExists = (dailyData: Map<string, ReturnType<typeof initializeDailyData>>, date: string) => {
  if (!dailyData.has(date)) {
    dailyData.set(date, initializeDailyData())
  }
}

// Helper to process campaign entities and populate dailyData
const processCampaignEntities = (
  campaigns: CampaignWithEntities[],
  dailyData: Map<string, ReturnType<typeof initializeDailyData>>
) => {
  campaigns.forEach(campaign => {
    const campaignDate = dayjs(campaign.createdAt).format('YYYY-MM-DD')
    ensureDateExists(dailyData, campaignDate)
    dailyData.get(campaignDate)!.campaignsCreated += 1

    campaign.lead?.forEach(lead => {
      const leadDate = dayjs(lead.createdAt).format('YYYY-MM-DD')
      ensureDateExists(dailyData, leadDate)
      dailyData.get(leadDate)!.leadsGenerated += 1
    })

    campaign.account?.forEach(account => {
      const accountDate = dayjs(account.createdAt).format('YYYY-MM-DD')
      ensureDateExists(dailyData, accountDate)
      dailyData.get(accountDate)!.accountsCreated += 1
    })

    campaign.contact?.forEach(contact => {
      const contactDate = dayjs(contact.createdAt).format('YYYY-MM-DD')
      ensureDateExists(dailyData, contactDate)
      dailyData.get(contactDate)!.contactsCreated += 1
    })

    campaign.opportunity?.forEach(opportunity => {
      const opportunityDate = dayjs(opportunity.createdAt).format('YYYY-MM-DD')
      ensureDateExists(dailyData, opportunityDate)
      const dayOpportunityData = dailyData.get(opportunityDate)!
      dayOpportunityData.opportunitiesCreated += 1

      if (opportunity.opportunityStatus?.value === 'Won') {
        dayOpportunityData.dailyRevenue += opportunity.estimatedAmount || 0
      }
    })
  })
}

// Helper to extract aggregate counts from campaign - eliminates duplication
// Works with both CampaignWithEntities and metrics response campaigns
const extractAggregates = (campaign: {
  leadAggregate?: { aggregate: { count: number } }
  accountAggregate?: { aggregate: { count: number } }
  contactAggregate?: { aggregate: { count: number } }
  opportunityAggregate?: { aggregate: { count: number } }
  wonOpportunityAggregate?: { aggregate: { count: number; sum?: { estimatedAmount?: number | null } } }
  revenueAggregate?: { aggregate: { sum: { estimatedAmount?: number | null } } }
}) => ({
  leadsCount: campaign.leadAggregate?.aggregate.count || 0,
  accountsCount: campaign.accountAggregate?.aggregate.count || 0,
  contactsCount: campaign.contactAggregate?.aggregate.count || 0,
  opportunitiesCount: campaign.opportunityAggregate?.aggregate.count || 0,
  wonOpportunitiesCount: campaign.wonOpportunityAggregate?.aggregate.count || 0,
  totalRevenue:
    campaign.revenueAggregate?.aggregate.sum.estimatedAmount ||
    campaign.wonOpportunityAggregate?.aggregate.sum?.estimatedAmount ||
    0
})

// Generic helper to sort by revenue and assign ranks - eliminates duplication
// Creates a new sorted array to avoid mutating the original
const sortByRevenueAndRank = <T extends { totalRevenue: number }>(items: T[]): T[] => {
  return [...items].sort((a, b) => b.totalRevenue - a.totalRevenue).map((item, index) => ({ ...item, rank: index + 1 }))
}

// Helper to transform campaign data to CampaignPerformanceComparison
const transformCampaignData = (campaign: CampaignWithEntities): CampaignPerformanceComparison => {
  const aggregates = extractAggregates(campaign)

  return {
    campaignId: campaign.id,
    campaignName: campaign.name,
    status: getCampaignStatus(campaign.startDate, campaign.endDate),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    ...aggregates,
    conversionRate: calculateConversionRate(aggregates.accountsCount, aggregates.leadsCount),
    winRate: calculateWinRate(aggregates.wonOpportunitiesCount, aggregates.opportunitiesCount),
    duration: calculateDuration(campaign.startDate, campaign.endDate)
  }
}

// Helper to initialize employee performance data
const initializeEmployeeData = (employee: EmployeeBasicInfo) => ({
  id: employee.id,
  displayName: employee.displayName,
  firstName: employee.firstName,
  lastName: employee.lastName,
  campaignsCount: new Set<string>(),
  leadsCount: 0,
  accountsCount: 0,
  contactsCount: 0,
  opportunitiesCount: 0,
  wonOpportunitiesCount: 0,
  totalRevenue: 0,
  convertedLeads: 0
})

// Helper to ensure employee exists in map and returns the employee data
const ensureEmployeeExists = (
  employeeMap: Map<string, ReturnType<typeof initializeEmployeeData>>,
  employee: EmployeeBasicInfo
) => {
  if (!employeeMap.has(employee.id)) {
    employeeMap.set(employee.id, initializeEmployeeData(employee))
  }
  return employeeMap.get(employee.id)!
}

// Generic helper to process campaign entities and aggregate employee data
interface EntityWithOwner {
  ownerEmployee: EmployeeBasicInfo
  opportunityStatus?: { value: string } | null
  estimatedAmount?: number
  account?: unknown
}

const processEntitiesForEmployee = <T extends EntityWithOwner>(
  entities: T[],
  campaignId: string,
  employeeMap: Map<string, ReturnType<typeof initializeEmployeeData>>,
  entityType: 'lead' | 'account' | 'contact' | 'opportunity'
) => {
  for (const entity of entities) {
    const emp = ensureEmployeeExists(employeeMap, entity.ownerEmployee)
    emp.campaignsCount.add(campaignId)

    switch (entityType) {
      case 'lead':
        emp.leadsCount++
        if (entity.account) {
          emp.convertedLeads++
        }
        break
      case 'account':
        emp.accountsCount++
        break
      case 'contact':
        emp.contactsCount++
        break
      case 'opportunity':
        emp.opportunitiesCount++
        if (entity.opportunityStatus?.value === 'Won') {
          emp.wonOpportunitiesCount++
          emp.totalRevenue += entity.estimatedAmount || 0
        }
        break
    }
  }
}

// Helper to transform timeline data into CampaignsTimelineData array with cumulative values
const transformTimelineData = (campaigns: CampaignWithEntities[]): CampaignsTimelineData[] => {
  const timelineAnalysis: CampaignsTimelineData[] = []
  const dailyData = new Map<string, ReturnType<typeof initializeDailyData>>()

  // Process campaigns and their entities by creation date
  processCampaignEntities(campaigns, dailyData)

  // Convert to timeline array and calculate cumulative values
  const sortedDates = Array.from(dailyData.keys()).sort((a, b) => a.localeCompare(b))
  let cumulativeCampaigns = 0
  let cumulativeLeads = 0
  let cumulativeAccounts = 0
  let cumulativeContacts = 0
  let cumulativeOpportunities = 0
  let cumulativeRevenue = 0

  for (const date of sortedDates) {
    const dayData = dailyData.get(date)!
    cumulativeCampaigns += dayData.campaignsCreated
    cumulativeLeads += dayData.leadsGenerated
    cumulativeAccounts += dayData.accountsCreated
    cumulativeContacts += dayData.contactsCreated
    cumulativeOpportunities += dayData.opportunitiesCreated
    cumulativeRevenue += dayData.dailyRevenue

    timelineAnalysis.push({
      date,
      campaignsCreated: dayData.campaignsCreated,
      cumulativeCampaigns,
      leadsGenerated: dayData.leadsGenerated,
      cumulativeLeads,
      accountsCreated: dayData.accountsCreated,
      cumulativeAccounts,
      contactsCreated: dayData.contactsCreated,
      cumulativeContacts,
      opportunitiesCreated: dayData.opportunitiesCreated,
      cumulativeOpportunities,
      dailyRevenue: dayData.dailyRevenue,
      cumulativeRevenue
    })
  }

  return timelineAnalysis
}

export interface UseCampaignsAnalyticsOptions {
  timelinePeriod?: TimelinePeriod
}

export const useCampaignsAnalytics = (context: BusinessAppContextProps, options: UseCampaignsAnalyticsOptions = {}) => {
  const { timelinePeriod = 'last-year' } = options
  const [analyticsData, setAnalyticsData] = useState<CampaignsAnalyticsData>({
    metrics: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      upcomingCampaigns: 0,
      completedCampaigns: 0,
      totalLeads: 0,
      totalAccounts: 0,
      totalContacts: 0,
      totalOpportunities: 0,
      totalRevenue: 0,
      averageConversionRate: 0,
      averageWinRate: 0,
      averageCampaignDuration: 0
    },
    campaignComparisons: [],
    revenueComparisons: [],
    efficiencyComparisons: [],
    timelineAnalysis: [],
    topCampaigns: [],
    topEmployees: []
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isTimelineLoading, setIsTimelineLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timelineError, setTimelineError] = useState<string | null>(null)

  const {
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsRevenueAnalysis,
    fetchCampaignsEfficiencyAnalysis,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees
  } = useCampaignsAnalyticsQueries(context)

  // Separate function to load ONLY timeline data (for timeline period changes)
  const loadTimelineData = useCallback(async () => {
    setIsTimelineLoading(true)
    setTimelineError(null)

    try {
      const timelineStartDate = getStartDateForPeriod(timelinePeriod)

      const timelineResponse = await fetchCampaignsTimelineAnalysis(timelineStartDate)

      // Transform timeline analysis data using helper
      const timelineAnalysis = transformTimelineData(timelineResponse.campaigns)

      // Update ONLY timeline data, keep other analytics data unchanged
      setAnalyticsData(prev => ({
        ...prev,
        timelineAnalysis
      }))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setTimelineError(errorMessage)
    } finally {
      setIsTimelineLoading(false)
    }
  }, [timelinePeriod, fetchCampaignsTimelineAnalysis])

  // Full analytics load (for initial fetch)
  const loadAnalyticsData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Calculate start date for timeline filter
      const timelineStartDate = getStartDateForPeriod(timelinePeriod)

      // Fetch all data in parallel
      const [
        metricsResponse,
        performanceResponse,
        revenueResponse,
        efficiencyResponse,
        timelineResponse,
        topCampaignsResponse,
        topEmployeesResponse
      ] = await Promise.all([
        fetchCampaignsAnalyticsMetrics(),
        fetchCampaignsPerformanceComparison(),
        fetchCampaignsRevenueAnalysis(),
        fetchCampaignsEfficiencyAnalysis(),
        fetchCampaignsTimelineAnalysis(timelineStartDate),
        fetchTopPerformingCampaigns(),
        fetchTopPerformingEmployees()
      ])

      // Transform metrics data - aggregate from actual campaign entity counts
      let totalLeads = 0
      let totalAccounts = 0
      let totalContacts = 0
      let totalOpportunities = 0
      let totalRevenue = 0
      let totalWonOpportunities = 0

      // Aggregate actual entity counts from all campaigns
      for (const campaign of metricsResponse.campaigns) {
        const aggregates = extractAggregates(campaign)
        totalLeads += aggregates.leadsCount
        totalAccounts += aggregates.accountsCount
        totalContacts += aggregates.contactsCount
        totalOpportunities += aggregates.opportunitiesCount
        totalWonOpportunities += aggregates.wonOpportunitiesCount
        totalRevenue += aggregates.totalRevenue
      }

      const metrics: CampaignsAnalyticsMetrics = {
        totalCampaigns: metricsResponse.totalCampaigns.aggregate.count,
        activeCampaigns: metricsResponse.activeCampaigns.aggregate.count,
        upcomingCampaigns: metricsResponse.upcomingCampaigns.aggregate.count,
        completedCampaigns: metricsResponse.completedCampaigns.aggregate.count,
        totalLeads,
        totalAccounts,
        totalContacts,
        totalOpportunities,
        totalRevenue,
        averageConversionRate: calculateConversionRate(totalAccounts, totalLeads),
        averageWinRate: calculateWinRate(totalWonOpportunities, totalOpportunities),
        averageCampaignDuration: 0 // Will be calculated from performance data
      }

      // Transform campaign performance comparison data using helper
      const campaignComparisons: CampaignPerformanceComparison[] =
        performanceResponse.campaigns.map(transformCampaignData)

      // Calculate average campaign duration from campaign comparisons
      // Note: Keep the overall averageWinRate and averageConversionRate from the aggregated totals above
      if (campaignComparisons.length > 0) {
        metrics.averageCampaignDuration =
          campaignComparisons.reduce((sum, campaign) => sum + campaign.duration, 0) / campaignComparisons.length
      }

      // Transform revenue analysis data using helper
      const revenueComparisons: CampaignPerformanceComparison[] = revenueResponse.campaigns.map(transformCampaignData)

      // Transform efficiency analysis data using helper
      const efficiencyComparisons: CampaignPerformanceComparison[] =
        efficiencyResponse.campaigns.map(transformCampaignData)

      // Transform timeline analysis data using helper
      const timelineAnalysis = transformTimelineData(timelineResponse.campaigns)

      // Transform top performing campaigns data using extractAggregates helper
      const unsortedTopCampaigns = topCampaignsResponse.campaigns.map((campaign, index) => {
        const aggregates = extractAggregates(campaign)

        return {
          campaignId: campaign.id,
          campaignName: campaign.name,
          campaignType: campaign.type?.value || 'Unknown',
          status: getCampaignStatus(campaign.startDate, campaign.endDate),
          ...aggregates,
          conversionRate: calculateConversionRate(aggregates.accountsCount, aggregates.leadsCount),
          winRate: calculateWinRate(aggregates.wonOpportunitiesCount, aggregates.opportunitiesCount),
          rank: index + 1
        }
      })

      const topCampaigns: TopPerformingCampaign[] = sortByRevenueAndRank(unsortedTopCampaigns)

      // Transform top performing employees data using helper
      const employeeMap = new Map<string, ReturnType<typeof initializeEmployeeData>>()

      // Process each campaign and aggregate employee data using generic helper
      for (const campaign of topEmployeesResponse.campaigns) {
        processEntitiesForEmployee(campaign.lead, campaign.id, employeeMap, 'lead')
        processEntitiesForEmployee(campaign.account, campaign.id, employeeMap, 'account')
        processEntitiesForEmployee(campaign.contact, campaign.id, employeeMap, 'contact')
        processEntitiesForEmployee(campaign.opportunity, campaign.id, employeeMap, 'opportunity')
      }

      // Convert to final format and sort
      const unsortedTopEmployees = Array.from(employeeMap.values()).map((employee, index) => ({
        employeeId: employee.id,
        employeeName: employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim(),
        campaignsCount: employee.campaignsCount.size,
        leadsCount: employee.leadsCount,
        accountsCount: employee.accountsCount,
        contactsCount: employee.contactsCount,
        opportunitiesCount: employee.opportunitiesCount,
        wonOpportunitiesCount: employee.wonOpportunitiesCount,
        totalRevenue: employee.totalRevenue,
        averageConversionRate: calculateConversionRate(employee.convertedLeads, employee.leadsCount),
        averageWinRate: calculateWinRate(employee.wonOpportunitiesCount, employee.opportunitiesCount),
        rank: index + 1
      }))

      const topEmployees: TopPerformingEmployee[] = sortByRevenueAndRank(unsortedTopEmployees)

      // Update state with transformed data
      setAnalyticsData({
        metrics,
        campaignComparisons,
        revenueComparisons,
        efficiencyComparisons,
        timelineAnalysis,
        topCampaigns,
        topEmployees
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [
    fetchCampaignsAnalyticsMetrics,
    fetchCampaignsPerformanceComparison,
    fetchCampaignsTimelineAnalysis,
    fetchTopPerformingCampaigns,
    fetchTopPerformingEmployees,
    timelinePeriod // Note: This is used for initial load, but timeline changes use loadTimelineData
  ])

  // Don't auto-fetch on mount - let parent component control when to fetch
  // This improves performance by only fetching analytics when the Analytics tab is active
  // (No auto-fetch effect needed)

  const refetch = useCallback(() => {
    loadAnalyticsData()
  }, [loadAnalyticsData])

  // Expose loadAnalyticsData as fetchAnalytics for initial load
  const fetchAnalytics = useCallback(() => {
    if (context.accessToken) {
      loadAnalyticsData()
    }
  }, [context.accessToken, loadAnalyticsData])

  return {
    analyticsData,
    isLoading,
    isTimelineLoading,
    error,
    timelineError,
    refetch,
    fetchAnalytics,
    refetchTimeline: loadTimelineData
  }
}
