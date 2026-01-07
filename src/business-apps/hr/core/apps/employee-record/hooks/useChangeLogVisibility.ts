import { useCallback } from 'react'
import { ChangeLogEntry } from '../components/tabs/ChangeLogTab'

export const useChangeLogVisibility = (userRole: string) => {
  // Apply field-level visibility based on user role
  const applyVisibilityRules = useCallback(
    (entries: ChangeLogEntry[]): ChangeLogEntry[] => {
      return entries.map(entry => {
        let isVisible = entry.isVisible
        let isMasked = entry.isMasked

        // Apply role-based visibility rules
        switch (entry.fieldCategory) {
          case 'financial':
            // Financial data only visible to HR managers and admins
            isVisible = userRole === 'admin' || userRole === 'hr_manager'
            isMasked = !isVisible
            break

          case 'org':
          case 'working':
            // Working conditions visible to HR and managers
            isVisible = ['admin', 'hr_manager', 'manager'].includes(userRole)
            isMasked = !isVisible
            break

          case 'personal':
          case 'address':
          case 'skills':
          case 'performance':
          case 'absence':
          case 'emergency':
          default:
            // Default to visible for unknown categories
            isVisible = true
            isMasked = false
        }

        return {
          ...entry,
          isVisible,
          isMasked
        }
      })
    },
    [userRole]
  )

  return {
    applyVisibilityRules
  }
}

export default useChangeLogVisibility
