import { useMemo } from 'react'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import type { ManagerTeamSortField } from './useManagerPlanningStore'

function sortLocale(): string | undefined {
  if (typeof globalThis.window === 'undefined') return undefined
  try {
    return getCurrentActiveUserLocale()
  } catch {
    return undefined
  }
}

function compare(
  a: TeamMemberCompensationData,
  b: TeamMemberCompensationData,
  field: ManagerTeamSortField,
  direction: 'asc' | 'desc'
): number {
  const mul = direction === 'asc' ? 1 : -1

  const str = (x: string | null | undefined) => (x ?? '').toLowerCase()

  const cmpNumNullsLast = (na: number | null | undefined, nb: number | null | undefined) => {
    const aNull = na == null || Number.isNaN(na)
    const bNull = nb == null || Number.isNaN(nb)
    if (aNull && bNull) return 0
    if (aNull) return 1
    if (bNull) return -1
    return mul * (na! - nb!)
  }

  const loc = sortLocale()

  switch (field) {
    case 'displayName':
      return mul * a.displayName.localeCompare(b.displayName, loc, { sensitivity: 'base' })
    case 'jobLevel':
      return mul * str(a.jobLevel).localeCompare(str(b.jobLevel), loc, { sensitivity: 'base' })
    case 'hireDate': {
      const ta = a.hireDate ? new Date(a.hireDate).getTime() : NaN
      const tb = b.hireDate ? new Date(b.hireDate).getTime() : NaN
      return cmpNumNullsLast(ta, tb)
    }
    case 'currentAnnualSalary':
      return cmpNumNullsLast(a.currentAnnualSalary, b.currentAnnualSalary)
    case 'compaRatio':
      return cmpNumNullsLast(a.compaRatio, b.compaRatio)
    case 'lastRaiseDate': {
      const la = a.lastRaiseDate ? new Date(a.lastRaiseDate).getTime() : NaN
      const lb = b.lastRaiseDate ? new Date(b.lastRaiseDate).getTime() : NaN
      return cmpNumNullsLast(la, lb)
    }
    case 'currentBonusTotal':
      return cmpNumNullsLast(a.currentBonusTotal, b.currentBonusTotal)
    default:
      return 0
  }
}

export interface TeamPipelineParams {
  members: TeamMemberCompensationData[]
  searchQuery: string
  /** `employee:{id}` */
  sidebarFilterIds: string[]
  filterSalaryMin: number | null
  filterSalaryMax: number | null
  filterLastRaiseFrom: string | null
  filterLastRaiseTo: string | null
  sortField: ManagerTeamSortField
  sortDirection: 'asc' | 'desc'
  currentPage: number
  pageSize: number
}

export interface TeamPipelineResult {
  /** After search + filters + sort (full list) */
  filteredSorted: TeamMemberCompensationData[]
  /** Current page slice */
  pageRows: TeamMemberCompensationData[]
  totalFiltered: number
}

function parseSidebarFilterIds(ids: string[]): { employeeIds: Set<string> } {
  const employeeIds = new Set<string>()
  for (const id of ids) {
    if (id.startsWith('employee:')) {
      employeeIds.add(id.slice('employee:'.length))
    }
  }
  return { employeeIds }
}

function lastRaiseDateOnly(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

export function useTeamMembersPipeline(params: TeamPipelineParams): TeamPipelineResult {
  const {
    members,
    searchQuery,
    sidebarFilterIds,
    filterSalaryMin,
    filterSalaryMax,
    filterLastRaiseFrom,
    filterLastRaiseTo,
    sortField,
    sortDirection,
    currentPage,
    pageSize
  } = params

  return useMemo(() => {
    let rows = [...members]

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      rows = rows.filter(
        m =>
          m.displayName.toLowerCase().includes(q) ||
          m.employeeCode.toLowerCase().includes(q) ||
          (m.jobPosition?.toLowerCase().includes(q) ?? false) ||
          (m.jobLevel?.toLowerCase().includes(q) ?? false)
      )
    }

    const { employeeIds } = parseSidebarFilterIds(sidebarFilterIds)

    if (employeeIds.size > 0) {
      rows = rows.filter(m => employeeIds.has(m.employeeId))
    }

    let salMin = filterSalaryMin
    let salMax = filterSalaryMax
    if (salMin != null && salMax != null && salMin > salMax) {
      ;[salMin, salMax] = [salMax, salMin]
    }

    if (salMin != null) {
      const lo = salMin
      rows = rows.filter(
        m => m.currentAnnualSalary != null && !Number.isNaN(m.currentAnnualSalary) && m.currentAnnualSalary >= lo
      )
    }
    if (salMax != null) {
      const hi = salMax
      rows = rows.filter(
        m => m.currentAnnualSalary != null && !Number.isNaN(m.currentAnnualSalary) && m.currentAnnualSalary <= hi
      )
    }

    if (filterLastRaiseFrom != null || filterLastRaiseTo != null) {
      const from = filterLastRaiseFrom ?? ''
      const to = filterLastRaiseTo ?? ''
      rows = rows.filter(m => {
        const d = lastRaiseDateOnly(m.lastRaiseDate)
        if (!d) return false
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    }

    rows.sort((a, b) => compare(a, b, sortField, sortDirection))

    const totalFiltered = rows.length
    const start = (currentPage - 1) * pageSize
    const pageRows = rows.slice(start, start + pageSize)

    return { filteredSorted: rows, pageRows, totalFiltered }
  }, [
    members,
    searchQuery,
    sidebarFilterIds,
    filterSalaryMin,
    filterSalaryMax,
    filterLastRaiseFrom,
    filterLastRaiseTo,
    sortField,
    sortDirection,
    currentPage,
    pageSize
  ])
}
