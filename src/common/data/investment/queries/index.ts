// Centralized export for all investment-related GraphQL queries
// Based on actual GraphQL schema discovered via newwork-mcp

// Investment Account Queries
export * from './investmentAccountQueries';

// Investment Contact Queries  
export * from './investmentContactQueries';

// Investment Lead Queries
export * from './investmentLeadQueries';

// Investment Opportunity Queries
export * from './investmentOpportunityQueries';

// Core Investment Queries (with specializations)
export * from './investmentQueries';

// Investment Relations Queries - now split into individual entity queries above

// Investment Report Queries
export * from './investmentReportQueries';