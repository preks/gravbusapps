/**
 * Future backend-for-frontend (or Hasura remote schema) contract for HR data-quality aggregates.
 *
 * Today the cockpit loads bounded Employee / JobPosition / JobProfile slices via GraphQL and
 * computes KPIs client-side (see `dataQualityFetch.ts`, `dataQualityCompute.ts`).
 *
 * Backend follow-up: implement a dedicated endpoint or GraphQL field bundle, for example:
 *   POST /api/hr/data-quality/summary
 *   or query `hrDataQualitySummary(structureId, filters) { ... }`
 *
 * Expected benefits: pagination, stable aggregates for large tenants, lower payload size,
 * server-side completeness rules aligned with payroll exports.
 */

import type {
  DataQualityDashboardSummary,
  DataQualityFilters,
  JobArchitectureCompletenessResult,
  MissingDataBreakdownResult,
  DataQualityRequirementsResult,
  RecommendedDataQualityAction,
  DataQualityAttentionRecord
} from '../types/dataQuality.types'

/** Wire format once a service exists - keep aligned with `types/dataQuality.types.ts`. */
export interface HrDataQualitySummaryResponse {
  filtersEcho: DataQualityFilters
  dashboard: DataQualityDashboardSummary
  requirements: DataQualityRequirementsResult
  breakdown: MissingDataBreakdownResult
  jobArchitecture: JobArchitectureCompletenessResult
  recommendedActions: RecommendedDataQualityAction[]
  recordsNeedingAttention: DataQualityAttentionRecord[]
}

export interface HrDataQualitySummaryRequest {
  structureId?: string | null
  filters: DataQualityFilters
}
