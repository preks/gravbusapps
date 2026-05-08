export interface OverviewTrendData {
  // Last 30 days vs Previous 30 days for entity counts
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  totalAccountsThisMonth: number
  totalAccountsLastMonth: number
  totalOpportunitiesThisMonth: number
  totalOpportunitiesLastMonth: number
  totalContactsThisMonth: number
  totalContactsLastMonth: number
  // Won opportunities trend
  currentMonthWonOpportunities: number
  previousMonthWonOpportunities: number
  // Conversion metrics trend
  currentMonthLeadConversionRate: number
  previousMonthLeadConversionRate: number
  currentMonthAvgDealSize: number
  previousMonthAvgDealSize: number
  currentMonthSalesCycleLength: number
  previousMonthSalesCycleLength: number
  // Compatibility fields
  currentMonthLeads: number
  previousMonthLeads: number
  currentMonthAccounts: number
  previousMonthAccounts: number
  [key: string]: number // For additional dynamic fields
}

export interface CrmAnalyticsData {
  overview: OverviewAnalytics
  overviewTrendData?: OverviewTrendData
  overviewGeographicData?: Array<{ country: string; accounts: number }>
  leads: LeadsAnalytics
  accounts: AccountsAnalytics
  opportunities: OpportunitiesAnalytics
  // contacts: Uses useContactsStaticData and useContactsOverTime hooks directly
}

export interface OverviewAnalytics {
  totalCounts: {
    leads: number
    accounts: number
    opportunities: number
    contacts: number
  }
  recentActivity: {
    newLeadsThisWeek: number
    convertedLeadsThisWeek: number
    newAccountsThisWeek: number
    accountsWithWonOpportunitiesThisWeek: number
    newOpportunitiesThisWeek: number
    wonOpportunitiesThisWeek: number
    newContactsThisWeek: number
    contactsRelatedToWonAccountsThisWeek: number
  }
  conversionMetrics: {
    leadToOpportunityRate: number
    opportunityWinRate: number
    avgDealSize: number
    salesCycleLength: number
  }
  topPerformers: {
    employeeId: string
    employeeName: string
    dealsWon: number
    totalValue: number
  }[]
}

export interface LeadsAnalytics {
  totalLeads: number
  leadsByStatus: {
    status: string
    count: number
    percentage: number
  }[]
  leadsBySource: {
    source: string
    count: number
    percentage: number
  }[]
  leadsBySourceType: {
    sourceType: string
    count: number
    percentage: number
  }[]
  leadsByCompanySize: {
    sizeCategory: string
    count: number
    percentage: number
    sampleRevenue?: string
  }[]
  // leadsOverTime moved to separate useLeadsOverTime hook
  conversionRate: number
}

export interface AccountsAnalytics {
  totalAccounts: number
  accountsOverTime: {
    date: string
    count: number
    accountsCreated: number
    accountsWithOpportunities: number
    accountsActive: number
  }[]
  topAccounts: {
    id: string
    name: string
    industry: string
    opportunityCount: number
    totalValue: number
    revenue: number
    wonOpportunities: number
  }[]
  accountsWithOpportunities: number
  avgOpportunitiesPerAccount: number
}

export interface OpportunitiesAnalytics {
  totalOpportunities: number
  totalValue: number
  opportunitiesByStage: {
    stage: string
    count: number
    value: number
    percentage: number
  }[]
  opportunitiesByPipeline: {
    pipelineId: string
    pipeline: string
    count: number
    value: number
    percentage: number
  }[]
  opportunitiesOverTime: {
    date: string
    count: number
    value: number
  }[]
  winRate: number
  winRateLastMonthOpportunities: number
  avgDealSize: number
  avgSalesCycle: number
  conversionRate: number
  topDeals: {
    id: string
    name: string
    value: number
    stage: string
    winChance: number
    owner: string
  }[]
}

// ContactsAnalytics removed - Contacts tab now uses useContactsStaticData and useContactsOverTime hooks directly
// DateRange removed - Not used in CRM analytics, available in common/utils/analytics/dateRangeUtils.ts if needed
