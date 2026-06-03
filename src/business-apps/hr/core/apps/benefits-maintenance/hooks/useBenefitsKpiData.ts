import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BENEFIT_TYPE_CATALOG, BENEFIT_TYPE_VERSION } from '../constants/benefitsMaintenanceConstants'

interface BenefitsKpiCounts {
  availableBenefits: number
  privateBenefits: number
  employeesWithBenefits: number
  avgBenefitsPerEmployee: number
  totalActiveBenefitAssignments: number
}

interface BenefitsKpiTrends {
  availableBenefitsDelta: number
  privateBenefitsDelta: number
  employeesWithBenefitsDelta: number
  avgBenefitsPerEmployeeDelta: number
}

export interface BenefitsKpiData {
  counts: BenefitsKpiCounts
  trends: BenefitsKpiTrends
  loading: boolean
}

const GET_BENEFIT_CATALOG_KPI = `
  query GetBenefitCatalogKpi($catalog: String!, $version: String!) {
    AllBenefits: CatalogEntry(
      where: {
        catalog: { identifier: { _eq: $catalog }, version: { _eq: $version } }
        isDeleted: { _eq: false }
      }
    ) {
      id
      objectValue
    }
  }
`

const GET_ACTIVE_BENEFITS_KPI = `
  query GetActiveBenefitsKpi(
    $currentMonthStart: date!
    $currentMonthEnd: date!
    $prevMonthStart: date!
    $prevMonthEnd: date!
  ) {
    CurrentMonth: EmployeeBenefit(
      where: {
        isDeleted: { _eq: false }
        startDate: { _lte: $currentMonthEnd }
        _or: [
          { endDate: { _isNull: true } }
          { endDate: { _gte: $currentMonthStart } }
        ]
      }
    ) {
      id
      employeeId
    }
    PreviousMonth: EmployeeBenefit(
      where: {
        isDeleted: { _eq: false }
        startDate: { _lte: $prevMonthEnd }
        _or: [
          { endDate: { _isNull: true } }
          { endDate: { _gte: $prevMonthStart } }
        ]
      }
    ) {
      id
      employeeId
    }
  }
`

interface CatalogKpiResult {
  AllBenefits: Array<{
    id: string
    objectValue?: Record<string, any> | string
  }>
}

interface ActiveBenefitsKpiResult {
  CurrentMonth: Array<{ id: string; employeeId: string }>
  PreviousMonth: Array<{ id: string; employeeId: string }>
}

function isPrivateBenefit(objectValue?: Record<string, any> | string): boolean {
  if (!objectValue) return false
  const obj =
    typeof objectValue === 'string'
      ? (() => {
          try {
            return JSON.parse(objectValue)
          } catch {
            return {}
          }
        })()
      : objectValue
  const groups: string[] = obj?.groups ?? []
  return groups.length > 0 && groups.every(g => g === 'all-hr-backoffice')
}

function computeEmployeeStats(benefits: Array<{ id: string; employeeId: string }>) {
  const uniqueEmployees = new Set(benefits.map(b => b.employeeId))
  const total = benefits.length
  const employees = uniqueEmployees.size
  const avg = employees > 0 ? Math.round((total / employees) * 10) / 10 : 0
  return { total, employees, avg }
}

export function useBenefitsKpiData(accessToken: string): BenefitsKpiData {
  const graphqlClient = useGraphQLClient(accessToken)
  const requestIdRef = useRef(0)

  const [catalogData, setCatalogData] = useState<CatalogKpiResult | null>(null)
  const [employeeData, setEmployeeData] = useState<ActiveBenefitsKpiResult | null>(null)
  const [loading, setLoading] = useState(true)

  const now = useMemo(() => new Date(), [])
  const currentMonthStart = format(startOfMonth(now), 'yyyy-MM-dd')
  const currentMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd')
  const prevMonth = subMonths(now, 1)
  const prevMonthStart = format(startOfMonth(prevMonth), 'yyyy-MM-dd')
  const prevMonthEnd = format(endOfMonth(prevMonth), 'yyyy-MM-dd')

  const fetchData = useCallback(async () => {
    const requestId = (requestIdRef.current += 1)
    setLoading(true)
    try {
      const [catalog, employees] = await Promise.all([
        graphqlClient.request<CatalogKpiResult>(GET_BENEFIT_CATALOG_KPI, {
          catalog: BENEFIT_TYPE_CATALOG,
          version: BENEFIT_TYPE_VERSION
        }),
        graphqlClient.request<ActiveBenefitsKpiResult>(GET_ACTIVE_BENEFITS_KPI, {
          currentMonthStart,
          currentMonthEnd,
          prevMonthStart,
          prevMonthEnd
        })
      ])
      if (requestId !== requestIdRef.current) return
      setCatalogData(catalog)
      setEmployeeData(employees)
    } catch (err) {
      console.error('Failed to load KPI data:', err)
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [graphqlClient, currentMonthStart, currentMonthEnd, prevMonthStart, prevMonthEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const counts = useMemo<BenefitsKpiCounts>(() => {
    const allBenefits = catalogData?.AllBenefits ?? []
    const availableBenefits = allBenefits.length
    const privateBenefits = allBenefits.filter(b => isPrivateBenefit(b.objectValue)).length

    const currentStats = computeEmployeeStats(employeeData?.CurrentMonth ?? [])

    return {
      availableBenefits,
      privateBenefits,
      employeesWithBenefits: currentStats.employees,
      avgBenefitsPerEmployee: currentStats.avg,
      totalActiveBenefitAssignments: currentStats.total
    }
  }, [catalogData, employeeData])

  const trends = useMemo<BenefitsKpiTrends>(() => {
    const prevStats = computeEmployeeStats(employeeData?.PreviousMonth ?? [])
    const currStats = computeEmployeeStats(employeeData?.CurrentMonth ?? [])

    return {
      availableBenefitsDelta: 0,
      privateBenefitsDelta: 0,
      employeesWithBenefitsDelta: currStats.employees - prevStats.employees,
      avgBenefitsPerEmployeeDelta: Math.round((currStats.avg - prevStats.avg) * 10) / 10
    }
  }, [employeeData])

  return { counts, trends, loading }
}
