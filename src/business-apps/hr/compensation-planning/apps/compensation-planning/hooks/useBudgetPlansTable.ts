import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import {
  buildCreateCompensationBudgetPlanRestBody,
  buildUpdateCompensationBudgetPlanRestBody
} from '../../../api/createCompensationBudgetPlan'
import { saveCompensationBudgetPlan } from '../../../api/saveCompensationBudgetPlan'
import { LIST_COMPENSATION_BUDGET_PLANS } from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'

export interface CompensationBudgetPlanRow {
  id: string
  /** Optimistic locking — required for REST `saveCompensationBudgetPlan` UPDATE. */
  version: number
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

export interface UpdateBudgetPlanInput {
  id: string
  version: number
  name: string
  description: string | null
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}

function parsePlanVersion(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number.parseInt(value, 10)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

function fillRow(p: Partial<CompensationBudgetPlanRow> & { id: string }): CompensationBudgetPlanRow {
  return {
    id: p.id,
    version: parsePlanVersion(p.version),
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

  /** Budget **plan** tab: REST `saveCompensationBudgetPlan` with `changeMode: INSERT` (no GraphQL mutations). */
  const insertPlan = useCallback(
    async (input: InsertBudgetPlanInput): Promise<string | null> => {
      if (!accessToken) return null
      setCreating(true)
      setError(null)
      try {
        const built = buildCreateCompensationBudgetPlanRestBody({
          name: input.name,
          description: input.description?.trim() ? input.description.trim() : null,
          fiscalYear: input.fiscalYear,
          budgetPlanStatus: input.budgetPlanStatus,
          startDate: input.startDate,
          endDate: input.endDate,
          effectiveDate: input.effectiveDate
        })
        const { id } = await saveCompensationBudgetPlan(restClient, accessToken, {
          changeMode: 'INSERT',
          compensationBudgetPlan: built.compensationBudgetPlan
        })
        if (!id) {
          setError('Create budget plan failed: server did not return a plan id.')
          return null
        }
        await fetchPlans()
        return id
      } catch (err) {
        logBudgetGraphqlFailure('saveCompensationBudgetPlan REST', err)
        const message = err instanceof Error ? err.message : 'Failed to create budget plan'
        setError(message)
        return null
      } finally {
        setCreating(false)
      }
    },
    [accessToken, fetchPlans, restClient]
  )

  /** REST `saveCompensationBudgetPlan` with `changeMode: UPDATE`. */
  const updatePlan = useCallback(
    async (input: UpdateBudgetPlanInput): Promise<boolean> => {
      if (!accessToken) return false
      setCreating(true)
      setError(null)
      try {
        const built = buildUpdateCompensationBudgetPlanRestBody({
          id: input.id,
          version: input.version,
          name: input.name,
          description: input.description?.trim() ? input.description.trim() : null,
          fiscalYear: input.fiscalYear,
          startDate: input.startDate,
          endDate: input.endDate,
          effectiveDate: input.effectiveDate
        })
        await saveCompensationBudgetPlan(restClient, accessToken, {
          changeMode: 'UPDATE',
          compensationBudgetPlan: built.compensationBudgetPlan
        })
        await fetchPlans()
        return true
      } catch (err) {
        logBudgetGraphqlFailure('saveCompensationBudgetPlan UPDATE REST', err)
        const message = err instanceof Error ? err.message : 'Failed to update budget plan'
        setError(message)
        return false
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
    insertPlan,
    updatePlan
  }
}
