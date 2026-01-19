import type { Stage } from '@/components/stage-progression/types'
import type { ReferenceData } from './types'

// Convert ReferenceData to Stage format
export const convertToStageFormat = (referenceData: ReferenceData[] | undefined): Stage[] => {
  return (referenceData || []).map(ref => ({
    id: ref.id,
    value: ref.value,
    code: ref.code
  }))
}

// Helper function to get employee name from employee object
export const getEmployeeName = (employee: any): string | null => {
  if (!employee) return null
  return employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'
}
