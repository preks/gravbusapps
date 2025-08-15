export { default as OpportunityList } from './OpportunityList';
export { default as OpportunityTable } from './components/OpportunityTable';
export { OpportunityStatisticsWithTrend } from './components/OpportunityStatistics';
export { useOpportunityListData } from './hooks/useOpportunityListData';
export { useOpportunityStatisticsWithTrend } from './hooks/useOpportunityStatisticsWithTrend';
export { useOpportunityFilters } from './hooks/useOpportunityFilters';
export type { Opportunity, UseOpportunityListDataReturn } from './types';
export * from './queries/OpportunityQueries';

// Default export for publishing
export { default } from './OpportunityList'; 