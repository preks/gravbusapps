import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const GET_TEAM_MEMBERS = `
  query GetTeamMembers($limit: Int, $offset: Int, $search: String) {
    Employee(
      limit: $limit
      offset: $offset
      where: {
        isDeleted: { _eq: false }
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
          { fullName: { _ilike: $search } }
          { displayName: { _ilike: $search } }
          { code: { _ilike: $search } }
        ]
      }
    ) {
      id
      firstName
      lastName
      fullName
      displayName
      code
      title
      activeFrom
      activeTo
      userId
      employeePosition {
        id
        hireDate
        exitDate
        jobPosition {
          id
          name
        }
        organizationalUnit {
          id
          name
        }
        supervisor {
          id
          firstName
          lastName
          displayName
        }
      }
      communication(where: { isDeleted: { _eq: false } }, limit: 3) {
        id
        value
        typeRef
        type {
          value
        }
      }
    }
    EmployeeAggregate(where: { isDeleted: { _eq: false } }) {
      aggregate {
        count
      }
    }
  }
`

export interface TeamMemberCommunication {
  id: string
  value: string
  typeRef: string
  type: {
    value: string
  }
}

export interface TeamMemberPosition {
  id: string
  hireDate: string | null
  exitDate: string | null
  jobPosition: {
    id: string
    name: string
  } | null
  organizationalUnit: {
    id: string
    name: string
  } | null
  supervisor: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  } | null
}

export interface TeamMember {
  id: string
  firstName: string
  lastName: string
  fullName: string | null
  displayName: string | null
  code: string | null
  title: string | null
  activeFrom: string | null
  activeTo: string | null
  userId: string | null
  employeePosition: TeamMemberPosition | null
  communication: TeamMemberCommunication[]
}

export const useGetTeamMembers = (context: BusinessAppContextProps) => {
  const client = useGraphQLClient(context.accessToken)

  const fetchData = async (vars: { limit?: number; offset?: number; search?: string }) => {
    try {
      const searchPattern = vars.search ? `%${vars.search}%` : undefined
      const result = await client.request(GET_TEAM_MEMBERS, {
        limit: vars.limit || 100,
        offset: vars.offset || 0,
        search: searchPattern
      })
      return {
        employees: (result.Employee || []) as TeamMember[],
        totalCount: result.EmployeeAggregate?.aggregate?.count || 0
      }
    } catch (error) {
      console.error('Error fetching team members:', error)
      throw error
    }
  }

  return { fetchData }
}
