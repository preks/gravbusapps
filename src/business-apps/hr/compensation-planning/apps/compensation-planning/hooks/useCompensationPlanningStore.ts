import { create } from 'zustand'

interface CompensationPlanningState {
  selectedCompanyId: string | null
  activeTab: string

  selectCompany: (companyId: string | null) => void
  setActiveTab: (tab: string) => void
}

export const useCompensationPlanningStore = create<CompensationPlanningState>(set => ({
  selectedCompanyId: null,
  activeTab: 'overview',

  selectCompany: companyId => set({ selectedCompanyId: companyId }),
  setActiveTab: tab => set({ activeTab: tab })
}))
