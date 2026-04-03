export type PayrollRunStatus =
  | 'PAYROLL_IN_PROGRESS'
  | 'PAYROLL_READY_FOR_REVIEW'
  | 'PAYROLL_APPROVED_FOR_EXPORT'
  | 'PAYROLL_EXPORTED'
  | 'PAYROLL_CLOSED'

export type ReadinessStatus = 'ready' | 'warning' | 'blocked' | 'excluded'

export type IssueSeverity = 'blocker' | 'warning' | 'info'

export type IssueStatus = 'open' | 'ignored' | 'resolved'

export type PayrollCountry = 'DE' | 'RO'

export type IssueCategory =
  | 'missing_personal_data'
  | 'missing_bank_details'
  | 'missing_contract_salary'
  | 'missing_tax_social'
  | 'missing_country_specific'
  | 'missing_approvals'
  | 'missing_absence_data'
  | 'overlapping_absences'
  | 'retroactive_changes'
  | 'pending_final_payroll'
  | 'invalid_effective_dates'

export type ChangeType =
  | 'new_hire'
  | 'termination'
  | 'salary_change'
  | 'working_time_change'
  | 'contract_type_change'
  | 'legal_entity_change'
  | 'department_change'
  | 'bank_details_change'
  | 'variable_pay_change'
  | 'one_off_payment'
  | 'deduction_change'
  | 'absence_change'
  | 'country_specific_change'

export interface PayrollRun {
  id: string
  month: number
  year: number
  country: string
  legalEntityId: string
  legalEntityName: string
  cutOffDate: string
  paymentDate: string
  status: PayrollRunStatus
  createdBy: string
  createdAt: string
  preparedBy?: string | null
  preparedAt?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  reviewComment?: string | null
  approvalDecision?: string | null
  updatedAt: string
  updatedBy?: string | null
  version: number
  isDeleted: boolean
}

export interface PayrollEmployee {
  id: string
  employeeId: string
  code: string
  firstName: string
  lastName: string
  displayName: string
  pictureThumbnail?: string
  country: PayrollCountry
  legalEntityId: string
  legalEntityName: string
  employmentStatus: string
  hireDate: string | null
  terminationDate: string | null
  department: string
  costCenter: string
  workLocation: string
  contractType: string
  payrollRelevant: boolean | null
  fte: number | null
  weeklyHours: number | null
  baseSalary: number | null
  currency: string
  bankDetailsPresent: boolean
  bankAccountIban?: string

  taxId?: string
  socialInsuranceNumber?: string
  healthInsuranceName?: string
  healthInsuranceTypeRef?: string
  elstamStatus?: string
  eauStatus?: string
  employmentTypeFlag?: string
  specialEmploymentFlag?: string

  cnpStatus?: string

  totalVariablePay: number | null
  variablePayCurrency: string | null
  variablePayStatus: 'all_approved' | 'pending' | 'none' | null

  paidLeaveDays: number
  sickLeaveDays: number
  unpaidLeaveDays: number
  otherLeaveDays: number
  sickLeaveHours: number
  paidLeaveHours: number

  loggedHours: number | null
  contractCapacityHours: number | null
  overtimeHours: number | null
  balanceHours: number | null
  missingPresenceDays: number

  readinessStatus: ReadinessStatus
  issues: PayrollIssue[]
  changes: PayrollChangeEvent[]
  changedSinceLastPayroll: boolean
  exportEligible: boolean
  manualOverrideReason?: string
  note?: string
  additionalProperties?: Record<string, unknown>
}

export interface PayrollIssue {
  id: string
  employeeId: string
  issueCode: string
  category: IssueCategory
  severity: IssueSeverity
  message: string
  fieldPath?: string
  sourceModule?: string
  status: IssueStatus
  ignoredReason?: string
  recommendedAction: string
  owner?: string
  createdAt: string
  resolvedAt?: string
}

export interface PayrollChangeEvent {
  id: string
  employeeId: string
  changeType: ChangeType
  fieldName: string
  oldValue: string | null
  newValue: string | null
  effectiveDate: string
  changedAt: string
  changedBy?: string
}

export interface GermanyPayload {
  taxIdStatus: 'present' | 'missing' | 'invalid'
  elstamStatus: 'confirmed' | 'pending' | 'missing'
  socialInsuranceNumberStatus: 'present' | 'missing'
  healthInsuranceFund: string | null
  eauStatus: 'available' | 'missing' | 'not_applicable'
  employmentType: string | null
  specialEmploymentFlag: boolean
}

export interface RomaniaPayload {
  cnpStatus: 'present' | 'missing' | 'invalid'
}

export interface PayrollSummary {
  totalEmployees: number
  readyCount: number
  warningCount: number
  blockedCount: number
  excludedCount: number
  openBlockers: number
  changedSinceLastPayroll: number
}

export interface PayrollBonus {
  id: string
  employeeId: string
  bonusType: string
  bonusTypeCode: string
  amount: number
  currency: string
  paymentDate: string | null
  fiscalYear: number
  status: string
}

export type ApprovalDecision = 'APPROVED' | 'NOT APPROVED'

export interface AuditEvent {
  id: string
  eventType: string
  description: string
  userId: string
  userName: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface PayrollGridFilters {
  search: string
  readinessStatus: ReadinessStatus | 'all'
  changedOnly: boolean
  issueCategory: IssueCategory | 'all'
  department: string | 'all'
}

export interface ExportOptions {
  mode: 'all' | 'ready_only' | 'ready_and_warning'
  includeIssueSummary: boolean
  format: 'csv' | 'xlsx'
  applyGridFilters: boolean
}
