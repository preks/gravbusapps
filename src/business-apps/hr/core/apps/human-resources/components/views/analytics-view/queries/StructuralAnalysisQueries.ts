import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { StructuralAnalysisQueryVariables } from '../components/views/structural-analysis/types/structuralTypes'

export interface OrganizationalUnitRelationshipResponse {
  id: string
  parentId: string | null
  childId: string
  parent: {
    id: string
    name: string
    code: string | null
    description: string | null
    companyId: string | null
    costCenterId: string | null
    company: {
      id: string
      name: string
      code: string | null
    } | null
    organizationalUnitEmployee: {
      id: string
      employeeId: string
      managerLevel: string | null
      role: string | null
      employee: {
        id: string
        firstName: string | null
        lastName: string | null
      }
    }[]
  } | null
  child: {
    id: string
    name: string
    code: string | null
    description: string | null
    companyId: string | null
    costCenterId: string | null
    company: {
      id: string
      name: string
      code: string | null
    } | null
    organizationalUnitEmployee: {
      id: string
      employeeId: string
      managerLevel: string | null
      role: string | null
      employee: {
        id: string
        firstName: string | null
        lastName: string | null
      }
    }[]
  }
}

export interface EmployeeSiteLocationResponse {
  id: string
  employeeId: string
  siteLocationId: string
  employee: {
    id: string
    firstName: string | null
    lastName: string | null
  }
  siteLocation: {
    id: string
    name: string
    code: string | null
    country: {
      code: string
      value: string
    } | null
    region: {
      code: string
      value: string
    } | null
  }
}

export interface CostCenterResponse {
  id: string
  name: string
  code: string | null
  description: string | null
}

export interface StructuralAnalysisData {
  organizationalUnitRelationships: OrganizationalUnitRelationshipResponse[]
  employeeSiteLocations: EmployeeSiteLocationResponse[]
  costCenters: CostCenterResponse[]
}

const GET_ORGANIZATIONAL_HIERARCHY = `
  query GetOrganizationalHierarchy($structureId: uuid!) {
    OrganizationalUnitRelationship(
      where: { structureId: { _eq: $structureId } }
      orderBy: { parent: { name: ASC } }
    ) {
      id
      parentId
      childId
      parent {
        id
        name
        code
        description
        companyId
        costCenterId
        company {
          id
          name
          code
        }
        organizationalUnitEmployee {
          id
          employeeId
          managerLevel
          role
          employee {
            id
            firstName
            lastName
          }
        }
      }
      child {
        id
        name
        code
        description
        companyId
        costCenterId
        company {
          id
          name
          code
        }
        organizationalUnitEmployee {
          id
          employeeId
          managerLevel
          role
          employee {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
`
const GET_EMPLOYEE_SITE_LOCATIONS = `
  query GetEmployeeSiteLocations($structureId: uuid!) {
    EmployeeSiteLocation(
      where: { structureId: { _eq: $structureId } }
    ) {
      id
      employeeId
      siteLocationId
    }
  }
`

const GET_SITE_LOCATIONS = `
  query GetSiteLocations($structureId: uuid!) {
    SiteLocation(
      where: { structureId: { _eq: $structureId } }
    ) {
      id
      name
      code
      country {
        code
        value
      }
      region {
        code
        value
      }
    }
  }
`

const GET_COST_CENTERS = `
  query GetCostCenters($structureId: uuid!) {
    CostCenter(
      where: { structureId: { _eq: $structureId } }
    ) {
      id
      name
      code
      description
    }
  }
`

export const useGetStructuralAnalysisData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchStructuralAnalysisData = useCallback(
    async (variables: StructuralAnalysisQueryVariables): Promise<StructuralAnalysisData> => {
      try {
        // Fetch all data in parallel
        const [hierarchyResult, employeeSiteResult, siteLocationResult, costCenterResult] = await Promise.all([
          graphqlClient.request<{ OrganizationalUnitRelationship: OrganizationalUnitRelationshipResponse[] }>(
            GET_ORGANIZATIONAL_HIERARCHY,
            { structureId: variables.structureId }
          ),
          graphqlClient.request<{ EmployeeSiteLocation: { id: string; employeeId: string; siteLocationId: string }[] }>(
            GET_EMPLOYEE_SITE_LOCATIONS,
            { structureId: variables.structureId }
          ),
          graphqlClient.request<{
            SiteLocation: {
              id: string
              name: string
              code: string
              country: { code: string; value: string } | null
              region: { code: string; value: string } | null
            }[]
          }>(GET_SITE_LOCATIONS, { structureId: variables.structureId }),
          graphqlClient.request<{ CostCenter: CostCenterResponse[] }>(GET_COST_CENTERS, {
            structureId: variables.structureId
          })
        ])

        // Map site locations for easy lookup
        const siteLocationMap = new Map<
          string,
          {
            id: string
            name: string
            code: string
            country: { code: string; value: string } | null
            region: { code: string; value: string } | null
          }
        >(siteLocationResult.SiteLocation.map(sl => [sl.id, sl]))

        // Combine employee site location data with actual site location data
        const employeeSiteLocations: EmployeeSiteLocationResponse[] = employeeSiteResult.EmployeeSiteLocation.map(
          esl => {
            const siteLocation = siteLocationMap.get(esl.siteLocationId)
            return {
              ...esl,
              employee: {
                id: esl.employeeId,
                firstName: null, // We'll need to get this from the hierarchy data
                lastName: null
              },
              siteLocation: siteLocation
                ? {
                    id: siteLocation.id,
                    name: siteLocation.name,
                    code: siteLocation.code || null,
                    country: siteLocation.country,
                    region: siteLocation.region
                  }
                : {
                    id: esl.siteLocationId,
                    name: 'Unknown Location',
                    code: null,
                    country: null,
                    region: null
                  }
            }
          }
        )

        return {
          organizationalUnitRelationships: hierarchyResult.OrganizationalUnitRelationship,
          employeeSiteLocations,
          costCenters: costCenterResult.CostCenter
        }
      } catch (error) {
        console.error('Error fetching structural analysis data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchStructuralAnalysisData }
}
