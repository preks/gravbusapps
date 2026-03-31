import { create } from 'zustand'
import type { PayrollCountry, PayrollRun } from '../types/payrollTypes'

interface PayrollRunStoreState {
  selectedCompanyId: string | null
  selectedCompanyName: string | null
  detectedCountry: PayrollCountry | null
  activeRun: PayrollRun | null

  setCompany: (companyId: string, companyName: string) => void
  setDetectedCountry: (country: PayrollCountry | null) => void
  setActiveRun: (run: PayrollRun | null) => void
  reset: () => void
}

export const usePayrollRunStore = create<PayrollRunStoreState>(set => ({
  selectedCompanyId: null,
  selectedCompanyName: null,
  detectedCountry: null,
  activeRun: null,

  setCompany: (companyId, companyName) => {
    set({ selectedCompanyId: companyId, selectedCompanyName: companyName, activeRun: null })
  },

  setDetectedCountry: country => {
    set({ detectedCountry: country })
  },

  setActiveRun: run => {
    set({ activeRun: run })
  },

  reset: () => {
    set({
      selectedCompanyId: null,
      selectedCompanyName: null,
      detectedCountry: null,
      activeRun: null
    })
  }
}))
