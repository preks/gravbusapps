import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Employee } from '../types/employee.types'
import { filterEmployeesByStartedEmployment } from '../utils/hireDateFilters'

export interface EmployeeWithMissingProfile {
  id: string
  firstName: string
  lastName: string
  fullName: string
  pictureThumbnail?: string
  jobPositionName?: string
  organizationalUnitName?: string
  missingProfileReason: 'no_job_position' | 'no_job_profile' | 'incomplete_profile'
}

export interface UseMissingJobProfilesResult {
  employeesWithMissingProfiles: EmployeeWithMissingProfile[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

interface UseMissingJobProfilesProps {
  accessToken: string
  managerId: string
}

/**
 * Hook to fetch team members with missing or incomplete job profiles
 * Checks for employees who either:
 * 1. Don't have a job position assigned
 * 2. Have a job position but no job profile attached
 * 3. Have an incomplete job profile (missing key fields)
 */
export const useMissingJobProfiles = ({
  accessToken,
  managerId
}: UseMissingJobProfilesProps): UseMissingJobProfilesResult => {
  const [employeesWithMissingProfiles, setEmployeesWithMissingProfiles] = useState<EmployeeWithMissingProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  const fetchMissingJobProfiles = async () => {
    if (!managerId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Query to get direct reports with detailed job position information
      const missingProfilesQuery = `
        query GetTeamMissingJobProfiles($managerId: uuid!) {
          Employee(
            where: {
              employeePosition: { supervisorEmployeeId: { _eq: $managerId } },
              isDeleted: { _eq: false }
            }
            orderBy: [{ firstName: ASC }, { lastName: ASC }]
          ) {
            id
            firstName
            lastName
            pictureThumbnail
            workingCondition {
              hireDate
            }
            employeePosition {
              id
              jobPositionId
              organizationalUnit {
                name
              }
              jobPosition {
                id
                name
                jobFunction {
                  id
                  name
                  jobFamily {
                    code
                  }
                }
                jobLevel {
                  id
                  name
                }
              }
            }
          }
        }
      `

      const response = await graphQLClient.request(missingProfilesQuery, {
        managerId
      })

      if (response?.Employee) {
        const employees = filterEmployeesByStartedEmployment(response.Employee)
        const employeesWithIssues: EmployeeWithMissingProfile[] = employees
          .map((employee: Employee) => {
            const employeePosition = employee.employeePosition?.[0]

            let missingProfileReason: 'no_job_position' | 'no_job_profile' | 'incomplete_profile' | null = null

            // Check if employee has no job position assigned
            if (!employeePosition?.jobPositionId || !employeePosition?.jobPosition) {
              missingProfileReason = 'no_job_position'
            }
            // Check if job position exists but has incomplete profile
            else if (employeePosition.jobPosition) {
              const jobPosition = employeePosition.jobPosition

              // Check for missing critical job profile components
              if (!jobPosition.jobFunction || !jobPosition.jobLevel || !jobPosition.jobFunction.jobFamily) {
                missingProfileReason = 'incomplete_profile'
              }
              // Additional checks for empty/null values
              else if (
                !jobPosition.name ||
                !jobPosition.jobFunction.name ||
                !jobPosition.jobLevel.name ||
                !jobPosition.jobFunction.jobFamily.value
              ) {
                missingProfileReason = 'incomplete_profile'
              }
            }

            // Only return employees with identified issues
            if (missingProfileReason) {
              return {
                id: employee.id,
                firstName: employee.firstName,
                lastName: employee.lastName,
                fullName: `${employee.firstName} ${employee.lastName}`,
                pictureThumbnail: employee.pictureThumbnail,
                jobPositionName: employeePosition?.jobPosition?.name || 'No Position',
                organizationalUnitName: employeePosition?.organizationalUnit?.name,
                missingProfileReason
              }
            }

            return null
          })
          .filter((employee: EmployeeWithMissingProfile | null) => employee !== null)

        setEmployeesWithMissingProfiles(employeesWithIssues)
      } else {
        setEmployeesWithMissingProfiles([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch missing job profiles'))
      console.error('Error fetching missing job profiles:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMissingJobProfiles()
  }, [managerId, accessToken])

  return {
    employeesWithMissingProfiles,
    loading,
    error,
    refetch: fetchMissingJobProfiles
  }
}
