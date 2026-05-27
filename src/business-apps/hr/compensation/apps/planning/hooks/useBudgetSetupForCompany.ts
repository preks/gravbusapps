import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  type SaveCompensationBudgetPlanCompanyRowInput
} from '../../../api/saveCompensationBudgetPlan'
import {
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_PLAN,
  LIST_COMPENSATION_BUDGET_PLANS
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import { useCompensationPlanningStore } from './useCompensationPlanningStore'

/** Mirrors GraphQL `CompensationBudgetPlan` (DB: fiscal_year, start_date, …). */
export interface CompensationBudgetPlanListItem {
  id: string
  name: string
  description: string | null
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  budgetPlanStatus: string
}

/** Mirrors `compensation_budget_plan_company`: amount + percent per pool, not legacy type/value. */
export interface CompensationBudgetPlanCompanyRow {
  id: string
  /** Optimistic locking — required for REST `saveCompensationBudgetPlanCompany` UPDATE. */
  version: number
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
  currentTotalSalaryCost: number
  distributionMethod: string
  headcount: number
  currencyRef: string | null
}

export interface CreateBudgetPlanInput {
  /** Mirrors `compensation_budget_plan_company` for the selected company. */
  companyBudget: {
    /** Which compensation budget plan this company row belongs to (from form dropdown). */
    compensationBudgetPlanId: string
    companyId: string
    salaryBudgetAmount: number
    salaryBudgetPercent: number
    currentTotalSalaryCost: number
    currencyRef: string | null
  }
}

function fillPlanListItem(
  p: Partial<CompensationBudgetPlanListItem> & { id: string; name?: string }
): CompensationBudgetPlanListItem {
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

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/** GraphQL row shape for `CompensationBudgetPlanCompany` selections in this module. */
export interface CompensationBudgetPlanCompanyGraphqlRow {
  id: string
  version?: unknown
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: unknown
  salaryBudgetPercent: unknown
  allocationAmount?: unknown
  bonusBudgetAmount: unknown
  bonusBudgetPercent: unknown
  budgetPlanStatus: string | null
  currentTotalSalaryCost: unknown
  distributionMethod: string | null
  headcount: unknown
  currencyRef: string | null
}

function mapGraphqlCompanyRow(raw: CompensationBudgetPlanCompanyGraphqlRow): CompensationBudgetPlanCompanyRow {
  return {
    id: raw.id,
    version: num(raw.version),
    compensationBudgetPlanId: raw.compensationBudgetPlanId,
    companyId: raw.companyId,
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: raw.budgetPlanStatus ?? '',
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: raw.distributionMethod ?? '',
    headcount: num(raw.headcount),
    currencyRef: raw.currencyRef ?? null
  }
}

/**
 * Keeps `selectedBudgetPlanId` when it still exists in the approved cycle list; clears it when invalid.
 * Does **not** auto-select the first plan — user must pick a compensation cycle to see setup / submissions data.
 */
function applyCompensationCycleSelectorListAndDefaultSelection(list: CompensationBudgetPlanListItem[]): void {
  const { selectedBudgetPlanId: currentId, selectBudgetPlan: pickPlan } = useCompensationPlanningStore.getState()
  if (list.length === 0) {
    pickPlan(null)
    return
  }
  if (currentId != null && !list.some(p => p.id === currentId)) {
    pickPlan(null)
  }
}

export function useBudgetSetupForCompany(accessToken: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const { selectedBudgetPlanId, selectBudgetPlan } = useCompensationPlanningStore()

  /** All plans from GraphQL (any status), for table / label resolution. */
  const [plans, setPlans] = useState<CompensationBudgetPlanListItem[]>([])
  const [companyBudgetPlanRows, setCompanyBudgetPlanRows] = useState<CompensationBudgetPlanCompanyRow[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingCompanyRowsList, setLoadingCompanyRowsList] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** Loads all cycles plus the company budget rows for the selected cycle. */
  const fetchBudgetSetupData = useCallback(async () => {
    if (!accessToken) {
      return
    }
    setError(null)
    setLoadingPlans(true)
    setLoadingCompanyRowsList(true)
    try {
      const [plansResult, companyRowsResult] = await Promise.all([
        graphqlClient.request<{
          CompensationBudgetPlan: CompensationBudgetPlanListItem[]
        }>(LIST_COMPENSATION_BUDGET_PLANS),
        selectedBudgetPlanId == null
          ? Promise.resolve<{ CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[] }>({
              CompensationBudgetPlanCompany: []
            })
          : graphqlClient.request<{
              CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[]
            }>(LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_PLAN, { planId: selectedBudgetPlanId })
      ])

      const list = (plansResult.CompensationBudgetPlan ?? []).map(fillPlanListItem)
      setPlans(list)
      applyCompensationCycleSelectorListAndDefaultSelection(list)

      const next = (companyRowsResult.CompensationBudgetPlanCompany ?? []).map(mapGraphqlCompanyRow)
      setCompanyBudgetPlanRows(next)
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlanCompanyByPlan', err)
      const message = err instanceof Error ? err.message : 'Failed to load budget setup data'
      setError(message)
      setPlans([])
      setCompanyBudgetPlanRows([])
    } finally {
      setLoadingPlans(false)
      setLoadingCompanyRowsList(false)
    }
  }, [accessToken, graphqlClient, selectedBudgetPlanId])

  useEffect(() => {
    void fetchBudgetSetupData()
  }, [fetchBudgetSetupData])

  /** Budget **setup** tab add dialog: REST `saveCompensationBudgetPlanCompany` with `changeMode: INSERT`. */
  const createPlan = useCallback(
    async (input: CreateBudgetPlanInput) => {
      if (!accessToken) return null
      setCreatingPlan(true)
      setError(null)
      try {
        const c = input.companyBudget
        const existingRows = await graphqlClient.request<{
          CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[]
        }>(LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY, { companyId: c.companyId })
        const duplicateExists = (existingRows.CompensationBudgetPlanCompany ?? []).some(
          row => row.compensationBudgetPlanId === c.compensationBudgetPlanId
        )
        if (duplicateExists) {
          setError('This company already has a budget for the selected compensation cycle.')
          return null
        }
        const { id, raw } = await saveCompensationBudgetPlanCompany(restClient, accessToken, {
          changeMode: 'INSERT',
          compensationBudgetPlanCompany: {
            compensationBudgetPlan: c.compensationBudgetPlanId,
            company: c.companyId,
            salaryBudgetAmount: roundMoney2(c.salaryBudgetAmount),
            salaryBudgetPercent: roundMoney2(c.salaryBudgetPercent),
            allocationAmount: 0,
            bonusBudgetAmount: 0,
            bonusBudgetPercent: 0,
            budgetPlanStatus: 'BUDGET_PLAN_APPROVED',
            currentTotalSalaryCost: c.currentTotalSalaryCost,
            currencyRef: c.currencyRef
          }
        })
        if (!id) {
          console.error('saveCompensationBudgetPlanCompany: missing id in response', raw)
          setError('Failed to create company budget row: unexpected response from server')
          return null
        }
        selectBudgetPlan(input.companyBudget.compensationBudgetPlanId)
        await fetchBudgetSetupData()
        return id
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create company budget row'
        console.error('Failed to create compensation budget plan company:', err)
        setError(message)
        return null
      } finally {
        setCreatingPlan(false)
      }
    },
    [accessToken, fetchBudgetSetupData, graphqlClient, restClient, selectBudgetPlan]
  )

  /** Table / dialog edit: REST `saveCompensationBudgetPlanCompany` with `changeMode: UPDATE`. */
  const updateCompanyBudgetRow = useCallback(
    async (
      row: CompensationBudgetPlanCompanyRow,
      input: {
        salaryBudgetAmount: number
        salaryBudgetPercent: number
        allocationAmount: number
        currencyRef: string | null
      }
    ): Promise<boolean> => {
      if (!accessToken) return false
      setCreatingPlan(true)
      setError(null)
      try {
        const rowInput: SaveCompensationBudgetPlanCompanyRowInput = {
          id: row.id,
          version: row.version,
          compensationBudgetPlanId: row.compensationBudgetPlanId,
          companyId: row.companyId,
          salaryBudgetAmount: roundMoney2(input.salaryBudgetAmount),
          salaryBudgetPercent: roundMoney2(input.salaryBudgetPercent),
          allocationAmount: roundMoney2(input.allocationAmount),
          currentTotalSalaryCost: roundMoney2(row.currentTotalSalaryCost),
          currencyRef: input.currencyRef
        }
        const body = buildSaveCompensationBudgetPlanCompanyUpdateBody(rowInput)
        await saveCompensationBudgetPlanCompany(restClient, accessToken, body)
        await fetchBudgetSetupData()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update company budget row'
        console.error('Failed to update compensation budget plan company:', err)
        setError(message)
        return false
      } finally {
        setCreatingPlan(false)
      }
    },
    [accessToken, fetchBudgetSetupData, restClient]
  )

  return {
    plans,
    selectedBudgetPlanId,
    selectBudgetPlan,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRowsList,
    creatingPlan,
    error,
    refetchPlans: fetchBudgetSetupData,
    createPlan,
    updateCompanyBudgetRow
  }
}
