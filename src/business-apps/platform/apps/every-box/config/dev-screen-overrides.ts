/**
 * Development Screen Overrides Configuration
 *
 * This file allows you to override which form/screen is displayed for specific tasks
 * during local development. This is useful for testing forms without publishing them
 * or changing screen management configuration.
 *
 * Usage:
 * 1. Enable development mode by setting ENABLE_DEV_SCREEN_OVERRIDES to true
 * 2. Add overrides below using task ID, screen key, or process name + task name
 * 3. Specify either a local component path (for local development) or CDN path
 *
 * Examples:
 * - Override by task ID: { taskId: '123', componentPath: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2' }
 * - Override by screen key: { screenKey: 'frm_approveEmployeeVacationApproveEmployeeVacation', componentPath: '...' }
 * - Override by process: { processName: 'approveEmployeeVacation', taskName: 'ApproveEmployeeVacation', componentPath: '...' }
 */

export interface DevScreenOverride {
  // Override by task ID (exact match)
  taskId?: string

  // Override by screen key (exact match)
  screenKey?: string

  // Override by process name and task name (for Kogito tasks)
  processName?: string
  taskName?: string

  // Component path - can be:
  // 1. Local path: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2'
  // 2. CDN path: 'hr/absences/forms/approve-employee-vacation-v2/ApproveEmployeeVacationV2' (will use CDN)
  componentPath: string

  // Optional: version for CDN (if not specified, uses 'latest' or no version)
  version?: string

  // Optional: builder type (defaults to 'NATIVE_SCREEN')
  builderType?: 'NATIVE_SCREEN' | 'LOWCODER'

  // Optional: For LOWCODER screens
  appId?: string
  appName?: string
}

/**
 * Enable/disable development screen overrides
 * Set to true to enable overrides in development mode
 */
export const ENABLE_DEV_SCREEN_OVERRIDES = true

/**
 * Development screen overrides
 * Add your overrides here
 */
export const DEV_SCREEN_OVERRIDES: DevScreenOverride[] = [
  // Approve Employee Vacation - NATIVE_SCREEN override
  // Override by screen key (most reliable)
  {
    screenKey: 'frm_approveEmployeeVacationApproveEmployeeVacation',
    componentPath: 'hr/absences/forms/approve-employee-vacation-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Employee Work Leave - NATIVE_SCREEN override
  {
    screenKey: 'frm_approveEmployeeWorkLeaveApproveEmployeeWorkLeave',
    componentPath: 'hr/absences/forms/approve-employee-work-leave-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Acknowledge Employee Sick Leave Manager - NATIVE_SCREEN override
  // Override LOWCODER screen sa NATIVE_SCREEN formom
  {
    screenKey: 'frm_acknowledgeSickLeaveAcknowledgeSickLeaveManager',
    componentPath: 'hr/absences/forms/acknowledge-employee-sick-leave-manager-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Acknowledge Employee Sick Leave HR - NATIVE_SCREEN override
  {
    screenKey: 'frm_acknowledgeSickLeaveAcknowledgeSickLeaveHR',
    componentPath: 'hr/absences/forms/acknowledge-employee-sick-leave-HR-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Acknowledge Employee Vacation HR - NATIVE_SCREEN override
  {
    screenKey: 'frm_acknowledgeVacationAcknowledgeVacation',
    componentPath: 'hr/absences/forms/acknowledge-employee-vacation-HR-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Feedback - NATIVE_SCREEN override
  {
    screenKey: 'frm_giveFeedbackApproveFeedback',
    componentPath: 'hr/core/forms/feedback-approval-form-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Employee Special Leave - NATIVE_SCREEN override
  {
    screenKey: 'frm_approveEmployeeSpecialLeaveApproveEmployeeSpecialLeave',
    componentPath: 'hr/absences/forms/approve-employee-special-leave-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Acknowledge Employee Special Leave - NATIVE_SCREEN override
  {
    screenKey: 'frm_acknowledgeSpecialLeaveAcknowledgeSpecialLeave',
    componentPath: 'hr/absences/forms/acknowledge-employee-special-leave-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Expense Request V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_approveExpenseRequestApproveExpenseRequest',
    componentPath: 'fin/expenses/forms/approve-expense-request-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Expense Plan V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_approveExpensePlanApproveExpensePlan',
    componentPath: 'fin/expenses/forms/approve-expense-plan-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Confirm Transfer Advance Payment V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_transferAdvancePaymentTransferAdvancePayment',
    componentPath: 'fin/expenses/forms/confirm-transfer-adv-payment-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Approve Advance Payment V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_approveAdvancePaymentApproveAdvancePayment',
    componentPath: 'fin/expenses/forms/advance-payment-approval-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Pay Transfer Advance Payment V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_payAdvancePaymentHandOutAdvancePayment',
    componentPath: 'fin/expenses/forms/pay-transfer-adv-payment-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Change Bank Account Review V2 - NATIVE_SCREEN override
  // Screen key from API response
  {
    screenKey: 'frm_changeBankAccountAcknowledgeBankAccount',
    componentPath: 'hr/core/forms/change-bank-account-review-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Change Employee Address Review V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_changeAddressAcknowledgeChangeAddress',
    componentPath: 'hr/core/forms/change-employee-address-review-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Change Relationship Review V2 - NATIVE_SCREEN override
  {
    screenKey: 'frm_changeRelationshipAcknowledgeChangeRelationship',
    componentPath: 'hr/core/forms/change-relationship-review-v2',
    builderType: 'NATIVE_SCREEN'
  },

  // Change Personal Data Review V2 - NATIVE_SCREEN override
  // Screen key from API response (REAL DATA)
  {
    screenKey: 'frm_changePersonalInformationApprovePersonalInformationChange',
    componentPath: 'hr/core/forms/change-personal-data-review-v2',
    builderType: 'NATIVE_SCREEN'
  }
]

/**
 * Helper function to find override for a task
 */
export function findDevScreenOverride(
  taskId: string | undefined,
  screenKey: string | null,
  processName: string | undefined,
  taskName: string | undefined
): DevScreenOverride | null {
  if (!ENABLE_DEV_SCREEN_OVERRIDES) {
    return null
  }

  // Check if we're in development mode (localhost or dev environment)
  if (typeof window === 'undefined') {
    return null
  }

  const isDevelopment =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.hostname === 'newwork-dev.newwork.com'

  if (!isDevelopment) {
    return null
  }

  // Search for matching override
  for (const override of DEV_SCREEN_OVERRIDES) {
    // Match by task ID (highest priority)
    if (override.taskId && taskId && override.taskId === taskId) {
      return override
    }

    // Match by screen key
    if (override.screenKey && screenKey && override.screenKey === screenKey) {
      return override
    }

    // Match by process name and task name (case-insensitive comparison)
    if (override.processName && override.taskName && processName && taskName) {
      const processMatch = override.processName.toLowerCase() === processName.toLowerCase()
      const taskMatch = override.taskName.toLowerCase() === taskName.toLowerCase()

      if (processMatch && taskMatch) {
        return override
      }
    }
  }

  return null
}
