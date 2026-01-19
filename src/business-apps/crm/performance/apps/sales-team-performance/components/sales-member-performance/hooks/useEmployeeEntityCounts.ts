import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface EntityCounts {
  leads: number
  contacts: number
  opportunities: number
  accounts: number
}

interface UseEmployeeEntityCountsReturn {
  counts: EntityCounts
  loading: boolean
  error: Error | null
  refetch: () => void
}

// GraphQL query to get all entity counts for an employee
const GET_EMPLOYEE_ENTITY_COUNTS_QUERY = `
  query GetEmployeeEntityCounts($employeeId: uuid!) {
    LeadAggregate(where: { isDeleted: { _eq: false }, ownerEmployeeId: { _eq: $employeeId } }) {
      aggregate {
        count
      }
    }
    ContactAggregate(where: { isDeleted: { _eq: false }, ownerEmployeeId: { _eq: $employeeId } }) {
      aggregate {
        count
      }
    }
    OpportunityAggregate(where: { isDeleted: { _eq: false }, ownerEmployeeId: { _eq: $employeeId } }) {
      aggregate {
        count
      }
    }
    AccountAggregate(where: { isDeleted: { _eq: false }, ownerEmployeeId: { _eq: $employeeId } }) {
      aggregate {
        count
      }
    }
  }
`

interface EntityCountsResponse {
  LeadAggregate: {
    aggregate: {
      count: number
    }
  }
  ContactAggregate: {
    aggregate: {
      count: number
    }
  }
  OpportunityAggregate: {
    aggregate: {
      count: number
    }
  }
  AccountAggregate: {
    aggregate: {
      count: number
    }
  }
}

export const useEmployeeEntityCounts = (employeeId: string, accessToken: string): UseEmployeeEntityCountsReturn => {
  const [counts, setCounts] = useState<EntityCounts>({
    leads: 0,
    contacts: 0,
    opportunities: 0,
    accounts: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntityCounts = useCallback(async () => {
    if (!employeeId || !accessToken) {
      console.warn('[useEmployeeEntityCounts] Missing employeeId or accessToken', {
        employeeId,
        accessToken: !!accessToken
      })
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<EntityCountsResponse>(GET_EMPLOYEE_ENTITY_COUNTS_QUERY, { employeeId })

      setCounts({
        leads: result.LeadAggregate?.aggregate?.count || 0,
        contacts: result.ContactAggregate?.aggregate?.count || 0,
        opportunities: result.OpportunityAggregate?.aggregate?.count || 0,
        accounts: result.AccountAggregate?.aggregate?.count || 0
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load entity counts'))

      // Reset counts on error
      setCounts({
        leads: 0,
        contacts: 0,
        opportunities: 0,
        accounts: 0
      })
    } finally {
      setLoading(false)
    }
  }, [employeeId, accessToken, graphqlClient])

  // Load counts when employee or access token changes
  useEffect(() => {
    fetchEntityCounts()
  }, [fetchEntityCounts])

  return {
    counts,
    loading,
    error,
    refetch: fetchEntityCounts
  }
}
