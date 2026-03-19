import { useEffect, useCallback, useState, useMemo } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  GET_PAYROLL_EMPLOYEES,
  GET_PAYROLL_SALARIES,
  GET_PAYROLL_ABSENCES,
  GET_PAYROLL_ATTENDANCE,
  GET_PREVIOUS_SALARIES,
  GET_EMPLOYEES_BY_USER_IDS,
  GET_ACTIVE_STRUCTURE,
  GET_COMPANY_ADDRESSES
} from '../queries/payrollQueries'
import { runAllValidations, resetIssueIdCounter } from '../utils/validationRules'
import { parseDurationToMinutes, getPlannedMinutesForDate, toLocalDateKey } from '../utils/timeUtils'
import type {
  PayrollEmployee,
  PayrollCountry,
  PayrollSummary,
  PayrollGridFilters,
  PayrollChangeEvent
} from '../types/payrollTypes'

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
    updatedAt: string | null
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
      updatedAt: string | null
      updatedBy: string | null
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
      updatedAt: string | null
      updatedBy: string | null
    }>
    bankAccounts: Array<{
      id: string
      iban: string | null
      bankName: string | null
      accountHolder: string | null
      updatedAt: string | null
      updatedBy: string | null
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
      updatedAt: string | null
      updatedBy: string | null
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

interface RawPreviousSalary {
  id: string
  employeeId: string
  monthlyGrossSalary: number | null
  currency: { code: string } | null
  currencyRef: string | null
  startDate: string | null
  createdAt: string
}

function detectCountryFromCode(countryCode: string | null | undefined): PayrollCountry | null {
  if (!countryCode) return null
  const raw = countryCode.trim().toUpperCase()
  const lastSegment = raw.split('.').pop() || raw

  if (lastSegment === 'DE' || raw.includes('GERMANY') || lastSegment === 'DEU') return 'DE'
  if (lastSegment === 'RO' || raw.includes('ROMANIA') || lastSegment === 'ROU') return 'RO'
  return null
}

function getAbsenceCategory(absenceType: RawAbsence['type']): string {
  const objVal = absenceType?.objectValue
  if (objVal && typeof objVal === 'object' && 'category' in objVal) {
    return (objVal as AbsenceTypeObjectValue).category || ''
  }
  const value = absenceType?.value?.toLowerCase() || ''
  if (value.includes('sick') || value.includes('krank') || value.includes('medical') || value.includes('boala'))
    return 'sick'
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

function toDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toISOString().split('T')[0]
}

function detectChanges(
  pos: RawEmployeePosition,
  currentSalary: RawSalary | undefined,
  previousSalary: RawPreviousSalary | undefined,
  absences: RawAbsence[],
  referenceDate: Date,
  payrollMonth: number,
  payrollYear: number
): PayrollChangeEvent[] {
  const changes: PayrollChangeEvent[] = []
  let changeId = 1
  const emp = pos.employee
  const wc = emp.workingCondition?.[0]
  const wh = emp.workingHours?.[0]
  const monthStart = new Date(payrollYear, payrollMonth - 1, 1)
  const monthEnd = new Date(payrollYear, payrollMonth, 0)

  const hireDate = wc?.hireDate || pos.hireDate
  if (hireDate) {
    const hd = new Date(hireDate)
    if (hd >= monthStart && hd <= monthEnd) {
      changes.push({
        id: `chg-${pos.employeeId}-${changeId++}`,
        employeeId: emp.id,
        changeType: 'new_hire',
        fieldName: 'Hire Date',
        oldValue: null,
        newValue: hireDate,
        effectiveDate: toDateOnly(hireDate),
        changedAt: hireDate
      })
    }
  }

  const exitDate = wc?.exitDate || pos.exitDate
  if (exitDate) {
    const ed = new Date(exitDate)
    if (ed >= monthStart && ed <= monthEnd) {
      changes.push({
        id: `chg-${pos.employeeId}-${changeId++}`,
        employeeId: emp.id,
        changeType: 'termination',
        fieldName: 'Exit Date',
        oldValue: null,
        newValue: exitDate,
        effectiveDate: toDateOnly(exitDate),
        changedAt: exitDate
      })
    }
  }

  if (currentSalary?.createdAt && new Date(currentSalary.createdAt) >= referenceDate) {
    const oldVal =
      previousSalary?.monthlyGrossSalary != null
        ? `${previousSalary.monthlyGrossSalary} ${previousSalary.currency?.code || ''}`.trim()
        : null
    const newVal =
      currentSalary.monthlyGrossSalary != null
        ? `${currentSalary.monthlyGrossSalary} ${currentSalary.currency?.code || ''}`.trim()
        : null
    changes.push({
      id: `chg-${pos.employeeId}-${changeId++}`,
      employeeId: emp.id,
      changeType: 'salary_change',
      fieldName: 'Monthly Gross Salary',
      oldValue: oldVal,
      newValue: newVal,
      effectiveDate: toDateOnly(currentSalary.startDate || currentSalary.createdAt),
      changedAt: currentSalary.createdAt
    })
  }

  if (wh?.updatedAt && new Date(wh.updatedAt) >= referenceDate) {
    changes.push({
      id: `chg-${pos.employeeId}-${changeId++}`,
      employeeId: emp.id,
      changeType: 'working_time_change',
      fieldName: 'Working Hours',
      oldValue: null,
      newValue: wh.weeklyHours != null ? `${wh.weeklyHours}h/week` : null,
      effectiveDate: toDateOnly(wh.updatedAt),
      changedAt: wh.updatedAt,
      changedBy: wh.updatedBy || undefined
    })
  }

  if (wc?.updatedAt && new Date(wc.updatedAt) >= referenceDate) {
    changes.push({
      id: `chg-${pos.employeeId}-${changeId++}`,
      employeeId: emp.id,
      changeType: 'contract_type_change',
      fieldName: 'Working Condition',
      oldValue: null,
      newValue: wc.contractType?.translations?.[0]?.value || wc.contractType?.value || 'Updated',
      effectiveDate: toDateOnly(wc.updatedAt),
      changedAt: wc.updatedAt,
      changedBy: wc.updatedBy || undefined
    })
  }

  for (const bank of emp.bankAccounts || []) {
    if (bank.updatedAt && new Date(bank.updatedAt) >= referenceDate) {
      changes.push({
        id: `chg-${pos.employeeId}-${changeId++}`,
        employeeId: emp.id,
        changeType: 'bank_details_change',
        fieldName: 'Bank Account',
        oldValue: null,
        newValue: bank.iban ? `IBAN: ${bank.iban.slice(0, 4)}****` : 'Updated',
        effectiveDate: toDateOnly(bank.updatedAt),
        changedAt: bank.updatedAt,
        changedBy: bank.updatedBy || undefined
      })
      break
    }
  }

  for (const tax of emp.taxDetails || []) {
    if (tax.updatedAt && new Date(tax.updatedAt) >= referenceDate) {
      changes.push({
        id: `chg-${pos.employeeId}-${changeId++}`,
        employeeId: emp.id,
        changeType: 'country_specific_change',
        fieldName: 'Tax / Social Data',
        oldValue: null,
        newValue: 'Updated',
        effectiveDate: toDateOnly(tax.updatedAt),
        changedAt: tax.updatedAt,
        changedBy: tax.updatedBy || undefined
      })
      break
    }
  }

  const changedAbsences = absences.filter(a => a.createdAt && new Date(a.createdAt) >= referenceDate)
  if (changedAbsences.length > 0) {
    changes.push({
      id: `chg-${pos.employeeId}-${changeId++}`,
      employeeId: emp.id,
      changeType: 'absence_change',
      fieldName: 'Absences',
      oldValue: null,
      newValue: `${changedAbsences.length} absence(s) added/modified`,
      effectiveDate: toDateOnly(changedAbsences[0].startDate),
      changedAt: changedAbsences[0].createdAt
    })
  }

  return changes
}

function buildPayrollEmployee(
  pos: RawEmployeePosition,
  salaryMap: Map<string, RawSalary>,
  absenceMap: Map<string, RawAbsence[]>,
  attendanceMap: Map<string, RawAttendance[]>,
  previousSalaryMap: Map<string, RawPreviousSalary>,
  country: PayrollCountry,
  payrollMonth: number,
  payrollYear: number,
  referenceDate: Date
): PayrollEmployee {
  const emp = pos.employee
  const wc = emp.workingCondition?.[0]
  const wh = emp.workingHours?.[0]
  const bank = emp.bankAccounts?.[0]
  const tax = emp.taxDetails?.[0]
  const salary = salaryMap.get(emp.id)
  const absences = absenceMap.get(emp.id) || []
  const attendance = attendanceMap.get(emp.id) || []

  const approvedAbsences = absences.filter(a => a.status === 'APPROVED')

  const paidLeave = approvedAbsences
    .filter(a => getAbsenceCategory(a.type) === 'paid')
    .reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const sickLeave = approvedAbsences
    .filter(a => getAbsenceCategory(a.type) === 'sick')
    .reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const unpaidLeave = approvedAbsences
    .filter(a => getAbsenceCategory(a.type) === 'unpaid')
    .reduce((sum, a) => sum + (a.effectiveDays || 0), 0)
  const otherLeave = approvedAbsences
    .filter(a => getAbsenceCategory(a.type) === 'other')
    .reduce((sum, a) => sum + (a.effectiveDays || 0), 0)

  const contractTypeLabel = wc?.contractType?.translations?.[0]?.value || wc?.contractType?.value || ''
  const employmentTypeLabel = wc?.employmentType?.translations?.[0]?.value || wc?.employmentType?.value || ''

  const contractObjVal = wc?.contractType?.objectValue
  const payrollRelevantRaw =
    contractObjVal && typeof contractObjVal === 'object'
      ? (contractObjVal as Record<string, unknown>).payroll_relevant
      : undefined
  const payrollRelevant: boolean | null =
    payrollRelevantRaw === undefined
      ? null
      : payrollRelevantRaw === 'true' || payrollRelevantRaw === true
        ? true
        : false

  const rawExitDate = wc?.exitDate || pos.exitDate
  const employmentStatus = resolveEmploymentStatus(rawExitDate, payrollMonth, payrollYear)

  const workingHoursForCapacity = wh
    ? {
        mondayHours: wh.mondayHours ?? 0,
        tuesdayHours: wh.tuesdayHours ?? 0,
        wednesdayHours: wh.wednesdayHours ?? 0,
        thursdayHours: wh.thursdayHours ?? 0,
        fridayHours: wh.fridayHours ?? 0,
        saturdayHours: wh.saturdayHours ?? 0,
        sundayHours: wh.sundayHours ?? 0
      }
    : undefined

  let contractTargetMinutes = 0
  const monthStart = new Date(payrollYear, payrollMonth - 1, 1)
  const monthEnd = new Date(payrollYear, payrollMonth, 0)
  const cursor = new Date(monthStart)
  while (cursor <= monthEnd) {
    contractTargetMinutes += getPlannedMinutesForDate(toLocalDateKey(cursor), workingHoursForCapacity)
    cursor.setDate(cursor.getDate() + 1)
  }

  let workedMinutes = 0
  for (const entry of attendance) {
    workedMinutes += parseDurationToMinutes(entry.effectiveTime)
  }

  const overtimeMinutes = Math.max(0, workedMinutes - contractTargetMinutes)
  const balanceMinutes = workedMinutes - contractTargetMinutes

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

    paidLeaveDays: paidLeave,
    sickLeaveDays: sickLeave,
    unpaidLeaveDays: unpaidLeave,
    otherLeaveDays: otherLeave,

    loggedHours: workedMinutes > 0 ? Math.round((workedMinutes / 60) * 10) / 10 : null,
    contractCapacityHours: contractTargetMinutes > 0 ? Math.round((contractTargetMinutes / 60) * 10) / 10 : null,
    overtimeHours: overtimeMinutes > 0 ? Math.round((overtimeMinutes / 60) * 10) / 10 : null,
    balanceHours: contractTargetMinutes > 0 ? Math.round((balanceMinutes / 60) * 10) / 10 : null,

    readinessStatus: 'ready',
    issues: [],
    changes: [],
    changedSinceLastPayroll: false,
    exportEligible: true
  }

  const previousSalary = previousSalaryMap.get(emp.id)
  const detectedChanges = detectChanges(pos, salary, previousSalary, absences, referenceDate, payrollMonth, payrollYear)
  payrollEmp.changes = detectedChanges
  payrollEmp.changedSinceLastPayroll = detectedChanges.length > 0

  resetIssueIdCounter()
  const issues = runAllValidations(payrollEmp, country)
  payrollEmp.issues = issues

  const blockers = issues.filter(i => i.severity === 'blocker' && i.status === 'open')
  const warnings = issues.filter(i => i.severity === 'warning' && i.status === 'open')

  if (blockers.length > 0) {
    payrollEmp.readinessStatus = 'blocked'
    payrollEmp.exportEligible = false
  } else if (warnings.length > 0) {
    payrollEmp.readinessStatus = 'warning'
  } else {
    payrollEmp.readinessStatus = 'ready'
  }

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

      const periodStart = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const periodEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const referenceDate = new Date(year, month - 1, 1)

      const [salaryResult, absenceResult, attendanceResult, prevSalaryResult] = await Promise.all([
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
        client.request<{ EmployeeSalary: RawPreviousSalary[] }>(GET_PREVIOUS_SALARIES, {
          employeeIds,
          beforeDate: referenceDate.toISOString()
        })
      ])

      const salaryMap = new Map<string, RawSalary>()
      for (const sal of salaryResult.EmployeeSalary || []) {
        if (!salaryMap.has(sal.employeeId)) {
          salaryMap.set(sal.employeeId, sal)
        }
      }

      const absenceMap = new Map<string, RawAbsence[]>()
      for (const abs of absenceResult.EmployeeAbsence || []) {
        const existing = absenceMap.get(abs.employeeId) || []
        existing.push(abs)
        absenceMap.set(abs.employeeId, existing)
      }

      const attendanceMap = new Map<string, RawAttendance[]>()
      for (const att of attendanceResult.EmployeeAttendance || []) {
        const existing = attendanceMap.get(att.employeeId) || []
        existing.push(att)
        attendanceMap.set(att.employeeId, existing)
      }

      const previousSalaryMap = new Map<string, RawPreviousSalary>()
      for (const sal of prevSalaryResult.EmployeeSalary || []) {
        if (!previousSalaryMap.has(sal.employeeId)) {
          previousSalaryMap.set(sal.employeeId, sal)
        }
      }

      const allEmployees = positions
        .filter(p => p.employee?.id)
        .map(pos =>
          buildPayrollEmployee(
            pos,
            salaryMap,
            absenceMap,
            attendanceMap,
            previousSalaryMap,
            effectiveCountry,
            month,
            year,
            referenceDate
          )
        )

      const changedByUserIds = new Set<string>()
      for (const emp of allEmployees) {
        for (const change of emp.changes) {
          if (change.changedBy) changedByUserIds.add(change.changedBy)
        }
      }

      if (changedByUserIds.size > 0) {
        try {
          const userResult = await client.request<{
            Employee: Array<{ userId: string; displayName: string | null; fullName: string | null }>
          }>(GET_EMPLOYEES_BY_USER_IDS, { userIds: [...changedByUserIds] })

          const userNameMap = new Map<string, string>()
          for (const u of userResult.Employee || []) {
            if (u.userId) {
              userNameMap.set(u.userId, u.displayName || u.fullName || u.userId)
            }
          }

          for (const emp of allEmployees) {
            for (const change of emp.changes) {
              if (change.changedBy && userNameMap.has(change.changedBy)) {
                change.changedBy = userNameMap.get(change.changedBy)
              }
            }
          }
        } catch {
          // Non-critical — keep raw user IDs if resolution fails
        }
      }

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

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

interface RawCompanyAddress {
  companyId: string
  addressType: string | null
  countryRef: string | null
  country: { id: string; code: string; value: string } | null
}

export function useCompanyList(accessToken: string) {
  const graphqlClient = useGraphqlClient(accessToken)
  const restClient = useRestClient(ORGCHART_BASE_URL)
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
