import { useCallback, useEffect, useMemo, useState } from 'react'

import type { DistributionMethod } from '../../../types/compensationPlanningTypes'
import type {
  CustomBudgetInputMode,
  OrgUnitCustomBudgetInput
} from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import { defaultOrgUnitCustomBudgetInput } from '../../compensation-planning/components/views/budgetDistributionCustomTypes'
import {
  parseCustomAmountInput,
  parseCustomPercentInput,
  roundMoney2
} from '../../compensation-planning/utils/parseCustomBudgetInputs'

interface EmployeeRef {
  id: string
}

function buildCustomAllocationMap(
  employees: EmployeeRef[],
  customByEmployeeId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number
): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of employees) {
    const entry = customByEmployeeId[e.id] ?? defaultOrgUnitCustomBudgetInput()
    let amount = 0
    if (entry.mode === 'percent') {
      if (pool > 0) {
        const pct = parseCustomPercentInput(entry.percentRaw)
        amount = roundMoney2((pool * pct) / 100)
      }
    } else {
      amount = parseCustomAmountInput(entry.amountRaw)
    }
    map.set(e.id, amount)
  }
  return map
}

export function useManagerTeamEmployeeCustomBudgetMaps(
  companyId: string | null,
  selectedMethod: DistributionMethod,
  salaryIncreasePool: number | null,
  distributionEmployeesForList: EmployeeRef[]
) {
  const [customBudgetByEmployeeId, setCustomBudgetByEmployeeId] = useState<Record<string, OrgUnitCustomBudgetInput>>({})

  useEffect(() => {
    setCustomBudgetByEmployeeId({})
  }, [companyId])

  useEffect(() => {
    if (selectedMethod !== 'custom') {
      setCustomBudgetByEmployeeId({})
    }
  }, [selectedMethod])

  const previewCustomAllocationByEmployeeId = useMemo(() => {
    if (selectedMethod !== 'custom') {
      return null
    }
    const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : 0
    return buildCustomAllocationMap(distributionEmployeesForList, customBudgetByEmployeeId, pool)
  }, [selectedMethod, customBudgetByEmployeeId, distributionEmployeesForList, salaryIncreasePool])

  const handleCustomAmountRawChange = useCallback((employeeId: string, value: string) => {
    setCustomBudgetByEmployeeId(prev => {
      const cur = prev[employeeId] ?? defaultOrgUnitCustomBudgetInput()
      return { ...prev, [employeeId]: { ...cur, amountRaw: value } }
    })
  }, [])

  const handleCustomPercentRawChange = useCallback((employeeId: string, value: string) => {
    setCustomBudgetByEmployeeId(prev => {
      const cur = prev[employeeId] ?? defaultOrgUnitCustomBudgetInput()
      return { ...prev, [employeeId]: { ...cur, percentRaw: value } }
    })
  }, [])

  const handleCustomModeChange = useCallback(
    (employeeId: string, mode: CustomBudgetInputMode) => {
      const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : null
      setCustomBudgetByEmployeeId(prev => {
        const cur = prev[employeeId] ?? defaultOrgUnitCustomBudgetInput()
        if (cur.mode === mode) {
          return prev
        }
        let next: OrgUnitCustomBudgetInput = { ...cur, mode }
        if (pool != null) {
          if (mode === 'percent') {
            const amt = parseCustomAmountInput(cur.amountRaw)
            if (amt > 0) {
              next = { ...next, percentRaw: String(roundMoney2((amt / pool) * 100)) }
            }
          } else {
            const pct = parseCustomPercentInput(cur.percentRaw)
            if (pct > 0) {
              next = { ...next, amountRaw: String(roundMoney2((pool * pct) / 100)) }
            }
          }
        }
        return { ...prev, [employeeId]: next }
      })
    },
    [salaryIncreasePool]
  )

  return {
    customBudgetByEmployeeId,
    previewCustomAllocationByEmployeeId,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange
  }
}
