import { create } from 'zustand'

interface CompensationPlanningState {
  selectedCompanyId: string | null
  activeTab: string
  /** Selected compensation budget plan (`compensation_budget_plan`) for budget setup / downstream tabs. */
  selectedBudgetPlanId: string | null

  selectCompany: (companyId: string | null) => void
  setActiveTab: (tab: string) => void
  setSelectedBudgetPlanId: (planId: string | null) => void
}

export const useCompensationPlanningStore = create<CompensationPlanningState>(set => ({
  selectedCompanyId: null,
  activeTab: 'overview',
  selectedBudgetPlanId: null,

  selectCompany: companyId => set({ selectedCompanyId: companyId }),
  setActiveTab: tab => set({ activeTab: tab }),
  setSelectedBudgetPlanId: planId => set({ selectedBudgetPlanId: planId })
}))
