import { QueryExecutionClient } from '@/common/network/dataset/QueryExecutionClient'
import { Services } from '@/common/types/enums/Services'
import type { PeopleEmployeeRow, PeoplePagedResult } from './peopleStructureData'

const DATASET_QUERY_NAME = 'hrActiveEmployees'

function extractTotalFromRows(rows: Array<{ value_label?: string }>): number | null {
  const label = rows?.[0]?.value_label
  if (typeof label !== 'string') return null
  const parts = label.split('|')
  const totalParsed = parts.length === 2 ? Number(parts[1]) : Number.NaN
  return Number.isFinite(totalParsed) ? totalParsed : null
}

function mapDatasetRowToPeopleEmployee(row: Record<string, unknown>): PeopleEmployeeRow {
  const workEmail = typeof row.work_email === 'string' ? row.work_email.trim() : ''
  const jobTitle =
    typeof row.job_title === 'string' ? row.job_title : row.job_title != null ? String(row.job_title) : ''
  return {
    id: String(row.employee_id ?? ''),
    userId: row.user_id != null && String(row.user_id).trim() !== '' ? String(row.user_id) : null,
    firstName: row.first_name != null ? String(row.first_name) : null,
    lastName: row.last_name != null ? String(row.last_name) : null,
    displayName: null,
    workEmail: workEmail || null,
    jobTitle: jobTitle.trim() || null
  }
}

function displayNameForSort(row: PeopleEmployeeRow): string {
  return row.displayName?.trim() || [row.firstName, row.lastName].filter(Boolean).join(' ').trim() || row.id
}

/**
 * Client-side sort for the current page (dataset does not expose server-side sort params yet).
 */
export function sortPeopleEmployeeRows(
  rows: PeopleEmployeeRow[],
  sortColumnId: string | null,
  sortDesc: boolean
): PeopleEmployeeRow[] {
  if (!sortColumnId) return rows
  const dir = sortDesc ? -1 : 1
  const cmp = (a: string, b: string) => {
    const an = a.toLowerCase()
    const bn = b.toLowerCase()
    if (an < bn) return -1 * dir
    if (an > bn) return 1 * dir
    return 0
  }
  return [...rows].sort((x, y) => {
    switch (sortColumnId) {
      case 'email':
        return cmp(x.workEmail ?? '', y.workEmail ?? '')
      case 'jobTitle':
        return cmp(x.jobTitle ?? '', y.jobTitle ?? '')
      case 'name':
      default:
        return cmp(displayNameForSort(x), displayNameForSort(y))
    }
  })
}

/**
 * Active employees from the employee-service dataset `hrActiveEmployees` (same as HR Employee Directory).
 */
export async function fetchHrActiveEmployeesPage(
  accessToken: string,
  params: {
    limit: number
    offset: number
    search: string
    sortColumnId: string | null
    sortDesc: boolean
    /** Optional; forwarded when set (e.g. `navigator.language`). */
    localeCode?: string
  }
): Promise<PeoplePagedResult<PeopleEmployeeRow>> {
  const client = new QueryExecutionClient(Services.EMPLOYEE)
  client.setAccessToken(accessToken)

  const execParams: Record<string, string | number | boolean> = {
    limit: params.limit,
    offset: params.offset
  }
  const q = params.search.trim()
  if (q) execParams.search = q
  if (params.localeCode?.trim()) {
    execParams.localeCode = params.localeCode.trim()
  }

  const res = await client.executeDatasetQuery(DATASET_QUERY_NAME, execParams)
  if (!res || !Array.isArray(res.data)) {
    throw new Error('No response from hrActiveEmployees dataset')
  }

  const rowsRaw = res.data as Record<string, unknown>[]
  const totalParsed = extractTotalFromRows(rowsRaw as Array<{ value_label?: string }>)
  const mapped = rowsRaw.map(mapDatasetRowToPeopleEmployee).filter(r => r.id.length > 0)
  const sorted = sortPeopleEmployeeRows(mapped, params.sortColumnId, params.sortDesc)

  return {
    rows: sorted,
    totalCount: totalParsed != null ? totalParsed : sorted.length
  }
}
