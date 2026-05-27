import { useCallback, useEffect, useMemo, useState } from 'react'

import type { DistributionMethod } from '../../../types/compensationPlanningTypes'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../planning/components/views/budgetDistributionCustomTypes'
import { defaultOrgUnitCustomBudgetInput } from '../../planning/components/views/budgetDistributionCustomTypes'
import {
  parseCustomAmountInput,
  parseCustomPercentInput,
  roundMoney2
} from '../../planning/utils/parseCustomBudgetInputs'

interface EmployeeRef {
  id: string
}

interface ManagerCustomBudgetState {
  byId: Record<string, OrgUnitCustomBudgetInput>
  /** Employee ids in the order the user first entered a non-empty amount or percent (waterfall priority). */
  inputOrder: string[]
}

const initialManagerCustomState: ManagerCustomBudgetState = {
  byId: {},
  inputOrder: []
}

function isMeaningfulEntry(entry: OrgUnitCustomBudgetInput): boolean {
  return entry.amountRaw.trim() !== '' || entry.percentRaw.trim() !== ''
}

/** Rows with input first (edit order), then any other team members in table order (typically 0 until edited). */
function buildWaterfallEmployeeIds(employees: EmployeeRef[], inputOrder: readonly string[]): string[] {
  const idSet = new Set(employees.map(e => e.id))
  const ordered: string[] = []
  const seen = new Set<string>()
  for (const id of inputOrder) {
    if (idSet.has(id) && !seen.has(id)) {
      ordered.push(id)
      seen.add(id)
    }
  }
  for (const e of employees) {
    if (!seen.has(e.id)) {
      ordered.push(e.id)
      seen.add(e.id)
    }
  }
  return ordered
}

function updateInputOrderAfterEntryChange(
  prevOrder: string[],
  employeeId: string,
  nextEntry: OrgUnitCustomBudgetInput,
  teamIds: Set<string>
): string[] {
  const order = prevOrder.filter(id => teamIds.has(id))
  if (!isMeaningfulEntry(nextEntry)) {
    return order.filter(id => id !== employeeId)
  }
  if (order.includes(employeeId)) {
    return order
  }
  return [...order, employeeId]
}

/** One row’s allocation from the current remaining pool (manager custom: waterfall / sequential). */
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
  employees: EmployeeRef[],
  customByEmployeeId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number,
  inputOrder: readonly string[]
): Map<string, number> {
  const orderedIds = buildWaterfallEmployeeIds(employees, inputOrder)
  const map = new Map<string, number>()
  let remaining = pool > 0 ? pool : 0
  for (const id of orderedIds) {
    const entry = customByEmployeeId[id] ?? defaultOrgUnitCustomBudgetInput()
    const amount = allocationFromEntryAndRemaining(entry, remaining)
    map.set(id, amount)
    remaining = roundMoney2(Math.max(0, remaining - amount))
  }
  return map
}

function remainingPoolBeforeEmployee(
  employees: EmployeeRef[],
  customByEmployeeId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number,
  beforeEmployeeId: string,
  inputOrder: readonly string[]
): number {
  const orderedIds = buildWaterfallEmployeeIds(employees, inputOrder)
  let remaining = pool > 0 ? pool : 0
  for (const id of orderedIds) {
    if (id === beforeEmployeeId) {
      return remaining
    }
    const entry = customByEmployeeId[id] ?? defaultOrgUnitCustomBudgetInput()
    const amount = allocationFromEntryAndRemaining(entry, remaining)
    remaining = roundMoney2(Math.max(0, remaining - amount))
  }
  return remaining
}

export function useManagerTeamEmployeeCustomBudgetMaps(
  companyId: string | null,
  selectedMethod: DistributionMethod,
  salaryIncreasePool: number | null,
  distributionEmployeesForList: EmployeeRef[]
) {
  const [state, setState] = useState<ManagerCustomBudgetState>(initialManagerCustomState)

  const teamIdSet = useMemo(() => new Set(distributionEmployeesForList.map(e => e.id)), [distributionEmployeesForList])

  useEffect(() => {
    setState(initialManagerCustomState)
  }, [companyId])

  useEffect(() => {
    if (selectedMethod !== 'custom') {
      setState(initialManagerCustomState)
    }
  }, [selectedMethod])

  const previewCustomAllocationByEmployeeId = useMemo(() => {
    if (selectedMethod !== 'custom') {
      return null
    }
    const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : 0
    return buildCustomAllocationMap(distributionEmployeesForList, state.byId, pool, state.inputOrder)
  }, [selectedMethod, state.byId, state.inputOrder, distributionEmployeesForList, salaryIncreasePool])

  const handleCustomAmountRawChange = useCallback(
    (employeeId: string, value: string) => {
      setState(prev => {
        const cur = prev.byId[employeeId] ?? defaultOrgUnitCustomBudgetInput()
        const nextEntry = { ...cur, amountRaw: value }
        const nextById = { ...prev.byId, [employeeId]: nextEntry }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, employeeId, nextEntry, teamIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [teamIdSet]
  )

  const handleCustomPercentRawChange = useCallback(
    (employeeId: string, value: string) => {
      setState(prev => {
        const cur = prev.byId[employeeId] ?? defaultOrgUnitCustomBudgetInput()
        const nextEntry = { ...cur, percentRaw: value }
        const nextById = { ...prev.byId, [employeeId]: nextEntry }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, employeeId, nextEntry, teamIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [teamIdSet]
  )

  const handleCustomModeChange = useCallback(
    (employeeId: string, mode: CustomBudgetInputMode) => {
      const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : null
      setState(prev => {
        const cur = prev.byId[employeeId] ?? defaultOrgUnitCustomBudgetInput()
        if (cur.mode === mode) {
          return prev
        }
        let next: OrgUnitCustomBudgetInput = { ...cur, mode }
        if (pool != null) {
          const remainingForRow = remainingPoolBeforeEmployee(
            distributionEmployeesForList,
            prev.byId,
            pool,
            employeeId,
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
        const nextById = { ...prev.byId, [employeeId]: next }
        const nextOrder = updateInputOrderAfterEntryChange(prev.inputOrder, employeeId, next, teamIdSet)
        return { byId: nextById, inputOrder: nextOrder }
      })
    },
    [salaryIncreasePool, distributionEmployeesForList, teamIdSet]
  )

  return {
    customBudgetByEmployeeId: state.byId,
    previewCustomAllocationByEmployeeId,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange
  }
}
