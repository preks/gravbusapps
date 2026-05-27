import { create } from 'zustand'
import type { DistributionMethod } from '../../../types/compensationPlanningTypes'

interface BudgetDistributionViewState {
  selectedMethod: DistributionMethod
  setDistributionMethod: (method: DistributionMethod) => void
}

export const useBudgetDistributionViewStore = create<BudgetDistributionViewState>(set => ({
  selectedMethod: 'proportional_headcount',
  setDistributionMethod: method => set({ selectedMethod: method })
}))
