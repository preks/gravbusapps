export interface IrmAnalyticsData {
  overview: OverviewAnalytics
  overviewTrendData?: OverviewTrendData
  overviewGeographicData?: Array<{ country: string; accounts: number }>
  leads: LeadsAnalytics
  accounts: AccountsAnalytics
  opportunities?: OpportunitiesAnalytics // Optional: No longer populated by useIrmAnalyticsData (uses dedicated aggregate hooks instead)
  contacts?: ContactsAnalytics // Optional: No longer populated by useIrmAnalyticsData (uses dedicated hooks instead)
}

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
  currentMonthAvgOpportunitySize: number
  previousMonthAvgOpportunitySize: number
  currentMonthSalesCycleLength: number
  previousMonthSalesCycleLength: number
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
    avgOpportunitySize: number
    salesCycleLength: number
  }
  topPerformers: {
    employeeId: string
    employeeName: string
    opportunitiesWon: number
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
  leadsOverTime: {
    date: string
    count: number // Keep for backward compatibility
    leadsCreated: number
    leadsConverted: number
    leadsLost: number
  }[]
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
  avgOpportunitySize: number
  avgSalesCycle: number
  conversionRate: number
  topOpportunities: {
    id: string
    name: string
    value: number
    stage: string
    owner: string
  }[]
}

export interface ContactsAnalytics {
  totalContacts: number
  contactsByAccount: {
    accountName: string
    contactCount: number
  }[]
  contactsOverTime: {
    date: string
    count: number
  }[]
  contactsWithOpportunities: number
  topContactOwners: {
    employeeId: string
    employeeName: string
    contactCount: number
  }[]
  contactsWithoutAccounts: number
  avgContactsPerAccount: number
}

export interface DateRange {
  startDate: Date
  endDate: Date
}
