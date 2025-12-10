import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_LIVE_PRESENCE } from '../queries/attendanceQueries'
import { LivePresenceRecord } from '../types'
import { formatDateToISO } from '../utils/dateUtils'

export const useLivePresence = (accessToken: string, structureId: string) => {
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
      const result = await graphqlClient.request(GET_LIVE_PRESENCE, {
        today,
        structureId
      })

      // Create a map of employee site locations for quick lookup
      const siteLocationMap = new Map<string, string>()
      result.EmployeeSiteLocation?.forEach((esl: any) => {
        siteLocationMap.set(esl.employeeId, esl.siteLocationId)
      })

      const records: LivePresenceRecord[] = result.EmployeeAttendance.map((att: any) => {
        const siteLocationId = siteLocationMap.get(att.employeeId) || 'unknown'

        return {
          id: att.id,
          employeeId: att.employeeId,
          startTime: att.startTime,
          siteLocationId,
          siteLocationName: 'Unknown', // Will be looked up from locations data
          employee: {
            id: att.employee.id,
            firstName: att.employee.firstName,
            lastName: att.employee.lastName,
            displayName: att.employee.displayName,
            businessKey: att.employee.businessKey,
            jobTitle: att.employee.employeePosition?.[0]?.jobPosition?.name,
            organizationalUnit: att.employee.employeePosition?.[0]?.organizationalUnit?.name,
            pictureUrl: att.employee.pictureThumbnail
          }
        }
      })

      setPresence(records)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch live presence'))
      console.error('Error fetching live presence:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, structureId, graphqlClient])

  return { presence, isLoading, error, lastRefresh, fetchPresence, refetch: fetchPresence }
}
