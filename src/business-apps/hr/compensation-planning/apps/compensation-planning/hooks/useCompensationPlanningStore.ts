import { create } from 'zustand'

interface CompensationPlanningState {
  selectedCompanyId: string | null
  activeTab: string
  /** Selected compensation budget plan (`compensation_budget_plan`) for budget setup / downstream tabs. */
  selectedBudgetPlanId: string | null
  /**
   * Selected `compensation_budget_plan_company` row for Budget distribution (org unit table).
   * Only plans that exist in Budget setup for the current company appear in the selector.
   */
  selectedDistributionCompanyBudgetId: string | null

  selectCompany: (companyId: string | null) => void
  setActiveTab: (tab: string) => void
  setSelectedBudgetPlanId: (planId: string | null) => void
  setSelectedDistributionCompanyBudgetId: (id: string | null) => void
}

export const useCompensationPlanningStore = create<CompensationPlanningState>(set => ({
  selectedCompanyId: null,
  activeTab: 'overview',
  selectedBudgetPlanId: null,
  selectedDistributionCompanyBudgetId: null,

  selectCompany: companyId => set({ selectedCompanyId: companyId }),
  setActiveTab: tab => set({ activeTab: tab }),
  setSelectedBudgetPlanId: planId => set({ selectedBudgetPlanId: planId }),
  setSelectedDistributionCompanyBudgetId: id => set({ selectedDistributionCompanyBudgetId: id })
}))
