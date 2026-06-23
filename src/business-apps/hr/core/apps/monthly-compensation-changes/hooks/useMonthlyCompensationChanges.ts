import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_MONTHLY_SALARY_CHANGES,
  GET_MONTHLY_BONUSES,
  GET_MONTHLY_BENEFIT_CHANGES,
  GET_SALARY_ADJUST_REASON_CATALOG
} from '../queries/compensationChangesQueries'
import type {
  SalaryChangeRecord,
  BonusRecord,
  BenefitChangeRecord,
  CompensationChangeRow
} from '../types/compensationChanges.types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { humanizeStatus, humanizeCatalogRef, formatCurrencyValue, getCatalogDisplayValue } from '../utils/formatUtils'

interface MonthlyCompensationData {
  rows: CompensationChangeRow[]
  salaryChanges: SalaryChangeRecord[]
  bonuses: BonusRecord[]
  benefitChanges: BenefitChangeRecord[]
  loading: boolean
  error: string | null
  counts: { salary: number; bonus: number; benefit: number; total: number }
}

function salaryToRow(record: SalaryChangeRecord): CompensationChangeRow {
  const curr = record.currency?.code ?? record.currency?.value ?? ''
  const hasRequestedPercent = record.requestedPercent !== null && record.requestedPercent !== undefined
  const pctStr = hasRequestedPercent ? ` (${record.requestedPercent}%)` : ''
  const amount = getSalaryChangeAmount(record, curr)

  return {
    id: record.id,
    category: 'salary',
    employeeId: record.employeeId,
    employeeName: record.employee?.displayName ?? record.employee?.fullName ?? '-',
    employeePicture: record.employee?.pictureThumbnail,
    date: record.startDate ?? record.createdAt,
    description: 'description-salary-adjustment' + pctStr,
    detail: getSalaryReasonDisplay(record),
    amount,
    status: humanizeStatus(record.requestStatus),
    raw: record
  }
}

function getSalaryReasonDisplay(record: SalaryChangeRecord): string {
  if (record.salaryAdjustReason) {
    return getCatalogDisplayValue(record.salaryAdjustReason)
  }

  if (record.salaryAdjustReasonRef) {
    return humanizeCatalogRef(record.salaryAdjustReasonRef)
  }

  return record.notes ?? '-'
}

function getSalaryChangeAmount(record: SalaryChangeRecord, currencyCode: string): string {
  if (record.requestedAmount !== null && record.requestedAmount !== undefined) {
    return formatCurrencyValue(record.requestedAmount, currencyCode)
  }

  if (record.requestedPercent !== null && record.requestedPercent !== undefined) {
    return `${record.requestedPercent}%`
  }

  return `${formatCurrencyValue(record.monthlyGrossSalary, currencyCode)}__PER_MONTH__`
}

function bonusToRow(record: BonusRecord): CompensationChangeRow {
  const curr = record.currency?.code ?? record.currency?.value ?? ''

  return {
    id: record.id,
    category: 'bonus',
    employeeId: record.employeeId,
    employeeName: record.employee?.displayName ?? record.employee?.fullName ?? '-',
    employeePicture: record.employee?.pictureThumbnail,
    date: record.paymentDate ?? record.createdAt,
    description: record.employeeBonusType ? getCatalogDisplayValue(record.employeeBonusType) : 'category-bonus',
    detail: record.description ?? record.notes ?? '-',
    amount: formatCurrencyValue(record.amount, curr),
    status: humanizeStatus(record.status),
    raw: record
  }
}

function benefitToRow(record: BenefitChangeRecord, isDeactivation: boolean): CompensationChangeRow {
  const curr = record.currency?.code ?? record.currency?.value ?? ''
  const action = isDeactivation ? 'Deactivation' : 'Activation'
  const typeName = record.benefitType ? getCatalogDisplayValue(record.benefitType) : 'category-benefit'
  const benefitStatus = humanizeStatus(record.benefitStatus)
  const recordStatus = humanizeStatus(record.status)
  let rawStatus = action

  if (benefitStatus !== '-') {
    rawStatus = benefitStatus
  } else if (recordStatus !== '-') {
    rawStatus = recordStatus
  }

  return {
    id: `${record.id}-${isDeactivation ? 'deact' : 'act'}`,
    category: 'benefit',
    employeeId: record.employeeId,
    employeeName: record.employee?.displayName ?? record.employee?.fullName ?? '-',
    employeePicture: record.employee?.pictureThumbnail,
    date: isDeactivation
      ? (record.endDate ?? record.updatedAt ?? record.createdAt)
      : (record.startDate ?? record.createdAt),
    description: typeName,
    detail: record.benefitProvider ? getCatalogDisplayValue(record.benefitProvider) : (record.notes ?? '-'),
    amount: `${formatCurrencyValue(record.monthlyAmount, curr)}__PER_MONTH__`,
    status: rawStatus,
    raw: record
  }
}

export function useMonthlyCompensationChanges(
  accessToken: string,
  selectedDate: Date,
  allowedEmployeeIds?: Set<string> | null
): MonthlyCompensationData {
  const graphqlClient = useGraphQLClient(accessToken)
  const requestIdRef = useRef(0)
  const [salaryChanges, setSalaryChanges] = useState<SalaryChangeRecord[]>([])
  const [bonuses, setBonuses] = useState<BonusRecord[]>([])
  const [benefitActivations, setBenefitActivations] = useState<BenefitChangeRecord[]>([])
  const [benefitDeactivations, setBenefitDeactivations] = useState<BenefitChangeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthStart = useMemo(() => format(startOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])
  const monthEnd = useMemo(() => format(endOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])
  const activeUserLocale = useMemo(() => getCurrentActiveUserLocale(), [])

  const fetchData = useCallback(async () => {
    const requestId = (requestIdRef.current += 1)
    setLoading(true)
    setError(null)

    try {
      const variables = { monthStart, monthEnd }
      const localizedVariables = { ...variables, activeUserLocale }
      const [salaryData, bonusData, benefitData, salaryReasonData] = await Promise.all([
        graphqlClient.request<{ EmployeeSalary: SalaryChangeRecord[] }>(GET_MONTHLY_SALARY_CHANGES, variables),
        graphqlClient.request<{ EmployeeBonus: BonusRecord[] }>(GET_MONTHLY_BONUSES, localizedVariables),
        graphqlClient.request<{
          BenefitActivations: BenefitChangeRecord[]
          BenefitDeactivations: BenefitChangeRecord[]
        }>(GET_MONTHLY_BENEFIT_CHANGES, localizedVariables),
        graphqlClient.request<{ CatalogEntry: NonNullable<SalaryChangeRecord['salaryAdjustReason']>[] }>(
          GET_SALARY_ADJUST_REASON_CATALOG,
          { activeUserLocale }
        )
      ])
      if (requestId !== requestIdRef.current) {
        return
      }

      const salaryReasonById = new Map((salaryReasonData.CatalogEntry ?? []).map(entry => [entry.id, entry]))
      const enrichedSalaryChanges = (salaryData.EmployeeSalary ?? []).map(record => ({
        ...record,
        salaryAdjustReason: record.salaryAdjustReasonRef
          ? (salaryReasonById.get(record.salaryAdjustReasonRef) ?? null)
          : null
      }))

      // Store raw month data; company filtering is applied client-side via `allowedEmployeeIds`.
      setSalaryChanges(enrichedSalaryChanges)
      setBonuses(bonusData.EmployeeBonus ?? [])
      setBenefitActivations(benefitData.BenefitActivations ?? [])
      setBenefitDeactivations(benefitData.BenefitDeactivations ?? [])
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load compensation changes')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [activeUserLocale, graphqlClient, monthStart, monthEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filterByCompany = useCallback(
    <T extends { employeeId: string }>(records: T[]): T[] => {
      if (allowedEmployeeIds === undefined) {
        return []
      }
      if (!allowedEmployeeIds) {
        return records
      }
      return records.filter(r => allowedEmployeeIds.has(r.employeeId))
    },
    [allowedEmployeeIds]
  )

  const filteredSalaryChanges = useMemo(() => filterByCompany(salaryChanges), [salaryChanges, filterByCompany])
  const filteredBonuses = useMemo(() => filterByCompany(bonuses), [bonuses, filterByCompany])
  const filteredBenefitActivations = useMemo(
    () => filterByCompany(benefitActivations),
    [benefitActivations, filterByCompany]
  )
  const filteredBenefitDeactivations = useMemo(
    () => filterByCompany(benefitDeactivations),
    [benefitDeactivations, filterByCompany]
  )

  const benefitChanges = useMemo(() => {
    const actIds = new Set(filteredBenefitActivations.map(b => b.id))
    return [...filteredBenefitActivations, ...filteredBenefitDeactivations.filter(b => !actIds.has(b.id))]
  }, [filteredBenefitActivations, filteredBenefitDeactivations])

  const rows = useMemo<CompensationChangeRow[]>(() => {
    if (allowedEmployeeIds === undefined) return []

    const salaryRows = filteredSalaryChanges.map(salaryToRow)
    const bonusRows = filteredBonuses.map(bonusToRow)

    const actIds = new Set(filteredBenefitActivations.map(b => b.id))
    const deactOnlyIds = new Set(filteredBenefitDeactivations.filter(b => !actIds.has(b.id)).map(b => b.id))

    const benefitRows = [
      ...filteredBenefitActivations.map(b => benefitToRow(b, false)),
      ...filteredBenefitDeactivations.filter(b => deactOnlyIds.has(b.id)).map(b => benefitToRow(b, true))
    ]

    const all = [...salaryRows, ...bonusRows, ...benefitRows]
    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return all
  }, [
    allowedEmployeeIds,
    filteredSalaryChanges,
    filteredBonuses,
    filteredBenefitActivations,
    filteredBenefitDeactivations
  ])

  const counts = useMemo(
    () => ({
      salary: filteredSalaryChanges.length,
      bonus: filteredBonuses.length,
      benefit:
        filteredBenefitActivations.length +
        filteredBenefitDeactivations.filter(b => !filteredBenefitActivations.some(a => a.id === b.id)).length,
      total: rows.length
    }),
    [
      filteredSalaryChanges.length,
      filteredBonuses.length,
      filteredBenefitActivations,
      filteredBenefitDeactivations,
      rows.length
    ]
  )

  return {
    rows,
    salaryChanges: filteredSalaryChanges,
    bonuses: filteredBonuses,
    benefitChanges,
    loading,
    error,
    counts
  }
}
