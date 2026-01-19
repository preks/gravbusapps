import { EnhancedAbsence, EmployeeAbsence } from '../types'
import { getAbsenceStatusBadgeVariant as getCentralizedStatusBadgeVariant } from '../../../utils/absenceStatusUtils'

/**
 * Get employee display name from absence data
 */
export const getEmployeeName = (absence: EnhancedAbsence | { employee: EmployeeAbsence['employee'] }): string => {
  if (absence.employee.firstName || absence.employee.lastName) {
    return `${absence.employee.firstName || ''} ${absence.employee.lastName || ''}`.trim()
  }
  return '-'
}

/**
 * Get absence group display name
 */
export const getAbsenceGroup = (absence: EnhancedAbsence): string => {
  return absence.groupName || '-'
}

/**
 * Get status badge variant for consistent styling - now using centralized utility
 */
export const getStatusBadgeVariant = (
  status: string
): 'success' | 'warning' | 'destructive' | 'secondary' | 'default' => {
  return getCentralizedStatusBadgeVariant(status) as 'success' | 'warning' | 'destructive' | 'secondary' | 'default'
}

/**
 * Handle sorting logic for table columns
 */
export const handleSortingChange = (
  currentField: string,
  currentOrder: 'ASC' | 'DESC' | '',
  newField: string,
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
) => {
  if (currentField === newField) {
    // Cycle through: ASC -> DESC -> clear
    if (currentOrder === 'ASC') {
      onSortingChange(newField, 'DESC')
    } else if (currentOrder === 'DESC') {
      onSortingChange('', '')
    } else {
      onSortingChange(newField, 'ASC')
    }
  } else {
    onSortingChange(newField, 'ASC')
  }
}

/**
 * Format date for display
 */
export const formatDate = (date: string | null | undefined): string => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Calculate effective days between start and end dates
 */
export const calculateEffectiveDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const diffTime = Math.abs(end.getTime() - start.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays + 1 // Include both start and end dates
}
