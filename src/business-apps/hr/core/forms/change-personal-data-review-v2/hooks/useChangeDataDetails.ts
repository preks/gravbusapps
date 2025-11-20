import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EMPLOYEE_DATA_QUERY } from '../queries/ChangeDataReviewQueries'

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  displayName: string
  picture?: string
  pictureThumbnail?: string
  position?: string
}

export const useChangeDataDetails = (accessToken: string, employeeId?: string) => {
  const [employee, setEmployee] = useState<EmployeeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!employeeId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const result = await graphqlClient.request<{
          EmployeeByPk: any
          EmployeePosition: any[]
        }>(EMPLOYEE_DATA_QUERY, {
          idEmployee: employeeId
        })

        if (result.EmployeeByPk) {
          const emp = result.EmployeeByPk
          const position = result.EmployeePosition?.[0]

          // Convert pictureThumbnail to data URL if available
          const toDataUrl = (raw: string | null | undefined): string | undefined => {
            if (!raw) return undefined
            if (raw.startsWith('data:')) return raw
            try {
              JSON.parse(raw)
              return undefined // JSON metadata, cannot use directly
            } catch {
              // Not JSON, proceed with base64 conversion
            }
            if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
            if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
            if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
            return `data:image/gif;base64,${raw}` // Default to GIF
          }

          setEmployee({
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
            picture: toDataUrl(emp.pictureThumbnail),
            pictureThumbnail: toDataUrl(emp.pictureThumbnail),
            position: position?.jobPosition?.name
          })
        } else {
          setError('Employee not found')
        }
      } catch (err) {
        console.error('Error fetching employee details:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee details')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployeeDetails()
  }, [accessToken, employeeId, graphqlClient])

  return { employee, loading, error }
}
