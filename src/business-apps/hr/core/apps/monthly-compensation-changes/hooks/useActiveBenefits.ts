import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ACTIVE_BENEFITS_FOR_MONTH } from '../queries/compensationChangesQueries'
import type { BenefitChangeRecord, ActiveBenefitRow } from '../types/compensationChanges.types'
import { humanizeStatus } from '../utils/formatUtils'

interface ActiveBenefitsData {
  rows: ActiveBenefitRow[]
  loading: boolean
  error: string | null
  counts: {
    totalBenefits: number
    employeesWithBenefits: number
    avgBenefitsPerEmployee: number
  }
}

function toRow(record: BenefitChangeRecord): ActiveBenefitRow {
  const statusLabel = humanizeStatus(record.benefitStatus ?? record.status)

  return {
    id: record.id,
    employeeId: record.employeeId,
    employeeName: record.employee?.displayName ?? record.employee?.fullName ?? '-',
    employeePicture: record.employee?.pictureThumbnail,
    benefitType: record.benefitType?.value ?? '-',
    provider: record.benefitProvider?.value ?? '-',
    status: statusLabel === '-' ? 'Active' : statusLabel,
    monthlyAmount: record.monthlyAmount,
    yearlyAmount: record.yearlyAmount,
    employeeContribution: record.employeeMonthlyContribution,
    currency: record.currency?.code ?? record.currency?.value ?? '',
    startDate: record.startDate,
    endDate: record.endDate,
    raw: record
  }
}

export function useActiveBenefits(
  accessToken: string,
  selectedDate: Date,
  allowedEmployeeIds?: Set<string> | null
): ActiveBenefitsData {
  const graphqlClient = useGraphQLClient(accessToken)
  const requestIdRef = useRef(0)
  const [benefits, setBenefits] = useState<BenefitChangeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const monthStart = useMemo(() => format(startOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])
  const monthEnd = useMemo(() => format(endOfMonth(selectedDate), 'yyyy-MM-dd'), [selectedDate])

  const fetchData = useCallback(async () => {
    const requestId = (requestIdRef.current += 1)
    setLoading(true)
    setError(null)

    try {
      const data = await graphqlClient.request<{ ActiveBenefits: BenefitChangeRecord[] }>(
        GET_ACTIVE_BENEFITS_FOR_MONTH,
        { monthStart, monthEnd }
      )
      if (requestId !== requestIdRef.current) {
        return
      }

      // Store raw month data; company filtering is applied client-side via `allowedEmployeeIds`.
      setBenefits(data.ActiveBenefits ?? [])
    } catch (err) {
      if (requestId === requestIdRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load active benefits')
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [graphqlClient, monthStart, monthEnd])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredBenefits = useMemo(() => {
    if (allowedEmployeeIds === undefined) return []
    if (!allowedEmployeeIds) return benefits
    return benefits.filter(r => allowedEmployeeIds.has(r.employeeId))
  }, [allowedEmployeeIds, benefits])

  const rows = useMemo(() => filteredBenefits.map(toRow), [filteredBenefits])

  const counts = useMemo(() => {
    const uniqueEmployees = new Set(filteredBenefits.map(b => b.employeeId))
    const totalBenefits = filteredBenefits.length
    const employeesWithBenefits = uniqueEmployees.size
    const avgBenefitsPerEmployee =
      employeesWithBenefits > 0 ? Math.round((totalBenefits / employeesWithBenefits) * 10) / 10 : 0

    return { totalBenefits, employeesWithBenefits, avgBenefitsPerEmployee }
  }, [filteredBenefits])

  return { rows, loading, error, counts }
}
