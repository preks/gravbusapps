// Investment Task hooks - list and search operations for investment tasks
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { BaseInvestmentTask, InvestmentTask } from '../types'

// Queries
import {
  GET_INVESTMENT_TASKS,
  GET_INVESTMENT_TASK_BY_ID,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries'

// Mapper
import { toInvestmentTask } from '../mappers'

export interface InvestmentTaskListQueryResponse {
  InvestmentTask: BaseInvestmentTask[]
  InvestmentTaskAggregate: {
    aggregate: { count: number }
  }
}

export interface InvestmentTaskListData {
  tasks: InvestmentTask[]
  total: number
}

export const useInvestmentTasks = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentTasks = useCallback(
    async (variables: InvestmentTaskQueryVariables = {}): Promise<InvestmentTaskListData> => {
      const query = GET_INVESTMENT_TASKS(variables)

      try {
        const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query)
        const tasks = result.InvestmentTask.map(toInvestmentTask)
        const total = result.InvestmentTaskAggregate?.aggregate?.count || 0
        return { tasks, total }
      } catch (error) {
        console.error('Error fetching investment tasks:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  const fetchInvestmentTaskById = useCallback(
    async (id: string): Promise<InvestmentTask | null> => {
      try {
        const result = await graphqlClient.request<{ InvestmentTask: BaseInvestmentTask[] }>(
          GET_INVESTMENT_TASK_BY_ID,
          { id }
        )
        const first = (result.InvestmentTask || [])[0]
        return first ? toInvestmentTask(first) : null
      } catch (error) {
        console.error('Error fetching investment task by id:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  // Derive filter values from main task data (no direct catalog queries)
  const fetchInvestmentTaskFilterValues = useCallback(
    async (variables: InvestmentTaskQueryVariables = {}) => {
      const limit = Math.min(variables.limit || 1000, 1000)
      const baseVars = { ...variables, limit, offset: 0 } as InvestmentTaskQueryVariables
      const query = GET_INVESTMENT_TASKS(baseVars)
      try {
        const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query)
        const baseTasks = result.InvestmentTask || []

        const statusMap = new Map<string, { id: string; code?: string; value: string }>()
        const priorityMap = new Map<string, { id: string; code?: string; value: string }>()
        const typeMap = new Map<string, { id: string; code?: string; value: string }>()
        const assigneeMap = new Map<string, { id: string; displayName: string }>()
        const counts = { opportunity: 0, account: 0, lead: 0, contact: 0 } as {
          opportunity: number
          account: number
          lead: number
          contact: number
        }

        baseTasks.forEach((t: any) => {
          const s = t.taskStatus
          if (s?.id && !statusMap.has(s.id)) statusMap.set(s.id, { id: s.id, code: s.code, value: s.value || s.code })
          const p = t.taskPriority
          if (p?.id && !priorityMap.has(p.id))
            priorityMap.set(p.id, { id: p.id, code: p.code, value: p.value || p.code })
          const ty = t.taskType
          if (ty?.id && !typeMap.has(ty.id))
            typeMap.set(ty.id, { id: ty.id, code: ty.code, value: ty.value || ty.code })
          const a = t.assignedEmployee
          if (a?.id && !assigneeMap.has(a.id)) {
            const displayName = a.displayName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Unknown'
            assigneeMap.set(a.id, { id: a.id, displayName })
          }

          if (t.opportunity?.id) counts.opportunity++
          else if (t.account?.id) counts.account++
          else if (t.lead?.id) counts.lead++
          else if (t.contact?.id) counts.contact++
        })

        return {
          statuses: Array.from(statusMap.values()),
          priorities: Array.from(priorityMap.values()),
          types: Array.from(typeMap.values()),
          assignees: Array.from(assigneeMap.values()),
          referenceCounts: counts
        }
      } catch (error) {
        console.error('Error fetching investment task filter values:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentTasks, fetchInvestmentTaskById, fetchInvestmentTaskFilterValues }
}
