import type { Dispatch, SetStateAction } from 'react'
import type { RawEmployeeRow } from '../services/dataQualityFetch'

/**
 * Typed contracts for HR Admin Cockpit - Data Quality & Completion.
 * Aggregated backend/BFF contract is defined in {@link ../services/dataQualityBff.contract.ts}.
 */

export type DataQualityCompletenessFilter = 'all' | 'complete' | 'incomplete' | 'critical'

/** Issue codes used for recommended actions, table filtering, and drawer detail. */
export type DataQualityIssueCode =
  | 'legal_entity'
  | 'location'
  | 'cost_center'
  | 'job_position'
  | 'working_conditions'
  | 'working_hours'
  | 'tax'
  | 'payroll_bank'
  | 'job_position_no_profile'
  | 'job_profile_no_description'
  | 'job_profile_no_skills'

export interface DataQualityFilters {
  search: string
  companyId: string | null
  siteLocationId: string | null
  organizationalUnitId: string | null
  completeness: DataQualityCompletenessFilter
  /** Narrow records table to a single issue type (e.g. from recommended actions). */
  issueFocus: DataQualityIssueCode | null
}

export interface DataQualityDashboardSummary {
  overallCompletionRate: number
  employeesWithMissingDataCount: number
  criticalPayrollBlockersCount: number
  jobPositionsMissingProfilesCount: number
  jobProfilesMissingDescriptionsOrSkillsCount: number
  /** Employees returned from GraphQL for this filter set (bounded). */
  employeeSampleSize: number
}

export interface DataQualityRequirementCategory {
  id:
    | 'legal_entity'
    | 'location'
    | 'cost_center'
    | 'job_position'
    | 'working_conditions'
    | 'working_hours'
    | 'tax'
    | 'payroll_bank'
  label: string
  completedCount: number
  missingCount: number
  completionRate: number
}

export interface DataQualityRequirementsResult {
  categories: DataQualityRequirementCategory[]
}

export interface MissingDataBreakdownRow {
  entityId: string
  entityLabel: string
  missingEmployeeCount: number
}

export interface MissingDataBreakdownResult {
  byCompany: MissingDataBreakdownRow[]
  bySiteLocation: MissingDataBreakdownRow[]
}

export interface JobArchitectureCompletenessResult {
  totalJobPositions: number
  jobPositionsWithProfile: number
  jobPositionsMissingProfile: number
  totalJobProfiles: number
  jobProfilesWithDescription: number
  jobProfilesMissingDescription: number
  jobProfilesWithSkills: number
  jobProfilesMissingSkills: number
}

export interface RecommendedDataQualityAction {
  id: string
  title: string
  description: string
  affectedCount: number
  /** Applying sets `issueFocus` on dashboard filters. */
  issueFocus: DataQualityIssueCode
}

export type DataQualityRecordEntityKind = 'employee' | 'job_position' | 'job_profile'

export interface DataQualityAttentionRecord {
  id: string
  entityKind: DataQualityRecordEntityKind
  entityId: string
  entityLabel: string
  issueCode: DataQualityIssueCode
  issueLabel: string
  severity: 'critical' | 'warning' | 'info'
  detailHintKey: string
}

export interface DataQualityIssueDetail {
  record: DataQualityAttentionRecord
  checklist: Array<{ id: string; label: string; satisfied: boolean }>
}

export interface EmployeeAttentionRow {
  id: string
  employeeId: string
  employeeName: string
  legalEntity: string | null
  location: string | null
  missingFields: DataQualityIssueCode[]
  severity: 'critical' | 'warning' | 'info'
  /** Domain urgency score (higher = more urgent). Computed from payroll impact, severity, missing-field count, and age. */
  urgencyScore: number
}

export interface TopUrgentRecord {
  entityKind: DataQualityRecordEntityKind
  entityId: string
  entityLabel: string
  legalEntity: string | null
  missingFields: DataQualityIssueCode[]
  severity: 'critical' | 'warning' | 'info'
  urgencyScore: number
}

export interface BreakdownMatrixCell {
  companyId: string
  locationId: string
  totalEmployees: number
  missingCount: number
  missingPercent: number
}

export interface BreakdownMatrix {
  companies: Array<{ id: string; label: string }>
  locations: Array<{ id: string; label: string }>
  allLocationsColumn: Map<string, { total: number; missing: number; percent: number }>
  cells: Map<string, BreakdownMatrixCell>
}

export interface JobProfileDetail {
  code?: string | null
  description?: string | null
  jobFunction?: { name?: string | null; code?: string | null } | null
  jobLevel?: { name?: string | null; code?: string | null; hierarchyOrder?: number | null } | null
  skills: Array<{ name: string; requiredLevel?: number | null }>
}

export interface RawPositionForDetail {
  id: string
  name: string
  version?: number | null
  activeTo?: string | null
  jobProfile?: { id: string; name?: string | null; code?: string | null } | null
  jobFunction?: {
    id: string
    name?: string | null
    code?: string | null
    jobFamily?: { id: string; name?: string | null; code?: string | null } | null
  } | null
  jobLevel?: { id: string; name?: string | null; code?: string | null; hierarchyOrder?: number | null } | null
  employeePositions?: Array<{
    firstName?: string | null
    lastName?: string | null
    employeeId?: string | null
    supervisor?: { id: string; firstName?: string | null; lastName?: string | null } | null
  }>
  organizationalUnitEmployees?: Array<{
    organizationalUnit?: { id?: string; name?: string | null } | null
    siteLocation?: { id?: string; name?: string | null } | null
  }>
}

export interface JobArchitectureListItem {
  id: string
  name: string
  department?: string | null
  profileDetail?: JobProfileDetail
  rawPosition?: RawPositionForDetail
}

export interface DataQualityComputedContextValue {
  filters: DataQualityFilters
  setFilters: Dispatch<SetStateAction<DataQualityFilters>>
  loading: boolean
  error: string | null
  refetch: () => void
  refreshEmployee: (employeeId: string) => Promise<void>
  dashboard: DataQualityDashboardSummary
  requirements: DataQualityRequirementsResult
  breakdown: MissingDataBreakdownResult
  jobArchitecture: JobArchitectureCompletenessResult
  recommendedActions: RecommendedDataQualityAction[]
  recordsNeedingAttention: DataQualityAttentionRecord[]
  employeeAttentionRows: EmployeeAttentionRow[]
  topUrgentRecords: TopUrgentRecord[]
  breakdownMatrix: BreakdownMatrix
  employeeById: Map<string, RawEmployeeRow>
  jobPositionsMissingProfileList: JobArchitectureListItem[]
  jobProfilesMissingDescriptionList: JobArchitectureListItem[]
  jobProfilesMissingSkillsList: JobArchitectureListItem[]
}
