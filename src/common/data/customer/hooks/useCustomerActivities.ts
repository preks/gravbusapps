// Customer Activity hooks - list and search operations for customer activities
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseCustomerActivity, CustomerActivity } from '../types/customerActivityTypes'

// Use the new query builder functions
import {
  buildCustomerActivityQuery,
  buildCustomerActivityByAccountIdQuery,
  buildCustomerActivityByContactIdQuery,
  buildCustomerActivityByLeadIdQuery,
  buildCustomerActivityByOpportunityIdQuery,
  buildCustomerActivityWhereCondition,
  buildCustomerActivityOrderBy,
  type CustomerActivityQueryVariables
} from '../queries/customerActivityQueries'

// Mapper
import { toCustomerActivity } from '../mappers/customerRelatedEntityMappers'

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
      const query = buildCustomerActivityQuery()

      const whereCondition = buildCustomerActivityWhereCondition(variables)

      const orderBy = buildCustomerActivityOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy.push({ createdAt: 'DESC' })
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<CustomerActivityListQueryResponse>(query, graphQLVariables)
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
      const query = buildCustomerActivityByAccountIdQuery()
      const whereCondition = buildCustomerActivityWhereCondition({}, [], [{ account: { id: { _eq: accountId } } }])
      const orderBy = buildCustomerActivityOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
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
      const query = buildCustomerActivityByContactIdQuery()
      const whereCondition = buildCustomerActivityWhereCondition({}, [], [{ contact: { id: { _eq: contactId } } }])
      const orderBy = buildCustomerActivityOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
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
      const query = buildCustomerActivityByLeadIdQuery()
      const whereCondition = buildCustomerActivityWhereCondition({}, [], [{ lead: { id: { _eq: leadId } } }])
      const orderBy = buildCustomerActivityOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
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
      const query = buildCustomerActivityByOpportunityIdQuery()
      const whereCondition = buildCustomerActivityWhereCondition(
        {},
        [],
        [{ opportunity: { id: { _eq: opportunityId } } }]
      )
      const orderBy = buildCustomerActivityOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerActivityByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
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
