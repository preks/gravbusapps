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

      const records: LivePresenceRecord[] = result.EmployeeAttendance.map((att: any) => ({
        id: att.id,
        employeeId: att.employeeId,
        startTime: att.startTime,
        siteLocationId: att.employee.employeeSiteLocation[0]?.siteLocationId || 'unknown',
        siteLocationName: att.employee.employeeSiteLocation[0]?.siteLocation?.name || 'Unknown',
        employee: {
          id: att.employee.id,
          firstName: att.employee.firstName,
          lastName: att.employee.lastName,
          displayName: att.employee.displayName,
          businessKey: att.employee.businessKey,
          jobTitle: att.employee.employeePosition?.[0]?.jobPosition?.name,
          organizationalUnit:
            att.employee.employeePosition?.[0]?.organizationalUnitEmployee?.[0]?.organizationalUnit?.name,
          pictureUrl: att.employee.pictureUrl
        }
      }))

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
