import { create } from 'zustand'

type SortField = 'name' | 'salary' | 'compaRatio' | 'performance' | 'tenure' | 'lastRaise'
type SortDirection = 'asc' | 'desc'

interface ManagerPlanningState {
  searchQuery: string
  sortField: SortField
  sortDirection: SortDirection
  selectedCompanyId: string | null
  selectedOrgUnitId: string | null

  setSearchQuery: (query: string) => void
  setSorting: (field: SortField) => void
  setSelectedCompanyId: (id: string | null) => void
  setSelectedOrgUnitId: (id: string | null) => void
}

export const useManagerPlanningStore = create<ManagerPlanningState>((set, get) => ({
  searchQuery: '',
  sortField: 'name',
  sortDirection: 'asc',
  selectedCompanyId: null,
  selectedOrgUnitId: null,

  setSearchQuery: query => set({ searchQuery: query }),

  setSorting: field => {
    const { sortField, sortDirection } = get()
    if (sortField === field) {
      set({ sortDirection: sortDirection === 'asc' ? 'desc' : 'asc' })
    } else {
      set({ sortField: field, sortDirection: 'asc' })
    }
  },

  setSelectedCompanyId: id => set({ selectedCompanyId: id, selectedOrgUnitId: null }),
  setSelectedOrgUnitId: id => set({ selectedOrgUnitId: id })
}))
