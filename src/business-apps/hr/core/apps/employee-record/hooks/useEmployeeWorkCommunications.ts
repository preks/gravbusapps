import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getEmployeeWithWorkCommunications } from '../queries/getEmployeeWithWorkCommunications'

export interface WorkCommunication {
  id: string
  purpose: string
  value: string
  channel?: {
    value: string
  }
  type?: {
    value: string
  }
}

export interface EmployeeWithWorkCommunications {
  id: string
  firstName: string
  lastName: string
  workCommunications: WorkCommunication[]
  // Extracted for convenience
  email?: string
  phone?: string
}

interface UseEmployeeWorkCommunicationsParams {
  accessToken: string
  employeeId: string
}

export const useEmployeeWorkCommunications = ({ accessToken, employeeId }: UseEmployeeWorkCommunicationsParams) => {
  const [employee, setEmployee] = useState<EmployeeWithWorkCommunications | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  useEffect(() => {
    const fetchEmployeeWithCommunications = async () => {
      if (!accessToken || !employeeId) return

      setLoading(true)
      setError(null)

      try {
        const variables = {
          employeeId
        }

        const response = await graphqlClient.request(getEmployeeWithWorkCommunications, variables)

        // Extract employee data from response
        // The structure is response.Employee[0]
        const employeeData = response?.Employee?.[0] || null

        if (employeeData) {
          // Extract email and phone from work communications for convenience
          const emailComm = Array.isArray(employeeData.workCommunications)
            ? employeeData.workCommunications.find((c: WorkCommunication) => {
                const channelValue = c.channel?.value?.toLowerCase() || ''
                return channelValue.includes('email') || channelValue === 'e-mail'
              })
            : null

          const phoneComm = Array.isArray(employeeData.workCommunications)
            ? employeeData.workCommunications.find((c: WorkCommunication) => {
                const channelValue = c.channel?.value?.toLowerCase() || ''
                // This was causing a reference error - enhancedEmployee hasn't been defined yet
                return (
                  channelValue.includes('phone') || channelValue.includes('mobile') || channelValue.includes('cell')
                )
              })
            : null

          // Enhance employee data with extracted email and phone
          const enhancedEmployee = {
            ...employeeData,
            email: emailComm?.value,
            phone: phoneComm?.value
          }

          setEmployee(enhancedEmployee)
        } else {
          setEmployee(null)
        }
      } catch (err) {
        console.error('Error fetching employee with work communications:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch employee with work communications')
      } finally {
        setLoading(false)
      }
    }

    fetchEmployeeWithCommunications()
  }, [accessToken, employeeId, graphqlClient])

  return {
    employee,
    loading,
    error
  }
}

export default useEmployeeWorkCommunications
