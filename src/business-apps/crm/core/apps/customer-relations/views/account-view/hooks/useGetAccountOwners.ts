import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface AccountOwner {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
}

export interface UseGetAccountOwnersReturn {
  ownerOptions: AccountOwner[]
  isLoading: boolean
  error: any
}

const GET_ACCOUNT_OWNERS_QUERY = `
  query GetAccountOwners($limit: Int, $offset: Int, $search: String) {
    Employee(
      limit: $limit
      offset: $offset
      where: { 
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $search } }
              { lastName: { _ilike: $search } }
              { displayName: { _ilike: $search } }
            ]
          }
        ]
      }
      orderBy: { displayName: ASC }
    ) {
      id
      firstName
      lastName
      displayName
    }
  }
`

export const useGetAccountOwners = (
  context: BusinessAppContextProps,
  search: string = ''
): UseGetAccountOwnersReturn => {
  const [ownerOptions, setOwnerOptions] = useState<AccountOwner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchOwners = useCallback(
    async (searchTerm: string = '') => {
      if (!context.accessToken) {
        console.warn('No access token provided to useGetAccountOwners')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        let searchPattern: string
        let limit: number

        if (searchTerm && searchTerm.trim().length >= 2) {
          // User is searching - use search pattern and higher limit
          searchPattern = `%${searchTerm.trim()}%`
          limit = 50
        } else {
          // No search or search too short - get first 20 owners alphabetically
          searchPattern = '%%'
          limit = 20
        }

        const variables = {
          search: searchPattern,
          limit,
          offset: 0
        }

        const result = await graphqlClient.request<{ Employee: AccountOwner[] }>(GET_ACCOUNT_OWNERS_QUERY, variables)

        const ownerData = result.Employee || []

        // Process and format owners
        const processedOwners = ownerData.map(emp => ({
          id: emp.id,
          displayName: emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown',
          firstName: emp.firstName || '',
          lastName: emp.lastName || ''
        }))

        setOwnerOptions(processedOwners)
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch account owners')
        setError(error)
        console.error('Error fetching account owners:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  useEffect(() => {
    if (context.accessToken) {
      fetchOwners(search)
    }
  }, [context.accessToken, search, fetchOwners])

  return {
    ownerOptions,
    isLoading,
    error
  }
}
