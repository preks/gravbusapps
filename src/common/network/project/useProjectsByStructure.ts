import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'

// Query for projects by structure ID
export const projectsByStructureQuery = `
  query fetchProjectsByStructure($structureId: uuid!) {
    Project(
      where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}},
      limit: 20
    ) {
      id
      name
      structureId
      validFrom
      validTo
    }
  }
`

export const useProjectsByStructure = (accessToken: string, structureId: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchProjects = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(projectsByStructureQuery, { structureId })

        return data
      } catch (error) {
        console.error('Error fetching projects:', error)
        throw error
      }
    },
    [graphQLClient, structureId]
  )

  return fetchProjects
}
