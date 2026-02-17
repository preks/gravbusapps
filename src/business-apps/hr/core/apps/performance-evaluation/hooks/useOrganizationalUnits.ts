import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface OrganizationalUnit {
  id: string
  name: string
  code: string | null
  type: string | null
}

interface OrganizationalUnitsResponse {
  OrganizationalUnit: OrganizationalUnit[]
}

const GET_ORGANIZATIONAL_UNITS_QUERY = `
  query GetOrganizationalUnits($where: OrganizationalUnitBoolExp) {
    OrganizationalUnit(
      where: $where
      orderBy: [{ name: ASC }]
      limit: 1000
    ) {
      id
      name
      code
      type
    }
  }
`

export const useOrganizationalUnits = (accessToken: string, enabled: boolean = true) => {
  const graphQLClient = useGraphQLClient(accessToken)
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled || !accessToken) {
      return
    }

    const fetchOrganizationalUnits = async () => {
      setLoading(true)
      setError(null)

      try {
        const structureId = getCurrentActiveStructureId()

        const andConditions: Array<Record<string, unknown>> = [
          { isDeleted: { _eq: false } },
          { type: { _in: ['TEAM', 'DEPARTMENT', 'UNIT'] } }
        ]

        if (structureId) {
          andConditions.push({ structureId: { _eq: structureId } })
        } else {
          setError(new Error('No active structure ID available. Teams are scoped to the current structure.'))
          setLoading(false)
          return
        }

        const whereCondition = { _and: andConditions }

        const data = await graphQLClient.request<OrganizationalUnitsResponse>(GET_ORGANIZATIONAL_UNITS_QUERY, {
          where: whereCondition
        })

        if (data?.OrganizationalUnit) {
          setOrganizationalUnits(data.OrganizationalUnit)
        }
      } catch (err) {
        console.error('Error fetching organizational units:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch organizational units'))
      } finally {
        setLoading(false)
      }
    }

    fetchOrganizationalUnits()
  }, [accessToken, enabled, graphQLClient])

  return {
    organizationalUnits,
    loading,
    error
  }
}
