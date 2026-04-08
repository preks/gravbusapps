import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  type SaveCompensationBudgetPlanCompanyRowInput
} from '../../../api/saveCompensationBudgetPlan'
import {
  GET_BUDGET_SETUP_PLANS_AND_COMPANY_BUDGET_ROWS,
  LIST_COMPENSATION_BUDGET_PLANS
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { BudgetType } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import {
  DEFAULT_BUDGET_DISTRIBUTION_METHOD,
  DEFAULT_BUDGET_PLAN_STATUS_APPROVED
} from '../../../types/budgetPlanGraphqlEnums'
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

export interface SaveCompanyBudgetInput {
  salaryBudgetType: BudgetType
  salaryBudgetValue: number
  headcount: number
  currentTotalSalaryCost: number
  currencyRef?: string | null
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

function sortPlans(list: CompensationBudgetPlanListItem[]): CompensationBudgetPlanListItem[] {
  return [...list].sort((a, b) => {
    const fy = (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0)
    if (fy !== 0) return fy
    return a.name.localeCompare(b.name)
  })
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
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: raw.budgetPlanStatus ?? '',
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: raw.distributionMethod ?? '',
    headcount: num(raw.headcount),
    currencyRef: raw.currencyRef ?? null
  }
}

function buildCompanyBudgetChanges(input: SaveCompanyBudgetInput) {
  return {
    salaryBudgetAmount: input.salaryBudgetType === 'absolute' ? input.salaryBudgetValue : 0,
    salaryBudgetPercent: input.salaryBudgetType === 'percentage' ? input.salaryBudgetValue : 0,
    currentTotalSalaryCost: input.currentTotalSalaryCost,
    ...(input.currencyRef === undefined ? {} : { currencyRef: input.currencyRef })
  }
}

function applyPlanListAndDefaultSelection(list: CompensationBudgetPlanListItem[]): void {
  const { selectedBudgetPlanId: currentId, selectBudgetPlan: pickPlan } = useCompensationPlanningStore.getState()
  if (list.length === 0) {
    pickPlan(null)
  } else if (!currentId || !list.some(p => p.id === currentId)) {
    pickPlan(list[0].id)
  }
}

export function useBudgetSetupForCompany(accessToken: string, companyId: string | null) {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const { selectedBudgetPlanId, selectBudgetPlan } = useCompensationPlanningStore()
  /** Avoid applying company budget list responses after the user switched company in the dropdown. */
  const companyIdRef = useRef(companyId)
  const previousCompanyIdRef = useRef<string | null>(null)

  const [plans, setPlans] = useState<CompensationBudgetPlanListItem[]>([])
  const [companyBudgetPlanRows, setCompanyBudgetPlanRows] = useState<CompensationBudgetPlanCompanyRow[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingCompanyRowsList, setLoadingCompanyRowsList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const companyRow = useMemo((): CompensationBudgetPlanCompanyRow | null => {
    if (!selectedBudgetPlanId) {
      return null
    }
    return companyBudgetPlanRows.find(r => r.compensationBudgetPlanId === selectedBudgetPlanId) ?? null
  }, [companyBudgetPlanRows, selectedBudgetPlanId])

  useEffect(() => {
    companyIdRef.current = companyId
  }, [companyId])

  useEffect(() => {
    if (companyId == null) {
      setCompanyBudgetPlanRows([])
      previousCompanyIdRef.current = null
      return
    }
    if (previousCompanyIdRef.current !== null && previousCompanyIdRef.current !== companyId) {
      setCompanyBudgetPlanRows([])
    }
    previousCompanyIdRef.current = companyId
  }, [companyId])

  /**
   * One round-trip when `companyId` is set (plan list + company rows). Plans-only when no company.
   * Avoids duplicate `GET_COMPENSATION_BUDGET_PLAN_COMPANY` — selected row is derived from the list.
   */
  const fetchBudgetSetupData = useCallback(async () => {
    if (!accessToken) {
      return
    }
    setError(null)
    setLoadingPlans(true)
    setLoadingCompanyRowsList(true)
    try {
      if (!companyId) {
        const result = await graphqlClient.request<{
          CompensationBudgetPlan: CompensationBudgetPlanListItem[]
        }>(LIST_COMPENSATION_BUDGET_PLANS)
        const list = sortPlans((result.CompensationBudgetPlan ?? []).map(fillPlanListItem))
        setPlans(list)
        applyPlanListAndDefaultSelection(list)
        setCompanyBudgetPlanRows([])
        return
      }

      const companyIdForRequest = companyId
      const result = await graphqlClient.request<{
        CompensationBudgetPlan: CompensationBudgetPlanListItem[]
        CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[]
      }>(GET_BUDGET_SETUP_PLANS_AND_COMPANY_BUDGET_ROWS, { companyId: companyIdForRequest })

      if (companyIdRef.current !== companyIdForRequest) {
        return
      }

      const list = sortPlans((result.CompensationBudgetPlan ?? []).map(fillPlanListItem))
      setPlans(list)
      applyPlanListAndDefaultSelection(list)

      const next: CompensationBudgetPlanCompanyRow[] = []
      for (const raw of result.CompensationBudgetPlanCompany ?? []) {
        const row = mapGraphqlCompanyRow(raw)
        if (row.companyId !== companyIdForRequest) {
          continue
        }
        next.push(row)
      }
      setCompanyBudgetPlanRows(next)
    } catch (err) {
      logBudgetGraphqlFailure('GetBudgetSetupPlansAndCompanyBudgetRows', err)
      const message = err instanceof Error ? err.message : 'Failed to load budget setup data'
      setError(message)
      setPlans([])
      setCompanyBudgetPlanRows([])
    } finally {
      setLoadingPlans(false)
      setLoadingCompanyRowsList(false)
    }
  }, [accessToken, companyId, graphqlClient])

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
        const { id, raw } = await saveCompensationBudgetPlanCompany(restClient, accessToken, {
          changeMode: 'INSERT',
          compensationBudgetPlanCompany: {
            compensationBudgetPlan: c.compensationBudgetPlanId,
            company: c.companyId,
            salaryBudgetAmount: roundMoney2(c.salaryBudgetAmount),
            salaryBudgetPercent: roundMoney2(c.salaryBudgetPercent),
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
    [accessToken, fetchBudgetSetupData, restClient, selectBudgetPlan]
  )

  /** Table / dialog edit: REST `saveCompensationBudgetPlanCompany` with `changeMode: UPDATE`. */
  const updateCompanyBudgetRow = useCallback(
    async (
      row: CompensationBudgetPlanCompanyRow,
      input: {
        salaryBudgetAmount: number
        salaryBudgetPercent: number
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

  const saveCompanyBudget = useCallback(
    async (input: SaveCompanyBudgetInput) => {
      if (!accessToken || !companyId || !selectedBudgetPlanId) return false
      setSaving(true)
      setError(null)
      try {
        const changes = buildCompanyBudgetChanges(input)

        if (companyRow) {
          const salaryBudgetAmount = roundMoney2(changes.salaryBudgetAmount)
          const salaryBudgetPercent = roundMoney2(changes.salaryBudgetPercent)
          const currentTotalSalaryCost = roundMoney2(changes.currentTotalSalaryCost)
          const currencyRef = input.currencyRef === undefined ? companyRow.currencyRef : input.currencyRef

          const rowInput: SaveCompensationBudgetPlanCompanyRowInput = {
            id: companyRow.id,
            version: companyRow.version,
            compensationBudgetPlanId: companyRow.compensationBudgetPlanId,
            companyId: companyRow.companyId,
            salaryBudgetAmount,
            salaryBudgetPercent,
            currentTotalSalaryCost,
            currencyRef
          }
          const body = buildSaveCompensationBudgetPlanCompanyUpdateBody(rowInput)
          await saveCompensationBudgetPlanCompany(restClient, accessToken, body)
        } else {
          const { id, raw } = await saveCompensationBudgetPlanCompany(restClient, accessToken, {
            changeMode: 'INSERT',
            compensationBudgetPlanCompany: {
              compensationBudgetPlan: selectedBudgetPlanId,
              company: companyId,
              salaryBudgetAmount: roundMoney2(changes.salaryBudgetAmount),
              salaryBudgetPercent: roundMoney2(changes.salaryBudgetPercent),
              bonusBudgetAmount: 0,
              bonusBudgetPercent: 0,
              budgetPlanStatus: DEFAULT_BUDGET_PLAN_STATUS_APPROVED,
              currentTotalSalaryCost: roundMoney2(input.currentTotalSalaryCost),
              currencyRef: input.currencyRef ?? null,
              headcount: input.headcount,
              distributionMethod: DEFAULT_BUDGET_DISTRIBUTION_METHOD
            }
          })
          if (!id) {
            console.error('saveCompensationBudgetPlanCompany: missing id in response', raw)
            setError('Failed to create company budget row: unexpected response from server')
            return false
          }
        }
        await fetchBudgetSetupData()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save company budget'
        console.error('Failed to save compensation budget plan company:', err)
        setError(message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [accessToken, companyId, companyRow, fetchBudgetSetupData, restClient, selectedBudgetPlanId]
  )

  return {
    plans,
    selectedBudgetPlanId,
    selectBudgetPlan,
    companyRow,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRow: loadingCompanyRowsList,
    loadingCompanyRowsList,
    saving,
    creatingPlan,
    error,
    refetchPlans: fetchBudgetSetupData,
    refetchCompanyRow: fetchBudgetSetupData,
    refetchCompanyRowsForCompany: fetchBudgetSetupData,
    createPlan,
    updateCompanyBudgetRow,
    saveCompanyBudget
  }
}
