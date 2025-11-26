/**
 * useEntityDates Hook
 * Generic hook for fetching entity creation and update dates from GraphQL entities
 * Supports: EmployeeAbsence, ExpenseRequest, ExpensePlan, AdvancePayment, Feedback, etc.
 */

import { useState, useEffect, useRef } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

interface UseEntityDatesProps {
  accessToken: string
  entityId: string | null | undefined
  entityType: 'EmployeeAbsence' | 'ExpenseRequest' | 'ExpensePlan' | 'AdvancePayment' | 'Feedback'
}

interface EntityDatesResult {
  createdAt: string | null
  updatedAt: string | null
  isLoading: boolean
  error: string | null
}

export const useEntityDates = ({ accessToken, entityId, entityType }: UseEntityDatesProps): EntityDatesResult => {
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)
  // Use ref to avoid endless loop - graphqlClient changes reference on every render
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

  useEffect(() => {
    const fetchEntityDates = async () => {
      if (!accessToken || !entityId) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetEntityDates($entityId: uuid!) {
            ${entityType}(where: {id: {_eq: $entityId}}, limit: 1) {
              id
              createdAt
              updatedAt
            }
          }
        `

        const response = await graphqlClientRef.current.request<{
          [key: string]: any[]
        }>(query, {
          entityId
        })

        if (response[entityType] && response[entityType].length > 0) {
          setCreatedAt(response[entityType][0].createdAt || null)
          setUpdatedAt(response[entityType][0].updatedAt || null)
        }
      } catch (err) {
        console.error(`Error fetching ${entityType} dates:`, err)
        setError(`Failed to fetch entity dates: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEntityDates()
  }, [accessToken, entityId, entityType])

  return {
    createdAt,
    updatedAt,
    isLoading,
    error
  }
}
