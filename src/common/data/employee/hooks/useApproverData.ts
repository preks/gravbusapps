/**
 * useApproverData Hook
 * Generic hook for fetching approver display name from Employee entity
 * Used in approval/acknowledgment forms to resolve approver UUID to human-readable name
 */

import { useState, useEffect, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

interface UseApproverDataProps {
  accessToken: string
  approverId: string | null | undefined
}

interface ApproverDataResult {
  approverName: string | null
  isLoading: boolean
  error: string | null
}

export const useApproverData = ({ accessToken, approverId }: UseApproverDataProps): ApproverDataResult => {
  const [approverName, setApproverName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)
  // Use ref to avoid endless loop - graphqlClient changes reference on every render
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

  useEffect(() => {
    const fetchApproverName = async () => {
      if (!accessToken || !approverId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetApproverName($approverId: uuid!) {
            Employee(where: {id: {_eq: $approverId}}, limit: 1) {
              id
              displayName
              firstName
              lastName
            }
          }
        `

        const response = await graphqlClientRef.current.request<{
          Employee: any[]
        }>(query, {
          approverId
        })

        if (response.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]
          // Use same pattern as other HR forms: displayName || firstName + lastName || 'Unknown'
          const name =
            employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown'
          setApproverName(name)
        } else {
          setApproverName('Unknown')
        }
      } catch (err) {
        console.error('Error fetching approver name:', err)
        setError(`Failed to fetch approver name: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setApproverName('Unknown')
      } finally {
        setIsLoading(false)
      }
    }

    fetchApproverName()
  }, [accessToken, approverId])

  return {
    approverName,
    isLoading,
    error
  }
}
