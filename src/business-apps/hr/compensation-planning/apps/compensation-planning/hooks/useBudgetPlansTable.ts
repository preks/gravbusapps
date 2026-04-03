import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import {
  buildCreateCompensationBudgetPlanRestBody,
  createCompensationBudgetPlan
} from '../../../api/createCompensationBudgetPlan'
import { INSERT_COMPENSATION_BUDGET_PLAN, LIST_COMPENSATION_BUDGET_PLANS } from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'

export interface CompensationBudgetPlanRow {
  id: string
  name: string
  description: string | null
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  budgetPlanStatus: string
}

export interface InsertBudgetPlanInput {
  name: string
  description: string | null
  fiscalYear: number
  budgetPlanStatus: BudgetPlanStatusApi
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}

function fillRow(p: Partial<CompensationBudgetPlanRow> & { id: string }): CompensationBudgetPlanRow {
  return {
    id: p.id,
    name: p.name ?? '',
    description: p.description ?? null,
    fiscalYear: typeof p.fiscalYear === 'number' && !Number.isNaN(p.fiscalYear) ? p.fiscalYear : 0,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    effectiveDate: p.effectiveDate ?? null,
    budgetPlanStatus: p.budgetPlanStatus ?? ''
  }
}

export function useBudgetPlansTable(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const [rows, setRows] = useState<CompensationBudgetPlanRow[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    if (!accessToken) return
    setLoading(true)
    setError(null)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlan: CompensationBudgetPlanRow[]
      }>(LIST_COMPENSATION_BUDGET_PLANS)
      const list = (result.CompensationBudgetPlan ?? []).map(fillRow)
      setRows(list)
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlans', err)
      const message = err instanceof Error ? err.message : 'Failed to load budget plans'
      setError(message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  const insertPlanViaGraphql = useCallback(
    async (input: InsertBudgetPlanInput): Promise<string | null> => {
      const result = await graphqlClient.request<{
        insert_CompensationBudgetPlan_one: { id: string } | null
      }>(INSERT_COMPENSATION_BUDGET_PLAN, {
        object: {
          name: input.name.trim(),
          description: input.description?.trim() ? input.description.trim() : null,
          fiscalYear: input.fiscalYear,
          budgetPlanStatus: input.budgetPlanStatus,
          startDate: input.startDate,
          endDate: input.endDate,
          effectiveDate: input.effectiveDate,
          isDeleted: false
        }
      })
      return result.insert_CompensationBudgetPlan_one?.id ?? null
    },
    [graphqlClient]
  )

  /** Budget **plan** tab: REST `createCompensationBudgetPlan` (not the budget-setup company create). */
  const insertPlan = useCallback(
    async (input: InsertBudgetPlanInput): Promise<string | null> => {
      if (!accessToken) return null
      setCreating(true)
      setError(null)
      try {
        const body = buildCreateCompensationBudgetPlanRestBody({
          name: input.name,
          description: input.description?.trim() ? input.description.trim() : null,
          fiscalYear: input.fiscalYear,
          budgetPlanStatus: input.budgetPlanStatus,
          startDate: input.startDate,
          endDate: input.endDate,
          effectiveDate: input.effectiveDate
        })
        let id: string | null = null
        try {
          const restResult = await createCompensationBudgetPlan(restClient, accessToken, body)
          id = restResult.id
        } catch (restErr) {
          const restMessage = restErr instanceof Error ? restErr.message : String(restErr)
          const isNotFound =
            restMessage.includes('404') || restMessage.includes('status: 404') || restMessage.includes('Not Found')
          if (!isNotFound) {
            logBudgetGraphqlFailure('createCompensationBudgetPlan REST', restErr)
            setError(restMessage)
            return null
          }
          id = await insertPlanViaGraphql(input)
          if (!id) {
            logBudgetGraphqlFailure('InsertCompensationBudgetPlan (fallback after REST 404)', restErr)
            setError(
              'Create budget plan failed: REST route is not deployed (404) and GraphQL insert did not return an id.'
            )
            return null
          }
        }

        if (id) {
          await fetchPlans()
        }
        return id
      } catch (err) {
        logBudgetGraphqlFailure('InsertCompensationBudgetPlan', err)
        const message = err instanceof Error ? err.message : 'Failed to create budget plan'
        setError(message)
        return null
      } finally {
        setCreating(false)
      }
    },
    [accessToken, fetchPlans, insertPlanViaGraphql, restClient]
  )

  return {
    rows,
    loading,
    creating,
    error,
    refetch: fetchPlans,
    insertPlan
  }
}
