import { ORGCHART_API_URL } from '@/common/utils/serviceResolver'
import type { EditEmployeeFormBootstrap } from './editEmployeeHasura'

function orgchartApiRoot(): string {
  return ORGCHART_API_URL.replace(/\/$/, '')
}

/** Picks the org-chart assignment row to update (prefers matching job position when multiple rows exist). */
export function pickPrimaryOrgAssignment(
  rows: EditEmployeeFormBootstrap['employeeOrganizationalUnits'],
  employeeId: string,
  preferredJobPositionId?: string | null
): (typeof rows)[0] | undefined {
  const withEmployee = rows.filter(r => r.employeeId && r.employeeId === employeeId)
  if (withEmployee.length === 0) return undefined
  if (preferredJobPositionId) {
    const match = withEmployee.find(r => r.jobPositionId === preferredJobPositionId)
    if (match) return match
  }
  return withEmployee[0]
}

export type UpdateOrgUnitAssignmentInput = {
  accessToken: string
  assignmentId: string
  structureId: string
  organizationalUnitId: string
  employeeId: string
  jobPositionId: string
  /** When true, sends `role: Manager`; when false, omits `role` (backend may clear non-manager assignment). */
  assignManagerRole: boolean
}

export async function updateEmployeeOrganizationalUnitAssignment(input: UpdateOrgUnitAssignmentInput): Promise<void> {
  const { accessToken, assignmentId, structureId, organizationalUnitId, employeeId, jobPositionId, assignManagerRole } =
    input

  const payload: Record<string, string> = {
    id: assignmentId,
    structureId,
    organizationalUnitId,
    employeeId,
    jobPositionId
  }
  if (assignManagerRole) {
    payload.role = 'Manager'
  }

  const url = `${orgchartApiRoot()}/employee-assignments/organizational-unit/${encodeURIComponent(assignmentId)}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Assignment update failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ''}`)
  }
}
