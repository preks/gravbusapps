import { useEffect, useCallback, useState, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_PAYROLL_EMPLOYEES,
  GET_PAYROLL_SALARIES,
  GET_PAYROLL_ABSENCES,
  GET_PAYROLL_BONUSES,
  GET_PAYROLL_ATTENDANCE,
  GET_ACTIVE_STRUCTURE,
  GET_COMPANY_ADDRESSES
} from '../queries/payrollQueries'
import { runAllValidations, resetIssueIdCounter } from '../utils/validationRules'
import { parseDurationToMinutes, getPlannedMinutesForDate, toLocalDateKey } from '../utils/timeUtils'
import type { PayrollEmployee, PayrollCountry, PayrollSummary, PayrollGridFilters } from '../types/payrollTypes'
import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'

interface AbsenceTypeObjectValue {
  category?: string
}

interface RawEmployeePosition {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  hireDate: string | null
  exitDate: string | null
  companyId: string
  company: { id: string; name: string }
  costCenterId: string
  costCenter: { id: string; name: string } | null
  siteLocationId: string
  siteLocation: { id: string; name: string } | null
  organizationalUnitId: string
  organizationalUnit: { id: string; name: string } | null
  jobPosition: { id: string; name: string } | null
  employee: {
    id: string
    code: string
    fullName: string
    displayName: string
    pictureThumbnail: string | null
    additionalProperties: Record<string, unknown> | null
    workingCondition: Array<{
      id: string
      contractType: {
        id: string
        value: string
        objectValue?: Record<string, unknown> | null
        translations?: Array<{ value: string }>
      } | null
      employmentType: { id: string; value: string; translations?: Array<{ value: string }> } | null
      hireDate: string | null
      exitDate: string | null
      region: { id: string; value: string; parentEntry?: { code?: string } } | null
    }>
    workingHours: Array<{
      weeklyHours: number | null
      fullTimeEquivalent: number | null
      mondayHours: number | null
      tuesdayHours: number | null
      wednesdayHours: number | null
      thursdayHours: number | null
      fridayHours: number | null
      saturdayHours: number | null
      sundayHours: number | null
    }>
    bankAccounts: Array<{
      id: string
      iban: string | null
      bankName: string | null
      accountHolder: string | null
    }>
    taxDetails: Array<{
      taxNumber: string | null
      taxIdentificationNumber: string | null
      socialSecurityNumber: string | null
      healthInsuranceName: string | null
      healthInsuranceTypeRef: string | null
      taxBracketRef: string | null
      childTaxAllowance: number | null
      additionalProperties: Record<string, unknown> | null
    }>
  }
}

interface RawSalary {
  id: string
  employeeId: string
  annualGrossSalary: number | null
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currency: { id: string; code: string; value: string } | null
  currencyRef: string | null
  startDate: string | null
  endDate: string | null
  requestStatus: string | null
  createdAt: string
}

interface RawAbsence {
  id: string
  employeeId: string
  startDate: string
  endDate: string
  status: string
  effectiveDays: number | null
  workingDays: number | null
  calendarDays: number | null
  description: string | null
  type: {
    id: string
    value: string
    parentEntryId?: string | null
    objectValue: AbsenceTypeObjectValue | null
    translations?: Array<{ value: string }>
  } | null
  approverId: string | null
  approvalNote: string | null
  createdAt: string
}

interface RawAttendance {
  id: string
  employeeId: string
  attendanceDate: string
  effectiveTime: string | null
  plannedTime: string | null
  recordedTime: string | null
}

interface RawBonus {
  id: string
  employeeId: string
  employeeBonusType: { id: string; value: string; code: string } | null
  employeeBonusTypeRef: string | null
  amount: number | null
  currency: { id: string; code: string; value: string } | null
  paymentDate: string | null
  fiscalYear: number
  status: string | null
}

function detectCountryFromCode(countryCode: string | null | undefined): PayrollCountry | null {
  if (!countryCode) return null
  const raw = countryCode.trim().toUpperCase()
  const lastSegment = raw.split('.').pop() || raw

  if (lastSegment === 'DE' || raw.includes('GERMANY') || lastSegment === 'DEU') return 'DE'
  if (lastSegment === 'RO' || raw.includes('ROMANIA') || lastSegment === 'ROU') return 'RO'
  return null
}

const HEALTH_GROUP = 'AbsenceGroup:v1:HEALTH'

function isHealthAbsence(absenceType: RawAbsence['type']): boolean {
  if (absenceType?.parentEntryId === HEALTH_GROUP) return true
  const value = absenceType?.value?.toLowerCase() || ''
  return value.includes('sick') || value.includes('krank') || value.includes('medical') || value.includes('boala')
}

function getAbsenceCategory(absenceType: RawAbsence['type']): string {
  if (isHealthAbsence(absenceType)) return 'sick'

  const objVal = absenceType?.objectValue
  if (objVal && typeof objVal === 'object' && 'category' in objVal) {
    return (objVal as AbsenceTypeObjectValue).category || ''
  }
  const value = absenceType?.value?.toLowerCase() || ''
  if (value.includes('unpaid') || value.includes('unbezahlt') || value.includes('neplat')) return 'unpaid'
  if (value.includes('vacation') || value.includes('urlaub') || value.includes('concediu')) return 'paid'
  return 'other'
}

function resolveEmploymentStatus(
  exitDateStr: string | null | undefined,
  payrollMonth: number,
  payrollYear: number
): string {
  if (!exitDateStr) return 'active'
  const exitDate = new Date(exitDateStr)
  const payrollPeriodEnd = new Date(payrollYear, payrollMonth, 0)
  return exitDate <= payrollPeriodEnd ? 'terminated' : 'active'
}

interface LeaveMetrics {
  paidLeaveDays: number
  sickLeaveDays: number
  unpaidLeaveDays: number
  otherLeaveDays: number
  paidLeaveHours: number
  sickLeaveHours: number
}

interface CapacityMetrics {
  workedMinutes: number
  contractTargetMinutes: number
  overtimeMinutes: number
  balanceMinutes: number
  missingPresenceDays: number
}

function toOptionalString(value: number | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null
  }

  return String(value)
}

function resolvePayrollRelevant(contractObjectValue: unknown): boolean | null {
  if (!contractObjectValue || typeof contractObjectValue !== 'object') {
    return null
  }

  const raw = (contractObjectValue as Record<string, unknown>).payroll_relevant
  if (raw === undefined) {
    return null
  }

  return raw === true || raw === 'true'
}

function computeLeaveMetrics(absences: RawAbsence[], weeklyHours: number | null | undefined): LeaveMetrics {
  const approvedAbsences = absences.filter(a => a.status === 'APPROVED')
  const sickAbsences = approvedAbsences.filter(a => isHealthAbsence(a.type))
  const nonSickAbsences = approvedAbsences.filter(a => !isHealthAbsence(a.type))
  const unpaidAbsences = approvedAbsences.filter(a => getAbsenceCategory(a.type) === 'unpaid')
  const otherAbsences = approvedAbsences.filter(a => {
    const category = getAbsenceCategory(a.type)
    return category !== 'sick' && category !== 'paid' && category !== 'unpaid'
  })

  const sickLeaveDays = sickAbsences.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const paidLeaveDays = nonSickAbsences.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const unpaidLeaveDays = unpaidAbsences.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const otherLeaveDays = otherAbsences.reduce((sum, a) => sum + (a.effectiveDays || 0), 0)

  const dailyWorkingHours = weeklyHours ? weeklyHours / 5 : 8
  const sickLeaveHours = Math.round(sickLeaveDays * dailyWorkingHours * 10) / 10
  const paidLeaveHours = Math.round(paidLeaveDays * dailyWorkingHours * 10) / 10

  return {
    paidLeaveDays,
    sickLeaveDays,
    unpaidLeaveDays,
    otherLeaveDays,
    paidLeaveHours,
    sickLeaveHours
  }
}

function buildWorkingHoursForCapacity(
  workingHours: RawEmployeePosition['employee']['workingHours'][number] | undefined
) {
  if (!workingHours) {
    return undefined
  }

  return {
    mondayHours: workingHours.mondayHours ?? 0,
    tuesdayHours: workingHours.tuesdayHours ?? 0,
    wednesdayHours: workingHours.wednesdayHours ?? 0,
    thursdayHours: workingHours.thursdayHours ?? 0,
    fridayHours: workingHours.fridayHours ?? 0,
    saturdayHours: workingHours.saturdayHours ?? 0,
    sundayHours: workingHours.sundayHours ?? 0
  }
}

function computeContractTargetMinutes(
  monthStart: Date,
  monthEnd: Date,
  workingHoursForCapacity:
    | {
        mondayHours: number
        tuesdayHours: number
        wednesdayHours: number
        thursdayHours: number
        fridayHours: number
        saturdayHours: number
        sundayHours: number
      }
    | undefined
): { contractTargetMinutes: number; scheduledWorkingDays: string[] } {
  let contractTargetMinutes = 0
  const cursor = new Date(monthStart)
  const scheduledWorkingDays: string[] = []

  while (cursor <= monthEnd) {
    const dateKey = toLocalDateKey(cursor)
    const planned = getPlannedMinutesForDate(dateKey, workingHoursForCapacity)
    contractTargetMinutes += planned
    if (planned > 0) {
      scheduledWorkingDays.push(dateKey)
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return { contractTargetMinutes, scheduledWorkingDays }
}

function computeWorkedMinutesAndAttendanceDates(attendance: RawAttendance[]): {
  workedMinutes: number
  attendanceDateSet: Set<string>
} {
  const attendanceDateSet = new Set<string>()
  let workedMinutes = 0

  for (const entry of attendance) {
    workedMinutes += parseDurationToMinutes(entry.effectiveTime)
    if (entry.attendanceDate) {
      attendanceDateSet.add(entry.attendanceDate.substring(0, 10))
    }
  }

  return { workedMinutes, attendanceDateSet }
}

function computeAbsenceDateSet(approvedAbsences: RawAbsence[], monthStart: Date, monthEnd: Date): Set<string> {
  const absenceDateSet = new Set<string>()

  for (const absence of approvedAbsences) {
    const start = new Date(absence.startDate)
    const end = new Date(absence.endDate)
    const dayCursor = new Date(start)
    while (dayCursor <= end && dayCursor <= monthEnd) {
      if (dayCursor >= monthStart) {
        absenceDateSet.add(toLocalDateKey(dayCursor))
      }
      dayCursor.setDate(dayCursor.getDate() + 1)
    }
  }

  return absenceDateSet
}

function countMissingPresenceDays(
  scheduledWorkingDays: string[],
  attendanceDateSet: Set<string>,
  absenceDateSet: Set<string>
): number {
  let missingPresenceDays = 0

  for (const day of scheduledWorkingDays) {
    if (!attendanceDateSet.has(day) && !absenceDateSet.has(day)) {
      missingPresenceDays++
    }
  }

  return missingPresenceDays
}

function computeCapacityMetrics(
  attendance: RawAttendance[],
  absences: RawAbsence[],
  workingHours: RawEmployeePosition['employee']['workingHours'][number] | undefined,
  payrollMonth: number,
  payrollYear: number
): CapacityMetrics {
  const approvedAbsences = absences.filter(a => a.status === 'APPROVED')
  const monthStart = new Date(payrollYear, payrollMonth - 1, 1)
  const monthEnd = new Date(payrollYear, payrollMonth, 0)
  const workingHoursForCapacity = buildWorkingHoursForCapacity(workingHours)
  const { contractTargetMinutes, scheduledWorkingDays } = computeContractTargetMinutes(
    monthStart,
    monthEnd,
    workingHoursForCapacity
  )
  const { workedMinutes, attendanceDateSet } = computeWorkedMinutesAndAttendanceDates(attendance)
  const absenceDateSet = computeAbsenceDateSet(approvedAbsences, monthStart, monthEnd)
  const missingPresenceDays = countMissingPresenceDays(scheduledWorkingDays, attendanceDateSet, absenceDateSet)

  const overtimeMinutes = Math.max(0, workedMinutes - contractTargetMinutes)
  const balanceMinutes = workedMinutes - contractTargetMinutes

  return {
    workedMinutes,
    contractTargetMinutes,
    overtimeMinutes,
    balanceMinutes,
    missingPresenceDays
  }
}

function resolveVariablePayStatus(bonuses: RawBonus[]): PayrollEmployee['variablePayStatus'] {
  if (bonuses.length === 0) {
    return 'none'
  }

  const allBonusesApproved = bonuses.every(b => b.status === 'APPROVED_COMPENSATION')
  if (allBonusesApproved) {
    return 'all_approved'
  }

  const hasPendingBonuses = bonuses.some(b => b.status !== 'APPROVED_COMPENSATION')
  if (hasPendingBonuses) {
    return 'pending'
  }

  return null
}

function buildPayrollChanges(
  employeeId: string,
  salaries: RawSalary[],
  hireDate: string | null | undefined,
  rawExitDate: string | null | undefined,
  payrollMonth: number,
  payrollYear: number
): PayrollEmployee['changes'] {
  const periodStart = new Date(payrollYear, payrollMonth - 1, 1)
  const periodEnd = new Date(payrollYear, payrollMonth, 0)
  const changes: PayrollEmployee['changes'] = []

  if (hireDate) {
    const parsedHireDate = new Date(hireDate)
    if (parsedHireDate >= periodStart && parsedHireDate <= periodEnd) {
      changes.push({
        id: `chg-hire-${employeeId}`,
        employeeId,
        changeType: 'new_hire',
        fieldName: 'Hire Date',
        oldValue: null,
        newValue: hireDate,
        effectiveDate: hireDate,
        changedAt: hireDate
      })
    }
  }

  if (rawExitDate) {
    const parsedExitDate = new Date(rawExitDate)
    if (parsedExitDate >= periodStart && parsedExitDate <= periodEnd) {
      changes.push({
        id: `chg-term-${employeeId}`,
        employeeId,
        changeType: 'termination',
        fieldName: 'Exit Date',
        oldValue: null,
        newValue: rawExitDate,
        effectiveDate: rawExitDate,
        changedAt: rawExitDate
      })
    }
  }

  for (let index = 0; index < salaries.length; index++) {
    const salary = salaries[index]
    const effectiveDate = salary.startDate || salary.createdAt
    const parsedEffectiveDate = new Date(effectiveDate)

    if (parsedEffectiveDate < periodStart || parsedEffectiveDate > periodEnd) {
      continue
    }

    const previousSalary = salaries[index + 1] || null
    changes.push({
      id: `chg-sal-${employeeId}-${salary.id}`,
      employeeId,
      changeType: 'salary_change',
      fieldName: 'Monthly Gross Salary',
      oldValue: toOptionalString(previousSalary?.monthlyGrossSalary),
      newValue: toOptionalString(salary.monthlyGrossSalary),
      effectiveDate,
      changedAt: salary.createdAt
    })
  }

  return changes
}

function applyReadinessAndEligibility(payrollEmployee: PayrollEmployee, country: PayrollCountry): void {
  resetIssueIdCounter()
  const issues = runAllValidations(payrollEmployee, country)
  payrollEmployee.issues = issues

  const blockers = issues.filter(i => i.severity === 'blocker' && i.status === 'open')
  const warnings = issues.filter(i => i.severity === 'warning' && i.status === 'open')

  if (blockers.length > 0) {
    payrollEmployee.readinessStatus = 'blocked'
    payrollEmployee.exportEligible = false
    return
  }

  if (warnings.length > 0) {
    payrollEmployee.readinessStatus = 'warning'
    return
  }

  payrollEmployee.readinessStatus = 'ready'
}

function groupByEmployeeId<T extends { employeeId: string }>(entries: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()

  for (const entry of entries) {
    const current = grouped.get(entry.employeeId) || []
    current.push(entry)
    grouped.set(entry.employeeId, current)
  }

  return grouped
}

function buildPayrollPeriod(month: number, year: number): { periodStart: string; periodEnd: string } {
  const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

  return { periodStart, periodEnd }
}

async function fetchEmployeeDatasets(
  client: ReturnType<typeof useGraphqlClient>,
  locale: string,
  employeeIds: string[],
  month: number,
  year: number
): Promise<{
  salaryResult: { EmployeeSalary: RawSalary[] }
  absenceResult: { EmployeeAbsence: RawAbsence[] }
  attendanceResult: { EmployeeAttendance: RawAttendance[] }
  bonusResult: { EmployeeBonus: RawBonus[] }
}> {
  const { periodStart, periodEnd } = buildPayrollPeriod(month, year)

  const [salaryResult, absenceResult, attendanceResult, bonusResult] = await Promise.all([
    client.request<{ EmployeeSalary: RawSalary[] }>(GET_PAYROLL_SALARIES, { employeeIds }),
    client.request<{ EmployeeAbsence: RawAbsence[] }>(GET_PAYROLL_ABSENCES, {
      employeeIds,
      periodStart,
      periodEnd,
      activeUserLocale: locale
    }),
    client.request<{ EmployeeAttendance: RawAttendance[] }>(GET_PAYROLL_ATTENDANCE, {
      employeeIds,
      dateFrom: periodStart,
      dateTo: periodEnd
    }),
    client
      .request<{ EmployeeBonus: RawBonus[] }>(GET_PAYROLL_BONUSES, {
        employeeIds,
        fiscalYear: year
      })
      .catch(() => ({ EmployeeBonus: [] as RawBonus[] }))
  ])

  return { salaryResult, absenceResult, attendanceResult, bonusResult }
}

function buildPayrollEmployee(
  pos: RawEmployeePosition,
  salaryMap: Map<string, RawSalary[]>,
  absenceMap: Map<string, RawAbsence[]>,
  attendanceMap: Map<string, RawAttendance[]>,
  bonusMap: Map<string, RawBonus[]>,
  country: PayrollCountry,
  payrollMonth: number,
  payrollYear: number
): PayrollEmployee {
  const emp = pos.employee
  const wc = emp.workingCondition?.[0]
  const wh = emp.workingHours?.[0]
  const bank = emp.bankAccounts?.[0]
  const tax = emp.taxDetails?.[0]
  const salaries = salaryMap.get(emp.id) || []
  const salary = salaries[0] || null
  const absences = absenceMap.get(emp.id) || []
  const attendance = attendanceMap.get(emp.id) || []
  const bonuses = bonusMap.get(emp.id) || []
  const leaveMetrics = computeLeaveMetrics(absences, wh?.weeklyHours)
  const capacityMetrics = computeCapacityMetrics(attendance, absences, wh, payrollMonth, payrollYear)

  const contractTypeLabel = wc?.contractType?.translations?.[0]?.value || wc?.contractType?.value || ''
  const employmentTypeLabel = wc?.employmentType?.translations?.[0]?.value || wc?.employmentType?.value || ''
  const payrollRelevant = resolvePayrollRelevant(wc?.contractType?.objectValue)

  const rawExitDate = wc?.exitDate || pos.exitDate
  const employmentStatus = resolveEmploymentStatus(rawExitDate, payrollMonth, payrollYear)

  const totalVariablePay = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0)
  const bonusCurrency = bonuses[0]?.currency?.code || null
  const variablePayStatus = resolveVariablePayStatus(bonuses)
  const hireDate = wc?.hireDate || pos.hireDate
  const changes = buildPayrollChanges(emp.id, salaries, hireDate, rawExitDate, payrollMonth, payrollYear)

  const payrollEmp: PayrollEmployee = {
    id: pos.id,
    employeeId: emp.id,
    code: emp.code || '',
    firstName: pos.firstName || '',
    lastName: pos.lastName || '',
    displayName: emp.displayName || `${pos.firstName} ${pos.lastName}`,
    pictureThumbnail: emp.pictureThumbnail || undefined,
    country,
    legalEntityId: pos.companyId,
    legalEntityName: pos.company?.name || '',
    employmentStatus,
    hireDate: wc?.hireDate || pos.hireDate,
    terminationDate: rawExitDate,
    department: pos.organizationalUnit?.name || '',
    costCenter: pos.costCenter?.name || '',
    workLocation: pos.siteLocation?.name || '',
    contractType: contractTypeLabel,
    payrollRelevant,
    fte: wh?.fullTimeEquivalent ?? null,
    weeklyHours: wh?.weeklyHours ?? null,
    baseSalary: salary?.monthlyGrossSalary ?? null,
    currency: salary?.currency?.code || salary?.currencyRef || 'EUR',
    bankDetailsPresent: !!(bank?.iban || bank?.bankName),
    bankAccountIban: bank?.iban || undefined,

    taxId: tax?.taxIdentificationNumber || tax?.taxNumber || undefined,
    socialInsuranceNumber: tax?.socialSecurityNumber || undefined,
    healthInsuranceName: tax?.healthInsuranceName || undefined,
    healthInsuranceTypeRef: tax?.healthInsuranceTypeRef || undefined,
    employmentTypeFlag: employmentTypeLabel || undefined,

    totalVariablePay: totalVariablePay > 0 ? totalVariablePay : null,
    variablePayCurrency: bonusCurrency,
    variablePayStatus,

    paidLeaveDays: leaveMetrics.paidLeaveDays,
    sickLeaveDays: leaveMetrics.sickLeaveDays,
    unpaidLeaveDays: leaveMetrics.unpaidLeaveDays,
    otherLeaveDays: leaveMetrics.otherLeaveDays,
    sickLeaveHours: leaveMetrics.sickLeaveHours,
    paidLeaveHours: leaveMetrics.paidLeaveHours,

    loggedHours: capacityMetrics.workedMinutes > 0 ? Math.round((capacityMetrics.workedMinutes / 60) * 10) / 10 : null,
    contractCapacityHours:
      capacityMetrics.contractTargetMinutes > 0
        ? Math.round((capacityMetrics.contractTargetMinutes / 60) * 10) / 10
        : null,
    overtimeHours:
      capacityMetrics.overtimeMinutes > 0 ? Math.round((capacityMetrics.overtimeMinutes / 60) * 10) / 10 : null,
    balanceHours:
      capacityMetrics.contractTargetMinutes > 0 ? Math.round((capacityMetrics.balanceMinutes / 60) * 10) / 10 : null,
    missingPresenceDays: capacityMetrics.missingPresenceDays,

    readinessStatus: 'ready',
    issues: [],
    changes,
    changedSinceLastPayroll: changes.length > 0,
    exportEligible: true
  }

  applyReadinessAndEligibility(payrollEmp, country)

  return payrollEmp
}

export function usePayrollEmployees(
  accessToken: string,
  companyId: string | null,
  month: number,
  year: number,
  country: PayrollCountry | null
) {
  const client = useGraphqlClient(accessToken)
  const [employees, setEmployees] = useState<PayrollEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!accessToken || !companyId) {
      setEmployees([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const locale = getCurrentActiveUserLocale()
      const posResult = await client.request<{ EmployeePosition: RawEmployeePosition[] }>(GET_PAYROLL_EMPLOYEES, {
        companyId,
        activeUserLocale: locale
      })

      const positions = posResult.EmployeePosition || []
      if (positions.length === 0) {
        setEmployees([])
        setLoading(false)
        return
      }

      const effectiveCountry = country || 'DE'

      const employeeIds = [...new Set(positions.map(p => p.employee?.id).filter(Boolean))]
      const { salaryResult, absenceResult, attendanceResult, bonusResult } = await fetchEmployeeDatasets(
        client,
        locale,
        employeeIds,
        month,
        year
      )

      const salaryMap = groupByEmployeeId(salaryResult.EmployeeSalary || [])
      const absenceMap = groupByEmployeeId(absenceResult.EmployeeAbsence || [])
      const attendanceMap = groupByEmployeeId(attendanceResult.EmployeeAttendance || [])
      const bonusMap = groupByEmployeeId(bonusResult.EmployeeBonus || [])

      const allEmployees = positions
        .filter(p => p.employee?.id)
        .map(pos =>
          buildPayrollEmployee(pos, salaryMap, absenceMap, attendanceMap, bonusMap, effectiveCountry, month, year)
        )

      const payrollEmployees = allEmployees.filter(e => e.payrollRelevant !== false)

      setEmployees(payrollEmployees)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch payroll data'))
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, companyId, month, year, country])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { employees, loading, error, refetch: fetchData }
}

export function useFilteredEmployees(employees: PayrollEmployee[], filters: PayrollGridFilters) {
  return useMemo(() => {
    let filtered = employees

    if (filters.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        e =>
          e.firstName.toLowerCase().includes(q) ||
          e.lastName.toLowerCase().includes(q) ||
          e.displayName.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.employeeId.toLowerCase().includes(q)
      )
    }

    if (filters.readinessStatus !== 'all') {
      filtered = filtered.filter(e => e.readinessStatus === filters.readinessStatus)
    }

    if (filters.changedOnly) {
      filtered = filtered.filter(e => e.changedSinceLastPayroll)
    }

    if (filters.issueCategory !== 'all') {
      filtered = filtered.filter(e => e.issues.some(i => i.category === filters.issueCategory))
    }

    if (filters.department !== 'all') {
      filtered = filtered.filter(e => e.department === filters.department)
    }

    return filtered
  }, [employees, filters])
}

export function usePayrollSummary(employees: PayrollEmployee[]): PayrollSummary {
  return useMemo(() => {
    const summary: PayrollSummary = {
      totalEmployees: employees.length,
      readyCount: 0,
      warningCount: 0,
      blockedCount: 0,
      excludedCount: 0,
      openBlockers: 0,
      changedSinceLastPayroll: 0
    }

    for (const emp of employees) {
      switch (emp.readinessStatus) {
        case 'ready':
          summary.readyCount++
          break
        case 'warning':
          summary.warningCount++
          break
        case 'blocked':
          summary.blockedCount++
          break
        case 'excluded':
          summary.excludedCount++
          break
      }

      summary.openBlockers += emp.issues.filter(i => i.severity === 'blocker' && i.status === 'open').length

      if (emp.changedSinceLastPayroll) {
        summary.changedSinceLastPayroll++
      }
    }

    return summary
  }, [employees])
}

export interface PayrollCompany {
  id: string
  name: string
  code: string
  countryCode: PayrollCountry | null
}

interface OrgchartCompanyNode {
  id: string
  type: string
  parentNode?: string
  data: {
    companyData: {
      id: string
      name: string
      code: string
      addresses?: Array<{
        addressType?: string
        countryRef?: string
      }>
    }
    numberOfAssignedEmployees: number
  }
}

interface OrgchartStructureResponse {
  nodes: OrgchartCompanyNode[]
  edges: Array<{ id: string; source: string; target: string }>
}

interface RawCompanyAddress {
  companyId: string
  addressType: string | null
  countryRef: string | null
  country: { id: string; code: string; value: string } | null
}

export function useCompanyList(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(ORGCHART_API_URL)
  const [companies, setCompanies] = useState<PayrollCompany[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const structureResult = await graphqlClient.request<{ Structure: Array<{ id: string; name: string }> }>(
          GET_ACTIVE_STRUCTURE
        )

        const structureId = structureResult.Structure?.[0]?.id
        if (!structureId) throw new Error('No active structure found')

        const response = await restClient.get<OrgchartStructureResponse>(`/structures/${structureId}`, {
          params: { nodeType: 'company' },
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        const companyNodes = response.nodes.filter(n => n.type === 'company')
        const companyIds = companyNodes.map(n => n.data.companyData.id)

        const addressResult = await graphqlClient.request<{ CompanyAddress: RawCompanyAddress[] }>(
          GET_COMPANY_ADDRESSES,
          { companyIds }
        )

        const countryMap = new Map<string, PayrollCountry | null>()
        for (const addr of addressResult.CompanyAddress || []) {
          if (countryMap.has(addr.companyId) && countryMap.get(addr.companyId) !== null) continue

          const resolvedCode = addr.country?.code || addr.countryRef
          const detected = detectCountryFromCode(resolvedCode)

          if (addr.addressType === 'PRIMARY' || !countryMap.has(addr.companyId)) {
            countryMap.set(addr.companyId, detected)
          }
        }

        const result: PayrollCompany[] = companyNodes
          .map(node => {
            const cd = node.data.companyData
            return {
              id: cd.id,
              name: cd.name,
              code: cd.code || '',
              countryCode: countryMap.get(cd.id) ?? null
            }
          })
          .sort((a, b) => a.name.localeCompare(b.name))

        if (!cancelled) setCompanies(result)
      } catch (err) {
        console.error('Failed to load companies from active structure:', err)
        if (!cancelled) setCompanies([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient, restClient])

  return { companies, loading }
}
