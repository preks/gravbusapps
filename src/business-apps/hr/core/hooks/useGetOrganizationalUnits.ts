'use client'

import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface OrganizationalUnitOption {
  id: string
  name: string
}

/**
 * Custom hook to fetch organizational units with a search filter and pagination (limit 5).
 * @param accessToken Access token for authentication.
 * @param searchRegex Search regex string for filtering organizational units.
 * @param offset Pagination offset
 */
export function useGetOrganizationalUnits(accessToken: string, searchRegex: string, offset: number = 0) {
  const client = useGraphqlClient(accessToken)
  const [units, setUnits] = useState<OrganizationalUnitOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    async function fetchUnits() {
      try {
        const query = `
          query getOrganizationalUnits($searchRegex: String!, $offset: Int!) {
            EmployeePosition(
              where: {
                _or: [{ organizationalUnit: { name: { _iregex: $searchRegex } } }]
              }
              distinctOn: organizationalUnitId
              limit: 5
              offset: $offset
            ) {
              organizationalUnitId
              organizationalUnit {
                name
              }
            }
          }
        `
        const variables = { searchRegex, offset }
        const res = await client.request(query, variables)
        const results = (res as any).EmployeePosition ?? []
        setUnits(
          results.map((row: any) => ({
            id: row.organizationalUnitId,
            name: row.organizationalUnit?.name ?? ''
          }))
        )
        setHasMore(results.length === 5)
      } catch (err: any) {
        setError(err)
        setUnits([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    }
    fetchUnits()
  }, [client, searchRegex, offset])

  return { units, loading, error, hasMore }
}
