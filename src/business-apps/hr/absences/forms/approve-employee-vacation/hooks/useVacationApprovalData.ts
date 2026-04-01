/**
 * useVacationApprovalData Hook
 * Fetches all required data for vacation approval (employee, substitute, absence type)
 */

import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCatalogValue } from '@/common/utils/windowUtils'

interface UseVacationApprovalDataProps {
  accessToken: string
  employeeId?: string
  substituteEmployeeId?: string
  absenceTypeRef?: string
}

interface EmployeeData {
  id: string
  userId?: string // User ID for chat integration
  displayName: string
  firstName?: string
  lastName?: string
  position?: string
  organizationalUnit?: string
  avatarUrl?: string
}

export const useVacationApprovalData = ({
  accessToken,
  employeeId,
  substituteEmployeeId,
  absenceTypeRef
}: UseVacationApprovalDataProps) => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [substituteEmployeeName, setSubstituteEmployeeName] = useState<string>('')
  const [absenceTypeName, setAbsenceTypeName] = useState<string>('Vacation')
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(false)
  const [isLoadingSubstitute, setIsLoadingSubstitute] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Fetch employee data
  useEffect(() => {
    const fetchEmployeeData = async () => {
      if (!accessToken || !employeeId) return

      setIsLoadingEmployee(true)
      try {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
              id
              userId
              firstName
              lastName
              displayName
              pictureThumbnail
              employeePosition {
                jobPosition {
                  name
                }
                organizationalUnit {
                  name
                }
              }
            }
          }
        `

        const response = await graphqlClient.request<{ Employee: any[] }>(employeeQuery, {
          employeeId
        })

        if (response.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]

          // Convert pictureThumbnail to data URL format
          const toDataUrl = (raw: string | null | undefined): string | undefined => {
            if (!raw) return undefined

            // Check if it's already a data URL
            if (raw.startsWith('data:')) return raw

            // Check if it's JSON metadata (cannot extract without file service)
            try {
              JSON.parse(raw)
              return undefined // JSON metadata, cannot use directly
            } catch {
              // Not JSON, proceed with base64 conversion
            }

            // Detect image format by base64 prefix
            if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}` // JPEG
            if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}` // PNG
            if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}` // GIF

            // Default: assume GIF format (most common in this codebase)
            return `data:image/gif;base64,${raw}`
          }

          setEmployeeData({
            id: employee.id,
            userId: employee.userId,
            displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
            firstName: employee.firstName,
            lastName: employee.lastName,
            position: employee.employeePosition?.jobPosition?.name,
            organizationalUnit: employee.employeePosition?.organizationalUnit?.name,
            avatarUrl: toDataUrl(employee.pictureThumbnail)
          })
        }
      } catch (err) {
        console.error('Error fetching employee data:', err)
        setError('Failed to load employee data')
      } finally {
        setIsLoadingEmployee(false)
      }
    }

    fetchEmployeeData()
  }, [accessToken, employeeId, graphqlClient])

  // Fetch substitute employee name
  useEffect(() => {
    const fetchSubstituteEmployee = async () => {
      if (!accessToken || !substituteEmployeeId) return

      setIsLoadingSubstitute(true)
      try {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: {id: {_eq: $employeeId}}, limit: 1) {
              id
              firstName
              lastName
              displayName
            }
          }
        `

        const response = await graphqlClient.request<{ Employee: any[] }>(employeeQuery, {
          employeeId: substituteEmployeeId
        })

        if (response.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]
          setSubstituteEmployeeName(employee.displayName || `${employee.firstName} ${employee.lastName}`)
        }
      } catch (err) {
        console.error('Error fetching substitute employee:', err)
      } finally {
        setIsLoadingSubstitute(false)
      }
    }

    fetchSubstituteEmployee()
  }, [accessToken, substituteEmployeeId, graphqlClient])

  // Fetch absence type name from catalog (with translations)
  useEffect(() => {
    const fetchAbsenceTypeName = async () => {
      if (!accessToken || !absenceTypeRef) return

      try {
        const absenceTypeCode = absenceTypeRef.split(':').pop()

        const catalogQuery = `
          query GetAbsenceType($code: String!) {
            CatalogEntry(
              where: {
                catalog: {
                  identifier: {_eq: "AbsenceType"},
                  version: {_eq: "v1"}
                },
                code: {_eq: $code},
                isDeleted: {_eq: false}
              },
              limit: 1
            ) {
              id
              value
              code
              translations {
                localeCode
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{ CatalogEntry: any[] }>(catalogQuery, {
          code: absenceTypeCode
        })

        if (result.CatalogEntry && result.CatalogEntry.length > 0) {
          // Use getCatalogValue to get the translated value based on current locale
          const translatedValue = getCatalogValue(result.CatalogEntry[0])
          setAbsenceTypeName(translatedValue ?? 'Vacation')
        }
      } catch (err) {
        console.error('Error fetching absence type:', err)
      }
    }

    fetchAbsenceTypeName()
  }, [accessToken, absenceTypeRef, graphqlClient])

  return {
    employeeData,
    substituteEmployeeName,
    absenceTypeName,
    isLoadingEmployee,
    isLoadingSubstitute,
    error
  }
}
