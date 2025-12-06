/**
 * Company Organizational Units hook - fetch organizational units for a company with infinite scroll pagination
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CompanyOrganizationalUnit {
  id: string
  name: string
  code?: string
  description?: string
  companyId?: string
  type?: string
  tag?: string
  createdAt?: string
  updatedAt?: string
  version?: number
  isDeleted?: boolean
}

export interface UseCompanyOrganizationalUnitsResult {
  units: CompanyOrganizationalUnit[]
  total: number
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  retry: () => void
}

/**
 * Hook for fetching company organizational units with infinite scroll pagination
 *
 * @param accessToken - Access token for authentication
 * @param companyId - Company ID to fetch organizational units for
 * @param initialLimit - Initial page size (default: 20)
 * @param search - Search query
 * @param orderBy - Sort order
 *
 * @example
 * const { units, hasMore, loadMore, loading, error } = useCompanyOrganizationalUnits(
 *   accessToken,
 *   companyId,
 *   20,
 *   searchTerm
 * )
 */
export function useCompanyOrganizationalUnits(
  accessToken: string,
  companyId: string,
  initialLimit: number = 20,
  search?: string,
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' | 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST' }>
): UseCompanyOrganizationalUnitsResult {
  const [allUnits, setAllUnits] = useState<CompanyOrganizationalUnit[]>([])
  const [currentOffset, setCurrentOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const graphqlClient = useGraphQLClient(accessToken)

  const loadUnits = useCallback(
    async (offset: number, append: boolean = false) => {
      if (!companyId || !accessToken) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Build where condition
        const whereConditions: any[] = [{ companyId: { _eq: companyId } }, { isDeleted: { _eq: false } }]

        // Add search condition if provided
        if (search?.trim()) {
          const searchPattern = { _ilike: `%${search.trim()}%` }
          whereConditions.push({
            _or: [
              { name: searchPattern },
              { code: searchPattern },
              { description: searchPattern },
              { type: searchPattern },
              { tag: searchPattern }
            ]
          })
        }

        const whereObj = whereConditions.length > 1 ? { _and: whereConditions } : whereConditions[0]

        // Build orderBy
        const orderByArray =
          orderBy && orderBy.length > 0
            ? orderBy.map(ob => ({
                [ob.field]: ob.direction
              }))
            : [{ name: 'ASC' }]

        const graphQLVariables: Record<string, any> = {
          limit: initialLimit,
          offset,
          where: whereObj,
          orderBy: orderByArray
        }

        const query = `
          query GetCompanyOrganizationalUnits(
            $limit: Int
            $offset: Int
            $where: OrganizationalUnitBoolExp
            $orderBy: [OrganizationalUnitOrderBy!]
          ) {
            OrganizationalUnit(
              limit: $limit
              offset: $offset
              orderBy: $orderBy
              where: $where
            ) {
              id
              version
              name
              code
              description
              companyId
              type
              tag
              createdAt
              updatedAt
              isDeleted
            }
            
            OrganizationalUnitAggregate(where: $where) {
              aggregate {
                count
              }
            }
          }
        `

        const result = await graphqlClient.request<{
          OrganizationalUnit: CompanyOrganizationalUnit[]
          OrganizationalUnitAggregate: {
            aggregate: {
              count: number
            }
          }
        }>(query, graphQLVariables)

        const newUnits = result.OrganizationalUnit || []
        const total = result.OrganizationalUnitAggregate?.aggregate?.count || 0

        if (append) {
          setAllUnits(prev => [...prev, ...newUnits])
        } else {
          setAllUnits(newUnits)
        }

        setHasMore(offset + newUnits.length < total)
        setIsLoading(false)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch company organizational units'
        console.error('Error fetching company organizational units:', err)
        setError(errorMessage)
        setIsLoading(false)
      }
    },
    [accessToken, companyId, graphqlClient, initialLimit, search, orderBy]
  )

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      const nextOffset = currentOffset + initialLimit
      setCurrentOffset(nextOffset)
      loadUnits(nextOffset, true)
    }
  }, [isLoading, hasMore, currentOffset, initialLimit, loadUnits])

  const retry = useCallback(() => {
    setCurrentOffset(0)
    setAllUnits([])
    loadUnits(0, false)
  }, [loadUnits])

  // Initial load and when dependencies change
  useEffect(() => {
    setCurrentOffset(0)
    setAllUnits([])
    setHasMore(true)
    loadUnits(0, false)
  }, [companyId, search, JSON.stringify(orderBy), accessToken])

  return {
    units: allUnits,
    total: allUnits.length,
    loading: isLoading,
    error,
    hasMore,
    loadMore,
    retry
  }
}
