import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface TeamMemberAttendance {
  employeeId: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
  jobPositionName?: string
  // Attendance status
  isClockedIn: boolean
  isInOffice: boolean
  isRemote: boolean
  clockInTime?: string
}

export interface TeamAttendanceResult {
  teamAttendance: TeamMemberAttendance[]
  inOfficeCount: number
  remoteCount: number
  notClockedInCount: number
  /** IDs of employees who are available but not clocked in */
  notClockedInEmployeeIds: string[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseTeamAttendanceProps {
  accessToken: string
  managerId: string
  /** List of available employee IDs (not on leave) to determine who should be clocked in */
  availableEmployeeIds: string[]
}

/**
 * Hook to fetch team attendance/time tracking data
 * Determines who is in office, remote, or not clocked in yet
 */
export const useTeamAttendance = ({
  accessToken,
  managerId,
  availableEmployeeIds
}: UseTeamAttendanceProps): TeamAttendanceResult => {
  const [teamAttendance, setTeamAttendance] = useState<TeamMemberAttendance[]>([])
  const [inOfficeCount, setInOfficeCount] = useState(0)
  const [remoteCount, setRemoteCount] = useState(0)
  const [notClockedInCount, setNotClockedInCount] = useState(0)
  const [notClockedInEmployeeIds, setNotClockedInEmployeeIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphqlClient(accessToken)

  const fetchTeamAttendance = useCallback(async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Get today's date in ISO format
      const today = new Date().toISOString().split('T')[0]

      // Step 1: Get all direct reports with basic info
      const directReportsQuery = `
        query GetDirectReportsForAttendance($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            employeePosition {
              jobPosition {
                name
              }
            }
          }
        }
      `

      const directReportsResponse = await graphQLClient.request(directReportsQuery, { managerId })
      const employees = directReportsResponse?.Employee || []

      if (employees.length === 0) {
        setTeamAttendance([])
        setInOfficeCount(0)
        setRemoteCount(0)
        setNotClockedInCount(0)
        setNotClockedInEmployeeIds([])
        setLoading(false)
        return
      }

      const employeeIds = employees.map((emp: any) => emp.id)

      // Step 2: Query today's attendance for all team members
      const attendanceQuery = `
        query GetTeamAttendance($employeeIds: [uuid!]!, $today: date!) {
          EmployeeAttendance(
            where: {
              employeeId: { _in: $employeeIds },
              attendanceDate: { _eq: $today },
              isDeleted: { _eq: false },
              startTime: { _isNull: false }
            }
          ) {
            id
            employeeId
            attendanceLocation
            startTime
            endTime
          }
        }
      `

      const attendanceResponse = await graphQLClient.request(attendanceQuery, {
        employeeIds,
        today
      })

      const attendanceRecords = attendanceResponse?.EmployeeAttendance || []

      // Create a map of employee attendance
      const attendanceMap = new Map<string, { isInOffice: boolean; clockInTime: string; isClockedOut: boolean }>()

      for (const record of attendanceRecords) {
        // Only consider currently active attendance (not clocked out)
        if (!record.endTime) {
          const isInOffice = record.attendanceLocation === 'IS_NEAR_OFFICE'
          attendanceMap.set(record.employeeId, {
            isInOffice,
            clockInTime: record.startTime,
            isClockedOut: false
          })
        }
      }

      // Step 3: Build team attendance data
      let officeCount = 0
      let remoteWorkers = 0
      let notClockedIn = 0
      const notClockedInIds: string[] = []

      const teamData: TeamMemberAttendance[] = employees.map((emp: any) => {
        const attendance = attendanceMap.get(emp.id)
        const isClockedIn = !!attendance
        const isInOffice = attendance?.isInOffice || false
        const isRemote = isClockedIn && !isInOffice

        if (isInOffice) officeCount++
        if (isRemote) remoteWorkers++

        // Check if available (not on leave) but not clocked in
        if (!isClockedIn && availableEmployeeIds.includes(emp.id)) {
          notClockedIn++
          notClockedInIds.push(emp.id)
        }

        return {
          employeeId: emp.id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          pictureThumbnail: emp.pictureThumbnail,
          jobPositionName: emp.employeePosition?.[0]?.jobPosition?.name || '',
          isClockedIn,
          isInOffice,
          isRemote,
          clockInTime: attendance?.clockInTime
        }
      })

      setTeamAttendance(teamData)
      setInOfficeCount(officeCount)
      setRemoteCount(remoteWorkers)
      setNotClockedInCount(notClockedIn)
      setNotClockedInEmployeeIds(notClockedInIds)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch team attendance'))
      console.error('Error fetching team attendance:', err)
    } finally {
      setLoading(false)
    }
  }, [managerId, accessToken, availableEmployeeIds, graphQLClient])

  useEffect(() => {
    fetchTeamAttendance()
  }, [fetchTeamAttendance])

  return {
    teamAttendance,
    inOfficeCount,
    remoteCount,
    notClockedInCount,
    notClockedInEmployeeIds,
    loading,
    error,
    refetch: () => {
      fetchTeamAttendance()
    }
  }
}
