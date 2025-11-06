/**
 * Centralized configuration for absence types
 * Defines fields, validation, and entitlements for each absence type
 */

export enum AbsenceTypeCategory {
  SICK_LEAVE = 'SICK_LEAVE',
  VACATION = 'VACATION',
  SPECIAL_LEAVE = 'SPECIAL_LEAVE',
  UNPAID_LEAVE = 'UNPAID_LEAVE'
}

export interface AbsenceField {
  name: string
  label: string
  type: 'date' | 'select' | 'text' | 'textarea' | 'number'
  required: boolean
  disabled?: boolean
  placeholder?: string
  validation?: {
    min?: number
    max?: number
    pattern?: RegExp
  }
}

export interface AbsenceTypeConfig {
  category: AbsenceTypeCategory
  catalogParentId: string // Parent entry in catalog (e.g., 'AbsenceType:v1:A001')
  displayName: string
  description: string
  icon: string
  color: string
  fields: AbsenceField[]
  requiresSubstitute: boolean
  requiresApproval: boolean
  checksEntitlement: boolean
  allowsNegativeBalance: boolean
  maxDaysPerRequest?: number
  minDaysAdvanceNotice?: number
}

/**
 * Configuration for all absence types
 */
export const ABSENCE_TYPES: Record<AbsenceTypeCategory, AbsenceTypeConfig> = {
  [AbsenceTypeCategory.SICK_LEAVE]: {
    category: AbsenceTypeCategory.SICK_LEAVE,
    catalogParentId: 'AbsenceType:v1:A021', // Sick leave parent in catalog
    displayName: 'Sick Leave',
    description: 'Employee illness or medical appointment',
    icon: 'medical',
    color: 'red',
    requiresSubstitute: true,
    requiresApproval: false, // Usually no pre-approval needed
    checksEntitlement: false, // No entitlement check for sick leave
    allowsNegativeBalance: true, // Can go negative
    fields: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        placeholder: 'Select sick leave type'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true,
        placeholder: 'Select start date'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        placeholder: 'Select end date'
      },
      {
        name: 'substitute',
        label: 'Substitute',
        type: 'select',
        required: false,
        placeholder: 'Select substitute'
      },
      {
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        required: false,
        placeholder: 'Additional notes...'
      }
    ]
  },

  [AbsenceTypeCategory.VACATION]: {
    category: AbsenceTypeCategory.VACATION,
    catalogParentId: 'AbsenceType:v1:A001', // Vacation parent in catalog
    displayName: 'Vacation',
    description: 'Annual leave and vacation time',
    icon: 'vacation',
    color: 'blue',
    requiresSubstitute: true,
    requiresApproval: true,
    checksEntitlement: true, // Must check remaining vacation days
    allowsNegativeBalance: false, // Cannot exceed entitlement
    minDaysAdvanceNotice: 14, // Minimum 2 weeks notice
    fields: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        placeholder: 'Select vacation type'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true,
        placeholder: 'Select start date'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        placeholder: 'Select end date'
      },
      {
        name: 'substitute',
        label: 'Substitute',
        type: 'select',
        required: false,
        placeholder: 'Select substitute'
      },
      {
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        required: false,
        placeholder: 'Additional notes...'
      }
    ]
  },

  [AbsenceTypeCategory.SPECIAL_LEAVE]: {
    category: AbsenceTypeCategory.SPECIAL_LEAVE,
    catalogParentId: 'AbsenceType:v1:A030', // Special leave parent
    displayName: 'Special Leave',
    description: 'Parental leave, bereavement, moving, etc.',
    icon: 'special',
    color: 'purple',
    requiresSubstitute: true,
    requiresApproval: true,
    checksEntitlement: true,
    allowsNegativeBalance: false,
    fields: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        placeholder: 'Select special leave type'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true,
        placeholder: 'Select start date'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        placeholder: 'Select end date'
      },
      {
        name: 'substitute',
        label: 'Substitute',
        type: 'select',
        required: false,
        placeholder: 'Select substitute'
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
        placeholder: 'Please provide details about your special leave request'
      },
      {
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        required: false,
        placeholder: 'Additional notes...'
      }
    ]
  },

  [AbsenceTypeCategory.UNPAID_LEAVE]: {
    category: AbsenceTypeCategory.UNPAID_LEAVE,
    catalogParentId: 'AbsenceType:v1:A040', // Unpaid leave parent
    displayName: 'Unpaid Leave',
    description: 'Leave without pay',
    icon: 'unpaid',
    color: 'gray',
    requiresSubstitute: true,
    requiresApproval: true,
    checksEntitlement: false, // No entitlement for unpaid
    allowsNegativeBalance: true,
    minDaysAdvanceNotice: 30, // Requires more notice
    fields: [
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        placeholder: 'Select unpaid leave type'
      },
      {
        name: 'startDate',
        label: 'Start Date',
        type: 'date',
        required: true,
        placeholder: 'Select start date'
      },
      {
        name: 'endDate',
        label: 'End Date',
        type: 'date',
        required: true,
        placeholder: 'Select end date'
      },
      {
        name: 'substitute',
        label: 'Substitute',
        type: 'select',
        required: true, // Required for unpaid leave
        placeholder: 'Select substitute'
      },
      {
        name: 'reason',
        label: 'Reason',
        type: 'textarea',
        required: true,
        placeholder: 'Please provide a detailed reason for unpaid leave'
      },
      {
        name: 'comment',
        label: 'Comment',
        type: 'textarea',
        required: false,
        placeholder: 'Additional notes...'
      }
    ]
  }
}

/**
 * Get absence type configuration by catalog parent ID
 */
export const getAbsenceTypeByParentId = (parentId: string): AbsenceTypeConfig | undefined => {
  return Object.values(ABSENCE_TYPES).find(type => type.catalogParentId === parentId)
}

/**
 * Get absence type configuration by category
 */
export const getAbsenceTypeByCategory = (category: AbsenceTypeCategory): AbsenceTypeConfig => {
  return ABSENCE_TYPES[category]
}

/**
 * Check if an absence type requires entitlement validation
 */
export const requiresEntitlementCheck = (catalogParentId: string): boolean => {
  const config = getAbsenceTypeByParentId(catalogParentId)
  return config?.checksEntitlement ?? false
}

/**
 * Check if an absence type requires a substitute
 */
export const requiresSubstitute = (catalogParentId: string): boolean => {
  const config = getAbsenceTypeByParentId(catalogParentId)
  return config?.requiresSubstitute ?? false
}

/**
 * Get minimum days advance notice required
 */
export const getMinimumAdvanceNoticeDays = (catalogParentId: string): number => {
  const config = getAbsenceTypeByParentId(catalogParentId)
  return config?.minDaysAdvanceNotice ?? 0
}

/**
 * Validate if user has sufficient entitlement for the requested absence
 */
export interface EntitlementValidation {
  isValid: boolean
  message?: string
  remainingDays?: number
  requestedDays?: number
}

export const validateEntitlement = (
  catalogParentId: string,
  requestedDays: number,
  availableDays: number
): EntitlementValidation => {
  const config = getAbsenceTypeByParentId(catalogParentId)

  if (!config?.checksEntitlement) {
    return { isValid: true }
  }

  if (config.allowsNegativeBalance) {
    return { isValid: true, remainingDays: availableDays, requestedDays }
  }

  if (requestedDays > availableDays) {
    return {
      isValid: false,
      message: `Insufficient ${config.displayName.toLowerCase()} balance. You have ${availableDays} days available but requested ${requestedDays} days.`,
      remainingDays: availableDays,
      requestedDays
    }
  }

  return {
    isValid: true,
    remainingDays: availableDays - requestedDays,
    requestedDays
  }
}

/**
 * Calculate number of days between two dates (excluding weekends)
 */
export const calculateWorkingDays = (startDate: Date, endDate: Date): number => {
  let count = 0
  const currentDate = new Date(startDate)

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // Not Sunday or Saturday
      count++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return count
}
