import { create } from 'zustand'

/** Field names passed to SortableTableHead (must match compare keys in useTeamMembersPipeline) */
export type ManagerTeamSortField =
  | 'displayName'
  | 'jobLevel'
  | 'hireDate'
  | 'currentAnnualSalary'
  | 'compaRatio'
  | 'lastRaiseDate'
  | 'currentBonusTotal'

type SortDirection = 'asc' | 'desc'

/** Sidebar filter ids: `employee:{uuid}`, `level:{name}`, `salary:with` | `salary:without` (salary mutually exclusive). */
interface ManagerPlanningState {
  searchQuery: string
  sortField: ManagerTeamSortField
  sortDirection: SortDirection
  selectedCompanyId: string | null
  sidebarFilterIds: string[]
  currentPage: number
  pageSize: number

  setSearchQuery: (query: string) => void
  setSortFromTable: (field: string, order: 'ASC' | 'DESC' | '') => void
  setSelectedCompanyId: (id: string | null) => void
  setSelectedOrgUnitId: (id: string | null) => void
  toggleSidebarFilter: (filterId: string, selected: boolean) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  resetTableUi: () => void
}

const DEFAULT_SORT_FIELD: ManagerTeamSortField = 'displayName'
const DEFAULT_SORT_DIR: SortDirection = 'asc'

export const useManagerPlanningStore = create<ManagerPlanningState>(set => ({
  searchQuery: '',
  sortField: DEFAULT_SORT_FIELD,
  sortDirection: DEFAULT_SORT_DIR,
  selectedCompanyId: null,
  sidebarFilterIds: [],
  currentPage: 1,
  pageSize: 10,

  setSearchQuery: query => set({ searchQuery: query, currentPage: 1 }),

  setSortFromTable: (field, order) => {
    if (order === '') {
      set({ sortField: DEFAULT_SORT_FIELD, sortDirection: DEFAULT_SORT_DIR, currentPage: 1 })
      return
    }
    const validFields: ManagerTeamSortField[] = [
      'displayName',
      'jobLevel',
      'hireDate',
      'currentAnnualSalary',
      'compaRatio',
      'lastRaiseDate',
      'currentBonusTotal'
    ]
    const nextField = (
      validFields.includes(field as ManagerTeamSortField) ? field : DEFAULT_SORT_FIELD
    ) as ManagerTeamSortField
    set({
      sortField: nextField,
      sortDirection: order === 'ASC' ? 'asc' : 'desc',
      currentPage: 1
    })
  },

  setSelectedCompanyId: id =>
    set({
      selectedCompanyId: id,
      selectedOrgUnitId: null,
      currentPage: 1,
      sidebarFilterIds: [],
      searchQuery: '',
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIR,
      pageSize: 10
    }),

  toggleSidebarFilter: (filterId, selected) =>
    set(state => {
      let next = [...state.sidebarFilterIds]
      if (filterId.startsWith('salary:')) {
        next = next.filter(sid => !sid.startsWith('salary:'))
        if (selected) next.push(filterId)
      } else if (selected) {
        if (!next.includes(filterId)) next = [...next, filterId]
      } else {
        next = next.filter(sid => sid !== filterId)
      }
      return { sidebarFilterIds: next, currentPage: 1 }
    }),

  setCurrentPage: page => set({ currentPage: page }),

  setPageSize: size => set({ pageSize: size, currentPage: 1 }),

  resetTableUi: () =>
    set({
      searchQuery: '',
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIR,
      sidebarFilterIds: [],
      currentPage: 1,
      pageSize: 10
    })
}))
