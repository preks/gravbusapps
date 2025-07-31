/**
 * Queries exports for Backoffice Absences
 */
 
export { getDashboardQuery, getDateFilters } from './DashboardQueries';

// ✅ NEW: Server-Side Aggregation Queries
export { 
  getDashboardKPIQuery,
  getDepartmentStatsQuery, 
  getMonthlyTrendsQuery,
  getVacationEntitlementsQuery,
  getAllDashboardAggregationsQuery
} from './ServerSideAggregationQueries'; 