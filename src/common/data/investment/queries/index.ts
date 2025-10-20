// Centralized export for all investment-related GraphQL queries
// Based on actual GraphQL schema discovered via newwork-mcp

// Investment Account Queries
export * from './investmentAccountQueries'

// Investment Contact Queries
export * from './investmentContactQueries'

// Investment Lead Queries
export * from './investmentLeadQueries'

// Investment Opportunity Queries
export * from './investmentOpportunityQueries'

// Investment Activity Queries
export * from './investmentActivityQueries'

// Core Investment Queries (with specializations)
export * from './investmentQueries'

// Investment Relations Queries - now split into individual entity queries above

// Investment Report Queries - MIGRATED to @/common/data/investment-report/
// export * from './investmentReportQueries'; // DEPRECATED - use @/common/data/investment-report/ instead

// Investment Task Queries
export * from './investmentTaskQueries'
