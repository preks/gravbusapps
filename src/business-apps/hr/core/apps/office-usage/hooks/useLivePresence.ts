import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS_AND_COMPANY,
  GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS,
  GET_LIVE_PRESENCE_ATTENDANCE,
  GET_LIVE_PRESENCE_ATTENDANCE_BY_COMPANY
} from '../queries/attendanceQueries'
import { LivePresenceRecord } from '../types'
import { formatDateToISO } from '../utils/dateUtils'

const normalizeToArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const useLivePresence = (accessToken: string, structureId: string, selectedCompanyIds: string[] = []) => {
  const [presence, setPresence] = useState<LivePresenceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchPresence = useCallback(async () => {
    if (!accessToken || !structureId) return

    setIsLoading(true)
    setError(null)

    try {
      const today = formatDateToISO(new Date())
      const asOfTs = new Date().toISOString()
      const hasCompanyFilter = selectedCompanyIds.length > 0
      const attendanceResult = await graphqlClient.request(
        hasCompanyFilter ? GET_LIVE_PRESENCE_ATTENDANCE_BY_COMPANY : GET_LIVE_PRESENCE_ATTENDANCE,
        hasCompanyFilter
          ? {
              today,
              structureId,
              asOfTs,
              companyIds: selectedCompanyIds
            }
          : {
              today,
              structureId,
              asOfTs
            }
      )

      const employeeIds = Array.from(
        new Set(
          ((attendanceResult.EmployeeAttendance ?? []) as Array<{ employeeId?: string }>)
            .map(row => row.employeeId)
            .filter((id): id is string => typeof id === 'string' && id.length > 0)
        )
      )

      // Create a map of employee site locations for quick lookup.
      // Fetch only the employees that are currently present (reduces EmployeeSiteLocation payload size).
      const siteLocationMap = new Map<string, string>()
      if (employeeIds.length > 0) {
        const siteLocationsResult = await graphqlClient.request(
          hasCompanyFilter
            ? GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS_AND_COMPANY
            : GET_EMPLOYEE_SITE_LOCATIONS_BY_EMPLOYEE_IDS,
          hasCompanyFilter
            ? {
                structureId,
                employeeIds,
                companyIds: selectedCompanyIds,
                asOfTs
              }
            : {
                structureId,
                employeeIds
              }
        )
        ;(siteLocationsResult.EmployeeSiteLocation ?? []).forEach((esl: any) => {
          if (typeof esl?.employeeId === 'string' && typeof esl?.siteLocationId === 'string') {
            siteLocationMap.set(esl.employeeId, esl.siteLocationId)
          }
        })
      }

      const records: LivePresenceRecord[] = (attendanceResult.EmployeeAttendance ?? []).reduce(
        (acc: LivePresenceRecord[], att: any) => {
          if (!att?.id || !att?.employeeId || !att?.employee?.id) {
            return acc
          }
          const rawEmployeePositions = att.employee.employeePosition
          const employeePositions = normalizeToArray(rawEmployeePositions)
          const isCompanyMatch =
            selectedCompanyIds.length === 0 ||
            employeePositions.some((position: any) => {
              const companyId = position?.companyId
              return typeof companyId === 'string' && selectedCompanyIds.includes(companyId)
            })
          if (!isCompanyMatch) {
            return acc
          }
          const primaryPosition = employeePositions[0]
          const siteLocationId = siteLocationMap.get(att.employeeId) || 'unknown'
          acc.push({
            id: att.id,
            employeeId: att.employeeId,
            startTime: att.startTime,
            siteLocationId,
            siteLocationName: 'Unknown',
            employee: {
              id: att.employee.id,
              firstName: att.employee.firstName,
              lastName: att.employee.lastName,
              displayName: att.employee.displayName,
              businessKey: att.employee.businessKey,
              jobTitle: primaryPosition?.jobPosition?.name,
              organizationalUnit: primaryPosition?.organizationalUnit?.name,
              pictureUrl: att.employee.pictureThumbnail
            }
          })
          return acc
        },
        []
      )

      setPresence(records)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch live presence'))
      console.error('Error fetching live presence!')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient, selectedCompanyIds])

  return { presence, isLoading, error, lastRefresh, fetchPresence, refetch: fetchPresence }
}
