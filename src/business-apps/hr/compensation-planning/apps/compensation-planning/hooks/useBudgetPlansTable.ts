import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import {
  buildCreateCompensationBudgetPlanRestBody,
  createCompensationBudgetPlan
} from '../../../api/createCompensationBudgetPlan'
import { LIST_COMPENSATION_BUDGET_PLANS } from '../../../queries/budgetPlanQueries'
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

  /** Budget **plan** tab: REST `createCompensationBudgetPlan` only (no GraphQL mutations). */
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
        const { id } = await createCompensationBudgetPlan(restClient, accessToken, body)
        if (!id) {
          setError('Create budget plan failed: server did not return a plan id.')
          return null
        }
        await fetchPlans()
        return id
      } catch (err) {
        logBudgetGraphqlFailure('createCompensationBudgetPlan REST', err)
        const message = err instanceof Error ? err.message : 'Failed to create budget plan'
        setError(message)
        return null
      } finally {
        setCreating(false)
      }
    },
    [accessToken, fetchPlans, restClient]
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
