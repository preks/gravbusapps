import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContactActivityQueryVariables {
  contactId: string
}

export interface ContactActivityData {
  id: string
  title: string
  version: number
  description: string
  createdAt: string
  occurredAt?: string | null
  completedAt?: string | null
  createdBy: string
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    fullName: string
  }
  activityType?: {
    code: string
    id: string
    type: string
    value: string
  }
}

export interface ContactActivityResponse {
  SalesActivity: ContactActivityData[]
}

export const GET_CONTACT_ACTIVITIES = (): string => {
  return `
    query GetContactActivities($contactId: uuid!) {
      SalesActivity(where: {contact: {id: {_eq: $contactId}}, isDeleted: {_eq: false}}) {
        id
        title
        version
        description
        createdAt
        occurredAt
        completedAt
        createdBy
        ownerEmployee {
          id
          firstName
          lastName
          displayName
          fullName
        }
        activityType {
          code
          id
          type
          value
        }
      }
    }
  `
}

export const useGetContactActivities = (context: BusinessAppContextProps) => {
  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchContactActivities = useCallback(
    async (variables: ContactActivityQueryVariables) => {
      const query = GET_CONTACT_ACTIVITIES()
      try {
        const result = await graphQLClient.request<ContactActivityResponse>(query, variables)
        return result
      } catch (error) {
        console.error('Error fetching contact activities:', error)
        throw error
      }
    },
    [graphQLClient]
  )

  return { fetchContactActivities }
}
