import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { HierarchyQueryVariables, OrganizationalUnitRelationshipResponse } from '../types/hierarchyTypes'

export const GET_HIERARCHY_DATA = (): string => {
  return `
    query GetHierarchyData($structureId: uuid!) {
      OrganizationalUnitRelationship(
        where: { structureId: { _eq: $structureId } }
      ) {
        id
        parentId
        childId
        parent {
          id
          name
          type
          code
          costCenterId
          company {
            id
            name
            code
          }
          organizationalUnitEmployee(
            where: { 
              employeeId: { _isNull: false }, 
              jobPositionId: { _isNull: false } 
            }
          ) {
            id
            employeeId
            jobPositionId
            isMain
            role
            managerLevel
            employee {
              id
              businessKey
              firstName
              lastName
            }
          }
        }
        child {
          id
          name
          type
          code
          costCenterId
          company {
            id
            name
            code
          }
          organizationalUnitEmployee(
            where: { 
              employeeId: { _isNull: false }, 
              jobPositionId: { _isNull: false } 
            }
          ) {
            id
            employeeId
            jobPositionId
            isMain
            role
            managerLevel
            employee {
              id
              businessKey
              firstName
              lastName
            }
          }
        }
      }
      
      SiteLocation(
        where: { structureId: { _eq: $structureId }, isDeleted: { _neq: true } }
      ) {
        id
        name
        country {
          id
          code
          value
        }
        region {
          id
          code
          value
        }
        locality
      }
      
      EmployeeSiteLocation(
        where: { structureId: { _eq: $structureId } }
      ) {
        employeeId
        siteLocationId
      }
      
      CostCenter(
        where: { structureId: { _eq: $structureId }, isDeleted: { _neq: true } }
      ) {
        id
        name
        code
        description
      }
      
      EmployeeCompany(
        where: { structureId: { _eq: $structureId } }
      ) {
        employeeId
        companyId
        company {
          id
          name
          code
        }
      }
    }
  `
}

// Minimal edges-only query for Sunburst (small payload)
export const GET_HIERARCHY_EDGES_MIN = (): string => {
  return `
    query GetHierarchyEdgesMin($structureId: uuid!) {
      OrganizationalUnitRelationship(
        where: { structureId: { _eq: $structureId } }
      ) {
        id
        parentId
        childId
        parent { id name }
        child { id name }
      }
    }
  `
}

export const useGetHierarchyData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchHierarchyData = useCallback(
    async (variables: HierarchyQueryVariables) => {
      const query = GET_HIERARCHY_DATA()

      try {
        const result = await graphqlClient.request<OrganizationalUnitRelationshipResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching hierarchy data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchHierarchyData }
}

export const useGetHierarchyEdgesMin = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchHierarchyEdgesMin = useCallback(
    async (variables: HierarchyQueryVariables) => {
      const query = GET_HIERARCHY_EDGES_MIN()
      try {
        const result = await graphqlClient.request<{
          OrganizationalUnitRelationship: Array<{
            id: string
            parentId: string | null
            childId: string | null
            parent: { id: string; name: string } | null
            child: { id: string; name: string } | null
          }>
        }>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching minimal hierarchy edges:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchHierarchyEdgesMin }
}

// Edges with aggregate child employee counts (lightweight sizing for sunburst)
export const GET_HIERARCHORY_EDGES_WITH_COUNTS_ASOF = (): string => {
  return `
    query GetHierarchyEdgesWithCounts($structureId: uuid!, $asOf: timestamp!) {
      OrganizationalUnitRelationship(
        where: { structureId: { _eq: $structureId } }
      ) {
        id
        parentId
        childId
        parent { id name }
        child { 
          id 
          name
          organizationalUnitEmployeeAggregate(
            where: { 
              employeeId: { _isNull: false },
              jobPositionId: { _isNull: false },
              _or: [
                { structureId: { _eq: $structureId } },
                { structureId: { _isNull: true } }
              ],
              employee: {
                isDeleted: { _eq: false },
                employeePosition: {
                  structureId: { _eq: $structureId },
                  _and: [
                    { _or: [ { hireDate: { _isNull: true } }, { hireDate: { _lte: $asOf } } ] },
                    { _or: [ { exitDate: { _isNull: true } }, { exitDate: { _gt: $asOf } } ] }
                  ]
                }
              }
            }
          ) {
            aggregate { count }
          }
        }
      }
    }
  `
}

export const useGetHierarchyEdgesWithCounts = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchHierarchyEdgesWithCounts = useCallback(
    async (variables: any) => {
      const query = GET_HIERARCHORY_EDGES_WITH_COUNTS_ASOF()
      try {
        const finalVars = {
          ...variables,
          asOf: variables?.asOf ?? new Date().toISOString()
        }
        const result = await graphqlClient.request<{
          OrganizationalUnitRelationship: Array<{
            id: string
            parentId: string | null
            childId: string | null
            parent: { id: string; name: string } | null
            child: {
              id: string
              name: string
              organizationalUnitEmployeeAggregate?: { aggregate?: { count?: number | null } | null } | null
            } | null
          }>
        }>(query, finalVars)
        return result
      } catch (error) {
        console.error('Error fetching hierarchy edges with counts:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchHierarchyEdgesWithCounts }
}

// Additional query for getting basic structure info
export const GET_STRUCTURE_INFO = (): string => {
  return `
    query GetStructureInfo($structureId: uuid!) {
      Structure(where: { id: { _eq: $structureId } }) {
        id
        name
        code
        description
        isActive
        structureType
      }
    }
  `
}

export const useGetStructureInfo = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStructureInfo = useCallback(
    async (structureId: string) => {
      const query = GET_STRUCTURE_INFO()

      try {
        const result = await graphqlClient.request<{
          Structure: Array<{
            id: string
            name: string
            code: string | null
            description: string | null
            isActive: boolean
            structureType: string | null
          }>
        }>(query, { structureId })
        return result
      } catch (error) {
        console.error('Error fetching structure info:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchStructureInfo }
}
