import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { EmployeeDetailsResponse } from '../types'

export interface EmployeeDetailsQueryVariables {
  employeeId: string
  structureId?: string
  hasStructureId?: boolean
}

export const GET_EMPLOYEE_DETAILS = /*sql*/ `
  query GetEmployeeDetails($employeeId: uuid!, $structureId: uuid, $hasStructureId: Boolean!, $today: timestamptz!) {
    EmployeePosition(where: {
      employeeId: {_eq: $employeeId}
    }) {
      id
      organizationalUnitId
      organizationalUnit {
        name
      }
      supervisor {
        firstName
        lastName
        displayName
        id
        pictureThumbnail
      }
      jobPosition {
        name
      }
      jobPositionId
      siteLocation {
        name
        id
      }
      companyId
      company {
        name
      }
      siteLocationId
      costCenterId
      costCenter {
        id
        name
      }
      # Matrix teams data
      matrixUnitEmployees(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
        structureId
        matrixUnit {
          id
          name
        }
      }
      # Capabilities data
      employeeCapabilities(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
        structureId
        capability {
          id
          name
        }
      }
      employee {
        id
        code
        fullName
        displayName
        workspace
        version
        pictureThumbnail
        additionalProperties
        firstName
        lastName
        # Skills data
        skills(where: {isDeleted: {_eq: false}}) {
          level
          isDeleted
          synchronizedAt
          skill {
            updatedAt
            createdAt
            name
            id
          }
        }
        communication(where: {_and: [{isDeleted: {_eq: false}}, {purpose: {_eq: "INTERNAL"}}]}) {
          channel {
            translations {
              value
              localeCode
            }
            id
            code
            value
          }
          purpose
          recordState
          isDeleted
          value
          type {
            value
            translations {
              value
              localeCode
            }
            id
          }
        }
        workingCondition(
          where: {
            isDeleted: {_eq: false}
            _or: [
              {activeFrom: {_isNull: true}, activeTo: {_isNull: true}}
              {
                activeFrom: {_lte: $today}
                _or: [{activeTo: {_isNull: true}}, {activeTo: {_gte: $today}}]
              }
            ]
          }
          orderBy: [{activeFrom: DESC}, {createdAt: DESC}]
          limit: 1
        ) {
          id
          version
          regionRef
          activeFrom
          activeTo
          probationEnd
          contractType {
            value
            translations {
              value
              localeCode
            }
            id
          }
          employmentType {
            value
            translations {
              value
              localeCode
            }
            id
          }
          region {
            value
            id
          }
          remote {
            id
            value
          }
          hireDate
          vacationDays
          exitDate
          additionalProperties
        }
      }
    }
  }
`

export const useGetEmployeeDetails = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphqlClient(context.accessToken)

  const fetchEmployeeDetails = async (variables: EmployeeDetailsQueryVariables) => {
    const query = GET_EMPLOYEE_DETAILS
    try {
      const result = await graphqlClient.request<EmployeeDetailsResponse>(query, {
        employeeId: variables.employeeId,
        structureId: variables.structureId,
        hasStructureId: !!variables.structureId,
        today: new Date().toISOString()
      })
      return result
    } catch (error) {
      console.error('Error fetching employee details:', error)
      throw error
    }
  }

  return { fetchEmployeeDetails }
}
