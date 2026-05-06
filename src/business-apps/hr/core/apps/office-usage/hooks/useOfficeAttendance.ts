import { useState, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_OFFICE_ATTENDANCE, GET_OFFICE_ATTENDANCE_BY_COMPANY } from '../queries/attendanceQueries'
import { OfficeAttendanceRecord } from '../types'

const normalizeToArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

export const useOfficeAttendance = (accessToken: string, structureId: string, selectedCompanyIds: string[] = []) => {
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
        const asOfTs = new Date().toISOString()
        const hasCompanyFilter = selectedCompanyIds.length > 0
        const result = await graphqlClient.request(
          hasCompanyFilter ? GET_OFFICE_ATTENDANCE_BY_COMPANY : GET_OFFICE_ATTENDANCE,
          hasCompanyFilter
            ? {
                dateFrom,
                dateTo,
                structureId,
                asOfTs,
                companyIds: selectedCompanyIds
              }
            : {
                dateFrom,
                dateTo,
                structureId,
                asOfTs
              }
        )

        // Create a map of employee site locations for quick lookup
        const siteLocationMap = new Map<string, string>()
        result.EmployeeSiteLocation?.forEach((esl: any) => {
          siteLocationMap.set(esl.employeeId, esl.siteLocationId)
        })

        const records: OfficeAttendanceRecord[] = (result.EmployeeAttendance ?? []).reduce(
          (acc: OfficeAttendanceRecord[], att: any) => {
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
                jobTitle: primaryPosition?.jobPosition?.name,
                organizationalUnit: primaryPosition?.organizationalUnit?.name,
                pictureUrl: att.employee.pictureThumbnail
              },
              siteLocationId
            })
            return acc
          },
          []
        )

        setAttendance(records)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch office attendance'))
        console.error('Error fetching office attendance:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, structureId, graphqlClient, selectedCompanyIds]
  )

  return { attendance, isLoading, error, fetchAttendance }
}
