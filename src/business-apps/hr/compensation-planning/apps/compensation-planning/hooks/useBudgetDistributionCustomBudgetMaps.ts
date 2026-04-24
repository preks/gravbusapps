import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DistributionMethod } from '../../../types/compensationPlanningTypes'
import { parseCustomAmountInput, parseCustomPercentInput, roundMoney2 } from '../utils/parseCustomBudgetInputs'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from '../components/views/budgetDistributionCustomTypes'
import { defaultOrgUnitCustomBudgetInput } from '../components/views/budgetDistributionCustomTypes'

interface OrgUnitRef {
  id: string
}

interface BudgetDistributionCustomState {
  byId: Record<string, OrgUnitCustomBudgetInput>
  /** Org unit ids in the order the user first entered a non-empty amount or percent (waterfall priority). */
  inputOrder: string[]
}

const initialCustomState: BudgetDistributionCustomState = {
  byId: {},
  inputOrder: []
}

function isMeaningfulEntry(entry: OrgUnitCustomBudgetInput): boolean {
  return entry.amountRaw.trim() !== '' || entry.percentRaw.trim() !== ''
}

/** Rows with input first (edit order), then any other org units in list order. */
function buildWaterfallOrgUnitIds(orgUnits: OrgUnitRef[], inputOrder: readonly string[]): string[] {
  const idSet = new Set(orgUnits.map(u => u.id))
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const id of inputOrder) {
    if (idSet.has(id) && !seen.has(id)) {
      ordered.push(id)
      seen.add(id)
    }
  }
  for (const u of orgUnits) {
    if (!seen.has(u.id)) {
      ordered.push(u.id)
      seen.add(u.id)
    }
  }
  return ordered
}

function updateInputOrderAfterEntryChange(
  prevOrder: string[],
  orgUnitId: string,
  nextEntry: OrgUnitCustomBudgetInput,
  orgUnitIds: Set<string>
): string[] {
  const order = prevOrder.filter(id => orgUnitIds.has(id))
  if (!isMeaningfulEntry(nextEntry)) {
    return order.filter(id => id !== orgUnitId)
  }
  if (order.includes(orgUnitId)) {
    return order
  }
  return [...order, orgUnitId]
}

function allocationFromEntryAndRemaining(entry: OrgUnitCustomBudgetInput, remaining: number): number {
  if (remaining <= 0) {
    return 0
  }
  if (entry.mode === 'percent') {
    const pct = parseCustomPercentInput(entry.percentRaw)
    const amount = roundMoney2((remaining * pct) / 100)
    return Math.min(amount, remaining)
  }
  const amount = parseCustomAmountInput(entry.amountRaw)
  return Math.min(amount, remaining)
}

function buildCustomAllocationMap(
  orgUnits: OrgUnitRef[],
  customByOrgUnitId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number,
  inputOrder: readonly string[]
): Map<string, number> {
  const orderedIds = buildWaterfallOrgUnitIds(orgUnits, inputOrder)
  const map = new Map<string, number>()
  let remaining = pool > 0 ? pool : 0
  for (const id of orderedIds) {
    const entry = customByOrgUnitId[id] ?? defaultOrgUnitCustomBudgetInput()
    const amount = allocationFromEntryAndRemaining(entry, remaining)
    map.set(id, amount)
    remaining = roundMoney2(Math.max(0, remaining - amount))
  }
  return map
}

function remainingPoolBeforeOrgUnit(
  orgUnits: OrgUnitRef[],
  customByOrgUnitId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number,
  beforeOrgUnitId: string,
  inputOrder: readonly string[]
): number {
  const orderedIds = buildWaterfallOrgUnitIds(orgUnits, inputOrder)
  let remaining = pool > 0 ? pool : 0
  for (const id of orderedIds) {
    if (id === beforeOrgUnitId) {
      return remaining
    }
    const entry = customByOrgUnitId[id] ?? defaultOrgUnitCustomBudgetInput()
    const amount = allocationFromEntryAndRemaining(entry, remaining)
    remaining = roundMoney2(Math.max(0, remaining - amount))
  }
  return remaining
}

export function useBudgetDistributionCustomBudgetMaps(
  companyId: string,
  selectedMethod: DistributionMethod,
  salaryIncreasePool: number | null,
  distributionOrgUnitsForList: OrgUnitRef[]
) {
  const [state, setState] = useState<BudgetDistributionCustomState>(initialCustomState)

  const orgUnitIdSet = useMemo(() => new Set(distributionOrgUnitsForList.map(u => u.id)), [distributionOrgUnitsForList])

  useEffect(() => {
    setState(initialCustomState)
  }, [companyId])

  useEffect(() => {
    if (selectedMethod !== 'custom') {
      setState(initialCustomState)
    }
  }, [selectedMethod])

  const previewCustomAllocationByOrgUnit = useMemo(() => {
    if (selectedMethod !== 'custom') {
      return null
    }
    const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : 0
    return buildCustomAllocationMap(distributionOrgUnitsForList, state.byId, pool, state.inputOrder)
  }, [selectedMethod, state.byId, state.inputOrder, distributionOrgUnitsForList, salaryIncreasePool])

  /**
   * Sum of amount-mode inputs (parsed) — can exceed the pool; preview allocation is still capped per waterfall.
   * Used for over-budget warnings in KPIs and alerts.
   */
  const customAmountModeRawTotalRequested = useMemo(() => {
    if (selectedMethod !== 'custom') {
      return null
    }
    if (salaryIncreasePool == null || salaryIncreasePool <= 0) {
      return null
    }
    let sum = 0
    for (const u of distributionOrgUnitsForList) {
      const entry = state.byId[u.id] ?? defaultOrgUnitCustomBudgetInput()
      if (entry.mode !== 'amount' || entry.amountRaw.trim() === '') {
        continue
      }
      sum += parseCustomAmountInput(entry.amountRaw)
    }
    return roundMoney2(sum)
  }, [distributionOrgUnitsForList, salaryIncreasePool, selectedMethod, state.byId])

  const customAmountRequestExceedsPool = useMemo(
    () =>
      customAmountModeRawTotalRequested != null &&
      salaryIncreasePool != null &&
      salaryIncreasePool > 0 &&
      customAmountModeRawTotalRequested > salaryIncreasePool + 0.01,
    [customAmountModeRawTotalRequested, salaryIncreasePool]
  )

  const customOverPoolAmount = useMemo(
    () =>
      customAmountRequestExceedsPool && customAmountModeRawTotalRequested != null && salaryIncreasePool != null
        ? roundMoney2(customAmountModeRawTotalRequested - salaryIncreasePool)
        : null,
    [customAmountModeRawTotalRequested, customAmountRequestExceedsPool, salaryIncreasePool]
  )

  const handleCustomAmountRawChange = useCallback(
    (orgUnitId: string, value: string) => {
      setState(prev => {
        const cur = prev.byId[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
        const nextEntry = { ...cur, amountRaw: value }
        const nextById = { ...prev.byId, [orgUnitId]: nextEntry }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, orgUnitId, nextEntry, orgUnitIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [orgUnitIdSet]
  )

  const handleCustomPercentRawChange = useCallback(
    (orgUnitId: string, value: string) => {
      setState(prev => {
        const cur = prev.byId[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
        const nextEntry = { ...cur, percentRaw: value }
        const nextById = { ...prev.byId, [orgUnitId]: nextEntry }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, orgUnitId, nextEntry, orgUnitIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [orgUnitIdSet]
  )

  const clearCustomBudgetInputs = useCallback(() => {
    setState(initialCustomState)
  }, [])

  const handleCustomModeChange = useCallback(
    (orgUnitId: string, mode: CustomBudgetInputMode) => {
      const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : null
      setState(prev => {
        const cur = prev.byId[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
        if (cur.mode === mode) {
          return prev
        }
        let next: OrgUnitCustomBudgetInput = { ...cur, mode }
        if (pool != null) {
          const remainingForRow = remainingPoolBeforeOrgUnit(
            distributionOrgUnitsForList,
            prev.byId,
            pool,
            orgUnitId,
            prev.inputOrder
          )
          if (remainingForRow > 0) {
            if (mode === 'percent') {
              const amt = parseCustomAmountInput(cur.amountRaw)
              if (amt > 0) {
                next = { ...next, percentRaw: String(roundMoney2((amt / remainingForRow) * 100)) }
              }
            } else {
              const pct = parseCustomPercentInput(cur.percentRaw)
              if (pct > 0) {
                next = { ...next, amountRaw: String(roundMoney2((remainingForRow * pct) / 100)) }
              }
            }
          }
        }
        const nextById = { ...prev.byId, [orgUnitId]: next }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, orgUnitId, next, orgUnitIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [salaryIncreasePool, distributionOrgUnitsForList, orgUnitIdSet]
  )

  return {
    customBudgetByOrgUnitId: state.byId,
    previewCustomAllocationByOrgUnit,
    customAmountModeRawTotalRequested,
    customAmountRequestExceedsPool,
    customOverPoolAmount,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange,
    clearCustomBudgetInputs
  }
}
