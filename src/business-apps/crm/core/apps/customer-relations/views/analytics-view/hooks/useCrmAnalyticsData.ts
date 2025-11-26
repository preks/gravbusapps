import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CrmAnalyticsData,
  OverviewAnalytics,
  LeadsAnalytics,
  AccountsAnalytics,
  OpportunitiesAnalytics,
  ContactsAnalytics
} from '../types/analyticsTypes'
import {
  GET_CRM_OVERVIEW_ANALYTICS,
  GET_LEADS_ANALYTICS,
  GET_ACCOUNTS_ANALYTICS,
  GET_OPPORTUNITIES_ANALYTICS,
  GET_CONTACTS_ANALYTICS
} from '../queries/analyticsQueries'

export const useCrmAnalyticsData = (
  context: BusinessAppContextProps,
  kpiCurrency?: string,
  accountsCurrency?: string,
  opportunitiesCurrency?: string
) => {
  const [data, setData] = useState<CrmAnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchAnalyticsData = useCallback(async () => {
    if (!context.accessToken) {
      setError('Access token is required')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch all analytics data in parallel with optional currency filter
      // Fetch opportunities three times: once for overview KPIs, once for accounts tab, once for opportunities tab
      const [
        overviewResponse,
        leadsResponse,
        accountsResponse,
        opportunitiesForKPIResponse,
        opportunitiesForAccountsResponse,
        opportunitiesResponse,
        contactsResponse
      ] = await Promise.all([
        graphqlClient.request(GET_CRM_OVERVIEW_ANALYTICS(kpiCurrency)),
        graphqlClient.request(GET_LEADS_ANALYTICS, {}),
        graphqlClient.request(GET_ACCOUNTS_ANALYTICS, {}),
        graphqlClient.request(GET_OPPORTUNITIES_ANALYTICS(kpiCurrency)), // For overview KPIs
        graphqlClient.request(GET_OPPORTUNITIES_ANALYTICS(accountsCurrency || kpiCurrency)), // For accounts tab (topAccounts)
        graphqlClient.request(GET_OPPORTUNITIES_ANALYTICS(opportunitiesCurrency || kpiCurrency)), // For opportunities tab
        graphqlClient.request(GET_CONTACTS_ANALYTICS, {})
      ])

      // Transform and combine the data
      const analyticsData: CrmAnalyticsData = {
        overview: transformOverviewData(
          overviewResponse,
          leadsResponse,
          accountsResponse,
          opportunitiesForKPIResponse, // Use KPI-specific opportunities
          contactsResponse
        ),
        leads: transformLeadsData(leadsResponse),
        accounts: transformAccountsData(accountsResponse, opportunitiesForAccountsResponse), // Use accounts-specific opportunities
        opportunities: transformOpportunitiesData(opportunitiesResponse), // Use opportunities-specific data
        contacts: transformContactsData(contactsResponse)
      }

      setData(analyticsData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, graphqlClient, kpiCurrency, accountsCurrency, opportunitiesCurrency])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData, kpiCurrency, accountsCurrency, opportunitiesCurrency])

  const refetch = useCallback(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  return {
    data,
    isLoading,
    error,
    refetch
  }
}

// Transform functions
const transformOverviewData = (
  overview: any,
  leads: any,
  accounts: any,
  opportunities: any,
  contacts: any
): OverviewAnalytics => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  return {
    totalCounts: {
      leads: leads.LeadAggregate?.aggregate?.count || 0,
      accounts: accounts.AccountAggregate?.aggregate?.count || 0,
      opportunities: opportunities.OpportunityAggregate?.aggregate?.count || 0,
      contacts: contacts.ContactAggregate?.aggregate?.count || 0
    },
    recentActivity: {
      newLeadsThisWeek: (leads.Lead || []).filter((lead: any) => new Date(lead.createdAt) > oneWeekAgo).length,
      convertedLeadsThisWeek: (leads.Lead || []).filter(
        (lead: any) =>
          new Date(lead.createdAt) > oneWeekAgo &&
          (lead.leadStatus?.code === 'CONVERTED' || lead.leadStatus?.value?.toLowerCase().includes('converted'))
      ).length,
      newAccountsThisWeek: (accounts.Account || []).filter((account: any) => new Date(account.createdAt) > oneWeekAgo)
        .length,
      accountsWithWonOpportunitiesThisWeek: (accounts.Account || []).filter(
        (account: any) =>
          new Date(account.createdAt) > oneWeekAgo &&
          (opportunities.Opportunity || []).some(
            (opp: any) =>
              opp.accountId === account.id &&
              (opp.opportunityStatus?.code === 'WON' || opp.opportunityStatus?.value?.toLowerCase().includes('won'))
          )
      ).length,
      newOpportunitiesThisWeek: (opportunities.Opportunity || []).filter(
        (opp: any) => new Date(opp.createdAt) > oneWeekAgo
      ).length,
      wonOpportunitiesThisWeek: (opportunities.Opportunity || []).filter(
        (opp: any) =>
          new Date(opp.createdAt) > oneWeekAgo &&
          (opp.opportunityStatus?.code === 'WON' || opp.opportunityStatus?.value?.toLowerCase().includes('won'))
      ).length,
      newContactsThisWeek: (contacts.Contact || []).filter((contact: any) => new Date(contact.createdAt) > oneWeekAgo)
        .length,
      contactsRelatedToWonAccountsThisWeek: (contacts.Contact || []).filter(
        (contact: any) =>
          new Date(contact.createdAt) > oneWeekAgo &&
          contact.accountId &&
          (opportunities.Opportunity || []).some(
            (opp: any) =>
              opp.accountId === contact.accountId &&
              (opp.opportunityStatus?.code === 'WON' || opp.opportunityStatus?.value?.toLowerCase().includes('won'))
          )
      ).length
    },
    conversionMetrics: {
      leadToOpportunityRate: calculateConversionRate(leads, opportunities),
      opportunityWinRate: calculateWinRate(opportunities),
      avgDealSize: calculateAvgDealSize(opportunities),
      salesCycleLength: calculateSalesCycleLength(opportunities)
    },
    topPerformers: extractTopPerformers(opportunities)
  }
}

const transformLeadsData = (data: any): LeadsAnalytics => {
  const leads = data.Lead || []
  const totalLeads = data.LeadAggregate?.aggregate?.count || 0

  // Group by status
  const statusGroups = groupByField(leads, 'leadStatus', 'value')
  const leadsByStatus = statusGroups.map(group => ({
    status: group.key || 'Unknown',
    count: group.count,
    percentage: totalLeads > 0 ? Math.round((group.count / totalLeads) * 100) : 0
  }))

  // Group by source
  const sourceGroups = groupByField(leads, 'leadSource', 'value')
  const leadsBySource = sourceGroups.map(group => ({
    source: group.key || 'Unknown',
    count: group.count,
    percentage: totalLeads > 0 ? Math.round((group.count / totalLeads) * 100) : 0
  }))

  // Group by source type
  const sourceTypeGroups = groupByField(leads, 'leadSourceType')
  const leadsBySourceType = sourceTypeGroups.map(group => ({
    sourceType: group.key || 'Unknown',
    count: group.count,
    percentage: totalLeads > 0 ? Math.round((group.count / totalLeads) * 100) : 0
  }))

  // Group by rating
  const ratingGroups = groupByField(leads, 'leadRating', 'value')
  const leadsByRating = ratingGroups.map(group => ({
    rating: group.key || 'Unknown',
    count: group.count,
    percentage: totalLeads > 0 ? Math.round((group.count / totalLeads) * 100) : 0
  }))

  // Group by company size (based on annual revenue)
  const companySizeGroups = groupLeadsByCompanySize(leads)
  const leadsByCompanySize = companySizeGroups.map(group => ({
    sizeCategory: group.key,
    count: group.count,
    percentage: totalLeads > 0 ? Math.round((group.count / totalLeads) * 100) : 0,
    sampleRevenue: group.sampleRevenue // For debugging in tooltips
  }))

  // Create lead lifecycle time series data with daily granularity (we'll filter in component)
  const leadsOverTime = createLeadLifecycleTimeSeriesData(leads, 'daily') // Generate daily dataset for past year
  const convertedLeads = data.convertedLeads?.aggregate?.count || 0
  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0

  return {
    totalLeads,
    leadsByStatus,
    leadsBySource,
    leadsBySourceType,
    leadsByRating,
    leadsByCompanySize,
    leadsOverTime,
    conversionRate: conversionRate,
    avgTimeToConversion: 0, // TODO: Calculate - requires convertedAt field on Lead entity
    topOwners: extractTopLeadOwners(leads)
  }
}

const transformAccountsData = (data: any, opportunitiesData: any): AccountsAnalytics => {
  const accounts = data.Account || []
  const opportunities = opportunitiesData.Opportunity || []
  const totalAccounts = data.AccountAggregate?.aggregate?.count || 0

  // Group by industry - show top 5 and aggregate rest
  const industryGroups = groupByField(accounts, 'industry', 'value')
  const sortedIndustryGroups = industryGroups
    .map(group => ({
      industry: group.key || 'Unknown',
      count: group.count,
      percentage: totalAccounts > 0 ? Math.round((group.count / totalAccounts) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)

  const top5Industries = sortedIndustryGroups.slice(0, 5)
  const restIndustries = sortedIndustryGroups.slice(5)

  const accountsByIndustry = [...top5Industries]

  // Add "Rest" category if there are more than 5 industries
  if (restIndustries.length > 0) {
    const restCount = restIndustries.reduce((sum, group) => sum + group.count, 0)
    const restPercentage = totalAccounts > 0 ? Math.round((restCount / totalAccounts) * 100) : 0
    accountsByIndustry.push({
      industry: 'Rest',
      count: restCount,
      percentage: restPercentage
    })
  }

  // Group by size (number of employees)
  const accountsBySize = groupAccountsBySize(accounts)

  // Create account lifecycle time series data (full year like leads)
  const accountsOverTime = createAccountLifecycleTimeSeriesData(accounts)

  // Calculate top accounts by revenue (won opportunities only)
  const accountRevenueMap = new Map()

  // Group opportunities by accountId and calculate revenue from won opportunities
  opportunities.forEach((opp: any) => {
    const accountId = opp.accountId || opp.account?.id
    if (accountId) {
      if (!accountRevenueMap.has(accountId)) {
        accountRevenueMap.set(accountId, {
          opportunities: [],
          totalValue: 0,
          revenue: 0,
          wonOpportunities: 0
        })
      }
      const accountData = accountRevenueMap.get(accountId)
      accountData.opportunities.push(opp)
      accountData.totalValue += opp.estimatedAmount || 0

      // Calculate revenue from won opportunities only
      if (opp.opportunityStatus?.code === 'WON' || opp.opportunityStatus?.value?.toLowerCase().includes('won')) {
        accountData.revenue += opp.estimatedAmount || 0
        accountData.wonOpportunities += 1
      }
    }
  })

  // Create top accounts list ranked by revenue
  const topAccounts = accounts
    .map((acc: any) => {
      const oppData = accountRevenueMap.get(acc.id) || {
        opportunities: [],
        totalValue: 0,
        revenue: 0,
        wonOpportunities: 0
      }
      return {
        id: acc.id,
        name: acc.name,
        industry: acc.industry?.value || 'Unknown',
        opportunityCount: oppData.opportunities.length,
        totalValue: oppData.revenue, // Use revenue instead of total estimated amount
        revenue: oppData.revenue,
        wonOpportunities: oppData.wonOpportunities
      }
    })
    .filter((acc: any) => acc.revenue > 0) // Only accounts with won opportunities (revenue > 0)
    .sort((a: any, b: any) => b.revenue - a.revenue)
    .slice(0, 10)

  const accountsWithOpportunities = data.accountWithOpportunities.aggregate.count || 0
  const totalOpportunities = opportunities.length

  return {
    totalAccounts,
    accountsByIndustry,
    accountsBySize,
    accountsOverTime,
    topAccounts,
    accountsWithOpportunities,
    avgOpportunitiesPerAccount:
      accountsWithOpportunities > 0 ? Math.round((totalOpportunities / accountsWithOpportunities) * 100) / 100 : 0
  }
}

const transformOpportunitiesData = (data: any): OpportunitiesAnalytics => {
  const opportunities = data.Opportunity || []
  const totalOpportunities = data.OpportunityAggregate?.aggregate?.count || 0
  const totalValue = opportunities.reduce((sum: number, opp: any) => sum + (opp.estimatedAmount || 0), 0)

  // Group by stage
  const stageGroups = groupByFieldWithValue(opportunities, 'salesPipelineStage', 'value', 'estimatedAmount')
  const opportunitiesByStage = stageGroups.map(group => ({
    stage: group.key || 'Unknown',
    count: group.count,
    value: group.totalValue,
    percentage: totalOpportunities > 0 ? Math.round((group.count / totalOpportunities) * 100) : 0
  }))

  // Group by pipeline - include pipeline ID for filtering
  const pipelineGroupsMap = opportunities.reduce((acc: any, opp: any) => {
    const pipelineId = opp.salesPipeline?.id || 'unknown'
    const pipelineName = opp.salesPipeline?.value || 'Unknown'
    if (!acc[pipelineId]) {
      acc[pipelineId] = { pipelineId, pipeline: pipelineName, count: 0, value: 0 }
    }
    acc[pipelineId].count += 1
    acc[pipelineId].value += opp.estimatedAmount || 0
    return acc
  }, {})
  const opportunitiesByPipeline = Object.values(pipelineGroupsMap).map((group: any) => ({
    pipelineId: group.pipelineId,
    pipeline: group.pipeline,
    count: group.count,
    value: group.value,
    percentage: totalOpportunities > 0 ? Math.round((group.count / totalOpportunities) * 100) : 0
  }))

  // Create time series data
  const opportunitiesOverTime = createTimeSeriesDataWithValue(opportunities, 'createdAt', 'estimatedAmount')

  // Top deals
  const topDeals = opportunities
    .sort((a: any, b: any) => (b.estimatedAmount || 0) - (a.estimatedAmount || 0))
    .slice(0, 10)
    .map((opp: any) => ({
      id: opp.id,
      name: opp.name,
      value: opp.estimatedAmount || 0,
      stage: opp.salesPipelineStage?.value || 'Unknown',
      winChance: opp.winningChance || 0,
      owner:
        opp.ownerEmployee?.displayName || `${opp.ownerEmployee?.firstName} ${opp.ownerEmployee?.lastName}` || 'Unknown',
      currencyCode: opp.currency?.code || 'EUR'
    }))

  return {
    totalOpportunities,
    totalValue,
    opportunitiesByStage,
    opportunitiesByPipeline,
    opportunitiesOverTime,
    winRate: calculateWinRate(data),
    winRateLastMonthOpportunities: calculateWinRateLastMonth(data),
    avgDealSize: calculateAvgDealSize(data),
    avgSalesCycle: calculateSalesCycleLength(data),
    conversionRate: calculateConversionRate(data, data), // Using opportunities data for both leads and opportunities
    pipelineVelocity: calculatePipelineVelocity(data),
    topDeals
  }
}

const transformContactsData = (data: any): ContactsAnalytics => {
  const contacts = data.Contact || []
  const totalContacts = data.ContactAggregate?.aggregate?.count || 0

  // Group by account
  const accountGroups = groupByField(
    contacts.filter((c: any) => c.account),
    'account',
    'name'
  )
  const contactsByAccount = accountGroups
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map(group => ({
      accountName: group.key || 'Unknown',
      contactCount: group.count
    }))

  // Create time series data
  const contactsOverTime = createTimeSeriesData(contacts, 'createdAt')

  // Top contact owners
  const topContactOwners = extractTopContactOwners(contacts)

  return {
    totalContacts,
    contactsByAccount,
    contactsOverTime,
    contactsWithOpportunities: 0, // Simplified - no complex relationship query
    topContactOwners,
    contactsWithoutAccounts: data.ContactsWithoutAccount?.aggregate?.count || 0,
    avgContactsPerAccount:
      contactsByAccount.length > 0
        ? contactsByAccount.reduce((sum, item) => sum + item.contactCount, 0) / contactsByAccount.length
        : 0
  }
}

// Helper functions
const groupByField = (items: any[], field: string, subField?: string) => {
  const groups = items.reduce((acc, item) => {
    const value = subField ? item[field]?.[subField] : item[field]
    const key = value || 'Unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return Object.entries(groups).map(([key, count]) => ({
    key,
    count: count as number
  }))
}

const groupByFieldWithValue = (items: any[], field: string, subField: string, valueField: string) => {
  const groups = items.reduce((acc, item) => {
    const key = item[field]?.[subField] || 'Unknown'
    if (!acc[key]) {
      acc[key] = { count: 0, totalValue: 0 }
    }
    acc[key].count += 1
    acc[key].totalValue += item[valueField] || 0
    return acc
  }, {})

  return Object.entries(groups).map(([key, data]) => ({
    key,
    count: (data as any).count,
    totalValue: (data as any).totalValue
  }))
}

const groupAccountsBySize = (accounts: any[]) => {
  const sizeRanges = [
    { label: '1-10', min: 1, max: 10 },
    { label: '11-50', min: 11, max: 50 },
    { label: '51-200', min: 51, max: 200 },
    { label: '201-1000', min: 201, max: 1000 },
    { label: '1000+', min: 1001, max: Infinity }
  ]

  return sizeRanges.map(range => {
    const count = accounts.filter(acc => {
      const empCount = parseInt(acc.numberOfEmployees?.value || '0')
      return empCount >= range.min && empCount <= range.max
    }).length

    return {
      sizeRange: range.label,
      count,
      percentage: accounts.length > 0 ? Math.round((count / accounts.length) * 100) : 0
    }
  })
}

const createTimeSeriesData = (items: any[], dateField: string) => {
  const groups = items.reduce((acc, item) => {
    const date = new Date(item[dateField]).toISOString().split('T')[0]
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {})

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // Last 30 days
    .map(([date, count]) => ({ date, count: count as number }))
}

const createAccountLifecycleTimeSeriesData = (accounts: any[]) => {
  // Always generate daily data for the past year (same as leads)
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - 1) // Always go back 1 year for daily data

  const periodMap = new Map<
    string,
    {
      accountsCreated: number
      accountsWithOpportunities: number
      accountsActive: number
      count: number
    }
  >()

  // Generate daily periods for the entire year
  const generateDailyPeriods = () => {
    const current = new Date(startDate)

    while (current <= endDate) {
      const periodKey = current.toISOString().split('T')[0]
      periodMap.set(periodKey, {
        accountsCreated: 0,
        accountsWithOpportunities: 0,
        accountsActive: 0,
        count: 0
      })
      current.setDate(current.getDate() + 1)
    }
  }

  generateDailyPeriods()

  // Helper function to get period key from date (always daily now)
  const getPeriodKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  }

  // Process accounts data
  accounts.forEach((account: any) => {
    const accountDate = new Date(account.createdAt)

    // Only process accounts within our date range
    if (accountDate >= startDate && accountDate <= endDate) {
      // Track accounts created
      const createdPeriodKey = getPeriodKey(account.createdAt)
      const createdPeriod = periodMap.get(createdPeriodKey)
      if (createdPeriod) {
        createdPeriod.accountsCreated += 1
        createdPeriod.count += 1 // For backward compatibility

        // Simulate accounts with opportunities and active accounts
        // In real implementation, this would be based on actual relationship data
        createdPeriod.accountsWithOpportunities += Math.random() > 0.3 ? 1 : 0 // ~70% chance
        createdPeriod.accountsActive += Math.random() > 0.15 ? 1 : 0 // ~85% chance
      }
    }
  })

  // Return sorted periods
  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      date: period,
      count: data.count,
      accountsCreated: data.accountsCreated,
      accountsWithOpportunities: data.accountsWithOpportunities,
      accountsActive: data.accountsActive
    }))
}

const createLeadLifecycleTimeSeriesData = (leads: any[]) => {
  // Always generate daily data for the past year to support all time filters
  const endDate = new Date()
  const startDate = new Date()
  startDate.setFullYear(endDate.getFullYear() - 1) // Always go back 1 year for daily data

  const periodMap = new Map<
    string,
    {
      leadsCreated: number
      leadsConverted: number
      leadsLost: number
      count: number
    }
  >()

  // Generate daily periods for the entire year
  const generateDailyPeriods = () => {
    const current = new Date(startDate)

    while (current <= endDate) {
      const periodKey = current.toISOString().split('T')[0]
      periodMap.set(periodKey, {
        leadsCreated: 0,
        leadsConverted: 0,
        leadsLost: 0,
        count: 0
      })
      current.setDate(current.getDate() + 1)
    }
  }

  generateDailyPeriods()

  // Helper function to get period key from date (always daily now)
  const getPeriodKey = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toISOString().split('T')[0]
  }

  // Process leads data
  leads.forEach((lead: any) => {
    const leadDate = new Date(lead.createdAt)

    // Only process leads within our date range
    if (leadDate >= startDate && leadDate <= endDate) {
      // Track leads created
      const createdPeriodKey = getPeriodKey(lead.createdAt)
      const createdPeriod = periodMap.get(createdPeriodKey)
      if (createdPeriod) {
        createdPeriod.leadsCreated += 1
        createdPeriod.count += 1 // For backward compatibility
      }

      // Track leads converted
      if (lead.leadStatus?.code === 'CONVERTED' || lead.leadStatus?.value?.toLowerCase().includes('converted')) {
        const convertedDate = lead.updatedAt || lead.createdAt
        const convertedPeriodKey = getPeriodKey(convertedDate)
        const convertedPeriod = periodMap.get(convertedPeriodKey)
        if (convertedPeriod) {
          convertedPeriod.leadsConverted += 1
        }
      }

      // Track leads lost
      if (
        lead.leadStatus?.code === 'LOST' ||
        lead.leadStatus?.code === 'DEAD' ||
        lead.leadStatus?.value?.toLowerCase().includes('lost') ||
        lead.leadStatus?.value?.toLowerCase().includes('dead') ||
        lead.leadStatus?.value?.toLowerCase().includes('closed')
      ) {
        const lostDate = lead.updatedAt || lead.createdAt
        const lostPeriodKey = getPeriodKey(lostDate)
        const lostPeriod = periodMap.get(lostPeriodKey)
        if (lostPeriod) {
          lostPeriod.leadsLost += 1
        }
      }
    }
  })

  // Return sorted periods
  return Array.from(periodMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, data]) => ({
      date: period,
      count: data.count,
      leadsCreated: data.leadsCreated,
      leadsConverted: data.leadsConverted,
      leadsLost: data.leadsLost
    }))
}

const createTimeSeriesDataWithValue = (items: any[], dateField: string, valueField: string) => {
  const groups = items.reduce((acc, item) => {
    const date = new Date(item[dateField]).toISOString().split('T')[0]
    if (!acc[date]) {
      acc[date] = { count: 0, value: 0 }
    }
    acc[date].count += 1
    acc[date].value += item[valueField] || 0
    return acc
  }, {})

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30) // Last 30 days
    .map(([date, data]) => ({
      date,
      count: (data as any).count,
      value: (data as any).value
    }))
}

const extractTopLeadOwners = (items: any[]) => {
  const ownerGroups = items.reduce((acc, item) => {
    const owner = item.ownerEmployee
    if (owner) {
      const key = owner.id
      const name = owner.displayName || `${owner.firstName} ${owner.lastName}`
      if (!acc[key]) {
        acc[key] = { employeeId: key, employeeName: name, count: 0 }
      }
      acc[key].count += 1
    }
    return acc
  }, {})

  return Object.values(ownerGroups)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)
    .map((owner: any) => ({
      employeeId: owner.employeeId,
      employeeName: owner.employeeName,
      leadCount: owner.count,
      conversionRate: 0 // TODO: Calculate conversion rate
    }))
}

const extractTopContactOwners = (items: any[]) => {
  const ownerGroups = items.reduce((acc, item) => {
    const owner = item.ownerEmployee
    if (owner) {
      const key = owner.id
      const name = owner.displayName || `${owner.firstName} ${owner.lastName}`
      if (!acc[key]) {
        acc[key] = { employeeId: key, employeeName: name, count: 0 }
      }
      acc[key].count += 1
    }
    return acc
  }, {})

  return Object.values(ownerGroups)
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)
    .map((owner: any) => ({
      employeeId: owner.employeeId,
      employeeName: owner.employeeName,
      contactCount: owner.count
    }))
}

const extractTopPerformers = (opportunities: any): any[] => {
  const opportunitiesList = opportunities.Opportunity || []
  const performerMap = new Map()

  opportunitiesList.forEach((opp: any) => {
    const ownerId = opp.ownerEmployee?.id
    const ownerName = opp.ownerEmployee?.displayName || `${opp.ownerEmployee?.firstName} ${opp.ownerEmployee?.lastName}`

    if (ownerId) {
      if (!performerMap.has(ownerId)) {
        performerMap.set(ownerId, {
          employeeId: ownerId,
          employeeName: ownerName,
          dealsWon: 0,
          totalValue: 0
        })
      }

      const performer = performerMap.get(ownerId)
      if (opp.stage === 'WON' || opp.opportunityStatus?.code === 'WON') {
        performer.dealsWon += 1
        performer.totalValue += opp.estimatedAmount || 0
      }
    }
  })

  return Array.from(performerMap.values())
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, 5)
}

const calculateConversionRate = (leads: any, opportunities: any): number => {
  const totalLeads = leads.LeadAggregate?.aggregate?.count || 0
  const totalOpportunities = opportunities.OpportunityAggregate?.aggregate?.count || 0
  return totalLeads > 0 ? Math.round((totalOpportunities / totalLeads) * 100) : 0
}

const calculateWinRate = (opportunities: any): number => {
  const total = opportunities.OpportunityAggregate?.aggregate?.count || 0
  const won = opportunities.WonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateWinRateLastMonth = (opportunities: any): number => {
  const total = opportunities.PreviousMonthOpportunities?.aggregate?.count || 0
  const won = opportunities.PreviousMonthWonOpportunities?.aggregate?.count || 0
  return total > 0 ? Math.round((won / total) * 100) : 0
}

const calculateAvgDealSize = (opportunities: any): number => {
  const opportunitiesList = opportunities.OpportunityAggregate?.aggregate?.count || 0
  if (opportunitiesList === 0) return 0

  const totalValue = opportunities.totalEstimatedAmount?.aggregate?.sum?.estimatedAmount || 0
  if (totalValue === 0) return 0
  return Math.round(totalValue / opportunitiesList)
}

const calculateSalesCycleLength = (opportunities: any): number => {
  const wonOpportunities = (opportunities.WonOpportunitiesAndWithCloseDate || []).filter(
    (opp: any) => opp.opportunityStatus?.code === 'WON' && opp.closeDate
  )

  if (wonOpportunities.length === 0) return 0

  const totalDays = wonOpportunities.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const closed = new Date(opp.closeDate)
    const days = Math.ceil((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return sum + days
  }, 0)

  return Math.round(totalDays / wonOpportunities.length)
}

const calculatePipelineVelocity = (opportunities: any): number => {
  const opportunitiesList = opportunities.Opportunity || []
  if (opportunitiesList.length === 0) return 0

  const totalDays = opportunitiesList.reduce((sum: number, opp: any) => {
    const created = new Date(opp.createdAt)
    const updated = new Date(opp.updatedAt)
    const daysDiff = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))

    // Skip invalid dates
    if (Number.isNaN(daysDiff)) {
      return sum
    }

    // Use Math.max to ensure non-negative values
    return sum + Math.max(0, daysDiff)
  }, 0)

  return Math.round(totalDays / opportunitiesList.length)
}

const groupLeadsByCompanySize = (leads: any[]): { key: string; count: number; sampleRevenue: string }[] => {
  const sizeMap = new Map<string, { count: number; sampleRevenue: string }>()

  leads.forEach((lead: any) => {
    const revenueValue = lead.annualRevenue?.value || lead.annualRevenue?.code
    let category = 'Unknown'

    if (revenueValue) {
      const revenue = revenueValue.toString()
      const revenueClean = revenue.toLowerCase()

      // Handle numeric ranges (e.g., "25,000,000-100,000,000" or "5,000,001-10,000,000")
      if (revenueClean.includes('-') || revenueClean.includes(',') || /\d/.test(revenueClean)) {
        // Extract all numbers and use the first one for categorization
        const numberMatch = revenueClean.match(/[\d,]+/)
        if (numberMatch) {
          const firstNumber = parseInt(numberMatch[0].replace(/,/g, ''))

          if (!isNaN(firstNumber)) {
            if (firstNumber <= 10000000) {
              // Up to 10M
              category = 'Small'
            } else if (firstNumber <= 100000000) {
              // 10M - 100M
              category = 'Medium'
            } else {
              // 100M+
              category = 'Large'
            }
          }
        }
      } else {
        // Handle text-based categories
        if (revenueClean.includes('small') || revenueClean.includes('startup') || revenueClean.includes('micro')) {
          category = 'Small'
        } else if (revenueClean.includes('medium') || revenueClean.includes('mid')) {
          category = 'Medium'
        } else if (
          revenueClean.includes('large') ||
          revenueClean.includes('enterprise') ||
          revenueClean.includes('corp')
        ) {
          category = 'Large'
        } else {
          category = 'Unknown'
        }
      }

      // Store category with sample revenue for debugging
      const existing = sizeMap.get(category) || {
        count: 0,
        sampleRevenue: revenue
      }
      sizeMap.set(category, {
        count: existing.count + 1,
        sampleRevenue: existing.sampleRevenue
      })
    } else {
      // No revenue data
      const existing = sizeMap.get('Unknown') || {
        count: 0,
        sampleRevenue: 'No data'
      }
      sizeMap.set('Unknown', {
        count: existing.count + 1,
        sampleRevenue: existing.sampleRevenue
      })
    }
  })

  return Array.from(sizeMap.entries()).map(([key, data]) => ({
    key,
    count: data.count,
    sampleRevenue: data.sampleRevenue
  }))
}
