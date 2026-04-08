import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DistributionMethod } from '../../../types/compensationPlanningTypes'
import { parseCustomAmountInput, parseCustomPercentInput, roundMoney2 } from '../utils/parseCustomBudgetInputs'
import type { CustomBudgetInputMode, OrgUnitCustomBudgetInput } from '../components/views/budgetDistributionCustomTypes'
import { defaultOrgUnitCustomBudgetInput } from '../components/views/budgetDistributionCustomTypes'

interface OrgUnitRef {
  id: string
}

function buildCustomAllocationMap(
  orgUnits: OrgUnitRef[],
  customByOrgId: Record<string, OrgUnitCustomBudgetInput>,
  pool: number
): Map<string, number> {
  const map = new Map<string, number>()
  for (const u of orgUnits) {
    const entry = customByOrgId[u.id] ?? defaultOrgUnitCustomBudgetInput()
    let amount = 0
    if (entry.mode === 'percent') {
      if (pool > 0) {
        const pct = parseCustomPercentInput(entry.percentRaw)
        amount = roundMoney2((pool * pct) / 100)
      }
    } else {
      amount = parseCustomAmountInput(entry.amountRaw)
    }
    map.set(u.id, amount)
  }
  return map
}

export function useBudgetDistributionCustomBudgetMaps(
  companyId: string,
  selectedMethod: DistributionMethod,
  salaryIncreasePool: number | null,
  distributionOrgUnitsForList: OrgUnitRef[]
) {
  const [customBudgetByOrgUnitId, setCustomBudgetByOrgUnitId] = useState<Record<string, OrgUnitCustomBudgetInput>>({})

  useEffect(() => {
    setCustomBudgetByOrgUnitId({})
  }, [companyId])

  useEffect(() => {
    if (selectedMethod !== 'custom') {
      setCustomBudgetByOrgUnitId({})
    }
  }, [selectedMethod])

  const previewCustomAllocationByOrgUnit = useMemo(() => {
    if (selectedMethod !== 'custom') {
      return null
    }
    const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : 0
    return buildCustomAllocationMap(distributionOrgUnitsForList, customBudgetByOrgUnitId, pool)
  }, [selectedMethod, customBudgetByOrgUnitId, distributionOrgUnitsForList, salaryIncreasePool])

  const handleCustomAmountRawChange = useCallback((orgUnitId: string, value: string) => {
    setCustomBudgetByOrgUnitId(prev => {
      const cur = prev[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
      return { ...prev, [orgUnitId]: { ...cur, amountRaw: value } }
    })
  }, [])

  const handleCustomPercentRawChange = useCallback((orgUnitId: string, value: string) => {
    setCustomBudgetByOrgUnitId(prev => {
      const cur = prev[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
      return { ...prev, [orgUnitId]: { ...cur, percentRaw: value } }
    })
  }, [])

  const handleCustomModeChange = useCallback(
    (orgUnitId: string, mode: CustomBudgetInputMode) => {
      const pool = salaryIncreasePool != null && salaryIncreasePool > 0 ? salaryIncreasePool : null
      setCustomBudgetByOrgUnitId(prev => {
        const cur = prev[orgUnitId] ?? defaultOrgUnitCustomBudgetInput()
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
        return { ...prev, [orgUnitId]: next }
      })
    },
    [salaryIncreasePool]
  )

  return {
    customBudgetByOrgUnitId,
    previewCustomAllocationByOrgUnit,
    handleCustomAmountRawChange,
    handleCustomPercentRawChange,
    handleCustomModeChange
  }
}
