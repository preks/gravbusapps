// Customer Task hooks - list and search operations for customer tasks
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseCustomerTask, CustomerTask } from '../types'

// Queries
import {
  GET_CUSTOMER_TASKS,
  GET_CUSTOMER_TASKS_BY_ACCOUNT_ID,
  GET_CUSTOMER_TASKS_BY_CONTACT_ID,
  GET_CUSTOMER_TASKS_BY_LEAD_ID,
  GET_CUSTOMER_TASKS_BY_OPPORTUNITY_ID,
  GET_CUSTOMER_TASK_BY_ID,
  type CustomerTaskQueryVariables
} from '../queries/customerTaskQueries'

// Mapper
import { toCustomerTask } from '../mappers'

export interface CustomerTaskListQueryResponse {
  SalesTask: BaseCustomerTask[]
  SalesTaskAggregate: {
    aggregate: { count: number }
  }
}

export interface CustomerTaskByEntityQueryResponse {
  SalesTask: BaseCustomerTask[]
}

export interface CustomerTaskByIdQueryResponse {
  SalesTask: BaseCustomerTask[]
}

export interface CustomerTaskListData {
  tasks: CustomerTask[]
  total: number
}

export const useCustomerTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchCustomerTasks = useCallback(
    async (variables: CustomerTaskQueryVariables = {}): Promise<CustomerTaskListData> => {
      const query = GET_CUSTOMER_TASKS(variables)

      try {
        const result = await graphqlClient.request<CustomerTaskListQueryResponse>(query)
        const tasks = result.SalesTask.map(toCustomerTask)
        const total = result.SalesTaskAggregate?.aggregate?.count || 0
        return { tasks, total }
      } catch (error) {
        console.error('Error fetching customer tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchCustomerTasksByAccountId = useCallback(
    async (accountId: string): Promise<CustomerTask[]> => {
      const query = GET_CUSTOMER_TASKS_BY_ACCOUNT_ID(accountId)

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query)
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
      const query = GET_CUSTOMER_TASKS_BY_CONTACT_ID(contactId)

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query)
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
      const query = GET_CUSTOMER_TASKS_BY_LEAD_ID(leadId)

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query)
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
      const query = GET_CUSTOMER_TASKS_BY_OPPORTUNITY_ID(opportunityId)

      try {
        const result = await graphqlClient.request<CustomerTaskByEntityQueryResponse>(query)
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
      const query = GET_CUSTOMER_TASK_BY_ID(taskId)

      try {
        const result = await graphqlClient.request<CustomerTaskByIdQueryResponse>(query)
        const tasks = result.SalesTask.map(toCustomerTask)
        return tasks.length > 0 ? tasks[0] : null
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
