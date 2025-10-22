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
