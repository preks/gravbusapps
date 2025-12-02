/**
 * TypeScript types for vacation approval form
 */

export interface EmployeeAbsence {
  employeeId?: string
  employeeName?: string
  typeRef?: string
  startDate?: string
  endDate?: string
  workingDays?: number
  workingHours?: number
  balance?: number
  substituteEmployee?: string
  description?: string
  status?: string
}

export interface EmployeeData {
  id: string
  displayName: string
  firstName?: string
  lastName?: string
  position?: string
  organizationalUnit?: string
  avatarUrl?: string
}

export interface VacationApprovalPayload {
  approval: 'APPROVED' | 'REJECTED'
  approvalNote: string
  event: string
}
