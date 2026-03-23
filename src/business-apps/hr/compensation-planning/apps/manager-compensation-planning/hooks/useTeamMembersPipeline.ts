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
    case 'performanceRatingNumeric':
      return cmpNumNullsLast(a.performanceRatingNumeric, b.performanceRatingNumeric)
    case 'lastRaiseDate': {
      const la = a.lastRaiseDate ? new Date(a.lastRaiseDate).getTime() : NaN
      const lb = b.lastRaiseDate ? new Date(b.lastRaiseDate).getTime() : NaN
      return cmpNumNullsLast(la, lb)
    }
    case 'currentBonusTotal':
      return cmpNumNullsLast(a.currentBonusTotal, b.currentBonusTotal)
    case 'currentBenefitsTotal':
      return cmpNumNullsLast(a.currentBenefitsTotal, b.currentBenefitsTotal)
    default:
      return 0
  }
}

export interface TeamPipelineParams {
  members: TeamMemberCompensationData[]
  searchQuery: string
  /** `employee:{id}`, `level:{name}`, `salary:with`|`salary:without` */
  sidebarFilterIds: string[]
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
  uniqueJobLevels: string[]
}

function parseSidebarFilterIds(ids: string[]): {
  employeeIds: Set<string>
  levelNames: Set<string>
  salary: 'all' | 'with' | 'without'
} {
  const employeeIds = new Set<string>()
  const levelNames = new Set<string>()
  let salary: 'all' | 'with' | 'without' = 'all'
  for (const id of ids) {
    if (id.startsWith('employee:')) {
      employeeIds.add(id.slice('employee:'.length))
    } else if (id.startsWith('level:')) {
      levelNames.add(id.slice('level:'.length))
    } else if (id === 'salary:with') {
      salary = 'with'
    } else if (id === 'salary:without') {
      salary = 'without'
    }
  }
  return { employeeIds, levelNames, salary }
}

export function useTeamMembersPipeline(params: TeamPipelineParams): TeamPipelineResult {
  const { members, searchQuery, sidebarFilterIds, sortField, sortDirection, currentPage, pageSize } = params

  return useMemo(() => {
    const levelSet = new Set<string>()
    for (const m of members) {
      if (m.jobLevel?.trim()) levelSet.add(m.jobLevel.trim())
    }
    const loc = sortLocale()
    const uniqueJobLevels = [...levelSet].sort((a, b) => a.localeCompare(b, loc, { sensitivity: 'base' }))

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

    const { employeeIds, levelNames, salary } = parseSidebarFilterIds(sidebarFilterIds)

    if (employeeIds.size > 0) {
      rows = rows.filter(m => employeeIds.has(m.employeeId))
    }

    if (levelNames.size > 0) {
      rows = rows.filter(m => levelNames.has((m.jobLevel ?? '').trim()))
    }

    if (salary === 'with') {
      rows = rows.filter(m => m.currentAnnualSalary != null && m.currentAnnualSalary > 0)
    } else if (salary === 'without') {
      rows = rows.filter(m => m.currentAnnualSalary == null || m.currentAnnualSalary <= 0)
    }

    rows.sort((a, b) => compare(a, b, sortField, sortDirection))

    const totalFiltered = rows.length
    const start = (currentPage - 1) * pageSize
    const pageRows = rows.slice(start, start + pageSize)

    return { filteredSorted: rows, pageRows, totalFiltered, uniqueJobLevels }
  }, [members, searchQuery, sidebarFilterIds, sortField, sortDirection, currentPage, pageSize])
}
