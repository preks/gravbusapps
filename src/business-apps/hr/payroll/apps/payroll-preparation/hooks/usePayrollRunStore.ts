import { create } from 'zustand'
import type { PayrollCountry } from '../types/payrollTypes'

interface PayrollRunStoreState {
  selectedCompanyId: string | null
  selectedCompanyName: string | null
  selectedMonth: number
  selectedYear: number
  detectedCountry: PayrollCountry | null

  setCompany: (companyId: string, companyName: string) => void
  setMonth: (month: number, year: number) => void
  setDetectedCountry: (country: PayrollCountry | null) => void
  reset: () => void
}

const currentMonth = new Date().getMonth() + 1
const currentYear = new Date().getFullYear()

export const usePayrollRunStore = create<PayrollRunStoreState>(set => ({
  selectedCompanyId: null,
  selectedCompanyName: null,
  selectedMonth: currentMonth,
  selectedYear: currentYear,
  detectedCountry: null,

  setCompany: (companyId, companyName) => {
    set({ selectedCompanyId: companyId, selectedCompanyName: companyName })
  },

  setMonth: (month, year) => {
    set({ selectedMonth: month, selectedYear: year })
  },

  setDetectedCountry: country => {
    set({ detectedCountry: country })
  },

  reset: () => {
    set({
      selectedCompanyId: null,
      selectedCompanyName: null,
      selectedMonth: currentMonth,
      selectedYear: currentYear,
      detectedCountry: null
    })
  }
}))
