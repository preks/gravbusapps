import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'

// Query for cost centers by structure ID
export const costCentersByStructureQuery = `
  query fetchCostCentersByStructure($structureId: uuid!) {
    userCostCenters: CostCenter(
      where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}},
      limit: 20
    ) {
      id
      name
      structureId
    }
  }
`

export const useCostCentersByStructure = (accessToken: string, structureId: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchCostCenters = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(costCentersByStructureQuery, { structureId })

        return data
      } catch (error) {
        console.error('Error fetching cost centers:', error)
        throw error
      }
    },
    [graphQLClient, structureId, accessToken]
  )

  return fetchCostCenters
}
