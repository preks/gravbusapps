import { useCallback, useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { COMPENSATION_BUDGET_REST_BASE_URL } from '../../../api/compensationBudgetRestConfig'
import { createCompensationBudgetPlanCompany } from '../../../api/createCompensationBudgetPlan'
import {
  buildSaveCompensationBudgetPlanCompanyUpdateBody,
  saveCompensationBudgetPlanCompany,
  type SaveCompensationBudgetPlanCompanyRowInput
} from '../../../api/saveCompensationBudgetPlan'
import {
  GET_COMPENSATION_BUDGET_PLAN_COMPANY,
  LIST_COMPENSATION_BUDGET_PLANS,
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { BudgetType } from '../../../types/compensationPlanningTypes'
import { roundMoney2 } from '../../../utils/budgetAmountPercentSync'
import {
  DEFAULT_BUDGET_DISTRIBUTION_METHOD,
  DEFAULT_BUDGET_PLAN_STATUS_DRAFT
} from '../../../types/budgetPlanGraphqlEnums'
import { coerceStoredDistributionMethodToApi } from '../../../utils/mapDistributionMethodToApi'
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
    bonusBudgetAmount: number
    bonusBudgetPercent: number
    currentTotalSalaryCost: number
    currencyRef: string | null
  }
}

export interface SaveCompanyBudgetInput {
  salaryBudgetType: BudgetType
  salaryBudgetValue: number
  bonusBudgetType: BudgetType
  bonusBudgetValue: number
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
    bonusBudgetAmount: input.bonusBudgetType === 'absolute' ? input.bonusBudgetValue : 0,
    bonusBudgetPercent: input.bonusBudgetType === 'percentage' ? input.bonusBudgetValue : 0,
    currentTotalSalaryCost: input.currentTotalSalaryCost,
    ...(input.currencyRef !== undefined ? { currencyRef: input.currencyRef } : {})
  }
}

export function useBudgetSetupForCompany(accessToken: string, companyId: string | null) {
  const graphqlClient = useGraphQLClient(accessToken)
  const restClient = useRestClient(COMPENSATION_BUDGET_REST_BASE_URL)
  const { selectedBudgetPlanId, setSelectedBudgetPlanId } = useCompensationPlanningStore()
  /** Avoid applying company budget list responses after the user switched company in the dropdown. */
  const companyIdRef = useRef(companyId)
  const previousCompanyIdRef = useRef<string | null>(null)
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

  const [plans, setPlans] = useState<CompensationBudgetPlanListItem[]>([])
  const [companyRow, setCompanyRow] = useState<CompensationBudgetPlanCompanyRow | null>(null)
  const [companyBudgetPlanRows, setCompanyBudgetPlanRows] = useState<CompensationBudgetPlanCompanyRow[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingCompanyRow, setLoadingCompanyRow] = useState(false)
  const [loadingCompanyRowsList, setLoadingCompanyRowsList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [creatingPlan, setCreatingPlan] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    if (!accessToken) return
    setLoadingPlans(true)
    setError(null)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlan: CompensationBudgetPlanListItem[]
      }>(LIST_COMPENSATION_BUDGET_PLANS)
      const list = sortPlans((result.CompensationBudgetPlan ?? []).map(fillPlanListItem))
      setPlans(list)
      const { selectedBudgetPlanId: currentId, setSelectedBudgetPlanId: pickPlan } =
        useCompensationPlanningStore.getState()
      if (list.length === 0) {
        pickPlan(null)
      } else if (!currentId || !list.some(p => p.id === currentId)) {
        pickPlan(list[0].id)
      }
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlans', err)
      const message = err instanceof Error ? err.message : 'Failed to load budget plans'
      setError(`Budget plans: ${message}`)
      setPlans([])
    } finally {
      setLoadingPlans(false)
    }
  }, [accessToken, graphqlClient])

  const fetchCompanyRow = useCallback(async () => {
    if (!accessToken || !companyId || !selectedBudgetPlanId) {
      setCompanyRow(null)
      return
    }
    const companyIdForRequest = companyId
    const planIdForRequest = selectedBudgetPlanId
    setLoadingCompanyRow(true)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[]
      }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY, {
        planId: planIdForRequest,
        companyId: companyIdForRequest
      })
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }
      const rows = result.CompensationBudgetPlanCompany ?? []
      const raw = rows[0]
      if (!raw) {
        setCompanyRow(null)
        return
      }
      setCompanyRow(mapGraphqlCompanyRow(raw))
    } catch (err) {
      logBudgetGraphqlFailure('GetCompensationBudgetPlanCompany', err)
      const message = err instanceof Error ? err.message : 'Failed to load company budget'
      setError(`Company budget: ${message}`)
      setCompanyRow(null)
    } finally {
      setLoadingCompanyRow(false)
    }
  }, [accessToken, companyId, graphqlClient, selectedBudgetPlanId])

  const fetchCompanyRowsForCompany = useCallback(async () => {
    if (!accessToken || !companyId) {
      setCompanyBudgetPlanRows([])
      return
    }
    const companyIdForRequest = companyId
    setLoadingCompanyRowsList(true)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlanCompany: CompensationBudgetPlanCompanyGraphqlRow[]
      }>(LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY, { companyId: companyIdForRequest })
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }
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
      logBudgetGraphqlFailure('ListCompensationBudgetPlanCompanyByCompany', err)
      const message = err instanceof Error ? err.message : 'Failed to load company budget rows'
      setError(`Company budget list: ${message}`)
      setCompanyBudgetPlanRows([])
    } finally {
      setLoadingCompanyRowsList(false)
    }
  }, [accessToken, companyId, graphqlClient])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    void fetchCompanyRow()
  }, [fetchCompanyRow])

  useEffect(() => {
    void fetchCompanyRowsForCompany()
  }, [fetchCompanyRowsForCompany])

  /** Budget **setup** tab add dialog: REST `createCompensationBudgetPlanCompany` (plan–company row). */
  const createPlan = useCallback(
    async (input: CreateBudgetPlanInput) => {
      if (!accessToken) return null
      setCreatingPlan(true)
      setError(null)
      try {
        const c = input.companyBudget
        const { id, raw } = await createCompensationBudgetPlanCompany(restClient, accessToken, {
          compensationBudgetPlanCompany: {
            compensationBudgetPlan: c.compensationBudgetPlanId,
            company: c.companyId,
            salaryBudgetAmount: roundMoney2(c.salaryBudgetAmount),
            salaryBudgetPercent: roundMoney2(c.salaryBudgetPercent),
            bonusBudgetAmount: roundMoney2(c.bonusBudgetAmount),
            bonusBudgetPercent: roundMoney2(c.bonusBudgetPercent),
            budgetPlanStatus: 'BUDGET_PLAN_APPROVED',
            currentTotalSalaryCost: c.currentTotalSalaryCost,
            currencyRef: c.currencyRef
          }
        })
        if (!id) {
          console.error('createCompensationBudgetPlanCompany: missing id in response', raw)
          setError('Failed to create company budget row: unexpected response from server')
          return null
        }
        setSelectedBudgetPlanId(input.companyBudget.compensationBudgetPlanId)
        await fetchPlans()
        await fetchCompanyRowsForCompany()
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
    [accessToken, fetchCompanyRowsForCompany, fetchPlans, restClient, setSelectedBudgetPlanId]
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
          const bonusBudgetAmount = roundMoney2(changes.bonusBudgetAmount)
          const bonusBudgetPercent = roundMoney2(changes.bonusBudgetPercent)
          const currentTotalSalaryCost = roundMoney2(changes.currentTotalSalaryCost)
          const currencyRef = input.currencyRef !== undefined ? input.currencyRef : companyRow.currencyRef

          const rowInput: SaveCompensationBudgetPlanCompanyRowInput = {
            id: companyRow.id,
            compensationBudgetPlanId: companyRow.compensationBudgetPlanId,
            companyId: companyRow.companyId,
            salaryBudgetAmount,
            salaryBudgetPercent,
            bonusBudgetAmount,
            bonusBudgetPercent,
            budgetPlanStatus: companyRow.budgetPlanStatus,
            currentTotalSalaryCost,
            currencyRef,
            headcount: input.headcount
          }
          const body = buildSaveCompensationBudgetPlanCompanyUpdateBody(
            rowInput,
            coerceStoredDistributionMethodToApi(companyRow.distributionMethod)
          )
          await saveCompensationBudgetPlanCompany(restClient, accessToken, body)
        } else {
          const { id, raw } = await createCompensationBudgetPlanCompany(restClient, accessToken, {
            compensationBudgetPlanCompany: {
              compensationBudgetPlan: selectedBudgetPlanId,
              company: companyId,
              salaryBudgetAmount: roundMoney2(changes.salaryBudgetAmount),
              salaryBudgetPercent: roundMoney2(changes.salaryBudgetPercent),
              bonusBudgetAmount: roundMoney2(changes.bonusBudgetAmount),
              bonusBudgetPercent: roundMoney2(changes.bonusBudgetPercent),
              budgetPlanStatus: DEFAULT_BUDGET_PLAN_STATUS_DRAFT,
              currentTotalSalaryCost: roundMoney2(input.currentTotalSalaryCost),
              currencyRef: input.currencyRef ?? null,
              headcount: input.headcount,
              distributionMethod: DEFAULT_BUDGET_DISTRIBUTION_METHOD
            }
          })
          if (!id) {
            console.error('createCompensationBudgetPlanCompany: missing id in response', raw)
            setError('Failed to create company budget row: unexpected response from server')
            return false
          }
        }
        await fetchCompanyRow()
        await fetchCompanyRowsForCompany()
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
    [accessToken, companyId, companyRow, fetchCompanyRow, fetchCompanyRowsForCompany, restClient, selectedBudgetPlanId]
  )

  return {
    plans,
    selectedBudgetPlanId,
    setSelectedBudgetPlanId,
    companyRow,
    companyBudgetPlanRows,
    loadingPlans,
    loadingCompanyRow,
    loadingCompanyRowsList,
    saving,
    creatingPlan,
    error,
    refetchPlans: fetchPlans,
    refetchCompanyRow: fetchCompanyRow,
    refetchCompanyRowsForCompany: fetchCompanyRowsForCompany,
    createPlan,
    saveCompanyBudget
  }
}
