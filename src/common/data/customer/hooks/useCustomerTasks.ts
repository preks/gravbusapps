// Customer Task hooks - list and search operations for customer tasks
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { CustomerTask } from '../types/customerTaskTypes'

// Use the new query builder functions
import {
  buildCustomerTaskQuery,
  buildCustomerTaskByIdQuery,
  buildCustomerTaskByAccountIdQuery,
  buildCustomerTaskByContactIdQuery,
  buildCustomerTaskByLeadIdQuery,
  buildCustomerTaskByOpportunityIdQuery,
  buildCustomerTaskWhereCondition,
  buildCustomerTaskOrderBy,
  type CustomerTaskQueryVariables
} from '../queries/customerTaskQueries'

// Mapper
import { toCustomerTask } from '../mappers/customerTaskMappers'
import { CustomerTaskFields } from '../types/customerTaskTypes'

export interface CustomerTaskListQueryResponse {
  SalesTask: CustomerTask[]
  SalesTaskAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerTaskByEntityQueryResponse {
  SalesTask: CustomerTask[]
}

export interface CustomerTaskByIdQueryResponse {
  SalesTask: CustomerTask[]
}

export interface CustomerTaskListData {
  tasks: CustomerTask[]
  total: number
}

export const useCustomerTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerTasks = useCallback(
    async (variables: CustomerTaskQueryVariables = {}): Promise<CustomerTaskListData> => {
      const query = buildCustomerTaskQuery()

      // Handle reference type filtering - add as custom conditions
      const customConditions: Record<string, any>[] = []

      if (variables.referenceTypes && variables.referenceTypes.length > 0) {
        const referenceConditions = variables.referenceTypes
          .map(type => {
            switch (type) {
              case 'opportunity':
                return { opportunity: { id: { _neq: null } } }
              case 'account':
                return { account: { id: { _neq: null } } }
              case 'lead':
                return { lead: { id: { _neq: null } } }
              case 'contact':
                return { contact: { id: { _neq: null } } }
              default:
                return null
            }
          })
          .filter(c => c !== null)

        if (referenceConditions.length > 0) {
          customConditions.push({ _or: referenceConditions })
        }
      }

      const whereCondition = buildCustomerTaskWhereCondition(variables, [], customConditions)

      const orderBy = buildCustomerTaskOrderBy(variables.orderBy || [])
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
        const result = await graphqlClient.request<CustomerTaskListQueryResponse>(query, graphQLVariables)
        const tasks = result.SalesTask.map(toCustomerTask)
        const total = result.SalesTaskAggregate?.aggregate?.count || 0
        return { tasks, total }
      } catch (error) {
        console.error('Error fetching customer tasks:', error)
        throw error
      }
    },
    [context.accessToken]
  )

  const fetchCustomerTasksByAccountId = useCallback(
    async (accountId: string): Promise<CustomerTask[]> => {
      const query = buildCustomerTaskByAccountIdQuery()
      const whereCondition = buildCustomerTaskWhereCondition({}, [], [{ account: { id: { _eq: accountId } } }])
      const orderBy = buildCustomerTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return result.SalesTask.map(toCustomerTask)
      } catch (error) {
        console.error('Error fetching customer tasks by account ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerTasksByContactId = useCallback(
    async (contactId: string): Promise<CustomerTask[]> => {
      const query = buildCustomerTaskByContactIdQuery()
      const whereCondition = buildCustomerTaskWhereCondition({}, [], [{ contact: { id: { _eq: contactId } } }])
      const orderBy = buildCustomerTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return result.SalesTask.map(toCustomerTask)
      } catch (error) {
        console.error('Error fetching customer tasks by contact ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerTasksByLeadId = useCallback(
    async (leadId: string): Promise<CustomerTask[]> => {
      const query = buildCustomerTaskByLeadIdQuery()
      const whereCondition = buildCustomerTaskWhereCondition({}, [], [{ lead: { id: { _eq: leadId } } }])
      const orderBy = buildCustomerTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return result.SalesTask.map(toCustomerTask)
      } catch (error) {
        console.error('Error fetching customer tasks by lead ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerTasksByOpportunityId = useCallback(
    async (opportunityId: string): Promise<CustomerTask[]> => {
      const query = buildCustomerTaskByOpportunityIdQuery()
      const whereCondition = buildCustomerTaskWhereCondition({}, [], [{ opportunity: { id: { _eq: opportunityId } } }])
      const orderBy = buildCustomerTaskOrderBy([{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }])

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query, {
          where: whereCondition,
          orderBy: orderBy
        })
        return result.SalesTask.map(toCustomerTask)
      } catch (error) {
        console.error('Error fetching customer tasks by opportunity ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerTaskById = useCallback(
    async (taskId: string): Promise<CustomerTask | null> => {
      const query = buildCustomerTaskByIdQuery(CustomerTaskFields, taskId)

      try {
        const result = await graphqlClient.request<{ SalesTaskByPk: any }>(query)
        const task = result.SalesTaskByPk
        return task ? toCustomerTask(task) : null
      } catch (error) {
        console.error('Error fetching customer task by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return {
    fetchCustomerTasks,
    fetchCustomerTasksByAccountId,
    fetchCustomerTasksByContactId,
    fetchCustomerTasksByLeadId,
    fetchCustomerTasksByOpportunityId,
    fetchCustomerTaskById
  }
}
