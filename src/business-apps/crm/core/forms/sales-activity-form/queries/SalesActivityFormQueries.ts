import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface SalesActivityByIdData {
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
  account?: {
    id: string
    name: string
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
  }
  opportunity?: {
    id: string
    name: string
  }
  lead?: {
    id: string
    companyName: string
  }
  documents?: Array<{
    id: string
    name: string
    version: number
  }>
}

export interface SalesActivityByIdResponse {
  SalesActivity: SalesActivityByIdData[]
}

export const GET_SALES_ACTIVITY_BY_ID = (): string => {
  return `
    query GetSalesActivityById($activityId: uuid!) {
      SalesActivity(where: {id: {_eq: $activityId}, isDeleted: {_eq: false}}) {
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
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
        }
        opportunity {
          id
          name
        }
        lead {
          id
          companyName
        }
        documents {
          id
          name
          version
          file
          fileInfo
          mimeType
          fileSize
        }
      }
    }
  `
}

export const useGetSalesActivityById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchSalesActivityById = useCallback(
    async (activityId: string) => {
      const query = GET_SALES_ACTIVITY_BY_ID()
      try {
        const result = await graphqlClient.request<SalesActivityByIdResponse>(query, { activityId })
        if (result.SalesActivity && result.SalesActivity.length > 0) {
          return { activity: result.SalesActivity[0] }
        }
        return { activity: null }
      } catch (error) {
        console.error('Error fetching sales activity by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchSalesActivityById }
}
