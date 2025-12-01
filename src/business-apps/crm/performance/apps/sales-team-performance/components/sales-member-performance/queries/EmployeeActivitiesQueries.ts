import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EmployeeActivitiesQueryVariables {
  employeeId: string
  userId?: string // Add userId for createdBy comparisons (user ID != employee ID)
  offset?: number
  limit?: number
  orderBy?: Array<any>
  where?: any
}

export interface ActivityReference {
  contactId?: string
  leadId?: string
  accountId?: string
  opportunityId?: string
  account?: {
    email?: string
    name?: string
    pictureUrl?: string
  }
  contact?: {
    firstName?: string
    lastName?: string
    phone?: string
    pictureUrl?: string
    email?: string
  }
  lead?: {
    name?: string
    companyEmail?: string
    companyPhone?: string
    contact?: {
      firstName?: string
      lastName?: string
    }
  }
  opportunity?: {
    name?: string
    ownerEmployee?: {
      fullName?: string
    }
  }
}

export interface EmployeeActivity {
  id: string
  source?: string
  description?: string
  title: string
  createdAt: string
  occurredAt?: string
  ownerEmployeeId: string
  ownerEmployee: {
    fullName?: string
    pictureThumbnail?: string
  }
  activityType: {
    value: string
  }
  type?: string // Fallback activity type
  contactId?: string
  leadId?: string
  accountId?: string
  opportunityId?: string
  account?: {
    email?: string
    name?: string
    pictureUrl?: string
  }
  contact?: {
    firstName?: string
    lastName?: string
    phone?: string
    pictureUrl?: string
    email?: string
  }
  lead?: {
    name?: string
    companyEmail?: string
    companyPhone?: string
    contact?: {
      firstName?: string
      lastName?: string
    }
  }
  opportunity?: {
    name?: string
    ownerEmployee?: {
      fullName?: string
    }
  }
  activityScore?: number // Computed field (0-100)
}

export interface EmployeeActivitiesResponse {
  SalesActivity: EmployeeActivity[]
  SalesActivityAggregate: {
    aggregate: {
      count: number
    }
  }
}

// Legacy query with orderBy as variable (for backward compatibility)
const GET_EMPLOYEE_ACTIVITIES_QUERY = `
  query GetEmployeeActivities($offset: Int, $limit: Int, $orderBy: [SalesActivityOrderBy!], $where: SalesActivityBoolExp) {
    SalesActivity(
      offset: $offset, 
      limit: $limit, 
      orderBy: $orderBy, 
      where: $where
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
      occurredAt
      createdBy
      ownerEmployeeId
      ownerEmployee {
        fullName
        pictureThumbnail
      }
      title
      activityType {
        value
      }
      account {
        email
        name
        pictureUrl
      }
      contact {
        firstName
        lastName
        phone
        pictureUrl
        email
      }
      lead {
        name
        companyEmail
        companyPhone
        contact {
          firstName
          lastName
        }
      }
      opportunity {
        name
        ownerEmployee {
          fullName
        }
      }
    }
    SalesActivityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

// Function to build query with orderBy as string (to avoid enum serialization issues)
export const buildEmployeeActivitiesQuery = (orderByClause: string) => `
  query GetEmployeeActivities($offset: Int, $limit: Int, $where: SalesActivityBoolExp) {
    SalesActivity(
      offset: $offset, 
      limit: $limit, 
      ${orderByClause}
      where: $where
    ) {
      id
      contactId
      leadId
      accountId
      opportunityId
      source
      description
      createdAt
      occurredAt
      createdBy
      ownerEmployeeId
      ownerEmployee {
        fullName
        pictureThumbnail
      }
      title
      activityType {
        value
      }
      account {
        email
        name
        pictureUrl
      }
      contact {
        firstName
        lastName
        phone
        pictureUrl
        email
      }
      lead {
        name
        companyEmail
        companyPhone
        contact {
          firstName
          lastName
        }
      }
      opportunity {
        name
        ownerEmployee {
          fullName
        }
      }
    }
    SalesActivityAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`

export const useEmployeeActivitiesQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEmployeeActivities = useCallback(
    async (variables: EmployeeActivitiesQueryVariables): Promise<EmployeeActivitiesResponse> => {
      // Build where clause with employee filter and additional conditions
      // Include activities where:
      // 1. ownerEmployeeId matches (assigned to them) OR
      // 2. ownerEmployeeId is null AND createdBy matches (created by them but unassigned)
      // Note: createdBy is a USER ID, not an EMPLOYEE ID
      const userId = variables.userId // Get user ID from variables
      const baseWhere = {
        _and: [
          {
            _or: [
              { ownerEmployeeId: { _eq: variables.employeeId } },
              ...(userId
                ? [
                    {
                      _and: [{ ownerEmployeeId: { _eq: null } }, { createdBy: { _eq: userId } }]
                    }
                  ]
                : [])
            ]
          },
          { isDeleted: { _eq: false } }
        ]
      }

      // Merge with any additional where conditions
      const where = variables.where
        ? {
            _and: [baseWhere, variables.where]
          }
        : baseWhere

      const requestVariables = {
        offset: variables.offset || 0,
        limit: variables.limit || 20,
        orderBy: variables.orderBy || [{ createdAt: 'DESC' }],
        where
      }

      try {
        const result = await graphqlClient.request<EmployeeActivitiesResponse>(
          GET_EMPLOYEE_ACTIVITIES_QUERY,
          requestVariables
        )

        return result
      } catch (error) {
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchEmployeeActivities }
}
