import { create } from 'zustand'

import type { DistributionMethod } from '../../../types/compensationPlanningTypes'

/** Field names passed to SortableTableHead (must match compare keys in useTeamMembersPipeline) */
export type ManagerTeamSortField =
  | 'displayName'
  | 'hireDate'
  | 'currentAnnualSalary'
  | 'compaRatio'
  | 'lastRaiseDate'
  | 'currentBonusTotal'

type SortDirection = 'asc' | 'desc'

/** Sidebar filter ids: `employee:{uuid}` only (ranges use dedicated state). */
interface ManagerPlanningState {
  searchQuery: string
  sortField: ManagerTeamSortField
  sortDirection: SortDirection
  selectedCompanyId: string | null
  sidebarFilterIds: string[]
  /** Annual salary lower bound (inclusive); null = no minimum. */
  filterSalaryMin: number | null
  /** Annual salary upper bound (inclusive); null = no maximum. */
  filterSalaryMax: number | null
  /** Last raise date range (ISO YYYY-MM-DD); null = open bound. */
  filterLastRaiseFrom: string | null
  filterLastRaiseTo: string | null
  currentPage: number
  pageSize: number
  /** Salary increase pool preview split method (manager team distribution UI). */
  distributionMethod: DistributionMethod

  setSearchQuery: (query: string) => void
  setSortFromTable: (field: string, order: 'ASC' | 'DESC' | '') => void
  setSelectedCompanyId: (id: string | null) => void
  toggleSidebarFilter: (filterId: string, selected: boolean) => void
  /** Replaces all `employee:{id}` entries; keeps other sidebar ids (future use). */
  setEmployeeSidebarFilters: (employeeIds: string[]) => void
  setSalaryFilterRange: (min: number | null, max: number | null) => void
  setLastRaiseFilterRange: (from: string | null, to: string | null) => void
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
  setDistributionMethod: (method: DistributionMethod) => void
  resetTableUi: () => void
}

const DEFAULT_SORT_FIELD: ManagerTeamSortField = 'displayName'
const DEFAULT_SORT_DIR: SortDirection = 'asc'
const DEFAULT_DISTRIBUTION_METHOD: DistributionMethod = 'proportional_salary_cost'

export const useManagerPlanningStore = create<ManagerPlanningState>(set => ({
  searchQuery: '',
  sortField: DEFAULT_SORT_FIELD,
  sortDirection: DEFAULT_SORT_DIR,
  selectedCompanyId: null,
  sidebarFilterIds: [],
  currentPage: 1,
  pageSize: 10,
  distributionMethod: DEFAULT_DISTRIBUTION_METHOD,

  setSearchQuery: query => set({ searchQuery: query, currentPage: 1 }),

  setSortFromTable: (field, order) => {
    if (order === '') {
      set({ sortField: DEFAULT_SORT_FIELD, sortDirection: DEFAULT_SORT_DIR, currentPage: 1 })
      return
    }
    const validFields: ManagerTeamSortField[] = [
      'displayName',
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
      currentPage: 1,
      sidebarFilterIds: [],
      filterSalaryMin: null,
      filterSalaryMax: null,
      filterLastRaiseFrom: null,
      filterLastRaiseTo: null,
      searchQuery: '',
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIR,
      pageSize: 10,
      distributionMethod: DEFAULT_DISTRIBUTION_METHOD
    }),

  toggleSidebarFilter: (filterId, selected) =>
    set(state => {
      let next = [...state.sidebarFilterIds]
      if (selected) {
        if (!next.includes(filterId)) next = [...next, filterId]
      } else {
        next = next.filter(sid => sid !== filterId)
      }
      return { sidebarFilterIds: next, currentPage: 1 }
    }),

  setEmployeeSidebarFilters: employeeIds =>
    set(state => ({
      sidebarFilterIds: [
        ...state.sidebarFilterIds.filter(id => !id.startsWith('employee:')),
        ...employeeIds.map(id => `employee:${id}`)
      ],
      currentPage: 1
    })),

  setSalaryFilterRange: (min, max) => set({ filterSalaryMin: min, filterSalaryMax: max, currentPage: 1 }),

  setLastRaiseFilterRange: (from, to) => set({ filterLastRaiseFrom: from, filterLastRaiseTo: to, currentPage: 1 }),

  setCurrentPage: page => set({ currentPage: page }),

  /** Only resets to page 1 when the size actually changes (same size must not clear a page navigation). */
  setPageSize: size =>
    set(state => {
      if (state.pageSize === size) {
        return state
      }
      return { pageSize: size, currentPage: 1 }
    }),

  setDistributionMethod: method => set({ distributionMethod: method }),

  resetTableUi: () =>
    set({
      searchQuery: '',
      sortField: DEFAULT_SORT_FIELD,
      sortDirection: DEFAULT_SORT_DIR,
      sidebarFilterIds: [],
      filterSalaryMin: null,
      filterSalaryMax: null,
      filterLastRaiseFrom: null,
      filterLastRaiseTo: null,
      currentPage: 1,
      pageSize: 10,
      distributionMethod: DEFAULT_DISTRIBUTION_METHOD
    })
}))
