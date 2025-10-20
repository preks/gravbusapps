import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContactTaskQueryVariables {
  contactId: string
}

export interface ContactTaskData {
  id: string
  name: string
  version: number
  description: string
  dueDate?: string | null
  createdAt: string
  typeRef?: string // Added this field
  statusRef?: string // Added status field
  timingType?: string // Added timing type field
  priorityRef?: string // Added priority reference field
  assignedEmployeeId?: string // Added assigned employee ID field
  type: {
    value: string
    code?: string
  }
  priority: {
    value: string
  }
  createdBy: string
  creatorEmployee?: {
    // Added creator employee details
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    fullName?: string
  }
  assignedEmployee?: {
    // Added assigned employee details
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
    fullName?: string
  }
}

export interface ContactTaskResponse {
  SalesTask: ContactTaskData[]
}

export const GET_CONTACT_TASKS = (): string => {
  return `
    query GetContactTasks($contactId: uuid!) {
      SalesTask(where: {contact: {id: {_eq: $contactId}}, isDeleted: {_eq: false}}) {
        id
        name
        version
        description
        dueDate
        createdAt
        typeRef
        statusRef
        timingType
        priorityRef
        assignedEmployeeId
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

export const useGetContactTasks = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchContactTasks = useCallback(
    async (variables: ContactTaskQueryVariables) => {
      const query = GET_CONTACT_TASKS()
      try {
        const result = await graphQLClient.request<ContactTaskResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching contact tasks:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  return { fetchContactTasks }
}
