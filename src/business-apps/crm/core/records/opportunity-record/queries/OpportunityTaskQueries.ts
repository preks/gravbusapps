import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface SalesTaskQueryVariables {
  opportunityId: string
}

export interface SalesTaskData {
  id: string
  name: string
  version: number
  description: string
  dueDate?: string | null
  createdAt: string
  typeRef?: string
  type: {
    value: string
  }
  priority: {
    value: string
  }
  createdBy: string
  creatorEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    fullName?: string
  }
  assignedEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    fullName?: string
  }
}

export interface SalesTaskResponse {
  SalesTask: SalesTaskData[]
}

export const GET_SALES_TASKS = (): string => {
  return `
    query GetSalesTasks($opportunityId: uuid!) {
      SalesTask(where: {opportunity: {id: {_eq: $opportunityId}}, isDeleted: {_eq: false}}) {
        id
        name
        version
        description
        dueDate
        createdAt
        typeRef
        type {
          value
        }
        priority {
          value
        }
        createdBy
        creatorEmployee {
          id
          firstName
          lastName
          displayName
          fullName
        }
        assignedEmployee {
          id
          firstName
          lastName
          displayName
          fullName
        }
      }
    }
  `
}

export const useGetSalesTasks = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchSalesTasks = async (variables: SalesTaskQueryVariables) => {
    const query = GET_SALES_TASKS(variables)
    try {
      const result = await graphQLClient.request<SalesTaskResponse>(query, variables)
      return result
    } catch (error) {
      console.error('Error fetching sales tasks:', error)
      throw error
    }
  }

  return { fetchSalesTasks }
}
