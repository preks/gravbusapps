/**
 * Queries exports for Backoffice Absences
 */
 
export { getDashboardQuery, getDateFilters } from './DashboardQueries';

// ✅ NEW: Server-Side Aggregation Queries
export { 
  getDashboardKPIAggregations,
  getVacationEntitlementsAggregations,
  getHybridAbsenceData
} from './ServerSideAggregationQueries'; 