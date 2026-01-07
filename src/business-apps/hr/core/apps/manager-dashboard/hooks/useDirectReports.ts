import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee, EmployeeAbsence } from '../types/employee.types'

export interface DirectReport {
  displayName: string
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  organizationalUnitName?: string
  status?: 'Available' | 'On Leave' | 'Away'

  // Absence information
  currentAbsence?: {
    type: string
    parentEntryId?: string // e.g., 'AbsenceGroup:v1:HEALTH' for sick leave
    startDate: string
    endDate: string
    status: string // APPROVED, PENDING, etc.
  }
  nextAbsence?: {
    type: string
    parentEntryId?: string
    startDate: string
    endDate: string
    status: string // APPROVED, PENDING, etc.
  }
  userId: string
}

export interface UseDirectReportsResult {
  directReports: DirectReport[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface UseDirectReportsProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch direct reports (subordinates) for a manager
 * Based on the pattern used in CalendarList.tsx and other manager queries
 */
export const useDirectReports = ({ accessToken, managerId }: UseDirectReportsProps): UseDirectReportsResult => {
  const [directReports, setDirectReports] = useState<DirectReport[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchDirectReports = async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query based on CalendarList.tsx pattern for getting direct reports
      const directReportsQuery = `
        query GetDirectReports($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
            limit: 100
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            picture
            employeePosition {
              jobPosition {
                id
                name
              }
              organizationalUnit {
                name
              }
            }
            userId
            displayName
          }
        }
      `

      // Query for absences data
      const getEmployeeAbsencesQuery = `
        query GetEmployeeAbsences($employeeIds: [uuid!]!, $todayTimestamp: timestamp!) {
          EmployeeAbsence(
            where: {
              employeeId: { _in: $employeeIds },
              isDeleted: { _eq: false },
              _or: [
                # All pending absences (for manager approval)
                {
                  status: { _eq: "PENDING" }
                },
                # All confirmed absences where end date >= today (current or future)
                {
                  _and: [
                    { endDate: { _gte: $todayTimestamp } },
                    { status: { _eq: "APPROVED" } }
                  ]
                }
              ]
            }
            orderBy: { startDate: ASC }
          ) {
            id
            employeeId
            startDate
            endDate
            status
            type {
              value
              parentEntryId
            }
          }
        }
      `

      // Calculate today's timestamp for the absence filters (start of day)
      const today = new Date()
      const todayTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString() // Format: YYYY-MM-DDTHH:mm:ss.sssZ

      const response = await graphQLClient.request(directReportsQuery, {
        managerId
      })

      if (response?.Employee && response.Employee.length > 0) {
        const employees = response.Employee
        const employeeIds = employees.map((emp: Employee) => emp.id)

        // Fetch absences for all employees
        let absencesData: EmployeeAbsence[] = []
        if (employeeIds.length > 0) {
          try {
            const absencesResponse = await graphQLClient.request(getEmployeeAbsencesQuery, {
              employeeIds,
              todayTimestamp
            })
            absencesData = absencesResponse?.EmployeeAbsence || []
          } catch (absenceErr) {
            console.warn('Could not fetch absence data:', absenceErr)
            // Continue without absence data if it fails
          }
        }

        // Group absences by employee ID
        const absencesByEmployee = absencesData.reduce(
          (acc: Record<string, EmployeeAbsence[]>, absence: EmployeeAbsence) => {
            if (!acc[absence.employeeId]) {
              acc[absence.employeeId] = []
            }
            acc[absence.employeeId].push(absence)
            return acc
          },
          {}
        )

        const formattedReports: DirectReport[] = employees.map((employee: Employee) => {
          const absences = absencesByEmployee[employee.id] || []
          const now = new Date()

          // Find current absence (currently active)
          const currentAbsence = absences.find((absence: EmployeeAbsence) => {
            const startDate = new Date(absence.startDate)
            const endDate = new Date(absence.endDate)
            // Add 24 hours to end date to make it inclusive of the full end day
            const endDateInclusive = new Date(endDate.getTime() + 24 * 60 * 60 * 1000)
            const isCurrentlyActive = startDate <= now && endDateInclusive >= now

            return isCurrentlyActive
          })

          // Find next planned absence (starts in the future)
          const futureAbsences = absences.filter((absence: EmployeeAbsence) => {
            const startDate = new Date(absence.startDate)
            return startDate > now
          })
          const nextAbsence = futureAbsences.length > 0 ? futureAbsences[0] : null

          // Determine status based on absence approval status
          let status: 'Available' | 'On Leave' = 'Available'

          if (currentAbsence) {
            if (currentAbsence.status === 'APPROVED') {
              // Only show "On Leave" for confirmed/approved absences that are currently active
              status = 'On Leave'
            } else {
              // For pending or other statuses, show as Available
              status = 'Available'
            }
          }

          return {
            displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
            userId: employee.userId,
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            fullName: `${employee.firstName} ${employee.lastName}`,
            pictureThumbnail: employee.pictureThumbnail || employee.picture,
            jobPositionName: employee.employeePosition?.jobPosition?.name,
            organizationalUnitName: employee.employeePosition?.organizationalUnit?.name,
            status,
            currentAbsence: currentAbsence
              ? {
                  type: currentAbsence.type?.value || 'Leave',
                  parentEntryId: currentAbsence.type?.parentEntryId,
                  startDate: currentAbsence.startDate,
                  endDate: currentAbsence.endDate,
                  status: currentAbsence.status
                }
              : undefined,
            nextAbsence: nextAbsence
              ? {
                  type: nextAbsence.type?.value || 'Leave',
                  parentEntryId: nextAbsence.type?.parentEntryId,
                  startDate: nextAbsence.startDate,
                  endDate: nextAbsence.endDate,
                  status: nextAbsence.status
                }
              : undefined
          }
        })

        setDirectReports(formattedReports)
      } else {
        setDirectReports([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch direct reports'))
      console.error('Error fetching direct reports:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDirectReports()
  }, [managerId, accessToken])

  return {
    directReports,
    loading,
    error,
    refetch: fetchDirectReports
  }
}
