import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_OFFICE_ATTENDANCE } from '../queries/attendanceQueries'
import { OfficeAttendanceRecord } from '../types'

export const useOfficeAttendance = (accessToken: string, structureId: string) => {
  const [attendance, setAttendance] = useState<OfficeAttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAttendance = useCallback(
    async (dateFrom: string, dateTo: string) => {
      if (!accessToken || !structureId) return

      setIsLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request(GET_OFFICE_ATTENDANCE, {
          dateFrom,
          dateTo,
          structureId
        })

        const records: OfficeAttendanceRecord[] = result.EmployeeAttendance.map((att: any) => ({
          id: att.id,
          employeeId: att.employeeId,
          attendanceDate: att.attendanceDate,
          startTime: att.startTime,
          endTime: att.endTime,
          effectiveTime: att.effectiveTime,
          employee: {
            id: att.employee.id,
            firstName: att.employee.firstName,
            lastName: att.employee.lastName,
            displayName: att.employee.displayName,
            businessKey: att.employee.businessKey,
            siteLocationId: att.employee.employeeSiteLocation[0]?.siteLocationId,
            siteLocationName: att.employee.employeeSiteLocation[0]?.siteLocation?.name,
            jobTitle: att.employee.employeePosition?.[0]?.jobPosition?.name,
            organizationalUnit:
              att.employee.employeePosition?.[0]?.organizationalUnitEmployee?.[0]?.organizationalUnit?.name
          },
          siteLocationId: att.employee.employeeSiteLocation[0]?.siteLocationId || 'unknown'
        }))

        setAttendance(records)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch office attendance'))
        console.error('Error fetching office attendance:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, structureId, graphqlClient]
  )

  return { attendance, isLoading, error, fetchAttendance }
}
