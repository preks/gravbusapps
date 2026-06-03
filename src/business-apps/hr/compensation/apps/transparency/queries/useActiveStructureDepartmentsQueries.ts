import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient.ts'
import { useCallback, useMemo } from 'react'

export interface StructureDepartment {
  id: string
  name: string
}

export interface ActiveStructureDepartmentsResponse {
  OrganizationalUnit: StructureDepartment[]
}

interface ActiveStructureDepartmentsVariables {
  structureId: string
}

const GET_ACTIVE_STRUCTURE_DEPARTMENTS = (): string => {
  return `
    query GetActiveStructureDepartments($structureId: uuid!) {
      OrganizationalUnit(
        where: {
          structureId: { _eq: $structureId }
          isDeleted: { _eq: false }
        }
        orderBy: [{ name: ASC }]
      ) {
        id
        name
      }
    }
  `
}

export function useActiveStructureDepartmentsQueries(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchDepartments = useCallback(
    async (structureId: string) => {
      if (!structureId.trim()) {
        throw new Error('Structure ID is required to fetch departments')
      }

      const query = GET_ACTIVE_STRUCTURE_DEPARTMENTS()
      const variables: ActiveStructureDepartmentsVariables = { structureId }
      return await graphqlClient.request<ActiveStructureDepartmentsResponse>(query, variables)
    },
    [graphqlClient]
  )

  return useMemo(
    () => ({
      fetchDepartments
    }),
    [fetchDepartments]
  )
}
