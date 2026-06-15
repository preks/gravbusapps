import type {
  BreakdownMatrix,
  BreakdownMatrixCell,
  DataQualityAttentionRecord,
  DataQualityDashboardSummary,
  DataQualityFilters,
  DataQualityIssueCode,
  DataQualityRequirementsResult,
  EmployeeAttentionRow,
  JobArchitectureCompletenessResult,
  JobArchitectureListItem,
  MissingDataBreakdownResult,
  RecommendedDataQualityAction,
  TopUrgentRecord
} from '../types/dataQuality.types'
import type { RawEmployeeRow, RawJobArchitecture } from './dataQualityFetch'
import { DATA_QUALITY_EMPLOYEE_LIMIT } from './dataQualityFetch'
import { getActiveWorkingHours } from '@/business-apps/hr/core/utils/workingHoursUtils'

/** Maps category codes to i18n keys - resolve via `t(key)` in the UI layer. */
export const CATEGORY_I18N_KEY: Record<string, string> = {
  legal_entity: 'category-legal-entity',
  location: 'category-location',
  cost_center: 'category-cost-center',
  job_position: 'category-job-position',
  working_conditions: 'category-working-conditions',
  working_hours: 'category-working-hours',
  tax: 'category-tax',
  payroll_bank: 'category-payroll-bank'
}

function nz(s?: string | null): boolean {
  return Boolean(s && String(s).trim().length > 0)
}

function hasNonEmptyI18nObject(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }
  try {
    return Object.keys(value).length > 0
  } catch {
    return false
  }
}

type MaybeWorkingHoursRow = RawEmployeeRow['workingHours'][number] | undefined

function hasNumericHours(row: MaybeWorkingHoursRow): boolean {
  if (!row) return false

  return [
    row.weeklyHours,
    row.mondayHours,
    row.tuesdayHours,
    row.wednesdayHours,
    row.thursdayHours,
    row.fridayHours,
    row.saturdayHours,
    row.sundayHours
  ].some(value => {
    if (value == null || String(value).trim() === '') return false

    const numericValue = typeof value === 'number' ? value : Number.parseFloat(String(value))
    return !Number.isNaN(numericValue) && numericValue > 0
  })
}

function hasTax(
  row:
    | { taxIdentificationNumber?: string | null; socialSecurityNumber?: string | null; taxNumber?: string | null }
    | undefined
): boolean {
  if (!row) return false
  return nz(row.taxIdentificationNumber) || nz(row.socialSecurityNumber) || nz(row.taxNumber)
}

function hasBank(accounts: RawEmployeeRow['bankAccounts']): boolean {
  return accounts.some(a => nz(a.iban) || nz(a.accountNumber))
}

function primaryPosition(emp: RawEmployeeRow) {
  return emp.employeePositions[0]
}

function hasLegalEntity(emp: RawEmployeeRow, pos: ReturnType<typeof primaryPosition>): boolean {
  if (nz(pos?.companyId)) return true
  return (emp.companyEmployees?.length ?? 0) > 0
}

function hasWorkingConditions(emp: RawEmployeeRow, pos: ReturnType<typeof primaryPosition>): boolean {
  const wc = emp.workingCondition[0]
  const hireOk = Boolean(wc?.hireDate || pos?.hireDate)
  return Boolean(nz(wc?.contractTypeRef) && nz(wc?.employmentTypeRef) && hireOk)
}

export interface CategoryFlags {
  legal_entity: boolean
  location: boolean
  cost_center: boolean
  job_position: boolean
  working_conditions: boolean
  working_hours: boolean
  tax: boolean
  payroll_bank: boolean
}

type EmployeeCategoryIssueCode = keyof CategoryFlags

const EMPLOYEE_ISSUE_CONFIG: Record<
  EmployeeCategoryIssueCode,
  { detailHintKey: string; severity: DataQualityAttentionRecord['severity'] }
> = {
  legal_entity: {
    detailHintKey: 'hint-legal-entity',
    severity: 'warning'
  },
  location: {
    detailHintKey: 'hint-location',
    severity: 'warning'
  },
  cost_center: {
    detailHintKey: 'hint-cost-center',
    severity: 'warning'
  },
  job_position: {
    detailHintKey: 'hint-job-position',
    severity: 'warning'
  },
  working_conditions: {
    detailHintKey: 'hint-working-conditions',
    severity: 'warning'
  },
  working_hours: {
    detailHintKey: 'hint-working-hours',
    severity: 'warning'
  },
  tax: {
    detailHintKey: 'hint-tax',
    severity: 'critical'
  },
  payroll_bank: {
    detailHintKey: 'hint-payroll-bank',
    severity: 'critical'
  }
}

function getMissingEmployeeIssueCodes(flags: CategoryFlags): EmployeeCategoryIssueCode[] {
  return (Object.entries(flags) as Array<[EmployeeCategoryIssueCode, boolean]>)
    .filter(([, satisfied]) => !satisfied)
    .map(([code]) => code)
}

export function evaluateEmployeeCategories(emp: RawEmployeeRow): CategoryFlags {
  const pos = primaryPosition(emp)
  const whRow = getActiveWorkingHours(emp.workingHours)
  const taxRow = emp.taxDetails[0]

  return {
    legal_entity: hasLegalEntity(emp, pos),
    location: Boolean(pos?.siteLocationId),
    cost_center: Boolean(pos?.costCenterId),
    job_position: Boolean(pos?.jobPositionId),
    working_conditions: hasWorkingConditions(emp, pos),
    working_hours: hasNumericHours(whRow),
    tax: hasTax(taxRow),
    payroll_bank: hasBank(emp.bankAccounts)
  }
}

export function isPayrollBlocker(flags: CategoryFlags): boolean {
  return !flags.payroll_bank || !flags.tax
}

export function completionRatio(flags: CategoryFlags): number {
  const vals = Object.values(flags)
  const ok = vals.filter(Boolean).length
  return ok / vals.length
}

/**
 * Per-field weight used to compute the urgency score.
 * Payroll-critical fields score highest, followed by compliance/legal fields,
 * then operational fields.
 */
const FIELD_URGENCY_WEIGHT: Record<keyof CategoryFlags, number> = {
  tax: 30,
  payroll_bank: 28,
  legal_entity: 20,
  working_conditions: 18,
  working_hours: 14,
  location: 12,
  cost_center: 8,
  job_position: 6
}

/**
 * Compute a domain urgency score for an employee based on:
 * 1. Payroll impact (missing tax/bank → highest)
 * 2. Compliance/legal impact (legal entity, working conditions)
 * 3. Number and priority-weight of missing fields
 * 4. Time sensitivity (hire date proximity, active employment)
 * 5. Age proxy - employees with a hireDate are active longer → staleness
 */
export function computeEmployeeUrgencyScore(emp: RawEmployeeRow, flags: CategoryFlags): number {
  let score = 0

  const missingKeys = (Object.keys(flags) as Array<keyof CategoryFlags>).filter(k => !flags[k])
  for (const key of missingKeys) {
    score += FIELD_URGENCY_WEIGHT[key] ?? 0
  }

  if (missingKeys.length > 1) {
    score += missingKeys.length * 3
  }

  if (!flags.tax && !flags.payroll_bank) {
    score += 15
  }

  const wc = emp.workingCondition[0]
  const hireDate = wc?.hireDate || emp.employeePositions[0]?.hireDate
  if (hireDate) {
    const daysSinceHire = Math.max(0, (Date.now() - new Date(hireDate).getTime()) / 86_400_000)
    if (daysSinceHire <= 30) {
      score += 10
    } else if (daysSinceHire <= 90) {
      score += 5
    }
    score += Math.min(10, Math.floor(daysSinceHire / 90))
  }

  return score
}

function employeeDisplayName(emp: RawEmployeeRow): string {
  const fullName = emp.fullName?.trim()
  if (fullName) return fullName

  const displayName = emp.displayName?.trim()
  if (displayName) return displayName

  const code = emp.code?.trim()
  if (code) return code

  return emp.id
}

export interface EmployeeDataQualityFact {
  employee: RawEmployeeRow
  flags: CategoryFlags
  missing: EmployeeCategoryIssueCode[]
  completionRatio: number
  urgencyScore: number
  employeeName: string
  legalEntity: string | null
  location: string | null
  hasCritical: boolean
  anyMissing: boolean
  isPayrollBlocker: boolean
}

export function buildEmployeeDataQualityFacts(employees: RawEmployeeRow[]): EmployeeDataQualityFact[] {
  return employees.map(employee => {
    const flags = evaluateEmployeeCategories(employee)
    const missing = getMissingEmployeeIssueCodes(flags)
    const pos = primaryPosition(employee)

    return {
      employee,
      flags,
      missing,
      completionRatio: completionRatio(flags),
      urgencyScore: computeEmployeeUrgencyScore(employee, flags),
      employeeName: employeeDisplayName(employee),
      legalEntity: pos?.company?.name ?? null,
      location: pos?.siteLocation?.name ?? null,
      hasCritical: missing.includes('tax') || missing.includes('payroll_bank'),
      anyMissing: missing.length > 0,
      isPayrollBlocker: isPayrollBlocker(flags)
    }
  })
}

export function computeDashboard(
  employeesInScope: RawEmployeeRow[],
  rawJob: RawJobArchitecture
): DataQualityDashboardSummary {
  return computeDashboardFromFacts(buildEmployeeDataQualityFacts(employeesInScope), rawJob)
}

export function computeDashboardFromFacts(
  employeeFacts: EmployeeDataQualityFact[],
  rawJob: RawJobArchitecture
): DataQualityDashboardSummary {
  const ratiosAll = employeeFacts.map(fact => fact.completionRatio)
  const overall =
    ratiosAll.length === 0 ? 100 : Math.round((ratiosAll.reduce((a, b) => a + b, 0) / ratiosAll.length) * 1000) / 10

  const missingAny = employeeFacts.filter(fact => fact.completionRatio < 1).length
  const critical = employeeFacts.filter(fact => fact.isPayrollBlocker).length

  const jpMiss = rawJob.jobPositionsMissingProfile?.aggregate?.count ?? 0

  const profiles = rawJob.jobProfiles ?? []
  let profMissDescOrSkills = 0
  for (const p of profiles) {
    const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
    const skillCount = p.jobProfileSkillsAggregate?.aggregate?.count ?? 0
    if (!descOk || skillCount === 0) profMissDescOrSkills += 1
  }

  return {
    overallCompletionRate: overall,
    employeesWithMissingDataCount: missingAny,
    criticalPayrollBlockersCount: critical,
    jobPositionsMissingProfilesCount: jpMiss,
    jobProfilesMissingDescriptionsOrSkillsCount: profMissDescOrSkills,
    employeeSampleSize: employeeFacts.length
  }
}

export function computeRequirements(employees: RawEmployeeRow[]): DataQualityRequirementsResult {
  return computeRequirementsFromFacts(buildEmployeeDataQualityFacts(employees))
}

export function computeRequirementsFromFacts(employeeFacts: EmployeeDataQualityFact[]): DataQualityRequirementsResult {
  const cats: Array<keyof CategoryFlags> = [
    'legal_entity',
    'location',
    'cost_center',
    'job_position',
    'working_conditions',
    'working_hours',
    'tax',
    'payroll_bank'
  ]

  const missingByCategory = new Map<keyof CategoryFlags, number>(cats.map(id => [id, 0]))
  for (const fact of employeeFacts) {
    for (const id of cats) {
      if (!fact.flags[id]) {
        missingByCategory.set(id, (missingByCategory.get(id) ?? 0) + 1)
      }
    }
  }

  const totals = employeeFacts.length || 1
  const categories = cats.map(id => {
    const missing = missingByCategory.get(id) ?? 0
    const completedCount = totals - missing
    return {
      id,
      label: CATEGORY_I18N_KEY[id] ?? id,
      completedCount,
      missingCount: missing,
      completionRate: Math.round(((totals - missing) / totals) * 1000) / 10
    }
  })

  return { categories }
}

export function computeBreakdown(employees: RawEmployeeRow[]): MissingDataBreakdownResult {
  return computeBreakdownFromFacts(buildEmployeeDataQualityFacts(employees))
}

export function computeBreakdownFromFacts(employeeFacts: EmployeeDataQualityFact[]): MissingDataBreakdownResult {
  const byCompany = new Map<string, MissingDataBreakdownResult['byCompany'][number]>()
  const bySite = new Map<string, MissingDataBreakdownResult['bySiteLocation'][number]>()

  for (const fact of employeeFacts) {
    if (!fact.anyMissing) continue

    const emp = fact.employee
    const pos = primaryPosition(emp)
    const coId = pos?.company?.id ?? pos?.companyId ?? emp.companyEmployees[0]?.company?.id
    const coLabel = pos?.company?.name ?? emp.companyEmployees[0]?.company?.name ?? 'unknown-company'
    if (coId) {
      const cur = byCompany.get(coId) ?? { entityId: coId, entityLabel: coLabel ?? coId, missingEmployeeCount: 0 }
      cur.missingEmployeeCount += 1
      cur.entityLabel = coLabel ?? cur.entityLabel
      byCompany.set(coId, cur)
    }

    const siteId = pos?.siteLocation?.id ?? pos?.siteLocationId
    const siteLabel = pos?.siteLocation?.name ?? 'unknown-location'
    if (siteId) {
      const cur = bySite.get(siteId) ?? { entityId: siteId, entityLabel: siteLabel ?? siteId, missingEmployeeCount: 0 }
      cur.missingEmployeeCount += 1
      cur.entityLabel = siteLabel ?? cur.entityLabel
      bySite.set(siteId, cur)
    }
  }

  return {
    byCompany: [...byCompany.values()].sort((a, b) => b.missingEmployeeCount - a.missingEmployeeCount),
    bySiteLocation: [...bySite.values()].sort((a, b) => b.missingEmployeeCount - a.missingEmployeeCount)
  }
}

export function computeJobArchitecture(rawJob: RawJobArchitecture): JobArchitectureCompletenessResult {
  const jpTotal = rawJob.jobPositionsTotal?.aggregate?.count ?? 0
  const jpMiss = rawJob.jobPositionsMissingProfile?.aggregate?.count ?? 0
  const jpWith = Math.max(0, jpTotal - jpMiss)

  const profiles = rawJob.jobProfiles ?? []
  const totalJobProfiles = profiles.length
  let withDesc = 0
  let withSkills = 0
  let missDesc = 0
  let missSkills = 0

  for (const p of profiles) {
    const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
    const skillCount = p.jobProfileSkillsAggregate?.aggregate?.count ?? 0
    if (descOk) withDesc += 1
    else missDesc += 1
    if (skillCount > 0) withSkills += 1
    else missSkills += 1
  }

  return {
    totalJobPositions: jpTotal,
    jobPositionsWithProfile: jpWith,
    jobPositionsMissingProfile: jpMiss,
    totalJobProfiles,
    jobProfilesWithDescription: withDesc,
    jobProfilesMissingDescription: missDesc,
    jobProfilesWithSkills: withSkills,
    jobProfilesMissingSkills: missSkills
  }
}

export function computeJobArchitectureLists(rawJob: RawJobArchitecture) {
  const positions = rawJob.jobPositionsSample ?? []
  const profiles = rawJob.jobProfiles ?? []

  const jobPositionsMissingProfileList: JobArchitectureListItem[] = positions
    .filter(p => !p.jobProfileId)
    .map(p => {
      const depts = (p.organizationalUnitEmployees ?? []).map(ou => ou.organizationalUnit?.name).filter(Boolean)
      return {
        id: p.id,
        name: p.name ?? p.id,
        department: depts.length > 0 ? depts.join(', ') : null,
        rawPosition: {
          id: p.id,
          name: p.name ?? p.id,
          version: p.version,
          activeTo: p.activeTo,
          jobProfile: p.jobProfile,
          jobFunction: p.jobFunction,
          jobLevel: p.jobLevel,
          employeePositions: p.employeePositions,
          organizationalUnitEmployees: p.organizationalUnitEmployees
        }
      }
    })

  const buildProfileDetail = (p: (typeof profiles)[number]): JobArchitectureListItem['profileDetail'] => ({
    version: p.version,
    code: p.code,
    description: p.description,
    jobFunction: p.jobFunction,
    jobLevel: p.jobLevel,
    skills: (p.jobProfileSkills ?? []).map(s => ({
      name: s.skill?.name ?? 'unknown-skill',
      requiredLevel: s.requiredLevel
    }))
  })

  const jobProfilesMissingDescriptionList: JobArchitectureListItem[] = profiles
    .filter(p => {
      const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
      return !descOk
    })
    .map(p => ({ id: p.id, name: p.name ?? p.code ?? p.id, profileDetail: buildProfileDetail(p) }))

  const jobProfilesMissingSkillsList: JobArchitectureListItem[] = profiles
    .filter(p => (p.jobProfileSkillsAggregate?.aggregate?.count ?? 0) === 0)
    .map(p => ({ id: p.id, name: p.name ?? p.code ?? p.id, profileDetail: buildProfileDetail(p) }))

  return { jobPositionsMissingProfileList, jobProfilesMissingDescriptionList, jobProfilesMissingSkillsList }
}

export const ISSUE_I18N_KEY: Record<string, string> = {
  legal_entity: 'issue-legal-entity',
  location: 'issue-location',
  cost_center: 'issue-cost-center',
  job_position: 'issue-job-position',
  working_conditions: 'issue-working-conditions',
  working_hours: 'issue-working-hours',
  tax: 'issue-tax',
  payroll_bank: 'issue-payroll-bank',
  job_position_no_profile: 'issue-jp-no-profile',
  job_profile_no_description: 'issue-jp-no-description',
  job_profile_no_skills: 'issue-jp-no-skills'
}

export const HINT_I18N_KEY: Record<string, string> = {
  legal_entity: 'hint-legal-entity',
  location: 'hint-location',
  cost_center: 'hint-cost-center',
  job_position: 'hint-job-position',
  working_conditions: 'hint-working-conditions',
  working_hours: 'hint-working-hours',
  tax: 'hint-tax',
  payroll_bank: 'hint-payroll-bank',
  job_position_no_profile: 'hint-jp-no-profile',
  job_profile_no_description: 'hint-jp-no-description',
  job_profile_no_skills: 'hint-jp-no-skills'
}

export const CHECKLIST_I18N_KEY: Record<string, string> = {
  legal_entity: 'checklist-legal-entity',
  location: 'checklist-location',
  cost_center: 'checklist-cost-center',
  job_position: 'checklist-job-position',
  working_conditions: 'checklist-working-conditions',
  working_hours: 'checklist-working-hours',
  tax: 'checklist-tax',
  payroll_bank: 'checklist-payroll-bank'
}

function issueLabel(code: DataQualityIssueCode): string {
  switch (code) {
    case 'legal_entity':
      return 'Legal entity not assigned'
    case 'location':
      return 'Location missing'
    case 'cost_center':
      return 'Cost center missing'
    case 'job_position':
      return 'Job position missing'
    case 'working_conditions':
      return 'Working conditions incomplete'
    case 'working_hours':
      return 'Working hours missing'
    case 'tax':
      return 'Tax information incomplete'
    case 'payroll_bank':
      return 'Bank account missing'
    case 'job_position_no_profile':
      return 'Job position has no job profile'
    case 'job_profile_no_description':
      return 'Job profile missing description'
    case 'job_profile_no_skills':
      return 'Job profile has no skills'
    default:
      return code
  }
}

export function computeRecordsNeedingAttention(
  employees: RawEmployeeRow[],
  rawJob: RawJobArchitecture,
  filters: DataQualityFilters
): DataQualityAttentionRecord[] {
  return computeRecordsNeedingAttentionFromFacts(buildEmployeeDataQualityFacts(employees), rawJob, filters)
}

export function computeRecordsNeedingAttentionFromFacts(
  employeeFacts: EmployeeDataQualityFact[],
  rawJob: RawJobArchitecture,
  filters: DataQualityFilters
): DataQualityAttentionRecord[] {
  const rows: DataQualityAttentionRecord[] = []

  const pushIssue = (
    fact: EmployeeDataQualityFact,
    code: DataQualityIssueCode,
    detailHintKey: string,
    severity: DataQualityAttentionRecord['severity']
  ) => {
    rows.push({
      id: `${fact.employee.id}:${code}`,
      entityKind: 'employee',
      entityId: fact.employee.id,
      entityLabel: fact.employeeName,
      issueCode: code,
      issueLabel: issueLabel(code),
      severity,
      detailHintKey
    })
  }

  for (const fact of employeeFacts) {
    for (const code of fact.missing) {
      const config = EMPLOYEE_ISSUE_CONFIG[code]
      pushIssue(fact, code, config.detailHintKey, config.severity)
    }
  }

  for (const jp of rawJob.jobPositionsSample ?? []) {
    if (!jp.jobProfileId) {
      rows.push({
        id: `jp:${jp.id}`,
        entityKind: 'job_position',
        entityId: jp.id,
        entityLabel: jp.name ?? jp.id,
        issueCode: 'job_position_no_profile',
        issueLabel: issueLabel('job_position_no_profile'),
        severity: 'warning',
        detailHintKey: 'hint-jp-no-profile'
      })
    }
  }

  for (const p of rawJob.jobProfiles ?? []) {
    const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
    const skillCount = p.jobProfileSkillsAggregate?.aggregate?.count ?? 0
    if (!descOk) {
      rows.push({
        id: `jpf:${p.id}:desc`,
        entityKind: 'job_profile',
        entityId: p.id,
        entityLabel: p.name ?? p.code ?? p.id,
        issueCode: 'job_profile_no_description',
        issueLabel: issueLabel('job_profile_no_description'),
        severity: 'warning',
        detailHintKey: 'hint-jp-no-description'
      })
    }
    if (skillCount === 0) {
      rows.push({
        id: `jpf:${p.id}:skills`,
        entityKind: 'job_profile',
        entityId: p.id,
        entityLabel: p.name ?? p.code ?? p.id,
        issueCode: 'job_profile_no_skills',
        issueLabel: issueLabel('job_profile_no_skills'),
        severity: 'warning',
        detailHintKey: 'hint-jp-no-skills'
      })
    }
  }

  let filtered = rows
  if (filters.issueFocus) {
    filtered = filtered.filter(r => r.issueCode === filters.issueFocus)
  }

  return filtered
}

export function computeEmployeeAttentionRows(
  employees: RawEmployeeRow[],
  filters: DataQualityFilters
): EmployeeAttentionRow[] {
  return computeEmployeeAttentionRowsFromFacts(buildEmployeeDataQualityFacts(employees), filters)
}

export function computeEmployeeAttentionRowsFromFacts(
  employeeFacts: EmployeeDataQualityFact[],
  filters: DataQualityFilters
): EmployeeAttentionRow[] {
  const rows: EmployeeAttentionRow[] = []

  for (const fact of employeeFacts) {
    if (fact.missing.length === 0) continue

    if (filters.issueFocus && !fact.missing.includes(filters.issueFocus as EmployeeCategoryIssueCode)) continue

    rows.push({
      id: fact.employee.id,
      employeeId: fact.employee.id,
      employeeName: fact.employeeName,
      legalEntity: fact.legalEntity,
      location: fact.location,
      missingFields: filters.issueFocus
        ? fact.missing.filter(c => c === (filters.issueFocus as EmployeeCategoryIssueCode))
        : fact.missing,
      severity: fact.hasCritical ? 'critical' : 'warning',
      urgencyScore: fact.urgencyScore
    })
  }

  rows.sort((a, b) => b.urgencyScore - a.urgencyScore)
  return rows
}

const TOP_URGENT_LIMIT = 5

function computeEmployeeUrgentRecordsFromFacts(employeeFacts: EmployeeDataQualityFact[]): TopUrgentRecord[] {
  const records: TopUrgentRecord[] = []

  for (const fact of employeeFacts) {
    if (fact.missing.length === 0) continue

    records.push({
      entityKind: 'employee',
      entityId: fact.employee.id,
      entityLabel: fact.employeeName,
      legalEntity: fact.legalEntity,
      missingFields: fact.missing,
      severity: fact.hasCritical ? 'critical' : 'warning',
      urgencyScore: fact.urgencyScore
    })
  }

  return records
}

function computeJobPositionUrgentRecords(rawJob: RawJobArchitecture): TopUrgentRecord[] {
  const records: TopUrgentRecord[] = []

  for (const jp of rawJob.jobPositionsSample ?? []) {
    if (!jp.jobProfileId) {
      records.push({
        entityKind: 'job_position',
        entityId: jp.id,
        entityLabel: jp.name ?? jp.id,
        legalEntity: null,
        missingFields: ['job_position_no_profile'],
        severity: 'warning',
        urgencyScore: 4
      })
    }
  }

  return records
}

function computeJobProfileUrgentRecords(rawJob: RawJobArchitecture): TopUrgentRecord[] {
  const records: TopUrgentRecord[] = []

  for (const p of rawJob.jobProfiles ?? []) {
    const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
    const skillCount = p.jobProfileSkillsAggregate?.aggregate?.count ?? 0
    const missingCodes: DataQualityIssueCode[] = []
    if (!descOk) missingCodes.push('job_profile_no_description')
    if (skillCount === 0) missingCodes.push('job_profile_no_skills')
    if (missingCodes.length === 0) continue
    records.push({
      entityKind: 'job_profile',
      entityId: p.id,
      entityLabel: p.name ?? p.code ?? p.id,
      legalEntity: null,
      missingFields: missingCodes,
      severity: 'warning',
      urgencyScore: 2 + missingCodes.length
    })
  }

  return records
}

/**
 * Compute the top N most urgent records across employees, job positions, and job profiles.
 * Employees are scored via `computeEmployeeUrgencyScore`.
 * Job architecture items get a fixed lower score since they don't block payroll.
 */
export function computeTopUrgentRecords(employees: RawEmployeeRow[], rawJob: RawJobArchitecture): TopUrgentRecord[] {
  return computeTopUrgentRecordsFromFacts(buildEmployeeDataQualityFacts(employees), rawJob)
}

export function computeTopUrgentRecordsFromFacts(
  employeeFacts: EmployeeDataQualityFact[],
  rawJob: RawJobArchitecture
): TopUrgentRecord[] {
  const records: TopUrgentRecord[] = [
    ...computeEmployeeUrgentRecordsFromFacts(employeeFacts),
    ...computeJobPositionUrgentRecords(rawJob),
    ...computeJobProfileUrgentRecords(rawJob)
  ]

  records.sort((a, b) => b.urgencyScore - a.urgencyScore)
  return records.slice(0, TOP_URGENT_LIMIT)
}

export function computeRecommendedActions(
  employees: RawEmployeeRow[],
  rawJob: RawJobArchitecture
): RecommendedDataQualityAction[] {
  return computeRecommendedActionsFromFacts(buildEmployeeDataQualityFacts(employees), rawJob)
}

export function computeRecommendedActionsFromFacts(
  employeeFacts: EmployeeDataQualityFact[],
  rawJob: RawJobArchitecture
): RecommendedDataQualityAction[] {
  const actions: RecommendedDataQualityAction[] = []

  const countEmp = (predicate: (fact: EmployeeDataQualityFact) => boolean) => employeeFacts.filter(predicate).length

  const bank = countEmp(fact => !fact.flags.payroll_bank)
  if (bank > 0) {
    actions.push({
      id: 'action-bank',
      title: 'Complete payroll bank details',
      description: 'Employees cannot be paid without a valid bank account on file.',
      affectedCount: bank,
      issueFocus: 'payroll_bank'
    })
  }

  const tax = countEmp(fact => !fact.flags.tax)
  if (tax > 0) {
    actions.push({
      id: 'action-tax',
      title: 'Complete tax identifiers',
      description: 'Tax numbers are required for statutory payroll reporting.',
      affectedCount: tax,
      issueFocus: 'tax'
    })
  }

  const loc = countEmp(fact => !fact.flags.location)
  if (loc > 0) {
    actions.push({
      id: 'action-location',
      title: 'Assign locations',
      description: 'Site location is missing on active assignments.',
      affectedCount: loc,
      issueFocus: 'location'
    })
  }

  const costCenter = countEmp(fact => !fact.flags.cost_center)
  if (costCenter > 0) {
    actions.push({
      id: 'action-cost-center',
      title: 'Assign cost centers',
      description: 'Cost center is missing on active assignments.',
      affectedCount: costCenter,
      issueFocus: 'cost_center'
    })
  }

  const jpMiss = rawJob.jobPositionsMissingProfile?.aggregate?.count ?? 0
  if (jpMiss > 0) {
    actions.push({
      id: 'action-jp-profile',
      title: 'Link job profiles to positions',
      description: 'Job positions without profiles break job architecture governance.',
      affectedCount: jpMiss,
      issueFocus: 'job_position_no_profile'
    })
  }

  const profiles = rawJob.jobProfiles ?? []
  let skillGap = 0
  let descGap = 0
  for (const p of profiles) {
    const descOk = nz(p.description) || hasNonEmptyI18nObject(p.descriptionI18n)
    const skillCount = p.jobProfileSkillsAggregate?.aggregate?.count ?? 0
    if (!descOk) descGap += 1
    if (skillCount === 0) skillGap += 1
  }
  if (descGap > 0) {
    actions.push({
      id: 'action-jprof-desc',
      title: 'Add job profile descriptions',
      description: 'Profiles in scope are missing narrative descriptions.',
      affectedCount: descGap,
      issueFocus: 'job_profile_no_description'
    })
  }
  if (skillGap > 0) {
    actions.push({
      id: 'action-jprof-skills',
      title: 'Attach skills to job profiles',
      description: 'Skills frameworks require linked skills per profile.',
      affectedCount: skillGap,
      issueFocus: 'job_profile_no_skills'
    })
  }

  return actions.sort((a, b) => b.affectedCount - a.affectedCount)
}

export function buildIssueDetail(
  record: DataQualityAttentionRecord,
  empLookup: Map<string, RawEmployeeRow>
): import('../types/dataQuality.types').DataQualityIssueDetail {
  const checklist: Array<{ id: string; label: string; satisfied: boolean }> = []

  if (record.entityKind === 'employee') {
    const emp = empLookup.get(record.entityId)
    if (emp) {
      const f = evaluateEmployeeCategories(emp)
      checklist.push(
        { id: 'legal_entity', label: 'Legal entity assigned', satisfied: f.legal_entity },
        { id: 'location', label: 'Location assigned', satisfied: f.location },
        { id: 'cost_center', label: 'Cost center assigned', satisfied: f.cost_center },
        { id: 'job_position', label: 'Job position assigned', satisfied: f.job_position },
        { id: 'working_conditions', label: 'Working conditions complete', satisfied: f.working_conditions },
        { id: 'working_hours', label: 'Working hours recorded', satisfied: f.working_hours },
        { id: 'tax', label: 'Tax data present', satisfied: f.tax },
        { id: 'payroll_bank', label: 'Bank account present', satisfied: f.payroll_bank }
      )
    }
  }

  return { record, checklist }
}

export function dataQualitySampleTruncated(employeeCount: number): boolean {
  return employeeCount >= DATA_QUALITY_EMPLOYEE_LIMIT
}

export function computeBreakdownMatrix(employees: RawEmployeeRow[]): BreakdownMatrix {
  return computeBreakdownMatrixFromFacts(buildEmployeeDataQualityFacts(employees))
}

export function computeBreakdownMatrixFromFacts(employeeFacts: EmployeeDataQualityFact[]): BreakdownMatrix {
  const resolveCompany = (emp: RawEmployeeRow, pos: ReturnType<typeof primaryPosition>) => ({
    id: pos?.company?.id ?? pos?.companyId ?? emp.companyEmployees[0]?.company?.id ?? null,
    label: pos?.company?.name ?? emp.companyEmployees[0]?.company?.name ?? 'unknown-label'
  })
  const incrementBucket = (bucket: { total: number; missing: number }, anyMissing: boolean) => {
    bucket.total += 1
    if (anyMissing) {
      bucket.missing += 1
    }
  }

  const companyMap = new Map<string, string>()
  const locationMap = new Map<string, string>()
  const buckets = new Map<string, { total: number; missing: number }>()
  const allLocationsBucket = new Map<string, { total: number; missing: number }>()

  for (const fact of employeeFacts) {
    const emp = fact.employee
    const pos = primaryPosition(emp)
    const company = resolveCompany(emp, pos)
    const locId = pos?.siteLocation?.id ?? pos?.siteLocationId ?? null
    const locLabel = pos?.siteLocation?.name ?? null

    if (company.id) {
      companyMap.set(company.id, company.label)
      const allBucket = allLocationsBucket.get(company.id) ?? { total: 0, missing: 0 }
      incrementBucket(allBucket, fact.anyMissing)
      allLocationsBucket.set(company.id, allBucket)
    }
    if (locId && locLabel) locationMap.set(locId, locLabel)
    if (company.id && locId) {
      const key = `${company.id}::${locId}`
      const b = buckets.get(key) ?? { total: 0, missing: 0 }
      incrementBucket(b, fact.anyMissing)
      buckets.set(key, b)
    }
  }

  const companies = [...companyMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const locations = [...locationMap.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label))

  const cells = new Map<string, BreakdownMatrixCell>()
  for (const [key, b] of buckets) {
    const [companyId, locationId] = key.split('::')
    cells.set(key, {
      companyId,
      locationId,
      totalEmployees: b.total,
      missingCount: b.missing,
      missingPercent: b.total > 0 ? Math.round((b.missing / b.total) * 100) : 0
    })
  }

  const allLocationsColumn = new Map<string, { total: number; missing: number; percent: number }>()
  for (const [coId, b] of allLocationsBucket) {
    allLocationsColumn.set(coId, {
      total: b.total,
      missing: b.missing,
      percent: b.total > 0 ? Math.round((b.missing / b.total) * 100) : 0
    })
  }

  return { companies, locations, cells, allLocationsColumn }
}

export function applyCompletenessFilter(
  employees: RawEmployeeRow[],
  completeness: DataQualityFilters['completeness']
): RawEmployeeRow[] {
  return applyCompletenessFilterToFacts(buildEmployeeDataQualityFacts(employees), completeness).map(
    fact => fact.employee
  )
}

export function applyCompletenessFilterToFacts(
  employeeFacts: EmployeeDataQualityFact[],
  completeness: DataQualityFilters['completeness']
): EmployeeDataQualityFact[] {
  if (completeness === 'all') return employeeFacts
  return employeeFacts.filter(fact => {
    if (completeness === 'complete') return fact.completionRatio >= 1
    if (completeness === 'incomplete') return fact.completionRatio < 1
    if (completeness === 'critical') return fact.isPayrollBlocker
    return true
  })
}
