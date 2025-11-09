// Investment Task hooks - list and search operations for investment tasks
import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Types
import type { InvestmentTask } from '../types'

// Queries
import {
  buildInvestmentTaskQuery,
  buildInvestmentTaskByIdQuery,
  buildInvestmentTaskWhereCondition,
  buildInvestmentTaskOrderBy,
  type InvestmentTaskQueryVariables
} from '../queries/investmentTaskQueries.new'

// Mapper
import { toInvestmentTask } from '../mappers'

export interface InvestmentTaskListQueryResponse {
  InvestmentTask: InvestmentTask[]
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
      // Use new query builder with fields mapping
      const query = buildInvestmentTaskQuery()

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
              case 'investment':
                return { investment: { id: { _neq: null } } }
              default:
                return null
            }
          })
          .filter((c): c is Record<string, any> => c !== null)

        if (referenceConditions.length > 0) {
          customConditions.push({ _or: referenceConditions })
        }
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentTaskWhereCondition(variables, [], customConditions)

      let orderBy = buildInvestmentTaskOrderBy(variables.orderBy || [])
      if (orderBy.length === 0) {
        orderBy = [{ createdAt: 'DESC' }]
      }

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query, graphQLVariables)
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
        // Use new query builder with fields mapping
        const query = buildInvestmentTaskByIdQuery(undefined, undefined, id)
        const result = await graphqlClient.request<{ InvestmentTaskByPk: InvestmentTask }>(query)
        const taskData = result.InvestmentTaskByPk
        return taskData ? toInvestmentTask(taskData) : null
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

      // Use new query builder with fields mapping
      const query = buildInvestmentTaskQuery()

      // Handle reference type filtering
      const customConditions: Record<string, any>[] = []
      if (baseVars.referenceTypes && baseVars.referenceTypes.length > 0) {
        const referenceConditions = baseVars.referenceTypes
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
              case 'investment':
                return { investment: { id: { _neq: null } } }
              default:
                return null
            }
          })
          .filter((c): c is Record<string, any> => c !== null)
        if (referenceConditions.length > 0) {
          customConditions.push({ _or: referenceConditions })
        }
      }

      // Use new WHERE/ORDER BY builders with fields mapping
      const whereCondition = buildInvestmentTaskWhereCondition(baseVars, [], customConditions)

      let orderBy = buildInvestmentTaskOrderBy(baseVars.orderBy || [])
      if (orderBy.length === 0) {
        orderBy = [{ createdAt: 'DESC' }]
      }

      const graphQLVariables: Record<string, any> = {
        limit: limit,
        offset: 0,
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentTaskListQueryResponse>(query, graphQLVariables)
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
