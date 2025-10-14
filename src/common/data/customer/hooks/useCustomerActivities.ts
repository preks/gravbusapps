// Customer Activity hooks - list and search operations for customer activities
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseCustomerActivity, CustomerActivity } from '../types'

// Queries
import {
  GET_CUSTOMER_ACTIVITIES,
  GET_CUSTOMER_ACTIVITIES_BY_ACCOUNT_ID,
  GET_CUSTOMER_ACTIVITIES_BY_CONTACT_ID,
  GET_CUSTOMER_ACTIVITIES_BY_LEAD_ID,
  GET_CUSTOMER_ACTIVITIES_BY_OPPORTUNITY_ID,
  type CustomerActivityQueryVariables
} from '../queries/customerActivityQueries'

// Mapper
import { toCustomerActivity } from '../mappers'

export interface CustomerActivityListQueryResponse {
  SalesActivity: BaseCustomerActivity[]
  SalesActivityAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerActivityByEntityQueryResponse {
  SalesActivity: BaseCustomerActivity[]
}

export interface CustomerActivityListData {
  activities: CustomerActivity[]
  total: number
}

export const useCustomerActivities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerActivities = useCallback(
    async (variables: CustomerActivityQueryVariables = {}): Promise<CustomerActivityListData> => {
      const query = GET_CUSTOMER_ACTIVITIES(variables)

      try {
        const result = await graphqlClient.request<CustomerActivityListQueryResponse>(query)
        const activities = result.SalesActivity.map(toCustomerActivity)
        const total = result.SalesActivityAggregate?.aggregate?.count || 0
        return { activities, total }
      } catch (error) {
        console.error('Error fetching customer activities:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerActivitiesByAccountId = useCallback(
    async (accountId: string): Promise<CustomerActivity[]> => {
      const query = GET_CUSTOMER_ACTIVITIES_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query)
        return result.SalesActivity.map(toCustomerActivity)
      } catch (error) {
        console.error('Error fetching customer activities by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerActivitiesByContactId = useCallback(
    async (contactId: string): Promise<CustomerActivity[]> => {
      const query = GET_CUSTOMER_ACTIVITIES_BY_CONTACT_ID(contactId)

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query)
        return result.SalesActivity.map(toCustomerActivity)
      } catch (error) {
        console.error('Error fetching customer activities by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerActivitiesByLeadId = useCallback(
    async (leadId: string): Promise<CustomerActivity[]> => {
      const query = GET_CUSTOMER_ACTIVITIES_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query)
        return result.SalesActivity.map(toCustomerActivity)
      } catch (error) {
        console.error('Error fetching customer activities by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerActivitiesByOpportunityId = useCallback(
    async (opportunityId: string): Promise<CustomerActivity[]> => {
      const query = GET_CUSTOMER_ACTIVITIES_BY_OPPORTUNITY_ID(opportunityId)

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query)
        return result.SalesActivity.map(toCustomerActivity)
      } catch (error) {
        console.error('Error fetching customer activities by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchCustomerActivities,
    fetchCustomerActivitiesByAccountId,
    fetchCustomerActivitiesByContactId,
    fetchCustomerActivitiesByLeadId,
    fetchCustomerActivitiesByOpportunityId
  }
}
