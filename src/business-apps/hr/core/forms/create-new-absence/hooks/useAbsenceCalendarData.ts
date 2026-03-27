import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  employeeRegionLookupQuery,
  employmentRegionHolidaysInRangeQuery,
  employeeAbsenceCalendarRangeQuery,
  latestEntitlementSnapshotForRangeQuery
} from '../queries/getEmployeeAbsences'
import { resolveEmploymentRegionRef } from '../utils/employmentRegion'

interface AbsenceCalendarDay {
  dayDate: string
  status: string
  typeRef: string
}

interface UseAbsenceCalendarDataReturn {
  approvedDates: Date[]
  pendingDates: Date[]
  requestDates: Date[]
  bankHolidayDates: Date[]
  entitlementSnapshot: {
    typeRef: string
    periodStart: string
    periodEnd: string
    totalEntitlement: number
    usedApproved: number
    usedPending: number
    remaining: number
    snapshotAt: string
  } | null
  isLoading: boolean
}

/** Parse a YYYY-MM-DD string as a local noon Date to prevent timezone drift. */
const parseLocalDate = (dateStr: string): Date => new Date(`${dateStr}T12:00:00`)

/** Format a local Date as YYYY-MM-DD using local date components. */
const toLocalDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const normalizeStatus = (status: string | null | undefined): string => String(status ?? '').toUpperCase()

/**
 * Fetches absence calendar data and bank holidays for the two months
 * currently visible in the date range picker (visibleMonth + next month).
 * Re-fetches whenever the visible month changes.
 */
export const useAbsenceCalendarData = (
  accessToken: string | undefined,
  employeeId: string,
  visibleMonth: Date,
  selectedTypeRef?: string
): UseAbsenceCalendarDataReturn => {
  const client = useGraphQLClient(accessToken)

  const [regionRef, setRegionRef] = useState<string | null>(null)
  const [approvedDates, setApprovedDates] = useState<Date[]>([])
  const [pendingDates, setPendingDates] = useState<Date[]>([])
  const [requestDates, setRequestDates] = useState<Date[]>([])
  const [bankHolidayDates, setBankHolidayDates] = useState<Date[]>([])
  const [entitlementSnapshot, setEntitlementSnapshot] =
    useState<UseAbsenceCalendarDataReturn['entitlementSnapshot']>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!client || !employeeId) return

    const fetchRegion = async () => {
      try {
        const res = await client.request(employeeRegionLookupQuery, {
          employeeId,
          activeUserLocale: getCurrentActiveUserLocale()
        })
        setRegionRef(resolveEmploymentRegionRef(res))
      } catch {
        setRegionRef(null)
      }
    }

    fetchRegion()
  }, [client, employeeId])

  useEffect(() => {
    if (!client || !employeeId) return

    // Fetch data for the two months visible in the calendar (current + next)
    const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 2, 0)
    const fromStr = toLocalDateStr(monthStart)
    const toStr = toLocalDateStr(monthEnd)

    const fetchData = async () => {
      setIsLoading(true)
      try {
        const absencePromise = client.request(employeeAbsenceCalendarRangeQuery, {
          employeeId,
          from: fromStr,
          to: toStr
        })

        const holidayPromise =
          regionRef != null && regionRef.trim() !== ''
            ? client.request(employmentRegionHolidaysInRangeQuery, {
                regionId: regionRef,
                altCodeFrom: fromStr.replaceAll('-', ''),
                altCodeTo: toStr.replaceAll('-', '')
              })
            : Promise.resolve(null)

        const snapshotPromise =
          selectedTypeRef != null && selectedTypeRef !== ''
            ? client.request(latestEntitlementSnapshotForRangeQuery, {
                employeeId,
                typeRef: selectedTypeRef,
                from: fromStr,
                to: toStr
              })
            : Promise.resolve(null)

        const [absenceResult, holidayResult, snapshotResult] = await Promise.all([
          absencePromise,
          holidayPromise,
          snapshotPromise
        ])

        const days: AbsenceCalendarDay[] = absenceResult?.EmployeeAbsenceCalendarView ?? []
        setApprovedDates(days.filter(d => normalizeStatus(d.status) === 'APPROVED').map(d => parseLocalDate(d.dayDate)))
        setPendingDates(
          days
            .filter(d => {
              const status = normalizeStatus(d.status)
              return status === 'PENDING' || status === 'PLANNED' || status.includes('APPROVAL')
            })
            .map(d => parseLocalDate(d.dayDate))
        )
        setRequestDates(
          days
            .filter(d => {
              const status = normalizeStatus(d.status)
              return status !== 'REJECTED' && status !== 'CANCELLED'
            })
            .map(d => parseLocalDate(d.dayDate))
        )

        if (holidayResult === null) {
          setBankHolidayDates([])
        } else {
          const holidays = (holidayResult?.holidays ?? [])
            .filter((h: { alternativeCode?: string; additionalValue1?: string }) => {
              // Align picker semantics with validation logic:
              // treat 05H entries as half-day and do not mark them as full bank holidays.
              if (h?.additionalValue1 === '05H') return false
              const code = String(h?.alternativeCode ?? '')
              return /^\d{8}$/.test(code)
            })
            .map((h: { alternativeCode: string }) => {
              const c = h.alternativeCode
              return parseLocalDate(`${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`)
            })
          setBankHolidayDates(holidays)
        }

        if (snapshotResult === null) {
          setEntitlementSnapshot(null)
        } else {
          const row = snapshotResult?.EntitlementUsageSnapshotView?.[0]
          if (!row) {
            setEntitlementSnapshot(null)
          } else {
            setEntitlementSnapshot({
              typeRef: row.typeRef,
              periodStart: row.periodStart,
              periodEnd: row.periodEnd,
              totalEntitlement: Number(row.totalEntitlement) || 0,
              usedApproved: Number(row.usedApproved) || 0,
              usedPending: Number(row.usedPending) || 0,
              remaining: Number(row.remaining) || 0,
              snapshotAt: row.snapshotAt
            })
          }
        }
      } catch {
        // Silent fail — calendar renders without markers
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [client, employeeId, regionRef, visibleMonth, selectedTypeRef])

  return { approvedDates, pendingDates, requestDates, bankHolidayDates, entitlementSnapshot, isLoading }
}
