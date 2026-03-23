import { create } from 'zustand'
import type { DistributionMethod } from '../../../types/compensationPlanningTypes'

interface BudgetDistributionState {
  selectedCompanyId: string | null
  selectedMethod: DistributionMethod

  setSelectedCompanyId: (id: string | null) => void
  setDistributionMethod: (method: DistributionMethod) => void
}

export const useBudgetDistributionStore = create<BudgetDistributionState>(set => ({
  selectedCompanyId: null,
  selectedMethod: 'proportional_headcount',

  setSelectedCompanyId: id => set({ selectedCompanyId: id }),
  setDistributionMethod: method => set({ selectedMethod: method })
}))
